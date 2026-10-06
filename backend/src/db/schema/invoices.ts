import { pgTable, bigint, varchar, text, boolean, timestamp, date, time, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { suppliers, products, categories } from './master.js';
import { wallets } from './wallets.js';

export const invoiceTypeEnum = pgEnum('invoice_type', ['expense', 'income']);
export const expenseKindEnum = pgEnum('expense_kind', ['product', 'small']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['paid', 'partial', 'unpaid', 'void']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'qr', 'bank_transfer', 'credit']);

export const invoices = pgTable('invoices', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  invoice_no: varchar('invoice_no', { length: 50 }).unique().notNull(),
  invoice_date: date('invoice_date').defaultNow().notNull(),
  invoice_time: time('invoice_time').defaultNow().notNull(),
  type: invoiceTypeEnum('type').default('expense').notNull(),
  expense_kind: expenseKindEnum('expense_kind'),
  market_trip_id: bigint('market_trip_id', { mode: 'number' }),
  supplier_id: bigint('supplier_id', { mode: 'number' }).references(() => suppliers.id),
  supplier_name: varchar('supplier_name', { length: 150 }),
  category_id: bigint('category_id', { mode: 'number' }).references(() => categories.id),
  category_name: varchar('category_name', { length: 100 }),
  wallet_code: varchar('wallet_code', { length: 50 }),
  total_usd: decimal('total_usd', { precision: 12, scale: 2 }).default('0.00').notNull(),
  total_khr: decimal('total_khr', { precision: 14, scale: 0 }).default('0').notNull(),
  paid_usd: decimal('paid_usd', { precision: 12, scale: 2 }).default('0.00').notNull(),
  paid_khr: decimal('paid_khr', { precision: 14, scale: 0 }).default('0').notNull(),
  status: invoiceStatusEnum('status').default('unpaid').notNull(),
  void_reason: varchar('void_reason', { length: 100 }),
  voided_by: bigint('voided_by', { mode: 'number' }).references(() => users.id),
  voided_at: timestamp('voided_at', { withTimezone: true }),
  receipt_url: text('receipt_url'),
  note: text('note'),
  created_by: bigint('created_by', { mode: 'number' }).references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  invoice_id: bigint('invoice_id', { mode: 'number' }).references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  product_id: bigint('product_id', { mode: 'number' }).references(() => products.id),
  item_name: varchar('item_name', { length: 150 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  unit_price: decimal('unit_price', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  line_total: decimal('line_total', { precision: 14, scale: 2 }).notNull(),
  is_paid: boolean('is_paid').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoicePayments = pgTable('invoice_payments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  invoice_id: bigint('invoice_id', { mode: 'number' }).references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  wallet_id: bigint('wallet_id', { mode: 'number' }).references(() => wallets.id).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  method: paymentMethodEnum('method').default('cash').notNull(),
  cross_currency_rate: decimal('cross_currency_rate', { precision: 10, scale: 4 }),
  paid_at: timestamp('paid_at', { withTimezone: true }).defaultNow().notNull(),
  created_by: bigint('created_by', { mode: 'number' }).references(() => users.id),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type NewInvoicePayment = typeof invoicePayments.$inferInsert;
