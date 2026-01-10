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
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the built application (standalone includes node_modules and server.js)
# Next.js standalone output structure: it copies the entire app structure
COPY --from=builder /app/apps/web-admin/.next/standalone ./
COPY --from=builder /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
# Note: public directory doesn't exist in this project, which is fine for Next.js

# Debug: List what's in the standalone directory to find server.js
RUN echo "📁 Contents of /app:" && ls -la /app/ 2>/dev/null | head -20 || true
RUN echo "📁 Contents of /app/apps/web-admin:" && ls -la /app/apps/web-admin/ 2>/dev/null | head -20 || true
RUN echo "📁 Looking for server.js:" && find /app -name "server.js" -type f 2>/dev/null | head -5 || echo "No server.js found"

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
# Next.js standalone output structure: server.js is typically at apps/web-admin/server.js
# But Railway might be running from /app/apps/web-admin, so we need to handle both
WORKDIR /app
# Use ENTRYPOINT to ensure this runs, not npm start
ENTRYPOINT ["sh", "-c"]
CMD ["SERVER_FILE=$(find /app -name 'server.js' -type f 2>/dev/null | head -1); if [ -n \"$SERVER_FILE\" ]; then echo \"✅ Starting server from: $SERVER_FILE\"; node \"$SERVER_FILE\"; else echo \"❌ server.js not found!\"; find /app -type f -name '*.js' | head -10; exit 1; fi"]













