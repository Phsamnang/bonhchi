# 🚀 Railway Deployment Guide for Bonchi RMS

This guide walks you through deploying the complete **Bonchi Restaurant Money App** (Backend API, Frontend Next.js, and PostgreSQL Database) to [Railway](https://railway.com).

---

## 🏗 Architecture Overview

Your deployment will consist of 3 services in one Railway project:
1. **PostgreSQL Database** (Railway managed plugin)
2. **Backend API** (Express + Drizzle ORM, running inside `/backend`)
3. **Frontend Web App** (Next.js 16, running inside `/frontend`)

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Push Your Code to GitHub

Commit the changes made to prepare the project for production and push them to your GitHub repository:

```bash
git add .
git commit -m "fix(deploy): prepare backend and frontend for Railway production deployment"
git push origin main
```

---

### Step 2: Create a Project on Railway

1. Go to [railway.com](https://railway.com) and log in.
2. Click **"+ New Project"**.
3. Select **"Empty Project"** (or add services one by one).

---

### Step 3: Add PostgreSQL Database

1. In your project dashboard, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**.
2. Railway will provision a PostgreSQL instance.
3. Once created, click on the **PostgreSQL** service and navigate to the **Variables** tab to see that `DATABASE_URL` is generated automatically.

---

### Step 4: Deploy the Backend API Service

1. In the same project dashboard, click **"+ New"** → **"GitHub Repo"**.
2. Select your repository: **`Phsamnang/bonhchi`**.
3. Once the service appears, click on it and go to **Settings**:
   - **Service Name**: Rename it to `bonchi-api` (optional, for clarity).
   - **Root Directory**: Set to `backend` (⚠️ **Crucial**: this tells Railway to build inside the backend folder).
4. Go to the **Variables** tab and add the following environment variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Click **"Add Reference"** and select **`Postgres.DATABASE_URL`** (or type `${{Postgres.DATABASE_URL}}`).
   - `JWT_SECRET`: Generate a random secure key (e.g. `bonchi_super_secret_jwt_key_2026_secure_railway_production_token`).
   - `JWT_EXPIRES_IN`: `24h`
   *(Note: `PORT` is automatically injected by Railway, you do not need to set it).*
5. Go to the **Networking** tab:
   - Under **Public Networking**, click **"Generate Domain"** (e.g., `bonchi-api-production.up.railway.app`).
   - Copy this URL (you will need it for the frontend!).

> 💡 **Automatic Schema Setup**:
> The backend automatically runs `npm run start:prod` (`npx drizzle-kit push && node dist/server.js`), which pushes all schema tables and enums to the PostgreSQL database without inserting any seed data.

---

### Step 5: Deploy the Frontend Service

1. In the same project dashboard, click **"+ New"** → **"GitHub Repo"**.
2. Select the repository **`Phsamnang/bonhchi`** again.
3. Click on the new service and go to **Settings**:
   - **Service Name**: Rename it to `bonchi-frontend`.
   - **Root Directory**: Set to `frontend` (⚠️ **Crucial**: tells Railway to build inside the frontend folder).
4. Go to the **Networking** tab:
   - Click **"Generate Domain"** (e.g., `bonchi-frontend-production.up.railway.app`).
5. Go to the **Variables** tab and add:
   - `NODE_ENV`: `production`
   - `NEXT_PUBLIC_BACKEND_URL`: Paste the backend URL generated in Step 4 (e.g. `https://bonchi-api-production.up.railway.app`).
   - `NEXTAUTH_URL`: Paste the frontend domain from above (e.g. `https://bonchi-frontend-production.up.railway.app`).
   - `NEXTAUTH_SECRET`: The same secret or a random 32+ character string.

---

### Step 6: Verify Deployment & Log In

1. Open your generated frontend URL: `https://<frontend-domain>.up.railway.app`
2. You will see the login screen.
3. Sign in using your default owner account:
   - **Username**: `somnang`
   - **Password**: `somnang123`
   - **Role**: `Owner` (Full access)
4. All operational tables (transactions, invoices, wallets) start clean and unseeded. You can start creating your real wallets and recording data directly!

---

## 🛠 Troubleshooting & Tips

- **Database Connection**: The backend has been configured to automatically accept SSL connections when connecting to Railway PostgreSQL or external cloud databases.
- **Viewing Logs**: In Railway, click on any service and select **"Deploy Logs"** or **"Build Logs"** to view live runtime and startup logs.
- **Schema Push**: On every deploy, `npx drizzle-kit push` runs automatically to ensure all tables, enums, and relations match your latest schema.
