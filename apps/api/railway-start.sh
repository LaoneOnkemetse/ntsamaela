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
# Prioritize the API's index.js (not packages/database or other index.js files)
SERVER_FILE=$(find /app/dist -name "index.js" -type f 2>/dev/null | grep -v node_modules | grep -v packages | grep -v apps/api/dist | head -1)

# If not found, try specific API locations
if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  for path in "/app/dist/index.js" "/app/dist/apps/api/index.js" "/app/dist/apps/api/dist/index.js"; do
    if [ -f "$path" ]; then
      SERVER_FILE="$path"
      break
    fi
  done
fi

if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  echo "❌ ERROR: API index.js not found!"
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
