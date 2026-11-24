# A simple production image: builds the web app, then runs it with Node.
# On start it applies database migrations, then serves on $PORT (3000).
#
#   docker build -t saifnd .
#   docker run -p 3000:3000 \
#     -e DATABASE_URL=postgresql://user:pass@host:5432/db \
#     -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=... saifnd

# ---------- build ----------
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable

COPY . .
# Prisma generates its client on install, and its config wants a database
# URL to exist. Nothing connects to it during the build.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

# ---------- run ----------
FROM node:22-slim
WORKDIR /app
# Prisma's migration engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Just enough to run `prisma migrate deploy` at start-up.
WORKDIR /app/db
COPY packages/db/prisma ./prisma
COPY packages/db/prisma.config.ts ./
RUN npm init -y >/dev/null \
  && npm install --omit=dev --no-audit --no-fund prisma@7.10.1 dotenv@17

# The server is self-contained: everything it needs is in .output.
WORKDIR /app
COPY --from=build /app/apps/web/.output ./.output

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["sh", "-c", "cd /app/db && npx prisma migrate deploy && cd /app && exec node .output/server/index.mjs"]
