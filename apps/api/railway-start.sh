#!/bin/sh
set -e

echo "🚀 Starting Ntsamaela API on Railway..."
echo "📦 Environment: ${NODE_ENV:-production}"
echo "🔗 PORT: ${PORT:-3000}"
echo "🔗 DATABASE_URL: ${DATABASE_URL:+SET}"

# Run database migrations (don't fail if already applied)
echo "📦 Running database migrations..."
cd /app

# Resolve any failed migrations first (this is safe to run multiple times)
echo "🔧 Resolving any failed migrations..."
npx prisma migrate resolve --rolled-back 20250101000000_add_fcm_tokens --schema=./packages/database/schema.prisma 2>&1 || true
npx prisma migrate resolve --rolled-back 20250905171658_init --schema=./packages/database/schema.prisma 2>&1 || true

# Deploy migrations
echo "📦 Deploying migrations..."
if npx prisma migrate deploy --schema=./packages/database/schema.prisma 2>&1; then
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Migration failed - this might be due to missing initial migration or database state"
  echo "💡 If this is a fresh database, migrations will be applied on next attempt"
  echo "💡 Continuing anyway - server will start but database operations may fail"
fi

# Generate Prisma client if needed
echo "🔧 Generating Prisma client..."
if npx prisma generate --schema=./packages/database/schema.prisma 2>&1; then
  echo "✅ Prisma client generated successfully"
else
  echo "⚠️  Prisma client generation failed - continuing..."
fi

echo "✅ Setup complete"

# Verify dist/index.js exists (search for it)
echo "🔍 Searching for index.js..."
SERVER_FILE=$(find /app/dist -name "index.js" -type f 2>/dev/null | grep -v node_modules | head -1)

if [ -z "$SERVER_FILE" ]; then
  # Try common locations as fallback
  for path in "/app/dist/index.js" "/app/dist/apps/api/index.js" "/app/dist/apps/api/dist/index.js"; do
    if [ -f "$path" ]; then
      SERVER_FILE="$path"
      break
    fi
  done
fi

if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  echo "❌ ERROR: index.js not found!"
  echo "📁 Listing /app/dist structure:"
  ls -laR /app/dist/ 2>/dev/null | head -50 || echo "dist directory does not exist"
  echo "📁 All index.js files found:"
  find /app/dist -name "index.js" -type f 2>/dev/null | head -10
  exit 1
fi

echo "✅ Found server file: $SERVER_FILE"

echo "🌐 Starting server on port ${PORT:-3000}..."
echo "📝 Server will listen on 0.0.0.0:${PORT:-3000}"

# Start the server
exec node "$SERVER_FILE"
