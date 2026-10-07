# Bonchi Backend — Spring Boot Rebuild Spec

> **Purpose:** rebuild the Bonchi backend in **Spring Boot** so the existing **Next.js frontend keeps working unchanged**.
> This document collects everything requested and decided during the October 2026 work sessions (reports, master data, payroll, attendance, monthly report), the API contract the frontend depends on, the business rules, and the bugs already found — so they are not repeated.
>
> **Sources:** the current frontend (`frontend/src/hooks/*` = the API contract), the committed Node backend in git (`git show HEAD:backend/...`), FRD 13 v2, and the live Neon database schema.

---

## 0. Read first — state of the code

| Item | Status | Where it is now |
| :--- | :--- | :--- |
| Frontend (Next.js 16) | ✅ intact, all session changes present | `frontend/` |
| New backend skeleton | Spring Boot **4.1.1**, Java **21**, Gradle | `backend/` (`com.bonchi.BackendApplication`) |
| Old Node backend — committed modules (auth, invoices, wallets, master, reports v1, …) | in **git history only** | `git show HEAD:backend/src/...` |
| Old Node **payroll** module, `schema/payroll.ts`, migration `0003_*`, seed scripts (`seed-staff`, `seed-attendance`, `seed-master-data`, `seed-report-items`, `migrate-payroll`) | ❌ **lost** — were never committed and were deleted in the restructure | rebuild from §6–§8 of this document |
| Uncommitted reports changes (daily breakdown buckets, `/reports/monthly`, payroll pay fix) | ❌ **lost** (git has older versions) | rebuild from §6.1 and §6.3 |
| **Data** (staff, contracts, Sept attendance, payroll runs, 584 products, invoices) | ✅ safe in **Neon** | the database is the source of truth |
| `backend/.env` (Neon URL, `JWT_SECRET`) | ❌ deleted | recover the values from Neon / your secrets store → `application.properties` (never commit them) |

> Before mapping entities, dump the live schema once: `pg_dump --schema-only "$DATABASE_URL" > docs/db-schema.sql`. Use it to confirm the column lists in §5 (payroll tables were created by the lost migration `0003`).

---

## 1. What was requested (session log)

| # | Request | Result to rebuild | Spec |
| :--- | :--- | :--- | :--- |
| 1 | Report PDF must list **all** rows, Cambodian-style list | Frontend export (no backend) | §6.5 |
| 2 | PDF style errors, text not clear, rows hard to read | Frontend export | §6.5 |
| 3 | Test with real data / seed 50+ items for today | Seed data | §8 |
| 4 | Show **income vs expense per day** in the report | `GET /reports/daily-cashflow` | §6.1 |
| 5 | Seed suppliers & products, **50+ products per supplier** | Seed data + one-product-one-supplier rule | §6.2, §8 |
| 6 | Same product under two suppliers — remove duplicates | Rule: a product name belongs to one supplier | §6.2 |
| 7 | **Pagination** on `/master/products?supplier_id=` and everywhere products are listed | `GET /master/products` paged mode | §6.2 |
| 8 | Separate supplier list and supplier products | Frontend routes `/suppliers`, `/suppliers/[id]` | §6.2 |
| 9 | Analyse & optimise FRD 13 (payroll) | `docs/FRD/13_…md` v2 | §6.3 |
| 10 | `/payroll/runs` error | Ids must accept numbers or numeric strings | §7 B-01 |
| 11 | Seed staff | Seed data | §8 |
| 12 | Redesign **Count Day** (attendance) tab | Day sheet + month grid; backend contract changes | §6.3.3 |
| 13 | Redesign payroll sheet PDF (twice) | Frontend export | §6.5 |
| 14 | Seed attendance 01–30 Sep | Seed data | §8 |
| 15 | `POST /payroll/runs/{id}/pay` → 400 | Server computes amounts; wallet per currency | §6.3.6, §7 B-02/B-03 |
| 16 | **Monthly brief report**: each day total incl. **utilities** and **payroll** | `GET /reports/monthly` | §6.1.3 |

---

## 2. Target architecture

