import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { batches, getBatchStatus } from '../../lib/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: APIRoute = async () => {
    try {
        // Find the active batch (is_active = true), fallback to the latest batch
        let batch = await db.select().from(batches).where(eq(batches.isActive, true)).limit(1);

        if (batch.length === 0) {
            // No active batch - check if there's any batch at all
            batch = await db.select().from(batches).orderBy(desc(batches.batchNumber)).limit(1);
        }

        if (batch.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                data: {
                    active: false,
                    batchNumber: 0,
                    name: '',
                    start: '',
                    end: '',
                    status: 'inactive',
                    isOpen: false,
                    batchId: null,
                },
            }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const b = batch[0];
        const status = getBatchStatus(b);

        return new Response(JSON.stringify({
            success: true,
            data: {
                active: b.isActive,
                batchId: b.id,
                batchNumber: b.batchNumber,
                name: b.name || `Batch ${b.batchNumber}`,
                start: b.startAt.toISOString(),
                end: b.endAt.toISOString(),
                status: b.isActive ? status : 'inactive',
                isOpen: b.isActive && status === 'open',
            },
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching batch status:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Error fetching batch status',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
