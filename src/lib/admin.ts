import { apiFetch } from "./apiFetch";

export type AdminUser = {
  id: string;
  userId?: number | null;
  name: string | null;
  phone: string | null;
  role: string;
};

export type AdminOrderItem = {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type AdminOrder = {
  id: string;
  status: string;
  createdAt: string | null;
  customer: { name?: string; phone?: string; email?: string | null };
  delivery: { address?: string; city?: string; postalCode?: string | null; notes?: string | null };
  payment: { method?: string };
  items: AdminOrderItem[];
  subtotal: number;
  total: number;
};

export type AdminStats = {
  total: number;
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  revenue: number;
};

export class AdminAuthError extends Error {}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) throw new AdminAuthError("Not authenticated");
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

const j = (init?: RequestInit) => ({ credentials: "include" as const, ...(init || {}) });
const json = (body: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify(body),
});

// ── Auth ─────────────────────────────────────────────────────────────────
export async function adminLogin(phone: string, password: string) {
  const res = await apiFetch("/api/admin/login", json({ phone, password }));
  return handle<{ ok: true; admin: AdminUser }>(res);
}
export async function adminLogout() {
  await apiFetch("/api/admin/logout", { method: "POST", credentials: "include" });
}
export async function adminMe() {
  return handle<{ admin: AdminUser }>(await apiFetch("/api/admin/me", j()));
}

// ── Website orders ───────────────────────────────────────────────────────
export async function adminListOrders(status?: string) {
  const url = status
    ? `/api/admin/orders?status=${encodeURIComponent(status)}`
    : "/api/admin/orders";
  return handle<{ orders: AdminOrder[]; count: number }>(await apiFetch(url, j()));
}
export async function adminGetOrder(id: string) {
  return handle<AdminOrder>(await apiFetch(`/api/admin/orders/${encodeURIComponent(id)}`, j()));
}
export async function adminUpdateOrderStatus(id: string, status: string) {
  return handle<AdminOrder>(await apiFetch(`/api/admin/orders/${encodeURIComponent(id)}`, json({ status }, "PATCH")));
}
export async function adminGetStats() {
  return handle<AdminStats>(await apiFetch("/api/admin/stats", j()));
}

// ── Wholesale (mobile-app) orders ────────────────────────────────────────
export type WholesaleOrderItem = {
  productId: number; productName: string; quantity: number; unitPrice: number;
  totalPoints: number; bonusPoints: number;
  totalValue: number; discountPercent: number; discountedValue: number;
};
export type WholesaleOrder = {
  id: number | string; docId: string; status: string; createdAt: string | null;
  retailerId: number | null; retailerName: string | null; retailerPhone: string | null;
  salesmanId: number | null; salesmanName: string | null; salesmanPhone: string | null;
  billDiscountPercent: number;
  originalTotal: number; subtotal: number; billDiscountAmount: number; finalAmount: number;
  itemCount: number;
};
export type WholesaleOrderDetail = WholesaleOrder & {
  retailerCity: string | null;
  items: WholesaleOrderItem[];
};
export async function adminListWholesaleOrders(status?: string) {
  const url = status ? `/api/admin/wholesale-orders?status=${encodeURIComponent(status)}` : "/api/admin/wholesale-orders";
  return handle<{ orders: WholesaleOrder[]; count: number }>(await apiFetch(url, j()));
}
export async function adminGetWholesaleOrder(docId: string) {
  return handle<WholesaleOrderDetail>(await apiFetch(`/api/admin/wholesale-orders/${encodeURIComponent(docId)}`, j()));
}
export async function adminUpdateWholesaleOrderStatus(docId: string, status: string) {
  return handle<{ ok: true; status: string }>(
    await apiFetch(`/api/admin/wholesale-orders/${encodeURIComponent(docId)}`, json({ status }, "PATCH")),
  );
}

