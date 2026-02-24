import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { adminUsers } from '../../lib/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated, isSuperAdmin, hashPassword, getAdminUser } from '../../lib/auth';

// GET: List all admin users (super_admin only)
export const GET: APIRoute = async ({ request }) => {
    if (!isAuthenticated(request) || !isSuperAdmin(request)) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const users = await db.select({
            id: adminUsers.id,
            username: adminUsers.username,
            name: adminUsers.name,
            role: adminUsers.role,
            allowedOffices: adminUsers.allowedOffices,
            isActive: adminUsers.isActive,
            createdAt: adminUsers.createdAt,
            updatedAt: adminUsers.updatedAt,
        }).from(adminUsers);

        return new Response(JSON.stringify({ success: true, data: users }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching admin users:', error);
        return new Response(JSON.stringify({ success: false, message: 'Error fetching admin users' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

// POST: Create new admin user (super_admin only)
export const POST: APIRoute = async ({ request }) => {
    if (!isAuthenticated(request) || !isSuperAdmin(request)) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const { username, password, name, role, allowedOffices, isActive } = body;

        if (!username || !password || !name) {
            return new Response(JSON.stringify({ success: false, message: 'Username, password, dan nama wajib diisi' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check if username already exists
        const existing = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
        if (existing.length > 0) {
            return new Response(JSON.stringify({ success: false, message: 'Username sudah digunakan' }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const hashedPassword = hashPassword(password);

        await db.insert(adminUsers).values({
            username,
            password: hashedPassword,
            name,
            role: role || 'admin',
            allowedOffices: allowedOffices || [],
            isActive: isActive !== false,
        });

        return new Response(JSON.stringify({ success: true, message: 'Admin berhasil ditambahkan' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error creating admin user:', error);
        return new Response(JSON.stringify({ success: false, message: 'Error creating admin user' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

// PUT: Update admin user (super_admin only)
export const PUT: APIRoute = async ({ request }) => {
    if (!isAuthenticated(request) || !isSuperAdmin(request)) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const { id, username, password, name, role, allowedOffices, isActive } = body;

        if (!id) {
            return new Response(JSON.stringify({ success: false, message: 'ID wajib diisi' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Prevent super_admin from demoting themselves
        const currentUser = getAdminUser(request);
        if (currentUser && currentUser.id === id && role !== 'super_admin') {
            return new Response(JSON.stringify({ success: false, message: 'Tidak bisa mengubah role diri sendiri' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check username uniqueness if changed
        if (username) {
            const existing = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
            if (existing.length > 0 && existing[0].id !== id) {
                return new Response(JSON.stringify({ success: false, message: 'Username sudah digunakan' }), {
                    status: 409,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        const updateData: any = { updatedAt: new Date() };
        if (username) updateData.username = username;
        if (name) updateData.name = name;
        if (role) updateData.role = role;
        if (allowedOffices !== undefined) updateData.allowedOffices = allowedOffices;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (password) updateData.password = hashPassword(password);

        await db.update(adminUsers).set(updateData).where(eq(adminUsers.id, id));

        return new Response(JSON.stringify({ success: true, message: 'Admin berhasil diperbarui' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error updating admin user:', error);
        return new Response(JSON.stringify({ success: false, message: 'Error updating admin user' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

// DELETE: Delete admin user (super_admin only)
export const DELETE: APIRoute = async ({ request }) => {
    if (!isAuthenticated(request) || !isSuperAdmin(request)) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const { id } = body;

        // Prevent deleting self
        const currentUser = getAdminUser(request);
        if (currentUser && currentUser.id === id) {
            return new Response(JSON.stringify({ success: false, message: 'Tidak bisa menghapus akun sendiri' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        await db.delete(adminUsers).where(eq(adminUsers.id, id));

        return new Response(JSON.stringify({ success: true, message: 'Admin berhasil dihapus' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error deleting admin user:', error);
        return new Response(JSON.stringify({ success: false, message: 'Error deleting admin user' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