```
backend/src/main/java/com/bonchi/
  BackendApplication.java
  config/        SecurityConfig, JwtService, JacksonConfig, CorsConfig, ClockConfig
  common/        ApiError, ApiExceptionHandler, PageResponse, Money, Dates (Asia/Phnom_Penh)
  auth/          AuthController (POST /auth/login), UserRepository
  wallet/        Wallet, WalletController (/wallets, /wallets/summary, /wallets/transfer)
  invoice/       Invoice, InvoiceItem, InvoicePayment, InvoiceController (/invoices/*)
  master/        Supplier, Product, Category, MasterController (/master/*)
  report/        ReportController (/reports/*), ReportQueries (native SQL)
  payroll/       Staff, StaffContract, StaffAttendance, StaffAdvance, PayrollRun, PayrollItem,
                 PayrollController (/payroll/*), PayrollService, PayrollCalculator
  count/ request/ table/ dashboard/   (other existing modules — same contract as today)
```

- **Per module:** `Controller → Service (@Transactional) → Repository (Spring Data JPA)`; reports use **native SQL** via `JdbcClient`/`NamedParameterJdbcTemplate` (aggregations are clearer in SQL than JPQL).
- **Already in `build.gradle`:** web MVC, data-jpa, security, validation, jjwt 0.12.6, postgresql, lombok. Add `spring-boot-starter-actuator` (health check) if needed.

### 2.1 `application.properties` (values from env vars — never commit secrets)

```properties
spring.datasource.url=${DATABASE_URL}            # jdbc:postgresql://…neon.tech/neondb?sslmode=require
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate          # NEVER update/create — the schema already exists
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.jdbc.time_zone=Asia/Phnom_Penh
spring.jackson.property-naming-strategy=SNAKE_CASE
spring.jackson.default-property-inclusion=always
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.time-zone=Asia/Phnom_Penh
server.port=${PORT:5000}                         # frontend NEXT_PUBLIC_BACKEND_URL = http://localhost:5000
server.servlet.context-path=/api/v1
bonchi.jwt.secret=${JWT_SECRET}                  # same secret the old backend used
bonchi.jwt.expires-in=24h
bonchi.cors.origins=http://localhost:3000,${FRONTEND_URL}
bonchi.khr-per-usd=4000
```

---

## 3. API contract rules (must match the frontend)

| Rule | Detail |
| :--- | :--- |
| Base path | `/api/v1` (frontend uses `NEXT_PUBLIC_BACKEND_URL` + `/api/v1`) |
| Auth | `Authorization: Bearer <jwt>` on every route except `/auth/login` and `/health`. 401 → `{ "error": "Unauthorized", "message": "…" }` |
| Login | `POST /auth/login {username, password}` → `{ "user": {id, name, username, role, phone}, "access_token": "<jwt>" }` |
| JWT claims | HS256; `sub` (user id as string), `role`, `app_role` (`owner`/`manager`/`staff`), `username`, `name`, `phone`, `iss: bonchi-auth`, `aud: postgrest`, `exp` (frontend reads `exp` to log out) |
| JSON field names | **snake_case** (`staff_id`, `total_net_khr`, `period_start`) |
| **Numbers** | Always JSON **numbers** — never strings. Ids `Long`, money `BigDecimal` (serialised as number). The old backend returned some `bigint` columns as strings and broke the frontend (§7 B-01, B-02). |
| Money scale | USD `scale 2`; KHR `scale 0` (whole riel). Round **net** amounts: USD to 0.01, KHR to whole riel |
| Dates | `"YYYY-MM-DD"` strings (`LocalDate`); timestamps ISO-8601. **"Today" = `Asia/Phnom_Penh`**, never UTC |
| Requests | Ids must accept **number or numeric string** (`"12"`) — the frontend sends some ids back as received |
| Errors | `{ "error": "<readable message>", "message"?: "<detail>" }`. Validation errors listed by field: `payments[0].wallet_id: must be greater than 0` — never a raw JSON dump |
| Pagination | Request `page` (≥1), `limit` (default 20, max 100), optional `search`. Response `{ total, page, limit, totalPages, <items> }` (e.g. `products`, `invoices`) |
| Roles | `owner` > `manager` > `staff`; endpoint rules in §6 |

---

## 4. Endpoint inventory (everything the frontend calls)

**Detailed in §6** = changed or added during the sessions. **Same as today** = port the logic from `git show HEAD:backend/src/modules/<module>/`.

