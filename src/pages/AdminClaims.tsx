import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Search, Check, X, ArrowLeft } from "lucide-react";
import {
  adminListClaims, adminClaimScans, adminVerifyQRForClaim, adminMarkScanMissing, adminMarkClaimReceived,
  type Claim, type ClaimScan, formatDate,
} from "@/lib/admin";
import { PageHeader, PageShell, Loading, Empty, Btn, Card, Pill, ErrorBanner } from "@/components/admin/ui";

export default function AdminClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Claim | null>(null);

  async function reload() {
    setLoading(true);
    try { setClaims(await adminListClaims()); } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return claims;
    return claims.filter((c) =>
      String(c.id).includes(q) || c.userName.toLowerCase().includes(q) || (c.userPhone || "").includes(q),
    );
  }, [claims, query]);

  if (active) {
    return <ClaimDetail claim={active} onBack={() => { setActive(null); reload(); }} />;
  }

  return (
    <PageShell>
      <PageHeader title="Claims" subtitle={`${claims.length} total`} />

      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input className="input pl-9" placeholder="Search by ID, user" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <Empty icon={ShieldCheck} title="No claims" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3 text-left">Claim</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">Date</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Verified</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-ink-50/60" onClick={() => setActive(c)}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-700">#{c.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{c.userName || "—"}</div>
                    <div className="text-xs text-ink-500">{c.userPhone} · {c.userRole}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-500 lg:table-cell">{formatDate(c.claimedAt)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{c.pointsClaimed}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className="text-emerald-700">{c.verifiedScans}</span> / {c.totalScans}
                    {c.missingScans > 0 && <span className="ml-1 text-red-600">· {c.missingScans} missing</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={c.status === "received" ? "emerald" : c.status === "approved" ? "blue" : "amber"}>{c.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}

function ClaimDetail({ claim, onBack }: { claim: Claim; onBack: () => void }) {
  const [scans, setScans] = useState<ClaimScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrInput, setQrInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedPoints, setVerifiedPoints] = useState(claim.verifiedPoints);

  async function reload() {
    setLoading(true);
    try { setScans(await adminClaimScans(claim.id)); } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, [claim.id]);

  async function verifyQR(e: React.FormEvent) {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setBusy(true); setError(null);
    try {
      const r = await adminVerifyQRForClaim(claim.id, qrInput.trim());
      setVerifiedPoints(r.verifiedPoints);
      setQrInput("");
      await reload();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function markMissing(scanId: number) {
    if (!confirm("Mark this scan as missing?")) return;
    setBusy(true);
    try {
      const r = await adminMarkScanMissing(claim.id, scanId);
      setVerifiedPoints(r.verifiedPoints);
      await reload();
    } finally { setBusy(false); }
  }

  async function markReceived() {
    if (!confirm("Mark this claim as received?")) return;
    setBusy(true);
    try { await adminMarkClaimReceived(claim.id); onBack(); }
    finally { setBusy(false); }
  }

  return (
    <PageShell>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Back to claims
      </button>
      <PageHeader
        title={`Claim #${claim.id}`}
        subtitle={`${claim.userName} · ${claim.userPhone}`}
        actions={claim.status !== "received" && <Btn onClick={markReceived} disabled={busy}>Mark received</Btn>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-ink-500">Points claimed</div><div className="font-display text-xl font-bold">{claim.pointsClaimed}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink-500">Verified points</div><div className="font-display text-xl font-bold text-emerald-700">{verifiedPoints}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink-500">Status</div><div className="mt-1"><Pill tone={claim.status === "received" ? "emerald" : "amber"}>{claim.status}</Pill></div></Card>
      </div>

      <Card className="mt-6 p-5">
        <h3 className="font-display text-base font-bold text-ink-900">Verify QR</h3>
        <form onSubmit={verifyQR} className="mt-3 flex gap-2">
          <input className="input flex-1 font-mono" value={qrInput} onChange={(e) => setQrInput(e.target.value)} placeholder="Scan or paste QR number" />
          <Btn type="submit" disabled={busy}><Check className="h-4 w-4" /> Verify</Btn>
        </form>
        <ErrorBanner message={error} />
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3 font-display text-base font-bold">Scans</div>
        {loading ? <Loading /> : scans.length === 0 ? <div className="p-8 text-center text-ink-500">No scans yet.</div> : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3 text-left">QR</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Scanned</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {scans.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-mono text-xs">{s.qrNumber}</td>
                  <td className="px-4 py-3 text-ink-700">{s.productName}</td>
                  <td className="hidden px-4 py-3 text-ink-500 md:table-cell">{formatDate(s.scannedAt)}</td>
                  <td className="px-4 py-3 text-right">{s.pointsEarned}</td>
                  <td className="px-4 py-3">
                    {s.adminVerified === true ? <Pill tone="emerald">Verified</Pill> :
                     s.adminVerified === false ? <Pill tone="red">Missing</Pill> : <Pill tone="amber">Pending</Pill>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.adminVerified !== false && (
                      <Btn variant="secondary" onClick={() => markMissing(s.id)}><X className="h-3.5 w-3.5" /> Missing</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}