// ── Settings ─────────────────────────────────────────────────────────────
export type AdminPermissions = {
  tab_dashboard: boolean; tab_products: boolean; tab_users: boolean; tab_payments: boolean;
  card_create_qr: boolean; card_orders: boolean; card_claims: boolean;
  card_create_ads: boolean; card_create_text: boolean;
  card_payments: boolean; card_commission: boolean;
};
export async function adminMyPermissions() {
  return handle<AdminPermissions>(await apiFetch("/api/admin/admin-user-settings/me", j()));
}
export async function adminGlobalSettings() {
  return handle<Record<string, boolean>>(await apiFetch("/api/admin/admin-settings", j()));
}
export async function adminUpdateGlobalSettings(s: Record<string, boolean>) {
  return handle<Record<string, boolean>>(await apiFetch("/api/admin/admin-settings", json(s, "PUT")));
}
export async function adminListAdminSettings() {
  return handle<Array<{ id: number; name: string | null; phone: string; role: string; settings: AdminPermissions }>>(
    await apiFetch("/api/admin/admin-user-settings", j()),
  );
}
export async function adminUpdateAdminSettings(userId: number, s: Partial<AdminPermissions>) {
  return handle<AdminPermissions>(await apiFetch(`/api/admin/admin-user-settings/${userId}`, json(s, "PUT")));
}

// ── Products (admin) ─────────────────────────────────────────────────────
export type AdminProduct = {
  id: number; name: string; points: number; salesPrice: number; websitePrice: number | null;
  category: string; productNumber: string | null; vehicleManufacturer: string | null;
  imageUrl: string | null; diagramUrl: string | null; createdAt: string | null;
};
export async function adminListProducts() {
  return handle<AdminProduct[]>(await apiFetch("/api/products/admin", j()));
}
export async function adminCreateProduct(body: Partial<AdminProduct> & { imageBase64?: string | null; diagramBase64?: string | null }) {
  return handle<AdminProduct>(await apiFetch("/api/products/admin", json(body)));
}
export async function adminUpdateProduct(id: number, body: Partial<AdminProduct> & { imageBase64?: string | null; diagramBase64?: string | null }) {
  return handle<AdminProduct>(await apiFetch(`/api/products/admin/${id}`, json(body, "PUT")));
}
export async function adminDeleteProduct(id: number) {
  return handle<{ success: true }>(await apiFetch(`/api/products/admin/${id}`, { method: "DELETE", credentials: "include" }));
}

