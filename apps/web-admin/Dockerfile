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
RUN npm run build && \
    echo "📁 Checking standalone output structure:" && \
    ls -la .next/standalone/ 2>/dev/null | head -20 || echo "Standalone directory not found" && \
    find .next/standalone -name "server.js" -type f 2>/dev/null | head -5 || echo "No server.js in standalone" && \
    echo "📁 Checking standalone output:" && \
    ls -la .next/standalone/ 2>/dev/null | head -20 || echo "Standalone directory not found" && \
    find .next/standalone -name "server.js" -type f 2>/dev/null | head -5 || echo "No server.js in standalone"

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# This RUN command can't access builder stage files - remove it
# We'll check after copying instead

# Copy the built application (standalone includes node_modules and server.js)
# Next.js standalone output structure: it copies the entire app structure
COPY --from=builder /app/apps/web-admin/.next/standalone ./
COPY --from=builder /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
# Note: public directory doesn't exist in this project, which is fine for Next.js

# Debug: List what's in the standalone directory to find server.js AFTER copying
RUN echo "📁 Contents of /app after copy:" && ls -la /app/ 2>/dev/null | head -20 || true && \
    echo "📁 Contents of /app/apps/web-admin:" && ls -la /app/apps/web-admin/ 2>/dev/null | head -20 || true && \
    echo "📁 Looking for server.js:" && find /app -name "server.js" -type f 2>/dev/null | head -5 || echo "No server.js found" && \
    echo "📁 All .js files in /app/apps/web-admin:" && find /app/apps/web-admin -name "*.js" -type f 2>/dev/null | head -10 || echo "No .js files found"

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
# Next.js standalone: server.js should be at /app/apps/web-admin/server.js
# Remove package.json from apps/web-admin to prevent Railway from running npm start
RUN rm -f /app/apps/web-admin/package.json 2>/dev/null || true
RUN rm -f /app/package.json 2>/dev/null || true

WORKDIR /app/apps/web-admin
# Use the server.js from standalone build
CMD ["node", "server.js"]













