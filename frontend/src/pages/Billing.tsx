import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { CreditCard, Check, ShieldCheck, Mail, ArrowUpRight, Zap, Sparkles, Award, Wallet, ArrowRight, Users, Send, Server, Layers } from 'lucide-react'

export default function Billing() {
  const { token, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSimModal, setShowSimModal] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  
  // Active tier details states & helpers
  const [autoRenew, setAutoRenew] = useState(true);
  const [showPortalModal, setShowPortalModal] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const isExpiredParam = queryParams.get('expired') === 'true';
  const isExpiredTier = user?.subscription_tier === 'expired';
  const isExpired = isExpiredParam || isExpiredTier;

  const getActiveTierName = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'free': return 'Starter Free 🚀';
      case 'trial': return '15-Day Free Trial 🚀';
      case 'expired': return 'Subscription Expired 🔒';
      case 'pro': return 'Standard V2 🏆';
      case 'business': return 'Business Elite 💎';
      case 'enterprise': return 'Diamond V2 🏆';
      default: return (tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Starter Free') + ' 🚀';
    }
  };

  const getNetworkSpeed = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'free': return 'Standard Speed';
      case 'pro': return 'High Speed';
      case 'business':
      case 'enterprise':
        return 'Enterprise High Speed';
      default: return 'Standard Speed';
    }
  };

  const getSecurityStatus = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'free': return 'Basic Firewall';
      case 'pro': return 'Advanced Firewall';
      case 'business':
      case 'enterprise':
        return 'Hardened Shield';
      default: return 'Basic Firewall';
    }
  };

  const getGlobalRelay = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'free': return 'Disabled';
      default: return 'Enabled';
    }
  };

  const getSlaStatus = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'free': return 'Community Support';
      case 'pro': return 'Standard Support';
      case 'business': return 'Priority Support';
      case 'enterprise': return 'Dedicated 24/7 SLA Support';
      default: return 'Community Support';
    }
  };

  // Cash desk states
  const [payMethod, setPayMethod] = useState<"wallet" | "direct">("wallet");
  const [walletBalance, setWalletBalance] = useState(0.00);

  React.useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const res = await fetch('/api/auth/my-payments');
        if (res.ok) {
          const data = await res.json();
          // Sum paid add_fund or rebate transactions for wallet cash balance (exclude overdrive which applies to email limits)
           const paidSum = data
            .filter((p: any) => {
              const isPaid = p.status === 'paid';
              const isOverdrive = p.notes && p.notes.startsWith("[OVERDRIVE]");
              return isPaid && !isOverdrive;
            })
            .reduce((sum: number, p: any) => {
              const isRebate = p.notes && p.notes.startsWith("[REBATE]");
              const amt = isRebate ? -Math.abs(p.amount) : p.amount;
              return sum + amt;
            }, 0);

          const finalBalance = 0.00 + paidSum;
          setWalletBalance(finalBalance);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (token) {
      fetchWalletBalance();
    }
  }, [token]);

  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success">("idle");
  const [processingLog, setProcessingLog] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [successTxId, setSuccessTxId] = useState("");

  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  React.useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/auth/plans');
        if (res.ok) {
          const data = await res.json();
          const mappedPlans = data.map((p: any) => {
            const contactsLine = p.features.find((f: string) => f.startsWith('Contacts:')) || 'Contacts: 1,000';
            const contactsVal = contactsLine.replace('Contacts:', '').trim();

            const sendsLine = p.features.find((f: string) => f.startsWith('Sends/mo:')) || 'Sends/mo: 5,000';
            const sendsVal = sendsLine.replace('Sends/mo:', '').trim();

            const smtpLine = p.features.find((f: string) => f.startsWith('SMTP nodes:')) || 'SMTP nodes: 1';
            const smtpVal = smtpLine.replace('SMTP nodes:', '').trim();

            const teamSeatsLine = p.features.find((f: string) => f.startsWith('Team seats:')) || 'Team seats: 1';
            const teamSeatsVal = teamSeatsLine.replace('Team seats:', '').trim();

            const customFeatures = p.features.filter((f: string) => 
              !f.startsWith('Contacts:') && 
              !f.startsWith('Sends/mo:') && 
              !f.startsWith('SMTP nodes:') && 
              !f.startsWith('Team seats:')
            );

            let desc = "Custom business tier parameters";
            let color = "border-dark-700/30";
            let icon: React.ReactNode = <Zap className="text-lime-500" size={16} />;
            
            if (p.tier === 'free') {
              desc = "For personal or small business use";
              color = "border-dark-700/30";
              icon = <Zap className="text-lime-500" size={16} />;
            } else if (p.tier === 'pro') {
              desc = "For growing businesses — Best Seller";
              color = "border-brand-500/35 shadow-md shadow-brand-500/5 bg-brand-500/5";
              icon = <Sparkles className="text-brand-400" size={16} />;
            } else if (p.tier === 'business') {
              desc = "For power users & marketing teams";
              color = "border-amber-500/20";
              icon = <Award className="text-amber-400" size={16} />;
            } else if (p.tier === 'enterprise') {
              desc = "For agencies & high-volume senders";
              color = "border-emerald-500/20 hover:border-emerald-500/40";
              icon = <ShieldCheck className="text-emerald-400" size={16} />;
            } else {
              color = "border-indigo-500/20 hover:border-indigo-500/40";
              icon = <Layers className="text-indigo-400" size={16} />;
            }

            // Determine price in dollars (DB can return dollars e.g. 15 or cents e.g. 1500)
            const rawPrice = p.price || 0;
            const costPriceUSD = rawPrice > 200 ? rawPrice / 100.0 : rawPrice;
            const rawPublic = p.public_price ?? p.publicPrice ?? rawPrice;
            const publicPriceUSD = rawPublic > 200 ? rawPublic / 100.0 : rawPublic;
            const discountUSD = (p.discount || 0) > 200 ? (p.discount || 0) / 100.0 : (p.discount || 0);

            const displayPriceNum = publicPriceUSD;
            const displayPriceStr = `$${displayPriceNum.toFixed(2)}`;

            return {
              name: p.name,
              costPrice: costPriceUSD,
              publicPrice: publicPriceUSD,
              discount: discountUSD,
              desc: desc,
              specs: [
                { label: "Contacts", value: contactsVal },
                { label: "Sends/mo", value: sendsVal },
                { label: "SMTP", value: smtpVal },
                { label: "Team seats", value: teamSeatsVal }
              ],
              features: customFeatures,
              quota: p.quota,
              icon: icon,
              btnText: `Upgrade to ${p.name}`,
              tierCode: p.tier,
              color: color,
              baseMonthlyPrice: displayPriceNum
            };
          });
          setPlans(mappedPlans);
        }
      } catch (err) {
        console.error("Failed to load public plans:", err);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, [token]);


  const handleUpgrade = async (tier: string, method: "wallet" | "direct", price: number) => {
    setLoading(true);
    setCheckoutStatus("processing");
    setProcessingProgress(15);
    setProcessingLog("Contacting Campaign API authorization nodes...");

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setProcessingProgress(50);
      
      const txnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      setSuccessTxId(txnId);

      if (method === "wallet") {
        setProcessingLog("Deducting SaaS credits from wallet balance...");
      } else {
        setProcessingLog("Authorizing card payment with Stripe simulator...");
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      setProcessingProgress(80);
      setProcessingLog("Upgrading database user privileges...");

      const res = await fetch("/api/auth/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ tier, payment_method: method, billing_cycle: billingCycle })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to upgrade subscription tier in backend database.");
      }

      // Dynamic reload of payment log transactions to sync real-time wallet credits
      try {
        const paymentsRes = await fetch('/api/auth/my-payments', {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (paymentsRes.ok) {
          const data = await paymentsRes.json();
          const paidSum = data
            .filter((p: any) => {
              const isPaid = p.status === 'paid';
              const isOverdrive = p.notes && p.notes.startsWith("[OVERDRIVE]");
              return isPaid && !isOverdrive;
            })
            .reduce((sum: number, p: any) => {
              const isRebate = p.notes && p.notes.startsWith("[REBATE]");
              const amt = isRebate ? -Math.abs(p.amount) : p.amount;
              return sum + amt;
            }, 0);
          setWalletBalance(0.00 + paidSum);
        }
      } catch (err) {
        console.error("Failed to refresh wallet balance:", err);
      }

      setProcessingProgress(100);
      setProcessingLog("Subscription upgraded successfully!");
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setCheckoutStatus("success");
      await refreshUser();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "An error occurred during the checkout process.");
      setCheckoutStatus("idle");
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.tierCode === showSimModal);
  const selectedPlanPrice = selectedPlan 
    ? (billingCycle === 'yearly' 
        ? selectedPlan.baseMonthlyPrice * 12 * 0.8 
        : selectedPlan.baseMonthlyPrice)
    : 0;

  const selectedPlanPriceStr = selectedPlan 
    ? (billingCycle === 'yearly'
        ? `$${selectedPlanPrice.toFixed(2)} / yr`
        : `$${selectedPlanPrice.toFixed(2)} / mo`)
    : '';

  return (
    <div className="space-y-3.5 animate-fadeIn">
      {/* Title */}
      <div className="pb-1.5 border-b border-dark-700/20">
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <CreditCard size={18} className="text-brand-400 shrink-0" />
          <span>Subscription Plan</span>
        </h2>
        <p className="text-[10px] text-dark-400 mt-0.5">Select the pricing model that best scales with your audience assets</p>
      </div>

      {isExpired && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 text-left">
          <div className="h-9 w-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-450 dark:text-rose-400 shrink-0 font-bold text-lg">
            ⚠️
          </div>
          <div>
            <h4 className="text-xs font-bold text-rose-500 dark:text-rose-400">Subscription Expired</h4>
            <p className="text-[10px] text-dark-300 dark:text-dark-300 mt-0.5 leading-relaxed font-semibold">
              Your trial or plan subscription has expired. All sending channels, SMTP nodes, contact operations, and templates are temporarily locked. Please select a package below to renew your subscription.
            </p>
          </div>
        </div>
      )}

      {/* Currently Active Tier Section */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-dark-700/30 shadow-lg">
        {/* Banner Header */}
        <div className="bg-brand-600 dark:bg-brand-600/90 text-center py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-100">
          Currently Active Tier
        </div>
        {/* Body content */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 bg-dark-900/40">
          {/* Active Package Details */}
          <div className="flex-1 min-w-0 md:pr-6 md:pb-0 pb-3 border-b md:border-b-0 border-dark-800/40">
            <span className="text-[8px] font-bold text-dark-450 uppercase tracking-wider block mb-1">Active Package</span>
            <span className="text-xs sm:text-sm font-black text-white font-sans truncate block">{getActiveTierName(user?.subscription_tier)}</span>
          </div>

          {/* Spec Columns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 flex-[3.5] md:px-6 md:py-0 py-1 border-b md:border-b-0 border-dark-800/40">
            {/* Net Speed */}
            <div className="min-w-0">
              <span className="text-[8px] font-bold text-dark-450 uppercase tracking-wider block mb-0.5">Network Speed</span>
              <span className="text-[10px] font-semibold text-white truncate block">{getNetworkSpeed(user?.subscription_tier)}</span>
            </div>
            {/* Security */}
            <div className="min-w-0">
              <span className="text-[8px] font-bold text-dark-450 uppercase tracking-wider block mb-0.5">Security</span>
              <span className="text-[10px] font-bold text-emerald-400 truncate block">{getSecurityStatus(user?.subscription_tier)}</span>
            </div>
            {/* Global Relay */}
            <div className="min-w-0">
              <span className="text-[8px] font-bold text-dark-450 uppercase tracking-wider block mb-0.5">Global Relay</span>
              <span className="text-[10px] font-bold text-brand-400 truncate block">{getGlobalRelay(user?.subscription_tier)}</span>
            </div>
            {/* SLA Status */}
            <div className="min-w-0">
              <span className="text-[8px] font-bold text-dark-450 uppercase tracking-wider block mb-0.5">SLA Status</span>
              <span className="text-[10px] font-semibold text-white truncate block">{getSlaStatus(user?.subscription_tier)}</span>
            </div>
            {/* Expiration Date */}
            <div className="min-w-0">
              <span className="text-[8px] font-bold text-dark-450 uppercase tracking-wider block mb-0.5">Expires On</span>
              <span className="text-[10px] font-bold text-amber-400 truncate block">
                {user?.subscription_tier === 'free'
                  ? 'Never (Lifetime)'
                  : user?.subscription_expires_at 
                    ? new Date(user.subscription_expires_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Lifetime (Manual)'}
              </span>
            </div>
          </div>

          {/* Auto Renew & Billing Portal */}
          <div className="flex flex-row md:flex-col md:items-end justify-between items-center gap-3 flex-1 md:pl-6 pt-2 md:pt-0">
            <div className="flex items-center gap-2.5">
              <span className="text-[8px] font-bold text-dark-450 uppercase tracking-wider">Auto Renew</span>
              {/* Custom toggle button */}
              <button
                type="button"
                onClick={() => setAutoRenew(prev => !prev)}
                className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-300 ${autoRenew ? 'bg-emerald-500' : 'bg-dark-800 border border-dark-700'}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 ${autoRenew ? 'translate-x-3' : 'translate-x-0'}`} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowPortalModal(true)}
              className="px-4 py-1.5 bg-dark-800 hover:bg-dark-750 dark:bg-dark-900/60 dark:hover:bg-dark-800 text-dark-200 dark:text-white border border-dark-700/60 dark:border-dark-850 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm transition-all whitespace-nowrap"
            >
              Billing Portal
            </button>
          </div>
        </div>
      </div>

      {/* Monthly / Yearly Billing Cycle Toggle */}
      <div className="flex justify-center items-center gap-3 py-3 bg-dark-900/10 border border-dark-800/40 rounded-xl max-w-xs mx-auto mb-2 animate-fadeIn">
        <span className={`text-[11px] font-bold tracking-wide transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-dark-450'}`}>Monthly Billing</span>
        <button
          type="button"
          onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
          className="w-10 h-5.5 flex items-center bg-dark-800 border border-dark-700/60 rounded-full p-0.5 transition-all duration-300 relative focus:outline-none"
        >
          <div className={`w-4 h-4 rounded-full bg-brand-500 shadow-md transform transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-[18px]' : 'translate-x-0'}`} />
        </button>
        <span className={`text-[11px] font-bold tracking-wide transition-colors flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-white' : 'text-dark-450'}`}>
          <span>Yearly Billing</span>
          <span className="px-1.5 py-0.2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[7px] font-extrabold tracking-wider uppercase animate-pulse">Save 20%</span>
        </span>
      </div>

      {/* Plans Grid */}
      {plansLoading ? (
        <div className="flex items-center justify-center py-20 w-full col-span-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-10 w-full text-xs text-dark-400 font-bold col-span-full">
          No billing plans configured in system database.
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 items-stretch">
          {plans.map((p, idx) => {
            const isCurrent = user?.subscription_tier === p.tierCode;
            const staggerDelay = `${idx * 80}ms`;

            // Custom modern theme mappings
            let badgeText = null;
            let cardStyle = "bg-dark-900/60 backdrop-blur-md border-dark-800/80 hover:border-dark-700/80 shadow-lg";
            let iconBg = "bg-dark-950/80 border-dark-800/60 text-dark-400";
            
            if (isCurrent) {
              badgeText = "Active";
              cardStyle = "bg-emerald-950/10 backdrop-blur-md border-emerald-500/40 shadow-emerald-950/20 shadow-xl hover:border-emerald-500/60";
              iconBg = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
            } else if (p.tierCode === 'pro' || p.name === 'Standard') {
              badgeText = "Best Seller";
              cardStyle = "bg-brand-950/10 backdrop-blur-md border-brand-500/40 shadow-brand-500/10 shadow-xl animate-pulseGlow hover:border-brand-500/60";
              iconBg = "bg-brand-500/10 border-brand-500/30 text-brand-400";
            } else if (p.tierCode === 'business') {
              badgeText = "For Teams";
              cardStyle = "bg-amber-950/10 backdrop-blur-md border-amber-500/30 hover:border-amber-500/50 shadow-lg";
              iconBg = "bg-amber-500/10 border-amber-500/30 text-amber-400";
            } else if (p.tierCode === 'enterprise') {
              badgeText = "Enterprise";
              cardStyle = "bg-emerald-950/10 backdrop-blur-md border-emerald-500/30 hover:border-emerald-500/50 shadow-lg";
              iconBg = "bg-emerald-500/10 border-emerald-500/30 text-emerald-450";
            }

            return (
              <div
                key={p.name}
                style={{ animationDelay: staggerDelay }}
                className="opacity-0 animate-slideUp flex flex-col"
              >
                <div
                  className={`rounded-2xl border p-3 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:-translate-y-0.5 group flex-1 ${cardStyle}`}
                >
                  {badgeText && (
                    <span className={`absolute top-0 right-3 sm:right-4 px-1.5 py-0.5 text-[7px] sm:text-[8.5px] font-extrabold uppercase tracking-wider rounded-b-md shadow-md
                      ${isCurrent 
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                        : p.tierCode === 'pro' || p.name === 'Standard'
                          ? 'bg-brand-500 text-white shadow-brand-500/20'
                          : 'bg-dark-800 text-dark-300 border-x border-b border-dark-700'
                      }
                    `}>
                      {badgeText}
                    </span>
                  )}
                  
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col items-center mt-1 sm:mt-2 text-center">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mb-2 ${iconBg}`}>
                        {React.cloneElement(p.icon as React.ReactElement, { size: 14 })}
                      </div>
                      <h3 className="text-xs sm:text-sm font-black text-white font-sans tracking-wide uppercase">{p.name}</h3>
                      <p className="text-[9px] sm:text-[10px] text-dark-400 mt-0.5 sm:mt-1 leading-normal max-w-[190px] line-clamp-2 sm:line-clamp-none">{p.desc}</p>
                    </div>
 
                    {(() => {
                      const displayPriceNum = billingCycle === 'yearly' 
                        ? p.baseMonthlyPrice * 0.8  // 20% off monthly average
                        : p.baseMonthlyPrice;
                      
                      const displayPriceStr = `$${displayPriceNum.toFixed(2)}`;
                      const yearlyTotalStr = `$${(p.baseMonthlyPrice * 12 * 0.8).toFixed(2)}`;

                      return (
                        <div className="flex flex-col items-center justify-center py-0.5 sm:py-1 text-center">
                          {token && p.discount > 0 && (
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-[10px] text-dark-500 line-through">
                                ${((billingCycle === 'yearly' ? p.publicPrice * 12 : p.publicPrice)).toFixed(2)}
                              </span>
                              <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-1 py-0.2 rounded">
                                Save ${((billingCycle === 'yearly' ? p.discount * 12 + (p.publicPrice - p.discount) * 12 * 0.2 : p.discount)).toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-baseline justify-center gap-0.5">
                            <span className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">{displayPriceStr}</span>
                            <span className="text-[8.5px] sm:text-[10px] text-dark-450 font-semibold">/ mo</span>
                          </div>
                          <span className="text-[8px] sm:text-[9px] text-dark-500 mt-0.5 font-medium">
                            {billingCycle === 'yearly' 
                              ? `Billed annually: ${yearlyTotalStr}/yr`
                              : p.baseMonthlyPrice > 0 ? `Annual $${(p.baseMonthlyPrice * 9).toFixed(2)}` : 'Always free'}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="h-[1px] bg-dark-800/40" />
 
                    {/* Specifications Grid */}
                    <div className="space-y-1.5 py-0.5 sm:py-1 px-0.5">
                      {p.specs.map((spec: any) => (
                        <div key={spec.label} className="flex justify-between items-center text-[9.5px] sm:text-[10.5px] border-b border-dark-850/40 pb-1.5 last:border-0 last:pb-0">
                          <span className="text-dark-450 font-medium flex items-center gap-1.5">
                            {spec.label === "Contacts" && <Users size={10} className="text-sky-400 shrink-0" />}
                            {spec.label === "Sends/mo" && <Send size={10} className="text-brand-400 shrink-0" />}
                            {spec.label === "SMTP" && <Server size={10} className="text-amber-400 shrink-0" />}
                            {spec.label === "Team seats" && <Layers size={10} className="text-emerald-400 shrink-0" />}
                            <span>{spec.label}</span>
                          </span>
                          <span className="text-white font-extrabold font-mono">{spec.value}</span>
                        </div>
                      ))}
                    </div>
 
                    <div className="h-[1px] bg-dark-800/40" />
 
                    <ul className="space-y-1.5 text-left w-full pl-1 sm:pl-2 pr-1">
                      {p.features.slice(0, 3).map((f: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[9px] sm:text-[10px] text-dark-300 leading-normal">
                          <span className="p-0.5 bg-brand-500/10 text-brand-450 rounded border border-brand-500/20 mt-0.5 shrink-0">
                            <Check size={6} className="stroke-[3]" />
                          </span>
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
 
                  <div className="mt-4 sm:mt-5 pt-1">
                    {isCurrent ? (
                      <div className="w-full py-1.5 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs font-bold rounded-lg text-center bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-center gap-1 shadow-sm shadow-emerald-500/5 cursor-default">
                        <Check size={12} className="stroke-[3]" />
                        <span>Active Plan</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setShowSimModal(p.tierCode);
                          setCheckoutStatus("idle");
                          setPayMethod("wallet");
                          setProcessingProgress(0);
                          setProcessingLog("");
                        }}
                        className={`w-full py-1.5 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1
                          ${p.tierCode === 'pro' || p.name === 'Standard'
                            ? 'brand-gradient-bg text-white shadow-md shadow-brand-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99]'
                            : 'bg-dark-850 dark:bg-white/5 hover:bg-dark-700 dark:hover:bg-white/10 text-dark-100 dark:text-white border border-dark-600/40 dark:border-white/10 hover:border-dark-500 dark:hover:border-white/20 hover:scale-[1.01] active:scale-[0.99]'}
                        `}
                      >
                        <span>{p.btnText}</span>
                        <ArrowUpRight size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-Option Cashier Checkout Modal */}
      {showSimModal && selectedPlan && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-dark-900 border border-dark-700/50 rounded-2xl p-4.5 shadow-2xl relative animate-scaleUp">
            
            {/* 1. IDLE STATE: Payment Method Selector & Inputs */}
            {checkoutStatus === "idle" && (
              <>
                {/* Modal Header */}
                <div className="text-center mb-4">
                  <div className="h-9 w-9 bg-brand-500/10 text-brand-400 rounded-full mx-auto flex items-center justify-center mb-3 border border-brand-500/20">
                    <CreditCard size={18} />
                  </div>
                  <h4 className="text-sm font-extrabold text-white font-sans uppercase tracking-wider">Secure Cash Desk</h4>
                  <p className="text-[10px] text-dark-400 mt-0.5">Select a payment method to complete your tier upgrade</p>
                </div>

                {/* Plan Info Badge */}
                <div className="p-3 bg-dark-950 rounded-xl border border-dark-850 flex justify-between items-center mb-3">
                  <div>
                    <span className="text-[8px] text-dark-500 font-extrabold uppercase tracking-widest block">Selected Plan</span>
                    <span className="text-xs font-bold text-white uppercase">{selectedPlan.name} Upgrade</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-dark-500 font-extrabold uppercase tracking-widest block">Price</span>
                    <span className="text-xs font-mono font-black text-brand-400">{selectedPlanPriceStr}</span>
                  </div>
                </div>

                {/* Billing Cycle Selector Tabs */}
                <div className="flex gap-1.5 p-1 bg-dark-950 rounded-xl border border-dark-850 mb-3">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                      billingCycle === 'monthly'
                        ? 'bg-brand-500 text-white shadow'
                        : 'text-dark-450 hover:text-white'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("yearly")}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      billingCycle === 'yearly'
                        ? 'bg-brand-500 text-white shadow'
                        : 'text-dark-450 hover:text-white'
                    }`}
                  >
                    <span>Yearly Billing</span>
                    <span className="px-1 py-0.2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded text-[7px] font-extrabold tracking-wider uppercase">Save 20%</span>
                  </button>
                </div>

                {/* Payment Method Tabs */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setPayMethod("wallet")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center gap-1.5
                      ${payMethod === 'wallet' 
                        ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5' 
                        : 'border-dark-800 bg-dark-950/40 hover:border-dark-700'}
                    `}
                  >
                    <Wallet size={16} className={payMethod === "wallet" ? "text-brand-400" : "text-dark-400"} />
                    <span className="text-[10px] font-bold text-white font-sans">Wallet Balance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod("direct")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center gap-1.5
                      ${payMethod === 'direct' 
                        ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5' 
                        : 'border-dark-800 bg-dark-950/40 hover:border-dark-700'}
                    `}
                  >
                    <CreditCard size={16} className={payMethod === "direct" ? "text-brand-400" : "text-dark-400"} />
                    <span className="text-[10px] font-bold text-white font-sans">Direct Card Pay</span>
                  </button>
                </div>

                {/* Method Content */}
                {payMethod === "wallet" ? (
                  <div className="space-y-3 mb-4">
                    <div className="p-3 bg-dark-950 rounded-xl border border-dark-850 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-dark-300">
                        <span>Available Balance</span>
                        <span className="font-mono font-bold text-white">${walletBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-dark-300">
                        <span>Upgrade Cost</span>
                        <span className="font-mono font-bold text-white">-${selectedPlanPrice.toFixed(2)}</span>
                      </div>
                      
                      <div className="h-[1px] bg-dark-800/40 my-1" />
                      
                      {walletBalance >= selectedPlanPrice ? (
                        <div className="flex justify-between items-center text-dark-300">
                          <span>Remaining Balance</span>
                          <span className="font-mono font-bold text-emerald-400">${(walletBalance - selectedPlanPrice).toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-rose-400 font-bold">
                          <span>Shortage</span>
                          <span className="font-mono font-bold text-rose-400">${(selectedPlanPrice - walletBalance).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {walletBalance < selectedPlanPrice && (
                      <div className="p-2.5 bg-rose-500/5 rounded-xl border border-rose-500/10 text-[9px] text-rose-450 leading-normal flex items-start gap-1.5 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 shrink-0 animate-ping" />
                        <span>Your Wallet balance is insufficient. Please recharge your wallet balance or use Direct Card Pay to proceed.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 mb-4">
                    <div className="flex flex-col gap-1">
                      <label className="block text-[8px] font-bold text-dark-400 uppercase tracking-wider">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-1.5 bg-dark-950 border border-dark-850 rounded-lg text-xs text-brand-300 focus:outline-none placeholder:text-dark-700 transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="block text-[8px] font-bold text-dark-400 uppercase tracking-wider">Credit Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                           onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                          className="w-full pl-3.5 pr-10 py-1.5 bg-dark-950 border border-dark-850 rounded-lg text-xs text-brand-300 font-mono focus:outline-none placeholder:text-dark-700 transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          <ShieldCheck size={14} className="text-emerald-450" />
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="block text-[8px] font-bold text-dark-400 uppercase tracking-wider">Expiration Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full px-3 py-1.5 bg-dark-950 border border-dark-850 rounded-lg text-xs text-brand-300 font-mono focus:outline-none placeholder:text-dark-700 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="block text-[8px] font-bold text-dark-400 uppercase tracking-wider">CVV Code</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          maxLength={3}
                          placeholder="•••"
                          className="w-full px-3 py-1.5 bg-dark-950 border border-dark-850 rounded-lg text-xs text-brand-300 font-mono focus:outline-none placeholder:text-dark-700 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSimModal(null);
                      setPayMethod("wallet");
                      setCheckoutStatus("idle");
                    }}
                    className="flex-1 py-2 bg-dark-850 dark:bg-dark-950 hover:bg-dark-700 dark:hover:bg-dark-900 text-xs font-bold text-dark-100 dark:text-white border border-dark-600/40 dark:border-dark-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>

                  {payMethod === "wallet" ? (
                    walletBalance >= selectedPlanPrice ? (
                      <button
                        type="button"
                        onClick={() => handleUpgrade(selectedPlan.tierCode, "wallet", selectedPlanPrice)}
                        className="flex-1 py-2 brand-gradient-bg text-white text-xs font-bold rounded-lg shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
                      >
                        Deduct & Upgrade
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSimModal(null);
                          navigate("/wallet");
                        }}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-dark-950 text-xs font-bold rounded-lg shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5"
                      >
                        <span>Top Up Wallet</span>
                        <ArrowRight size={12} />
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={!cardNumber || !cardExpiry || !cardCvv}
                      onClick={() => handleUpgrade(selectedPlan.tierCode, "direct", selectedPlanPrice)}
                      className="flex-1 py-2 brand-gradient-bg text-white text-xs font-bold rounded-lg shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                      Pay & Upgrade
                    </button>
                  )}
                </div>
              </>
            )}

            {/* 2. PROCESSING STATE: Loader & progress indicator */}
            {checkoutStatus === "processing" && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-brand-500/10 border-t-brand-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-brand-400">
                    <ShieldCheck size={22} className="animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1.5 w-full">
                  <h4 className="text-sm font-bold text-white font-sans uppercase tracking-wider animate-pulse">
                    Authorizing Payment
                  </h4>
                  <p className="text-[10px] text-dark-400 font-semibold max-w-[240px] mx-auto leading-relaxed">
                    Executing dynamic cashier checkout protocols...
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-dark-950 rounded-full h-1.5 overflow-hidden border border-dark-850">
                  <div 
                    className="brand-gradient-bg h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>

                <div className="w-full">
                  <span className="text-[8.5px] font-extrabold text-brand-400 bg-brand-500/5 px-3 py-1 rounded-full border border-brand-500/10 font-mono tracking-wide inline-block leading-normal max-w-full truncate">
                    {processingProgress}% - {processingLog}
                  </span>
                </div>
              </div>
            )}

            {/* 3. SUCCESS STATE: Checkmark Deposit verified screen */}
            {checkoutStatus === "success" && (
              <div className="py-4 flex flex-col items-center justify-center text-center space-y-4 animate-scaleUp">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-bounce">
                  <Check size={24} className="stroke-[3]" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white tracking-wide uppercase">Upgrade Successful</h4>
                  <p className="text-[9.5px] text-dark-400">Your account tier has been successfully upgraded</p>
                </div>

                {/* Receipt Box */}
                <div className="w-full p-3 bg-dark-950 rounded-xl border border-dark-850 text-left space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-dark-400">
                    <span>Upgraded Plan</span>
                    <span className="font-bold text-white uppercase text-[9px]">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-dark-400">
                    <span>Transaction ID</span>
                    <span className="font-bold text-white font-mono">{successTxId}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-dark-400">
                    <span>Payment Method</span>
                    <span className="font-bold text-brand-300 font-sans uppercase text-[9px]">
                      {payMethod === "wallet" ? "SaaS Wallet deduction" : "Stripe Direct Pay"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-dark-400 border-t border-dark-850/50 pt-2">
                    <span>Account Status</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">ACTIVE TIER</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSimModal(null);
                    setPayMethod("wallet");
                    setCheckoutStatus("idle");
                    setProcessingProgress(0);
                    setProcessingLog("");
                    setCardHolder("");
                    setCardNumber("");
                    setCardExpiry("");
                    setCardCvv("");
                    window.location.reload(); // Refresh to ensure layout states refresh
                  }}
                  className="w-full py-2 brand-gradient-bg hover:scale-[1.01] active:scale-[0.99] text-white text-xs font-bold rounded-lg shadow-md transition-all text-center"
                >
                  Done
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Billing Portal Modal */}
      {showPortalModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-900 border border-dark-700/50 rounded-2xl p-5 shadow-2xl relative animate-scaleUp text-white">
            <div className="flex justify-between items-center border-b border-dark-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="text-brand-400" size={18} />
                <h4 className="text-xs font-black uppercase tracking-wider">ASTRA IT Stripe Customer Portal</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPortalModal(false)}
                className="text-dark-400 hover:text-white text-xs font-bold font-sans"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-dark-950 border border-dark-850 rounded-xl space-y-2">
                <span className="text-[8px] font-bold text-dark-500 uppercase tracking-widest block">Billing Profile</span>
                <div className="flex justify-between text-dark-300">
                  <span>Customer Email</span>
                  <span className="text-white font-semibold">{user?.email}</span>
                </div>
                <div className="flex justify-between text-dark-300">
                  <span>Active Plan</span>
                  <span className="text-emerald-400 font-bold uppercase">{user?.subscription_tier || 'Free'} Tier</span>
                </div>
                <div className="flex justify-between text-dark-300">
                  <span>Billing Cycle</span>
                  <span className="text-white font-semibold">Monthly Auto-Renew</span>
                </div>
              </div>

              <div className="p-3 bg-dark-950 border border-dark-850 rounded-xl space-y-2">
                <span className="text-[8px] font-bold text-dark-500 uppercase tracking-widest block">Payment Method</span>
                <div className="flex justify-between items-center text-dark-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Visa ending in 4242</span>
                  </div>
                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded">Default</span>
                </div>
              </div>

              <div className="p-3 bg-dark-950 border border-dark-850 rounded-xl space-y-2">
                <span className="text-[8px] font-bold text-dark-500 uppercase tracking-widest block">Mock Invoice History</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-dark-400 border-b border-dark-850 pb-1.5 last:border-0 last:pb-0">
                    <span>Jun 01, 2026 - Plan Upgrade</span>
                    <span className="font-mono text-white font-bold">$25.00 Paid</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-dark-400 border-b border-dark-850 pb-1.5 last:border-0 last:pb-0">
                    <span>May 01, 2026 - Monthly Renewal</span>
                    <span className="font-mono text-white font-bold">$25.00 Paid</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-dark-400 border-b border-dark-850 pb-1.5 last:border-0 last:pb-0">
                    <span>Apr 01, 2026 - Account Setup</span>
                    <span className="font-mono text-white font-bold">$0.00 Free</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-dark-800 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPortalModal(false)}
                className="px-4 py-1.5 bg-dark-800 hover:bg-dark-750 text-white rounded-lg text-[10px] font-bold transition-all"
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
