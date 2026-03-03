import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { batches, orders, settings } from '../src/lib/schema.js';
import { eq, isNull } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function migrateBatch() {
    console.log('🔄 Migrasi data batch lama ke tabel batches baru...\n');

    // 1. Read old batch settings
    const allSettings = await db.select().from(settings);
    const sMap: Record<string, string> = {};
    allSettings.forEach(s => { sMap[s.key] = s.value; });

    const batchName = sMap.batch_name || 'Batch 1';
    const batchStart = sMap.batch_start || '2026-02-23T17:00:00+07:00';
    const batchEnd = sMap.batch_end || '2026-02-25T21:05:00+07:00';
    const batchActive = sMap.batch_active === 'true';

    console.log(`📦 Batch lama ditemukan:`);
    console.log(`   Nama   : ${batchName}`);
    console.log(`   Mulai  : ${batchStart}`);
    console.log(`   Selesai: ${batchEnd}`);
    console.log(`   Aktif  : ${batchActive}`);
    console.log('');

    // 2. Check if batch already exists
    const existingBatches = await db.select().from(batches);
    if (existingBatches.length > 0) {
        console.log('⚠️  Sudah ada batch di tabel baru. Skip pembuatan batch.');
        console.log(`   Batch yang ada: ${existingBatches.map(b => `#${b.batchNumber} (${b.name})`).join(', ')}`);
    } else {
        // 3. Create Batch 1 in new table
        const [newBatch] = await db.insert(batches).values({
            batchNumber: 1,
            name: batchName,
            startAt: new Date(batchStart),
            endAt: new Date(batchEnd),
            isActive: false, // batch sudah berakhir
        }).returning();

        console.log(`✅ Batch 1 berhasil dibuat di tabel baru (id: ${newBatch.id})`);

        // 4. Assign all existing orders (batch_id = null) to Batch 1
        await db.update(orders)
            .set({ batchId: newBatch.id })
            .where(isNull(orders.batchId));

        // Count orders assigned
        const ordersInBatch = await db.select().from(orders).where(eq(orders.batchId, newBatch.id));
        console.log(`✅ ${ordersInBatch.length} pesanan berhasil ditautkan ke Batch 1`);
    }

    // 5. Show summary
    console.log('\n📋 Setting batch lama di tabel settings (tidak dihapus):');
    ['batch_name', 'batch_start', 'batch_end', 'batch_active'].forEach(key => {
        if (sMap[key]) console.log(`   ${key} = ${sMap[key]}`);
    });

    console.log('\n🎉 Migrasi selesai!');
    process.exit(0);
}

migrateBatch().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
