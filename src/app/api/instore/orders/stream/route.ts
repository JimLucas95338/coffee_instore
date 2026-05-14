import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Server-Sent Events stream of active orders.
 *
 * Vercel's serverless runtime doesn't keep long-running connections, so we
 * can't have a true push-from-database flow without a paid SSE infra (Pusher,
 * Ably, Upstash Redis pub/sub). Instead, this endpoint mimics SSE semantics:
 * it tails the DB on a tight server-side loop and streams a `data:` event each
 * time the active-order set changes, plus a periodic heartbeat. From the
 * client's perspective it behaves like a real-time stream — updates land
 * faster than the old 4-second poll without the client doing repeated
 * round-trips.
 *
 * Connection budget: capped at 60s per stream so we don't exceed Vercel's
 * function timeout; the client EventSource auto-reconnects on close.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') ?? 'RECEIVED,IN_PROGRESS,READY';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let aborted = false;
      const startedAt = Date.now();
      const MAX_MS = 55_000;
      const POLL_MS = 1_500;

      let lastFingerprint = '';

      request.signal.addEventListener('abort', () => {
        aborted = true;
      });

      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      // Greet with retry hint so EventSource reconnects faster than the default
      controller.enqueue(encoder.encode(`retry: 2000\n\n`));

      while (!aborted && Date.now() - startedAt < MAX_MS) {
        try {
          const statuses = statusFilter.split(',').map((s) => s.trim());
          const orders = await db.inStoreOrder.findMany({
            where: { status: { in: statuses as never } },
            include: {
              items: {
                include: {
                  menuItem: { select: { name: true, category: true } },
                },
              },
              employee: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
          });

          // Fingerprint detects any meaningful change in the set: ids, statuses,
          // payment status, refunds.
          const fingerprint = orders
            .map(
              (o) =>
                `${o.id}:${o.status}:${o.paymentStatus}:${o.refundedAt ? 'R' : ''}`,
            )
            .sort()
            .join('|');

          if (fingerprint !== lastFingerprint) {
            send('orders', orders);
            lastFingerprint = fingerprint;
          } else {
            send('heartbeat', { t: Date.now() });
          }
        } catch (err) {
          send('error', { message: err instanceof Error ? err.message : 'unknown' });
        }

        await new Promise((r) => setTimeout(r, POLL_MS));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
