# FRD — Reports & Multi-Period Financial Analytics
## Document Ref: `BONCHI-FRD-09`

- **System:** Bonchi Restaurant Money App
- **Module:** Periodic Analytics & Spending Aggregation
- **Prototype Screen:** Screen 8 — `8 · របាយការណ៍ Reports` (`8_Reports_unbundled.html`)
- **Companion PRD:** [Bonchi_Restaurant_Money_App_PRD.md](file:///d:/Bonchi%20System/docs/Bonchi_Restaurant_Money_App_PRD.md#feature-9-management-reports--multi-period-analytics)

---

## 1. Feature Overview & Objectives
Restaurant owners require instant clarity on total expenditure, outstanding supplier debts (accounts payable), and settlement channels (Cash vs QR) across daily, weekly, and monthly time horizons without running manual Excel formulas.

---

## 2. UI/UX Wireframe & Component Layout

```mermaid
graph TD
    Screen[Reports Screen: 390x844px]
    Screen --> Header[AppHeader: 'របាយការណ៍' + 'ចំណាយ · {periodLabel}']
    Screen --> PeriodChips[Horizontal Period Chips: ថ្ងៃនេះ, ម្សិលមិញ, សប្តាហ៍នេះ, ខែនេះ]
    Screen --> TotalSpend[DualTotal: Total Spend in USD & KHR]
    Screen --> OweCard[Still to Pay Amber Card: Unpaid USD & KHR + Vendor Notes]
    Screen --> MethodCard[Settlement Breakdown: Paid, Paid by QR, Paid by Cash]
    Screen --> PreviewLink[Report Card Preview Banner: 'មើលរូបភាពរបាយការណ៍']
    Screen --> ActionDock[Export Buttons: Send Telegram, Save PNG, Download Excel]
    Screen --> Nav[BottomNav: Owner Tab Bar with Reports Active]
```

---

## 3. Data Aggregation & Filter Specifications

```javascript
// Prototype Aggregation Dataset
var DATA = {
  today: {
    label: 'ថ្ងៃនេះ',
    long: 'ច័ន្ទ 5 តុលា',
    usd: 947.6,
    khr: 2562800,
    oweUsd: '$135.00',
    oweKhr: '192,000 ៛',
    oweNote: 'ជំពាក់ 2 ហាង៖ ហាងទឹកកក សុខលី · ហាងភេសជ្ជៈ ដារ៉ា',
    paid: '$812.60 · 2,370,800 ៛',
    qr: '$812.60 · 2,280,800 ៛',
    cash: '$0.00 · 90,000 ៛'
  },
  yesterday: {
    label: 'ម្សិលមិញ',
    long: 'អាទិត្យ 4 តុលា',
    usd: 612.25,
    khr: 1840000,
    oweUsd: '$0.00',
    oweKhr: '0 ៛',
    oweNote: 'បានបង់គ្រប់ហាងហើយ',
    paid: '$612.25 · 1,840,000 ៛',
    qr: '$540.25 · 1,600,000 ៛',
    cash: '$72.00 · 240,000 ៛'
  },
  week: {
    label: 'សប្តាហ៍នេះ',
    long: '29 កញ្ញា – 5 តុលា',
    usd: 4310.4,
    khr: 12450000,
    oweUsd: '$135.00',
    oweKhr: '192,000 ៛',
    oweNote: 'ជំពាក់ 2 ហាង',
    paid: '$4,175.40 · 12,258,000 ៛',
    qr: '$3,820.40 · 10,900,000 ៛',
    cash: '$355.00 · 1,358,000 ៛'
  },
  month: {
    label: 'ខែនេះ',
    long: 'តុលា 2026',
    usd: 4310.4,
    khr: 12450000,
    oweUsd: '$135.00',
    oweKhr: '192,000 ៛',
    oweNote: 'ជំពាក់ 2 ហាង',
    paid: '$4,175.40 · 12,258,000 ៛',
    qr: '$3,820.40 · 10,900,000 ៛',
    cash: '$355.00 · 1,358,000 ៛'
  }
};
```

### 3.1 Aggregation SQL Formulas
1. **Total Spend ($C$):**
   ```sql
   SELECT SUM(total_usd) AS usd, SUM(total_khr) AS khr
   FROM invoices
   WHERE status <> 'void' AND invoice_date BETWEEN :start_date AND :end_date;
   ```
2. **Paid by Channel:**
   ```sql
   SELECT p.method, p.currency, SUM(p.amount)
   FROM invoice_payments p
   JOIN invoices i ON p.invoice_id = i.id
   WHERE i.status <> 'void' AND i.invoice_date BETWEEN :start_date AND :end_date
   GROUP BY p.method, p.currency;
   ```
3. **Accounts Payable (Still to Pay):**
   Calculated as the difference between total invoice amounts and recorded payments for invoices with status `partial` or `unpaid`.

---

## 4. API Specification

### `GET /api/v1/reports/summary?period=today`
- **Access:** Owner, Manager
- **Response `200 OK`:**
```json
{
  "period": "today",
  "label": "ច័ន្ទ 5 តុលា 2026",
  "total_spend": { "usd": 947.60, "khr": 2562800 },
  "paid": { "usd": 812.60, "khr": 2370800 },
  "still_to_pay": {
    "usd": 135.00,
    "khr": 192000,
    "unpaid_shops": [
      { "supplier": "ហាងទឹកកក សុខលី", "owed_khr": 192000, "owed_usd": 0.00 },
      { "supplier": "ហាងភេសជ្ជៈ ដារ៉ា", "owed_khr": 0, "owed_usd": 135.00 }
    ]
  },
  "payment_methods": {
    "qr": { "usd": 812.60, "khr": 2280800 },
    "cash": { "usd": 0.00, "khr": 90000 }
  }
}
```
