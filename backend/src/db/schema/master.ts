import { pgTable, bigint, varchar, text, boolean, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';

export const categoryTypeEnum = pgEnum('category_type', ['income', 'expense']);

export const categories = pgTable('categories', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name_km: varchar('name_km', { length: 100 }).notNull(),
  name_en: varchar('name_en', { length: 100 }),
  type: categoryTypeEnum('type').notNull(),
  parentId: bigint('parent_id', { mode: 'number' }),
  icon: varchar('icon', { length: 50 }),
  is_active: boolean('is_active').default(true).notNull(),
});

export const suppliers = pgTable('suppliers', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 150 }).notNull(),
  market_location: varchar('market_location', { length: 100 }),
  contact_phone: varchar('contact_phone', { length: 50 }),
  note: text('note'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 150 }).notNull(),
  default_unit: varchar('default_unit', { length: 50 }).notNull(),
  category_id: bigint('category_id', { mode: 'number' }).references(() => categories.id),
  supplier_id: bigint('supplier_id', { mode: 'number' }).references(() => suppliers.id),
  default_currency: varchar('default_currency', { length: 3 }),
  default_unit_price: decimal('default_unit_price', { precision: 14, scale: 2 }).default('0'),
  is_active: boolean('is_active').default(true).notNull(),
});

export type Category = typeof categories.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Product = typeof products.$inferSelect;
