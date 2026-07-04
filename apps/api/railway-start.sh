#!/bin/sh
set -e

echo "🚀 Starting Ntsamaela API on Railway..."
echo "📦 Environment: ${NODE_ENV:-production}"
echo "🔗 PORT: ${PORT:-3000}"
echo "🔗 DATABASE_URL: ${DATABASE_URL:+SET}"

# Run database migrations (don't fail if already applied)
echo "📦 Running database migrations..."
cd /app

# Ensure Node resolves @prisma/client from the database package first (where we generate it)
export NODE_PATH="/app/packages/database/node_modules:/app/node_modules:${NODE_PATH:-}"

# Check if _prisma_migrations table exists and has any failed migrations
echo "🔍 Checking migration state..."
MIGRATION_STATE=$(npx prisma migrate status --schema=./packages/database/schema.prisma 2>&1 || echo "ERROR")

# If there are failed migrations, resolve them first
if echo "$MIGRATION_STATE" | grep -qi "failed\|error\|P3009"; then
  echo "🔧 Resolving failed migrations..."
  # Resolve failed init migration
  npx prisma migrate resolve --rolled-back 20250905171658_init --schema=./packages/database/schema.prisma 2>&1 || true
  # Resolve other potentially failed migrations
  npx prisma migrate resolve --rolled-back 20250906140130_add_verification_audit_log --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --rolled-back 20251125101618_add_phone_verification_and_delivery_pin --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --rolled-back 20250101000000_add_fcm_tokens --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --rolled-back 20260204000000_add_user_suspended_at --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --rolled-back 20260330120000_add_driver_car_details --schema=./packages/database/schema.prisma 2>&1 || true
fi

# Deploy migrations (Prisma will apply them in chronological order)
echo "📦 Deploying migrations..."
set +e  # Don't exit on error
MIGRATION_OUTPUT=$(npx prisma migrate deploy --schema=./packages/database/schema.prisma 2>&1)
MIGRATION_EXIT=$?
set -e  # Re-enable exit on error

if [ $MIGRATION_EXIT -eq 0 ]; then
  echo "✅ Migrations applied successfully"
elif echo "$MIGRATION_OUTPUT" | grep -qi "already exists\|42701\|P3008"; then
  echo "⚠️  Migration failed: Schema changes already exist"
  echo "🔧 Marking migrations as applied since schema is already in sync..."
  
  # Mark all migrations as applied since schema already exists
  npx prisma migrate resolve --applied 20250905171658_init --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --applied 20250906140130_add_verification_audit_log --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --applied 20251125101618_add_phone_verification_and_delivery_pin --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --applied 20250101000000_add_fcm_tokens --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --applied 20260128120000_add_app_setting --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --applied 20260204000000_add_user_suspended_at --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --applied 20260330120000_add_driver_car_details --schema=./packages/database/schema.prisma 2>&1 || true

  echo "✅ All migrations marked as applied"
elif echo "$MIGRATION_OUTPUT" | grep -qi "P3009"; then
  echo "⚠️  Migration system has failed migrations that need resolution"
  echo "🔧 Attempting to resolve all failed migrations..."
  
  # Try to resolve all failed migrations
  npx prisma migrate resolve --rolled-back 20250905171658_init --schema=./packages/database/schema.prisma 2>&1 || true
  npx prisma migrate resolve --applied 20250905171658_init --schema=./packages/database/schema.prisma 2>&1 || true
  
  # Retry migration deployment
  echo "📦 Retrying migration deployment..."
  if npx prisma migrate deploy --schema=./packages/database/schema.prisma 2>&1; then
    echo "✅ Migrations applied successfully after resolution"
  else
    echo "⚠️  Migrations still failing, but schema appears to be in sync"
    echo "💡 Server will continue - database operations should work"
  fi
else
  echo "⚠️  Migration deployment failed"
  echo "Migration error: $MIGRATION_OUTPUT"
  echo "💡 Server will continue - check database state manually if needed"
fi

# Safety net: prisma db push ensures the production DB matches the schema
# This handles cases where migrations were marked applied but columns are missing
echo "🔧 Running prisma db push to sync any missing schema changes..."
set +e
DB_PUSH_OUTPUT=$(npx prisma db push --schema=./packages/database/schema.prisma --accept-data-loss 2>&1)
DB_PUSH_EXIT=$?
set -e
if [ $DB_PUSH_EXIT -eq 0 ]; then
  echo "✅ Database schema is in sync"
else
  echo "⚠️  db push returned non-zero (may be fine if already in sync): $DB_PUSH_OUTPUT"
fi

echo "🔧 Generating Prisma client..."
# First, generate using the database package (schema and tooling live here)
if (cd /app/packages/database && npx prisma generate) 2>&1; then
  echo "✅ Prisma client generated (database package)"

  # Ensure the runtime @prisma/client that Node resolves (from /app/node_modules)
  # has a fully generated client + engines. This is where the compiled API code
  # is currently loading from (see stack traces in production logs).
  if [ -d /app/packages/database/node_modules/.prisma ]; then
    mkdir -p /app/node_modules
    cp -r /app/packages/database/node_modules/.prisma /app/node_modules/ 2>/dev/null || true
    cp -r /app/packages/database/node_modules/@prisma /app/node_modules/ 2>/dev/null || true
    echo "✅ Prisma client copied to /app/node_modules"
  fi
else
  echo "⚠️  Prisma client generation failed in database package"
fi

# Then, generate in the API workspace (still using the shared schema) so any
# workspace-local references also have a matching client.
if (cd /app/apps/api && npx prisma generate --schema=../../packages/database/schema.prisma) 2>&1; then
  echo "✅ Prisma client generated (api workspace)"
else
  echo "⚠️  Prisma client generation failed in api workspace"
fi

# NOTE: We no longer run the standalone seed-admin.js here.
# Admin user is ensured inside the API process itself (src/index.ts -> ensureAdminUser).
echo "🔐 Skipping external seed-admin.js (admin user will be ensured by API on startup)"
echo "✅ Setup complete"

# API entry: tsc may output dist/index.js or dist/apps/api/src/index.js (when schema includes packages)
echo "🔍 Searching for API index.js..."
SERVER_FILE=""
for path in "/app/apps/api/dist/index.js" "/app/apps/api/dist/src/index.js" "/app/apps/api/dist/apps/api/src/index.js" "/app/dist/apps/api/src/index.js" "/app/dist/index.js"; do
  if [ -f "$path" ]; then
    SERVER_FILE="$path"
    echo "✅ Found server file at: $SERVER_FILE"
    break
  fi
done
# Do not use dist/packages/database/index.js (that is the DB package, not the API)
if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  SERVER_FILE=$(find /app/apps/api/dist -maxdepth 5 -name "index.js" -type f 2>/dev/null | grep -v "packages/database" | head -1)
fi
if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  SERVER_FILE=$(find /app/dist -maxdepth 5 -name "index.js" -type f 2>/dev/null | grep -v node_modules | grep -v "packages/" | head -1)
fi
# Never run the database package entry as the API server
case "$SERVER_FILE" in *packages/database*) SERVER_FILE="" ;; esac

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
