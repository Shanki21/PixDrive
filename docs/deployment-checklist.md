# Staging And Production Checklist

Use this checklist before every hosted deployment.

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

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_URL`

Email:

- Either `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- Or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`

Payments:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## 3. Staging readiness

- Staging app URL is live.
- Staging `DATABASE_URL` points to a hosted staging PostgreSQL instance.
- `NEXTAUTH_URL` matches the staging app URL.
- `NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL` matches the staging gallery base URL.
- Cloudinary staging credentials are configured.
- Email provider is configured and can send OTP emails.
- Stripe test keys are configured for staging.
- Run `npm run db:deploy` against staging before release testing.

## 4. Staging QA pass

- Sign-in or OTP flow works end to end.
- Gallery creation works.
- Photo upload works.
- Public client gallery link opens correctly.
- Favorites/download/client action flows work.
- Email delivery works.
- Cloudinary uploads and asset access work.
- Build and runtime logs are clean enough to release.

## 5. Production launch checklist

- Production database is provisioned and backed up.
- Production `DATABASE_URL` is set in the hosting platform.
- Production `NEXTAUTH_URL` matches the live domain.
- Production `NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL` matches the live gallery URL.
- Production Cloudinary credentials are configured.
- Production email provider credentials are configured.
- Production Stripe live keys and webhook secret are configured if payments are enabled.
- All secrets that were previously exposed have been rotated.
- `npm run db:deploy` has been run successfully against production.
- A rollback plan exists.

## 6. Rollback plan

- Keep the previous production deployment available.
- Take a database backup before running production migrations.
- If app-only issues appear, roll back the app first.
- If a migration causes issues, stop traffic changes and restore from backup instead of improvising on live data.

## 7. CTO operating rules

- Local is for building.
- Staging is for verification.
- Production is for stability.
- Never test risky schema changes first in production.
- Never share one database across environments.
