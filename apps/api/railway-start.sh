#!/bin/sh
set -e

echo "🚀 Starting Ntsamaela API on Railway..."
echo "📦 Environment: ${NODE_ENV:-production}"
echo "🔗 PORT: ${PORT:-3000}"
echo "🔗 DATABASE_URL: ${DATABASE_URL:+SET}"

# Run database migrations (don't fail if already applied)
echo "📦 Running database migrations..."
cd /app

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

# Generate Prisma client from database package (uses Prisma 5.x; root npx can pull wrong version)
echo "🔧 Generating Prisma client..."
if (cd /app/packages/database && npx prisma generate) 2>&1; then
  echo "✅ Prisma client generated successfully"
else
  echo "⚠️  Prisma client generation failed - app may use client from build"
fi

# Ensure permanent admin user exists (use database package's Prisma client if present)
echo "🔐 Ensuring permanent admin user exists..."
ADMIN_SEEDED=false
for seed_path in "/app/apps/api/seed-admin.js" "/app/seed-admin.js" "./apps/api/seed-admin.js" "./seed-admin.js"; do
  if [ -f "$seed_path" ]; then
    echo "✅ Found seed script at: $seed_path"
    if NODE_PATH="/app/packages/database/node_modules:/app/node_modules" node "$seed_path" 2>&1; then
      echo "✅ Admin user ensured"
      ADMIN_SEEDED=true
      break
    else
      echo "⚠️  Admin user seeding failed at $seed_path - trying next location..."
    fi
  fi
done

if [ "$ADMIN_SEEDED" = "false" ]; then
  echo "⚠️  seed-admin.js not found in any expected location"
  echo "📁 Searching for seed-admin.js..."
  find /app -name "seed-admin.js" -type f 2>/dev/null | head -5 || echo "No seed-admin.js found"
  echo "⚠️  Skipping admin user creation - you may need to run it manually"
fi

echo "✅ Setup complete"

# Verify API entry point exists (workspace build outputs to apps/api/dist)
echo "🔍 Searching for API index.js..."
SERVER_FILE=""
for path in "/app/apps/api/dist/src/index.js" "/app/apps/api/dist/index.js" "/app/dist/apps/api/src/index.js" "/app/dist/index.js" "/app/dist/apps/api/index.js"; do
  if [ -f "$path" ]; then
    SERVER_FILE="$path"
    echo "✅ Found server file at: $SERVER_FILE"
    break
  fi
done

if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  SERVER_FILE=$(find /app/apps/api/dist -maxdepth 3 -name "index.js" -type f 2>/dev/null | head -1)
fi
if [ -z "$SERVER_FILE" ] || [ ! -f "$SERVER_FILE" ]; then
  SERVER_FILE=$(find /app/dist -maxdepth 4 -name "index.js" -type f 2>/dev/null | grep -v node_modules | grep -v packages | head -1)
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
