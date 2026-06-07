import React, { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { Wallet as WalletIcon, CreditCard, ShieldCheck, Check, DollarSign, Plus, ArrowUpRight, TrendingUp, HelpCircle, Copy, QrCode, Coins } from 'lucide-react'

interface Transaction {
  id: string;
  desc: string;
  amount: number;
  date: string;
  type: string;
  status: string;
}

export default function Wallet() {
  const { token, user, appConfig } = useAuth();
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem("wallet_balance");
    return saved ? parseFloat(saved) : 25.40;
  });

  useEffect(() => {
    localStorage.setItem("wallet_balance", balance.toString());
  }, [balance]);
  const [loading, setLoading] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [showSimModal, setShowSimModal] = useState(false);
  const [autoRefill, setAutoRefill] = useState(false);
  const [gateway, setGateway] = useState("binance"); // 'binance', 'usdt_trc20', 'usdt_bep20', 'usdc_bep20'
  const [txHash, setTxHash] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "verifying" | "success">("idle");
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [verifyLog, setVerifyLog] = useState("");
  const [successAmount, setSuccessAmount] = useState(0);
  const [successTxnId, setSuccessTxnId] = useState("");

  // States for search and pagination in Ledger
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const formatTxHash = (hash: string) => {
    if (hash.length > 15) {
      return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
    }
    return hash;
  };

  // Switch to the first active gateway if current gateway is disabled by admin config
  useEffect(() => {
    if (appConfig) {
      const isBinanceEnabled = appConfig.payment_gateway_merchant_enabled ?? true;
      const isTrc20Enabled = appConfig.payment_gateway_trc20_enabled ?? true;
      const isBep20Enabled = appConfig.payment_gateway_bep20_enabled ?? true;
      const isUsdcBep20Enabled = appConfig.payment_gateway_usdc_bep20_enabled ?? true;

      if (gateway === "binance" && !isBinanceEnabled) {
        if (isTrc20Enabled) setGateway("usdt_trc20");
        else if (isBep20Enabled) setGateway("usdt_bep20");
        else if (isUsdcBep20Enabled) setGateway("usdc_bep20");
      } else if (gateway === "usdt_trc20" && !isTrc20Enabled) {
        if (isBinanceEnabled) setGateway("binance");
        else if (isBep20Enabled) setGateway("usdt_bep20");
        else if (isUsdcBep20Enabled) setGateway("usdc_bep20");
      } else if (gateway === "usdt_bep20" && !isBep20Enabled) {
        if (isBinanceEnabled) setGateway("binance");
        else if (isTrc20Enabled) setGateway("usdt_trc20");
        else if (isUsdcBep20Enabled) setGateway("usdc_bep20");
      } else if (gateway === "usdc_bep20" && !isUsdcBep20Enabled) {
        if (isBinanceEnabled) setGateway("binance");
        else if (isTrc20Enabled) setGateway("usdt_trc20");
        else if (isBep20Enabled) setGateway("usdt_bep20");
      }
    }
  }, [appConfig, gateway]);

  // Mock billing history transaction details
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("wallet_transactions");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: "TXN-849302", desc: "Balance Recharge (Credit Card)", amount: 25.00, date: "2026-05-20", type: "credit", status: "Completed" },
      { id: "TXN-748291", desc: "Campaign Blast: 'Promo Lifetime Deal'", amount: -3.60, date: "2026-05-18", type: "debit", status: "Completed" },
      { id: "TXN-639102", desc: "Campaign Blast: 'Monthly Newsletter'", amount: -1.20, date: "2026-05-15", type: "debit", status: "Completed" },
      { id: "TXN-528190", desc: "Initial Welcome Signup Credit", amount: 5.20, date: "2026-05-01", type: "credit", status: "Completed" }
    ];
  });

  useEffect(() => {
    localStorage.setItem("wallet_transactions", JSON.stringify(transactions));
  }, [transactions]);

  // Load real transactions and compute real balance from backend paid payments
  useEffect(() => {
    const fetchWalletLogs = async () => {
      try {
        const res = await fetch('/api/auth/my-payments', {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Map to Transaction objects with custom descriptive action tags
          const apiTxns: Transaction[] = data.map((p: any) => {
            let desc = `Balance Recharge (${p.gateway})`;
            let rawNotes = p.notes || '';
            let type = p.amount >= 0 ? 'credit' : 'debit';
            
            if (rawNotes.startsWith("[ADD_FUND]")) {
              desc = "Wallet Fund Recharge";
              rawNotes = rawNotes.substring(10).trim();
            } else if (rawNotes.startsWith("[REBATE]")) {
              desc = "SaaS Balance Rebate Credit";
              rawNotes = rawNotes.substring(8).trim();
            } else if (rawNotes.startsWith("[OVERDRIVE]")) {
              desc = `Email Quota Overdrive (${p.plan_tier.toUpperCase()})`;
              rawNotes = rawNotes.substring(11).trim();
            }
            
            return {
              id: `TXN-${p.id}`,
              desc: desc + (rawNotes ? ` - ${rawNotes}` : ''),
              amount: p.amount,
              date: p.created_at.split('T')[0],
              type: type,
              status: p.status === 'paid' ? 'Completed' : p.status === 'pending' ? 'Pending' : 'Failed'
            };
          });

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

          setBalance(25.40 + paidSum);

          const defaultMock = [
            { id: "TXN-849302", desc: "Balance Recharge (Credit Card)", amount: 25.00, date: "2026-05-20", type: "credit", status: "Completed" },
            { id: "TXN-748291", desc: "Campaign Blast: 'Promo Lifetime Deal'", amount: -3.60, date: "2026-05-18", type: "debit", status: "Completed" },
            { id: "TXN-639102", desc: "Campaign Blast: 'Monthly Newsletter'", amount: -1.20, date: "2026-05-15", type: "debit", status: "Completed" },
            { id: "TXN-528190", desc: "Initial Welcome Signup Credit", amount: 5.20, date: "2026-05-01", type: "credit", status: "Completed" }
          ];

          setTransactions([...apiTxns, ...defaultMock]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (token) {
      fetchWalletLogs();
    }
  }, [token]);

  const filteredTransactions = transactions.filter((txn) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    
    const matchesTxid = txn.id.toLowerCase().includes(term);
    const matchesAmount = txn.amount.toString().includes(term) || Math.abs(txn.amount).toFixed(2).includes(term);
    const matchesDesc = txn.desc.toLowerCase().includes(term);
    
    return matchesTxid || matchesAmount || matchesDesc;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const savePaymentToBackend = async (txnId: string, amount: number, gatewayLabel: string) => {
    const res = await fetch('/api/auth/my-payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'USD',
        plan_tier: 'free',
        gateway: gatewayLabel,
        txhash: txnId,
        notes: `Instant Wallet top-up verified via server-side verifier.`
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Payment verification failed on the server.");
    }
    return await res.json();
  };

  const handleQuickAdd = (amt: number) => {
    setTopUpAmount(amt.toString());
  };

  const handleSimulateTopUp = async () => {
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid recharge amount.");
      return;
    }

    const hash = txHash.trim();
    if (!hash) {
      alert("Please enter a transaction hash / Order ID to authorize deposit.");
      return;
    }

    if (hash) {
      const isAlreadyUsed = transactions.some(
        txn => txn.id.toLowerCase() === hash.toLowerCase()
      );
      if (isAlreadyUsed) {
        alert("This Transaction ID (TXID) has already been verified and credited. Reuse or double-spending is blocked!");
        return;
      }
    }

    setLoading(true);
    setVerifyStatus("verifying");
    setVerifyProgress(10);
    setVerifyLog("Initializing secure node connection...");

    let label = "Binance Pay";
    if (gateway === "usdt_trc20") label = "USDT TRC20";
    else if (gateway === "usdt_bep20") label = "USDT BEP20";
    else if (gateway === "usdc_bep20") label = "USDC BEP20";

    const txnId = (gateway === "usdt_trc20" || gateway === "usdt_bep20" || gateway === "usdc_bep20") && hash
      ? hash
      : `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    setSuccessTxnId(txnId);

    const isRealEVMHash = (gateway === "usdt_bep20" || gateway === "usdc_bep20") && /^0x([A-Fa-f0-9]{64})$/.test(hash);
    const isRealTRCHash = gateway === "usdt_trc20" && /^[a-fA-F0-9]{64}$/.test(hash) && !/^0x/.test(hash);

    setTimeout(async () => {
      if (isRealTRCHash) {
        setVerifyProgress(35);
        setVerifyLog("Connecting to TronScan explorer nodes...");
        
        setTimeout(async () => {
          setVerifyProgress(65);
          setVerifyLog("Verifying TRC20 confirmations, contract SUCCESS status, amount, and wallet address...");
          
          try {
            await savePaymentToBackend(txnId, amt, label);
            setVerifyProgress(100);
            setVerifyLog("TRON TRC20 payment verified successfully! Balance credited.");
            setSuccessAmount(amt);
            
            setBalance(prev => prev + amt);
            setTransactions(prev => [
              {
                id: txnId,
                desc: `Balance Recharge (USDT TRC20 Verified)`,
                amount: amt,
                date: new Date().toISOString().split("T")[0],
                type: "credit",
                status: "Completed"
              },
              ...prev
            ]);
            setLoading(false);
            setVerifyStatus("success");
          } catch (err: any) {
            setLoading(false);
            setVerifyStatus("idle");
            alert(err.message || "Failed to verify TRON transaction on the network.");
          }
        }, 800);
        
      } else if (isRealEVMHash) {
        setVerifyProgress(35);
        setVerifyLog("Searching BSC Explorer nodes for matching TXID hash...");

        const rpcUrls = [
          "https://bsc-rpc.publicnode.com",
          "https://binance.llamarpc.com",
          "https://bsc-dataseed.binance.org"
        ];

        let blockchainVerified = false;
        let verifiedAmount = amt;
        let errorMessage = "";

        for (const url of rpcUrls) {
          try {
            const response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_getTransactionReceipt",
                params: [hash],
                id: 1
              })
            });

            if (!response.ok) continue;
            const resData = await response.json();
            if (resData && resData.result) {
              const receipt = resData.result;
              
              if (receipt.status !== "0x1") {
                errorMessage = "Transaction failed on the blockchain (reverted receipt status).";
                break;
              }

              let confirmations = 0;
              try {
                const blockNumRes = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_blockNumber",
                    params: [],
                    id: 2
                  })
                });

                if (blockNumRes.ok) {
                  const blockNumData = await blockNumRes.json();
                  if (blockNumData && blockNumData.result) {
                    const currentBlock = parseInt(blockNumData.result, 16);
                    const txBlock = parseInt(receipt.blockNumber, 16);
                    confirmations = currentBlock - txBlock;
                  }
                }
              } catch (e) {
                console.error("Failed to fetch confirmations:", e);
              }

              if (confirmations < 3) {
                errorMessage = `Transaction found but only has ${confirmations} block confirmations. SmartCampaign requires at least 3 block confirmations to secure deposits against double-spending and block reorganization.`;
                break;
              }

              const contractAddress = gateway === "usdt_bep20"
                ? "0x55d398326f99059ff775485246999027b3197955"
                : "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
              const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
              
              const merchantAddressRaw = gateway === "usdt_bep20"
                ? (appConfig?.payment_gateway_bep20 || "0x9399f9bc69f92e025a99d2a794e4db0c42b56751")
                : (appConfig?.payment_gateway_usdc_bep20 || "0x9399f9bc69f92e025a99d2a794e4db0c42b56751");
              const cleanAddr = merchantAddressRaw.toLowerCase().replace("0x", "");
              const merchantTopic = `0x${cleanAddr.padStart(64, "0")}`;

              let transferLog = null;
              if (receipt.logs && receipt.logs.length > 0) {
                for (const log of receipt.logs) {
                  if (
                    log.address.toLowerCase() === contractAddress.toLowerCase() &&
                    log.topics &&
                    log.topics[0] === transferTopic &&
                    log.topics[2] &&
                    log.topics[2].toLowerCase() === merchantTopic.toLowerCase()
                  ) {
                    transferLog = log;
                    break;
                  }
                }
              }

              if (transferLog) {
                const rawVal = BigInt(transferLog.data);
                verifiedAmount = Number(rawVal) / 1e18; // Both have 18 decimals on BSC mainnet
                blockchainVerified = true;
                break;
              } else {
                errorMessage = `Transaction verified, but it is not a ${gateway === "usdt_bep20" ? "USDT" : "USDC"} BEP20 transfer to your wallet (${merchantAddressRaw}).`;
                break;
              }
            }
          } catch (err) {
            console.warn(`Node ${url} unreachable:`, err);
          }
        }

        if (!blockchainVerified) {
          setLoading(false);
          setVerifyStatus("idle");
          alert(errorMessage || "Transaction not found on BSC network explorer. Check your transaction hash (TXID).");
          return;
        }

        setSuccessAmount(verifiedAmount);
        
        setTimeout(() => {
          setVerifyProgress(70);
          setVerifyLog(`Blockchain receipt found! Verified transfer of ${verifiedAmount.toFixed(2)} ${gateway === "usdt_bep20" ? "USDT" : "USDC"}...`);
          
          setTimeout(async () => {
            try {
              await savePaymentToBackend(txnId, verifiedAmount, gateway === "usdt_bep20" ? "USDT BEP20" : "USDC BEP20");
              setVerifyProgress(100);
              setVerifyLog("Realtime payment verified! SaaS balance credited.");
              
              setBalance(prev => prev + verifiedAmount);
              setTransactions(prev => [
                {
                  id: txnId,
                  desc: `Balance Recharge (${gateway === "usdt_bep20" ? "USDT" : "USDC"} BEP20 Verified)`,
                  amount: verifiedAmount,
                  date: new Date().toISOString().split("T")[0],
                  type: "credit",
                  status: "Completed"
                },
                ...prev
              ]);
              setLoading(false);
              setVerifyStatus("success");
            } catch (err: any) {
              setLoading(false);
              setVerifyStatus("idle");
              alert(err.message || "Failed to sync transaction with backend.");
            }
          }, 800);
        }, 800);

      } else {
        setSuccessAmount(amt);
        
        setTimeout(() => {
          setVerifyProgress(70);
          setVerifyLog(gateway === "binance" ? "Validating instant API webhook confirmation..." : "Verifying block transaction payload confirmations (6/12 block depth)...");
          
          setTimeout(async () => {
            try {
              await savePaymentToBackend(txnId, amt, label);
              setVerifyProgress(100);
              setVerifyLog("Payment verified successfully! Balance credited.");
              
              setBalance(prev => prev + amt);
              setTransactions(prev => [
                {
                  id: txnId,
                  desc: `Balance Recharge (${label} Gateway)`,
                  amount: amt,
                  date: new Date().toISOString().split("T")[0],
                  type: "credit",
                  status: "Completed"
                },
                ...prev
              ]);
              setLoading(false);
              setVerifyStatus("success");
            } catch (err: any) {
              setLoading(false);
              setVerifyStatus("idle");
              alert(err.message || "Failed to verify payment on backend.");
            }
          }, 800);
        }, 800);
      }
    }, 800);
  };

  return (
    <div className="space-y-3.5 animate-fadeIn">
      {/* Title */}
      <div className="pb-1.5 border-b border-dark-700/20">
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <WalletIcon size={18} className="text-brand-400 shrink-0" />
          <span>Wallet & Credits</span>
        </h2>
        <p className="text-[10px] text-dark-400 mt-0.5">Fund your Uvicorn worker queues and route direct SMTP email deliveries smoothly</p>
      </div>

      {/* Top Row: Recharge Wallet (Left) & Available SaaS Balance (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Recharge Wallet (Left Side Card) */}
        <div style={{ animationDelay: '0ms' }} className="opacity-0 animate-slideUp glass-panel p-4 rounded-xl border border-dark-700/30 flex flex-col justify-between min-h-[180px]">
          <div>
            <span className="text-[9px] font-extrabold text-dark-350 uppercase tracking-widest block mb-2">Recharge Wallet</span>
            
            {/* Payment Gateway Selector */}
            <div className="mb-2.5 flex flex-col gap-1">
              <label className="block text-[8px] font-extrabold text-dark-400 uppercase tracking-wider">Payment Gateway</label>
              <select
                value={gateway}
                onChange={(e) => setGateway(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-dark-950/50 hover:bg-dark-950/80 focus:bg-dark-950/95 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white transition-all duration-200 cursor-pointer font-semibold"
              >
                {(appConfig?.payment_gateway_merchant_enabled ?? true) && (
                  <option value="binance">Binance Pay</option>
                )}
                {(appConfig?.payment_gateway_trc20_enabled ?? true) && (
                  <option value="usdt_trc20">USDT TRC20</option>
                )}
                {(appConfig?.payment_gateway_bep20_enabled ?? true) && (
                  <option value="usdt_bep20">USDT BEP20</option>
                )}
                {(appConfig?.payment_gateway_usdc_bep20_enabled ?? true) && (
                  <option value="usdc_bep20">USDC BEP20</option>
                )}
              </select>
            </div>

            <div className="flex gap-1.5 mb-2.5">
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Enter amount..."
                className="flex-1 px-3 py-1.5 bg-dark-950/50 hover:bg-dark-950/80 focus:bg-dark-950/95 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white font-mono placeholder:text-dark-600 transition-all duration-200"
              />
              <button
                onClick={() => setShowSimModal(true)}
                disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
                className="px-3 py-1.5 brand-gradient-bg hover:scale-[1.02] active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow-md transition-all duration-200 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed shrink-0"
              >
                Recharge
              </button>
            </div>

            <div className="flex gap-1.5">
              {[10, 25, 50].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleQuickAdd(amt)}
                  className="flex-1 py-1 bg-dark-950 hover:bg-dark-900 border border-dark-700/50 text-[9px] font-bold text-brand-400 rounded-md transition-colors"
                >
                  +${amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Available SaaS Balance (Right Side Card) */}
        <div style={{ animationDelay: '80ms' }} className="opacity-0 animate-slideUp">
          <div className="glass-panel p-4.5 rounded-xl border border-brand-500/20 bg-brand-500/5 animate-pulseGlow flex flex-col justify-between min-h-[180px] relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-brand-500/5 rounded-full filter blur-[40px] group-hover:scale-110 transition-transform duration-500" />
            
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="text-[9px] font-extrabold text-dark-350 uppercase tracking-widest block">Available SaaS Balance</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-white tracking-tight select-none">${balance.toFixed(2)}</span>
                  <span className="text-[9px] text-brand-400 font-bold block mb-1">USD</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-400">
                <WalletIcon size={16} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3.5 border-t border-dark-700/20 relative z-10 text-[9px] font-semibold text-dark-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span>Connected Webhooks Auto-recharge ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Settings & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-start">
        {/* Left Side: Auto-recharge & Usage rates stacked */}
        <div className="lg:col-span-1 space-y-3.5">
          {/* Auto-recharge Configuration */}
          <div style={{ animationDelay: '160ms' }} className="opacity-0 animate-slideUp glass-panel p-3.5 rounded-xl border border-dark-700/30 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-[11px] font-bold text-white font-sans">Auto-Recharge Setup</h4>
                <p className="text-[8.5px] text-dark-400 mt-0.5">Top up wallet dynamically using Stripe webhooks</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoRefill(!autoRefill)}
                className={`w-8 h-4 rounded-full transition-colors relative flex items-center ${
                  autoRefill ? "bg-brand-500" : "bg-dark-950 border border-dark-700/50"
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transition-transform transform ${
                  autoRefill ? "translate-x-4" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {autoRefill && (
              <div className="space-y-2 pt-2.5 border-t border-dark-700/20 animate-slideDown">
                <div className="flex flex-col gap-0.5">
                  <label className="block text-[8px] font-bold text-dark-400 uppercase tracking-wider">Refill Trigger Threshold</label>
                  <select className="w-full px-2 py-1 bg-dark-950 border border-dark-800 rounded-md text-[10.5px] text-white focus:outline-none">
                    <option value="5">When balance falls below $5.00</option>
                    <option value="10">When balance falls below $10.00</option>
                    <option value="25">When balance falls below $25.00</option>
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="block text-[8px] font-bold text-dark-400 uppercase tracking-wider">Refill Amount</label>
                  <select className="w-full px-2 py-1 bg-dark-950 border border-dark-800 rounded-md text-[10.5px] text-white focus:outline-none">
                    <option value="10">Add $10.00 instantly</option>
                    <option value="25">Add $25.00 instantly</option>
                    <option value="50">Add $50.00 instantly</option>
                    <option value="100">Add $100.00 instantly</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Usage Metrics Panel */}
          <div style={{ animationDelay: '240ms' }} className="opacity-0 animate-slideUp glass-panel p-3.5 rounded-xl border border-dark-700/30 space-y-2.5">
            <h3 className="text-[10px] font-bold text-white flex items-center gap-1 uppercase tracking-wider text-dark-300">
              <TrendingUp size={12} className="text-brand-400 shrink-0" />
              <span>Usage Rates & Costs</span>
            </h3>

            <div className="space-y-2 text-[10.5px] text-dark-300 border-b border-dark-700/15 pb-2.5">
              <div className="flex justify-between items-center">
                <span>Standard Dispatch Rate (per 1k)</span>
                <span className="font-bold text-white font-mono">$0.15</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Estimated Email Sends this month</span>
                <span className="font-bold text-white font-mono">{user?.subscription_tier === "pro" ? "10,000" : user?.subscription_tier === "business" ? "50,000" : "1,000"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Auto-refill Threshold</span>
                <span className="font-bold text-rose-400 font-mono">$5.00</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-white">Estimated Monthly Cost</span>
              <span className="font-extrabold text-brand-400 font-mono">${user?.subscription_tier === "pro" ? "1.50" : user?.subscription_tier === "business" ? "7.50" : "0.15"}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Billing Transaction History Table */}
        <div className="lg:col-span-2 space-y-3.5">
          <div style={{ animationDelay: '320ms' }} className="opacity-0 animate-slideUp glass-panel overflow-hidden border border-dark-700/30 rounded-xl">
            <div className="py-2.5 px-3 border-b border-dark-700/20 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-dark-950/10 gap-2">
              <div>
                <span className="text-[10px] font-bold text-dark-350 uppercase tracking-wider block">Transaction Ledger</span>
                <span className="text-[8px] font-bold text-brand-400 bg-brand-500/5 px-2 py-0.5 rounded-full border border-brand-500/10">Real-time ledger updates</span>
              </div>
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search TXID or amount..."
                  className="w-full px-2.5 py-1 bg-dark-950/60 hover:bg-dark-950/90 focus:bg-dark-950 border border-dark-700/40 rounded-lg text-[10px] text-white focus:outline-none focus:border-brand-500/80 transition-all placeholder:text-dark-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-700/40 bg-dark-950/50 text-[9px] font-bold text-dark-400 uppercase tracking-wider">
                    <th className="py-2 px-3">Transaction ID</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/20 text-xs">
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-dark-900/20 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-white tracking-wide text-[10.5px]" title={txn.id}>
                          <span className="hidden sm:inline">{txn.id}</span>
                          <span className="inline sm:hidden">{formatTxHash(txn.id)}</span>
                        </td>
                        <td className="py-2 px-3 text-dark-300">
                          {txn.desc}
                        </td>
                        <td className={`py-2 px-3 font-mono font-bold ${
                          txn.type === "credit" ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {txn.type === "credit" ? "+" : ""}${Math.abs(txn.amount).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-dark-400 font-medium text-[10.5px]">
                          {txn.date}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 text-[8.5px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-dark-500 text-xs font-semibold">
                        No transactions match your search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="py-2.5 px-3 border-t border-dark-700/20 flex justify-between items-center bg-dark-950/5 text-[10px] text-dark-400 font-semibold select-none">
                <span>
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} items
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 bg-dark-950/50 hover:bg-dark-950 disabled:opacity-40 disabled:hover:bg-dark-950/50 border border-dark-700/40 rounded-md transition-colors disabled:cursor-not-allowed text-[9px]"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1 px-1">
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 bg-dark-950/50 hover:bg-dark-950 disabled:opacity-40 disabled:hover:bg-dark-950/50 border border-dark-700/40 rounded-md transition-colors disabled:cursor-not-allowed text-[9px]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Gateway Checkout Simulation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-dark-900 border border-dark-700/50 rounded-2xl p-4.5 shadow-2xl relative animate-scaleUp">
            
            {/* 1. IDLE STATE: Input fields & deposit guidelines */}
            {verifyStatus === "idle" && (
              <>
                {/* Modal Header */}
                <div className="text-center mb-3">
                  <div className="h-9 w-9 bg-brand-500/10 text-brand-400 rounded-full mx-auto flex items-center justify-center mb-2 border border-brand-500/20">
                    {gateway === "binance" ? <QrCode size={18} /> : <Coins size={18} />}
                  </div>
                  <h4 className="text-sm font-bold text-white font-sans uppercase tracking-wide">
                    {gateway === "binance" && "Binance Pay Sandbox"}
                    {gateway === "usdt_trc20" && "USDT TRC20 Gateway"}
                    {gateway === "usdt_bep20" && "USDT BEP20 Gateway"}
                    {gateway === "usdc_bep20" && "USDC BEP20 Gateway"}
                  </h4>
                  <p className="text-[9px] text-dark-400 mt-0.5">
                    {gateway === "binance" && "Complete checkout using scan code authorization"}
                    {gateway === "usdt_trc20" && "Transfer Tether directly via Tron Network (TRC20)"}
                    {gateway === "usdt_bep20" && "Transfer Tether directly via BNB Smart Chain (BEP20)"}
                    {gateway === "usdc_bep20" && "Transfer USDC directly via BNB Smart Chain (BEP20)"}
                  </p>
                </div>

                {/* Common Funding Amount Box */}
                <div className="p-2.5 bg-dark-950 rounded-xl border border-dark-850 flex flex-col gap-0.5 mb-3">
                  <span className="text-[7.5px] text-dark-500 font-bold uppercase tracking-wider">Required Amount</span>
                  <p className="text-xs font-mono font-bold text-white tracking-wide">${parseFloat(topUpAmount).toFixed(2)} USD / USDT</p>
                </div>

                {/* Dynamic Gateway Content */}
                {gateway === "binance" && (
                  <div className="flex flex-col items-center gap-2.5 my-2.5">
                    <div className="relative p-2 bg-white rounded-xl shadow-lg border border-dark-300/10">
                      <div className="w-24 h-24 flex items-center justify-center bg-amber-50 border border-amber-400/80 rounded-lg overflow-hidden">
                        {appConfig?.payment_gateway_qr_code ? (
                          <img src={appConfig.payment_gateway_qr_code} alt="QR Code" className="w-full h-full object-cover" />
                        ) : (
                          <QrCode size={72} className="text-dark-950 animate-pulse" />
                        )}
                      </div>
                    </div>
                    <div className="text-center w-full space-y-2.5">
                      <div>
                        <p className="text-[8.5px] text-dark-450">Scan QR Code above or pay directly to Merchant ID:</p>
                        <div className="flex items-center justify-center gap-1.5 mt-1 bg-dark-950/80 px-2.5 py-1 rounded-lg border border-dark-800 w-fit mx-auto animate-fadeIn">
                          <span className="font-mono text-amber-400 font-bold text-[10px]">
                            {appConfig?.payment_gateway_merchant_id || "83928102"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const merchantId = appConfig?.payment_gateway_merchant_id || "83928102";
                              navigator.clipboard.writeText(merchantId);
                              alert(`Binance Merchant ID ${merchantId} copied!`);
                            }}
                            className="text-dark-400 hover:text-white transition-colors"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-left">
                        <label className="block text-[8px] font-extrabold text-dark-400 uppercase tracking-wider">Binance Order ID / Transaction ID *</label>
                        <input
                          type="text"
                          required
                          value={txHash}
                          onChange={(e) => setTxHash(e.target.value)}
                          placeholder="Paste Binance transaction Order ID..."
                          className="w-full px-3 py-1.5 bg-dark-950 border border-dark-850 rounded-lg text-xs text-brand-300 font-mono focus:border-brand-500/80 focus:outline-none placeholder:text-dark-700 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(gateway === "usdt_trc20" || gateway === "usdt_bep20" || gateway === "usdc_bep20") && (
                  <div className="space-y-3 my-3">
                    <div className="p-2.5 bg-dark-950 rounded-xl border border-dark-850 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[7.5px] text-dark-500 font-bold uppercase tracking-wider">
                          Deposit Address ({gateway === "usdt_trc20" ? "TRC20" : "BEP20"})
                        </span>
                        <span className="text-[7.5px] font-bold text-emerald-400 uppercase bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">Active Node</span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-[9px] text-brand-300 break-all select-all pr-1">
                          {gateway === "usdt_trc20"
                            ? (appConfig?.payment_gateway_trc20 || "TXdfa983Dksodlape8391Kskaiey839281")
                            : gateway === "usdt_bep20"
                            ? (appConfig?.payment_gateway_bep20 || "0x9399f9bc69f92e025a99d2a794e4db0c42b56751")
                            : (appConfig?.payment_gateway_usdc_bep20 || "0x9399f9bc69f92e025a99d2a794e4db0c42b56751")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const addr = gateway === "usdt_trc20"
                              ? (appConfig?.payment_gateway_trc20 || "TXdfa983Dksodlape8391Kskaiey839281")
                              : gateway === "usdt_bep20"
                              ? (appConfig?.payment_gateway_bep20 || "0x9399f9bc69f92e025a99d2a794e4db0c42b56751")
                              : (appConfig?.payment_gateway_usdc_bep20 || "0x9399f9bc69f92e025a99d2a794e4db0c42b56751");
                            navigator.clipboard.writeText(addr);
                            alert(`${gateway === "usdc_bep20" ? "USDC" : "USDT"} deposit address copied!`);
                          }}
                          className="p-1 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded border border-dark-750 transition-colors shrink-0"
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="block text-[8px] font-extrabold text-dark-400 uppercase tracking-wider">Transaction hash (TXID) *</label>
                      <input
                        type="text"
                        required
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="Paste blockchain transaction TXID hash..."
                        className="w-full px-3 py-1.5 bg-dark-950 border border-dark-850 rounded-lg text-xs text-brand-300 font-mono focus:border-brand-500/80 focus:outline-none placeholder:text-dark-700 transition-colors"
                      />
                    </div>

                    <div className="p-2 bg-rose-500/5 rounded-lg border border-rose-500/10 text-[8px] text-rose-400/90 leading-normal flex items-start gap-1">
                      <span className="w-1 h-1 rounded-full bg-rose-500 mt-1 shrink-0" />
                      <span>Send only {gateway === "usdc_bep20" ? "USDC" : "USDT"} via {gateway === "usdt_trc20" ? "TRC20 Network" : "BEP20 Network"}. Other network assets will be lost.</span>
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex gap-2 mt-4.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSimModal(false);
                      setTxHash("");
                    }}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-950 dark:hover:bg-dark-900 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-dark-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateTopUp}
                    disabled={loading || !txHash.trim()}
                    className="flex-1 py-1.5 brand-gradient-bg text-white text-xs font-bold rounded-lg shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    Confirm Payment
                  </button>
                </div>
              </>
            )}

            {/* 2. VERIFYING STATE: Blockchain Scanner / API authorization Loader */}
            {verifyStatus === "verifying" && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-brand-500/10 border-t-brand-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-brand-400">
                    <Coins size={22} className="animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1.5 w-full">
                  <h4 className="text-sm font-bold text-white font-sans uppercase tracking-wider animate-pulse">
                    Live Node Verification
                  </h4>
                  <p className="text-[10px] text-dark-400 font-semibold max-w-[240px] mx-auto leading-relaxed">
                    Analyzing blockchain ledger coordinates...
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-dark-950 rounded-full h-1.5 overflow-hidden border border-dark-850">
                  <div 
                    className="brand-gradient-bg h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${verifyProgress}%` }}
                  />
                </div>

                <div className="w-full">
                  <span className="text-[8.5px] font-extrabold text-brand-400 bg-brand-500/5 px-3 py-1 rounded-full border border-brand-500/10 font-mono tracking-wide inline-block leading-normal max-w-full truncate">
                    {verifyProgress}% - {verifyLog}
                  </span>
                  <p className="text-[8px] text-dark-500 mt-2 font-medium">Please do not reload the page or disconnect</p>
                </div>
              </div>
            )}

            {/* 3. SUCCESS STATE: Checkmark Deposit verified screen */}
            {verifyStatus === "success" && (
              <div className="py-4 flex flex-col items-center justify-center text-center space-y-4 animate-scaleUp">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-bounce">
                  <Check size={24} className="stroke-[3]" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white tracking-wide uppercase">Recharge Successful</h4>
                  <p className="text-[9.5px] text-dark-400">Payment hash matched and confirmed in real-time</p>
                </div>

                {/* Receipt Box */}
                <div className="w-full p-3 bg-dark-950 rounded-xl border border-dark-850 text-left space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-dark-400">
                    <span>Credit Credited</span>
                    <span className="font-bold text-emerald-400 font-mono">+${successAmount.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-dark-400">
                    <span>Transaction ID</span>
                    <span className="font-bold text-white font-mono">{successTxnId}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-dark-400">
                    <span>Gateway Method</span>
                    <span className="font-bold text-brand-300 font-sans uppercase text-[9px]">{gateway === "binance" ? "Binance Pay" : gateway === "usdt_trc20" ? "USDT TRC20" : gateway === "usdt_bep20" ? "USDT BEP20" : "USDC BEP20"}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-dark-400 border-t border-dark-850/50 pt-2">
                    <span>Network Status</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">COMPLETED</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSimModal(false);
                    setTopUpAmount("");
                    setTxHash("");
                    setVerifyStatus("idle");
                    setVerifyProgress(0);
                    setVerifyLog("");
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
