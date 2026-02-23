import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
    return new Response(null, {
        status: 302,
        headers: {
            'Location': '/admin/login',
            'Set-Cookie': 'admin_token=; Path=/; HttpOnly; Max-Age=0',
        },
    });
};
