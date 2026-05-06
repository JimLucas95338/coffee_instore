# TODO

## Real payment processing (Stripe)

Today the POS treats card payments as honor-system: clicking **Card** marks
the order `PAID` immediately, and `CASH` stays `PENDING` until a staff
member confirms cash was collected. **No real money moves.** Replace
before going live with paying customers.

### Recommended path: Stripe Terminal (Tap to Pay on iPhone)

No extra hardware. Customer taps card or phone on the iPad/iPhone running
the kiosk or POS.

What to add:

- `npm i stripe @stripe/stripe-js @stripe/terminal-js`
- Env vars on Vercel: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_TERMINAL_LOCATION_ID`
- `POST /api/instore/stripe/connection-token` — issues short-lived terminal
  token (auth: any signed-in staff)
- `POST /api/instore/stripe/payment-intent` — creates PI for an order id,
  returns `client_secret` to the reader
- `POST /api/instore/stripe/webhook` — listens for `payment_intent.succeeded`
  and `payment_intent.payment_failed`, flips `paymentStatus` accordingly
- POS Card button flow: discover reader → connect → create PI → reader
  collects → process payment → on success, the webhook (or a
  client-side capture confirmation) flips the order to PAID
- Refund flow in `/instore/queue` for managers (PI capture cancel for
  uncaptured, refund API for captured)

### Files that will need changes

- `src/app/api/instore/orders/route.ts` — drop the auto-mark-PAID for CARD;
  PI succeeded webhook becomes the source of truth
- `src/app/api/instore/orders/[id]/pay/route.ts` — keep for cash
  reconciliation only
- `src/app/instore/pos/page.tsx` — replace `submitOrder('CARD')` with a
  reader-collect flow

### Other open work

- Add-on **create/edit/delete** UI (today only `isActive` toggle exists)
- `/instore/menu` redirect → `/instore/display` for backwards-compat
  with old bookmarks
- Cash drawer "Mark Paid" button on `/instore/queue` for `PENDING` orders
