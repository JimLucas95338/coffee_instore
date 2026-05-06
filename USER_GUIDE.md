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

### Queue (`/instore/queue`)
Barista station. Shows every active order in the launch narrative columns. Tap an order's button to advance its status:

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

Transitions are one-way under normal flow. To cancel mid-flight, manager/admin can hit cancel from POS.

---

## 4. Daily operations

### Opening checklist
1. Power on the iPad/laptop and the customer display monitor.
2. Open https://coffeeinstore.vercel.app on each device.
3. **Customer iPad:** navigate to `/instore/kiosk` and bookmark to home screen.
4. **Counter iPad:** sign in as a manager, leave on `/instore/pos`.
5. **Bar iPad:** navigate to `/instore/queue` (sign-in not required to view).
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

## 9. Payments — current state

> **Important:** the system does not actually process card payments today.

| Method | What happens on submit |
|---|---|
| **Cash** | Order created with status `PENDING`. Staff confirms cash collected, then a future "Mark Paid" button (not built yet) will flip it to `PAID`. For now the daily summary shows it as cash. |
| **Card / Apple Pay** | Order is auto-marked `PAID` immediately on the honor system. **Run the customer's card on a separate device first.** |

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
- **Mark Paid** UI for cash orders
- **Add-on create/edit/delete** UI (today only the toggle works)
- **Loyalty member lookup** UI

---

## 12. URLs cheat-sheet

| URL | What it is | Sign-in |
|---|---|---|
| `/` | Redirects to Mission Control | required |
| `/instore/home` | Mission Control (staff hub) | required |
| `/instore/kiosk` | Customer self-serve | public |
| `/instore/pos` | Staff POS | manager+ |
| `/instore/queue` | Barista queue | public (view) |
| `/instore/display` | Customer-facing menu+queue | public |
| `/admin/menu` | Menu items + add-ons | admin |
| `/admin/users` | Staff accounts | admin |
| `/help` | This guide | required |
| `/login` | Sign-in screen | n/a |

---

*Last updated: when this commit landed. For changes or issues, contact your admin or open an issue at https://github.com/JimLucas95338/coffee_instore/issues.*