| Method & path | Module | Spec |
| :--- | :--- | :--- |
| `POST /auth/login` | auth | same as today |
| `GET /dashboard/summary` | dashboard | same as today |
| `GET /wallets` · `GET /wallets/summary` · `POST /wallets/transfer` | wallet | same as today |
| `GET /wallet-counts/expected` · `GET /wallet-counts/history` · `POST /wallet-counts` | count | same as today |
| `GET /invoices` (paged) · `POST /invoices/market-trip` · `POST /invoices/small-expense` · `POST /invoices/income` · `POST /invoices/{id}/pay` · `POST /invoices/{id}/void` | invoice | same as today, plus §7 B-04, B-05 |
| `GET /money-requests` · `POST /money-requests` · `POST /money-requests/{id}/approve` · `…/reject` · `…/settle` | request | same as today |
| `GET /tables` · `POST /tables` · `PUT /tables/{id}` · `DELETE /tables/{id}` | table | same as today |
| `GET /master/shops` · `GET /master/shops/{id}` · `POST /master/shops` | master | §6.2 |
| `GET /master/products` · `POST /master/products` · `DELETE /master/products/{id}` | master | **§6.2** (pagination, uniqueness) |
| `GET /reports/items` | report | **§6.1.1** |
| `GET /reports/daily-cashflow` | report | **§6.1.2** |
| `GET /reports/monthly` | report | **§6.1.3** (new) |
| `GET /reports/daily` | report | same as today |
| `GET/POST /payroll/staff`, `PUT /payroll/staff/{id}` | payroll | **§6.3.1** |
| `GET /payroll/attendance?date=` · `GET /payroll/attendance/range` · `GET /payroll/attendance/summary` · `POST /payroll/attendance/batch` | payroll | **§6.3.3** |
| `GET/POST /payroll/advances`, `POST /payroll/advances/{id}/void` | payroll | **§6.3.4** |
| `POST /payroll/runs/preview` · `GET /payroll/runs` · `GET /payroll/runs/{id}` · `POST /payroll/runs` · `POST /payroll/runs/{id}/pay` · `POST /payroll/runs/{id}/void` | payroll | **§6.3.5–6.3.7** |

---

## 5. Data model

The schema **already exists in Neon** — map it, don't create it (`ddl-auto=validate`).

### 5.1 Existing tables (summary)

| Table | Key columns | Notes |
| :--- | :--- | :--- |
| `users` | id, username (unique), name, phone, password_hash (bcrypt), role `user_role` (`owner`/`manager`/`staff`), is_active | |
| `wallets` | id, code (unique), name_km, name_en, type `wallet_type`, category, **currency `currency_code` (USD\|KHR)**, current_balance | **one currency per wallet** |
| `invoices` | id, invoice_no (unique), invoice_date, invoice_time, type `invoice_type` (`expense`/`income`), **expense_kind `expense_kind` (`product`/`small`/`salary`)**, supplier_id, supplier_name, category_name, wallet_code, total_usd (12,2), total_khr (14,0), paid_usd, paid_khr, status `invoice_status` (`paid`/`partial`/`unpaid`/`void`), note, created_by, created_at | `salary` was added by the lost migration 0003 — check the enum in Neon |
| `invoice_items` | id, invoice_id, product_id, item_name, quantity (10,3), unit, unit_price, currency, line_total, is_paid, created_at | |
| `invoice_payments` | id, invoice_id, wallet_id, amount, currency, method, cross_currency_rate, paid_at | |
| `suppliers` | id, name, market_location, contact_phone, note, is_active | |
| `products` | id, name, default_unit, category_id, supplier_id, default_currency, default_unit_price, is_active | |
| `categories` | id, name_km, name_en, type, parent_id, icon, is_active | empty in Neon today |
| `money_requests`, `request_distributions`, `transfers`, `wallet_counts`, `restaurant_tables` | | same as today |

### 5.2 Payroll tables (FRD 13 v2 — confirm against the schema dump)

