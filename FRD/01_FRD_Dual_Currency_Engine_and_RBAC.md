# FRD — Dual-Currency Engine & Role-Based Access Control (RBAC)
## Document Ref: `BONCHI-FRD-01`

- **System:** Bonchi Restaurant Money App
- **Module:** Dual-Currency Core Rules & Security/Permissions
- **Prototype Mapping:** Root App logic, `role` parameter (`owner` vs `staff`), theme switcher (`light` vs `dark`)
- **Companion PRD:** [Bonchi_Restaurant_Money_App_PRD.md](file:///d:/Bonchi%20System/Bonchi_Restaurant_Money_App_PRD.md#2-user-personas--permissions-matrix-rbac)

---

## 1. Dual-Currency Specifications

### 1.1 Strict Segregation Rule
The system strictly operates with two distinct currency registers:
- **USD ($):** Displayed with dollar prefix and 2 decimal points: `$47.00`. Stored as `DECIMAL(12,2)`.
- **KHR (៛):** Displayed with comma thousands separator and riel suffix: `55,000 ៛`. Stored as `DECIMAL(14,0)` integer.

### 1.2 Prototype Formatting Logic (JavaScript Specification)
```javascript
function fmt(n, cur) {
  n = Number(n) || 0;
  if (cur === 'KHR') {
    return Math.round(n).toLocaleString('en-US') + ' ៛';
  }
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function both(usd, khr) {
  var parts = [];
  if (usd) parts.push(fmt(usd, 'USD'));
  if (khr) parts.push(fmt(khr, 'KHR'));
  return parts.length ? parts.join(' + ') : '—';
}
```

### 1.3 View-Only Valuation Engine
When an owner requests an approximate total balance or spend, the client/server dynamically calculates:
$$\text{Total}_{\text{KHR Equivalent}} = \text{Amount}_{\text{KHR}} + (\text{Amount}_{\text{USD}} \times \text{Rate}_{\text{Reference}})$$
- **Default Reference Rate:** `1 USD = 4,000 KHR` (Owner configurable).
- **Compliance Requirement:** All UI displays using this formula MUST append the disclaimer:
  *"សម្រាប់មើលប៉ុណ្ណោះ · view only, not stored"*.
- The resulting calculation is NEVER stored in database tables.

---

## 2. Role-Based Access Control (RBAC)

### 2.1 Role Definitions
1. **`owner` (ម្ចាស់):** Primary proprietor. Unrestricted visibility and mutation rights across all tables, reports, settings, and audits.
2. **`manager` (អ្នកគ្រប់គ្រង):** Shift supervisor. Can view daily operations, record expenses/income/transfers, request money advances, and edit/void own transactions within 24 hours. Cannot view restaurant bank balances or owner profit reports.
3. **`staff` (បុគ្គលិក):** Field cashier or purchasing staff. Fast mobile entry at markets and counters. Can only view assigned operational wallet (Petty Cash/Advance), perform blind cash count at close, and view personal transactions.

### 2.2 Route & UI Authorization Matrix

| Functional Resource | Owner | Manager | Staff | Unauthorized Response |
| :--- | :---: | :---: | :---: | :--- |
| `GET /api/v1/wallets` | All wallets | Drawer + Petty | Assigned Petty only | HTTP 403 Forbidden |
| `GET /api/v1/reports/profit-loss` | Full | Denied | Denied | HTTP 403 Forbidden |
| `POST /api/v1/invoices/:id/void` | Any time | Same-day only | Denied | HTTP 403 Forbidden |
| `POST /api/v1/transfers` | Any wallet | Operational only | Denied | HTTP 403 Forbidden |
| `POST /api/v1/money-requests/:id/approve` | Full | Denied | Denied | HTTP 403 Forbidden |
| `POST /api/v1/wallet-counts` | Verify | Conduct | Conduct (Blind) | HTTP 403 Forbidden |

### 2.3 Frontend RBAC Adaptation (Prototype Logic)
```javascript
class Component extends DCLogic {
  renderVals() {
    const role = this.props.role ?? 'owner';
    return {
      themeClass: (this.props.theme ?? 'light') === 'dark' ? 't-dark' : 't-light',
      isOwner: role === 'owner',
      isManager: role === 'manager',
      isStaff: role === 'staff',
      roleLabel: role === 'owner' ? 'ម្ចាស់' : (role === 'manager' ? 'អ្នកគ្រប់គ្រង' : 'បុគ្គលិក')
    };
  }
}
```
