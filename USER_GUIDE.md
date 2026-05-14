# 3rd Space Coffee — Staff User Guide

> **The Third Place — In Orbit.** This guide covers everything a barista, manager, or admin needs to run the in-store system day-to-day.

URL: **https://coffeeinstore.vercel.app**

---

## 1. Quick start

1. Open https://coffeeinstore.vercel.app on the iPad/laptop.
2. You'll land on **Mission Control** (the staff hub) after sign-in.
3. From there, pick a station: **POS**, **Queue**, **Customer Display**, **Kiosk**, **Menu Admin**, **Users**.

If you're not signed in, you'll be sent to the login screen. Use the credentials your admin gave you.

### Sign-in credentials

Initial seeded accounts (change immediately after first login):

| Role | Email | Default password |
|---|---|---|
| Admin | `admin@ecocoffee.com` | `admin123` |
| Manager | `manager@ecocoffee.com` | `manager123` |

To reset your password: an admin opens **Users** → finds your row → clicks **Reset password**.

---

## 2. The stations

### Mission Control (`/instore/home`)
The signed-in staff hub. Tile-based shortcuts to every other screen. Stays at the brand origin URL (`/`) by default.

### Kiosk (`/instore/kiosk`)
Customer-facing self-serve ordering. **No sign-in required** — bookmark this on the customer-facing iPad. Customers tap **Launch Order**, browse the menu, customize drinks (size / milk / temperature / add-ons), and pay with Cash, Card, or Apple Pay.

### POS (`/instore/pos`)
Staff-operated counter ordering. Manager or admin login required. Same menu as the kiosk plus:
- Customer name field for cup labels
- Loyalty phone lookup + redemption
- Daily sales summary at the bottom

### Bar Station (`/instore/bar`)
**Primary barista screen.** Full detail cards — every customization (size, milk, temp, add-ons, customer notes) is visible up front so you can build a drink without tapping anything. Each card has a live elapsed timer (turns amber after 4 min, red after 8 min). Action buttons advance the status; there are also **🖨 Label** (reprint cup label) and **Cancel** buttons per card. A sticky stats strip at the top shows today's count, last hour, and average make-time. Plays a short blip when a new order arrives. No sign-in required.

### Queue (`/instore/queue`)
Lightweight status board. Three columns, tap to advance status. No drink details — use this when you don't need the customizations visible and just want the fastest possible tap workflow.

Both Bar Station and Queue move orders through:

`On the Pad → T-minus & Counting → Lift-off → In Orbit (picked up)`

The queue **chimes** when a new order hits **Lift-off** so you hear it from the bar. Browser audio policies may block the chime until you click anywhere on the page once per session.

### Customer Display (`/instore/display`)
Half live order queue, half scrolling menu board. Designed for an external monitor pointed at the cafe seating area. **No sign-in required.** When there are no active orders, the queue side shows the animated launch scene as ambient branding.

### Help (`/help`)
This guide, in-app. Any signed-in user can open it from Mission Control.

---

## 3. The order lifecycle

Every order moves through four states. The labels are space-themed; the underlying values in the database are unchanged.

| Display label | DB enum | What it means |
|---|---|---|
| **On the Pad** | `RECEIVED` | Order placed, sitting in the queue. Barista hasn't started. |
| **T-minus & Counting** | `IN_PROGRESS` | Barista is making the drink. |
| **Lift-off** | `READY` | Drink is done — call the customer. Chime plays. |
| **In Orbit** | `PICKED_UP` | Customer has the cup. Drops off the queue/display. |

Transitions are one-way under normal flow. To cancel mid-flight: Bar Station has a per-card Cancel button; POS can also cancel from the order queue.

> **Theme note:** these status labels are the 3rd Space Coffee theme defaults. Switching to the Eco Delight Coffee theme renames them to the conventional `Received / In Progress / Ready / Picked Up`. The underlying DB values never change.

---

## 4. Daily operations

### Opening checklist
1. Power on the iPad/laptop and the customer display monitor.
2. Open https://coffeeinstore.vercel.app on each device.
3. **Customer iPad:** navigate to `/instore/kiosk` and bookmark to home screen.
4. **Counter iPad:** sign in as a manager, leave on `/instore/pos`.
5. **Bar iPad:** navigate to `/instore/bar` (the full barista view; `/instore/queue` is the tap-only alternative). Sign-in not required.
6. **External display:** point at `/instore/display`.
7. Verify the printer is connected (see §6).

### During service
- POS takes orders → fires to Queue → barista works through them.
- Lift-off chime alerts both bar and front-of-house.
- Customers reading the display see Lift-off orders and come collect.

### Closing checklist
1. From POS, scroll to the **Daily Sales Summary** at the bottom — note the totals.
2. Reconcile the cash drawer against the cash subtotal.
3. Any orders still on `On the Pad` or `T-minus`? Investigate or cancel.
4. Sign out everywhere.

---

## 5. Menu management (admin only)

