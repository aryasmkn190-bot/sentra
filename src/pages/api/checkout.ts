import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { orders, settings } from '../../lib/schema';
import { eq } from 'drizzle-orm';
import { sendWhatsAppMessage, formatOrderMessage } from '../../lib/evolution-api';
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

        // Validate batch window
        try {
            const allSettings = await db.select().from(settings);
            const sMap: Record<string, string> = {};
            allSettings.forEach(s => { sMap[s.key] = s.value; });

            const batchActive = sMap.batch_active === 'true';
            if (batchActive) {
                const batchStart = sMap.batch_start ? new Date(sMap.batch_start) : null;
                const batchEnd = sMap.batch_end ? new Date(sMap.batch_end) : null;
                const now = new Date();

                if (!batchStart || !batchEnd || now < batchStart || now > batchEnd) {
                    return new Response(JSON.stringify({
                        success: false,
                        message: 'Pembelian sedang ditutup. Tidak bisa checkout di luar periode batch.',
                    }), {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
            }
        } catch (e) {
            console.error('Error checking batch settings:', e);
        }

        // Generate order number
        const now = new Date();
        const orderNumber = `SDK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;

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

        // Save order to database
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
