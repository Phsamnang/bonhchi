import { pgTable, bigint, varchar, boolean, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';

export const walletTypeEnum = pgEnum('wallet_type', [
  'cash',
  'bank',
  'cash_drawer',
  'petty_cash',
  'delivery_app',
  'staff_advance',
  'manager_advance',
  'tips',
]);

export const currencyEnum = pgEnum('currency_code', ['USD', 'KHR']);

export const wallets = pgTable('wallets', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name_km: varchar('name_km', { length: 100 }).notNull(),
  name_en: varchar('name_en', { length: 100 }).notNull(),
  type: walletTypeEnum('type').notNull(),
  category: varchar('category', { length: 20 }).default('cash').notNull(),
  currency: currencyEnum('currency').default('USD').notNull(),
  opening_balance: decimal('opening_balance', { precision: 14, scale: 2 }).default('0.00').notNull(),
  current_balance: decimal('current_balance', { precision: 14, scale: 2 }).default('0.00').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
