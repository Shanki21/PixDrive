# Pixora Paid Beta Runbook

## Vendor stack

- Hosting: Vercel.
- Database: Supabase Postgres Pro with backups/PITR.
- Media: Cloudinary.
- Email OTP: Resend primary, SMTP fallback.
- India payments: Razorpay subscriptions.
- Global payments: Stripe only after approval and live configuration.
- Rate limiting/cache/jobs: Upstash Redis.
- Monitoring: Sentry for errors and PostHog for product events.

## Launch sequence

1. Deploy staging with separate Supabase, Cloudinary, Resend, Upstash, Razorpay test, Sentry, and PostHog projects.
2. Run `npm run db:deploy` against staging.
3. Run `npm run build`, `npx tsc --noEmit`, `npm run test:unit`, `npm run lint`, and strict env validation.
4. Complete QA: OTP, gallery create, upload, public gallery, downloads, analytics, Razorpay checkout, Razorpay webhook, custom domains.
5. Restore a Supabase backup into a throwaway database.
6. Deploy production, run migrations, and onboard 5-10 studios manually.

## Payment operations

- Razorpay subscription webhooks must point to `/api/billing/razorpay/webhook`.
- Failed or cancelled subscriptions should leave the account on free-plan limits.
- Refunds are handled in Razorpay Dashboard first, then verified against Pixora subscription status.
- Stripe routes stay hidden unless Stripe env vars and price IDs are configured.
- PayPal is deferred until international demand justifies it.

## Daily founder checks

- Sentry: new issues and payment/upload/auth errors.
- PostHog: signup to paid conversion, gallery creation, upload success, public views.
- Razorpay: failed payments, webhook delivery, settlements.
- Cloudinary: storage, bandwidth, transformation usage.
- Supabase: database size, slow queries, backups/PITR health.
- Vercel: function errors, firewall/rate-limit activity, bandwidth.

## Rollback

- Prefer app rollback first for UI/API regressions.
- For migration issues, stop onboarding, restore the latest verified backup, and redeploy the previous app version.
- Never point production at staging or local databases.
