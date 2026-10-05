export type UserRole = 'owner' | 'manager' | 'staff';
export type Currency = 'USD' | 'KHR';
export type WalletType = 'cash_drawer' | 'petty_cash' | 'bank' | 'delivery_app' | 'staff_advance' | 'manager_advance' | 'tips';
export type InvoiceType = 'expense' | 'income';
export type ExpenseKind = 'product' | 'small';
export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'void';
export type PaymentMethod = 'cash' | 'qr' | 'bank_transfer' | 'credit';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'settled';

export interface WalletBalance {
  id: string | number;
  code: string;
  name_km: string;
  name_en: string;
  type: WalletType;
  category: 'cash' | 'bank' | 'advance' | 'other';
  usd: number;
  khr: number;
}

export interface InvoiceItemPayload {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  currency: Currency;
  is_paid?: boolean;
}

export interface MarketTripShopPayload {
  supplier_id?: string | number;
  supplier_name: string;
  wallet_id?: string | number; // Wallet this shop's paid items are cut from (falls back to trip wallet)
  has_receipt_photo?: boolean;
  receipt_url?: string;
  items: InvoiceItemPayload[];
}

export interface MarketTripPayload {
  trip_date: string;
  wallet_id: string | number;
  is_paid: boolean;
  shops: MarketTripShopPayload[];
}

export interface SmallExpensePayload {
  date: string;
  amount: number;
  currency: Currency;
  category_name: string;
  wallet_code?: string;
  note?: string;
  receipt_url?: string;
}

export interface TransferPayload {
  from_wallet_id: string | number;
  to_wallet_id: string | number;
  amount: number;
  currency: Currency;
  note?: string;
}

export interface WalletCountPayload {
  wallet_id: string | number;
  currency: Currency;
  denominations: Record<string, number>;
  reason_for_gap?: string;
}
