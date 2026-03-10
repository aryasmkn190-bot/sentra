import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { categories } from '../../lib/schema';
import { eq, asc } from 'drizzle-orm';
import { isAuthenticated } from '../../lib/auth';

export const GET: APIRoute = async () => {
    try {
        const allCategories = await db.select().from(categories).orderBy(asc(categories.sortOrder));
        return new Response(JSON.stringify({ success: true, data: allCategories }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error fetching categories' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    if (!isAuthenticated(request)) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const { name, emoji, sortOrder, restricted } = body;

        if (!name || !name.trim()) {
            return new Response(JSON.stringify({ success: false, message: 'Nama kategori wajib diisi' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        await db.insert(categories).values({
            name: name.trim(),
            emoji: emoji || '📦',
            sortOrder: parseInt(sortOrder || '0'),
            restricted: restricted === true,
        });

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        const isDuplicate = error?.message?.includes('unique') || error?.message?.includes('duplicate');
        return new Response(JSON.stringify({
            success: false,
            message: isDuplicate ? 'Kategori dengan nama ini sudah ada' : 'Error creating category'
        }), {
            status: isDuplicate ? 409 : 500,
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
        const { id, name, emoji, sortOrder, restricted } = body;

        if (!name || !name.trim()) {
            return new Response(JSON.stringify({ success: false, message: 'Nama kategori wajib diisi' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        await db.update(categories).set({
            name: name.trim(),
            emoji: emoji || '📦',
            sortOrder: parseInt(sortOrder || '0'),
            restricted: restricted === true,
        }).where(eq(categories.id, id));

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        const isDuplicate = error?.message?.includes('unique') || error?.message?.includes('duplicate');
        return new Response(JSON.stringify({
            success: false,
            message: isDuplicate ? 'Kategori dengan nama ini sudah ada' : 'Error updating category'
        }), {
            status: isDuplicate ? 409 : 500,
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
        const url = new URL(request.url);
        const id = parseInt(url.searchParams.get('id') || '0');

        await db.delete(categories).where(eq(categories.id, id));

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error deleting category' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
