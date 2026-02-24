import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/schema.js';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });
const SECRET = process.env.ADMIN_SECRET || 'swasembada-dk-secret-2024';
const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || 'admin123';
const hashed = btoa(`${SECRET}:${password}:hashed`);

async function fix() {
    console.log('SECRET used:', SECRET);
    console.log('Hashed password:', hashed);

    // Delete old and re-insert with correct hash
    await db.delete(schema.adminUsers).where(eq(schema.adminUsers.username, username));
    await db.insert(schema.adminUsers).values({
        username,
        password: hashed,
        name: 'Super Admin',
        role: 'super_admin',
        allowedOffices: [],
        isActive: true,
    });
    console.log('✅ Super admin re-created with correct secret!');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
}

fix().catch(err => { console.error('❌', err); process.exit(1); });
