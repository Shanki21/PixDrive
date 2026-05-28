# Pixora Production Scale Runbook

Use this runbook before onboarding paid beta studios or running a large public gallery campaign.

## 1. Upstash Redis
- Create an Upstash Redis database in the same broad region as the Vercel deployment.
- Copy the REST URL into `UPSTASH_REDIS_REST_URL`.
- Copy the REST token into `UPSTASH_REDIS_REST_TOKEN`.
- Add both values to Vercel project environment variables for staging and production.
- Run `npm run readiness:prod`.
- Expected result: `PASS Redis probe: Upstash read/write probe passed.`

Redis is used for distributed rate limits, public gallery visit dedupe, cache, and background queue readiness. Without it, Pixora falls back to per-instance memory, which is not enough for multi-instance production.

## 2. Vercel WAF And Rate Limits
Configure WAF/rate limits at the platform edge before traffic reaches Next.js.

Recommended starting rules:
- `/api/auth/request-otp`: strict IP rate limit.
- `/api/auth/verify-otp`: strict IP rate limit.
- `/api/galleries/*/photos`: medium owner-authenticated rate limit.
- `/api/galleries/*/visit`: high public-gallery rate limit.
- `/api/galleries/*/client-actions`: high public-gallery rate limit.
- `/api/billing/*`: strict IP rate limit.
- `/api/disk*`: medium public-gallery unlock/download rate limit.

Keep app-level throttles enabled even with WAF. WAF protects the edge; app throttles protect business-specific identities like email, gallery, and client key.

## 3. Monitoring
- Add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.
- Add a long random `SENTRY_TEST_TOKEN`.
- Set `MONITORING_REQUIRED=1` in production once Sentry is live.
- Add `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`.
- Verify production errors appear in Sentry after a staging smoke test.
- Verify signup, OTP verified, gallery created, upload, checkout, and public gallery viewed events appear in PostHog.

Sentry smoke test after deploy:

```bash
curl -X POST https://your-domain.com/api/monitoring/sentry-test \
  -H "x-sentry-test-token: your-token"
```

Expected result: `{ "ok": true, "eventId": "..." }`, followed by a `Pixora Sentry smoke test` issue in Sentry.

## 4. Load Test
Run local smoke:

```bash
npm run load:test
```

Run staging/prod smoke:

```bash
LOAD_TEST_URL=https://your-domain.com LOAD_TEST_CONCURRENCY=50 LOAD_TEST_DURATION_SECONDS=60 npm run load:test
```

Target before paid beta:
- p95 below 800 ms for public/static/auth-check paths.
- zero 5xx errors.
- no database connection alerts.
- no Redis errors in logs.

## 5. Paid Beta Gate
Do not onboard paid beta users until all are true:
- `npm run readiness:prod` passes.
- `npm run build` passes.
- Supabase backups/PITR are enabled.
- At least one backup restore drill is completed.
- WAF rules are active.
- Sentry receives staging errors.
- A 60 second load test has zero 5xx failures.

## 6. Media Storage Path
- Launch storage provider remains `STORAGE_PROVIDER=cloudinary`.
- All app code should call `src/lib/storage.ts` instead of calling Cloudinary directly.
- Owner uploads should use `/api/storage/signed-upload` for direct browser-to-provider upload before storing metadata.
- R2 signed PUT uploads are available behind the same endpoint when `STORAGE_PROVIDER=r2`.
- Do not switch production to `STORAGE_PROVIDER=r2` until CORS, public bucket/domain access, delete handling, thumbnail generation, and a migration script are tested in staging.
- R2 bucket CORS must allow `PUT` from the Pixora app domain and expose public reads through `R2_PUBLIC_BASE_URL`.
