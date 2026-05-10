import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@acme.com");
  const [password, setPassword] = useState("Admin@123");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const year = useMemo(() => new Date().getFullYear(), []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 font-sans antialiased"
      style={{ backgroundColor: "var(--login-page-bg)" }}
    >
      <div className="w-full max-w-[420px]">
        <div
          className="rounded-xl bg-white p-8 sm:p-10 border border-[#e8eaed]"
          style={{ boxShadow: "0 4px 24px rgba(17, 24, 39, 0.06)" }}
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-lg bg-[#111827] flex items-center justify-center mb-5 shadow-sm">
              <span className="text-white font-bold text-xl tracking-tight">EP</span>
            </div>
            <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Enterprise Panel</h1>
            <p className="text-sm text-[#6b7280] mt-2 font-normal leading-snug">
              Enterprise Accounts Management System
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"
                strokeWidth={2}
              />
              <input
                className="w-full rounded-lg border border-[#e5e7eb] bg-white pl-11 pr-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/25 focus:border-[#2563eb]"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"
                strokeWidth={2}
              />
              <input
                className="w-full rounded-lg border border-[#e5e7eb] bg-white pl-11 pr-12 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/25 focus:border-[#2563eb]"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] p-0.5 rounded"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg text-white font-semibold py-3 px-4 text-sm shadow-sm transition-colors disabled:opacity-60 disabled:pointer-events-none bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#f3f4f6]">
            <p className="text-center text-xs text-[#9ca3af]">
              © {year} Enterprise Panel by Techtrole. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
