# Multi-stage build for Ntsamaela Web
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root package files for workspace setup
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy all files needed for build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.base.json ./
COPY apps/web ./apps/web

# Build the application
WORKDIR /app/apps/web
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the built application (standalone includes node_modules and server.js)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Remove package.json files to prevent Railway from auto-running npm start
RUN find /app -name "package.json" -type f -delete 2>/dev/null || true

# Create start script BEFORE setting WORKDIR
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo 'echo "🚀 Starting Next.js web server..."' >> /start.sh && \
    echo 'if [ -f "/app/apps/web/server.js" ]; then' >> /start.sh && \
    echo '  echo "✅ Found server.js at /app/apps/web/server.js"' >> /start.sh && \
    echo '  cd /app/apps/web && exec node server.js' >> /start.sh && \
    echo 'elif [ -f "/app/server.js" ]; then' >> /start.sh && \
    echo '  echo "✅ Found server.js at /app/server.js"' >> /start.sh && \
    echo '  cd /app && exec node server.js' >> /start.sh && \
    echo 'elif NEXT_BIN=$(find /app -path "*/node_modules/.bin/next" -type f 2>/dev/null | head -1); then' >> /start.sh && \
    echo '  echo "✅ Found next binary at: $NEXT_BIN"' >> /start.sh && \
    echo '  cd /app/apps/web && exec "$NEXT_BIN" start -p ${PORT:-3000} -H 0.0.0.0' >> /start.sh && \
    echo 'else' >> /start.sh && \
    echo '  echo "❌ Cannot find server.js or next binary!"' >> /start.sh && \
    echo '  exit 1' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    chmod +x /start.sh && \
    ls -la /start.sh && \
    cat /start.sh

# Railway provides PORT automatically
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Don't switch user - keep root for now to avoid permission issues
# USER nextjs

EXPOSE 3000

# Health check - Next.js doesn't need wget, use node instead
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

WORKDIR /app
CMD ["/start.sh"]
