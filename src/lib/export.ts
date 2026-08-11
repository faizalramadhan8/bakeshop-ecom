// export.ts — Sprint 6 Chunk 11 (4 Aug 2026).
// Excel export multi-sheet untuk admin ecom (Orders / Complaints / Customers).
// Pola mirror bakeshop-fe POS `exportOrderReport`, adapted untuk shape ecom.
//
// Dipakai dari:
//   - AdminPesananList — export list order (with filter date range)
//   - AdminKomplain    — export daftar komplain + refund
//   - AdminCustomers   — export daftar customer + LTV metrics
//
// **Lazy-load xlsx** — library ~300kb minified, hanya butuh saat admin klik
// tombol Export. Cegah initial admin bundle bloat. Import via `await import()`
// di masing-masing export function, cache-nya di-handle browser HTTP cache.

import type {
  EcomAdminOrderListItem, ComplaintAdmin, EcomAdminCustomerListItem,
  EcomRefundResponse,
} from "./api";
type XlsxModule = typeof import("xlsx");

// Cache module setelah first load — repeat export tidak trigger network.
let xlsxPromise: Promise<XlsxModule> | null = null;
function loadXlsx(): Promise<XlsxModule> {
  if (!xlsxPromise) xlsxPromise = import("xlsx");
  return xlsxPromise;
}

