# Restaurant Income & Expense Tracker — PRD

Oct 5, 2026 · @Somnang Pho

## Overview

The app records every dollar and riel the restaurant earns or spends, shows where money sits right now, and replaces the current Excel sheet.

**Problem.** Purchases are recorded in Excel today. One invoice often mixes USD and KHR items, money moves through many places (cash drawer, petty cash, bank, staff pockets), and managers request cash for staff tips and repairs. Excel makes it hard to keep totals right, see wallet balances, or know who received what.

**Goals**

- Record every invoice with its items, in USD and KHR kept separate.
- Know the balance of every wallet, in each currency, at any time.
- Catch cash differences the same day through a daily count.
- Track manager money requests from approval to who received the money.
- Give the owner daily and monthly reports per category, supplier and wallet.

**Non-goals for the first version**

- Combining USD and KHR into one total (only an optional view-only rate on reports).
- Stock or inventory counts, POS integration, payroll and tax filing.
- Supporting several restaurants in one system.

## Users and roles

Three roles cover the restaurant; only the owner can edit history or approve money.

| Permission | Owner | Manager | Staff |
| --- | --- | --- | --- |
| Add invoices and items | Yes | Yes | Yes |
| Edit or void invoices | Yes | Own, same day | No |
| Record transfers between wallets | Yes | Yes | No |
| Daily cash count | Yes | Yes | Yes |
| Create money requests | Yes | Yes | No |
| Approve or reject requests | Yes | No | No |
| See reports and all wallet balances | Yes | Limited | No |
| Manage categories, suppliers, wallets, users | Yes | No | No |

Staff mainly use a phone at the market or counter, so entry must be fast on mobile.

## Key concepts

Every money movement is one of three kinds: income, expense, or a transfer between the restaurant's own wallets.

| Concept | Meaning | Example |
| --- | --- | --- |
| Invoice | One income or expense event, with one or more items | Market trip on 5 Oct |
| Invoice item | One line on an invoice, with its own currency | Chicken 10 kg × $3.50 |
| Currency | USD or KHR, never converted or added together | $47.00 + 55,000 ៛ |
| Wallet | A place money sits, with a USD and a KHR balance | Cash drawer, Petty cash, ABA |
| Transfer | Money moved between wallets; not income or expense | $100 Cash drawer → Petty cash |
| Daily count | Real cash counted and compared with the system balance | Drawer short $5 |
| Money request | A manager asks for cash, owner approves, manager reports how it was used | $50 for staff tips |
| Category | Groups income and expenses for reports | Ingredients, Repair, Staff bonus |

**Two kinds of expense.** Every expense is either a product purchase or a small expense, so stock buying and daily small spending are reported apart.

|  | Product purchase | Small expense |
| --- | --- | --- |
| What | Ingredients and goods for the menu | Small things used day to day |
| Examples | Chicken, rice, cooking oil, drinks | Ice, tissues, soap, gas refill, motodop fare |
| Entry | Supplier + item lines (product, qty, unit, price, currency) | One line: description, amount, currency, wallet |
| Supplier | Required | Optional |
| Usual wallet | Petty cash, bank, supplier credit | Petty cash, Staff advance |
| Reports | Supplier spend, product price history | Small expense total per day and month |

**Wallets at launch:** Cash drawer, Petty cash, bank and e-wallet accounts (one per account), delivery apps, Owner, Staff advance, Manager advance, and Tips (customer tips held for staff).

**Expense categories at launch**

| Group | Categories |
| --- | --- |
| Food & drink | Ingredients, Drinks, Ice, Gas |
| Staff | Salary, Bonus / tips, Staff meals |
| Operations | Rent, Electricity, Water, Internet |
| Repair & maintenance | Kitchen equipment, Building, Furniture, Air conditioner |
| Other | Marketing, Delivery fees, Supplies, Other |

## Functional requirements

Seven modules make up the product; the first four are needed for launch.

**1. Invoices (income and expense)**

