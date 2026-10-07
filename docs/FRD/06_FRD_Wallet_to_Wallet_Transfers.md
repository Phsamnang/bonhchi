# FRD — Wallet-to-Wallet Transfers
## Document Ref: `BONCHI-FRD-06`

- **System:** Bonchi Restaurant Money App
- **Module:** Internal Fund Transfers
- **Prototype Screen:** Screen 5 — `5 · ផ្ទេរប្រាក់ Transfer` (`5_Transfer_unbundled.html`)
- **Companion PRD:** [Bonchi_Restaurant_Money_App_PRD.md](file:///d:/Bonchi%20System/docs/Bonchi_Restaurant_Money_App_PRD.md#feature-6-internal-wallet-to-wallet-transfers)

---

## 1. Feature Overview & Objectives
Restaurant liquidity moves continuously between internal accounts: drawing cash from the register to replenish petty cash, depositing cash into the ABA bank account, or advancing funds to managers. These movements are strictly non-commercial and must never be recorded as revenue or expenses.

---

## 2. UI/UX Wireframe & Layout

```mermaid
graph TD
    Screen[Transfer View: 390x844px]
    Screen --> Header[AppHeader: 'ផ្ទេរប្រាក់' + 'Transfer · មិនមែនចំណូល ឬចំណាយ']
    Screen --> FromCard[From Wallet Card: Chips showing 'មាន {balance}']
    Screen --> SwapBtn[Centered Swap Button: ⇄ Invert From and To]
    Screen --> ToCard[To Wallet Card: Selection Chips]
    Screen --> CurrencySeg[Currency Segmented Control: '$ ដុល្លារ' vs '៛ រៀល']
    Screen --> AmountField[Amount Field with CurrencyChip]
    Screen --> QuickAdd[Quick Amount Bar: +10,000 / +50,000 / +100,000]
    Screen --> Warning[Over-Balance Danger Banner: 'លើសពីលុយដែលមានក្នុង...']
    Screen --> ConfirmBanner[Info Banner: 'ផ្ទេរ {amt} ពី {from} ទៅ {to}']
    Screen --> TransferBtn[Primary Action CTA: 'ផ្ទេរ']
```

---

## 3. Business Logic & Validation Rules

### 3.1 Mutual Exclusivity & Swap Logic
- The source wallet `from` and destination wallet `to` cannot be identical:
  - When wallet $X$ is selected as `from`, it is disabled in the `to` list.
  - Tapping the center circular swap button swaps `state.from` and `state.to`.

### 3.2 Over-Balance Enforcement Formula
Before allowing submission, the engine checks:
$$\text{IsOver} = \text{Amount} > \text{Balance}_{\text{from}}[\text{SelectedCurrency}]$$

- If $\text{IsOver} == \text{true}$:
  - Renders red banner (`.bc-banner-danger`):
    `លើសពីលុយដែលមានក្នុង {fromName}` (Exceeds available funds in source wallet).
  - Primary button `ផ្ទេរ` is disabled (`p-btn-off`).
- If $\text{IsOver} == \text{false}$ and $\text{Amount} > 0$:
  - Primary button `ផ្ទេរ` is active.
  - Informational confirmation banner displays:
    `ផ្ទេរ {formattedAmount} ពី {fromName} ទៅ {toName}`.

---

## 4. Database Transaction & Atomic Ledger

When a transfer is executed:
```sql
BEGIN;

-- 1. Deduct from source wallet
UPDATE wallets
SET current_usd = current_usd - :amount_usd,
    current_khr = current_khr - :amount_khr
WHERE id = :from_wallet_id;

-- 2. Add to destination wallet
UPDATE wallets
SET current_usd = current_usd + :amount_usd,
    current_khr = current_khr + :amount_khr
WHERE id = :to_wallet_id;

-- 3. Insert immutable transfer log
INSERT INTO transfers (
    from_wallet_id, to_wallet_id, amount, currency, note, created_by
) VALUES (
    :from_wallet_id, :to_wallet_id, :amount, :currency, :note, :user_id
);

COMMIT;
```

---

## 5. API Specification

### `POST /api/v1/transfers`
- **Access:** Owner, Manager
- **Request Body:**
```json
{
  "from_wallet_id": "8f9b2b24-4f27-4c1d-9321-729481928001",
  "to_wallet_id": "8f9b2b24-4f27-4c1d-9321-729481928002",
  "amount": 100.00,
  "currency": "USD",
  "note": "Top up petty cash from cash drawer"
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "transfer_id": "t-0001-4000-8000-abcdef123456",
  "from_wallet": { "name": "ថតលុយ", "remaining_usd": 86.00 },
  "to_wallet": { "name": "លុយចាយប្រចាំថ្ងៃ", "new_usd": 140.00 }
}
```
