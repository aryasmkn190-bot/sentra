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

async function seed() {
    console.log('🌱 Seeding database...');

    // Seed products - Paket
    const paketProducts = [
        {
            name: 'Paket A',
            type: 'paket' as const,
            price: 50000,
            description: 'Paket hemat kebutuhan harian',
            items: [
                'KORNET KU SACHET 50 G',
                'INDOMIE GORENG',
                'INDOMIE AYAM BAWANG',
                'SABUN MANDI GIV 400 ml',
                'GULA PASIR 1/4',
            ],
            sortOrder: 1,
        },
        {
            name: 'Paket B',
            type: 'paket' as const,
            price: 55000,
            description: 'Paket hemat kebutuhan dapur',
            items: [
                'MINYAK GORENG 1L SEDAAP',
                'TISSU PASEO 500+40 SHEET',
                'KECAP BANGO MANIS 189G',
            ],
            sortOrder: 2,
        },
        {
            name: 'Paket C',
            type: 'paket' as const,
            price: 60000,
            description: 'Paket lengkap mingguan',
            items: [
                'INDOMIE AYAM BAWANG',
                'TUNAS KOPI GULA AREN',
                'GENTLE GEN BOTOL 700 ML',
                'ULTRA MILK 1L',
                'INDOMIE GORENG',
            ],
            sortOrder: 3,
        },
    ];

    // Seed products - Satuan (Rokok)
    const rokokProducts = [
        { name: 'ROKOK CLASMILD 20 BTG', price: 28000, sortOrder: 10 },
        { name: 'ROKOK JAZZY POPPIN', price: 18000, sortOrder: 11 },
        { name: 'ROKOK MARLBORO MERAH', price: 35000, sortOrder: 12 },
        { name: 'ROKOK 76 APEL', price: 15000, sortOrder: 13 },
        { name: 'ROKOK 76 MANGGA', price: 15000, sortOrder: 14 },
        { name: 'ROKOK CLASMILD PURPLE', price: 28000, sortOrder: 15 },
        { name: 'ROKOK GARFIT', price: 20000, sortOrder: 16 },
        { name: 'ROKOK SIGNATURE FILTER', price: 22000, sortOrder: 17 },
        { name: 'ROKOK SAMPOERNA KRETEK', price: 24000, sortOrder: 18 },
        { name: 'ROKOK ESSE BERRY POP', price: 25000, sortOrder: 19 },
        { name: 'ROKOK CAMEL BIRU', price: 30000, sortOrder: 20 },
        { name: 'ROKOK SAMPOERNA MILD', price: 30000, sortOrder: 21 },
    ];

    for (const p of paketProducts) {
        await db.insert(schema.products).values({
            name: p.name,
            type: p.type,
            price: p.price,
            description: p.description,
            items: p.items,
            sortOrder: p.sortOrder,
        });
        console.log(`  ✅ Inserted product: ${p.name}`);
    }

    for (const r of rokokProducts) {
        await db.insert(schema.products).values({
            name: r.name,
            type: 'satuan',
            price: r.price,
            description: `Rokok satuan - ${r.name}`,
            items: null,
            sortOrder: r.sortOrder,
        });
        console.log(`  ✅ Inserted product: ${r.name}`);
    }

    // Seed settings
    const defaultSettings = [
        { key: 'store_name', value: 'Swasembada-DK' },
        { key: 'store_phone', value: '628xxxxxxxxxx' },
        { key: 'payment_info', value: 'Transfer ke BCA 1234567890 a.n. Swasembada-DK' },
        { key: 'evolution_api_url', value: '' },
        { key: 'evolution_api_key', value: '' },
        { key: 'evolution_instance', value: '' },
    ];

    for (const s of defaultSettings) {
        await db.insert(schema.settings).values(s);
        console.log(`  ✅ Inserted setting: ${s.key}`);
    }

    console.log('\n🎉 Seeding completed!');
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
