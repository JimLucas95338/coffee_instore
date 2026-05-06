import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Brand } from '@/components/Brand';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Staff Guide — 3rd Space Coffee',
};

export default async function HelpPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login?callbackUrl=/help');
  }

  return (
    <div className="min-h-screen bg-space-950 text-cream relative overflow-hidden">
      <div className="absolute inset-0 starfield opacity-30 pointer-events-none" />

      <header className="relative border-b border-space-700 bg-space-900/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/instore/home">
            <Brand size="sm" />
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-saturn-400">
            Staff Guide
          </span>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-6 py-10 prose-cream">
        <p className="text-sm text-cream-dark/60 italic mb-8">
          The Third Place — In Orbit. Everything a barista, manager, or admin needs to run the in-store system.
        </p>

        <Toc />

        <Section id="quickstart" number="1" title="Quick start">
          <ol className="list-decimal pl-6 space-y-1 text-cream-dark">
            <li>Open https://coffeeinstore.vercel.app on the iPad or laptop.</li>
            <li>Sign in — you&apos;ll land on Mission Control.</li>
            <li>From there, pick a station: POS, Queue, Customer Display, Kiosk, Menu Admin, Users.</li>
          </ol>
          <p className="mt-3 text-cream-dark">
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
            term="Mission Control"
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
            term="Queue"
            url="/instore/queue"
            access="public (view)"
            description="Barista station. Tap to advance status. Chimes when an order hits Lift-off."
          />
          <Definition
            term="Customer Display"
            url="/instore/display"
            access="public"
            description="Live order queue + scrolling menu board for an external monitor."
          />
        </Section>

        <Section id="lifecycle" number="3" title="The order lifecycle">
          <p className="text-cream-dark mb-4">
            Every order moves through four space-themed states. The DB enums are unchanged — just the labels.
          </p>
          <Table
            headers={['Display label', 'DB enum', 'Meaning']}
            rows={[
              ['On the Pad', 'RECEIVED', 'Order placed, sitting in the queue.'],
              ['T-minus & Counting', 'IN_PROGRESS', 'Barista is making the drink.'],
              ['Lift-off', 'READY', 'Drink is done — call the customer. Chime plays.'],
              ['In Orbit', 'PICKED_UP', 'Customer has the cup. Drops off the queue.'],
            ]}
          />
        </Section>

        <Section id="ops" number="4" title="Daily operations">
          <h3 className="font-display text-lg font-semibold text-saturn-400 mt-4 mb-2">Opening</h3>
          <ol className="list-decimal pl-6 space-y-1 text-cream-dark">
            <li>Power on the iPad/laptop and the customer monitor.</li>
            <li>Open coffeeinstore.vercel.app on each device.</li>
            <li>Customer iPad → <Code>/instore/kiosk</Code></li>
            <li>Counter iPad → sign in as manager, leave on <Code>/instore/pos</Code></li>
            <li>Bar iPad → <Code>/instore/queue</Code></li>
            <li>External display → <Code>/instore/display</Code></li>
            <li>Verify the printer is connected.</li>
          </ol>

          <h3 className="font-display text-lg font-semibold text-saturn-400 mt-6 mb-2">Closing</h3>
          <ol className="list-decimal pl-6 space-y-1 text-cream-dark">
            <li>Note the totals from the POS Daily Sales Summary.</li>
            <li>Reconcile cash drawer against the cash subtotal.</li>
            <li>Investigate or cancel any orders still on On the Pad / T-minus.</li>
            <li>Sign out everywhere.</li>
          </ol>
        </Section>

        <Section id="menu" number="5" title="Menu management (admin)">
          <p className="text-cream-dark mb-3">
            <Link href="/admin/menu" className="text-saturn-400 hover:underline">
              /admin/menu
            </Link>{' '}
            — add, edit, hide, delete menu items, and toggle add-on availability.
          </p>
          <h3 className="font-display text-lg font-semibold text-saturn-400 mt-4 mb-2">
            Hide vs. delete
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-cream-dark">
            <li>
              <strong>Hide</strong>: removes from kiosk/POS but keeps history. Use when 86&apos;d on
              an item — toggle back when restocked.
            </li>
            <li>
              <strong>Delete</strong>: permanent. Blocked if the item has historical orders;
              hide instead.
            </li>
          </ul>
          <h3 className="font-display text-lg font-semibold text-saturn-400 mt-6 mb-2">
            Add-on availability
          </h3>
          <p className="text-cream-dark">
            On <Code>/admin/menu</Code>, the Add-ons section shows every modifier as a tile.
            Click to flip Available ↔ Hidden. Hidden add-ons disappear from the customize step
            on kiosk and POS immediately.
          </p>
        </Section>

        <Section id="receipts" number="6" title="Receipts and cup labels">
          <p className="text-cream-dark">
            Both are PDFs. In POS, configure print settings:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-cream-dark mt-2">
            <li>
              <strong>Printer type:</strong> Thermal (62×29mm), Receipt (80mm), or None
            </li>
            <li>
              <strong>Auto-print:</strong> sends the label/receipt automatically when an order
              is created
            </li>
          </ul>
          <p className="text-cream-dark mt-3">
            Connect the printer over Bluetooth or USB at the OS level — there&apos;s no driver
            step in the app.
          </p>
        </Section>

        <Section id="loyalty" number="7" title="Loyalty program">
          <ul className="list-disc pl-6 space-y-1 text-cream-dark">
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

        <Section id="users" number="8" title="Users and roles (admin)">
          <p className="text-cream-dark mb-3">
            <Link href="/admin/users" className="text-saturn-400 hover:underline">
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
          <p className="text-cream-dark mt-3">
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
              ['/', 'Redirects to Mission Control', 'required'],
              ['/instore/home', 'Mission Control', 'required'],
              ['/instore/kiosk', 'Customer self-serve', 'public'],
              ['/instore/pos', 'Staff POS', 'manager+'],
              ['/instore/queue', 'Barista queue', 'public'],
              ['/instore/display', 'Customer-facing display', 'public'],
              ['/admin/menu', 'Menu items + add-ons', 'admin'],
              ['/admin/users', 'Staff accounts', 'admin'],
              ['/help', 'This guide', 'required'],
            ]}
          />
        </Section>

        <p className="text-xs text-cream-dark/40 mt-12 text-center font-mono">
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
    ['users', '8. Users & roles'],
    ['payments', '9. Payments'],
    ['troubleshoot', '10. Troubleshooting'],
    ['urls', '11. URL cheat-sheet'],
  ];
  return (
    <nav className="mb-10 rounded-2xl border border-space-700 bg-space-900/60 p-4">
      <div className="font-mono text-xs uppercase tracking-[0.25em] text-saturn-400 mb-3">
        Contents
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {items.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} className="text-cream-dark hover:text-saturn-400 transition-colors">
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
        <span className="font-mono text-saturn-400 text-sm">§{number}</span>
        <h2 className="font-display text-2xl font-bold text-cream">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-space-800 border border-space-700 px-1.5 py-0.5 text-xs font-mono text-saturn-300">
      {children}
    </code>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-space-700 bg-space-900/40">
      <table className="w-full text-sm">
        <thead className="bg-space-800/60 text-cream-dark">
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
            <tr key={i} className="border-t border-space-700">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-cream-dark/90">
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
          ? 'my-3 rounded-lg border border-saturn-700/60 bg-saturn-900/20 px-4 py-3 text-sm text-cream'
          : 'my-3 rounded-lg border border-space-700 bg-space-900/60 px-4 py-3 text-sm text-cream-dark'
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
    <div className="mb-4 rounded-xl border border-space-700 bg-space-900/40 p-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-display text-lg font-semibold text-cream">{term}</span>
        <Code>{url}</Code>
        {access && (
          <span className="font-mono text-xs uppercase tracking-wider text-cream-dark/60">
            {access}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-cream-dark/80">{description}</p>
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
    <details className="mb-2 rounded-xl border border-space-700 bg-space-900/40 px-4 py-2 cursor-pointer">
      <summary className="font-display font-semibold text-cream py-1">{q}</summary>
      <div className="text-cream-dark text-sm pb-2">{children}</div>
    </details>
  );
}
