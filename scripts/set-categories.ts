import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, like } from 'drizzle-orm';
import * as schema from '../src/lib/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

async function setCategories() {
    console.log('🏷️  Setting product categories...\n');

    // Fetch all satuan products
    const allProducts = await db.select().from(schema.products).where(eq(schema.products.type, 'satuan'));

    for (const product of allProducts) {
        let category = 'Lainnya';

        const name = product.name.toUpperCase();

        if (name.includes('ROKOK')) {
            category = 'Rokok';
        } else if (name.includes('ULTRA') || name.includes('MIMI') || name.includes('SUSU') || name.includes('MILK') || name.includes('C1000') || name.includes('TEH') || name.includes('KOPI')) {
            category = 'Minuman';
        } else if (name.includes('KOREK') || name.includes('API')) {
            category = 'Aksesoris';
        }

        await db.update(schema.products)
            .set({ category })
            .where(eq(schema.products.id, product.id));

        console.log(`  ✅ ${product.name} → ${category}`);
    }

    console.log('\n🎉 Categories set!');
}

setCategories().catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
