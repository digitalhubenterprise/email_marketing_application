import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { Mail, Lock, AlertCircle, ArrowRight, UserPlus, Eye, EyeOff } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login, appConfig } = useAuth()
  const navigate = useNavigate()

  const validatePasswordStrength = (pw: string): string | null => {
    if (pw.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter.";
    if (!/\d/.test(pw)) return "Password must contain at least one digit.";
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(pw)) return "Password must contain at least one special character.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pwError = validatePasswordStrength(password);
    if (pwError) { setError(pwError); return; }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Call Register
      const regResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (regResponse.ok) {
        // 2. Automatically Login user
        const params = new URLSearchParams();
        params.append("username", email);
        params.append("password", password);

        const authResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          await login(authData.access_token);
        } else {
          navigate("/login");
        }
      } else {
        const errData = await regResponse.json();
        setError(errData.detail || "Registration failed. Try a different email.");
      }
    } catch (err) {
      setError("Network connection issue. Please check API server status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Background Blur Nodes */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-500/5 rounded-full filter blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/5 rounded-full filter blur-[100px] animate-pulse delay-700" />

      {/* Main Glass Card container */}
      <div className="w-full max-w-sm glass-panel p-6 rounded-2xl relative z-10 border border-dark-700/50 shadow-2xl">
        <div className="text-center mb-6">
          {appConfig?.logo_url ? (
            <img src={appConfig.logo_url} alt={appConfig.site_name} className="h-10 mx-auto object-contain mb-3" />
          ) : (
            <div className="h-10 w-10 brand-gradient-bg rounded-xl mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-500/30 font-black text-xl mb-3">
              {appConfig?.site_name?.substring(0, 1) || "S"}
            </div>
          )}
          <h2 className="text-xl font-extrabold text-white tracking-tight font-sans">
            Create {appConfig?.site_name ? `${appConfig.site_name} ` : ""}Account
          </h2>
          <p className="text-[11px] text-dark-400 mt-1">Get started with standard marketing workspaces today</p>
        </div>

        {error && (
          <div className="mb-4.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-headShake">
            <AlertCircle size={14} className="shrink-0" />
            <span className="leading-normal">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                <Mail size={13} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-9 pr-3.5 py-2.5 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors text-white placeholder:text-dark-600"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                <Lock size={13} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 chars, A-Z, 0-9, symbol"
                className="w-full pl-9 pr-10 py-2.5 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors text-white placeholder:text-dark-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            {/* Live password strength hints */}
            {password.length > 0 && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
                {[
                  { label: "8+ characters", ok: password.length >= 8 },
                  { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
                  { label: "Lowercase letter", ok: /[a-z]/.test(password) },
                  { label: "Number (0–9)", ok: /\d/.test(password) },
                  { label: "Special char (!@#...)", ok: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`]/.test(password) },
                ].map(({ label, ok }) => (
                  <span key={label} className={`flex items-center gap-1 text-[9px] font-semibold ${ok ? "text-emerald-400" : "text-dark-500"}`}>
                    <span className={`w-1 h-1 rounded-full ${ok ? "bg-emerald-400" : "bg-dark-600"}`} />
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="block text-[10px] font-bold text-dark-300 uppercase tracking-wider">Confirm Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                <Lock size={13} />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors text-white placeholder:text-dark-600"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 brand-gradient-bg text-white font-bold rounded-xl text-xs transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 glow-btn disabled:opacity-50 mt-1"
          >
            {loading ? "Registering account..." : "Register & Sign In"}
            {!loading && <UserPlus size={13} />}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-dark-700/30">
          <p className="text-[11px] text-dark-400">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-bold transition-colors">
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
