# agriLease

A Moroccan agritech platform combining an equipment rental marketplace with farm management (fields, crop cycles, workers, tasks, calendar) and a data-driven planning layer (yield prediction, equipment recommendations, demand forecasting, weather/soil integration).

- **`PROJECT_REPORT.md`** — full architecture, feature, security, and testing writeup.
- **`MODEL_CARD.md`** — every trained ML model: data sources, evaluation metrics (including the honestly-reported weak ones), and how to reproduce training.
- **`.env.example`** — required environment variables.

## Getting started

```bash
npm install
npx prisma migrate deploy   # or: npx prisma migrate dev
npx tsx prisma/seed.ts      # seed demonstration data
npm run dev                 # http://localhost:3000
```

Copy `.env.example` to `.env` first and fill in a real `JWT_SECRET` (see that file for how to generate one).

## Testing

```bash
npm test              # fast, self-contained (spins up a disposable SQLite DB)
npx vitest run --config vitest.postgres.config.ts   # same suite against Postgres (needs a running instance - see PROJECT_REPORT.md §Postgres)
```

## Explicitly out of scope for this phase

Documented here rather than silently omitted:

- **Payment processing** — `Booking.paymentStatus` is tracked, but no gateway is integrated. Adopting one (e.g. Stripe) would need API keys managed like `JWT_SECRET`, a webhook to reconcile payment events, and a decision on how `depositMad` maps to deposits/refunds.
- **Email/SMS delivery** — notifications are in-app only. Adopting it would need a provider (e.g. SendGrid for email, Twilio for SMS), templates, and a per-channel opt-in field on `User`.
- **A production deployment/CI pipeline** — not configured.

See `PROJECT_REPORT.md` §2.4 for the full scope statement.
