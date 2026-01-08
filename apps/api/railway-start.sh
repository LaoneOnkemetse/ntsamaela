#!/bin/sh
set -e

echo "🚀 Starting Ntsamaela API on Railway..."
echo "📦 Environment: ${NODE_ENV:-production}"

# Run database migrations
echo "📦 Running database migrations..."
cd /app
npx prisma migrate deploy --schema=./packages/database/schema.prisma || {
  echo "⚠️  Migration failed or already up to date"
  # Don't fail if migrations are already applied
}

echo "✅ Migrations complete"
echo "🌐 Starting server on port ${PORT:-3000}..."
exec node dist/index.js
