/**
 * Import one or more bank CSV exports from the command line:
 *
 *   pnpm --filter @workspace/db import-csv ~/Downloads/oktober.csv
 *
 * Goes into the family in FAMILY_ID, or the original family if it's unset.
 */
import { readFile } from "node:fs/promises"
import path from "node:path"
import { config } from "dotenv"

config({
  path: path.resolve(import.meta.dirname, "../../../.env"),
  quiet: true,
})

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error(
    "Usage: pnpm --filter @workspace/db import-csv <file.csv> [...]"
  )
  process.exit(1)
}

// Import after dotenv so the client sees DATABASE_URL.
const { importBankCsv, prisma } = await import("../src/index")

const familyId = process.env.FAMILY_ID ?? "family_default"

try {
  for (const file of files) {
    const bytes = await readFile(file)
    const result = await importBankCsv(prisma, familyId, {
      name: path.basename(file),
      bytes,
    })
    console.log(
      `${path.basename(file)}: ${result.createdCount} new of ${result.rowCount} rows ` +
        `across ${result.accounts.length} accounts, ${result.newKeys.length} new keys`
    )
  }
} finally {
  await prisma.$disconnect()
}
