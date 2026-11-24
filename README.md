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
