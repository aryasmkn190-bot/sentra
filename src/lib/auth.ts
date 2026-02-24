import { db } from './db';
import { adminUsers } from './schema';
import { eq } from 'drizzle-orm';
import type { AdminUser } from './schema';

const ADMIN_SECRET = import.meta.env.ADMIN_SECRET || process.env.ADMIN_SECRET || 'swasembada-dk-secret-2024';

// Simple hash function for password (base64 of secret+password)
// In production, use bcrypt or similar
export function hashPassword(password: string): string {
    return btoa(`${ADMIN_SECRET}:${password}:hashed`);
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
    return hashPassword(password) === hashedPassword;
}

export async function validateCredentials(username: string, password: string): Promise<AdminUser | null> {
    try {
        const users = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
        if (users.length === 0) return null;
        const user = users[0];
        if (!user.isActive) return null;
        if (!verifyPassword(password, user.password)) return null;
        return user;
    } catch (error) {
        console.error('Auth validation error:', error);
        return null;
    }
}

export function generateToken(user: AdminUser): string {
    const payload = JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role,
        allowedOffices: user.allowedOffices,
        name: user.name,
        ts: Date.now(),
    });
    return btoa(payload + ':::' + ADMIN_SECRET);
}

export interface TokenPayload {
    id: number;
    username: string;
    role: 'super_admin' | 'admin';
    allowedOffices: string[];
    name: string;
    ts: number;
}

export function validateToken(token: string): TokenPayload | null {
    try {
        const decoded = atob(token);
        const [payloadStr, secret] = decoded.split(':::');
        if (secret !== ADMIN_SECRET) return null;
        const payload = JSON.parse(payloadStr) as TokenPayload;
        if (!payload.id || !payload.username || !payload.role) return null;
        return payload;
    } catch {
        return null;
    }
}

export function getTokenFromRequest(request: Request): string | null {
    const cookies = request.headers.get('cookie') || '';
    const match = cookies.match(/admin_token=([^;]+)/);
    return match ? match[1] : null;
}

export function isAuthenticated(request: Request): boolean {
    const token = getTokenFromRequest(request);
    if (!token) return false;
    return validateToken(token) !== null;
}

export function getAdminUser(request: Request): TokenPayload | null {
    const token = getTokenFromRequest(request);
    if (!token) return null;
    return validateToken(token);
}

export function isSuperAdmin(request: Request): boolean {
    const user = getAdminUser(request);
    return user?.role === 'super_admin';
}

export function canAccessOffice(request: Request, office: string): boolean {
    const user = getAdminUser(request);
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return (user.allowedOffices || []).includes(office);
}

export function getAllowedOffices(request: Request): string[] | null {
    const user = getAdminUser(request);
    if (!user) return null;
    if (user.role === 'super_admin') return null; // null = all offices
    return user.allowedOffices || [];
}
