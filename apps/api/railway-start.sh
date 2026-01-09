#!/bin/sh
set -e

echo "🚀 Starting Ntsamaela API on Railway..."
echo "📦 Environment: ${NODE_ENV:-production}"
echo "🔗 PORT: ${PORT:-3000}"
echo "🔗 DATABASE_URL: ${DATABASE_URL:+SET}"

# Run database migrations (don't fail if already applied)
echo "📦 Running database migrations..."
cd /app

# Resolve any failed migrations first
echo "🔧 Resolving failed migrations..."
npx prisma migrate resolve --rolled-back 20250101000000_add_fcm_tokens --schema=./packages/database/schema.prisma 2>&1 || {
  echo "⚠️  Could not resolve migration (might not exist) - continuing..."
}

# Deploy migrations
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

# Verify dist/index.js exists (check multiple possible locations)
if [ -f "/app/dist/index.js" ]; then
  echo "✅ Found /app/dist/index.js"
  SERVER_FILE="/app/dist/index.js"
elif [ -f "/app/dist/apps/api/dist/index.js" ]; then
  echo "✅ Found /app/dist/apps/api/dist/index.js"
  SERVER_FILE="/app/dist/apps/api/dist/index.js"
else
  echo "❌ ERROR: index.js not found in expected locations!"
  echo "📁 Listing /app directory:"
  ls -la /app/ || true
  echo "📁 Listing /app/dist (if exists):"
  ls -la /app/dist/ || echo "dist directory does not exist"
  echo "📁 Searching for index.js:"
  find /app -name "index.js" -type f 2>/dev/null | head -10
  exit 1
fi

echo "🌐 Starting server on port ${PORT:-3000}..."
echo "📝 Server will listen on 0.0.0.0:${PORT:-3000}"

# Start the server
exec node "$SERVER_FILE"
