import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { settings } from '../../lib/schema';

export const GET: APIRoute = async () => {
    try {
        const allSettings = await db.select().from(settings);
        const sMap: Record<string, string> = {};
        allSettings.forEach(s => { sMap[s.key] = s.value; });

        const batchActive = sMap.batch_active === 'true';
        const batchStart = sMap.batch_start || '';
        const batchEnd = sMap.batch_end || '';
        const batchName = sMap.batch_name || '';

        let status = 'inactive';
        if (batchActive && batchStart && batchEnd) {
            const now = new Date();
            const start = new Date(batchStart);
            const end = new Date(batchEnd);
            if (now < start) status = 'upcoming';
            else if (now >= start && now <= end) status = 'open';
            else status = 'closed';
        }

        return new Response(JSON.stringify({
            success: true,
            data: {
                active: batchActive,
                name: batchName,
                start: batchStart,
                end: batchEnd,
                status,
                isOpen: status === 'open',
            },
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Error fetching batch status',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