// Common file-download helper — trigger browser download.
function downloadWorkbook(XLSX: XlsxModule, wb: import("xlsx").WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

// Format tanggal untuk filename (YYYY-MM-DD).
function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Format Rupiah untuk kolom Excel — number format, bukan text supaya bisa
// SUM/AVG di Excel. Kita simpan raw number, cell format applied di sheet.
function money(n: number | null | undefined): number {
  return typeof n === "number" ? Math.round(n) : 0;
}

// Format ISO datetime → "DD/MM/YYYY HH:MM" (locale ID). Bu Santi lebih familiar.
function fmtDT(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Apply width otomatis per kolom berdasar max character length header + rows.
// Cegah kolom "Nomor HP" ke-truncate atau kolom "Total" jadi ###.
function autoWidth<T extends Record<string, unknown>>(rows: T[], headers: (keyof T)[]) {
  return headers.map((key) => {
    const headerLen = String(key).length;
    const maxCellLen = rows.reduce((max, r) => {
      const v = r[key];
      const len = v == null ? 0 : String(v).length;
      return Math.max(max, len);
    }, 0);
    return { wch: Math.min(Math.max(headerLen, maxCellLen) + 2, 40) };
  });
}

// ─── Orders export ────────────────────────────────────────────────────

export async function exportOrdersXlsx(
  orders: EcomAdminOrderListItem[],
  filenamePrefix = "pesanan-ecom"
): Promise<void> {
  const XLSX = await loadXlsx();
  const rows = orders.map((o) => ({
    "Order ID":      o.id,
    "Tanggal":       fmtDT(o.created_at),
    "Status":        o.ecom_status,
    "Penerima":      o.recipient || "",
    "Kurir":         o.courier || "",
    "No Resi":       o.awb || "",
    "Metode Bayar":  o.payment_method || "",
    "Jumlah Item":   o.item_count,
    "Ongkir":        money(o.shipping_cost),
    "Subtotal":      money(o.total - o.shipping_cost),
    "Total":         money(o.total),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoWidth(rows, [
    "Order ID", "Tanggal", "Status", "Penerima", "Kurir", "No Resi",
    "Metode Bayar", "Jumlah Item", "Ongkir", "Subtotal", "Total",
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pesanan");

  // Summary sheet — total revenue + count per status untuk quick overview.
  const byStatus: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => {
    if (!byStatus[o.ecom_status]) byStatus[o.ecom_status] = { count: 0, revenue: 0 };
    byStatus[o.ecom_status].count++;
    if (o.ecom_status === "completed") {
      byStatus[o.ecom_status].revenue += o.total;
    }
  });
  const summary = Object.entries(byStatus).map(([status, s]) => ({
    "Status": status,
    "Jumlah Order": s.count,
    "Revenue (completed only)": money(s.revenue),
  }));
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary["!cols"] = autoWidth(summary, ["Status", "Jumlah Order", "Revenue (completed only)"]);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

  downloadWorkbook(XLSX, wb, `${filenamePrefix}-${todayStamp()}.xlsx`);
}

// ─── Complaints export ────────────────────────────────────────────────

export async function exportComplaintsXlsx(
  complaints: ComplaintAdmin[],
  refundsByComplaintID: Record<string, EcomRefundResponse[]> = {},
  filenamePrefix = "komplain-ecom"
): Promise<void> {
  const XLSX = await loadXlsx();
  const rows = complaints.map((c) => {
    const refunds = refundsByComplaintID[c.id] || [];
    const totalRefund = refunds.reduce((sum, r) => sum + r.amount, 0);
    return {
      "Tanggal":     fmtDT(c.created_at),
      "Order ID":    c.order_id,
      "Customer":    c.user_name || "",
      "Alasan":      c.reason_label,
      "Deskripsi":   c.description,
      "Status":      c.status,
      "Balasan":     c.admin_reply || "",
      "Selesai":     fmtDT(c.resolved_at),
      "Total Refund": money(totalRefund),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoWidth(rows, [
    "Tanggal", "Order ID", "Customer", "Alasan", "Deskripsi",
    "Status", "Balasan", "Selesai", "Total Refund",
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Komplain");

  // Refund detail sheet — 1 row per refund event (bisa multi per komplain).
  const refundRows: Array<Record<string, unknown>> = [];
  Object.entries(refundsByComplaintID).forEach(([complaintID, refunds]) => {
    const complaint = complaints.find((c) => c.id === complaintID);
    refunds.forEach((r) => {
      refundRows.push({
        "Tanggal":     fmtDT(r.refunded_at),
        "Order ID":    r.order_id,
        "Customer":    complaint?.user_name || "",
        "Metode":      r.method,
        "Nominal":     money(r.amount),
        "Catatan":     r.note || "",
        "Oleh Admin":  r.refunded_by_name || "",
      });
    });
  });
  if (refundRows.length > 0) {
    const wsRefund = XLSX.utils.json_to_sheet(refundRows);
    wsRefund["!cols"] = autoWidth(refundRows, [
      "Tanggal", "Order ID", "Customer", "Metode", "Nominal", "Catatan", "Oleh Admin",
    ]);
    XLSX.utils.book_append_sheet(wb, wsRefund, "Refund");
  }

  downloadWorkbook(XLSX, wb, `${filenamePrefix}-${todayStamp()}.xlsx`);
}

// ─── Customers export ─────────────────────────────────────────────────

export async function exportCustomersXlsx(
  customers: EcomAdminCustomerListItem[],
  filenamePrefix = "customer-ecom"
): Promise<void> {
  const XLSX = await loadXlsx();
  const rows = customers.map((c) => ({
    "Nama":            c.full_name,
    "Email":           c.email,
    "No HP":           c.phone,
    "Status":          c.is_active ? "Aktif" : "Diblokir",
    "Total Order":     c.order_count,
    "Total Spent":     money(c.total_spent),
    "Order Terakhir":  fmtDT(c.last_order_date),
    "Terdaftar":       fmtDT(c.created_at),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoWidth(rows, [
    "Nama", "Email", "No HP", "Status", "Total Order",
    "Total Spent", "Order Terakhir", "Terdaftar",
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customer");

  // Top-spender sheet — sorted by total_spent desc, top 50.
  const topSpender = [...customers]
    .filter((c) => c.total_spent > 0)
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 50)
    .map((c, i) => ({
      "Rank":         i + 1,
      "Nama":         c.full_name,
      "No HP":        c.phone,
      "Total Order":  c.order_count,
      "Total Spent":  money(c.total_spent),
    }));
  if (topSpender.length > 0) {
    const wsTop = XLSX.utils.json_to_sheet(topSpender);
    wsTop["!cols"] = autoWidth(topSpender, ["Rank", "Nama", "No HP", "Total Order", "Total Spent"]);
    XLSX.utils.book_append_sheet(wb, wsTop, "Top 50 Spender");
  }

  downloadWorkbook(XLSX, wb, `${filenamePrefix}-${todayStamp()}.xlsx`);
}
