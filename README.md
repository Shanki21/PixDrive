# Pixdrive

Pixdrive is a cloud-first photo galleries and lightweight cloud-drive application built with Next.js, TypeScript, and Prisma. It provides passwordless/OTP authentication, gallery sharing, basic analytics, and a dashboard for managing galleries and uploads.

Table of contents
1. About
2. Features
3. Tech Stack
4. Getting Started
5. Prerequisites
6. Installation
7. API Configuration
8. Project Structure
9. Usage
10. User Roles
11. Development Notes
12. Troubleshooting

## 1. About

Pixdrive lets users create, share and manage image galleries. The app uses Cloudinary for image hosting, Prisma + PostgreSQL for data, and Next.js for server-rendered frontend and API routes.

## 2. Features

- Cloud-backed image galleries (public and private)
- Passwordless OTP-based authentication
- Gallery sharing and pin/cover images
- Drive-style upload/management UI and bulk downloads
- Simple analytics (visit counts) and reviews/comments
- Admin/dashboard area for managing galleries and settings
- QR code generation for quick gallery access

## 3. Tech Stack

- Frontend: Next.js 16, React, TypeScript
- Styling: Tailwind CSS
- Backend: Next.js API Routes (handlers) + Node.js
- Database: PostgreSQL via Prisma ORM
- Media: Cloudinary (uploads and asset management)
- Auth/Email: NextAuth + Resend or SMTP (OTP email)
- Payments (optional): Stripe

## 4. Getting Started

Clone the repository and install dependencies:

```bash
git clone <your-repo-url>
cd Pixdrive
npm install
```

Copy or create an `.env` file in the project root. See "API Configuration" below for required variables.

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run start
```

## 5. Prerequisites

- Node.js 18+ (recommended)
- PostgreSQL (local or hosted)
- Cloudinary account (for image uploads)
- Resend API key or SMTP credentials (for OTP emails), or configure the email provider you prefer

## 6. Installation

1. Install dependencies: `npm install`
2. Generate Prisma client (postinstall runs this automatically): `npm run db:generate`
3. Prepare the database and run migrations (development): `npm run db:migrate`

## 7. API Configuration

Create a `.env` in the project root with the following variables (example):

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/Pixdrive_dev?schema=public"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"

# Public client URL used by email links and client gallery URLs
NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL="http://localhost:3000/g"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email (choose one)
# Resend:
RESEND_API_KEY="resend_api_key_here"
RESEND_FROM_EMAIL="no-reply@example.com"

# Or SMTP:
# SMTP_HOST="smtp.example.com"
# SMTP_PORT="587"
# SMTP_USER="smtp-user"
# SMTP_PASS="smtp-password"
# SMTP_FROM_EMAIL="no-reply@example.com"

# Optional distributed rate limiting (recommended in production):
# UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Optional payment (Stripe)
# STRIPE_SECRET_KEY="sk_test_..."
# STRIPE_WEBHOOK_SECRET="whsec_..."
```

Notes:
- The project includes `scripts/check-env.mjs` which validates critical env vars when `NODE_ENV=production` or `CHECK_ENV_STRICT=1`.
- Keep real secrets out of source control. Use your hosting platform environment variables in staging/production.

## 8. Project Structure

- `src/app/` - Next.js app routes, pages and API routes
- `src/components/` - Reusable React components
- `src/lib/` - Server/browser helper modules (Cloudinary, Prisma client, session helpers)
- `prisma/` - Prisma schema and migration history
- `public/` - Static assets (images, icons)
- `tests/` - Minimal unit tests and test runner
- `scripts/` - Utility scripts (environment checks)

## 9. Usage

Common scripts:

```bash
npm run dev           # local development
npm run build         # production build (runs prisma generate first)
npm run start         # run built app
npm run env:check     # run environment checks (strict in production)
npm run db:migrate    # apply Prisma migrations in dev
npm run db:deploy     # run migrations in production
npm run pins:backfill # dry-run PIN hash backfill (use -- --apply to persist)
npm run lint          # run ESLint
npm run test:unit     # run unit-style tests included in tests/
```

## 10. User Roles

Pixdrive's codebase expects basic user distinctions. Typical roles used in projects like this:

- Admin / Owner: full access to dashboards, site settings, and user management.
- Editor / Contributor: can create/edit galleries and content.
- Viewer / Public: read-only access to public galleries and shared links.

Adjust role names and permission checks inside the auth and API layers to match your deployment needs.

## 11. Development Notes

- Prisma: commit `prisma/migrations` when changing the schema and run `npm run db:migrate` locally.
- Cloudinary: ensure the Cloudinary env vars are set before testing uploads.
- Postinstall runs `prisma generate` so the Prisma client is available after `npm install`.
- Keep TypeScript strict settings active. If you need to bypass strictness for quick experiments, prefer short-lived branches.

## 12. Troubleshooting

- "Database connection failed": check `DATABASE_URL`, ensure Postgres is running and reachable.
- "Cloudinary is not configured": set `CLOUDINARY_*` env vars and restart the server.
- "Email provider is not configured": configure `RESEND_` keys or full SMTP credentials.
- "Prisma Client not found": run `npm run db:generate` or `npm install` (postinstall should run generate).
- TypeScript/Next build errors: run `npm run dev` and inspect the stack trace; common issues are invalid `tsconfig.json` options or misplaced env values.
- Use `npm run env:check` (with `CHECK_ENV_STRICT=1`) to surface missing/placeholder env variables.


