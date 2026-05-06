# 3rd Space Coffee — In-Store

Standalone Next.js app for 3rd Space Coffee's in-store ordering: kiosk, POS, queue, customer display, loyalty, and admin tools.

Originally extracted from a larger monorepo and rebranded. Runs on its own Neon Postgres database and Vercel project.

## Routes

- `/instore/kiosk` — customer self-serve kiosk
- `/instore/pos` — staff POS (manager auth required)
- `/instore/queue` — barista queue display (kitchen)
- `/instore/display` — combined customer-facing menu + queue board
- `/login` — manager sign-in

## Setup

```bash
cp .env.example .env.local
# fill in DATABASE_URL, NEXTAUTH_SECRET
npm install
npm run dev
```

## Deploy

Push to GitHub → import in Vercel → set env vars → deploy.

Required env vars in Vercel:
- `DATABASE_URL`, `DIRECT_URL` (Postgres connection — same as main app)
- `NEXTAUTH_SECRET` (32+ char random string)
- `NEXTAUTH_URL` (your Vercel URL)
- `INSTORE_TAX_RATE` (optional, defaults to 0.08)