| Table | Columns |
| :--- | :--- |
| `staff` | id, name, phone, position, user_id (nullable FK users — login optional), joined_date, left_date, is_active, created_at |
| `staff_contracts` | id, staff_id, salary_type `salary_type` (`monthly`/`daily`), base_rate (14,2), currency `currency_code`, standard_days (default 26), effective_from, created_by, created_at — **history: a raise is a new row**; current = latest `effective_from`, then latest id |
| `staff_attendance` | id, staff_id, date, status `attendance_status`, paid_units (3,1), note, recorded_by, updated_at — **unique (staff_id, date)** |
| `staff_advances` | id, staff_id, amount, currency, given_at, wallet_id, invoice_id, distribution_id, status `advance_status` (`open`/`deducted`/`void`), deducted_in_item_id, note, created_by, created_at |
| `payroll_runs` | id, title, period_start, period_end, payout_date, exchange_rate, total_net_usd (14,2), total_net_khr (14,0), status `payroll_status` (`draft`/`paid`/`void`), notes, created_by, paid_by, paid_at, voided_by, voided_at, void_reason, created_at |
| `payroll_items` | id, payroll_run_id, staff_id, contract_id, currency, daily_rate (14,4), days_counted, days_override, override_reason, unrecorded_days, gross, allowance, bonus, penalty, advances, carry_in, carry_out, net, invoice_id, note — **unique (payroll_run_id, staff_id)** |

### 5.3 JPA mapping tips

- **Postgres enums:** `@Enumerated(EnumType.STRING) @JdbcType(PostgreSQLEnumJdbcType.class)`, and keep the Java constant names equal to the DB labels (`present`, `half_day`, …) or use a converter.
- **Identity keys:** `@GeneratedValue(strategy = IDENTITY)`, type `Long`.
- **Money:** `BigDecimal`, never `double`.
- **Dates and times:** `LocalDate` for `date` columns, `OffsetDateTime` for `timestamptz`.
- **Relations:** keep them `LAZY`. Return DTOs from controllers, not entities, so the JSON shape stays fixed.

---

## 6. Feature specifications

### 6.1 Reports

#### 6.1.1 `GET /reports/items?period=today|yesterday|7days|month|all`
Purchased item lines (non-void, `type = expense`) for the period. Response `{ period, total, items: PurchasedItem[] }`, where an item has: `id, item_name, quantity, unit, unit_price, currency, line_total, is_paid, invoice_id, invoice_no, invoice_date (YYYY-MM-DD), supplier_name, wallet_code, status`.

- **Order:** `invoice_date DESC, created_at DESC, invoice.id DESC, item.created_at ASC, item.id ASC`. The id tie-breakers are required: a market trip saves several invoices in one transaction, so they share `created_at`. Without the tie-breakers, one invoice's lines got split apart (§7 B-06).
- **Period dates** use the database day (`CURRENT_DATE` in `Asia/Phnom_Penh`):
  - `yesterday`: `CURRENT_DATE - 1`
  - `7days`: `CURRENT_DATE - 6` … today
  - `month`: first day of the month … today

#### 6.1.2 Expense buckets (shared by daily-cashflow and monthly)

Every non-void invoice falls into exactly one bucket:

| Bucket | Rule |
| :--- | :--- |
| `income` | `type = 'income'` |
| `purchase` | `expense_kind = 'product'` (market trip, has item lines) |
| `payroll` | `expense_kind = 'salary'` (payroll payouts **and** salary advances) |
| `utility` | `category_name IN UTILITY_CATEGORIES` |
| `other` | everything else |

`UTILITY_CATEGORIES = ["ភ្លើង", "អគ្គិសនី", "ទឹក", "ទឹកស្អាត", "អ៊ីនធឺណិត", "ទូរស័ព្ទ", "ហ្គាស", "ជួលផ្ទះ", "សំរាម"]`. Keep it in one constant. The small-expense picker in the frontend already offers ភ្លើង, ទឹក, អ៊ីនធឺណិត, ជួលផ្ទះ, ហ្គាស.

**`GET /reports/daily-cashflow?period=…`** returns `{ period, days: Day[], totals: Amounts }`.

| Shape | Fields |
| :--- | :--- |
| `Amounts` | `income_usd/_khr, purchase_usd/_khr, utility_usd/_khr, payroll_usd/_khr, other_usd/_khr, expense_usd/_khr, net_usd/_khr` |
| `Day` | `Amounts` + `date`, `income_count`, `expense_count` |

- `expense` = purchase + utility + payroll + other; `net` = income − expense, per currency. Never add USD and KHR together.
- **Every** day in the range appears, including days with no invoices (zeros); use `generate_series`.

#### 6.1.3 `GET /reports/monthly?month=YYYY-MM` (new)
Monthly brief. Validate the month (`400 "month must be YYYY-MM"`).

