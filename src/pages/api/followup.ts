import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { orders } from '../../lib/schema';
import { eq } from 'drizzle-orm';
import { sendWhatsAppImage } from '../../lib/evolution-api';
import { isAuthenticated } from '../../lib/auth';

function formatFollowUpMessage(order: {
    customerName: string;
    orderNumber: string;
    items: Array<{
        productName: string;
        productType: string;
        quantity: number;
        price: number;
    }>;
    totalAmount: number;
}): string {
    let message = `🙏 Salam.\n\n`;
    message += `Ka *${order.customerName}*, Pesanan Anda dengan rincian produk berikut:\n\n`;
    message += `🛒 *Detail Pesanan:*\n`;

    for (const item of order.items) {
        const itemTotal = item.productType === 'paket'
            ? item.price
            : item.price * item.quantity;
        message += `• ${item.productName} (x${item.quantity}) — Rp ${itemTotal.toLocaleString('id-ID')}\n`;
    }

    message += `\n💰 *Total: Rp ${order.totalAmount.toLocaleString('id-ID')}*\n\n`;
    message += `⏳ masih menunggu konfirmasi. Silakan scan QRIS di atas untuk melakukan pembayaran agar pesanan dapat diproses. Terima kasih! 😊\n\n`;
    message += `📌 _Abaikan pesan ini jika Anda sudah melakukan pembayaran._\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🤖 _Pesan ini dikirim otomatis oleh sistem *Sentra*._`;

    return message;
}

export const POST: APIRoute = async ({ request }) => {
    if (!isAuthenticated(request)) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const { orderId } = body;

        if (!orderId) {
            return new Response(JSON.stringify({ success: false, message: 'Order ID diperlukan' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch the order
        const orderResults = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (orderResults.length === 0) {
            return new Response(JSON.stringify({ success: false, message: 'Pesanan tidak ditemukan' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const order = orderResults[0];

        // Format the follow-up message
        const message = formatFollowUpMessage({
            customerName: order.customerName,
            orderNumber: order.orderNumber,
            items: (order.items as any[]) || [],
            totalAmount: order.totalAmount,
        });

        // Send QRIS image with follow-up message as caption (same as checkout)
        const siteUrl = 'https://swasembada.bergerak.space';
        const qrisUrl = `${siteUrl}/qr.jpeg`;

        const sent = await sendWhatsAppImage({
            number: order.whatsappNumber,
            imageUrl: qrisUrl,
            caption: message,
        });

        if (sent) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Pesan follow up berhasil dikirim',
                customerName: order.customerName,
            }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                message: 'Gagal mengirim pesan. Pastikan WhatsApp Gateway terhubung.',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (error) {
        console.error('Follow-up error:', error);
        return new Response(JSON.stringify({ success: false, message: 'Terjadi kesalahan server' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