// ── Users ────────────────────────────────────────────────────────────────
export type AppUser = {
  id: number; phone: string; email: string | null; role: string;
  name: string | null; city: string | null; regionId: number | null;
  points: number; createdAt: string | null;
};
export async function adminListUsers() {
  return handle<AppUser[]>(await apiFetch("/api/admin/users", j()));
}
export async function adminCreateUser(body: { phone: string; password: string; role: string; name?: string; email?: string; city?: string; regionId?: number | null }) {
  return handle<AppUser>(await apiFetch("/api/admin/users", json(body)));
}
export async function adminUpdateUser(id: number, body: Partial<AppUser> & { password?: string }) {
  return handle<AppUser>(await apiFetch(`/api/admin/users/${id}`, json(body, "PUT")));
}
export async function adminDeleteUser(id: number) {
  return handle<{ success: true }>(await apiFetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" }));
}

// ── QR Codes ─────────────────────────────────────────────────────────────
export type QRCode = {
  id: number; qrNumber: string; productId: number; productName: string;
  points: number; status: string; createdAt: string | null;
};
export async function adminListQRCodes() {
  return handle<QRCode[]>(await apiFetch("/api/admin/qr-codes", j()));
}
export async function adminCreateQRCode(body: { qrNumber: string; productId: number }) {
  return handle<QRCode>(await apiFetch("/api/admin/qr-codes", json(body)));
}

// ── Claims ───────────────────────────────────────────────────────────────
export type Claim = {
  id: number; pointsClaimed: number; verifiedPoints: number; unverifiedPoints: number;
  status: string; claimedAt: string | null;
  userName: string; userPhone: string | null; userRole: string; userId: number;
  totalScans: number; verifiedScans: number; missingScans: number;
};
export type ClaimScan = {
  id: number; pointsEarned: number; scannedAt: string | null;
  adminVerified: boolean | null; qrNumber: string; productName: string;
};
export async function adminListClaims() {
  return handle<Claim[]>(await apiFetch("/api/admin/claims", j()));
}
export async function adminClaimScans(id: number) {
  return handle<ClaimScan[]>(await apiFetch(`/api/admin/claims/${id}/scans`, j()));
}
export async function adminVerifyQRForClaim(id: number, qrNumber: string) {
  return handle<{ scanId: number; pointsEarned: number; verifiedPoints: number }>(
    await apiFetch(`/api/admin/claims/${id}/verify-qr`, json({ qrNumber })),
  );
}
export async function adminMarkScanMissing(id: number, scanId: number) {
  return handle<{ scanId: number; verifiedPoints: number }>(
    await apiFetch(`/api/admin/claims/${id}/mark-missing`, json({ scanId })),
  );
}
export async function adminMarkClaimReceived(id: number) {
  return handle<Claim>(await apiFetch(`/api/admin/claims/${id}`, json({ status: "received" }, "PATCH")));
}

// ── Payments ─────────────────────────────────────────────────────────────
export type RetailerBalance = {
  id: number; name: string | null; phone: string; city: string | null;
  totalOrdered: number; totalPaid: number; outstanding: number;
};
export type Payment = {
  id: number; amount: number; notes: string | null; status: string;
  verifiedAt: string | null; verifiedByName: string | null;
  createdAt: string | null;
  retailerId: number; retailerName: string | null; retailerPhone: string | null;
  receivedBy: number | null; collectorName: string | null; collectorPhone: string | null;
};
export async function adminRetailerBalances() {
  return handle<RetailerBalance[]>(await apiFetch("/api/admin/payments/retailer-balances", j()));
}
export async function adminPendingPaymentCount() {
  return handle<{ count: number }>(await apiFetch("/api/admin/payments/pending-count", j()));
}
export async function adminListPayments() {
  return handle<Payment[]>(await apiFetch("/api/admin/payments", j()));
}
export async function adminCreatePayment(body: { retailerId: number; amount: number; notes?: string }) {
  return handle<Payment>(await apiFetch("/api/admin/payments", json(body)));
}
export async function adminVerifyPayment(id: number) {
  return handle<{ id: number; status: string; verifiedAt: string }>(
    await apiFetch(`/api/admin/payments/${id}/verify`, json({}, "PATCH")),
  );
}

// ── Commission ───────────────────────────────────────────────────────────
export type SalesmanCommissionRow = {
  salesmanId: number; name: string | null; phone: string;
  totalOrders: number; confirmedOrders: number;
  totalSalesValue: number; confirmedSalesValue: number;
  totalBonus: number; confirmedBonus: number;
  currentMonthOrders: number; currentMonthSalesValue: number;
};
export type MonthlyTotals = {
  months: Array<{
    year: number; month: number; label: string;
    totalSales: number; orderCount: number;
    salesmen: Array<{ salesmanId: number; name: string | null; phone: string; salesAmount: number; orderCount: number; pct: number }>;
  }>;
};
export type SalesmanMonths = {
  salesmanId: number; salesmanName: string | null; salesmanPhone: string;
  months: Array<{
    year: number; month: number; orderCount: number; salesAmount: number;
    alreadyApproved: boolean; approvedAt?: string; commissionAmount?: number;
    canApprove: boolean;
  }>;
};
export type SalesmanSales = {
  salesmanId: number; salesmanName: string | null; salesmanPhone: string;
  periodFrom: string; periodTo: string;
  salesAmount: number; orderCount: number;
  orders: Array<{ id: number; createdAt: string | null; retailerName: string | null; retailerPhone: string | null; totalValue: number }>;
  alreadyApproved: boolean; approvedAt?: string; commissionAmount?: number; commissionPercentage?: number;
};
export async function adminSalesmanCommissions() {
  return handle<SalesmanCommissionRow[]>(await apiFetch("/api/admin/commission/salesman-commissions", j()));
}
export async function adminMonthlyTotals() {
  return handle<MonthlyTotals>(await apiFetch("/api/admin/commission/monthly-totals", j()));
}
export async function adminSalesmanMonths(salesmanId: number) {
  return handle<SalesmanMonths>(await apiFetch(`/api/admin/commission/salesman-months/${salesmanId}`, j()));
}
export async function adminSalesmanSales(salesmanId: number, year?: number, month?: number) {
  const qs = year && month ? `?year=${year}&month=${month}` : "";
  return handle<SalesmanSales>(await apiFetch(`/api/admin/commission/salesman-sales/${salesmanId}${qs}`, j()));
}
export async function adminApproveCommission(body: { salesmanId: number; percentage: number; salesAmount: number; periodFrom: string; periodTo?: string }) {
  return handle(await apiFetch("/api/admin/commission", json(body)));
}

// ── Ads ──────────────────────────────────────────────────────────────────
export type Ad = { id: number; mediaType: string; title: string | null; createdAt: string | null; mediaUrl: string };
export async function adminListAds() { return handle<Ad[]>(await apiFetch("/api/admin/ads", j())); }
export async function adminCreateAd(body: { imageBase64?: string; mediaType?: string; title?: string }) {
  return handle<Ad>(await apiFetch("/api/admin/ads", json(body)));
}
export async function adminUploadAdFile(file: File, mediaType: string, title?: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("mediaType", mediaType);
  if (title) fd.append("title", title);
  return handle<Ad>(await apiFetch("/api/admin/ads", { method: "POST", credentials: "include", body: fd }));
}
export async function adminDeleteAd(id: number) {
  return handle<{ success: true }>(await apiFetch(`/api/admin/ads/${id}`, { method: "DELETE", credentials: "include" }));
}

// ── Ticker ───────────────────────────────────────────────────────────────
export type TickerItem = { id: number; text: string; createdAt: string | null };
export async function adminListTicker() { return handle<TickerItem[]>(await apiFetch("/api/admin/ticker", j())); }
export async function adminAddTicker(text: string) {
  return handle<TickerItem>(await apiFetch("/api/admin/ticker", json({ text })));
}
export async function adminDeleteTicker(id: number) {
  return handle<{ success: true }>(await apiFetch(`/api/admin/ticker/${id}`, { method: "DELETE", credentials: "include" }));
}

// ── Regions ──────────────────────────────────────────────────────────────
export type Region = { id: number; name: string };
export async function adminListRegions() { return handle<Region[]>(await apiFetch("/api/admin/regions", j())); }
export async function adminCreateRegion(name: string) {
  return handle<Region>(await apiFetch("/api/admin/regions", json({ name })));
}
export async function adminDeleteRegion(id: number) {
  return handle<{ success: true }>(await apiFetch(`/api/admin/regions/${id}`, { method: "DELETE", credentials: "include" }));
}

// ── WhatsApp Contacts ────────────────────────────────────────────────────
export type WhatsappContacts = { mechanic: string; salesman: string; retailer: string };
export async function adminGetWhatsappContacts() {
  return handle<WhatsappContacts>(await apiFetch("/api/admin/whatsapp-contacts", j()));
}
export async function adminUpdateWhatsappContacts(c: Partial<WhatsappContacts>) {
  return handle<WhatsappContacts>(await apiFetch("/api/admin/whatsapp-contacts", json(c, "PUT")));
}

// ── Constants & helpers ──────────────────────────────────────────────────
export const STATUS_META: Record<string, { label: string; tone: string; ring: string; dot: string }> = {
  pending: { label: "Pending", tone: "bg-amber-50 text-amber-800", ring: "ring-amber-200", dot: "bg-amber-500" },
  confirmed: { label: "Confirmed", tone: "bg-blue-50 text-blue-800", ring: "ring-blue-200", dot: "bg-blue-500" },
  shipped: { label: "Shipped", tone: "bg-indigo-50 text-indigo-800", ring: "ring-indigo-200", dot: "bg-indigo-500" },
  delivered: { label: "Delivered", tone: "bg-emerald-50 text-emerald-800", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", tone: "bg-red-50 text-red-800", ring: "ring-red-200", dot: "bg-red-500" },
  received: { label: "Received", tone: "bg-emerald-50 text-emerald-800", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  verified: { label: "Verified", tone: "bg-emerald-50 text-emerald-800", ring: "ring-emerald-200", dot: "bg-emerald-500" },
};
export const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery", easypaisa: "Easypaisa", jazzcash: "JazzCash",
};
export function formatPrice(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}
export function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
  } catch { return iso; }
}
export function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-PK", { dateStyle: "medium" }); } catch { return iso; }
}
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
