#!/bin/sh
set -e

echo "🚀 Starting Ntsamaela API on Railway..."
echo "📦 Environment: ${NODE_ENV:-production}"
echo "🔗 PORT: ${PORT:-3000}"
echo "🔗 DATABASE_URL: ${DATABASE_URL:+SET}"

# Run database migrations (don't fail if already applied)
echo "📦 Running database migrations..."
cd /app

# Check if database is empty (no tables exist)
echo "🔍 Checking database state..."
DB_HAS_TABLES=$(npx prisma db execute --stdin --schema=./packages/database/schema.prisma <<< "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tail -1 | tr -d ' ' || echo "0")

# If database is empty or migrations failed, try to reset and apply all migrations
if [ "$DB_HAS_TABLES" = "0" ] || [ -z "$DB_HAS_TABLES" ]; then
  echo "📦 Database appears empty, applying all migrations from scratch..."
  # Resolve any failed migrations first
  npx prisma migrate resolve --rolled-back 20250101000000_add_fcm_tokens --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --rolled-back 20250905171658_init --schema=./packages/database/schema.prisma 2>&1 || true
fi

# Deploy migrations
if npx prisma migrate deploy --schema=./packages/database/schema.prisma 2>&1; then
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Migration failed - this might be due to missing initial migration"
  echo "💡 If this is a fresh database, you may need to run migrations manually"
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
elif [ -f "/app/dist/apps/api/index.js" ]; then
  echo "✅ Found /app/dist/apps/api/index.js"
  SERVER_FILE="/app/dist/apps/api/index.js"
else
  echo "❌ ERROR: index.js not found in expected locations!"
  echo "📁 Listing /app directory:"
  ls -la /app/ || true
  echo "📁 Listing /app/dist (if exists):"
  ls -la /app/dist/ || echo "dist directory does not exist"
  echo "📁 Listing /app/dist/apps (if exists):"
  ls -la /app/dist/apps/ 2>/dev/null || echo "apps directory does not exist in dist"
  echo "📁 Searching for index.js in dist:"
  find /app/dist -name "index.js" -type f 2>/dev/null | head -10
  exit 1
fi

echo "🌐 Starting server on port ${PORT:-3000}..."
echo "📝 Server will listen on 0.0.0.0:${PORT:-3000}"

# Start the server
exec node "$SERVER_FILE"
