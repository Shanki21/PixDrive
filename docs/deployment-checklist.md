# Staging And Production Checklist

Use this checklist before every hosted deployment.

For the final production sign-off, use `docs/production-pre-launch-checklist.md`. That checklist intentionally excludes Razorpay validation when payments are not part of the launch gate.

## 1. Database strategy

- Keep PostgreSQL in local, staging, and production.
- Use a separate database for each environment.
- Never point staging or production at your local database.
- Commit Prisma migrations before deploying.
- Use `npm run db:deploy` in hosted environments.

## 2. Environment variables

Required core variables:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL`

Authentication:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Media:

- `STORAGE_PROVIDER` (`cloudinary` for launch)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_URL`
- Future R2 path: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`

Email:

- Either `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- Or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`

Payments:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_PLAN_STARTER_MONTHLY`
- `RAZORPAY_PLAN_STARTER_YEARLY`
- `RAZORPAY_PLAN_STUDIO_MONTHLY`
- `RAZORPAY_PLAN_STUDIO_YEARLY`
- `RAZORPAY_PLAN_ELITE_MONTHLY`
- `RAZORPAY_PLAN_ELITE_YEARLY`
- `RAZORPAY_PLAN_SCALE_MONTHLY`
- `RAZORPAY_PLAN_SCALE_YEARLY`
- Optional global billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_*`

Observability:

- Optional while pre-beta, recommended before public launch: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- Optional product analytics: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- Set `MONITORING_REQUIRED=1` when missing Sentry should block production validation.

## 3. Staging readiness

- Staging app URL is live.
- Staging `DATABASE_URL` points to a hosted staging PostgreSQL instance.
- `NEXTAUTH_URL` matches the staging app URL.
- `NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL` matches the staging gallery base URL.
- Media storage staging credentials are configured.
- Email provider is configured and can send OTP emails.
- Razorpay test keys, webhook secret, and plan IDs are configured for staging.
- Sentry and PostHog staging projects receive events.
- Run `npm run db:deploy` against staging before release testing.

## 4. Staging QA pass

- Sign-in or OTP flow works end to end.
- Gallery creation works.
- Photo upload works.
- Public client gallery link opens correctly.
- Favorites/download/client action flows work.
- Email delivery works.
- Cloudinary uploads and asset access work.
- Razorpay checkout, verification, and webhook plan unlock work in test mode.
- Sentry receives a test server error.
- PostHog receives signup, checkout, upload, and gallery-view events.
- Build and runtime logs are clean enough to release.

## 5. Production launch checklist

- Production database is provisioned and backed up.
- Production `DATABASE_URL` is set in the hosting platform.
- Production `NEXTAUTH_URL` matches the live domain.
- Production `NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL` matches the live gallery URL.
- Production media storage credentials are configured.
- Production email provider credentials are configured.
- Production Razorpay live keys, webhook secret, and subscription plan IDs are configured.
- Production Stripe live keys are configured only if the account is approved and global billing is enabled.
- Production Sentry and PostHog projects are configured.
- Upstash Redis is configured; local memory fallback is not acceptable for paid beta rate limiting.
- Supabase backups/PITR are enabled before onboarding paid users.
- A backup/restore drill has succeeded into a throwaway database.
- All secrets that were previously exposed have been rotated.
- `npm run db:deploy` has been run successfully against production.
- A rollback plan exists.

## 6. Paid beta operations

- Start with 5-10 studios and keep manual support available during onboarding.
- Verify Razorpay settlement, receipt, refund, and failed-payment handling before expanding.
- Monitor Sentry errors, Vercel logs, Razorpay webhooks, Cloudinary usage, and Supabase database health daily.
- Track PostHog funnel events: signup started, OTP verified, gallery created, photo uploaded, checkout started, payment success/failure, public gallery viewed.
- Keep PayPal out of beta scope; add it later only for meaningful non-India demand.

## 7. Rollback plan

- Keep the previous production deployment available.
- Take a database backup before running production migrations.
- If app-only issues appear, roll back the app first.
- If a migration causes issues, stop traffic changes and restore from backup instead of improvising on live data.

## 8. CTO operating rules

- Local is for building.
- Staging is for verification.
- Production is for stability.
- Never test risky schema changes first in production.
- Never share one database across environments.
