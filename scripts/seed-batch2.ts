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

async function seedBatch2Products() {
    console.log('🌱 Seeding Batch 2 products...\n');

    const batch2Products = [
        {
            name: 'Paket A',
            type: 'paket' as const,
            price: 50000,
            description: 'Paket A Batch 2',
            items: [
                'KORNET KU SACHET 50 G',
                'INDOMIE AYAM BAWANG',
                'HERBAL MASUK ANGIN 15 ML (x2)',
                'TUNAS KOPI GULA AREN (x2)',
                'CIPTADENT 200 GR',
                'INDOMIE GORENG (x2)',
            ],
            batchId: 2,
            sortOrder: 1,
        },
        {
            name: 'Paket B',
            type: 'paket' as const,
            price: 50000,
            description: 'Paket B Batch 2',
            items: [
                'MINYAK GORENG 1L SEDAAP',
                'BON CABE RASA BAWANG GORENG 45 GR',
                'ROYALE - PEWANGI 650 ML',
            ],
            batchId: 2,
            sortOrder: 2,
        },
        {
            name: 'Paket C',
            type: 'paket' as const,
            price: 50000,
            description: 'Paket C Batch 2',
            items: [
                'INDOMIE GORENG',
                'ULTRAMILK 200 ML',
                'HEAD AND SHOULDER 160 ML',
                'YOU C1000 140ML',
            ],
            batchId: 2,
            sortOrder: 3,
        },
    ];

    for (const p of batch2Products) {
        try {
            await db.insert(schema.products).values({
                name: p.name,
                type: p.type,
                price: p.price,
                description: p.description,
                items: p.items,
                batchId: p.batchId,
                sortOrder: p.sortOrder,
            });
            console.log(`  ✅ Inserted: ${p.name} (Batch 2) - Rp${p.price.toLocaleString()}`);
            console.log(`     Items: ${p.items.join(', ')}`);
        } catch (error: any) {
            console.error(`  ❌ Error inserting ${p.name}:`, error?.message);
        }
    }

    console.log('\n🎉 Batch 2 seeding completed!');
}

seedBatch2Products().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
