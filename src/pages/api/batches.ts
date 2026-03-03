import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { batches, orders, getBatchStatus } from '../../lib/schema';
import { eq, desc, sql, count } from 'drizzle-orm';

// GET: List all batches with order counts
export const GET: APIRoute = async () => {
    try {
        const allBatches = await db.select().from(batches).orderBy(desc(batches.batchNumber));

        // Get order counts for each batch
        const orderCounts = await db
            .select({ batchId: orders.batchId, count: count() })
            .from(orders)
            .groupBy(orders.batchId);

        const countMap: Record<number, number> = {};
        orderCounts.forEach(oc => {
            if (oc.batchId) countMap[oc.batchId] = oc.count;
        });

        const result = allBatches.map(b => ({
            ...b,
            status: getBatchStatus(b),
            orderCount: countMap[b.id] || 0,
        }));

        return new Response(JSON.stringify({ success: true, data: result }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching batches:', error);
        return new Response(JSON.stringify({ success: false, message: 'Error fetching batches' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};

// POST: Create a new batch (auto-increment batch_number)
export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { name, start_at, end_at } = body;

        if (!start_at || !end_at) {
            return new Response(JSON.stringify({ success: false, message: 'Waktu mulai dan berakhir wajib diisi' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const startDate = new Date(start_at);
        const endDate = new Date(end_at);

        if (endDate <= startDate) {
            return new Response(JSON.stringify({ success: false, message: 'Waktu berakhir harus setelah waktu mulai' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        // Deactivate all current active batches
        await db.update(batches).set({ isActive: false }).where(eq(batches.isActive, true));

        // Get next batch number
        const maxBatch = await db.select({ max: sql<number>`COALESCE(MAX(${batches.batchNumber}), 0)` }).from(batches);
        const nextNumber = (maxBatch[0]?.max || 0) + 1;

        // Create new batch
        const [newBatch] = await db.insert(batches).values({
            batchNumber: nextNumber,
            name: name || `Batch ${nextNumber}`,
            startAt: startDate,
            endAt: endDate,
            isActive: true,
        }).returning();

        return new Response(JSON.stringify({
            success: true,
            message: `Batch ${nextNumber} berhasil dibuat`,
            data: { ...newBatch, status: getBatchStatus(newBatch), orderCount: 0 },
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error creating batch:', error);
        return new Response(JSON.stringify({ success: false, message: 'Error creating batch' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};

// PUT: Update a batch (name, start_at, end_at, is_active)
export const PUT: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { id, name, start_at, end_at, is_active } = body;

        if (!id) {
            return new Response(JSON.stringify({ success: false, message: 'ID batch diperlukan' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const updateData: Record<string, any> = {};
        if (name !== undefined) updateData.name = name;
        if (start_at) updateData.startAt = new Date(start_at);
        if (end_at) updateData.endAt = new Date(end_at);

        if (is_active !== undefined) {
            updateData.isActive = is_active;
            // If activating this batch, deactivate all others
            if (is_active) {
                await db.update(batches).set({ isActive: false }).where(eq(batches.isActive, true));
            }
        }

        if (Object.keys(updateData).length === 0) {
            return new Response(JSON.stringify({ success: false, message: 'Tidak ada data yang diubah' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const [updated] = await db.update(batches).set(updateData).where(eq(batches.id, id)).returning();

        if (!updated) {
            return new Response(JSON.stringify({ success: false, message: 'Batch tidak ditemukan' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Batch berhasil diperbarui',
            data: { ...updated, status: getBatchStatus(updated) },
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error updating batch:', error);
        return new Response(JSON.stringify({ success: false, message: 'Error updating batch' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};

// DELETE: Delete a batch (only if no orders attached)
export const DELETE: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return new Response(JSON.stringify({ success: false, message: 'ID batch diperlukan' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check if batch has orders
        const orderCount = await db.select({ count: count() }).from(orders).where(eq(orders.batchId, id));
        if (orderCount[0]?.count > 0) {
            return new Response(JSON.stringify({
                success: false,
                message: `Batch ini memiliki ${orderCount[0].count} pesanan dan tidak bisa dihapus`,
            }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        await db.delete(batches).where(eq(batches.id, id));

        return new Response(JSON.stringify({ success: true, message: 'Batch berhasil dihapus' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error deleting batch:', error);
        return new Response(JSON.stringify({ success: false, message: 'Error deleting batch' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
