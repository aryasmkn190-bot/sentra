import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { settings } from '../../lib/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
    if (!isAuthenticated(request)) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const allSettings = await db.select().from(settings);
        const settingsMap: Record<string, string> = {};
        allSettings.forEach(s => { settingsMap[s.key] = s.value; });
        return new Response(JSON.stringify({ success: true, data: settingsMap }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error fetching settings' }), {
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
        const entries = Object.entries(body);

        for (const [key, value] of entries) {
            const existing = await db.select().from(settings).where(eq(settings.key, key));
            if (existing.length > 0) {
                await db.update(settings).set({ value: String(value), updatedAt: new Date() }).where(eq(settings.key, key));
            } else {
                await db.insert(settings).values({ key, value: String(value) });
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error updating settings' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
