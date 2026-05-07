# Pixora Production Checklist

## Completed in codebase
- [x] OTP and gallery unlock throttling with distributed Upstash support and local fallback.
- [x] Upload API validation for allowed image formats and secure public HTTPS URLs.
- [x] Bulk download hardening with request throttling and ZIP size/file limits.
- [x] Single download hardening with content-type and size caps.
- [x] DB foreign-key cascades/set-null protections added in Prisma schema and migration.
- [x] Plaintext gallery PIN backfill script added and applied.
- [x] Preview-only action wording removed from dashboard gallery actions in favor of One QR access.
- [x] Frontend lint warnings cleaned (lint now passes with zero warnings/errors).
- [x] CI workflow added to enforce env check, typecheck, lint, tests, and build.

## Commands used to verify
```bash
npx tsc --noEmit
npm run lint
npm run test:unit
npm run build
npm run db:deploy
npm run pins:backfill -- --apply
```

## Still required outside code (deployment tasks)
- [ ] Configure production secrets: `DATABASE_URL`, `NEXTAUTH_SECRET`/`AUTH_SECRET`, email provider, Cloudinary.
- [ ] Configure distributed throttling secrets: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- [ ] Deploy to staging and run full smoke test with real domain/HTTPS/email delivery.
- [ ] Enable production monitoring/alerts (application logs + uptime + error rate alerts).
- [ ] Run backup/restore drill for PostgreSQL before launch.
