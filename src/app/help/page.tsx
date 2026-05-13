import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Brand } from '@/components/Brand';
import { getActiveTheme } from '@/lib/theme';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const theme = await getActiveTheme();
  return { title: `Staff Guide — ${theme.brand.fullName}` };
}

export default async function HelpPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login?callbackUrl=/help');
  }
  const theme = await getActiveTheme();
  const status = theme.status;

  return (
    <div className="min-h-screen bg-surface-950 text-ink relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-30 pointer-events-none" />

      <header className="relative border-b border-surface-700 bg-surface-900/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/instore/home">
            <Brand size="sm" />
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-accent-400">
            Staff Guide
          </span>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-6 py-10 prose-ink">
        <p className="text-sm text-ink-dark/60 italic mb-8">
          {theme.brand.tagline}. Everything a barista, manager, or admin needs to run the in-store system.
        </p>

        <Toc />

        <Section id="quickstart" number="1" title="Quick start">
          <ol className="list-decimal pl-6 space-y-1 text-ink-dark">
            <li>Open https://coffeeinstore.vercel.app on the iPad or laptop.</li>
            <li>Sign in — you&apos;ll land on Mission Control.</li>
            <li>From there, pick a station: POS, Queue, Customer Display, Kiosk, Menu Admin, Users.</li>
          </ol>
          <p className="mt-3 text-ink-dark">
            Default seeded accounts (change after first login):
          </p>
          <Table
            headers={['Role', 'Email', 'Password']}
            rows={[
              ['Admin', 'admin@ecocoffee.com', 'admin123'],
              ['Manager', 'manager@ecocoffee.com', 'manager123'],
            ]}
          />
          <Callout>
            Admins reset passwords from <Code>/admin/users</Code> → click <strong>Reset password</strong> on the row.
          </Callout>
        </Section>

        <Section id="stations" number="2" title="The stations">
          <Definition
            term={theme.hub.title}
            url="/instore/home"
            description="Signed-in staff hub. Tile shortcuts to every screen. Lives at the brand origin URL."
          />
          <Definition
            term="Kiosk"
            url="/instore/kiosk"
            access="public"
            description="Customer self-serve. Bookmark this on the customer-facing iPad."
          />
          <Definition
            term="POS"
            url="/instore/pos"
            access="manager+"
            description="Staff counter ordering. Customer name, loyalty lookup, daily sales summary."
          />
          <Definition
            term="Bar Station"
            url="/instore/bar"
            access="public"
            description="Primary barista screen. Full drink details, per-card timer, reprint label, cancel, stats strip. Plays a blip on each new order."
          />
          <Definition
            term="Queue"
            url="/instore/queue"
            access="public"
            description={`Lightweight tap-only status board. No drink details. Chimes when an order hits ${status.READY}.`}
          />
          <Definition
            term="Customer Display"
            url="/instore/display"
            access="public"
            description="Live order queue + scrolling menu board for an external monitor."
          />
        </Section>

        <Section id="lifecycle" number="3" title="The order lifecycle">
          <p className="text-ink-dark mb-4">
            Every order moves through four states. The DB enum values never
            change; the labels you see come from the active theme.
          </p>
          <Table
            headers={['Display label', 'DB enum', 'Meaning']}
            rows={[
              [status.RECEIVED, 'RECEIVED', 'Order placed, sitting in the queue.'],
              [status.IN_PROGRESS, 'IN_PROGRESS', 'Barista is making the drink.'],
              [status.READY, 'READY', 'Drink is done — call the customer. Chime plays.'],
              [status.PICKED_UP, 'PICKED_UP', 'Customer has the cup. Drops off the queue.'],
            ]}
          />
        </Section>

        <Section id="ops" number="4" title="Daily operations">
          <h3 className="font-display text-lg font-semibold text-accent-400 mt-4 mb-2">Opening</h3>
          <ol className="list-decimal pl-6 space-y-1 text-ink-dark">
            <li>Power on the iPad/laptop and the customer monitor.</li>
            <li>Open coffeeinstore.vercel.app on each device.</li>
            <li>Customer iPad → <Code>/instore/kiosk</Code></li>
            <li>Counter iPad → sign in as manager, leave on <Code>/instore/pos</Code></li>
            <li>Bar iPad → <Code>/instore/bar</Code> (use <Code>/instore/queue</Code> for tap-only)</li>
            <li>External display → <Code>/instore/display</Code></li>
            <li>Verify the printer is connected.</li>
          </ol>

          <h3 className="font-display text-lg font-semibold text-accent-400 mt-6 mb-2">Closing</h3>
          <ol className="list-decimal pl-6 space-y-1 text-ink-dark">
            <li>Note the totals from the POS Daily Sales Summary.</li>
            <li>Reconcile cash drawer against the cash subtotal.</li>
            <li>
              Investigate or cancel any orders still on{' '}
              <strong>{status.RECEIVED}</strong> or <strong>{status.IN_PROGRESS}</strong>.
            </li>
            <li>Sign out everywhere.</li>
          </ol>
        </Section>

        <Section id="menu" number="5" title="Menu management (admin)">
          <p className="text-ink-dark mb-3">
            <Link href="/admin/menu" className="text-accent-400 hover:underline">
              /admin/menu
            </Link>{' '}
            — add, edit, hide, delete menu items, and toggle add-on availability.
          </p>
          <h3 className="font-display text-lg font-semibold text-accent-400 mt-4 mb-2">
            Hide vs. delete
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-ink-dark">
            <li>
              <strong>Hide</strong>: removes from kiosk/POS but keeps history. Use when 86&apos;d on
              an item — toggle back when restocked.
            </li>
            <li>
              <strong>Delete</strong>: permanent. Blocked if the item has historical orders;
              hide instead.
            </li>
          </ul>
          <h3 className="font-display text-lg font-semibold text-accent-400 mt-6 mb-2">
            Add-on availability
          </h3>
          <p className="text-ink-dark">
            On <Code>/admin/menu</Code>, the Add-ons section shows every modifier as a tile.
            Click to flip Available ↔ Hidden. Hidden add-ons disappear from the customize step
            on kiosk and POS immediately.
          </p>
        </Section>

        <Section id="receipts" number="6" title="Receipts and cup labels">
          <p className="text-ink-dark">
            Both are PDFs. In POS, configure print settings:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-ink-dark mt-2">
            <li>
              <strong>Printer type:</strong> Thermal (62×29mm), Receipt (80mm), or None
            </li>
            <li>
              <strong>Auto-print:</strong> sends the label/receipt automatically when an order
              is created
            </li>
          </ul>
          <p className="text-ink-dark mt-3">
            Connect the printer over Bluetooth or USB at the OS level — there&apos;s no driver
            step in the app.
          </p>
        </Section>

        <Section id="loyalty" number="7" title="Loyalty program">
          <ul className="list-disc pl-6 space-y-1 text-ink-dark">
            <li>Customer enters phone at kiosk, or gives it at POS.</li>
            <li>
              Earn: <strong>1 point per $1</strong> spent (on the discounted subtotal).
            </li>
            <li>
              Redeem: <strong>100 points = $5 off</strong> the next order.
            </li>
            <li>Members auto-created on first order with that phone number.</li>
          </ul>
        </Section>

        <Section id="brand" number="7b" title="Brand & theme (admin)">
          <p className="text-ink-dark mb-3">
            <Link href="/admin/brand" className="text-accent-400 hover:underline">
              /admin/brand
            </Link>{' '}
            — switch between presets (3rd Space Coffee, Eco Delight Coffee). The
            palette, wordmark, brand mark, status labels, hub heading, tile
            emojis, customer-display scene, and receipt/cup-label headers all
            swap together. Click Apply on the other card; the page hard-reloads
            so the new theme paints without flash.
          </p>
        </Section>

        <Section id="users" number="8" title="Users and roles (admin)">
          <p className="text-ink-dark mb-3">
            <Link href="/admin/users" className="text-accent-400 hover:underline">
              /admin/users
            </Link>{' '}
            — create users, change roles, reset passwords, activate/deactivate.
          </p>
          <Callout>
            You cannot demote or deactivate yourself — the system blocks it to prevent lockout.
          </Callout>
          <Table
            headers={['Role', 'Access']}
            rows={[
              ['ADMIN', 'Everything'],
              ['MANAGER', 'POS, Queue, Display, Kiosk'],
              ['SALES_REP / ROASTER / PACKAGER', 'Queue, Display, Kiosk (no POS)'],
            ]}
          />
        </Section>

        <Section id="payments" number="9" title="Payments — current state">
          <Callout warning>
            <strong>Important:</strong> the system does not actually process card payments
            today. Run the customer&apos;s card on a separate device.
          </Callout>
          <Table
            headers={['Method', 'What happens on submit']}
            rows={[
              ['Cash', 'Order created PENDING. Staff confirms cash separately.'],
              ['Card / Apple Pay', 'Auto-marked PAID on the honor system.'],
            ]}
          />
          <p className="text-ink-dark mt-3">
            Real Stripe Terminal integration is on the roadmap — see <Code>TODO.md</Code>.
          </p>
        </Section>

        <Section id="troubleshoot" number="10" title="Troubleshooting">
          <Trouble q="I can't sign in">
            Double-check email and password. Ask an admin to confirm your account is Active.
          </Trouble>
          <Trouble q="An item won't appear on the kiosk">
            Open <Code>/admin/menu</Code> and confirm the item is Active (not Hidden).
          </Trouble>
          <Trouble q="An add-on isn't selectable">
            Confirm it&apos;s Available on <Code>/admin/menu</Code>, and that the menu item
            allows that modifier (e.g. Allow milk).
          </Trouble>
          <Trouble q="The chime isn't playing on the queue">
            Click the queue page once. Browsers block audio until first user interaction.
          </Trouble>
          <Trouble q="Tax looks wrong">
            Rate is the <Code>INSTORE_TAX_RATE</Code> env var (currently 0.0875 / 8.75%).
            Changing requires an admin to update Vercel and redeploy.
          </Trouble>
        </Section>

        <Section id="urls" number="11" title="URL cheat-sheet">
          <Table
            headers={['URL', 'What it is', 'Sign-in']}
            rows={[
              ['/', `Redirects to ${theme.hub.title}`, 'required'],
              ['/instore/home', theme.hub.title, 'required'],
              ['/instore/kiosk', 'Customer self-serve', 'public'],
              ['/instore/pos', 'Staff POS', 'manager+'],
              ['/instore/bar', 'Bar Station (full barista view)', 'public'],
              ['/instore/queue', 'Tap-only status board', 'public'],
              ['/instore/display', 'Customer-facing display', 'public'],
              ['/admin/menu', 'Menu items + add-ons', 'admin'],
              ['/admin/users', 'Staff accounts', 'admin'],
              ['/admin/brand', 'Theme + brand switcher', 'admin'],
              ['/help', 'This guide', 'required'],
            ]}
          />
        </Section>

        <p className="text-xs text-ink-dark/40 mt-12 text-center font-mono">
          Last updated when this build deployed. For issues, contact your admin.
        </p>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Toc() {
  const items = [
    ['quickstart', '1. Quick start'],
    ['stations', '2. The stations'],
    ['lifecycle', '3. Order lifecycle'],
    ['ops', '4. Daily ops'],
    ['menu', '5. Menu management'],
    ['receipts', '6. Receipts & labels'],
    ['loyalty', '7. Loyalty'],
    ['brand', '7b. Brand & theme'],
    ['users', '8. Users & roles'],
    ['payments', '9. Payments'],
    ['troubleshoot', '10. Troubleshooting'],
    ['urls', '11. URL cheat-sheet'],
  ];
  return (
    <nav className="mb-10 rounded-2xl border border-surface-700 bg-surface-900/60 p-4">
      <div className="font-mono text-xs uppercase tracking-[0.25em] text-accent-400 mb-3">
        Contents
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {items.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} className="text-ink-dark hover:text-accent-400 transition-colors">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-mono text-accent-400 text-sm">§{number}</span>
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-surface-800 border border-surface-700 px-1.5 py-0.5 text-xs font-mono text-accent-300">
      {children}
    </code>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-surface-700 bg-surface-900/40">
      <table className="w-full text-sm">
        <thead className="bg-surface-800/60 text-ink-dark">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2 font-mono text-xs uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-surface-700">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-ink-dark/90">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({
  children,
  warning = false,
}: {
  children: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className={
        warning
          ? 'my-3 rounded-lg border border-accent-700/60 bg-accent-900/20 px-4 py-3 text-sm text-ink'
          : 'my-3 rounded-lg border border-surface-700 bg-surface-900/60 px-4 py-3 text-sm text-ink-dark'
      }
    >
      {children}
    </div>
  );
}

function Definition({
  term,
  url,
  description,
  access,
}: {
  term: string;
  url: string;
  description: string;
  access?: string;
}) {
  return (
    <div className="mb-4 rounded-xl border border-surface-700 bg-surface-900/40 p-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-display text-lg font-semibold text-ink">{term}</span>
        <Code>{url}</Code>
        {access && (
          <span className="font-mono text-xs uppercase tracking-wider text-ink-dark/60">
            {access}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-dark/80">{description}</p>
    </div>
  );
}

function Trouble({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  return (
    <details className="mb-2 rounded-xl border border-surface-700 bg-surface-900/40 px-4 py-2 cursor-pointer">
      <summary className="font-display font-semibold text-ink py-1">{q}</summary>
      <div className="text-ink-dark text-sm pb-2">{children}</div>
    </details>
  );
}
