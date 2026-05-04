import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, Phone, ShieldCheck, AlertCircle } from "lucide-react";
import { adminLogin, adminMe, AdminAuthError } from "@/lib/admin";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await adminMe();
        if (!cancelled) navigate("/admin", { replace: true });
      } catch (err) {
        if (!(err instanceof AdminAuthError)) console.error(err);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminLogin(phone.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 px-4 py-12">
      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur transition hover:border-white/30 hover:bg-white/20 hover:text-white sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <img src="/tashi-logo-transparent.png" alt="Tashi" className="h-20 w-auto drop-shadow-lg" />
          <p className="mt-3 text-sm text-ink-300">
            Sign in
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl bg-white p-7 shadow-2xl shadow-ink-900/30"
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
              Phone number
            </span>
            <div className="relative mt-1.5">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03XX XXXXXXX"
                className="input pl-9"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
              Password
            </span>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your app password"
                className="input pl-9"
              />
            </div>
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>

          <p className="text-center text-xs text-ink-500">
            Administration use only. Unauthorised access is strictly prohibited.
          </p>
        </form>
      </div>
    </div>
  );
}
