import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white px-8 py-10 shadow-xl ring-1 ring-gray-200">
          <div className="mb-8 text-center">
            <Link to="/">
              <img
                src="/tashi-logo-transparent.png"
                alt="Tashi Brakes"
                className="mx-auto h-12 w-auto object-contain"
              />
            </Link>
            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {mode === "login"
                ? "Sign in to your Tashi account"
                : "Join Tashi Brakes today"}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "register" && (
              <Field label="Full name">
                <InputWrapper icon={<User className="h-4 w-4" />}>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    className="input-base"
                  />
                </InputWrapper>
              </Field>
            )}

            <Field label="Email address">
              <InputWrapper icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input-base"
                />
              </InputWrapper>
            </Field>

            <Field label="Password">
              <InputWrapper
                icon={<Lock className="h-4 w-4" />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              >
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="input-base"
                />
              </InputWrapper>
            </Field>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:translate-y-0"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => { setMode("register"); setError(null); }}
                  className="font-semibold text-brand-500 hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError(null); }}
                  className="font-semibold text-brand-500 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function InputWrapper({
  icon,
  suffix,
  children,
}: {
  icon: React.ReactNode;
  suffix?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
      <span className="text-gray-400">{icon}</span>
      <div className="flex-1">{children}</div>
      {suffix}
    </div>
  );
}
