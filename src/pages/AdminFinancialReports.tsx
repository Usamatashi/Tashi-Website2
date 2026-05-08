import { useEffect, useState } from "react";
import { FileText, TrendingUp, TrendingDown, Scale, BarChart2, Calendar, RefreshCw } from "lucide-react";
import {
  adminGetPL, adminGetBalanceSheet, adminGetTrialBalance,
  formatPrice, type PLReport, type BalanceSheet, type TrialBalance,
} from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card, Btn } from "@/components/admin/ui";

function todayISO() { return new Date().toISOString().slice(0, 10); }
function yearStartISO() { return `${new Date().getFullYear()}-01-01`; }

type Tab = "pl" | "balance_sheet" | "trial_balance";

function SectionRow({ label, value, indent = 0, bold = false, border = false, negative = false }: {
  label: string; value: number; indent?: number; bold?: boolean; border?: boolean; negative?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 px-4 ${border ? "border-t border-ink-200 bg-ink-50" : "hover:bg-ink-50"}`}
      style={{ paddingLeft: `${16 + indent * 20}px` }}>
      <span className={`text-sm ${bold ? "font-bold text-ink-900" : "text-ink-600"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold" : "font-medium"} ${negative ? "text-red-600" : value >= 0 ? "text-ink-900" : "text-red-600"}`}>
        {formatPrice(Math.abs(value))}
      </span>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="bg-ink-100 px-4 py-1.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-ink-500">{label}</span>
    </div>
  );
}

export default function AdminFinancialReports() {
  const [tab, setTab] = useState<Tab>("pl");
  const [from, setFrom] = useState(yearStartISO());
  const [to, setTo]     = useState(todayISO());
  const [asOf, setAsOf] = useState(todayISO());

  const [pl, setPL]           = useState<PLReport | null>(null);
  const [bs, setBS]           = useState<BalanceSheet | null>(null);
  const [tb, setTB]           = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPL() {
    setLoading(true);
    try { setPL(await adminGetPL({ from, to })); }
    finally { setLoading(false); }
  }
  async function loadBS() {
    setLoading(true);
    try { setBS(await adminGetBalanceSheet(asOf)); }
    finally { setLoading(false); }
  }
  async function loadTB() {
    setLoading(true);
    try { setTB(await adminGetTrialBalance(asOf)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (tab === "pl") loadPL();
    else if (tab === "balance_sheet") loadBS();
    else if (tab === "trial_balance") loadTB();
  }, [tab]);

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "pl",            label: "Profit & Loss",   icon: TrendingUp },
    { key: "balance_sheet", label: "Balance Sheet",   icon: Scale },
    { key: "trial_balance", label: "Trial Balance",   icon: BarChart2 },
  ];

  return (
    <PageShell>
      <PageHeader title="Financial Reports" subtitle="IFRS-aligned statements — Profit & Loss, Balance Sheet, Trial Balance" />

      {/* Tab switcher */}
      <div className="mb-6 flex justify-center">
        <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all ${tab === t.key ? "bg-brand-600 text-white shadow-sm" : "text-ink-500 hover:text-ink-800"}`}>
                <Icon className="h-4 w-4" />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date controls */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Calendar className="h-4 w-4 text-ink-400" />
          {tab === "pl" ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-ink-500">From</span>
              <input type="date" value={from} max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <span className="text-xs font-medium text-ink-500">To</span>
              <input type="date" value={to} min={from} max={todayISO()}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-ink-500">As of</span>
              <input type="date" value={asOf} max={todayISO()}
                onChange={(e) => setAsOf(e.target.value)}
                className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          )}
          <Btn variant="secondary" onClick={() => { if (tab === "pl") loadPL(); else if (tab === "balance_sheet") loadBS(); else loadTB(); }}>
            <RefreshCw className="h-4 w-4" />Generate
          </Btn>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loading /></div>
      ) : (
        <>
          {/* ── P&L ── */}
          {tab === "pl" && pl && (
            <div className="space-y-4">
              <div className="rounded-xl bg-ink-800 px-5 py-4 text-white">
                <div className="text-xs font-semibold uppercase tracking-widest text-ink-300">Statement of Profit or Loss</div>
                <div className="text-sm text-ink-300 mt-0.5">Period: {pl.period.from} to {pl.period.to}</div>
              </div>

              <Card>
                <Divider label="Revenue" />
                <SectionRow label="POS Sales Revenue" value={pl.revenue.posRevenue} indent={1} />
                <SectionRow label="Wholesale Revenue" value={pl.revenue.wsRevenue} indent={1} />
                {pl.revenue.journalRevenue !== 0 && <SectionRow label="Other Income (Journals)" value={pl.revenue.journalRevenue} indent={1} />}
                <SectionRow label="Gross Revenue" value={pl.revenue.grossRevenue} bold border />
                <SectionRow label="Less: Sales Returns" value={pl.revenue.salesReturns} indent={1} negative />
                <SectionRow label="Net Revenue" value={pl.revenue.netRevenue} bold border />

                <Divider label="Cost of Goods Sold" />
                <SectionRow label="Stock Purchases" value={pl.cogs.purchases} indent={1} />
                <SectionRow label="Less: Purchase Returns" value={pl.cogs.purchaseReturns} indent={1} negative />
                <SectionRow label="Net Cost of Goods Sold" value={pl.cogs.netCOGS} bold border />

                <Divider label="Gross Profit" />
                <SectionRow label="Gross Profit" value={pl.grossProfit} bold border />

                <Divider label="Operating Expenses" />
                {Object.entries(pl.expenses.byCategory).map(([cat, amt]) => (
                  <SectionRow key={cat} label={cat} value={amt} indent={1} />
                ))}
                {pl.expenses.journalExpenses > 0 && <SectionRow label="Journal Expenses" value={pl.expenses.journalExpenses} indent={1} />}
                <SectionRow label="Total Operating Expenses" value={pl.expenses.totalOpEx} bold border />

                <Divider label="Net Profit" />
                <div className={`flex items-center justify-between px-4 py-4 rounded-b-2xl ${pl.netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                  <span className="font-bold text-base text-ink-900">Net Profit / (Loss)</span>
                  <span className={`font-display text-2xl font-bold ${pl.netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {pl.netProfit < 0 ? "(" : ""}{formatPrice(Math.abs(pl.netProfit))}{pl.netProfit < 0 ? ")" : ""}
                  </span>
                </div>
              </Card>
            </div>
          )}

          {/* ── Balance Sheet ── */}
          {tab === "balance_sheet" && bs && (
            <div className="space-y-4">
              <div className="rounded-xl bg-ink-800 px-5 py-4 text-white">
                <div className="text-xs font-semibold uppercase tracking-widest text-ink-300">Statement of Financial Position</div>
                <div className="text-sm text-ink-300 mt-0.5">As of {bs.asOf}</div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Assets */}
                <Card>
                  <Divider label="Assets" />
                  <Divider label="Current Assets" />
                  <SectionRow label="Cash & Cash Equivalents" value={bs.assets.current.cash} indent={1} />
                  <SectionRow label="Accounts Receivable" value={bs.assets.current.accountsReceivable} indent={1} />
                  <SectionRow label="Inventory" value={bs.assets.current.inventory} indent={1} />
                  <SectionRow label="Total Current Assets" value={bs.assets.current.total} bold border />
                  <SectionRow label="Total Assets" value={bs.assets.total} bold border />
                </Card>

                {/* Liabilities + Equity */}
                <Card>
                  <Divider label="Liabilities" />
                  <Divider label="Current Liabilities" />
                  <SectionRow label="Accounts Payable (Suppliers)" value={bs.liabilities.current.accountsPayable} indent={1} />
                  <SectionRow label="Credit Expenses Payable" value={bs.liabilities.current.creditExpenses} indent={1} />
                  <SectionRow label="Total Current Liabilities" value={bs.liabilities.current.total} bold border />
                  <SectionRow label="Total Liabilities" value={bs.liabilities.total} bold border />
                  <Divider label="Equity" />
                  <SectionRow label="Retained Earnings / Net Worth" value={bs.equity.retainedEarnings} indent={1} bold />
                  <SectionRow label="Total Equity" value={bs.equity.total} bold border />
                  <div className={`flex items-center gap-2 px-4 py-2 text-xs rounded-b-2xl ${bs.checkBalance ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                    {bs.checkBalance ? "✓ Statement is balanced" : "⚠ Statement is not balanced — post adjusting journals"}
                  </div>
                </Card>
              </div>

              {/* Check equation */}
              <Card>
                <div className="flex flex-wrap items-center justify-center gap-6 py-5 text-center">
                  <div><div className="text-xs text-ink-500 uppercase tracking-wider">Total Assets</div><div className="font-display text-xl font-bold text-blue-700">{formatPrice(bs.assets.total)}</div></div>
                  <div className="text-2xl text-ink-400">=</div>
                  <div><div className="text-xs text-ink-500 uppercase tracking-wider">Total Liabilities</div><div className="font-display text-xl font-bold text-red-600">{formatPrice(bs.liabilities.total)}</div></div>
                  <div className="text-2xl text-ink-400">+</div>
                  <div><div className="text-xs text-ink-500 uppercase tracking-wider">Total Equity</div><div className="font-display text-xl font-bold text-violet-700">{formatPrice(bs.equity.total)}</div></div>
                </div>
              </Card>
            </div>
          )}

          {/* ── Trial Balance ── */}
          {tab === "trial_balance" && tb && (
            <div className="space-y-4">
              <div className="rounded-xl bg-ink-800 px-5 py-4 text-white">
                <div className="text-xs font-semibold uppercase tracking-widest text-ink-300">Trial Balance</div>
                <div className="text-sm text-ink-300 mt-0.5">As of {tb.asOf} · Based on posted journal entries</div>
              </div>
              {tb.rows.length === 0 ? (
                <Card>
                  <div className="py-12 text-center text-ink-400 text-sm">
                    No posted journal entries yet. Post entries in the Journal Entries section to see the trial balance.
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Account Name</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3 text-right text-emerald-600">Debit</th>
                          <th className="px-4 py-3 text-right text-red-500">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100">
                        {tb.rows.map((row) => (
                          <tr key={row.id} className="hover:bg-ink-50">
                            <td className="px-4 py-3 font-mono text-sm font-bold text-ink-700">{row.code}</td>
                            <td className="px-4 py-3 text-ink-800">{row.name}</td>
                            <td className="px-4 py-3 capitalize text-ink-500">{row.type}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">{row.debit > 0 ? formatPrice(row.debit) : "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-red-600">{row.credit > 0 ? formatPrice(row.credit) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-ink-200 bg-ink-50 font-bold">
                          <td colSpan={3} className="px-4 py-3 text-ink-700">Total</td>
                          <td className="px-4 py-3 text-right text-emerald-700">{formatPrice(tb.totalDebit)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatPrice(tb.totalCredit)}</td>
                        </tr>
                        <tr className={`${tb.balanced ? "bg-emerald-50" : "bg-red-50"}`}>
                          <td colSpan={5} className={`px-4 py-2 text-center text-xs font-semibold ${tb.balanced ? "text-emerald-700" : "text-red-600"}`}>
                            {tb.balanced ? "✓ Trial balance is balanced" : `⚠ Out of balance by ${formatPrice(Math.abs(tb.totalDebit - tb.totalCredit))}`}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

