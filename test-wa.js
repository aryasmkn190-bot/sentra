// Test kirim pesan via OpenWA (ganti nomor tujuan di bawah, lalu jalankan:
//   OPENWA_API_URL=https://wa.bergerak.space OPENWA_API_KEY=<key> OPENWA_SESSION=sentra node test-wa.js)
require('dotenv').config();

async function test() {
  const fetch = (await import('node-fetch')).default;

  const apiUrl = (process.env.OPENWA_API_URL || 'https://wa.bergerak.space').trim();
  const apiKey = process.env.OPENWA_API_KEY || '';
  const session = process.env.OPENWA_SESSION || '';

  if (!apiKey || !session) {
    console.error('Set OPENWA_API_KEY dan OPENWA_SESSION dulu');
    return;
  }

  // Ganti dengan nomor tujuan test (format 08xxx / 628xxx)
  const targetNumber = (process.env.TEST_NUMBER || '6281234567890').replace(/\D/g, '');
  const chatId = (targetNumber.startsWith('0') ? '62' + targetNumber.slice(1) : targetNumber) + '@c.us';

  const endpoint = `${apiUrl}/api/sessions/${session}/messages/send-text`;
  console.log('Endpoint:', endpoint);
  console.log('chatId  :', chatId);

  const body = { chatId, text: 'Test pesan dari OpenWA ✅' };

  console.log('Sending...');
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log('Status  :', res.status);
    console.log('Response:', text);
  } catch (e) {
    console.log('Error:', e);
  }
}
test();
