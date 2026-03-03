import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { orders, settings, batches, getBatchStatus } from '../../lib/schema';
import { eq } from 'drizzle-orm';
import { sendWhatsAppMessage, sendWhatsAppImage, formatOrderMessage } from '../../lib/evolution-api';
import type { OrderItem } from '../../lib/schema';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { customerName, whatsappNumber, kelompok, items, totalAmount } = body;

        // Validate
        if (!customerName || !whatsappNumber || !kelompok || !items || items.length === 0) {
            return new Response(JSON.stringify({ success: false, message: 'Data tidak lengkap' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Validate batch window from batches table
        let activeBatchId: number | null = null;
        try {
            const activeBatch = await db.select().from(batches).where(eq(batches.isActive, true)).limit(1);
            if (activeBatch.length > 0) {
                const batch = activeBatch[0];
                const status = getBatchStatus(batch);
                if (status !== 'open') {
                    return new Response(JSON.stringify({
                        success: false,
                        message: 'Pembelian sedang ditutup. Tidak bisa checkout di luar periode batch.',
                    }), {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                activeBatchId = batch.id;
            }
            // If no active batch exists, allow checkout (batch system not in use)
        } catch (e) {
            console.error('Error checking batch:', e);
        }

        // Generate short order number (SDK-XXXX)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
        let code = '';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
        const orderNumber = `SDK-${code}`;

        // Get payment info from settings
        let paymentInfo = 'Hubungi admin untuk info pembayaran';
        try {
            const paymentSetting = await db.select().from(settings).where(
                eq(settings.key, 'payment_info')
            ).limit(1);
            if (paymentSetting.length > 0) {
                paymentInfo = paymentSetting[0].value;
            }
        } catch (e) {
            console.error('Error fetching payment info:', e);
        }

        // Save order to database with batch_id
        const orderItems: OrderItem[] = items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            productType: item.productType,
            quantity: item.quantity,
            price: item.price,
            items: item.items,
        }));

        await db.insert(orders).values({
            orderNumber,
            customerName,
            whatsappNumber,
            kelompok,
            items: orderItems,
            totalAmount,
            status: 'pending',
            waSent: false,
            batchId: activeBatchId,
        });

        // Send WhatsApp message via Evolution API
        let waSent = false;
        try {
            const message = formatOrderMessage({
                orderNumber,
                customerName,
                whatsappNumber,
                kelompok,
                items: orderItems,
                totalAmount,
                paymentInfo,
            });

            waSent = await sendWhatsAppMessage({
                number: whatsappNumber,
                message,
            });

            // Send QRIS image after text message
            if (waSent) {
                try {
                    const siteUrl = new URL(request.url).origin;
                    const qrisUrl = `${siteUrl}/qr.jpeg`;
                    await sendWhatsAppImage({
                        number: whatsappNumber,
                        imageUrl: qrisUrl,
                        caption: `💳 Scan QRIS di atas untuk pembayaran pesanan ${orderNumber}\n💰 Total: Rp ${totalAmount.toLocaleString('id-ID')}\n\nKirim bukti transfer ke nomor ini. Terima kasih! 🙏`,
                    });
                } catch (imgErr) {
                    console.error('[WA] Failed to send QRIS image:', imgErr);
                }
            }

            // Update waSent status
            if (waSent) {
                await db.update(orders).set({ waSent: true }).where(eq(orders.orderNumber, orderNumber));
            }
        } catch (e) {
            console.error('Error sending WhatsApp:', e);
        }

        return new Response(JSON.stringify({
            success: true,
            orderNumber,
            waSent,
            message: waSent ? 'Pesanan berhasil! Detail dikirim ke WhatsApp.' : 'Pesanan berhasil disimpan.',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Checkout error:', error);
        return new Response(JSON.stringify({ success: false, message: 'Terjadi kesalahan server' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
