require('dotenv').config();
const fs = require('fs');

async function test() {
  const fetch = (await import('node-fetch')).default;
  
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  
  const endpoint = `${apiUrl}/message/sendMedia/${instance}`;
  
  console.log("Endpoint:", endpoint);
  
  // convert public/qr.jpeg to base64
  const fileData = fs.readFileSync('public/qr.jpeg', {encoding: 'base64'});
  const base64Data = `data:image/jpeg;base64,${fileData}`;
  
  const body = {
      number: "6281234567890", // dummy, hopefully we get an API error about invalid number or successful parse
      mediatype: 'image',
      media: base64Data, // or try URL
      caption: "Test caption"
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
