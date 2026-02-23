import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { orders } from '../../lib/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { isAuthenticated } from '../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
    if (!isAuthenticated(request)) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
        return new Response(JSON.stringify({ success: true, data: allOrders }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error fetching orders' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const PUT: APIRoute = async ({ request }) => {
    if (!isAuthenticated(request)) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const { id, status, notes } = body;

        const updateData: any = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;

        await db.update(orders).set(updateData).where(eq(orders.id, id));

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error updating order' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const DELETE: APIRoute = async ({ request }) => {
    if (!isAuthenticated(request)) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const { id, ids } = body;

        if (ids && Array.isArray(ids) && ids.length > 0) {
            // Bulk delete
            await db.delete(orders).where(inArray(orders.id, ids));
            return new Response(JSON.stringify({ success: true, deleted: ids.length }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } else if (id) {
            // Single delete
            await db.delete(orders).where(eq(orders.id, id));
            return new Response(JSON.stringify({ success: true, deleted: 1 }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            return new Response(JSON.stringify({ success: false, message: 'No order ID provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error deleting order(s)' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
