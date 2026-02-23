interface SendMessageOptions {
    number: string;
    message: string;
}

export async function sendWhatsAppMessage({ number, message }: SendMessageOptions): Promise<boolean> {
    const apiUrl = (import.meta.env.EVOLUTION_API_URL ?? process.env.EVOLUTION_API_URL ?? '').trim();
    const apiKey = (import.meta.env.EVOLUTION_API_KEY ?? process.env.EVOLUTION_API_KEY ?? '').trim();
    const instance = (import.meta.env.EVOLUTION_INSTANCE ?? process.env.EVOLUTION_INSTANCE ?? '').trim();

    if (!apiUrl || !apiKey || !instance) {
        console.error('[WA] Evolution API not configured. Missing vars:', {
            hasApiUrl: !!apiUrl,
            hasApiKey: !!apiKey,
            hasInstance: !!instance,
        });
        return false;
    }

    // Normalize phone number
    let normalizedNumber = number.replace(/\D/g, '');
    if (normalizedNumber.startsWith('0')) {
        normalizedNumber = '62' + normalizedNumber.substring(1);
    }
    if (!normalizedNumber.startsWith('62')) {
        normalizedNumber = '62' + normalizedNumber;
    }

    const endpoint = `${apiUrl}/message/sendText/${instance}`;
    console.log(`[WA] Sending to ${normalizedNumber} via ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify({
                number: normalizedNumber,
                text: message,
            }),
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
    paymentInfo?: string;
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
    message += `👥 *Kelompok:* ${order.kelompok}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💳 *Cara Pembayaran:*\n`;
    message += order.paymentInfo || 'Hubungi admin untuk info pembayaran';
    message += `\n\nTerima kasih telah berbelanja di *Sentra*! 🙏`;

    return message;
}