```jsonc
{
  "month": "2026-09",
  "start": "2026-09-01",
  "end":   "2026-09-30",          // = today if the month is the current one
  "exchange_rate": 4000,
  "days":   [ /* Day, as in 6.1.2, one per date start..end */ ],
  "totals": { /* Amounts */ },
  "categories": [ { "grp": "utility", "category": "ភ្លើង", "count": 2, "usd": 0, "khr": 180000 } ],
  "payroll": [  // salary money paid out IN this month (by invoice_date): payouts + advances
    { "invoice_no": "#PAY-3-USD", "date": "2026-10-07", "description": "Staff Payroll - …", "category": "…", "wallet_code": "aba", "usd": 1214, "khr": 0 }
  ],
  "payroll_runs": [ // runs whose work period overlaps the month, whenever they were paid (status != void)
    { "id": 3, "title": "បើកប្រាក់ខែប្រចាំខែ 09/2026", "period_start": "2026-09-01", "period_end": "2026-09-30",
      "status": "paid", "paid_on": "2026-10-07", "net_usd": 1214, "net_khr": 1287500, "staff_count": 11 }
  ]
}
```

- **`categories`:** group by (bucket, `category_name`), with an empty category shown as `ផ្សេងៗ`. Order by bucket, then value descending, where value = usd × 4000 + khr.
- **`paid_on`:** `paid_at` converted to the Phnom Penh date.
- **Daily table vs payroll section:** the daily table is on a cash basis (the payroll column is the day money left the wallet). `payroll_runs` shows the salary *for* the month, so a September run paid in October appears in both months, labelled differently.

### 6.2 Master data (suppliers & products)

