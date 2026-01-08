#!/bin/sh
set -e

echo "🚀 Starting Ntsamaela API on Railway..."
echo "📦 Environment: ${NODE_ENV:-production}"
echo "🔗 PORT: ${PORT:-3000}"
echo "🔗 DATABASE_URL: ${DATABASE_URL:0:30}..."

# Run database migrations (don't fail if already applied)
echo "📦 Running database migrations..."
cd /app
if npx prisma migrate deploy --schema=./packages/database/schema.prisma; then
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Migration failed or already up to date - continuing..."
fi

# Generate Prisma client if needed
echo "🔧 Generating Prisma client..."
npx prisma generate --schema=./packages/database/schema.prisma || {
  echo "⚠️  Prisma client generation failed - continuing..."
}

echo "✅ Setup complete"
echo "🌐 Starting server on port ${PORT:-3000}..."
echo "📝 Server will listen on 0.0.0.0:${PORT:-3000}"

# Start the server (use exec to replace shell process)
exec node dist/index.js
