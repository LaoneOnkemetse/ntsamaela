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

### API Service (Railway – required to fix "Invalid token signature")

Set these in **Railway → Your API service → Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Railway Postgres gives this) |
| `JWT_SECRET` | Yes | Strong random string for signing auth tokens. **Must match the secret used when users log in.** If unset, the API uses a default and you may see "Invalid token signature" in logs. Generate one: `openssl rand -base64 32` |
| `ADMIN_JWT_SECRET` | Optional | If you use admin-specific login, set this to match. Otherwise leave unset or same as `JWT_SECRET`. |
| `PORT` | Auto | Railway sets this |

**If you see "Admin auth error: Invalid token signature" in Railway logs:** Set `JWT_SECRET` (and `ADMIN_JWT_SECRET` if used) in Railway to the same value as the environment where the frontend gets the token (e.g. your local `.env`), or ensure the frontend logs in against the Railway API URL so the token is issued with Railway’s secret.

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
