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

# Deploy migrations (Prisma will apply them in order)
echo "📦 Deploying migrations..."
MIGRATION_OUTPUT=$(npx prisma migrate deploy --schema=./packages/database/schema.prisma 2>&1)
MIGRATION_EXIT=$?

if [ $MIGRATION_EXIT -eq 0 ]; then
  echo "✅ Migrations applied successfully"
elif echo "$MIGRATION_OUTPUT" | grep -q "relation.*does not exist"; then
  echo "⚠️  Migration failed: Database tables don't exist"
  echo "💡 This means the initial migration hasn't been applied"
  echo "💡 Attempting to apply initial migration first..."
  
  # Try to apply just the init migration
  echo "📦 Applying initial migration..."
  npx prisma migrate deploy --schema=./packages/database/schema.prisma --name 20250905171658_init 2>&1 || {
    echo "⚠️  Could not apply initial migration automatically"
    echo "💡 You may need to reset the database or apply migrations manually"
  }
  
  # Try deploying all migrations again
  echo "📦 Retrying all migrations..."
  npx prisma migrate deploy --schema=./packages/database/schema.prisma 2>&1 || {
    echo "⚠️  Migrations still failing - continuing anyway"
    echo "💡 Server will start but database operations may fail"
  }
else
  echo "⚠️  Migration failed: $MIGRATION_OUTPUT"
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
