import type { APIRoute } from 'astro';
import { isAuthenticated, isSuperAdmin } from '../../lib/auth';
import { db } from '../../lib/db';
import { orders, products, categories, batches } from '../../lib/schema';
import { desc } from 'drizzle-orm';
import * as XLSX from 'xlsx';

// ===== EXPORT TYPES =====
type ExportType =
  | 'all-orders'
  | 'pending-orders'
  | 'orders-by-status'
  | 'orders-by-office'
  | 'product-recap'
  | 'product-recap-by-batch'
  | 'product-recap-by-office'
  | 'shopping-detail'
  | 'revenue-summary'
  | 'revenue-by-office'
  | 'revenue-by-batch'
  | 'product-list'
  | 'category-list';

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  confirmed: 'Dibayar',
  processing: 'Diproses',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

// Format currency
function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

// Format date
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

export const GET: APIRoute = async ({ request }) => {
  // Auth check
  if (!isAuthenticated(request) || !isSuperAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') as ExportType;
  const batchId = url.searchParams.get('batch');
  const statusFilter = url.searchParams.get('status');
  const filterBatchId = batchId && batchId !== 'all' ? parseInt(batchId) : null;

  if (!type) {
    return new Response(JSON.stringify({ error: 'Missing export type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let workbook: XLSX.WorkBook;
    let filename: string;

    switch (type) {
      case 'all-orders':
        ({ workbook, filename } = await exportAllOrders(filterBatchId));
        break;
      case 'pending-orders':
        ({ workbook, filename } = await exportPendingOrders(filterBatchId));
        break;
      case 'orders-by-status':
        ({ workbook, filename } = await exportOrdersByStatus(filterBatchId, statusFilter));
        break;
      case 'orders-by-office':
        ({ workbook, filename } = await exportOrdersByOffice(filterBatchId));
        break;
      case 'product-recap':
        ({ workbook, filename } = await exportProductRecap(filterBatchId));
        break;
      case 'shopping-detail':
        ({ workbook, filename } = await exportShoppingDetail(filterBatchId));
        break;
      case 'revenue-summary':
        ({ workbook, filename } = await exportRevenueSummary(filterBatchId));
        break;
      case 'revenue-by-office':
        ({ workbook, filename } = await exportRevenueByOffice(filterBatchId));
        break;
      case 'product-recap-by-batch':
        ({ workbook, filename } = await exportProductRecapByBatch());
        break;
      case 'product-recap-by-office':
        ({ workbook, filename } = await exportProductRecapByOffice(filterBatchId));
        break;
      case 'revenue-by-batch':
        ({ workbook, filename } = await exportRevenueByBatch());
        break;
      case 'product-list':
        ({ workbook, filename } = await exportProductList());
        break;
      case 'category-list':
        ({ workbook, filename } = await exportCategoryList());
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid export type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    // Generate XLSX buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ===== HELPER: Fetch & filter orders =====
async function getFilteredOrders(filterBatchId: number | null) {
  let allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  if (filterBatchId) {
    allOrders = allOrders.filter(o => o.batchId === filterBatchId);
  }
  return allOrders;
}

// Style helper: set column widths
function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

// ===== 1. EXPORT ALL ORDERS =====
async function exportAllOrders(filterBatchId: number | null) {
  const allOrders = await getFilteredOrders(filterBatchId);

  const data = allOrders.map(order => {
    const items = (order.items as any[]) || [];
    const itemList = items.map((i: any) => `${i.productName} ×${i.quantity}`).join(', ');
    return {
      'No. Order': order.orderNumber,
      'Nama Pelanggan': order.customerName,
      'No. WhatsApp': order.whatsappNumber,
      'Kantor': order.kelompok,
      'Item Pesanan': itemList,
      'Total': order.totalAmount || 0,
      'Status': statusLabels[order.status] || order.status,
      'WA Sent': order.waSent ? 'Ya' : 'Tidak',
      'Tanggal': formatDate(order.createdAt),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  setColWidths(ws, [18, 22, 18, 18, 40, 16, 14, 10, 22]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Semua Pesanan');

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Semua_Pesanan_${dateStr}.xlsx` };
}

// ===== 2. EXPORT PENDING ORDERS =====
async function exportPendingOrders(filterBatchId: number | null) {
  const allOrders = await getFilteredOrders(filterBatchId);
  const pending = allOrders.filter(o => o.status === 'pending');

  const data = pending.map(order => {
    const items = (order.items as any[]) || [];
    const itemList = items.map((i: any) => `${i.productName} ×${i.quantity}`).join(', ');
    return {
      'No. Order': order.orderNumber,
      'Nama Pelanggan': order.customerName,
      'No. WhatsApp': order.whatsappNumber,
      'Kantor': order.kelompok,
      'Item Pesanan': itemList,
      'Total': order.totalAmount || 0,
      'Tanggal Order': formatDate(order.createdAt),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  setColWidths(ws, [18, 22, 18, 18, 40, 16, 22]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pesanan Pending');

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Pesanan_Pending_${dateStr}.xlsx` };
}

// ===== 3. EXPORT ORDERS BY STATUS =====
async function exportOrdersByStatus(filterBatchId: number | null, statusFilter: string | null) {
  const allOrders = await getFilteredOrders(filterBatchId);

  const wb = XLSX.utils.book_new();
  const statusGroups = statusFilter
    ? [statusFilter]
    : ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];

  for (const status of statusGroups) {
    const filtered = allOrders.filter(o => o.status === status);
    const data = filtered.map(order => {
      const items = (order.items as any[]) || [];
      const itemList = items.map((i: any) => `${i.productName} ×${i.quantity}`).join(', ');
      return {
        'No. Order': order.orderNumber,
        'Nama Pelanggan': order.customerName,
        'No. WhatsApp': order.whatsappNumber,
        'Kantor': order.kelompok,
        'Item Pesanan': itemList,
        'Total': order.totalAmount || 0,
        'Tanggal': formatDate(order.createdAt),
      };
    });

    const ws = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ 'Info': 'Tidak ada data' }]);
    setColWidths(ws, [18, 22, 18, 18, 40, 16, 22]);
    const sheetName = statusLabels[status] || status;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Pesanan_Per_Status_${dateStr}.xlsx` };
}

// ===== 4. EXPORT ORDERS BY OFFICE =====
async function exportOrdersByOffice(filterBatchId: number | null) {
  const allOrders = await getFilteredOrders(filterBatchId);
  const officeMap = new Map<string, typeof allOrders>();

  for (const order of allOrders) {
    const office = order.kelompok;
    if (!officeMap.has(office)) officeMap.set(office, []);
    officeMap.get(office)!.push(order);
  }

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = Array.from(officeMap.entries()).map(([office, orderList]) => ({
    'Kantor': office,
    'Total Pesanan': orderList.length,
    'Pending': orderList.filter(o => o.status === 'pending').length,
    'Dibayar': orderList.filter(o => ['confirmed', 'processing', 'completed'].includes(o.status)).length,
    'Total Pendapatan': orderList
      .filter(o => ['confirmed', 'processing', 'completed'].includes(o.status))
      .reduce((s, o) => s + (o.totalAmount || 0), 0),
  }));

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  setColWidths(summaryWs, [22, 16, 12, 12, 20]);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan');

  // Per-office sheets
  for (const [office, orderList] of officeMap) {
    const data = orderList.map(order => {
      const items = (order.items as any[]) || [];
      const itemList = items.map((i: any) => `${i.productName} ×${i.quantity}`).join(', ');
      return {
        'No. Order': order.orderNumber,
        'Nama': order.customerName,
        'No. WA': order.whatsappNumber,
        'Item': itemList,
        'Total': order.totalAmount || 0,
        'Status': statusLabels[order.status] || order.status,
        'Tanggal': formatDate(order.createdAt),
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    setColWidths(ws, [18, 22, 18, 40, 16, 14, 22]);
    // Sheet name max 31 chars
    const sheetName = office.length > 31 ? office.slice(0, 31) : office;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Pesanan_Per_Kantor_${dateStr}.xlsx` };
}

// ===== 5. EXPORT PRODUCT RECAP =====
async function exportProductRecap(filterBatchId: number | null) {
  const allOrders = await getFilteredOrders(filterBatchId);
  const confirmed = allOrders.filter(o => ['confirmed', 'processing', 'completed'].includes(o.status));

  const itemMap: Record<string, { name: string; type: string; quantity: number; revenue: number }> = {};
  for (const order of confirmed) {
    const items = (order.items as any[]) || [];
    for (const item of items) {
      const key = item.productName || 'Unknown';
      if (!itemMap[key]) {
        itemMap[key] = { name: key, type: item.productType || 'satuan', quantity: 0, revenue: 0 };
      }
      itemMap[key].quantity += item.quantity || 0;
      itemMap[key].revenue += (item.quantity || 0) * (item.price || 0);
    }
  }

  const sorted = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity);
  const data = sorted.map((item, idx) => ({
    '#': idx + 1,
    'Nama Produk': item.name,
    'Tipe': item.type === 'paket' ? 'Paket' : 'Satuan',
    'Jumlah Terjual': item.quantity,
    'Total Pendapatan': item.revenue,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  setColWidths(ws, [6, 30, 12, 18, 20]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Produk');

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Rekap_Produk_${dateStr}.xlsx` };
}

// ===== 6. EXPORT SHOPPING DETAIL =====
async function exportShoppingDetail(filterBatchId: number | null) {
  const allOrders = await getFilteredOrders(filterBatchId);
  const confirmed = allOrders.filter(o => ['confirmed', 'processing', 'completed'].includes(o.status));

  const shopMap: Record<string, { name: string; totalQty: number; sources: Record<string, number> }> = {};
  for (const order of confirmed) {
    const items = (order.items as any[]) || [];
    for (const item of items) {
      const orderQty = item.quantity || 1;
      if (item.productType === 'paket' && item.items && Array.isArray(item.items)) {
        for (const subStr of item.items) {
          const m = subStr.match(/^(.+?)\s*\((\d+)\s*pcs\)\s*$/i);
          if (m) {
            const sName = m[1].trim();
            const sQty = parseInt(m[2]) * orderQty;
            if (!shopMap[sName]) shopMap[sName] = { name: sName, totalQty: 0, sources: {} };
            shopMap[sName].totalQty += sQty;
            const src = item.productName || 'Paket';
            shopMap[sName].sources[src] = (shopMap[sName].sources[src] || 0) + sQty;
          }
        }
      } else if (item.productType === 'satuan') {
        const nm = item.productName || 'Unknown';
        if (!shopMap[nm]) shopMap[nm] = { name: nm, totalQty: 0, sources: {} };
        shopMap[nm].totalQty += orderQty;
        shopMap[nm].sources['Satuan'] = (shopMap[nm].sources['Satuan'] || 0) + orderQty;
      }
    }
  }

  const sorted = Object.values(shopMap).sort((a, b) => b.totalQty - a.totalQty);
  const data = sorted.map((item, idx) => ({
    '#': idx + 1,
    'Nama Produk': item.name,
    'Total Qty': item.totalQty,
    'Sumber': Object.entries(item.sources).map(([src, qty]) => `${src}: ${qty}`).join(', '),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  setColWidths(ws, [6, 30, 14, 50]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Belanja');

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Rekap_Belanja_Detail_${dateStr}.xlsx` };
}

// ===== 7. EXPORT REVENUE SUMMARY =====
async function exportRevenueSummary(filterBatchId: number | null) {
  const allOrders = await getFilteredOrders(filterBatchId);

  const pending = allOrders.filter(o => o.status === 'pending');
  const confirmed = allOrders.filter(o => o.status === 'confirmed');
  const processing = allOrders.filter(o => o.status === 'processing');
  const completed = allOrders.filter(o => o.status === 'completed');
  const cancelled = allOrders.filter(o => o.status === 'cancelled');

  const sumAmount = (arr: typeof allOrders) => arr.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const data = [
    { 'Kategori': 'Menunggu (Pending)', 'Jumlah Pesanan': pending.length, 'Total Nilai': sumAmount(pending) },
    { 'Kategori': 'Dibayar (Confirmed)', 'Jumlah Pesanan': confirmed.length, 'Total Nilai': sumAmount(confirmed) },
    { 'Kategori': 'Diproses (Processing)', 'Jumlah Pesanan': processing.length, 'Total Nilai': sumAmount(processing) },
    { 'Kategori': 'Selesai (Completed)', 'Jumlah Pesanan': completed.length, 'Total Nilai': sumAmount(completed) },
    { 'Kategori': 'Dibatalkan (Cancelled)', 'Jumlah Pesanan': cancelled.length, 'Total Nilai': sumAmount(cancelled) },
    { 'Kategori': '', 'Jumlah Pesanan': null as any, 'Total Nilai': null as any },
    { 'Kategori': 'TOTAL PENDAPATAN (Dibayar+Proses+Selesai)', 'Jumlah Pesanan': confirmed.length + processing.length + completed.length, 'Total Nilai': sumAmount([...confirmed, ...processing, ...completed]) },
    { 'Kategori': 'GRAND TOTAL (Semua)', 'Jumlah Pesanan': allOrders.length, 'Total Nilai': sumAmount(allOrders) },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  setColWidths(ws, [40, 18, 20]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Pendapatan');

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Laporan_Pendapatan_${dateStr}.xlsx` };
}

// ===== 8. EXPORT REVENUE BY OFFICE =====
async function exportRevenueByOffice(filterBatchId: number | null) {
  const allOrders = await getFilteredOrders(filterBatchId);
  const officeMap = new Map<string, typeof allOrders>();

  for (const order of allOrders) {
    const office = order.kelompok;
    if (!officeMap.has(office)) officeMap.set(office, []);
    officeMap.get(office)!.push(order);
  }

  const data = Array.from(officeMap.entries())
    .map(([office, orderList]) => {
      const pendingRev = orderList.filter(o => o.status === 'pending').reduce((s, o) => s + (o.totalAmount || 0), 0);
      const paidRev = orderList.filter(o => ['confirmed', 'processing', 'completed'].includes(o.status)).reduce((s, o) => s + (o.totalAmount || 0), 0);
      return {
        'Kantor': office,
        'Total Pesanan': orderList.length,
        'Pesanan Pending': orderList.filter(o => o.status === 'pending').length,
        'Pesanan Dibayar': orderList.filter(o => ['confirmed', 'processing', 'completed'].includes(o.status)).length,
        'Revenue Pending': pendingRev,
        'Revenue Dibayar': paidRev,
        'Total Revenue': pendingRev + paidRev,
      };
    })
    .sort((a, b) => b['Total Revenue'] - a['Total Revenue']);

  const ws = XLSX.utils.json_to_sheet(data);
  setColWidths(ws, [22, 16, 16, 16, 18, 18, 18]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pendapatan Per Kantor');

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Pendapatan_Per_Kantor_${dateStr}.xlsx` };
}

// ===== 9. EXPORT PRODUCT LIST =====
async function exportProductList() {
  const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));

  const data = allProducts.map(p => ({
    'ID': p.id,
    'Nama Produk': p.name,
    'Tipe': p.type === 'paket' ? 'Paket' : 'Satuan',
    'Harga': p.price,
    'Kategori': p.category || '-',
    'Min Order': p.minOrder,
    'Status': p.isActive ? 'Aktif' : 'Nonaktif',
    'Isi Paket': p.items ? (p.items as string[]).join(', ') : '-',
    'Deskripsi': p.description || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  setColWidths(ws, [6, 30, 12, 14, 16, 12, 12, 50, 40]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Produk');

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Daftar_Produk_${dateStr}.xlsx` };
}

// ===== 10. EXPORT CATEGORY LIST =====
async function exportCategoryList() {
  const allCategories = await db.select().from(categories);

  const data = allCategories.map(c => ({
    'ID': c.id,
    'Nama Kategori': c.name,
    'Emoji': c.emoji,
    'Restricted': c.restricted ? 'Ya' : 'Tidak',
    'Sort Order': c.sortOrder,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  setColWidths(ws, [6, 22, 10, 14, 14]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Kategori');

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Daftar_Kategori_${dateStr}.xlsx` };
}

// ===== HELPER: Build product recap data from orders =====
function buildProductRecapData(orderList: any[]) {
  const paidStatuses = ['confirmed', 'processing', 'completed'];
  const confirmed = orderList.filter(o => paidStatuses.includes(o.status));
  const itemMap: Record<string, { name: string; type: string; quantity: number; revenue: number }> = {};
  for (const order of confirmed) {
    const items = (order.items as any[]) || [];
    for (const item of items) {
      const key = item.productName || 'Unknown';
      if (!itemMap[key]) {
        itemMap[key] = { name: key, type: item.productType || 'satuan', quantity: 0, revenue: 0 };
      }
      itemMap[key].quantity += item.quantity || 0;
      itemMap[key].revenue += (item.quantity || 0) * (item.price || 0);
    }
  }
  return Object.values(itemMap).sort((a, b) => b.quantity - a.quantity);
}

function recapToSheet(sorted: { name: string; type: string; quantity: number; revenue: number }[]) {
  const data = sorted.map((item, idx) => ({
    '#': idx + 1,
    'Nama Produk': item.name,
    'Tipe': item.type === 'paket' ? 'Paket' : 'Satuan',
    'Jumlah Terjual': item.quantity,
    'Total Pendapatan': item.revenue,
  }));
  const ws = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ 'Info': 'Tidak ada data' }]);
  setColWidths(ws, [6, 30, 12, 18, 20]);
  return ws;
}

// ===== 11. EXPORT PRODUCT RECAP PER BATCH =====
async function exportProductRecapByBatch() {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const allBatches = await db.select().from(batches).orderBy(desc(batches.batchNumber));

  const wb = XLSX.utils.book_new();

  // Summary sheet across all batches
  const allRecap = buildProductRecapData(allOrders);
  const summaryWs = recapToSheet(allRecap);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Semua Batch');

  // Per-batch sheets
  for (const batch of allBatches) {
    const batchOrders = allOrders.filter(o => o.batchId === batch.id);
    const recap = buildProductRecapData(batchOrders);
    const ws = recapToSheet(recap);
    const sheetName = `Batch ${batch.batchNumber}${batch.name && batch.name !== `Batch ${batch.batchNumber}` ? ' - ' + batch.name : ''}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Rekap_Produk_Per_Batch_${dateStr}.xlsx` };
}

// ===== 12. EXPORT PRODUCT RECAP PER OFFICE =====
async function exportProductRecapByOffice(filterBatchId: number | null) {
  const allOrders = await getFilteredOrders(filterBatchId);
  const officeMap = new Map<string, typeof allOrders>();

  for (const order of allOrders) {
    const office = order.kelompok;
    if (!officeMap.has(office)) officeMap.set(office, []);
    officeMap.get(office)!.push(order);
  }

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const allRecap = buildProductRecapData(allOrders);
  const summaryWs = recapToSheet(allRecap);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Semua Kantor');

  // Per-office sheets
  for (const [office, orderList] of officeMap) {
    const recap = buildProductRecapData(orderList);
    const ws = recapToSheet(recap);
    XLSX.utils.book_append_sheet(wb, ws, office.slice(0, 31));
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Rekap_Produk_Per_Kantor_${dateStr}.xlsx` };
}

// ===== 13. EXPORT REVENUE BY BATCH =====
async function exportRevenueByBatch() {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const allBatches = await db.select().from(batches).orderBy(desc(batches.batchNumber));

  const paidStatuses = ['confirmed', 'processing', 'completed'];

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = allBatches.map(batch => {
    const batchOrders = allOrders.filter(o => o.batchId === batch.id);
    const pendingRev = batchOrders.filter(o => o.status === 'pending').reduce((s, o) => s + (o.totalAmount || 0), 0);
    const paidRev = batchOrders.filter(o => paidStatuses.includes(o.status)).reduce((s, o) => s + (o.totalAmount || 0), 0);
    return {
      'Batch': `Batch ${batch.batchNumber}${batch.name && batch.name !== `Batch ${batch.batchNumber}` ? ' - ' + batch.name : ''}`,
      'Total Pesanan': batchOrders.length,
      'Pesanan Pending': batchOrders.filter(o => o.status === 'pending').length,
      'Pesanan Dibayar': batchOrders.filter(o => paidStatuses.includes(o.status)).length,
      'Revenue Pending': pendingRev,
      'Revenue Dibayar': paidRev,
      'Total Revenue': pendingRev + paidRev,
    };
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryData.length > 0 ? summaryData : [{ 'Info': 'Tidak ada data batch' }]);
  setColWidths(summaryWs, [28, 16, 16, 16, 18, 18, 18]);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan');

  // Per-batch detail sheets
  for (const batch of allBatches) {
    const batchOrders = allOrders.filter(o => o.batchId === batch.id);
    const pending = batchOrders.filter(o => o.status === 'pending');
    const confirmed = batchOrders.filter(o => o.status === 'confirmed');
    const processing = batchOrders.filter(o => o.status === 'processing');
    const completed = batchOrders.filter(o => o.status === 'completed');
    const cancelled = batchOrders.filter(o => o.status === 'cancelled');
    const sumAmount = (arr: typeof allOrders) => arr.reduce((s, o) => s + (o.totalAmount || 0), 0);

    const data = [
      { 'Kategori': 'Menunggu (Pending)', 'Jumlah Pesanan': pending.length, 'Total Nilai': sumAmount(pending) },
      { 'Kategori': 'Dibayar (Confirmed)', 'Jumlah Pesanan': confirmed.length, 'Total Nilai': sumAmount(confirmed) },
      { 'Kategori': 'Diproses (Processing)', 'Jumlah Pesanan': processing.length, 'Total Nilai': sumAmount(processing) },
      { 'Kategori': 'Selesai (Completed)', 'Jumlah Pesanan': completed.length, 'Total Nilai': sumAmount(completed) },
      { 'Kategori': 'Dibatalkan (Cancelled)', 'Jumlah Pesanan': cancelled.length, 'Total Nilai': sumAmount(cancelled) },
      { 'Kategori': '', 'Jumlah Pesanan': null as any, 'Total Nilai': null as any },
      { 'Kategori': 'TOTAL PENDAPATAN', 'Jumlah Pesanan': confirmed.length + processing.length + completed.length, 'Total Nilai': sumAmount([...confirmed, ...processing, ...completed]) },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    setColWidths(ws, [30, 18, 20]);
    const sheetName = `Batch ${batch.batchNumber}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  return { workbook: wb, filename: `Pendapatan_Per_Batch_${dateStr}.xlsx` };
}
