# Codename Mae Backend

A TypeScript + Express backend for mobile app following clean architecture.

## Structure

- `src/domain`: Business entities and value objects
- `src/application`: Use cases and application services
- `src/infrastructure`: External interfaces like repositories and external services
- `src/presentation`: Controllers and routes
- `src/shared`: Common utilities and types

## Setup

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

## Database & migrations

Postgres runs on Railway. Schema changes are versioned with **Prisma migrations**
(`prisma/migrations/`) — never with `prisma db push`. Branches map to Railway
environments like this:

| Where | Railway environment |
| --- | --- |
| `dev` branch | development |
| `main` branch | production |
| Open PR (draft or not) | a temporary per-PR environment, created automatically |

### Changing the schema

A PR environment starts with it's own database, and you need its connection URL
*before* you can migrate. So, the flow is to deploy the environment first, then migrate against it:

```bash
# 1. Edit the schema.
#    prisma/schema.prisma

# 2. Push the branch and open the PR as a DRAFT.
#    Railway spins up the per-PR environment and deploys automatically.

# 3. In Railway, open the PR environment's Postgres service and copy its
#    DATABASE_PUBLIC_URL. Point your local env or modify the .env file to use that URL:
export DATABASE_URL="<PR environment DATABASE_PUBLIC_URL>"

# 4. Create + apply the migration against that PR database:
npm run db:migrate:dev -- --name <descriptive_name>
#    (= prisma migrate dev generates prisma/migrations/<timestamp>_<name>/ and applies it)

# 5. Test the app against the PR environment, then commit the generated
#    migration folder and push. Mark the PR ready for review when it works.
```

To only **apply** already-committed migrations to a database (no new migration generated):

```bash
export DATABASE_URL="<target DATABASE_PUBLIC_URL>"
npm run db:migrate          # = prisma migrate deploy
```

### Migration safety rules

When altering tables that might already contain rows, avoid one-step `NOT NULL`
adds without a default/backfill strategy. Use this pattern instead:

1. Add the new column as nullable.
2. Backfill existing rows.
3. Set `NOT NULL` once data is complete.

This prevents production deploy failures where `migrate deploy` runs against
non-empty tables.

### How migrations reach development / production

Migrations are **not** applied on deploy. Instead, `.github/workflows/db-migrate.yml`
runs `prisma migrate deploy` when a PR is **merged**:

- merged into `dev`, applied to the Railway **development** database
- merged into `main`, applied to the Railway **production** database

It reads the target URL from the `DEV_DATABASE_URL` / `PROD_DATABASE_URL` GitHub secrets.

### Secrets setup

- Set GitHub secrets `DEV_DATABASE_URL` and `PROD_DATABASE_URL` if not done already, each set to that
  environment's Railway `DATABASE_PUBLIC_URL`.
- Baseline the existing development and production databases once (they predate
  migrations), so `migrate deploy` records the initial migration as already applied
  instead of trying to recreate live tables:

  ```bash
  DATABASE_URL="<development DATABASE_PUBLIC_URL>" npx prisma migrate resolve --applied 0_init
  DATABASE_URL="<production DATABASE_PUBLIC_URL>"  npx prisma migrate resolve --applied 0_init
  ```