### Add or edit a menu item
1. Mission Control → **Menu Admin**, or `/admin/menu`.
2. Click **+ New item** and fill in:
   - **Name** and **Category** (`ESPRESSO` / `DRIP` / `COLD` / `TEA` / `FOOD` / `RETAIL`)
   - **Base price** (small / default size)
   - **Medium / Large prices** — leave blank if no upsizing
   - **Sort order** — lower numbers show first within a category
   - **Allow sizes / milk / temp** toggles — turn off for items where these don't apply (e.g. a pastry doesn't need milk)
   - **Image URL** — optional; any public image URL
3. Click **Create**.

To edit an existing item, click **Edit** on its row, change fields, **Save**.

### Hide vs. delete
- **Hide** (toggle button): the item disappears from kiosk/POS but historical orders are preserved. Use this when you're 86'd on something. Toggle back when you restock.
- **Delete**: permanent. If the item has any historical orders, the system blocks the delete and tells you to hide instead.

### Add-on availability
On `/admin/menu`, the **Add-ons** section shows every modifier (extra shot, syrups, oat milk upgrade, etc.) as a tile. Click a tile to flip **Available ↔ Hidden**. Hidden add-ons don't appear in the customize step on kiosk or POS.

> Add-on **create / edit / delete** is not yet built — only the availability toggle. Tell an admin if you need a new add-on added; they can do it directly in the database for now.

---

## 6. Receipts and cup labels

Both are PDFs. The browser's print dialog handles them.

In POS, configure **Print Settings** (gear icon, top of the screen):
- **Printer type:** `Thermal` (62×29mm), `Receipt` (80mm), or `None`
- **Auto-print:** on/off — when on, a label/receipt is sent to print automatically when an order is created

On a Mac/iPad, just connect the printer over Bluetooth or USB and choose it in the system print dialog when it pops up. There's no driver step in the app itself.

---

## 7. Loyalty program

- Customer enters their phone number at the kiosk or gives it to staff at POS.
- Earn rate: **1 point per $1** spent (after discounts, on the discounted subtotal).
- Redeem: **100 points = $5 off** the next order.
- Members are auto-created on first order with that phone number.
- Member balances are visible after the order confirms (kiosk) or in the response (POS).

To look up a member: `/api/instore/loyalty?phone=5551234567` (admin/manager). UI for member lookup is on the roadmap.

---

## 8. Users and roles (admin only)

`/admin/users` lets you:
- **Create** a user (email, name, password, role)
- **Change role** via inline dropdown
- **Reset password**
- **Activate / Deactivate**

You **cannot** demote yourself or deactivate yourself — the system blocks both to prevent locking everyone out.

### Role permissions

| Role | Can use |
|---|---|
| `ADMIN` | Everything: POS, Queue, Display, Kiosk, Menu Admin, Users |
| `MANAGER` | POS, Queue, Display, Kiosk |
| `SALES_REP` | Queue, Display, Kiosk (no POS) |
| `ROASTER`, `PACKAGER` | Queue, Display, Kiosk (no POS) |

`SALES_REP`, `ROASTER`, `PACKAGER` exist for compatibility with the original schema. For a coffee shop, you typically only need `ADMIN` and `MANAGER`.

---

## 8.5. Brand & theme (admin only)

`/admin/brand` switches the active theme. Two presets ship today:

- **3rd Space Coffee** — retro space age. Saturn orange + deep navy palette, rocket-and-planet customer display, status labels read `On the Pad / T-minus & Counting / Lift-off / In Orbit`, hub heading is **Mission Control**.
- **Eco Delight Coffee** — warm coffeehouse. Forest-green + espresso-brown palette, coffee-cup customer display, conventional status labels (`Received / In Progress / Ready / Picked Up`), hub heading is **Café Hub**.

Switching:
1. Open `/admin/brand`.
2. Click **Apply** on the inactive theme's card.
3. Confirm the prompt. The page hard-reloads so the new theme paints without flash.

Effect on the rest of the system:
- Page chrome, accents, fonts, headings repaint everywhere.
- Wordmark, tagline, brand mark glyph swap.
- Status labels swap (Bar Station, Queue, Customer Display, POS).
- Receipt and cup-label PDF headers swap.
- Hub tile emojis and heading swap (rocket/planet vs. coffee/teapot).

Adding a third theme requires a code change — drop a new file under `src/themes/` exporting the same shape, register it in `src/themes/index.ts`, and add a CSS-variable block in `globals.css`. The Brand admin picks it up automatically.

---

## 8.6. Orders & refunds (admin/manager)

`/admin/orders` shows every in-store order in a date range. Each row expands to reveal item details, totals, and payment metadata. A manager or admin can **Refund** any order that hasn't already been refunded:

1. Click **Refund** on the order row.
2. Enter a reason (required).
3. Confirm.

The order stays in history but is flagged **Refunded** and excluded from net sales. Today's payment integration is honor-system, so the refund is a bookkeeping action — when Stripe Terminal is wired up, this is the spot that calls the Stripe refund API.