| Endpoint | Rules |
| :--- | :--- |
| `GET /master/shops` | All active suppliers + `product_count` (active products) |
| `GET /master/shops/{id}` | Supplier + its active products (unused by the frontend today; paginate if kept) |
| `POST /master/shops` | Create supplier |
| `GET /master/products` | **Two modes:** <br>• no `page`/`limit` → **plain array** of all active products (legacy; keep until no client uses it) <br>• `page` and/or `limit` → `{ total, page, limit, totalPages, products }` |
| | Filters: `supplier_id` (optional; none = all suppliers), `search` (case-insensitive `ILIKE` on name — **escape `%` and `_`**) |
| | Order `name ASC, id ASC` (stable pages). `limit` default 20, capped at 100. `page`/`limit` must be positive integers → otherwise 400 `"page must be a positive integer"` |
| | Product JSON: `id, name, unit, price, cur, supplier_id, supplier_name, is_active` (note the short names `unit`/`price`/`cur`) |
| `POST /master/products` | `{name, unit, price, cur, supplier_id?, category_id?}`. **Reject a name that already exists under another supplier** (one product → one supplier, decided in request #6). |
| `DELETE /master/products/{id}` | Soft delete (`is_active = false`) |

The frontend now calls the paged mode everywhere:
- Suppliers page: 20 per page.
- Settings catalog: 10 per page.
- Market-trip picker: the shop's products 15 per page; while the user searches, up to 6 matches from other shops (`page=1&limit=21&search=` across all suppliers).

### 6.3 Payroll (FRD 13 v2)

Roles:
- **Staff list and attendance:** owner + manager.
- **Creating staff and contracts:** owner only.
- **Advances:** owner + manager to create, owner to void.
- **Runs (preview / create / pay / void):** owner only.

#### 6.3.1 Staff
- `GET /payroll/staff?include_inactive=false` → `{ success, staff: Staff[] }`, where `Staff` = staff columns + current contract (`contract_id, salary_type, base_rate, currency, standard_days, effective_from`).
- `POST /payroll/staff` `{name, phone?, position, joined_date, salary_type, base_rate, currency, standard_days}` creates the staff member and the first contract (`effective_from = joined_date`) in one transaction → `201 { success, staff }`.
- `PUT /payroll/staff/{id}` updates the person; a changed rate creates a **new contract row**, never an edit → `{ success, staff }`.

#### 6.3.2 Status → paid units (server-side, never trusted from the client)

| status | paid_units |
| :--- | ---: |
| present | 1.0 |
| half_day | 0.5 |
| absent | 0 |
| leave_paid | 1.0 |
| leave_unpaid | 0 |
| holiday_work | 2.0 |

#### 6.3.3 Attendance (Count Day)
- **`GET /payroll/attendance?date=YYYY-MM-DD`** → `{ success, date, attendance: AttendanceRecord[] }`.
  - Lists only staff **employed on that date**: `is_active AND joined_date <= date AND (left_date IS NULL OR left_date >= date)`, ordered by staff id.
  - **An unrecorded staff member returns `status: null`, `paid_units: null`, `is_recorded: false`.** Never default to `present`: the old API did, the UI showed guesses as recorded, and a save stored them (§7 B-07).
  - Each record also carries `staff_name, position, joined_date, attendance_id (0 if none), note, updated_at`.
- **`GET /payroll/attendance/range?start=&end=`** (month grid, max 62 days, start ≤ end, otherwise 400) → `{ success, start, end, staff: [{staff_id, staff_name, position, joined_date, left_date}], records: [{staff_id, date, status, paid_units, note}] }`.
- **`GET /payroll/attendance/summary?start=&end=`** → `{ success, summary: [{staff_id, staff_name, position, total_paid_days, recorded_days, present_days, half_days, absent_days, leave_paid_days, leave_unpaid_days, holiday_work_days}] }`. All counts are **numbers**.
- **`POST /payroll/attendance/batch`** `{ date, records: [{staff_id, status, note?}] }` upserts `ON CONFLICT (staff_id, date)`, with `paid_units` derived from §6.3.2 and `recorded_by` = current user. The frontend sends **only changed rows**.
- **To add:** reject dates inside a **paid** run's period with 409 (FRD 13 §4.2). This is not implemented yet.

#### 6.3.4 Advances
- `GET /payroll/advances?staff_id=&status=&from=&to=` → `{ success, advances: StaffAdvance[] }`.
- `POST /payroll/advances` `{staff_id, amount, currency, given_at, wallet_id, note?}`, in one transaction:
  1. Lock the wallet; the wallet currency must equal the advance currency, and the balance must cover it.
  2. Deduct the wallet.
  3. Insert an expense invoice: `expense_kind = 'salary'`, `category_name = 'បុរេប្រទានប្រាក់ខែ (Staff Advance)'`, `supplier_name` = staff name, `invoice_no = #ADV-…`, `status = paid`.
  4. Insert `staff_advances` (`status = open`, `invoice_id`).
- `POST /payroll/advances/{id}/void` (open only) voids the invoice, refunds the wallet, and sets `status = void`.

#### 6.3.5 Preview & create
- **`POST /payroll/runs/preview`** `{period_start, period_end, payout_date, exchange_rate=4000}` → `{ success, preview: {period_start, period_end, payout_date, exchange_rate, total_days_in_period, total_net_usd, total_net_khr, items: PayrollRunItem[]} }`.
  - It loads every staff member whose employment overlaps the period, using the contract in effect on `period_end`.
  - **Per line** (see §6.4 for the formulas):
    - `days_counted` = sum of paid_units in the period;
    - `unrecorded_days` = **employed, past** days with no record (see §7 B-08);
    - `advances` = open advances with `given_at <= period_end`;
    - `carry_in` = the previous paid line's `carry_out`.
- **`POST /payroll/runs`** `{title, period_start, period_end, payout_date, exchange_rate, notes?, items[]}` saves a draft and its items → `201 { success, run }`. Recompute `gross`/`net` on the server from the item's days, rates and adjustments rather than trusting client totals. Ids in items may be numeric strings (§7 B-01).
- **`GET /payroll/runs`** → `{ success, runs: PayrollRun[] }`, including `staff_count` (number). **`GET /payroll/runs/{id}`** → `{ success, run }` with `items`, `created_by_name` and `paid_by_name`. Unknown id → 404.

#### 6.3.6 `POST /payroll/runs/{id}/pay` (owner)
Request: `{ "payments": [ { "currency": "USD", "wallet_id": 5 }, { "currency": "KHR", "wallet_id": 3 } ] }`. Any `amount` sent is **ignored**.

Steps, in **one transaction**:
1. `SELECT … FOR UPDATE` the run; status must be `draft`.
2. **Amounts come from the run's items:** sum `net` per currency (USD to 0.01, KHR whole).
3. For every currency with an amount > 0, a payment entry (a wallet) is **required**. Otherwise return 400 `សូមជ្រើសរើសកាបូបសម្រាប់បើកប្រាក់ KHR (1,287,500 ៛)`.
4. Lock each wallet. Its currency must match the payment currency. If the balance is short, return 400 `កាបូប <name> មិនមានប្រាក់គ្រប់គ្រាន់ — មាន $225.00 ត្រូវការ $1214.00`. **Never clamp the balance to 0.**
5. Deduct the wallet. Insert one expense invoice per currency:
   - `invoice_no = #PAY-{runId}-{CUR}`, `expense_kind = 'salary'`, `status = paid`;
   - **`invoice_date` = the actual payment day (Phnom Penh today)**, not `payout_date` (§7 B-03).
   - Set `payroll_items.invoice_id` for that currency.
6. Advances deducted in this run: `status = 'deducted'`, `deducted_in_item_id`.
7. Run: `status = paid`, `paid_by`, `paid_at`. Response `{ success, run }`.

Splitting one currency across several wallets is **not supported**; it's an open item (§9).

#### 6.3.7 `POST /payroll/runs/{id}/void` (owner)
`{ void_reason }`, in one transaction:
1. Void the run's invoices and refund the wallets.
2. Set advances deducted by this run back to `open`.
3. Set `status = void` with `voided_by`, `voided_at` and `void_reason`. Keep the row for audit.

### 6.4 Payroll formulas (FRD 13 v2 §2)

```
DailyRate = base_rate                      (daily staff)
          = base_rate / standard_days      (monthly staff)      → store with scale 4
PaidDays  = days_override ?? days_counted
Gross     = min(PaidDays, Std) × DailyRate + max(0, PaidDays − Std) × DailyRate × ExtraDayRate(1.0)
            (Std = ∞ for daily staff)
Result    = Gross + allowance + bonus − penalty − advances − carry_in
Net       = max(0, Result); carry_out = max(0, −Result)
Round Net only: USD 0.01, KHR whole riel
```

Advances in the other currency are converted at the run's `exchange_rate`; store the rate on the run.

### 6.5 Frontend-only features (no backend work, listed for completeness)

These need only the endpoints above. They live in `frontend/src`:

| Feature | Where it lives |
| :--- | :--- |
| Daily expense list PDF / image: Cambodian layout, grouped by shop, A4 pages split between rows, embedded Khmer fonts | `components/ReportPrintTemplate.tsx`, `lib/exportReport.ts` |
| Payroll sheet PDF: one line per staff, USD / KHR sections with subtotals | `components/payroll/PayrollPrintTemplate.tsx` |
| Monthly report sheet + PDF / image export | `components/reports/MonthlySheet.tsx`, `MonthlyReport.tsx` |
| Count Day tab: day sheet + month grid | `components/payroll/AttendanceTab.tsx` |
| Supplier list / supplier page split; paged product pickers | `app/(dashboard)/suppliers/*`, `components/ProductPicker.tsx`, `components/Pager.tsx` |
| Khmer date helpers | `lib/khmerDate.ts` |

---

## 7. Bugs found — the Spring version must not repeat them

| ID | Bug (old backend) | Requirement |
| :--- | :--- | :--- |
| B-01 | Postgres `bigint` ids returned as **strings**; the frontend sent them back; `POST /payroll/runs` failed with "Expected number, received string" | Ids are JSON numbers in responses, and requests accept number **or** numeric string |
| B-02 | `total_net_khr` and `staff_count` returned as strings (`CAST … AS BIGINT`) → pay request rejected | Serialise money and counts as numbers (`BigDecimal`, `Long`, `Integer`) |
| B-03 | Pay trusted the client `amount`; a missing currency was silently left unpaid; invoices dated on the *planned* payout date (future) | Compute amounts server-side; require a wallet per currency; date invoices on the actual payment day |
| B-04 | Market trip and other deductions used `GREATEST(0, balance - x)` — silent clamping hides overdrafts | Reject when the balance is short (or require an explicit owner override) |
| B-05 | Expense kinds lumped salary into "small expenses" in reports | Use the bucket rules in §6.1.2 |
| B-06 | Item order ties on `created_at` split one invoice's lines | Add id tie-breakers (§6.1.1) |
| B-07 | Attendance API defaulted unrecorded days to `present`; saving stored guesses | Return `null` for unrecorded days; save only what the user changed |
| B-08 | Preview counted **future days** and **days before joining / after leaving** as unrecorded | Count only `max(joined_date, period_start) … min(left_date, period_end, today)` |
| B-09 | Validation errors returned as raw JSON strings | Readable `field: message` (§3) |
| B-10 | "Today" computed in UTC (wrong before 07:00 in Cambodia) | Use `Asia/Phnom_Penh` everywhere (an injected `Clock` bean makes it testable) |

---

## 8. Seed & test data

**In Neon now:**
- **Master data:** 11 suppliers, 584 products, 52–56 per supplier, each product under one supplier.
- **Payroll:** 11 staff (monthly/daily × USD/KHR, one joined 5 Oct) and 252 attendance rows for 1–30 Sep 2026. Seeded rows have `recorded_by = NULL`, which marks them as seed data.
- **Runs:** run 3 for Sept 2026, paid on 7 Oct.

The Node seed scripts were lost. If you need re-seeding, implement them as a Spring `CommandLineRunner` under profile `seed` (`--spring.profiles.active=seed`), with these behaviours from the originals:
- **Idempotent:** match by name / by (staff, date); never overwrite real records.
- **Marked without visible text:** `recorded_by = NULL` for attendance, supplier `note = NULL`. **Never** write a tag into a visible field (an earlier seed did and it showed in the UI).
- **`--clean` mode** removes only seeded rows, never rows referenced by invoices or payroll lines.
- **Attendance pattern:**
  - a weekly day off per staff (`absent` + note `ថ្ងៃឈប់សម្រាក`), except 30-day contracts;
  - the part-time daily waiter works Fri–Sun only;
  - occasional half days, sick days and leave;
  - public holiday 24 Sep → `holiday_work`.

---

## 9. Open items (backlog)

| # | Item | Priority |
| :--- | :--- | :--- |
| O-1 | Fix preview `unrecorded_days` (B-08) | High |
| O-2 | Lock attendance inside paid run periods (409) | High |
| O-3 | Two existing salary invoices `#PAY-3-USD/KHR` are dated **2026-10-10** but were paid **2026-10-07** — correct the dates once (owner decision) | Medium |
| O-4 | Split payment of one currency across several wallets | Medium |
| O-5 | Monthly-report PDF export was not confirmed in automated tests — check manually | Medium |
| O-6 | `GET /master/shops/{id}` returns all products — paginate or drop the products from it | Low |
| O-7 | Block creating a duplicate product name under another supplier in the UI as well | Low |
| O-8 | Seed categories (Neon `categories` is empty) and link products | Low |
| O-9 | FRD 13 §11.1 owner decisions: standard days 26/30, extra-day rate, holiday ×2, unrecorded = absent or block, managers see salaries?, pay period | Owner |

---

## 10. Suggested build order

1. **Config & common** (§2–§3): datasource, Jackson snake_case, JWT filter compatible with existing tokens, error handler, `Clock` (Asia/Phnom_Penh), `PageResponse`.
   - **Check:** an existing frontend login works against Spring.
2. **Read-only modules:** wallets, master (paged products), reports (items, daily-cashflow, monthly).
   - **Check:** frontend pages render with the same numbers as before.
3. **Write flows:** invoices (market trip, small expense, income, pay, void), transfers, counts, money requests, tables.
4. **Payroll:** staff → attendance → advances → preview → runs → pay → void, with the B-01…B-10 fixes.
5. **Seed profile** (§8) and integration tests:
   - Testcontainers Postgres;
   - one test per bug in §7 (e.g. *pay ignores client amount*, *unrecorded day returns null status*, *ids accepted as strings*).

**Smoke check after each step:**

```bash
TOKEN=$(curl -s -X POST localhost:5000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"…","password":"…"}' | jq -r .access_token)
curl -s -H "Authorization: Bearer $TOKEN" "localhost:5000/api/v1/master/products?supplier_id=6&page=1&limit=3" | jq '{total,page,limit,totalPages}'
curl -s -H "Authorization: Bearer $TOKEN" "localhost:5000/api/v1/reports/monthly?month=2026-09" | jq '.totals, (.payroll_runs|length)'
curl -s -H "Authorization: Bearer $TOKEN" "localhost:5000/api/v1/payroll/attendance?date=2026-10-01" | jq '[.attendance[] | {staff_name, status}]'
```
