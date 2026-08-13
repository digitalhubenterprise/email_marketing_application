import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { Mail, Lock, AlertCircle, ArrowRight, UserPlus, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [websiteHp, setWebsiteHp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifyEmailMode, setVerifyEmailMode] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
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

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-signup-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        await login(data.access_token);
      } else {
        const err = await res.json();
        setError(err.detail || "Invalid verification code.");
      }
    } catch (err) {
      setError("Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setResending(true);
    setResendSuccess(false);
    try {
      const res = await fetch("/api/auth/resend-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to resend code.");
      }
    } catch (err) {
      setError("Resend request failed.");
    } finally {
      setResending(false);
    }
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
      // 1. Call Register with anti-bot honeypot
      const regResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, phone_number: phoneNumber, website_hp: websiteHp })
      });

      if (regResponse.ok) {
        let isVerified = true;
        try {
          const regData = await regResponse.clone().json();
          if (regData && regData.email_verified === false) {
            isVerified = false;
          }
        } catch (e) {
          // ignore
        }

        if (!isVerified) {
          setVerifyEmailMode(true);
          setLoading(false);
          return;
        }

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
        let errorMsg = "Registration failed. Try a different email.";
        try {
          const errData = await regResponse.json();
          if (errData && errData.detail) {
            if (typeof errData.detail === "string") {
              errorMsg = errData.detail;
            } else if (Array.isArray(errData.detail)) {
              errorMsg = errData.detail.map((err: any) => err.msg).join(", ");
            } else {
              errorMsg = String(errData.detail);
            }
          }
        } catch (e) {
          errorMsg = `Server error (${regResponse.status}). Please try again later.`;
        }
        setError(errorMsg);
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
      <div className="w-full max-w-sm bg-[#1a1c2e]/95 backdrop-blur-2xl p-7 rounded-3xl relative z-10 border border-slate-700/80 shadow-2xl">
        {/* Top Header Badge Avatar Icon */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="relative w-16 h-16 rounded-full bg-[#0d0e1a] border border-slate-700 flex items-center justify-center text-white shadow-xl mb-1">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="absolute top-0 right-0 w-5 h-5 rounded-full brand-gradient-bg flex items-center justify-center text-white text-xs font-black border-2 border-[#1a1c2e] shadow-md">
              +
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white tracking-tight font-sans mb-1">
            Create Account
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Sign up to get started with your dashboard.
          </p>
        </div>

        {error && (
          <div className="mb-4.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-headShake">
            <AlertCircle size={14} className="shrink-0" />
            <span className="leading-normal">{error}</span>
          </div>
        )}

        <form onSubmit={verifyEmailMode ? handleVerifyEmail : handleSubmit} className="space-y-4">
          {/* Hidden Anti-Bot Honeypot Trap */}
          <input
            type="text"
            name="website_hp"
            value={websiteHp}
            onChange={(e) => setWebsiteHp(e.target.value)}
            className="hidden absolute opacity-0 pointer-events-none -z-50"
            tabIndex={-1}
            autoComplete="off"
          />

          {!verifyEmailMode ? (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 text-left">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-2xl bg-[#0d0e1a] border border-slate-700/80 text-xs font-medium text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 text-left">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-2xl bg-[#0d0e1a] border border-slate-700/80 text-xs font-medium text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 text-left">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[#0d0e1a] border border-slate-700/80 text-xs font-medium text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {/* Live password strength hints */}
                {password.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 pt-1">
                    {[
                      { label: "8+ characters", ok: password.length >= 8 },
                      { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
                      { label: "Lowercase letter", ok: /[a-z]/.test(password) },
                      { label: "Number (0–9)", ok: /\d/.test(password) },
                      { label: "Special char (!@#...)", ok: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password) },
                    ].map(({ label, ok }) => (
                      <span key={label} className={`flex items-center gap-1 text-[9.5px] font-semibold ${ok ? "text-emerald-400" : "text-slate-500"}`}>
                        <span className={`w-1 h-1 rounded-full ${ok ? "bg-emerald-400" : "bg-slate-600"}`} />
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 text-left">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[#0d0e1a] border border-slate-700/80 text-xs font-medium text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5 p-3 bg-[#0d0e1a] border border-slate-800 rounded-xl animate-fadeIn">
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider text-center">
                Verify Your Email
              </label>
              <p className="text-[10px] text-slate-400 text-center leading-normal mb-2">
                A 6-digit verification OTP has been sent to <strong>{email}</strong>. Please enter the code below to verify and activate your workspace.
              </p>

              {resendSuccess && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9.5px] rounded text-center">
                  Verification OTP code resent successfully!
                </div>
              )}

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock size={13} />
                </span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6-digit OTP code"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#0d0e1a] border border-slate-800 rounded-xl text-center text-xs text-white font-mono placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center mt-2 px-1">
                <button
                  type="button"
                  onClick={() => { setVerifyEmailMode(false); setVerificationCode(""); }}
                  className="text-[10px] text-slate-400 hover:text-slate-200 font-semibold underline"
                >
                  Back to Register
                </button>
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResendCode}
                  className="text-[10px] text-brand-400 hover:text-brand-300 font-bold disabled:opacity-50"
                >
                  {resending ? "Resending..." : "Resend Code"}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 brand-gradient-bg text-white font-extrabold rounded-full text-xs shadow-xl shadow-brand-500/25 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? "Verifying..." : verifyEmailMode ? "Verify & Activate" : "Create Account"}
          </button>
        </form>

        {/* Social Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-slate-800" />
          <span className="text-xs text-slate-500 font-medium">Or</span>
          <div className="flex-1 h-[1px] bg-slate-800" />
        </div>

        {/* Social Buttons */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button type="button" onClick={() => alert("Social login coming soon")} className="w-10 h-10 rounded-full bg-[#0d0e1a] border border-slate-800 flex items-center justify-center text-slate-300 hover:border-slate-600 transition-colors shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"/>
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/>
            </svg>
          </button>

          <button type="button" onClick={() => alert("Social login coming soon")} className="w-10 h-10 rounded-full bg-[#0d0e1a] border border-slate-800 flex items-center justify-center text-slate-300 hover:border-slate-600 transition-colors shadow-sm">
            <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-.99 2.96 1.07.08 2.14-.56 2.8-1.36z"/>
            </svg>
          </button>

          <button type="button" onClick={() => alert("Social login coming soon")} className="w-10 h-10 rounded-full bg-[#0d0e1a] border border-slate-800 flex items-center justify-center text-slate-300 hover:border-slate-600 transition-colors shadow-sm">
            <svg className="w-4 h-4 fill-current text-sky-400" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
        </div>

        <div className="text-center pt-3 border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
