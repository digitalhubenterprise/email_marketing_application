import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { CreditCard, Check, ShieldCheck, Mail, ArrowUpRight, Zap, Sparkles, Award, Wallet, ArrowRight, Users, Send, Server, Layers } from 'lucide-react'

export default function Billing() {
  const { token, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSimModal, setShowSimModal] = useState<string | null>(null);

  // Cash desk states
  const [payMethod, setPayMethod] = useState<"wallet" | "direct">("wallet");
  const [walletBalance, setWalletBalance] = useState(() => {
    const saved = localStorage.getItem("wallet_balance");
    return saved ? parseFloat(saved) : 25.40;
  });

  // Load real transactions and compute real balance from backend paid payments
  React.useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const res = await fetch('/api/auth/my-payments', {
          headers: { "Authorization": `Bearer ${token}` }
        });
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

          const finalBalance = 25.40 + paidSum;
          setWalletBalance(finalBalance);
          localStorage.setItem("wallet_balance", finalBalance.toString());
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

            return {
              name: p.name,
              price: `$${p.price.toLocaleString()}`,
              priceNum: p.price,
              desc: desc,
              priceDetail: `Annual $${(p.price * 9).toLocaleString()}`,
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
              color: color
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
  }, []);


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
        const currentBalance = parseFloat(localStorage.getItem("wallet_balance") || "25.40");
        if (currentBalance < price) {
          alert("Insufficient balance!");
          setCheckoutStatus("idle");
          setLoading(false);
          return;
        }
        
        const newBalance = currentBalance - price;
        localStorage.setItem("wallet_balance", newBalance.toString());
        setWalletBalance(newBalance);
        
        // Log transaction to transactions list in localStorage
        const savedTx = localStorage.getItem("wallet_transactions");
        let transactions = [];
        if (savedTx) {
          try { transactions = JSON.parse(savedTx); } catch (e) {}
        }
        transactions.unshift({
          id: txnId,
          desc: `Plan Upgrade to ${tier.toUpperCase()} (Wallet Deduction)`,
          amount: -price,
          date: new Date().toISOString().split("T")[0],
          type: "debit",
          status: "Completed"
        });
        localStorage.setItem("wallet_transactions", JSON.stringify(transactions));
      } else {
        setProcessingLog("Authorizing card payment with Stripe simulator...");
        const savedTx = localStorage.getItem("wallet_transactions");
        let transactions = [];
        if (savedTx) {
          try { transactions = JSON.parse(savedTx); } catch (e) {}
        }
        transactions.unshift({
          id: txnId,
          desc: `Plan Upgrade to ${tier.toUpperCase()} (Direct Card Pay)`,
          amount: -price,
          date: new Date().toISOString().split("T")[0],
          type: "debit",
          status: "Completed"
        });
        localStorage.setItem("wallet_transactions", JSON.stringify(transactions));
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
        body: JSON.stringify({ tier })
      });

      if (!res.ok) {
        throw new Error("Failed to upgrade subscription tier in backend database.");
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

  return (
    <div className="space-y-3.5 animate-fadeIn">
      {/* Title */}
      <div className="pb-1.5 border-b border-dark-700/20">
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <CreditCard size={18} className="text-brand-400 shrink-0" />
          <span>SaaS Subscription Desk</span>
        </h2>
        <p className="text-[10px] text-dark-400 mt-0.5">Select the pricing model that best scales with your audience assets</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-stretch">
          {plans.map((p, idx) => {
            const isCurrent = user?.subscription_tier === p.tierCode;
            const staggerDelay = `${idx * 80}ms`;
            return (
              <div
                key={p.name}
                style={{ animationDelay: staggerDelay }}
                className="opacity-0 animate-slideUp flex flex-col"
              >
                <div
                  className={`glass-panel p-4.5 rounded-xl border flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:-translate-y-0.5 group shadow-lg flex-1 ${p.color} ${
                    p.name === "Standard" ? "animate-pulseGlow" : ""
                  }`}
                >
                  {p.name === "Standard" && (
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-brand-500 text-white text-[8px] font-extrabold uppercase tracking-wider rounded-b-md shadow-md shadow-brand-500/20">
                      Most Popular
                    </span>
                  )}
                  
                  <div className="space-y-4">
                    <div className="flex flex-col items-center mt-1 text-center">
                      <div className="w-8 h-8 rounded-full bg-dark-950/80 border border-dark-700/50 flex items-center justify-center text-dark-400 group-hover:scale-110 transition-transform duration-300 mb-2">
                        {p.icon}
                      </div>
                      <h3 className="text-sm font-bold text-white font-sans">{p.name}</h3>
                      <p className="text-[10px] text-dark-400 mt-0.5 leading-normal max-w-[170px]">{p.desc}</p>
                    </div>

                    <div className="flex flex-col items-center justify-center py-1 text-center">
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-2xl font-extrabold text-white tracking-tight">{p.price}</span>
                        <span className="text-[10px] text-dark-400 font-medium">/ month</span>
                      </div>
                      {p.priceDetail && (
                        <span className="text-[9px] text-dark-400 mt-0.5 font-medium">{p.priceDetail}</span>
                      )}
                    </div>

                    <div className="h-[1px] bg-dark-700/20" />

                    {/* Specifications Grid */}
                    <div className="space-y-2 py-1 px-1.5">
                      {p.specs.map((spec: any) => (
                        <div key={spec.label} className="flex justify-between items-center text-[11px]">
                          <span className="text-dark-400 font-medium flex items-center gap-1.5">
                            {spec.label === "Contacts" && <Users size={12} className="text-dark-500 shrink-0" />}
                            {spec.label === "Sends/mo" && <Send size={12} className="text-dark-500 shrink-0" />}
                            {spec.label === "SMTP" && <Server size={12} className="text-dark-500 shrink-0" />}
                            {spec.label === "Team seats" && <Layers size={12} className="text-dark-500 shrink-0" />}
                            <span>{spec.label}</span>
                          </span>
                          <span className="text-white font-extrabold font-mono">{spec.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="h-[1px] bg-dark-700/20" />

                    <ul className="space-y-2 text-left w-full pl-5 pr-2">
                      {p.features.map((f: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-[10.5px] text-dark-300 leading-relaxed">
                          <span className="p-0.5 bg-brand-500/10 text-brand-400 rounded-md border border-brand-500/20 mt-0.5 shrink-0">
                            <Check size={8} />
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4.5 pt-2">
                    <button
                      type="button"
                      disabled={isCurrent || loading}
                      onClick={() => {
                        setShowSimModal(p.tierCode);
                        setCheckoutStatus("idle");
                        setPayMethod("wallet");
                        setProcessingProgress(0);
                        setProcessingLog("");
                      }}
                      className={`w-full py-2 px-4 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5
                        ${isCurrent 
                          ? 'bg-dark-950 text-dark-400 border border-dark-800 cursor-default' 
                          : p.name === 'Standard'
                            ? 'brand-gradient-bg text-white shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-[0.99]'
                            : 'bg-dark-950 hover:bg-dark-900 text-white border border-dark-700 hover:scale-[1.01] active:scale-[0.99]'}
                      `}
                    >
                      <span>{isCurrent ? "Active Plan" : p.btnText}</span>
                      {!isCurrent && <ArrowUpRight size={12} />}
                    </button>
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
                    <span className="text-xs font-mono font-black text-brand-400">{selectedPlan.price} / mo</span>
                  </div>
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
                        <span className="font-mono font-bold text-white">-${selectedPlan.priceNum.toFixed(2)}</span>
                      </div>
                      
                      <div className="h-[1px] bg-dark-800/40 my-1" />
                      
                      {walletBalance >= selectedPlan.priceNum ? (
                        <div className="flex justify-between items-center text-dark-300">
                          <span>Remaining Balance</span>
                          <span className="font-mono font-bold text-emerald-400">${(walletBalance - selectedPlan.priceNum).toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-rose-400 font-bold">
                          <span>Shortage</span>
                          <span className="font-mono font-bold text-rose-400">${(selectedPlan.priceNum - walletBalance).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {walletBalance < selectedPlan.priceNum && (
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
                    className="flex-1 py-2 bg-dark-950 hover:bg-dark-900 text-xs font-bold text-white border border-dark-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>

                  {payMethod === "wallet" ? (
                    walletBalance >= selectedPlan.priceNum ? (
                      <button
                        type="button"
                        onClick={() => handleUpgrade(selectedPlan.tierCode, "wallet", selectedPlan.priceNum)}
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
                      onClick={() => handleUpgrade(selectedPlan.tierCode, "direct", selectedPlan.priceNum)}
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
    </div>
  );
}