- Create an invoice with date, type, supplier, wallet, category, note and receipt photo. For expenses, choose Product purchase or Small expense; small expenses use a quick one-line form without items or supplier.
- Add any number of items, each with product, quantity, unit, unit price and currency (USD or KHR).
- Show the USD total and KHR total separately as items are typed.
- Status: unpaid, partial, paid, void. Voiding needs a reason; nothing is hard-deleted.
- Search and filter by date, supplier, category, wallet, product and status.

**2. Payments**

- Record one or more payments per invoice, each with wallet, currency and amount.
- An invoice is paid when USD paid covers the USD total and KHR paid covers the KHR total.
- When a KHR item is paid in USD (or the reverse), store the rate used on that payment only.

**3. Wallets and transfers**

- Owner creates wallets with an opening balance per currency.
- Record transfers between wallets with currency, amount and note.
- Show each wallet's live balance in USD and KHR.

**4. Daily cash count**

- Staff enter the counted cash per wallet and currency at closing.
- The system shows system balance, counted amount and difference, and saves who counted.
- Differences above a set amount notify the owner.

**5. Money requests**

- Manager requests an amount, currency, category and reason.
- Owner approves or rejects; approval records a transfer to Manager advance.
- Manager records each distribution (staff name, amount) as an expense, and returns any leftover.
- Request status: pending, approved, rejected, settled.

**6. Master data**

- Manage categories, suppliers, products (name, default unit, category), wallets and users.
- Products are picked from a list to avoid spelling differences.

**7. Reports and export**

- See the Reports section; every report exports to Excel.
- Import the existing Excel item sheet once at launch.

## Key user flows

Four flows cover daily work; the money request is the only one with an approval step.

**Record a purchase invoice**

1. Tap New expense, pick supplier and category.
2. Add items: product, quantity, unit, price, and USD or KHR per item.
3. Check the USD total and KHR total against the paper invoice.
4. Add payment: wallet and amount per currency (or leave unpaid).
5. Attach the receipt photo and save.

**Move money between wallets**

1. Tap Transfer, pick from and to wallet.
2. Enter currency and amount, add a note, save.

**Daily cash count**

1. At closing, open Daily count for each cash wallet.
2. Enter counted USD and KHR.
3. Review differences and add a note for any gap.

**Manager money request (for example, staff tips)**

&#91;embedded content: manager money request · 6 steps, 1 decision\]

Approval moves cash into Manager advance; each payment to staff is an expense, and the request settles once the balance returns to zero.

## Data model

Thirteen tables hold everything; currency lives on each item, payment and transfer, never as a combined total.

```sql
users                (id, name, phone, role, is_active)
categories           (id, name, type, parent_id)          -- type: income / expense
suppliers            (id, name, phone, note)
products             (id, name, default_unit, category_id)
wallets              (id, name, type, opening_usd, opening_khr, is_active)

invoices             (id, invoice_no, date, type, expense_kind, supplier_id, category_id,
                      total_usd, total_khr, status, void_reason,
                      note, receipt_url, created_by, created_at)
invoice_items        (id, invoice_id, product_id, quantity, unit,
                      unit_price, currency, line_total)
invoice_payments     (id, invoice_id, wallet_id, amount, currency,
                      exchange_rate, paid_at, created_by)   -- rate only when paying across currencies

transfers            (id, date, from_wallet_id, to_wallet_id, amount,
                      currency, note, request_id, created_by)
wallet_counts        (id, wallet_id, currency, date, system_amount,
                      counted_amount, difference, counted_by)

money_requests       (id, requested_by, amount, currency, category_id, reason,
                      status, approved_by, approved_at, created_at)
request_distributions(id, request_id, staff_name, amount, currency,
                      given_at, note)

audit_log            (id, table_name, record_id, action, old_value,
                      new_value, user_id, created_at)
```

expense\_kind is product or small (empty for income). Money columns use DECIMAL: USD with 2 decimals, KHR with 0 decimals.

