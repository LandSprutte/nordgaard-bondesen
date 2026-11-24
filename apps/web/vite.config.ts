import { defineConfig, loadEnv } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { nitro } from "nitro/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig(({ mode }) => {
  // Server code (Prisma) reads DATABASE_URL etc. from the repo root .env.
  Object.assign(process.env, loadEnv(mode, "../..", ""), process.env)

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      tailwindcss(),
      tanstackStart(),
      // Builds a Node server into .output/ (node .output/server/index.mjs).
      // Not in tests: it changes how modules resolve.
      !process.env.VITEST && nitro(),
      viteReact(),
    ],
  }
})

export default config
