# Windows PostgreSQL Setup

This project uses Prisma with PostgreSQL. For local development on Windows, create a local database named `pixora_dev`.

## Option A: Install with the official PostgreSQL installer

1. Download PostgreSQL 16 for Windows from EnterpriseDB:
   https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Run the installer as Administrator.
3. Choose the default components:
   - PostgreSQL Server
   - Command Line Tools
   - pgAdmin
4. Set a password for the `postgres` superuser.
5. Keep the default port: `5432`
6. Finish installation.

Recommended install choices:

- Version: PostgreSQL 16
- Port: `5432`
- Username: `postgres`
- Database password: pick one you can remember and update [`.env`](D:/wfolio-clone/.env#L1) to match it

## Verify the installation

Open a new PowerShell window and run:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" --version
```

If that works, PostgreSQL is installed correctly.

## Create the local database

Replace `your-password` with the password you chose during installation:

```powershell
$env:PGPASSWORD = "your-password"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE pixora_dev;"
```

If the database already exists, PostgreSQL will tell you. That is fine.

## Update the project env file

Set [`.env`](D:/wfolio-clone/.env#L1) to match your local password:

```env
DATABASE_URL="postgresql://postgres:your-password@localhost:5432/pixora_dev?schema=public"
```

## Run Prisma migrations

From the project root:

```powershell
cmd /c npm run db:migrate
cmd /c npm run dev
```

## Optional: add PostgreSQL to PATH

If you want to use `psql` directly in every terminal:

1. Open Windows Search and search for `Edit the system environment variables`
2. Open `Environment Variables`
3. Edit `Path`
4. Add:

```text
C:\Program Files\PostgreSQL\16\bin
```

5. Open a new terminal and test:

```powershell
psql --version
```

## Troubleshooting

### `psql` is not recognized

Use the full path to `psql.exe` or add PostgreSQL to `PATH`.

### `password authentication failed`

The password in [`.env`](D:/wfolio-clone/.env#L1) must match the password for the local `postgres` user.

### `database "pixora_dev" does not exist`

Create it with the `psql` command above, then rerun:

```powershell
cmd /c npm run db:migrate
```

### Port `5432` is busy

Install PostgreSQL on a different port and update [`.env`](D:/wfolio-clone/.env#L1) accordingly.
