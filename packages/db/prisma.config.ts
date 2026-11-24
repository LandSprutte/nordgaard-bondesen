import path from "node:path"
import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

// One .env at the repo root is shared by the web app, Prisma and the CLI.
config({ path: path.resolve(import.meta.dirname, "../../.env"), quiet: true })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
})
