import { pgTable, serial, text, integer, boolean, timestamp, jsonb, varchar, pgEnum } from 'drizzle-orm/pg-core';

export const productTypeEnum = pgEnum('product_type', ['paket', 'satuan']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'processing', 'completed', 'cancelled']);
export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'admin']);

export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: productTypeEnum('type').notNull(),
    price: integer('price').notNull().default(0),
    description: text('description'),
    image: text('image'),
    items: jsonb('items').$type<string[]>(),
    category: varchar('category', { length: 100 }),
    batchId: integer('batch_id'),
    minOrder: integer('min_order').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===== BATCHES =====
export const batches = pgTable('batches', {
    id: serial('id').primaryKey(),
    batchNumber: integer('batch_number').notNull().unique(),
    name: varchar('name', { length: 255 }),
    startAt: timestamp('start_at').notNull(),
    endAt: timestamp('end_at').notNull(),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
    id: serial('id').primaryKey(),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    whatsappNumber: varchar('whatsapp_number', { length: 20 }).notNull(),
    kelompok: varchar('kelompok', { length: 100 }).notNull(),
    items: jsonb('items').$type<OrderItem[]>().notNull(),
    totalAmount: integer('total_amount').notNull().default(0),
    status: orderStatusEnum('status').notNull().default('pending'),
    notes: text('notes'),
    waSent: boolean('wa_sent').notNull().default(false),
    batchId: integer('batch_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 100 }).notNull().unique(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminUsers = pgTable('admin_users', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    role: adminRoleEnum('role').notNull().default('admin'),
    allowedOffices: jsonb('allowed_offices').$type<string[]>().default([]),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

export interface OrderItem {
    productId: number;
    productName: string;
    productType: 'paket' | 'satuan';
    quantity: number;
    price: number;
    items?: string[];
}

export type BatchStatus = 'upcoming' | 'open' | 'closed';

export function getBatchStatus(batch: Batch): BatchStatus {
    const now = new Date();
    if (now < batch.startAt) return 'upcoming';
    if (now >= batch.startAt && now <= batch.endAt) return 'open';
    return 'closed';
}
