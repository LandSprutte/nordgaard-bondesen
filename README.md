# shadcn/ui monorepo template

This is a TanStack Start monorepo template with shadcn/ui.

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Family dashboard: budget

The budget reads the monthly CSV export from the bank and stores it in Postgres via Prisma
(`packages/db`).

### First-time setup

```bash
cp .env.example .env    # DATABASE_URL for the local database
pnpm db:up              # start Postgres in Docker (port 5433)
pnpm db:migrate         # create the tables
pnpm dev
```

### Every month

1. Export all accounts from the bank as CSV.
2. Upload it under **Budget → Import** (or run `pnpm import-csv path/to/file.csv`).
   Rows that are already imported are skipped, so overlapping files are fine.
3. Go to **Settings → Budget** and give new bank texts a name and category, or mark them
   as transfers between your own accounts so they don't count as income or expenses.

### How the CSV is read

- `packages/db/src/csv/parse-bank-csv.ts`: decodes Latin-1/UTF-8, reads `;`-separated
  rows, Danish dates and amounts, and detects transfers between exported accounts.
- `packages/db/src/csv/normalize-key.ts`: turns the "Tekst" column into a key
  (`Debitkort DK COMPASS GROUP D` → `COMPASS GROUP D`).
- Tests: `pnpm test`.

## Production

The app reads `DATABASE_URL` (plus `ADMIN_USERNAME` and `ADMIN_PASSWORD`) from the
environment when it starts; nothing is baked into the image, and no `.env` file is used.

```bash
docker build -t saifnd .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" \
  -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=... saifnd
```

On start the container runs `prisma migrate deploy` against that database, then serves on
port 3000. To try the image against the local database: `docker compose --profile app up --build`
(set `APP_PORT` to use another host port).

### Coolify

New Application from this repo → Build Pack **Dockerfile**, Ports Exposes **3000**, Domain
`https://your.domain`, and the three variables above (`DATABASE_URL` as the internal URL of a
Coolify PostgreSQL database). Coolify's proxy handles HTTPS; the image's `HEALTHCHECK` tells it
when a deploy is up.
