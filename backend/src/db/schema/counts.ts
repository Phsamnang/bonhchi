import { pgTable, bigint, varchar, text, boolean, timestamp, date, decimal, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { wallets } from './wallets';

export const walletCounts = pgTable('wallet_counts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  wallet_id: bigint('wallet_id', { mode: 'number' }).references(() => wallets.id).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  count_date: date('count_date').defaultNow().notNull(),
  system_amount: decimal('system_amount', { precision: 14, scale: 2 }).notNull(),
  counted_amount: decimal('counted_amount', { precision: 14, scale: 2 }).notNull(),
  difference: decimal('difference', { precision: 14, scale: 2 }),
  tolerance_threshold: decimal('tolerance_threshold', { precision: 14, scale: 2 }).notNull(),
  denominations_breakdown: jsonb('denominations_breakdown').notNull(),
  reason_for_gap: text('reason_for_gap'),
  is_blind_count: boolean('is_blind_count').default(true).notNull(),
  counted_by: bigint('counted_by', { mode: 'number' }).references(() => users.id),
  verified_by: bigint('verified_by', { mode: 'number' }).references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type WalletCount = typeof walletCounts.$inferSelect;
export type NewWalletCount = typeof walletCounts.$inferInsert;
