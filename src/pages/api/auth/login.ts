import type { APIRoute } from 'astro';
import { validateCredentials, generateToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { username, password } = body;

        const user = await validateCredentials(username, password);

        if (!user) {
            return new Response(JSON.stringify({ success: false, message: 'Username atau password salah' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const token = generateToken(user);

        return new Response(JSON.stringify({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
            },
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({ success: false, message: 'Server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
