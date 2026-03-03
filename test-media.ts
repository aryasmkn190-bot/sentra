import 'dotenv/config';
import fs from 'fs';

async function test() {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE;

    const endpoint = `${apiUrl}/message/sendMedia/${instance}`;

    console.log("Endpoint:", endpoint);

    // convert public/qr.jpeg to base64
    const fileData = fs.readFileSync('public/qr.jpeg', { encoding: 'base64' });
    const base64Data = `data:image/jpeg;base64,${fileData}`;

    const body = {
        number: "62895610816866", // Try to use a test number or a dummy one
        mediatype: 'image',
        mimetype: 'image/jpeg',
        media: base64Data,
        caption: "Test caption QA"
    };

    console.log("Sending...");

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify(body)
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch (e) {
        console.log("Error:", e);
    }
}
test();
