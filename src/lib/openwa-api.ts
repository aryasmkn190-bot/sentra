/**
 * OpenWA WhatsApp Gateway client.
 *
 * Migrated from Evolution API (2026-08-06).
 * Docs: https://wa.bergerak.space/api (OpenWA)
 * Auth: X-API-Key header.
 *
 * Env vars (set in Vercel):
 *   OPENWA_API_URL   — e.g. https://wa.bergerak.space
 *   OPENWA_API_KEY   — API key dari dashboard OpenWA
 *   OPENWA_SESSION   — UUID session WhatsApp (bukan nama! ambil dari GET /api/sessions,
 *                      mis. proteus = f235a915-5d0f-489b-ba5b-7100231e9483)
 */

interface SendMessageOptions {
    number: string;
    message: string;
}

interface SendImageOptions {
    number: string;
    imageUrl: string;
    caption?: string;
}

function openwaConfig() {
    const apiUrl = (import.meta.env.OPENWA_API_URL ?? process.env.OPENWA_API_URL ?? 'https://wa.bergerak.space').trim();
    const apiKey = (import.meta.env.OPENWA_API_KEY ?? process.env.OPENWA_API_KEY ?? '').trim();
    const session = (import.meta.env.OPENWA_SESSION ?? process.env.OPENWA_SESSION ?? '').trim();
    return { apiUrl, apiKey, session };
}

// Normalize phone: 08xxx / 628xxx / +628xxx → 628xxx
function normalizeNumber(number: string): string {
    let n = number.replace(/\D/g, '');
    if (n.startsWith('0')) {
        n = '62' + n.substring(1);
    }
    if (!n.startsWith('62')) {
        n = '62' + n;
    }
    return n;
}

export async function sendWhatsAppMessage({ number, message }: SendMessageOptions): Promise<boolean> {
    const { apiUrl, apiKey, session } = openwaConfig();

    if (!apiKey || !session) {
        console.error('[WA] OpenWA not configured. Missing vars:', {
            hasApiUrl: !!apiUrl,
            hasApiKey: !!apiKey,
            hasSession: !!session,
        });
        return false;
    }

    const chatId = `${normalizeNumber(number)}@c.us`;
    const endpoint = `${apiUrl}/api/sessions/${session}/messages/send-text`;
    console.log(`[WA] Sending text to ${chatId} via ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify({ chatId, text: message }),
        });

        const responseText = await response.text();

        if (!response.ok) {
            console.error(`[WA] API error (${response.status}):`, responseText);
            return false;
        }

        console.log('[WA] Message sent successfully:', responseText.slice(0, 100));
        return true;
    } catch (error) {
        console.error('[WA] Fetch error:', error instanceof Error ? error.message : error);
        return false;
    }
}

export async function sendWhatsAppImage({ number, imageUrl, caption }: SendImageOptions): Promise<boolean> {
    const { apiUrl, apiKey, session } = openwaConfig();

    if (!apiKey || !session) {
        console.error('[WA] OpenWA not configured for image send');
        return false;
    }

    const chatId = `${normalizeNumber(number)}@c.us`;
    const endpoint = `${apiUrl}/api/sessions/${session}/messages/send-image`;
    console.log(`[WA] Sending QRIS image to ${chatId} via ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify({
                chatId,
                url: imageUrl,
                caption: caption || '',
            }),
        });

        const responseText = await response.text();

        if (!response.ok) {
            console.error(`[WA] Image API error (${response.status}):`, responseText);
            return false;
        }

        console.log('[WA] Image sent successfully:', responseText.slice(0, 100));
        return true;
    } catch (error) {
        console.error('[WA] Image fetch error:', error instanceof Error ? error.message : error);
        return false;
    }
}

export function formatOrderMessage(order: {
    orderNumber: string;
    customerName: string;
    whatsappNumber: string;
    kelompok: string;
    items: Array<{
        productName: string;
        productType: string;
        quantity: number;
        price: number;
        items?: string[];
    }>;
    totalAmount: number;
}): string {
    let message = `🛒 *PESANAN BARU - SENTRA*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📋 *No. Order:* ${order.orderNumber}\n\n`;
    message += `📦 *Detail Pesanan:*\n`;

    for (const item of order.items) {
        if (item.productType === 'paket') {
            message += `\n• *${item.productName}* (x${item.quantity}) — Rp ${item.price.toLocaleString('id-ID')}\n`;
            if (item.items && item.items.length > 0) {
                for (const subItem of item.items) {
                    message += `  - ${subItem}\n`;
                }
            }
        } else {
            message += `• ${item.productName} (x${item.quantity}) — Rp ${(item.price * item.quantity).toLocaleString('id-ID')}\n`;
        }
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 *Total: Rp ${order.totalAmount.toLocaleString('id-ID')}*\n\n`;
    message += `👤 *Nama:* ${order.customerName}\n`;
    message += `📱 *WhatsApp:* ${order.whatsappNumber}\n`;
    message += `🏢 *Kantor:* ${order.kelompok}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💳 *Segera Lakukan Pembayaran:*\n`;
    message += `Silakan scan gambar/barcode QRIS yang kami kirimkan setelah pesan ini.\n\n\n`;
    message += `Kirim bukti pembayaran ke nomor ini.\n\n`;
    message += `Terima kasih telah berbelanja di *Sentra*! 🙏`;

    return message;
}
