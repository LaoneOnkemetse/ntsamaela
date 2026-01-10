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

# Copy the built application
COPY --from=builder /app/apps/web-admin/.next/standalone ./
COPY --from=builder /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
COPY --from=builder /app/apps/web-admin/public ./apps/web-admin/public

# Railway provides PORT automatically
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER nextjs

EXPOSE 3000

# Health check - Next.js doesn't need wget, use node instead
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["node", "apps/web-admin/server.js"]













