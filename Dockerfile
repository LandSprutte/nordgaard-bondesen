# Production image for Coolify (or any Docker host).
#
# Coolify: Build Pack "Dockerfile", Ports Exposes 3000, a Domain such as
# https://tjans.example.dk, and these environment variables:
#   DATABASE_URL     postgresql://user:pass@host:5432/db (Coolify's internal URL)
#   ADMIN_USERNAME   the site admin's username
#   ADMIN_PASSWORD   the site admin's password
# Coolify's proxy terminates HTTPS; the app itself speaks plain HTTP on 3000.
#
# They are read when the container starts, never baked into the image. On
# start it applies database migrations, then serves on $PORT.
#
#   docker build -t saifnd .
#   docker run -p 3000:3000 -e DATABASE_URL=... \
#     -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=... saifnd

# ---------- build ----------
FROM node:22-slim AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Download dependencies in their own layer, so a code change doesn't
# download them again.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm fetch --frozen-lockfile

COPY . .
# Prisma generates its client on install, and its config wants a database
# URL to exist. Nothing connects to it during the build.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
  pnpm install --frozen-lockfile --offline \
  && pnpm --filter web build

# ---------- run ----------
FROM node:22-slim
# Prisma's migration engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Just enough to run `prisma migrate deploy` at start-up.
WORKDIR /app/db
COPY packages/db/prisma ./prisma
COPY packages/db/prisma.config.ts ./
RUN npm init -y >/dev/null \
  && npm install --omit=dev --no-audit --no-fund prisma@7.10.1 dotenv@17 \
  && npm cache clean --force

# The server is self-contained: everything it needs is in .output.
WORKDIR /app
COPY --from=build /app/apps/web/.output ./.output
COPY --chmod=755 <<'EOF' /app/start.sh
#!/bin/sh
set -e
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi
cd /app/db
./node_modules/.bin/prisma migrate deploy
cd /app
# exec, so the server gets Docker's stop signal and shuts down cleanly.
exec node .output/server/index.mjs
EOF

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
USER node

# Coolify uses this to know when a deploy is up. Migrations run first, so
# give it time to start.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["/app/start.sh"]
