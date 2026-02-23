import { pgTable, serial, text, integer, boolean, timestamp, jsonb, varchar, pgEnum } from 'drizzle-orm/pg-core';

export const productTypeEnum = pgEnum('product_type', ['paket', 'satuan']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'processing', 'completed', 'cancelled']);
export const kelompokEnum = pgEnum('kelompok', ['MR1', 'MR2', 'MR3', 'MR4', 'SMD1', 'SMD2']);

export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: productTypeEnum('type').notNull(),
    price: integer('price').notNull().default(0),
    description: text('description'),
    image: text('image'),
    items: jsonb('items').$type<string[]>(),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
    id: serial('id').primaryKey(),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    whatsappNumber: varchar('whatsapp_number', { length: 20 }).notNull(),
    kelompok: kelompokEnum('kelompok').notNull(),
    items: jsonb('items').$type<OrderItem[]>().notNull(),
    totalAmount: integer('total_amount').notNull().default(0),
    status: orderStatusEnum('status').notNull().default('pending'),
    notes: text('notes'),
    waSent: boolean('wa_sent').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 100 }).notNull().unique(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Setting = typeof settings.$inferSelect;

export interface OrderItem {
    productId: number;
    productName: string;
    productType: 'paket' | 'satuan';
    quantity: number;
    price: number;
    items?: string[];
}
