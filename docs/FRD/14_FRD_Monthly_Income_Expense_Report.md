# FRD — Monthly Income & Expense Report (Brief by Day, with Utilities & Payroll)
## Document Ref: `BONCHI-FRD-14`

- **System:** Bonchi Restaurant Money App
- **Module:** Monthly brief report — daily totals, utilities, payroll, export (PDF / image)
- **Primary Actors:** Owner (reads, approves, exports), Manager (prepares — see §8)
- **Screen:** Reports → **ប្រចាំខែ** (Monthly) tab
- **Depends on:** [01 Dual Currency & RBAC](file:///d:/Bonchi%20System/docs/FRD/01_FRD_Dual_Currency_Engine_and_RBAC.md) · [05 Small Expense](file:///d:/Bonchi%20System/docs/FRD/05_FRD_Quick_Small_Expense_and_Keypad.md) · [09 Reports](file:///d:/Bonchi%20System/docs/FRD/09_FRD_Reports_and_Analytics.md) · [13 Payroll](file:///d:/Bonchi%20System/docs/FRD/13_FRD_Staff_Salary_and_Payroll_Management.md)
- **Backend build spec:** [SPRING_BOOT_BACKEND_SPEC.md §6.1](file:///d:/Bonchi%20System/docs/SPRING_BOOT_BACKEND_SPEC.md)

---

## 1. Feature Overview & Business Objectives

The daily reports (FRD 09 / 10) answer *"what did we buy today?"*. The owner also needs a one-page answer to *"did we make a profit or a loss this month, and how much?"*:

0. **Profit or loss for the month** (ចំណេញសុទ្ធ / ខាតសុទ្ធ) and the margin — the headline of the report.
1. How much came in and went out **each day** of the month.
2. Where the money went: **purchases**, **utilities** (electricity, water, internet, gas, rent…), **payroll**, other.
3. What the month's **salary** cost and when it was paid.
4. A printable, signed sheet that can be shared on Telegram or filed.

Before this module, salary showed up as "small expenses", utilities had no category at all, and there was no month view.

### 1.1 Scope
- One calendar month at a time (`YYYY-MM`); the current month runs up to today.
- Invoices count on the day they were recorded (`invoice_date`), voided invoices excluded; unpaid (owed) invoices are included.
- Payroll is the salary **for** the month, whenever paid (§4), so the profit carries the month's real staff cost.
- Read-only. Nothing is edited from this screen.

### 1.2 Out of scope
- Full accrual accounting (stock on hand, prepaid rent), tax, profit after depreciation.
- Custom date ranges (use the daily report's periods for those).
- Budget vs actual, and comparison with previous months — these are future candidates (§10).

---

## 2. Expense Buckets (Classification)

Every non-void invoice in the month falls into exactly **one** bucket:

| Bucket | Khmer label | Rule | Typical source |
| :--- | :--- | :--- | :--- |
| `income` | ចំណូល | `type = 'income'` | POS sales close, table income (Money In) |
| `purchase` | ទិញទំនិញ | `expense_kind = 'product'` | Market trip invoices (FRD 04) |
| `utility` | ទឹកភ្លើង & សេវា | expense with `category_name` in the **utility list** | Small expense (FRD 05) |
| `payroll` | ប្រាក់ខែ | `expense_kind = 'salary'` | Payroll payouts **and** salary advances (FRD 13). **Monthly report:** replaced by the salary for the month (§4) |
| `other` | ផ្សេងៗ | any other expense | Small expenses: ice, soap, moto-dop, charcoal… |

**Utility list:** ភ្លើង · អគ្គិសនី · ទឹក · ទឹកស្អាត · អ៊ីនធឺណិត · ទូរស័ព្ទ · ហ្គាស · ជួលផ្ទះ · សំរាម

- The list is one constant in the backend. Changing it re-classifies past months as well, because classification happens when the report is read.
- The small-expense category chips put the utilities first, so staff can record them: **ភ្លើង · ទឹក · អ៊ីនធឺណិត · ជួលផ្ទះ · ហ្គាស** · ទឹកកក · ក្រដាសអនាម័យ · សាប៊ូ · ម៉ូតូឌុប · ធ្យូង · ផ្សេងៗ.
- **ទឹកកក (ice)** is *not* a utility. It is matched exactly, so it never falls under "ទឹក".

---

## 3. Formulas

Per day *d*, and for the month, each currency is kept **separately** (FRD 01 — never add $ and ៛ together):

$$\text{Expense}_d = \text{Purchase}_d + \text{Other}_d$$
$$\text{Balance}_d = \text{Income}_d - \text{Expense}_d$$
$$\text{Expense}_{month} = \sum_{d \in \text{month}} \text{Expense}_d + \text{Utility}_{month} + \text{Payroll}_{month}$$
$$\text{Balance}_{month} = \text{Income}_{month} - \text{Expense}_{month}$$

**Monthly costs** are not put on a day: $\text{Utility}_{month}$ (rent, electricity, water, internet, phone, rubbish, gas — mostly paid once a month) and $\text{Payroll}_{month}$, the salary for the month (§4). On the day it was paid, rent alone would turn a normal day into a loss (1 Sep: −$447.40 with rent, +$387.60 without).
The daily summary (`/reports/daily-cashflow`) is unchanged: there, payroll is still the salary paid out that day.

For display only, amounts are converted with the reference rate $R$ (default **1 USD = 4,000 ៛**):

$$\text{in USD} = \text{USD} + \frac{\text{KHR}}{R} \qquad \text{in KHR} = \text{USD} \times R + \text{KHR}$$

Summary figures:

| Figure | Formula |
| :--- | :--- |
| Profit / loss | $\text{Balance}_{month}$: ≥ 0 → ចំណេញសុទ្ធ (profit), < 0 → ខាតសុទ្ធ (loss) |
| Margin | $\frac{\text{Balance}_{month}}{\text{Income}} \times 100\%$ (shown only when Income > 0) |
| Average income / day | $\frac{\text{Income}}{\text{days in report}}$ — days in report = whole month, or 1 → today for the current month |
| Days with income | count of days with at least one income invoice |
| Expense share | bucket total ÷ total expense (the coloured bar) |

### 3.1 Worked example — October 2026 (to 7 Oct, live data)

| | USD | KHR | Shown in $ (÷ 4,000) |
| :--- | ---: | ---: | ---: |
| Income | $3,275.00 | 5,040,000 ៛ | **$4,535.00** |
| Purchases | $255.00 | 90,000 ៛ | $277.50 |
| Utilities / Payroll / Other | — | — | $0.00 |
| **Expense** | $255.00 | 90,000 ៛ | **$277.50** |
| **Balance** | $3,020.00 | 4,950,000 ៛ | **$4,257.50** (93.9% of income) |

Average income per day = $4,535.00 ÷ 7 = **$647.86**. Days with income = 2.

---

## 4. Payroll = salary for the month (accrual)

Salary for a month is usually paid early the next month. The monthly report counts the salary **earned in the month**, whenever it is paid, so each month carries its own staff cost.

| Where | What it shows | Rule |
| :--- | :--- | :--- |
| **Totals, cards, expense bar** | Salary for the month, included in expense and balance | Sum over the month's runs |
| **§២ daily table** | Line **ប្រាក់ខែបុគ្គលិក** in the "monthly costs" block under the days (amount in the expense column, minus in the balance column). No daily payroll column | — |
| **§១ P&L table → ប្រាក់ខែ** | One sub-row per run: title · paid date (or "មិនទាន់បើក") · staff count · exact USD / KHR | — |

**Which runs:** not void (`draft` or `paid`), and `period_end` inside the month. A run is counted in exactly **one** month, even if its period crosses a month boundary. A draft run is included as the current estimate and labelled "មិនទាន់បើក".

**Amount per run (per currency):** earned = `gross + allowance + bonus − penalty`, summed over `payroll_items`. This is *not* the run's net: net = earned − advances − carried debt, and advances are salary for the same month.

**Salary invoices** (`expense_kind = 'salary'`: payouts and advances) are left out of the monthly day rows and totals, so nothing is counted twice. The sheet does not list them (there is no payroll section §៣); the API still returns them in `payroll`.

**Example:** run "បើកប្រាក់ខែប្រចាំខែ 09/2026" covers 1–30 Sep and was paid on 7 Oct ($1,214.00 + 1,287,500 ៛, 11 staff).
- **September report:** payroll = $1,214.00 + 1,287,500 ៛. Expense becomes $3,655.60 + 17,789,100 ៛ and balance $10,786.40 + 3,045,900 ៛ (≈ **$11,547.88**, was ≈ $13,083.75 without salary).
- **October report:** the payout invoices dated in October are not in October's expense.

> Rule (fixed during implementation): payroll invoices are dated on the **actual payment day**, not the planned payout date. Two invoices created before the fix (`#PAY-3-USD`, `#PAY-3-KHR`) still carry 2026-10-10 and need a one-time correction (§10, O-2). This now only affects the daily summary.

---

## 5. API Contract

### `GET /api/v1/reports/monthly?month=YYYY-MM`

| | |
| :--- | :--- |
| Auth | Bearer JWT (see §8 for roles) |
| `month` | Required format `YYYY-MM`. Defaults to the current month. Invalid → `400 { "error": "month must be YYYY-MM" }` |

**Date range:**
- `start` = first day of the month.
- `end` = last day of the month, or **today** (Asia/Phnom_Penh) for the current month.
- A future month returns its first day only, with zeros.

**Response 200**

```jsonc
{
  "month": "2026-10",
  "start": "2026-10-01",
  "end": "2026-10-07",
  "exchange_rate": 4000,
  "days": [
    {
      "date": "2026-10-06",
      "income_usd": 285, "income_khr": 0,
      "purchase_usd": 255, "purchase_khr": 90000,
      "utility_usd": 0, "utility_khr": 0,
      "payroll_usd": 0, "payroll_khr": 0,
      "other_usd": 0, "other_khr": 0,
      "expense_usd": 255, "expense_khr": 90000,
      "net_usd": 30, "net_khr": -90000,
      "income_count": 1, "expense_count": 2
    }
    // … one object for EVERY day start..end, zeros included
  ],
  "totals": { /* *_usd / *_khr summed over the days; payroll_* = salary for the month, included in expense_* and net_* */ },
  "categories": [
    { "grp": "income",   "category": "ចំណូលលក់", "count": 10, "usd": 3275, "khr": 5040000 },
    { "grp": "purchase", "category": "គ្រឿងផ្សំ",  "count": 2,  "usd": 255,  "khr": 90000 },
    { "grp": "payroll",  "category": "បើកប្រាក់ខែប្រចាំខែ 09/2026", "count": 11, "usd": 1214, "khr": 1287500,
      "run_id": 3, "status": "paid", "paid_on": "2026-10-07" }   // September report
  ],
  "payroll": [
    { "invoice_no": "#PAY-3-USD", "date": "2026-10-07", "description": "Staff Payroll - បើកប្រាក់ខែប្រចាំខែ 09/2026",
      "category": "បើកប្រាក់ខែបុគ្គលិក (Staff Salary)", "wallet_code": "aba", "usd": 1214, "khr": 0 }
  ],
  "payroll_runs": [
    { "id": 3, "title": "បើកប្រាក់ខែប្រចាំខែ 09/2026", "period_start": "2026-09-01", "period_end": "2026-09-30",
      "status": "paid", "paid_on": "2026-10-07", "net_usd": 1214, "net_khr": 1287500,
      "cost_usd": 1214, "cost_khr": 1287500, "staff_count": 11 }
  ]
}
```

**Rules**
- **Numbers:** every amount and count is a JSON **number**, never a string.
- **Totals:** USD rounded to 0.01; KHR in whole riel.
- **`days`:** `utility_*` and `payroll_*` are always 0; utility and salary invoices are not in `expense_*` / `net_*` (§3, §4). The keys stay so the shape matches `daily-cashflow`.
- **`totals`:** day sums, then `utility_*` = Σ utility `categories`, `payroll_*` = Σ `payroll_runs[].cost_*`; both added to `expense_*` and subtracted from `net_*`.
- **`categories`:**
  - Grouped by (bucket, `category_name`); an empty category becomes `Other` (shown as ផ្សេងៗ).
  - Ordered by bucket, then value descending (value = usd × R + khr).
  - Each non-payroll row has `first_date` / `last_date` (first and last invoice date in the month), used to show when a bill was paid.
  - Salary invoices are not grouped here. Payroll rows are one per run instead: `count` = staff, amounts = `cost_*`, plus `run_id`, `status`, `paid_on`.
- **`payroll`:** `expense_kind = 'salary'` invoices dated in the range, ordered by date. Listed only.
- **`payroll_runs`:**
  - Runs with `period_end` in the month, not voided.
  - `cost_*` = earned (`gross + allowance + bonus − penalty`) per currency; `net_*` = paid out.
  - `paid_on` = `paid_at` as a Phnom Penh date, or `null`.
- **Freshness:** the response is computed on every request. Clients refresh it after any invoice, payroll or advance change (the frontend invalidates the `monthly-report` query).

The same buckets feed `GET /reports/daily-cashflow` (the daily summary). That endpoint gained `utility_*` and `payroll_*`; its `other_*` no longer includes salary.

---

## 6. UI / UX

### 6.1 Screen — Reports → ប្រចាំខែ

```
[ ប្រចាំថ្ងៃ | ប្រចាំខែ ]                                   ← mode switch (Reports page)

 ‹  ខែតុលា 2026  ›  [ខែនេះ]            [ $ | ៛ ]  [📷 រូបភាព]  [⬇ ទាញយក PDF]
┌──────────────────────────────────────────────────────────────────────────┐
│  (the A4 report sheet below, scaled to fit the screen — what you see    │
│   is exactly what gets exported)                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Month navigation:** ‹ › change month; › is disabled on the current month; **ខែនេះ** jumps back.
- **$ / ៛ toggle:** sets the display currency of the daily table and summary cards. Exact per-currency amounts stay in the category table.
- **Preview:** the sheet is scaled to the panel width. A separate full-size copy is used for export, because the PDF page splitter measures real sizes.
- **Fonts:** the screen preview loads the same embedded fonts as the export (Kantumruy Pro, Moul).

### 6.2 Report sheet layout (A4 portrait, 880 px design width)

```
ភោជនីយដ្ឋាន Bonchi                                    ថ្ងៃបោះពុម្ព: 07/10/2026
BONCHI RESTAURANT · របាយការណ៍ប្រចាំខែ                តួលេខគិតជា ដុល្លារ ($) · 1$ = 4,000៛
═══════════════════════════════════════════════════════════════════════════
                 របាយការណ៍ចំណេញ-ខាតប្រចាំខែ            (Moul)
                 MONTHLY PROFIT & LOSS REPORT
                 ខែកញ្ញា ឆ្នាំ 2026

┌ ចំណូលសរុប ─┐ ┌ ចំណាយសរុប ─┐ ┌ ចំណេញសុទ្ធ (Net profit) ┐ ┌ មធ្យមចំណូល/ថ្ងៃ ┐
│ $19,650.75  │ │ $8,102.88   │ │ $11,547.88   (green box)  │ │ $655.03          │
│ 30 ថ្ងៃមានចំណូល│ │             │ │ 58.8% នៃចំណូល             │ │ 30 ថ្ងៃ           │
└─────────────┘ └─────────────┘ └──────────────────────────┘ └──────────────────┘
  (a loss shows "ខាតសុទ្ធ (Net loss)" in a red box, with a minus sign)
┌ ⚠ មិនទាន់កាត់ប្រាក់ខែបុគ្គលិក … ចំណេញពិតនឹងតិចជាងនេះ។   ← only when there is no run    ┐
│ ⚠ មិនទាន់មានចំណាយទឹកភ្លើង & សេវា … ក្នុងខែនេះ …           ← only when no utility at all │
│ ⚠ ប្រាក់ខែជាតួលេខព្រាង (មិនទាន់បើក) …                    ← only when a run is a draft  │
└ ⚠ ខែមិនទាន់ចប់ — តួលេខគិតត្រឹមថ្ងៃទី …                    ← only for the current month  ┘
████████████████████████████████  ← expense share bar
■ ទិញទំនិញ $4,879.00 (60%)  ■ ទឹកភ្លើង & សេវា $1,390.75 (17%)  ■ ប្រាក់ខែ $1,535.88 (19%)  ■ ផ្សេងៗ $297.25 (4%)

▌១. តារាងចំណេញ-ខាត  Profit & loss · ចំនួនពិតតាមរូបិយប័ណ្ណ
  ប្រភេទ                          ចំនួន   ដុល្លារ ($)    រៀល (៛)        សរុប ≈ $
  ■ ចំណូល Income                    60   $14,442.00   20,835,000 ៛   $19,650.75
  ដក ចំណាយ Less: expenses
  ■ ទិញទំនិញ Purchases                87    $1,406.60   13,889,600 ៛    $4,879.00
  ■ ទឹកភ្លើង & សេវា Utilities           14      $997.00    1,575,000 ៛    $1,390.75
      ជួលផ្ទះ / ភ្លើង / ហ្គាស / …   (sub-rows when a bucket has more than one category)
  ■ ប្រាក់ខែ Payroll                   —    $1,214.00    1,287,500 ៛    $1,535.88
      បើកប្រាក់ខែប្រចាំខែ 09/2026 · បានបើក 07/10/2026   11 នាក់   (one sub-row per run)
  ■ ផ្សេងៗ Other                      54       $38.00    1,037,000 ៛      $297.25
  ចំណាយសរុប Total expenses                 $3,655.60   17,789,100 ៛    $8,102.88
  ចំណេញសុទ្ធ Net profit · 58.8% នៃចំណូល    $10,786.40    3,045,900 ៛   $11,547.88   ← green row (red "ខាតសុទ្ធ" for a loss)
  * «ប្រាក់ខែ» = ប្រាក់ខែដែលបុគ្គលិករកបានសម្រាប់ខែនេះ (តាមតារាងប្រាក់ខែ) ទោះបីបើកនៅខែបន្ទាប់ក៏ដោយ។
  * ចំណាយរួមទាំងវិក្កយបត្រដែលមិនទាន់បង់ (ជំពាក់)។ ចំណេញ-ខាតដុល្លារ និងរៀល ត្រូវមើលរួមគ្នា …

▌២. សង្ខេបប្រចាំថ្ងៃ  Daily summary · ដុល្លារ ($)
┌──────┬──────────┬──────────┬────────┬───────────┬────────────┐
│ ថ្ងៃ  │ ចំណូល    │ ទិញទំនិញ  │ ផ្សេងៗ  │ ចំណាយ     │ សមតុល្យ     │
├──────┼──────────┼──────────┼────────┼───────────┼────────────┤
│ 01 អ │  $527.00 │  $122.65 │ $16.75 │   $139.40 │    $387.60 │
│ …    │          │          │        │           │            │
├──────┼──────────┼──────────┼────────┼───────────┼────────────┤
│សរុបប្រចាំថ្ងៃ│$19,650.75│ $4,879.00│$297.25 │ $5,176.25 │ $14,474.50 │
├──────┴──────────┴──────────┴────────┴───────────┴────────────┤
│ ដក ចំណាយប្រចាំខែ Monthly costs · បង់ម្តងក្នុងមួយខែ មិនបែងចែកតាមថ្ងៃ    │
│   ■ ជួលផ្ទះ · បង់ថ្ងៃ 01/09                       │   $800.00 │   -$800.00 │
│   ■ ភ្លើង · បង់ថ្ងៃ 05/09                         │   $337.50 │   -$337.50 │
│   ■ ហ្គាស · 8 ដង (02/09 – 30/09)                 │   $152.00 │   -$152.00 │
│   ■ ទឹក / អ៊ីនធឺណិត / ទូរស័ព្ទ / សំរាម …            │      …    │      …     │
│   ■ ប្រាក់ខែបុគ្គលិក · 11 នាក់ · បើកថ្ងៃ 07/10        │ $1,535.88 │ -$1,535.88 │
├─────────────────────────────────────────────┼───────────┼────────────┤
│ សរុបខែ · ចំណេញសុទ្ធ                             │ $8,102.88 │ $11,547.88 │
└─────────────────────────────────────────────┴───────────┴────────────┘
  (no utility yet: one line "ទឹកភ្លើង & សេវា · មិនទាន់មានកត់ត្រាក្នុងខែនេះ" with "—";
   no run yet: the payroll line reads "មិនទាន់មានតារាងប្រាក់ខែ" with "—")

        បានឃើញ និងឯកភាព                         ថ្ងៃទី 07 ខែតុលា ឆ្នាំ 2026
        ម្ចាស់ភោជនីយដ្ឋាន                                  អ្នករៀបចំ
        ..............................                     Somnang
```

**Layout rules**
- **One number per cell** in the daily table (display currency). Days with no activity are greyed, with "—".
- **Day column:** day number + short Khmer weekday (អា ច អ ពុ ព្រ សុ ស), Sunday in red.
- **Rows shown:** every day of the month, or up to today for the current month. No future rows.
- **Profit or loss first:** the result card and the P&L table come before the daily detail. The label follows the sign: **ចំណេញសុទ្ធ (Net profit)** in green, or **ខាតសុទ្ធ (Net loss)** in red with a minus sign.
- **Warnings** above the bar say when the result is not final: no payroll run yet, a draft run, no utility recorded, or the month is not over.
- **Monthly costs block** under the days: a "សរុបប្រចាំថ្ងៃ" subtotal, then each utility category with the day it was paid ("បង់ថ្ងៃ 05/09", or "8 ដង (02/09 – 30/09)" when paid several times), then payroll, then "សរុបខែ" with the month's profit or loss. The block never splits across pages.
- **Totals row** under the daily table; its balance equals the month's profit or loss.
- **P&L table** shows exact USD and KHR side by side, plus a converted total, so nothing is lost by the conversion.
- **Visual style:** the shared report design (FRD 10 / daily list) — Moul titles, dark outer frame with a light inner grid, light-green header row, Cambodian signature block (owner left, preparer right with date).

### 6.3 Export
- **PDF:** A4 portrait, 10 mm margins, about 350 dpi raster.
  - Pages break only between table rows or whole blocks.
  - The daily table header repeats on each new page.
  - Footer: `ភោជនីយដ្ឋាន Bonchi · របាយការណ៍ខែ… · ទំព័រ x / y`.
- **Image (PNG):** the full sheet, for Telegram.
- **File name:** `bonchi-monthly-report-YYYY-MM.pdf` / `.png`.
- **Pipeline:** same as the daily list (`lib/exportReport.ts`). Fonts are downloaded and embedded, so Khmer renders correctly, and Safari uses the lower canvas limit.

---

## 7. Edge Cases & Validation

| # | Case | Expected behaviour |
| :--- | :--- | :--- |
| 1 | Month with no invoices | All rows "—", totals 0, margin hidden, payroll line "—" with "មិនទាន់មានតារាងប្រាក់ខែ" |
| 2 | Current month | Range ends today; title shows "(ដល់ថ្ងៃទី …)" |
| 3 | Future month | › disabled in UI; API returns the first day only, with zeros |
| 4 | Negative day or month balance | Red with "-" |
| 5 | Voided invoice | Excluded everywhere |
| 6 | Salary run for the month paid next month | Counted in the month it is for (payroll line, P&L sub-row with paid date). In the next month its payout invoices are not counted |
| 7 | Advance given during the month | Not in expense on its own; it is part of the run's earned salary |
| 8 | Small expense with no category | Bucket `other`, category `ផ្សេងៗ` |
| 9 | Typo in a utility category (e.g. "ភ្លេីង") | Lands in `other` — use the chips; extend the utility list if needed |
| 10 | Mixed currencies in one bucket | Category table shows both; daily table converts at R |
| 11 | Invalid `month` (`2026-13`, `abc`) | 400 `month must be YYYY-MM` |
| 12 | Very active month (~31 rows + categories) | 2 PDF pages; header repeats; signatures never split |
| 13 | No payroll run yet (e.g. current month) | Payroll line shows "—" and "មិនទាន់មានតារាងប្រាក់ខែ"; the balance is before salary |
| 14 | Run period crosses months (e.g. 16 Sep – 15 Oct) | Counted once, in the month of `period_end` (October) |
| 15 | Draft run | Included as the estimate, labelled "មិនទាន់បើក" |

---

## 8. Access Control

| Action | Owner | Manager | Staff |
| :--- | :---: | :---: | :---: |
| View monthly report | ✅ | ⚠️ decision needed | ❌ |
| Export PDF / image | ✅ | ⚠️ same as view | ❌ |

The report shows the restaurant's balance (profit). FRD 01 says managers **cannot view owner profit reports**. Until the owner decides otherwise:
- `GET /reports/monthly` should be **owner-only** (403 for others);
- the ប្រចាំខែ tab should be hidden for managers.

> **Current state:** the frontend shows the tab to everyone who can open Reports, and the old backend did not restrict the endpoint. The Spring backend must apply the rule.

---

## 9. Implementation Status

| Part | Status | Location |
| :--- | :--- | :--- |
| Report screen, sheet, PDF / image export | ✅ built (frontend) | `frontend/src/components/reports/MonthlyReport.tsx`, `MonthlySheet.tsx` |
| Mode switch on Reports page | ✅ built | `frontend/src/app/(dashboard)/reports/page.tsx` |
| Hook + types | ✅ built | `frontend/src/hooks/useReports.ts` (`useMonthlyReport`, `MonthlyReportResponse`) |
| Utility chips in small expense | ✅ built | `frontend/src/components/SmallExpenseModal.tsx` |
| Refresh after invoice / payroll changes | ✅ built | `useInvoices.ts`, `usePayroll.ts` invalidate `monthly-report` |
| `GET /reports/monthly` (owner only) + `GET /reports/daily-cashflow` with the 5 buckets | ✅ built in Spring Boot, verified against live data | `backend/src/main/java/com/bonchi/service/ReportService.java`, `controller/ReportController.java` |
| Monthly tab hidden for non-owners | ✅ built | `frontend/src/app/(dashboard)/reports/page.tsx` |
| Payroll = salary for the month (runs ending in the month, earned amount); salary invoices out of the monthly totals | ✅ built, verified on Sept 2026 data (balance ≈ $11,547.88) | `ReportService.getMonthlyReport`, `ReportRepository.getPayrollRuns`, `MonthlySheet.tsx` |
| Payroll payouts create salary invoices dated on the payment day | ⚠️ **not yet** — the Spring `payRun` deducts the wallet but creates no invoice, so new payouts don't reach the daily summary | FRD 13 / [SPRING_BOOT_BACKEND_SPEC.md §6.3.6](file:///d:/Bonchi%20System/docs/SPRING_BOOT_BACKEND_SPEC.md) |
| Verified with live data | ✅ screen rendering (Oct 2026 figures in §3.1) · ⚠️ PDF export not confirmed by automated test | — |

---

## 10. Open Items & Future Candidates

| ID | Item | Priority |
| :--- | :--- | :--- |
| O-1 | Restrict the report to the owner (backend + hide tab) per §8, or record the owner's decision | High |
| O-2 | Correct the dates of `#PAY-3-USD` / `#PAY-3-KHR` from 2026-10-10 to 2026-10-07 (one-time, owner approval) | Medium |
| O-3 | Confirm PDF export manually on desktop Chrome and on an iPhone | Medium |
| O-4 | Make the utility list configurable (Settings) instead of a code constant | Low |
| O-5 | Compare with the previous month (Δ income, Δ expense, Δ balance) | Future |
| O-6 | Monthly budget per bucket with over-budget highlight | Future |
| O-7 | Seed the `categories` table and link small expenses to category ids, instead of matching names | Future |

---

## 11. Acceptance Criteria

0. The top of the sheet says whether the month made a **profit or a loss**, how much, and the margin; it warns when payroll is missing or a draft, or the month is not over.
1. Opening Reports → ប្រចាំខែ shows the current month: the P&L table, then one row per day up to today with income, purchases, utilities, other, expense and balance, then one payroll line and the totals.
2. Recording a small expense with category **ភ្លើង** makes it appear in the P&L table under ទឹកភ្លើង & សេវា → ភ្លើង, and in the monthly costs block as "ភ្លើង · បង់ថ្ងៃ dd/mm" — not on that day's row.
3. A payroll run for September counts in September's payroll (totals, payroll line, P&L sub-row with its paid date), whenever it is paid. Its payout invoices never add to any month's expense in this report.
4. Daily-table totals plus the payroll line equal the P&L-table totals converted at the same rate (USD + KHR ÷ R).
5. Switching $ ↔ ៛ changes every converted figure but not the exact USD / KHR columns.
6. The exported PDF matches the screen, fits A4, repeats the daily-table header on page 2, and keeps the signatures together.
7. `GET /reports/monthly?month=2026-13` returns 400. A manager calling it gets 403 (once O-1 is applied).
