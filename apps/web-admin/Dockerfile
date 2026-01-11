# Multi-stage build for Ntsamaela Web Admin
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root package files for workspace setup
COPY package.json package-lock.json* ./
COPY apps/web-admin/package.json ./apps/web-admin/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy all files needed for build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.base.json ./
COPY apps/web-admin ./apps/web-admin
COPY packages/shared ./packages/shared

# Build the application
WORKDIR /app/apps/web-admin
RUN npm run build || (echo "❌ Build failed!" && exit 1) && \
    echo "✅ Build completed" && \
    echo "📁 Checking .next directory:" && \
    ls -la .next/ 2>/dev/null | head -20 || echo ".next directory not found" && \
    echo "📁 Checking for standalone:" && \
    if [ -d ".next/standalone" ]; then \
      echo "✅ Standalone directory exists" && \
      ls -la .next/standalone/ | head -20 && \
      find .next/standalone -name "server.js" -type f 2>/dev/null | head -5 || echo "No server.js in standalone"; \
    else \
      echo "⚠️ Standalone directory not found, checking .next structure:" && \
      find .next -type f -name "*.js" | grep -v node_modules | head -10 && \
      echo "📁 Full .next structure:" && \
      find .next -type d | head -20; \
    fi

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# This RUN command can't access builder stage files - remove it
# We'll check after copying instead

# Copy the built application
# Always copy the .next directory - the start script will handle finding the right entry point
COPY --from=builder /app/apps/web-admin/.next ./apps/web-admin/.next
COPY --from=builder /app/apps/web-admin/package.json ./apps/web-admin/package.json
COPY --from=builder /app/node_modules ./node_modules

# Debug: List what's in the standalone directory to find server.js AFTER copying
RUN echo "📁 Contents of /app after copy:" && ls -la /app/ 2>/dev/null | head -20 || true && \
    echo "📁 Contents of /app/apps/web-admin:" && ls -la /app/apps/web-admin/ 2>/dev/null | head -20 || true && \
    echo "📁 Looking for server.js:" && find /app -name "server.js" -type f 2>/dev/null | head -5 || echo "No server.js found" && \
    echo "📁 All .js files in /app/apps/web-admin:" && find /app/apps/web-admin -name "*.js" -type f 2>/dev/null | head -10 || echo "No .js files found" && \
    echo "📁 Checking for next binary:" && find /app -path "*/node_modules/.bin/next" -type f 2>/dev/null | head -3 || echo "No next binary found"

# CRITICAL: Remove ALL package.json files IMMEDIATELY after copy to prevent Railway from auto-running npm start
# Railway detects package.json and runs npm start automatically, ignoring our CMD
RUN find /app -name "package.json" -type f -delete 2>/dev/null || true && \
    echo "✅ Removed all package.json files" && \
    find /app -name "package.json" -type f 2>/dev/null | wc -l || echo "0" && \
    echo "📁 Checking if package.json removal worked:" && \
    ls -la /app/apps/web-admin/ 2>/dev/null | grep -i package || echo "No package.json found (good!)"

# Railway provides PORT automatically
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Don't switch user - keep root for now to avoid permission issues
# USER nextjs

EXPOSE 3000

# Health check - Next.js doesn't need wget, use node instead
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
# Next.js standalone: The server entry point might be in apps/web-admin/server.js
# Or we might need to use the next binary directly
# Use a wrapper script to ensure Railway can't override our command
WORKDIR /app
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo 'echo "🚀 Starting Next.js server..."' >> /start.sh && \
    echo 'echo "📁 Checking for standalone output..."' >> /start.sh && \
    echo 'if [ -d "/app/apps/web-admin/.next/standalone" ]; then' >> /start.sh && \
    echo '  echo "✅ Standalone output found"' >> /start.sh && \
    echo '  if [ -f "/app/apps/web-admin/.next/standalone/apps/web-admin/server.js" ]; then' >> /start.sh && \
    echo '    echo "✅ Found server.js in standalone"' >> /start.sh && \
    echo '    cd /app/apps/web-admin/.next/standalone/apps/web-admin && exec node server.js' >> /start.sh && \
    echo '  elif [ -f "/app/apps/web-admin/.next/standalone/server.js" ]; then' >> /start.sh && \
    echo '    echo "✅ Found server.js at standalone root"' >> /start.sh && \
    echo '    cd /app/apps/web-admin/.next/standalone && exec node server.js' >> /start.sh && \
    echo '  fi' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo 'echo "📁 Checking for server.js in .next..."' >> /start.sh && \
    echo 'if [ -f "/app/apps/web-admin/.next/server.js" ]; then' >> /start.sh && \
    echo '  echo "✅ Found server.js at /app/apps/web-admin/.next/server.js"' >> /start.sh && \
    echo '  cd /app/apps/web-admin && exec node .next/server.js' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo 'echo "📁 Looking for next binary..."' >> /start.sh && \
    echo 'NEXT_BIN=$(find /app -path "*/node_modules/.bin/next" -type f 2>/dev/null | head -1)' >> /start.sh && \
    echo 'if [ -z "$NEXT_BIN" ] || [ ! -f "$NEXT_BIN" ]; then' >> /start.sh && \
    echo '  NEXT_BIN=$(find /app -path "*/next/dist/bin/next" -type f 2>/dev/null | head -1)' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo 'if [ -n "$NEXT_BIN" ] && [ -f "$NEXT_BIN" ]; then' >> /start.sh && \
    echo '  echo "✅ Found next binary at: $NEXT_BIN"' >> /start.sh && \
    echo '  cd /app/apps/web-admin && exec node "$NEXT_BIN" start -p ${PORT:-3000} -H 0.0.0.0' >> /start.sh && \
    echo 'else' >> /start.sh && \
    echo '  echo "❌ Cannot find server.js or next binary!"' >> /start.sh && \
    echo '  echo "📁 Listing /app structure:"' >> /start.sh && \
    echo '  find /app/apps/web-admin/.next -type f -name "*.js" 2>/dev/null | head -10 || true' >> /start.sh && \
    echo '  echo "📁 Looking for next:"' >> /start.sh && \
    echo '  find /app -name "next" -type f 2>/dev/null | head -5 || true' >> /start.sh && \
    echo '  exit 1' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    chmod +x /start.sh

CMD ["/start.sh"]













