# Multi-stage build for Ntsamaela API
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy root package files for workspace setup
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including dev for Prisma CLI)
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy all files needed for build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY apps/api ./apps/api
COPY packages ./packages
COPY tsconfig.json tsconfig.base.json ./

# Build the application
WORKDIR /app/apps/api
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy the built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/railway-start.sh ./railway-start.sh
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Copy Prisma schema and migrations for runtime
COPY --from=builder /app/packages/database/schema.prisma ./packages/database/
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Make startup script executable
RUN chmod +x ./railway-start.sh

# Railway provides PORT automatically, but we set a default
ENV PORT=3000

# Keep root user for migrations (Railway handles security)
# USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Use startup script that runs migrations first
CMD ["./railway-start.sh"]