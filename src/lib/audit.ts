import 'server-only';
import { db } from './db';

/**
 * Lightweight wrapper around the AuditLog table. Failures are swallowed so a
 * logging hiccup never breaks the underlying operation.
 *
 * Conventional actions (use these strings consistently for filterability):
 *
 *   ORDER_REFUNDED
 *   ORDER_CANCELLED
 *   ORDER_DISCOUNTED
 *   ORDER_MARKED_PAID
 *   MENU_ITEM_CREATED / _UPDATED / _DELETED / _HIDDEN / _SHOWN
 *   ADDON_CREATED / _UPDATED / _DELETED
 *   USER_CREATED / _ROLE_CHANGED / _DEACTIVATED / _PASSWORD_RESET
 *   LOYALTY_ADJUSTED
 *   THEME_CHANGED
 */
export async function audit(args: {
  action: string;
  actorId?: string | null;
  actorEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: args.action,
        actorId: args.actorId ?? null,
        actorEmail: args.actorEmail ?? null,
        targetType: args.targetType ?? null,
        targetId: args.targetId ?? null,
        metadata: args.metadata ? JSON.stringify(args.metadata) : null,
      },
    });
  } catch (error) {
    // Never let a logging failure bubble up.
    console.error('audit() failed:', error);
  }
}
