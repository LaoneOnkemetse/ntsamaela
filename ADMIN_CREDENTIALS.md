# Ntsamaela Admin Credentials

## Permanent Admin Login Credentials

The admin user is automatically created/ensured on every deployment via the `apps/api/seed-admin.js` script, which runs automatically during Railway deployment.

### Login Information

- **Email:** `admin@ntsamaela.com`
- **Password:** `admin123`
- **Name:** Ntsamaela Administrator
- **Phone:** +26771234567
- **User Type:** ADMIN

### Security Note

⚠️ **IMPORTANT:** These are default credentials. For production environments, you should:

1. Change the password immediately after first login
2. Or update the `ADMIN_PASSWORD` constant in `apps/api/seed-admin.js` before deployment
3. Consider using environment variables for the password in production

### Automatic Creation

The admin user is automatically created/updated:
- On every Railway deployment (via `railway-start.sh`)
- When running `npm run seed:admin` manually
- The script uses `upsert`, so it will create if missing or update if exists

### Manual Creation

To manually ensure the admin user exists, run:

```bash
# On Railway
railway run node apps/api/seed-admin.js

# Or locally (if connected to production DB)
cd apps/api
node seed-admin.js
```

### Changing the Password

To change the admin password:

1. **Option 1:** Update the `ADMIN_PASSWORD` constant in `apps/api/seed-admin.js` and redeploy
2. **Option 2:** Log in and change the password through the admin panel
3. **Option 3:** Use the API endpoint to reset the password (if available)

---

**Last Updated:** January 2025
