import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package, Clock, ShieldCheck, Receipt, QrCode, Megaphone, Type, Users as UsersIcon,
  CircleDollarSign, ArrowRight, TrendingUp, Zap, BarChart2,
} from "lucide-react";
import {
  adminGetStats, adminGetMonthRevenue, adminListClaims, adminPendingPaymentCount,
  adminRetailerBalances, adminListQRCodes, adminListAds,
  adminListTicker, adminListUsers,
  formatPrice, type AdminStats,
} from "@/lib/admin";
import { Loading } from "@/components/admin/ui";

type Counts = {
  websiteOrders: AdminStats | null;
  pendingClaims: number; pendingPayments: number;
  retailerOutstanding: number; qrTotal: number; adsTotal: number;
  tickerTotal: number; usersTotal: number;
  monthRevenue: { posRevenue: number; wholesaleRevenue: number; totalMonthRevenue: number } | null;
};

const STAT_CARDS = (c: Counts) => [
  {
    to: "/admin/orders", icon: Package, label: "Website Orders",
    value: c.websiteOrders?.total ?? 0,
    gradient: "from-slate-700 to-slate-900", iconBg: "bg-white/20",
  },
  {
    to: "/admin/orders", icon: Clock, label: "Pending Orders",
    value: c.websiteOrders?.pending ?? 0,
    gradient: "from-amber-500 to-orange-600", iconBg: "bg-white/20",
    pulse: (c.websiteOrders?.pending ?? 0) > 0,
  },
  {
    to: "/admin/claims", icon: ShieldCheck, label: "Pending Claims",
    value: c.pendingClaims,
    gradient: "from-blue-500 to-blue-700", iconBg: "bg-white/20",
  },
  {
    to: "/admin/payments", icon: Receipt, label: "Pending Payments",
    value: c.pendingPayments,
    gradient: "from-emerald-500 to-teal-600", iconBg: "bg-white/20",
  },
  {
    to: "/admin/payments", icon: CircleDollarSign, label: "Retailer Outstanding",
    value: formatPrice(c.retailerOutstanding),
    gradient: "from-rose-500 to-red-700", iconBg: "bg-white/20",
  },
  {
    to: "/admin/qr-codes", icon: QrCode, label: "QR Codes",
    value: c.qrTotal,
    gradient: "from-violet-500 to-purple-700", iconBg: "bg-white/20",
  },
  {
    to: "/admin/ads", icon: Megaphone, label: "Active Ads",
    value: c.adsTotal,
    gradient: "from-orange-500 to-amber-600", iconBg: "bg-white/20",
  },
  {
    to: "/admin/users", icon: UsersIcon, label: "Total Users",
    value: c.usersTotal,
    gradient: "from-indigo-500 to-indigo-700", iconBg: "bg-white/20",
  },
];

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stats, monthRev, claims, pendingPay, balances, qrs, ads, ticker, users] = await Promise.all([
          adminGetStats().catch((): AdminStats | null => null),
          adminGetMonthRevenue().catch(() => null),
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
          monthRevenue: monthRev,
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading />
      </div>
    );
  }
  if (!counts) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-ink-500">
        Failed to load dashboard.
      </div>
    );
  }

  const revenue = counts.monthRevenue?.totalMonthRevenue ?? counts.websiteOrders?.revenue ?? 0;
  const posRevenue = counts.monthRevenue?.posRevenue ?? 0;
  const wholesaleRevenue = counts.monthRevenue?.wholesaleRevenue ?? 0;
  const cards = STAT_CARDS(counts);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 px-6 py-8 sm:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #E87722 0%, transparent 60%)" }} />
        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-400">Live Dashboard</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-400">Here's what's happening with Tashi Brakes today.</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Total Revenue</div>
              <div className="mt-0.5 font-display text-xl font-bold text-white">{formatPrice(revenue)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Stat cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              to={card.to}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl`}
            >
              {card.pulse && (
                <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
              )}
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg} mb-4`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/70">{card.label}</div>
              <div className="mt-1 font-display text-2xl font-bold text-white">{card.value}</div>
              <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-white/30 transition-all group-hover:right-3 group-hover:text-white/60" />
            </Link>
          ))}
        </div>

        {/* Revenue breakdown */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink-900">This Month's Revenue</h2>
              <p className="text-xs text-ink-500">POS sales + wholesale orders combined</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "POS Sales", value: posRevenue, color: "bg-violet-500" },
              { label: "Wholesale Orders", value: wholesaleRevenue, color: "bg-blue-500" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-ink-100 p-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.color}`} />
                  <span className="text-xs font-medium text-ink-500">{s.label}</span>
                </div>
                <div className="mt-2 font-display text-2xl font-bold text-ink-900">{formatPrice(s.value)}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-emerald-100">Total This Month</div>
              <div className="mt-0.5 font-display text-2xl font-bold text-white">{formatPrice(revenue)}</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <BarChart2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-brand-500" />
              <h3 className="font-display text-sm font-bold text-ink-900">Marketing</h3>
            </div>
            <div className="space-y-1">
              <QuickRow icon={QrCode} label="QR Codes" value={counts.qrTotal} to="/admin/qr-codes" color="text-violet-500" />
              <QuickRow icon={Megaphone} label="Active Ads" value={counts.adsTotal} to="/admin/ads" color="text-orange-500" />
              <QuickRow icon={Type} label="Ticker Messages" value={counts.tickerTotal} to="/admin/ticker" color="text-blue-500" />
            </div>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand-500" />
              <h3 className="font-display text-sm font-bold text-ink-900">Quick Actions</h3>
            </div>
            <div className="space-y-1">
              <QuickRow icon={ShieldCheck} label="Claims to Verify" value={counts.pendingClaims} to="/admin/claims" color="text-blue-500" />
              <QuickRow icon={Receipt} label="Payments to Verify" value={counts.pendingPayments} to="/admin/payments" color="text-emerald-500" />
              <QuickRow icon={UsersIcon} label="Manage Users" value={counts.usersTotal} to="/admin/users" color="text-indigo-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickRow({ icon: Icon, label, value, to, color }: {
  icon: React.ElementType; label: string; value: number | string; to: string; color: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-ink-50"
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm text-ink-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-ink-900">{value}</span>
        <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
      </div>
    </Link>
  );
}
