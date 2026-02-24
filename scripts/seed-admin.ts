import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// Must use the same secret as the running app
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'swasembada-dk-secret-2024';
console.log(`ℹ️ Using ADMIN_SECRET: ${ADMIN_SECRET.substring(0, 10)}...`);

function hashPassword(password: string): string {
    return btoa(`${ADMIN_SECRET}:${password}:hashed`);
}

async function seedAdmin() {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    console.log(`🔐 Creating super admin user: ${username}`);

    try {
        await db.insert(schema.adminUsers).values({
            username,
            password: hashPassword(password),
            name: 'Super Admin',
            role: 'super_admin',
            allowedOffices: [],
            isActive: true,
        });
        console.log(`✅ Super admin created successfully!`);
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
    } catch (error: any) {
        if (error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
            console.log(`ℹ️ User "${username}" already exists.`);
        } else {
            console.error('❌ Error:', error);
        }
    }
}

seedAdmin().catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
