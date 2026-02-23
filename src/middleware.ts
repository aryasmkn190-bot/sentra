import { defineMiddleware } from 'astro:middleware';
import { isAuthenticated } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
    const url = new URL(context.request.url);

    // Only protect /admin routes (except /admin/login)
    if (url.pathname.startsWith('/admin') && url.pathname !== '/admin/login') {
        const authenticated = isAuthenticated(context.request);
        if (!authenticated) {
            return context.redirect('/admin/login');
        }
    }

    return next();
});
