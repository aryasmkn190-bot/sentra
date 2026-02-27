import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { orders } from '../../lib/schema';
import { eq, desc } from 'drizzle-orm';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string' || query.trim().length < 3) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Masukkan minimal 3 karakter untuk mencari pesanan',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const searchQuery = query.trim();
        let matchedOrders: any[] = [];

        // Check if it looks like an order number (starts with SDK-)
        if (searchQuery.toUpperCase().startsWith('SDK-')) {
            const result = await db.select().from(orders)
                .where(eq(orders.orderNumber, searchQuery.toUpperCase()))
                .orderBy(desc(orders.createdAt));
            matchedOrders = result;
        } else {
            // Treat as WhatsApp number — normalize
            let normalizedNumber = searchQuery.replace(/[\s\-\(\)]/g, '');

            // Try to find by exact match or common variations
            const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

            matchedOrders = allOrders.filter(o => {
                const orderPhone = o.whatsappNumber.replace(/[\s\-\(\)]/g, '');
                // Exact match
                if (orderPhone === normalizedNumber) return true;
                // Match with/without leading 0 or 62
                const variants = [
                    normalizedNumber,
                    normalizedNumber.replace(/^0/, '62'),
                    normalizedNumber.replace(/^62/, '0'),
                    normalizedNumber.replace(/^\+62/, '0'),
                    normalizedNumber.replace(/^0/, '+62'),
                ];
                return variants.some(v => orderPhone === v || orderPhone.endsWith(v.slice(-9)));
            });
        }

        if (matchedOrders.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                orders: [],
                message: 'Pesanan tidak ditemukan',
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Return sanitized order data (no sensitive admin info)
        const sanitizedOrders = matchedOrders.map(o => ({
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            items: (o.items as any[]).map((item: any) => ({
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                productType: item.productType,
            })),
            totalAmount: o.totalAmount,
            status: o.status,
            createdAt: o.createdAt,
        }));

        return new Response(JSON.stringify({
            success: true,
            orders: sanitizedOrders,
            message: `Ditemukan ${sanitizedOrders.length} pesanan`,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Check order error:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Terjadi kesalahan server',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
