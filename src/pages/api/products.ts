import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { products } from '../../lib/schema';
import { eq, asc } from 'drizzle-orm';
import { isAuthenticated } from '../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
    try {
        const allProducts = await db.select().from(products).orderBy(asc(products.sortOrder));
        return new Response(JSON.stringify({ success: true, data: allProducts }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error fetching products' }), {
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
        const { name, type, price, description, items, isActive, sortOrder, image } = body;

        await db.insert(products).values({
            name,
            type,
            price: parseInt(price),
            description,
            items: items || null,
            image: image || null,
            isActive: isActive !== false,
            sortOrder: parseInt(sortOrder || '0'),
        });

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error creating product' }), {
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
        const { id, name, type, price, description, items, isActive, sortOrder, image } = body;

        await db.update(products).set({
            name,
            type,
            price: parseInt(price),
            description,
            items: items || null,
            image: image || null,
            isActive,
            sortOrder: parseInt(sortOrder || '0'),
            updatedAt: new Date(),
        }).where(eq(products.id, id));

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error updating product' }), {
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
        const url = new URL(request.url);
        const id = parseInt(url.searchParams.get('id') || '0');

        await db.delete(products).where(eq(products.id, id));

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Error deleting product' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
