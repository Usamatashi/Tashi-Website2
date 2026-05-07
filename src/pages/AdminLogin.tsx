import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, Phone, AlertCircle, Eye, EyeOff } from "lucide-react";
import { adminLogin, adminMe, AdminAuthError } from "@/lib/admin";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    return () => { cancelled = true; };
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 py-12">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-brand-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-800/25 blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/10 blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Back link */}
      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/70 backdrop-blur transition hover:border-white/20 hover:bg-white/10 hover:text-white sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>

      <div className="relative w-full max-w-md">
        {/* Logo + heading */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-brand-500/10 backdrop-blur">
            <img src="/tashi-logo-transparent.png" alt="Tashi" className="h-12 w-auto drop-shadow-lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Admin Portal</h1>
          <p className="mt-1.5 text-sm text-white/40">Secure access to Tashi Brakes management</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <form onSubmit={onSubmit} className="space-y-5">

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03XX XXXXXXX"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none transition focus:border-brand-500/60 focus:bg-white/8 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your app password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-11 text-sm text-white placeholder-white/20 outline-none transition focus:border-brand-500/60 focus:bg-white/8 focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white/60"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="group relative mt-2 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 hover:shadow-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
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
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-white/25">
          Administration use only. Unauthorised access is strictly prohibited.
        </p>
      </div>
    </div>
  );
}
