// Test all 10 export endpoints
const BASE = 'http://localhost:4321';

const EXPORT_TYPES = [
  'all-orders',
  'pending-orders',
  'orders-by-status',
  'orders-by-office',
  'product-recap',
  'product-recap-by-batch',
  'product-recap-by-office',
  'shopping-detail',
  'revenue-summary',
  'revenue-by-office',
  'revenue-by-batch',
  'product-list',
  'category-list',
];

async function run() {
  // 1. Login to get cookie
  console.log('🔐 Logging in...');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    redirect: 'manual',
  });

  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) {
    console.error('❌ Login failed - no cookie returned');
    const body = await loginRes.text();
    console.error('Response:', loginRes.status, body);
    process.exit(1);
  }

  const cookie = setCookie.split(';')[0]; // admin_token=xxx
  console.log('✅ Login OK\n');

  // 2. Test each export
  let passed = 0;
  let failed = 0;

  for (const type of EXPORT_TYPES) {
    process.stdout.write(`📄 Testing "${type}"... `);
    try {
      const res = await fetch(`${BASE}/api/export?type=${type}`, {
        headers: { Cookie: cookie },
      });

      if (!res.ok) {
        const text = await res.text();
        console.log(`❌ HTTP ${res.status} - ${text.slice(0, 100)}`);
        failed++;
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      const disposition = res.headers.get('content-disposition') || '';
      const buffer = await res.arrayBuffer();
      const sizeKB = (buffer.byteLength / 1024).toFixed(1);

      const isXlsx = contentType.includes('spreadsheetml');
      const hasFilename = disposition.includes('.xlsx');

      if (isXlsx && hasFilename && buffer.byteLength > 0) {
        const fnMatch = disposition.match(/filename="(.+?)"/);
        console.log(`✅ OK (${sizeKB} KB) → ${fnMatch ? fnMatch[1] : 'unnamed'}`);
        passed++;
      } else {
        console.log(`⚠️  Unexpected: type=${contentType}, size=${sizeKB}KB, disposition=${disposition}`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(40)}`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${EXPORT_TYPES.length}`);
  console.log(passed === EXPORT_TYPES.length ? '🎉 All exports valid!' : '⚠️  Some exports need fixing');
}

run().catch(console.error);
