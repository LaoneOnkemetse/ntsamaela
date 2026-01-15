# Deployment Notes

## Admin User Creation

The admin user is created automatically by the **API service** during deployment. This is a backend/database operation, so:

- ✅ **API Service**: Needs to deploy (handles admin user creation)
- ❌ **Web-Admin Service**: Does NOT need to redeploy (just the frontend UI)

## How It Works

1. **API Service** (`apps/api/railway-start.sh`):
   - Runs database migrations
   - Generates Prisma client
   - **Runs `seed-admin.js` to create/update admin user**
   - Starts the API server

2. **Web-Admin Service**:
   - Just displays the login form
   - Makes API calls to authenticate
   - No code changes needed for admin user creation

## Environment Variables

### API Service
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - For token generation
- `PORT` - Server port (auto-set by Railway)

### Web-Admin Service
- `NEXT_PUBLIC_API_URL` - Should point to your API service URL
  - Example: `https://ntsamaelaapi-production.up.railway.app/api`
- `API_BACKEND_URL` - Internal API URL (optional, for rewrites)

## Current Admin Credentials

- **Email:** `Plutonium94@ntsamaela.com`
- **Password:** `pLuto@.*123hash`

## Verifying Deployment

1. Check API service logs in Railway for:
   ```
   🔐 Ensuring permanent admin user exists...
   ✅ Admin user ensured
   ```

2. Try logging in at the web-admin URL with the credentials above

3. If login fails, check:
   - API service is running and healthy
   - Database connection is working
   - Admin user was created (check API logs)
