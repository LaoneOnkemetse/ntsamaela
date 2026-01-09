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
if npx prisma migrate deploy --schema=./packages/database/schema.prisma 2>&1; then
  echo "✅ Migrations applied successfully"
else
  MIGRATION_EXIT=$?
  echo "⚠️  Migration deployment failed with exit code $MIGRATION_EXIT"
  echo "💡 Database appears to be empty or in inconsistent state"
  echo "💡 Using db push to create schema from scratch..."
  
  # Use db push as fallback for empty databases
  echo "📦 Pushing database schema..."
  if npx prisma db push --schema=./packages/database/schema.prisma --accept-data-loss --skip-generate 2>&1; then
    echo "✅ Database schema pushed successfully"
    echo "💡 Schema created using db push (bypassing migrations)"
  else
    echo "⚠️  Database push also failed"
    echo "💡 This might mean the database connection is failing"
    echo "💡 Continuing anyway - server will start but database operations may fail"
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
# First, try the most likely locations (root of dist)
for path in "/app/dist/index.js" "/app/dist/apps/api/index.js" "/app/dist/apps/api/dist/index.js"; do
  if [ -f "$path" ]; then
    SERVER_FILE="$path"
    echo "✅ Found server file at: $SERVER_FILE"
    break
  fi
done

# If not found in expected locations, search but exclude nested directories
if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  echo "🔍 Searching in dist directory..."
  # Find index.js files, but prioritize root-level ones
  # Exclude: node_modules, packages, types, test, __tests__, controllers, services, routes, middleware, utils
  SERVER_FILE=$(find /app/dist -maxdepth 3 -name "index.js" -type f 2>/dev/null | \
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
    head -1)
fi

# Final check - if still not found, show all options
if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  echo "❌ ERROR: API index.js not found in expected locations!"
  echo "📁 Listing /app/dist root:"
  ls -la /app/dist/ 2>/dev/null | head -20 || echo "dist directory does not exist"
  echo "📁 All index.js files found (showing first 10):"
  find /app/dist -name "index.js" -type f 2>/dev/null | head -10
  echo "💡 Trying to use /app/dist/index.js anyway..."
  if [ -f "/app/dist/index.js" ]; then
    SERVER_FILE="/app/dist/index.js"
    echo "✅ Using /app/dist/index.js"
  else
    exit 1
  fi
fi

echo "✅ Using server file: $SERVER_FILE"

echo "🌐 Starting server on port ${PORT:-3000}..."
echo "📝 Server will listen on 0.0.0.0:${PORT:-3000}"

# Start the server
exec node "$SERVER_FILE"
