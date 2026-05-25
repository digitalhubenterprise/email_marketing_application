import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { Mail, Lock, AlertCircle, ArrowRight, UserPlus } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
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
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Background Blur Nodes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full filter blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[100px] animate-pulse delay-700" />

      {/* Main Glass Card container */}
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl relative z-10 border border-dark-700/50 shadow-2xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 brand-gradient-bg rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-brand-500/30 font-black text-2xl mb-4">
            S
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight font-sans">Create SaaS Account</h2>
          <p className="text-sm text-dark-400 mt-2">Get started with 1,000 free emails monthly</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-11 pr-4 py-3.5 bg-dark-900 border border-dark-700/50 rounded-xl text-sm focus:border-brand-500 focus:outline-none transition-colors text-white placeholder:text-dark-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (Min 6 chars)"
                className="w-full pl-11 pr-4 py-3.5 bg-dark-900 border border-dark-700/50 rounded-xl text-sm focus:border-brand-500 focus:outline-none transition-colors text-white placeholder:text-dark-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">Confirm Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-dark-900 border border-dark-700/50 rounded-xl text-sm focus:border-brand-500 focus:outline-none transition-colors text-white placeholder:text-dark-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 brand-gradient-bg text-white font-bold rounded-xl text-sm transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 glow-btn disabled:opacity-50"
          >
            {loading ? "Registering account..." : "Register & Sign In"}
            {!loading && <UserPlus size={16} />}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-dark-700/30">
          <p className="text-xs text-dark-400">
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
