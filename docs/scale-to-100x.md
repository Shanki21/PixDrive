# Scaling Pixora to 100x Traffic

This document lists pragmatic, prioritized steps to keep Pixora smooth as traffic grows from beta studios to serious production volume.

## Completed In Code
- Dashboard gallery lists can load without expensive visit/download aggregation by using `/api/galleries?metrics=0`.
- Dashboard metrics refresh later with `/api/galleries?metrics=1`, so navigation is not blocked by analytics.
- Client gallery list cache now lasts 5 minutes and separates fast list data from metrics data.
- Public gallery photo pagination returns CDN-friendly cache headers for unlocked galleries.
- Public gallery visit dedupe uses the cache layer before touching Postgres.
- Favorite/download counter refresh now uses grouped queries instead of two count queries per photo.
- Dashboard visual weight was reduced by removing heavy blur/shadow/hover work from high-repeat surfaces.

## Required For Million-User Scale
- Run Pixora as stateless app instances behind Vercel/CDN with WAF and endpoint rate limits enabled.
- Use Supabase Postgres Pro or higher with PITR, connection pooling, and database alerts.
- Configure Upstash Redis in production for throttling, dedupe, cache, and background queues.
- Keep uploads direct-to-Cloudinary and serve transformed images from Cloudinary CDN.
- Move non-critical writes like analytics, email, and webhook enrichment into background jobs.
- Add Sentry or equivalent error monitoring and PostHog/product analytics before paid beta growth.
- Run load tests before major onboarding waves, especially public gallery view, photo pagination, OTP, upload, and dashboard list paths.

## Database Priorities
- Keep gallery/photo listing queries paginated.
- Avoid full-table groupBy calls on request paths used by navigation.
- Add or verify indexes before introducing new filters.
- Archive or roll up high-volume analytics tables once visit/action rows become large.

## Operational Checklist
- Enable Supabase backups and test restore into a throwaway project.
- Configure Vercel WAF/rate limits for auth, upload, billing, public gallery, and analytics APIs.
- Keep production secrets only in the hosting provider.
- Monitor p95/p99 latency, DB connection count, slow queries, error rate, queue depth, and Redis availability.
- Use staged rollouts for schema changes and high-traffic features.

## Commands
- `npm run readiness:prod` verifies required production services and runs an Upstash Redis read/write probe.
- `npm run load:test` runs a lightweight HTTP load test against `http://localhost:3000` by default.
- `LOAD_TEST_URL=https://your-domain.com LOAD_TEST_CONCURRENCY=50 LOAD_TEST_DURATION_SECONDS=60 npm run load:test` tests a deployed environment.
- Follow `docs/production-scale-runbook.md` before onboarding paid beta studios.