**Cash payment** (POS): clicking **💵 Cash** now opens a tender modal — like every real POS. The cashier types the amount tendered (or hits a quick-amount button: Exact / next $5 / $10 / $20 / $50 / $100), the modal shows live change due, and confirming creates the order as **PAID** in one motion. The receipt prints with tendered and change.

The **Mark Paid** button still appears on the POS queue card for any legacy `PENDING` order, but new cash orders won't create that state.

## 8.8. Loyalty admin (manager/admin)

`/admin/loyalty` is the customer-facing side of the loyalty program:

- **Search** by phone number or name (top-10 by balance otherwise)
- Click a member to see their full transaction history, points balance, total lifetime spend, and recent orders
- **+ Grant points** or **− Revoke points** with a required reason (recorded as an `ADJUST` transaction noting who did it)

Use cases: returning unhappy customer ("here's 50 free points, sorry"), fixing a misentered phone number's points, rewarding a regular.

## 8.9. Manual discounts on POS

When taking an order on `/instore/pos`, click **+ Add discount** above the totals to comp the order. Choose **% off** or **$ off**, enter the value, and provide a reason (required). The discount line shows up live in the subtotal and is recorded on the order along with the reason. Reports show a separate "Discounts" headline card.

This is what staff uses for "drink was cold, here's $2 off" or "first-time customer 10% off" comps.

## 8.7. Reports (admin/manager)

`/admin/reports` summarizes sales over a date range:

- **Headline cards:** gross, net (after refunds), order count, avg ticket, refund total + count, tax collected.
- **Revenue by day** — bar chart, one row per day in the range.
- **Top items** — by quantity sold, with category and revenue.
- **Revenue by category.**
- **By payment method.**

Presets: **Today**, **Last 7 days**, **Last 30 days**. Or pick any custom range.

## 9. Payments — current state

> **Important:** the system does not actually process card payments today.

| Method | What happens on submit |
|---|---|
| **Cash** | Cashier enters tendered amount in the modal, system calculates change. Order is created **PAID** in one motion. Receipt shows tendered + change. |
| **Card / Apple Pay** | Order is auto-marked `PAID` immediately on the honor system. **Run the customer's card on a separate device first.** |

If you somehow end up with a `PENDING` cash order (legacy data, or someone skipped the tender modal), the **💵 Mark Paid** button on the POS queue card flips it to PAID. For any order that needs to be reversed, use **Refund** on `/admin/orders` (manager+).

Real Stripe Terminal integration is on the roadmap — see `TODO.md` in the repo.

---

## 10. Troubleshooting

### "I can't sign in"
- Double-check email and password — both case-sensitive on email.
- Ask an admin to verify your account is `Active` in `/admin/users`.

### "An item won't appear on the kiosk"
- Open `/admin/menu` and confirm the item shows **Active** (not Hidden).
- Check the category — items in categories the kiosk doesn't show won't appear.

### "An add-on isn't selectable"
- `/admin/menu` → Add-ons → confirm it's **Available** (green border).
- Confirm the menu item allows that modifier (e.g. milk is only shown if the item has **Allow milk** enabled).

### "The chime isn't playing on the queue"
- Click anywhere on the queue page once. Browsers block audio until the user has interacted with the page.

### "The display went 404"
- The standalone app does **not** have `/instore/menu`. The customer display is `/instore/display`.

### "Tax looks wrong"
- The rate is stored in the `INSTORE_TAX_RATE` Vercel env var (currently `0.0875` = 8.75%).
- Changes require a redeploy or a manual env var rotation by the admin.

---

## 11. Known limits & roadmap

See `TODO.md` in the repo for the full list. Highlights:
- **Stripe Terminal** integration for real card payments (Tap to Pay on iPhone or hardware reader)
- **Image upload** for menu items (currently a URL field)
- **Employee time tracking** + per-employee sales
- **Partial refunds** (today's refunds are full-order only)
- **Recipe reference** screen for new barista training

---

## 12. URLs cheat-sheet

| URL | What it is | Sign-in |
|---|---|---|
| `/` | Redirects to Mission Control | required |
| `/instore/home` | Mission Control (staff hub) | required |
| `/instore/kiosk` | Customer self-serve | public |
| `/instore/pos` | Staff POS | manager+ |
| `/instore/bar` | **Bar Station** (full barista view with detail, timer, reprint) | public |
| `/instore/queue` | Lightweight tap-only queue | public |
| `/instore/display` | Customer-facing menu+queue | public |
| `/admin/orders` | Order history + refunds | manager+ |
| `/admin/reports` | Sales reports | manager+ |
| `/admin/loyalty` | Loyalty member admin | manager+ |
| `/admin/menu` | Menu items + add-ons (CRUD) | admin |
| `/admin/users` | Staff accounts | admin |
| `/admin/brand` | Theme + brand switcher | admin |
| `/help` | This guide | required |
| `/login` | Sign-in screen | n/a |

---

*Last updated: when this commit landed. For changes or issues, contact your admin or open an issue at https://github.com/JimLucas95338/coffee_instore/issues.*
