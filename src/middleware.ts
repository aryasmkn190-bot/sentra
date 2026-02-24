import { defineMiddleware } from 'astro:middleware';
import { isAuthenticated, getAdminUser, isSuperAdmin } from './lib/auth';

// Routes that only super_admin can access
const superAdminRoutes = ['/admin/users'];

export const onRequest = defineMiddleware(async (context, next) => {
    const url = new URL(context.request.url);

    // Only protect /admin routes (except /admin/login)
    if (url.pathname.startsWith('/admin') && url.pathname !== '/admin/login') {
        const authenticated = isAuthenticated(context.request);
        if (!authenticated) {
            return context.redirect('/admin/login');
        }

        // Check super_admin-only routes
        const isSuperAdminRoute = superAdminRoutes.some(route => url.pathname.startsWith(route));
        if (isSuperAdminRoute && !isSuperAdmin(context.request)) {
            return context.redirect('/admin');
        }

        // Store admin user info in locals for use in pages
        const adminUser = getAdminUser(context.request);
        if (adminUser) {
            context.locals.adminUser = adminUser;
        }
    }

    return next();
});
