import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package, Clock, ShieldCheck, Receipt, QrCode, Megaphone, Type, Users as UsersIcon,
  CircleDollarSign, ArrowRight,
} from "lucide-react";
import {
  adminGetStats, adminListClaims, adminPendingPaymentCount,
  adminRetailerBalances, adminListQRCodes, adminListAds,
  adminListTicker, adminListUsers,
  formatPrice, type AdminStats,
} from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card } from "@/components/admin/ui";

type Counts = {
  websiteOrders: AdminStats | null;
  pendingClaims: number; pendingPayments: number;
  retailerOutstanding: number; qrTotal: number; adsTotal: number;
  tickerTotal: number; usersTotal: number;
};

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stats, claims, pendingPay, balances, qrs, ads, ticker, users] = await Promise.all([
          adminGetStats().catch((): AdminStats | null => null),
          adminListClaims().catch((): Awaited<ReturnType<typeof adminListClaims>> => []),
          adminPendingPaymentCount().catch(() => ({ count: 0 })),
          adminRetailerBalances().catch((): Awaited<ReturnType<typeof adminRetailerBalances>> => []),
          adminListQRCodes().catch((): Awaited<ReturnType<typeof adminListQRCodes>> => []),
          adminListAds().catch((): Awaited<ReturnType<typeof adminListAds>> => []),
          adminListTicker().catch((): Awaited<ReturnType<typeof adminListTicker>> => []),
          adminListUsers().catch((): Awaited<ReturnType<typeof adminListUsers>> => []),
        ]);
        if (cancelled) return;
        setCounts({
          websiteOrders: stats,
          pendingClaims: claims.filter((c) => c.status !== "received").length,
          pendingPayments: pendingPay.count,
          retailerOutstanding: balances.reduce((s, b) => s + b.outstanding, 0),
          qrTotal: qrs.length, adsTotal: ads.length, tickerTotal: ticker.length, usersTotal: users.length,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageShell><Loading /></PageShell>;
  if (!counts) return <PageShell><div className="text-ink-500">Failed to load dashboard.</div></PageShell>;

  return (
    <PageShell>
      <PageHeader title="Dashboard" subtitle="Live overview from Firestore." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard to="/admin/orders" icon={Package} label="Website orders" value={counts.websiteOrders?.total ?? 0} accent="bg-ink-900 text-white" />
        <StatCard to="/admin/orders" icon={Clock} label="Pending orders" value={counts.websiteOrders?.pending ?? 0} accent="bg-amber-500 text-white" highlight />
        <StatCard to="/admin/claims" icon={ShieldCheck} label="Pending claims" value={counts.pendingClaims} accent="bg-blue-500 text-white" />
        <StatCard to="/admin/payments" icon={Receipt} label="Pending payments" value={counts.pendingPayments} accent="bg-emerald-500 text-white" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard to="/admin/payments" icon={CircleDollarSign} label="Retailer outstanding" value={formatPrice(counts.retailerOutstanding)} accent="bg-rose-500 text-white" />
        <StatCard to="/admin/qr-codes" icon={QrCode} label="QR codes" value={counts.qrTotal} accent="bg-violet-500 text-white" />
        <StatCard to="/admin/ads" icon={Megaphone} label="Ads" value={counts.adsTotal} accent="bg-orange-500 text-white" />
        <StatCard to="/admin/users" icon={UsersIcon} label="Users" value={counts.usersTotal} accent="bg-indigo-500 text-white" />
      </div>

      <Card className="mt-8 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">Website order revenue</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Mini label="Confirmed" value={counts.websiteOrders?.confirmed ?? 0} />
          <Mini label="Shipped" value={counts.websiteOrders?.shipped ?? 0} />
          <Mini label="Delivered" value={counts.websiteOrders?.delivered ?? 0} />
        </div>
        <div className="mt-4 rounded-xl bg-emerald-50 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total revenue</div>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-900">
            {formatPrice(counts.websiteOrders?.revenue ?? 0)}
          </div>
        </div>
      </Card>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-base font-bold text-ink-900">Marketing</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <Row icon={QrCode} label="QR codes" value={counts.qrTotal} to="/admin/qr-codes" />
            <Row icon={Megaphone} label="Ads" value={counts.adsTotal} to="/admin/ads" />
            <Row icon={Type} label="Ticker messages" value={counts.tickerTotal} to="/admin/ticker" />
          </ul>
        </Card>
        <Card className="p-5">
          <h3 className="font-display text-base font-bold text-ink-900">Quick links</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <Row icon={ShieldCheck} label="Claims to verify" value={counts.pendingClaims} to="/admin/claims" />
            <Row icon={Receipt} label="Payments to verify" value={counts.pendingPayments} to="/admin/payments" />
            <Row icon={UsersIcon} label="Manage users" value={counts.usersTotal} to="/admin/users" />
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}

function StatCard({
  to, icon: Icon, label, value, accent, highlight,
}: { to: string; icon: React.ElementType; label: string; value: string | number; accent: string; highlight?: boolean }) {
  return (
    <Link
      to={to}
      className={`block rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
        highlight ? "border-amber-200 ring-1 ring-amber-100" : "border-ink-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-2xl font-bold text-ink-900">{value}</div>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
      <div className="text-xs font-medium text-ink-500">{label}</div>
      <div className="font-display text-xl font-bold text-ink-900">{value}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value, to }: { icon: React.ElementType; label: string; value: number | string; to: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-ink-50">
        <div className="flex items-center gap-2.5 text-ink-700">
          <Icon className="h-4 w-4 text-brand-500" />
          {label}
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          {value}
          <ArrowRight className="h-3.5 w-3.5 text-ink-400" />
        </div>
      </Link>
    </li>
  );
}
