#!/bin/sh
set -e

echo "🚀 Starting Ntsamaela API on Railway..."
echo "📦 Environment: ${NODE_ENV:-production}"
echo "🔗 PORT: ${PORT:-3000}"
echo "🔗 DATABASE_URL: ${DATABASE_URL:+SET}"

# Run database migrations (don't fail if already applied)
echo "📦 Running database migrations..."
cd /app
if npx prisma migrate deploy --schema=./packages/database/schema.prisma 2>&1; then
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Migration failed or already up to date - continuing..."
fi

# Generate Prisma client if needed
echo "🔧 Generating Prisma client..."
if npx prisma generate --schema=./packages/database/schema.prisma 2>&1; then
  echo "✅ Prisma client generated successfully"
else
  echo "⚠️  Prisma client generation failed - continuing..."
fi

echo "✅ Setup complete"

# Verify dist/index.js exists
if [ ! -f "/app/dist/index.js" ]; then
  echo "❌ ERROR: /app/dist/index.js not found!"
  echo "📁 Listing /app directory:"
  ls -la /app/ || true
  echo "📁 Listing /app/dist (if exists):"
  ls -la /app/dist/ || echo "dist directory does not exist"
  exit 1
fi

echo "✅ Found /app/dist/index.js"
echo "🌐 Starting server on port ${PORT:-3000}..."
echo "📝 Server will listen on 0.0.0.0:${PORT:-3000}"

# Start the server
exec node /app/dist/index.js
