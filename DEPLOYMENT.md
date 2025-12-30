# Deployment Guide

This guide covers deploying the Price Tracker application with:
- **Next.js app** → Vercel
- **PostgreSQL database** → Vercel Postgres (or Neon/Supabase)
- **n8n workflows** → Railway (or Render/Fly.io)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Next.js App                           │    │
│  │         (API routes, Auth, Frontend)                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Vercel Postgres                         │    │
│  │              (or Neon/Supabase)                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ (same DATABASE_URL)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RAILWAY / RENDER                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      n8n                                 │    │
│  │    (Price checking workflow, runs every hour)            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Deploy Database (Vercel Postgres)

### Option A: Vercel Postgres (Recommended)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Storage** tab → **Create Database** → **Postgres**
3. Name it `pricetracker-db`
4. Select region closest to you (e.g., `fra1` for Europe)
5. Copy the `DATABASE_URL` connection string

### Option B: Neon (Free tier available)

1. Go to [neon.tech](https://neon.tech) and create account
2. Create new project → Copy the connection string
3. Format: `postgresql://user:pass@host/db?sslmode=require`

### Option C: Supabase

1. Go to [supabase.com](https://supabase.com) and create project
2. Go to Settings → Database → Connection string
3. Use the "URI" format

---

## Step 2: Deploy Next.js to Vercel

### 2.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js

### 2.2 Configure Environment Variables

In the Vercel project settings, add these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | From Step 1 |
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` | Required for NextAuth |
| `AUTH_GOOGLE_ID` | Your Google OAuth Client ID | From Google Cloud Console |
| `AUTH_GOOGLE_SECRET` | Your Google OAuth Client Secret | From Google Cloud Console |
| `RESEND_API_KEY` | `re_...` | From resend.com |
| `RESEND_FROM_EMAIL` | `Price Tracker <noreply@yourdomain.com>` | Must be verified domain |

### 2.3 Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client
3. Add authorized redirect URI:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

### 2.4 Deploy

Click **Deploy**. Vercel will:
1. Install dependencies
2. Run `prisma generate` (postinstall script)
3. Build the Next.js app
4. Deploy to edge

### 2.5 Push Database Schema

After first deployment, push the database schema:

```bash
# Set the production DATABASE_URL temporarily
export DATABASE_URL="postgresql://..."

# Push schema to production database
npx prisma db push
```

Or use Vercel CLI:
```bash
vercel env pull .env.production.local
npx prisma db push
```

---

## Step 3: Deploy n8n (Railway)

n8n requires a persistent server (can't run on Vercel). Railway is recommended.

### 3.1 Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### 3.2 Deploy n8n

1. Click **New Project** → **Deploy a Template**
2. Search for **n8n** and select it
3. Configure environment variables:

| Variable | Value |
|----------|-------|
| `DB_TYPE` | `postgresdb` |
| `DB_POSTGRESDB_HOST` | Your Vercel/Neon Postgres host |
| `DB_POSTGRESDB_PORT` | `5432` |
| `DB_POSTGRESDB_DATABASE` | Database name |
| `DB_POSTGRESDB_USER` | Database user |
| `DB_POSTGRESDB_PASSWORD` | Database password |
| `DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED` | `false` |
| `N8N_ENCRYPTION_KEY` | Generate a random 32-char string |
| `WEBHOOK_URL` | Will be your Railway URL |

4. Click **Deploy**

### 3.3 Import Workflow

1. Open your n8n instance (Railway URL)
2. Go to **Workflows** → **Import from File**
3. Upload `n8n-workflows/price-checker.json`

### 3.4 Configure n8n Credentials

In n8n, create these credentials:

**PostgreSQL:**
- Host: Your database host
- Database: Your database name
- User/Password: Your database credentials
- SSL: Enable

**Resend (HTTP Header Auth):**
- Name: `Authorization`
- Value: `Bearer re_your_api_key`

**OpenAI:**
- API Key: Your OpenAI API key

### 3.5 Activate Workflow

1. Open the imported workflow
2. Update credential references to use your new credentials
3. Toggle the workflow to **Active**

---

## Alternative n8n Deployments

### Render.com

1. Go to [render.com](https://render.com)
2. Create **New Web Service**
3. Use Docker image: `docker.n8n.io/n8nio/n8n`
4. Add environment variables (same as Railway)

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Create fly.toml
fly launch --image docker.n8n.io/n8nio/n8n

# Set secrets
fly secrets set DB_TYPE=postgresdb
fly secrets set DB_POSTGRESDB_HOST=your-host
# ... other variables

# Deploy
fly deploy
```

### n8n Cloud (Paid)

If you prefer managed hosting:
1. Go to [n8n.cloud](https://n8n.cloud)
2. Sign up for a plan
3. Import your workflow

---

## Environment Variables Summary

### Vercel (Next.js)

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=your-secret-here
AUTH_GOOGLE_ID=xxx.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-xxx
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=Price Tracker <noreply@domain.com>
```

### Railway/n8n

```env
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=your-postgres-host
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=your-db-name
DB_POSTGRESDB_USER=your-user
DB_POSTGRESDB_PASSWORD=your-password
DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false
N8N_ENCRYPTION_KEY=random-32-char-string
GENERIC_TIMEZONE=Europe/Berlin
```

---

## Post-Deployment Checklist

- [ ] Next.js app is live on Vercel
- [ ] Database schema is pushed (tables exist)
- [ ] Google OAuth redirect URI is updated
- [ ] Can register new user
- [ ] Can login with Google
- [ ] Can add tracked products
- [ ] n8n is running on Railway/Render
- [ ] n8n workflow is imported and active
- [ ] n8n has correct database credentials
- [ ] Price check runs successfully (check n8n executions)
- [ ] Email notifications work

---

## Troubleshooting

### "PrismaClientInitializationError"
- Ensure `DATABASE_URL` is correct and accessible
- Check if database allows connections from Vercel IPs
- For Neon: ensure `?sslmode=require` is in URL

### Google OAuth "redirect_uri_mismatch"
- Add the exact Vercel URL to Google Console
- Include the full path: `/api/auth/callback/google`

### n8n can't connect to database
- Verify database credentials
- Check if SSL is required (`DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false`)
- Ensure database allows external connections

### Emails not sending
- Verify domain in Resend dashboard
- Check RESEND_FROM_EMAIL uses verified domain
- For testing, use `onboarding@resend.dev`
