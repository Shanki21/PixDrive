# Pixora Production Pre-Launch Checklist

Run this checklist on the real production domain before onboarding users. Razorpay checkout, subscriptions, webhooks, and settlements are intentionally excluded.

Stop launch immediately when a required check fails. Record evidence links or notes beside each completed item.

## 1. Automated Gate

Pull the production environment variables into the shell, then run:

```bash
npm run db:deploy
npm run readiness:prod
PRODUCTION_SMOKE_URL=https://your-domain.com PRODUCTION_SMOKE_TOKEN=your-monitoring-token npm run smoke:prod
LOAD_TEST_URL=https://your-domain.com LOAD_TEST_CONCURRENCY=50 LOAD_TEST_DURATION_SECONDS=60 npm run load:test
```

Expected results:

- `npm run db:deploy` applies committed migrations successfully.
- `npm run readiness:prod` passes with an Upstash read/write probe.
- `npm run smoke:prod` passes all checks and creates Sentry and PostHog smoke events.
- `npm run load:test` reports zero failed requests and p95 below 800 ms.

Set `CUSTOM_DOMAIN_CNAME_TARGET` before exposing custom domains to customers. Keep custom domains unavailable until DNS verification has passed in production.

## 2. Infrastructure Evidence

- [ ] Production uses a PostgreSQL database separate from local and staging. Evidence:
- [ ] A fresh production backup exists. Evidence:
- [ ] A restore drill into a throwaway database succeeded. Evidence:
- [ ] `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL` are production values. Evidence:
- [ ] Cloudinary, Resend, Upstash, Sentry, and PostHog production credentials are configured. Evidence:
- [ ] Previously exposed secrets have been rotated. Evidence:
- [ ] The previous deployment is available for rollback. Evidence:

## 3. Core Product Smoke Test

Use one dedicated production test studio account and one client incognito session.

- [ ] Homepage, login, and signup open on the live HTTPS domain. Evidence:
- [ ] OTP email arrives through the real provider. Evidence:
- [ ] Login persists after refresh and logout redirects dashboard URLs to login. Evidence:
- [ ] Create a labeled test event with dates, description, access settings, and PIN protection. Evidence:
- [ ] Upload several photos, set a cover, create folders, reorder content, and verify photo actions. Evidence:
- [ ] Generate One QR and open the public gallery in an incognito session. Evidence:
- [ ] Verify PIN unlock, favorites, single download, and bulk download. Evidence:
- [ ] Confirm visits, downloads, and client actions appear in the dashboard. Evidence:
- [ ] Archive or delete the test event and confirm the expected result. Evidence:
- [ ] Remove the test account and event, or leave them clearly labeled as production smoke data. Evidence:

## 4. Mobile And Responsive QA

Test desktop, one Android phone, and one iPhone-sized viewport. Include portrait, landscape, and a throttled slow-network pass.

- [ ] Homepage, login, signup, dashboard, My Events, Create Event, One QR, settings, and public gallery have no horizontal scrolling. Evidence:
- [ ] Mobile navigation stays reachable. Evidence:
- [ ] Buttons, menus, upload controls, photo selection, favorites, and downloads work without hover. Evidence:
- [ ] Login, upload, and public gallery loading remain usable on a slow network. Evidence:

## 5. Operations Sign-Off

- [ ] Cloudinary asset URLs load over HTTPS. Evidence:
- [ ] Repeated OTP and PIN attempts are throttled by Upstash-backed limits. Evidence:
- [ ] Authorized database health check returns `200`. Evidence:
- [ ] The `Pixora Sentry smoke test` issue appears in the production Sentry project. Evidence:
- [ ] The `pixora_posthog_smoke_test` event appears in the production PostHog project. Evidence:
- [ ] Production logs contain no repeated errors during smoke testing. Evidence:
- [ ] Uptime monitoring covers the homepage and authorized database health endpoint. Evidence:
- [ ] Backup owner, rollback owner, and launch decision maker are named. Evidence:

## Launch Decision

- [ ] **GO:** Every required item above has evidence and no blocking issue remains.
- [ ] **NO-GO:** Stop onboarding, record the failed item, and roll back when the failure came from the new deployment.

