# Pixora Clone

Pixora is a Next.js application that uses Prisma with PostgreSQL. The safest way to finish this project is:

1. Build and test against a local PostgreSQL database.
2. Promote the same Prisma schema and migrations to staging and production.
3. Keep PostgreSQL in every environment so the app behaves consistently.

## Local development

### 1. Create a local PostgreSQL database

Create a database named `pixora_dev` on your machine.

Example connection string:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pixora_dev?schema=public"
```

The local `.env` in this repo is already set to that default.

### 2. Install dependencies

```bash
npm install
```

### 3. Apply the database schema

```bash
npm run db:migrate
```

This runs Prisma migrations against your local database and regenerates the Prisma client.

### 4. Start the app

```bash
npm run dev
```

## Environment strategy

Use separate secrets per environment. Do not reuse the same database between local development and production.

### Local

- File: `.env`
- Database: local PostgreSQL
- Purpose: feature development and day-to-day testing

### Staging

- Platform env vars only
- Database: hosted PostgreSQL
- Purpose: deployment verification, QA, and final user-flow testing

### Production

- Platform env vars only
- Database: hosted PostgreSQL
- Purpose: live traffic

Use [`.env.example`](D:/wfolio-clone/.env.example) as the template for new environments. Keep real secrets out of git.

Detailed operating guides:

- [Windows PostgreSQL setup](D:/wfolio-clone/docs/windows-postgres-setup.md)
- [Staging and production checklist](D:/wfolio-clone/docs/deployment-checklist.md)

## Prisma workflow

### During development

When you change `prisma/schema.prisma`, create a migration:

```bash
npm run db:migrate
```

Useful commands:

```bash
npm run db:generate
npm run db:push
npm run db:studio
npm run db:status
```

### Before deploying

Make sure all schema changes are committed in `prisma/migrations`.

### In production

Run only:

```bash
npm run db:deploy
```

Use `prisma migrate deploy` in hosted environments. Do not use `prisma migrate dev` in production.

## Moving from local PostgreSQL to cloud PostgreSQL

When the project is ready:

1. Provision a hosted PostgreSQL database.
2. Set the production `DATABASE_URL` in your hosting platform.
3. Run `npm run db:deploy`.
4. Deploy the application.

If you need existing local data in the cloud, export it from local Postgres and import it into the hosted database before launch.

## CTO recommendation

- Keep the database engine the same everywhere: PostgreSQL.
- Make Prisma migrations the source of truth.
- Add a staging environment before production launch.
- Rotate any secrets that were previously exposed.
- Never put production credentials in local setup docs or committed files.
