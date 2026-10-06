import { pgTable, bigint, varchar, text, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { categories } from './master.js';

export const requestStatusEnum = pgEnum('request_status', ['pending', 'approved', 'rejected', 'settled']);

export const moneyRequests = pgTable('money_requests', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  requested_by: bigint('requested_by', { mode: 'number' }).references(() => users.id).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  category_id: bigint('category_id', { mode: 'number' }).references(() => categories.id),
  reason: text('reason').notNull(),
  status: requestStatusEnum('status').default('pending').notNull(),
  approved_by: bigint('approved_by', { mode: 'number' }).references(() => users.id),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  rejection_reason: text('rejection_reason'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const requestDistributions = pgTable('request_distributions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  request_id: bigint('request_id', { mode: 'number' }).references(() => moneyRequests.id, { onDelete: 'cascade' }).notNull(),
  recipient_name: varchar('recipient_name', { length: 100 }).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  given_at: timestamp('given_at', { withTimezone: true }).defaultNow().notNull(),
  note: text('note'),
});

export type MoneyRequest = typeof moneyRequests.$inferSelect;
export type NewMoneyRequest = typeof moneyRequests.$inferInsert;
export type RequestDistribution = typeof requestDistributions.$inferSelect;
export type NewRequestDistribution = typeof requestDistributions.$inferInsert;
