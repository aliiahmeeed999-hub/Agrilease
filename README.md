# agriLease

A Moroccan agritech platform combining an equipment rental marketplace with farm management (fields, crop cycles, workers, tasks, calendar) and a data-driven planning layer (yield prediction, equipment recommendations, demand forecasting, weather/soil integration).

- **`PROJECT_REPORT.md`** — full architecture, feature, security, and testing writeup.
- **`MODEL_CARD.md`** — every trained ML model: data sources, evaluation metrics (including the honestly-reported weak ones), and how to reproduce training.
- **`.env.example`** — required environment variables.

## Getting started

The app runs on PostgreSQL 16. Copy `.env.example` to `.env` first: it has the `docker run` command for a local database, the two connection strings, and how to generate a real `JWT_SECRET`.

```bash
npm install
npx prisma migrate deploy   # apply migrations to DATABASE_URL
npx prisma db seed          # seed demonstration data
npm run dev                 # http://localhost:3000
```

`npx prisma migrate reset` deletes everything in the database `DATABASE_URL` points to. Use it only on a database you can lose.

## Testing

```bash
npm test   # resets and migrates TEST_DATABASE_URL, then runs the suite against it
```

Tests use a real PostgreSQL database, not mocks. `TEST_DATABASE_URL` must point to a database used only for tests, because every run wipes it.

## Explicitly out of scope for this phase

Documented here rather than silently omitted:

- **Payment processing** — `Booking.paymentStatus` is tracked, but no gateway is integrated. Adopting one (e.g. Stripe) would need API keys managed like `JWT_SECRET`, a webhook to reconcile payment events, and a decision on how `depositMad` maps to deposits/refunds.
- **Email/SMS delivery** — notifications are in-app only. Adopting it would need a provider (e.g. SendGrid for email, Twilio for SMS), templates, and a per-channel opt-in field on `User`.
- **A production deployment/CI pipeline** — not configured.

See `PROJECT_REPORT.md` §2.4 for the full scope statement.
