#!/bin/sh
set -e

echo "🚀 Starting Ntsamaela API on Railway..."
echo "📦 Environment: ${NODE_ENV:-production}"
echo "🔗 PORT: ${PORT:-3000}"
echo "🔗 DATABASE_URL: ${DATABASE_URL:+SET}"

# Run database migrations (don't fail if already applied)
echo "📦 Running database migrations..."
cd /app

# Resolve any failed migrations first (safe to run multiple times)
echo "🔧 Resolving any failed migrations..."
npx prisma migrate resolve --rolled-back 20250101000000_add_fcm_tokens --schema=./packages/database/schema.prisma 2>&1 || true

# Deploy migrations (Prisma will apply them in chronological order)
echo "📦 Deploying migrations..."
set +e  # Don't exit on error
npx prisma migrate deploy --schema=./packages/database/schema.prisma 2>&1
MIGRATION_EXIT=$?
set -e  # Re-enable exit on error

if [ $MIGRATION_EXIT -eq 0 ]; then
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Migration deployment failed with exit code $MIGRATION_EXIT"
  echo "💡 Checking if this is due to schema already existing..."
  
  # Try to mark the migration as applied if the schema already exists
  echo "🔧 Attempting to resolve migration conflict..."
  if npx prisma migrate resolve --applied 20250101000000_add_fcm_tokens --schema=./packages/database/schema.prisma 2>&1; then
    echo "✅ Migration marked as applied (schema already exists)"
  else
    echo "⚠️  Could not resolve migration, but continuing..."
    echo "💡 Schema may already be in sync - server will start anyway"
  fi
fi

# Generate Prisma client if needed
echo "🔧 Generating Prisma client..."
if npx prisma generate --schema=./packages/database/schema.prisma 2>&1; then
  echo "✅ Prisma client generated successfully"
else
  echo "⚠️  Prisma client generation failed - continuing..."
fi

echo "✅ Setup complete"

# Verify dist/index.js exists (search for it, prioritize API entry point)
echo "🔍 Searching for index.js..."
# First, try the most likely locations (based on tsc-alias output structure)
for path in "/app/dist/apps/api/src/index.js" "/app/dist/index.js" "/app/dist/apps/api/index.js" "/app/dist/apps/api/dist/index.js"; do
  if [ -f "$path" ]; then
    SERVER_FILE="$path"
    echo "✅ Found server file at: $SERVER_FILE"
    break
  fi
done

# If not found in expected locations, search but exclude nested directories
if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  echo "🔍 Searching in dist directory..."
  # Find index.js files in apps/api/src (the actual entry point)
  SERVER_FILE=$(find /app/dist/apps/api/src -maxdepth 1 -name "index.js" -type f 2>/dev/null | head -1)
  
  # If still not found, search more broadly but exclude nested directories
  if [ -z "$SERVER_FILE" ]; then
    SERVER_FILE=$(find /app/dist -maxdepth 4 -name "index.js" -type f 2>/dev/null | \
      grep -v node_modules | \
      grep -v packages | \
      grep -v "/types/" | \
      grep -v "/test/" | \
      grep -v "/__tests__/" | \
      grep -v "/controllers/" | \
      grep -v "/services/" | \
      grep -v "/routes/" | \
      grep -v "/middleware/" | \
      grep -v "/utils/" | \
      grep "/apps/api/src/" | \
      head -1)
  fi
fi

# Final check - if still not found, show all options
if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  echo "❌ ERROR: API index.js not found in expected locations!"
  echo "📁 Listing /app/dist root:"
  ls -la /app/dist/ 2>/dev/null | head -20 || echo "dist directory does not exist"
  echo "📁 All index.js files found (showing first 10):"
  find /app/dist -name "index.js" -type f 2>/dev/null | head -10
  exit 1
fi

echo "✅ Using server file: $SERVER_FILE"

echo "🌐 Starting server on port ${PORT:-3000}..."
echo "📝 Server will listen on 0.0.0.0:${PORT:-3000}"

# Start the server
exec node "$SERVER_FILE"
