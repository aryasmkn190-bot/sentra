const ADMIN_USERNAME = import.meta.env.ADMIN_USERNAME || process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_SECRET = import.meta.env.ADMIN_SECRET || process.env.ADMIN_SECRET || 'swasembada-dk-secret-2024';

export function validateCredentials(username: string, password: string): boolean {
    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export function generateToken(username: string): string {
    const payload = `${username}:${Date.now()}:${ADMIN_SECRET}`;
    return btoa(payload);
}

export function validateToken(token: string): boolean {
    try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        if (parts.length < 3) return false;
        const secret = parts.slice(2).join(':');
        return secret === ADMIN_SECRET;
    } catch {
        return false;
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
    return validateToken(token);
}
