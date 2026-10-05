# Bonchi RMS: Local PostgreSQL & PostgREST Architecture

This directory contains the database initialization and configuration for running **Bonchi Restaurant Income & Expense Management System** directly against a local PostgreSQL server and local PostgREST instance.

---

## 1. System Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │                      Next.js PWA                       │
                               └───────────┬────────────────────────────────┬───────────┘
                                           │                                │
                       1. Auth / Login     │                                │ 3. Bearer JWT
                                           ▼                                ▼
                        ┌─────────────────────────────────┐   ┌───────────────────────────┐
                        │      Express Backend :5000      │   │  Local PostgREST :3001    │
                        │    (JWT Issuer & Business API)  │   │  (Automated Direct REST)  │
                        └──────────────────┬──────────────┘   └─────────────┬─────────────┘
                                           │                                │
                       2. Direct pg Pool   │                                │ 4. RLS Impersonation
                                           ▼                                ▼
                        ┌─────────────────────────────────────────────────────────────────┐
                        │                 Local PostgreSQL 16 (localhost:5432)            │
                        │        (13 Tables, Dual-Currency Regs, Row Level Security)       │
                        └─────────────────────────────────────────────────────────────────┘
```

---

## 2. Setup Local PostgreSQL in 2 Steps

### Step 1: Local PostgreSQL Connection
Your local PostgreSQL is running on `localhost:5432` with database `bonhchi_db`.
Configured in `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:1234@localhost:5432/bonhchi_db
```

### Step 2: Initialize Database Schema via Node.js Script
You don't need `psql` command line tools. Simply run from the `backend/` directory:
```bash
cd "d:\Bonchi System\backend"
npm run db:setup
```
This automated script:
- Connects to your local PostgreSQL using `DATABASE_URL` from `.env`.
- Creates PostgREST roles (`anon`, `authenticated`, `bonchi_owner`, `bonchi_manager`, `bonchi_staff`, `authenticator`).
- Creates all 13 relational tables from the FRD.
- Enables Row Level Security (RLS) on `wallets`, `invoices`, and `wallet_counts`.
- Inserts default wallets, food categories, suppliers, standard product catalog, and seed users.

---

## 3. Running PostgREST Locally (Standalone Binary)

1. Download the PostgREST binary for Windows from: [https://github.com/PostgREST/postgrest/releases](https://github.com/PostgREST/postgrest/releases)
2. Extract `postgrest.exe` into this `database/` folder or place it in your system PATH.
3. Start PostgREST with the provided configuration file:
```cmd
postgrest.exe database\postgrest.conf
```
PostgREST will connect to your local PostgreSQL and serve an automated REST API on `http://localhost:3001`.

---

## 4. PostgREST JWT Authentication Contract

The Express backend and PostgREST share the same secret:
`JWT_SECRET=super_secret_bonchi_jwt_key_2026_at_least_32_characters_long`

### JWT Payload Claims:
```json
{
  "sub": "1",
  "role": "bonchi_owner",
  "app_role": "owner",
  "username": "owner",
  "name": "Lok Bong (Owner)",
  "phone": "012999001",
  "aud": "postgrest",
  "iss": "bonchi-auth",
  "iat": 1728130000,
  "exp": 1728216400
}
```

### Role-Based Access Control (RLS):
- `bonchi_owner`: Full access to all 13 tables, live bank accounts, profit/loss reports.
- `bonchi_manager`: Operational access to Cash Drawer, Petty Cash, Manager Advance, same-day transactions.
- `bonchi_staff`: Strictly isolated access to Petty Cash wallet, personal expenditures, and blind cash counts.

---

## 5. Express Authentication Endpoints

- `POST /api/v1/auth/login`: Username + Password (non-strict) -> returns PostgREST-compatible JWT.
- `POST /api/v1/auth/register`: Simple registration with username & password (not strict).
- `GET /api/v1/auth/demo-token?role=owner`: Instantly generates test JWT for `owner`, `manager`, or `staff`.
- `GET /api/v1/auth/me`: Verifies active JWT and returns decoded user profile.