**Wallet balance (per currency)** = opening + payments received + transfers in − payments made − transfers out.

## Reports

Every report shows USD and KHR in two separate columns and exports to Excel.

| Report | Shows | Main user |
| --- | --- | --- |
| Daily summary | Income, expense and profit for the day; cash count differences | Owner, Manager |
| Monthly profit | Income, expense and profit per month, per currency | Owner |
| Expense by category | Spend per category and sub-category for any period | Owner |
| Wallet balances | Live USD and KHR balance of every wallet | Owner |
| Wallet movement | All payments and transfers in and out of one wallet | Owner, Manager |
| Supplier spend | Total bought and unpaid amount per supplier | Owner |
| Product price history | Unit price of a product over time, per currency | Owner |
| Money requests | Requests by status, amount and who received money | Owner |
| Repairs | Repair spend per item or machine | Owner |
| Tips | Tips held and paid out per staff member | Owner |

Example of the monthly profit layout:

|  | USD | KHR |
| --- | --- | --- |
| Income | $1,250.00 | 3,400,000 ៛ |
| Expense | $820.00 | 1,950,000 ៛ |
| **Profit** | **$430.00** | **1,450,000 ៛** |

An optional rate field on the report screen shows a combined figure for viewing only; it never changes stored data.

## Business rules and non-functional requirements

Money records are never deleted, never mixed across currencies, and every change is logged.

**Business rules**

1. USD and KHR are stored and totalled separately; no automatic conversion.
2. Transfers never count as income or expense, so profit reports exclude them.
3. Invoices are voided with a reason, never deleted; voided invoices drop out of totals.
4. Customer tips go into the Tips wallet as transfers, not income.
5. Money given to a manager stays in Manager advance until distributions and returns settle it.
6. Staff who pay with their own money record the expense from Staff advance; repayment is a transfer.
7. KHR amounts are whole numbers; USD amounts have 2 decimals.
8. A small leftover from cross-currency payments (set by the owner) counts as paid.
9. Every create, edit and void writes to the audit log with user and time.

**Non-functional requirements**

- Mobile first: adding an invoice with 3 items takes under 1 minute on a phone.
- Khmer and English interface.
- Receipt photos stored in S3-compatible storage, compressed on upload.
- Daily database backup.
- Login per user; role checks on every action.
- Works on a slow mobile connection; forms keep typed data if the network drops.

## Technology

The app uses Next.js on the front end and Express on the back end.

| Layer | Technology |
| --- | --- |
| Frontend | Next.js |
| Backend | Express |

## Roadmap

Build in three phases, moving on only when the previous phase is in daily use.

&#91;embedded content: roadmap · 3 phases, 2 gates\]

Phase 1 alone replaces Excel; dates depend on the tech stack and team, listed under open questions. Keep using the improved Excel layout until Phase 1 launches, so its data imports cleanly.

## Success metrics, risks and open questions

The app succeeds when the Excel sheet is retired and the daily cash count matches without surprises.

**Success metrics**

- 100% of purchases recorded in the app, Excel no longer used, within one month of launch.
- Daily cash count done every day, with differences explained the same day.
- Owner can see monthly profit per currency without manual work.
- Every money request settled with a list of who received the money.

**Risks**

| Risk | Fallback |
| --- | --- |
| Staff skip recording small purchases | Fast mobile form, product list, daily count shows gaps |
| Wrong wallet chosen on entry | Default wallet per user, managers can correct same day |
| Receipts lost or unreadable | Photo required above a set amount |
| Old Excel data has spelling differences | Clean product and supplier names during import |

**Open questions**

- [x] Which tech stack: web app, Telegram mini app, or both?
- [ ] Only for your restaurant, or sold to other restaurants later (multi-tenant)?
- [ ] Which bank and e-wallet accounts become wallets?
- [ ] Do suppliers give credit, or is every purchase paid on the spot?
- [ ] Target launch date and who builds it?
