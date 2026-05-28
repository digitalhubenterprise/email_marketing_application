import React, { useEffect, useState } from 'react'
import {
  Search,
  AlertTriangle,
  StopCircle,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Calendar,
  Mail,
  CheckCircle2,
  Activity,
  PlayCircle,
  Sliders,
  AlertCircle
} from 'lucide-react'

interface Campaign {
  id: number;
  user_email: string;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  is_spam: boolean;
  spam_note: string | null;
  created_at: string;
}

interface QueueStatus {
  queued: number;
  processing: number;
  done: number;
}

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ queued: 0, processing: 0, done: 0 });

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  // Spam Modal state
  const [showSpamModal, setShowSpamModal] = useState(false);
  const [spamTargetId, setSpamTargetId] = useState<number | null>(null);
  const [spamReason, setSpamReason] = useState('');

  const fetchCampaigns = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      // We can add filtering if search query matches campaign names or users
      const res = await fetch(`/api/admin/campaigns?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns);
        setTotal(data.total);
        if (data.queue_status) {
          setQueueStatus(data.queue_status);
        }
        // If a campaign is currently selected, update its details
        if (selectedCampaign) {
          const updated = data.campaigns.find((c: Campaign) => c.id === selectedCampaign.id);
          if (updated) setSelectedCampaign(updated);
        }
      }
    } catch (err) {
      console.error("Error fetching admin campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [page]);

  const handleForceCancel = async (campaignId: number) => {
    if (!confirm("Are you absolutely sure you want to trigger an EMERGENCY STOP for this campaign? This stops all sending immediately.")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/cancel`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Emergency Force-Cancel dispatched completely.");
        fetchCampaigns();
      } else {
        const data = await res.json();
        alert(`Failed to cancel: ${data.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFlagSpamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spamTargetId || !spamReason.trim()) return;
    const token = localStorage.getItem("admin_token");
    try {
      const params = new URLSearchParams({ note: spamReason });
      const res = await fetch(`/api/admin/campaigns/${spamTargetId}/spam?${params.toString()}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Campaign flagged as SPAM and emergency stopped successfully.");
        setShowSpamModal(false);
        setSpamReason('');
        setSpamTargetId(null);
        fetchCampaigns();
      } else {
        const data = await res.json();
        alert(`Failed to flag spam: ${data.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(total / limit);

  // Filter campaigns locally if user is typing a search
  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.user_email.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fadeIn text-slate-800 relative">
      
      {/* Platform Dispatch Metrics Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 -mt-3">
        {/* Queued */}
        <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="space-y-1">
            <span className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest">Queued/Scheduled</span>
            <span className="text-2xl font-black text-indigo-950 font-mono">{queueStatus.queued}</span>
          </div>
          <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <PlayCircle size={20} />
          </div>
        </div>

        {/* Processing */}
        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="space-y-1">
            <span className="block text-[9px] font-black text-amber-400 uppercase tracking-widest">Active Dispatching</span>
            <span className="text-2xl font-black text-amber-950 font-mono">{queueStatus.processing}</span>
          </div>
          <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-500/20 animate-pulse">
            <Activity size={20} />
          </div>
        </div>

        {/* Done */}
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="space-y-1">
            <span className="block text-[9px] font-black text-emerald-400 uppercase tracking-widest">Completed / Done</span>
            <span className="text-2xl font-black text-emerald-950 font-mono">{queueStatus.done}</span>
          </div>
          <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Directory Filter Cockpit */}
      <div className="flex items-end gap-4">
        {/* Search */}
        <div className="flex-1">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Search Campaign or User
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, subject, or publisher email address..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-brand-500 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Directory Content - Full Width Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden flex flex-col justify-between min-h-[450px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Campaign Identity</th>
                <th className="py-3 px-4">Publisher Email</th>
                <th className="py-3 px-4">status</th>
                <th className="py-3 px-4 text-center">Dispatch Progress</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Abuse & Controls</th>
              </tr>
            </thead>
            <tbody>
              {loading && campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-bold">
                    No active campaigns matched platform queries.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCampaign(c)}
                    className={`border-b border-slate-100 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50/50 transition-colors duration-150 ${selectedCampaign?.id === c.id ? 'bg-brand-50/50 border-l-2 border-l-brand-500' : ''}`}
                  >
                    <td className="py-3.5 px-4 font-extrabold text-slate-950 max-w-[200px] truncate">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 truncate">{c.name}</span>
                        <span className="text-[9px] text-slate-400 truncate mt-0.5" title={c.subject}>Sub: {c.subject}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-bold">{c.user_email}</td>
                    <td className="py-3.5 px-4">
                      {c.is_spam ? (
                        <span className="text-[9px] font-black uppercase text-rose-800 bg-rose-50 border border-rose-250 px-1.5 py-0.5 rounded">Spam Flagged</span>
                      ) : c.status === 'sending' ? (
                        <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-50 border border-amber-250 px-1.5 py-0.5 rounded animate-pulse">Sending</span>
                      ) : c.status === 'sent' ? (
                        <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-250 px-1.5 py-0.5 rounded">Completed</span>
                      ) : c.status === 'failed' ? (
                        <span className="text-[9px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-150 px-1.5 py-0.5 rounded">Stopped</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{c.status}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-900 font-bold">
                      {c.sent_count} / <span className="text-slate-950 font-black">{c.total_recipients}</span>
                      <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden mx-auto mt-1 border border-slate-200/20">
                        <div 
                          className={`h-full ${c.is_spam ? 'bg-rose-500' : 'bg-brand-500'}`} 
                          style={{ width: `${Math.min((c.sent_count / (c.total_recipients || 1)) * 100, 100)}%` }} 
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-bold">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        {/* Emergency Force Cancel */}
                        {(c.status === 'sending' || c.status === 'scheduled') && (
                          <button
                            onClick={() => handleForceCancel(c.id)}
                            className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all font-bold text-[10px]"
                            title="Force Cancel"
                          >
                            <StopCircle size={13} />
                          </button>
                        )}
                        
                        {/* Flag as Spam */}
                        {!c.is_spam && (
                          <button
                            onClick={() => {
                              setSpamTargetId(c.id);
                              setShowSpamModal(true);
                            }}
                            className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 text-[10px] font-bold transition-all"
                          >
                            Flag Spam
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200/50 flex items-center justify-between text-xs bg-slate-50/50">
          <span className="text-slate-700 font-bold">Showing <span className="font-black text-slate-950">{filteredCampaigns.length}</span> of <span className="font-black text-slate-950">{total}</span> records</span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-bold text-slate-900 px-2 py-0.5 bg-white rounded border border-slate-200">
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer Panel - Spans exactly 75% width flush against content margins */}
      {selectedCampaign && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed -top-8 -right-8 -bottom-8 -left-8 bg-slate-900/40 backdrop-blur-[2px] z-[42] animate-fadeIn" 
            onClick={() => setSelectedCampaign(null)} 
          />
          
          {/* Drawer container */}
          <div className="fixed -top-8 -right-8 -bottom-8 w-full md:w-3/4 bg-white shadow-2xl z-[45] border-l border-slate-200 flex flex-col justify-between p-6 animate-slideInRight text-slate-800">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedCampaign(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 p-1.5 rounded-lg hover:bg-slate-50 transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex-1 flex flex-col h-full justify-between overflow-y-auto pr-1">
              {/* Profile Card Header */}
              <div className="space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3 mt-2 pr-8">
                  <div className="truncate pr-2">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mb-1.5 inline-block">Campaign Details</span>
                    <h3 className="font-black text-base text-slate-950 truncate" title={selectedCampaign.name}>{selectedCampaign.name}</h3>
                    <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Campaign ID Ref: {selectedCampaign.id}</span>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                      selectedCampaign.is_spam ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {selectedCampaign.is_spam ? 'Spam Flagged' : selectedCampaign.status}
                    </span>
                  </div>
                </div>

                {/* Spam Alert Warning Card */}
                {selectedCampaign.is_spam && (
                  <div className="bg-rose-50 border border-rose-150 p-4 rounded-xl space-y-2 animate-scaleUp">
                    <h4 className="font-black text-rose-800 text-xs flex items-center gap-1.5 uppercase">
                      <AlertCircle size={15} />
                      Platform Spam Blacklisted
                    </h4>
                    <p className="text-xs text-rose-700 font-semibold leading-relaxed">
                      This campaign was manually flagged as spam by platform administration for policy violations. Real-time sending queues were forcefully aborted.
                    </p>
                    <div className="p-3 bg-white border border-rose-200/50 rounded-lg text-xs font-mono text-slate-800 space-y-1">
                      <span className="block text-[9px] font-extrabold text-rose-500 uppercase tracking-widest">Admin Abuse Note:</span>
                      <p className="font-semibold">{selectedCampaign.spam_note || "No specific note provided."}</p>
                    </div>
                  </div>
                )}

                {/* Dispatch Summary Meta Info */}
                <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold">
                    <User size={15} className="text-slate-400" />
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Publisher Address</span>
                      <span className="font-bold text-slate-900 font-mono">{selectedCampaign.user_email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold">
                    <Calendar size={15} className="text-slate-400" />
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Created Timestamp</span>
                      <span className="font-bold text-slate-900">{new Date(selectedCampaign.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Subject Block */}
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Email Subject line</span>
                  <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-xs font-semibold text-slate-800 font-mono">
                    {selectedCampaign.subject}
                  </div>
                </div>

                {/* Live Performance stats */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatch Performance Gauges</h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50 p-2.5 border border-slate-200/50 rounded-xl">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Recipients</span>
                      <span className="text-sm font-black text-slate-950 font-mono">{selectedCampaign.total_recipients}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 border border-slate-200/50 rounded-xl">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Sent Out</span>
                      <span className="text-sm font-black text-slate-950 font-mono">{selectedCampaign.sent_count}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 border border-slate-200/50 rounded-xl">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Opens Count</span>
                      <span className="text-sm font-black text-slate-950 font-mono">{selectedCampaign.open_count}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 border border-slate-200/50 rounded-xl">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Clicks Count</span>
                      <span className="text-sm font-black text-slate-950 font-mono">{selectedCampaign.click_count}</span>
                    </div>
                  </div>

                  {/* Quota Progress Gauge */}
                  <div className="bg-slate-50/50 p-3.5 border border-slate-150 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Dispatch Progress Volume:</span>
                      <span className="text-slate-900 font-mono font-extrabold">{selectedCampaign.sent_count} / {selectedCampaign.total_recipients}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300/10">
                      <div className="h-full bg-brand-500" style={{ width: `${Math.min((selectedCampaign.sent_count / (selectedCampaign.total_recipients || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative Actions Trigger Cockpit */}
              <div className="space-y-3.5 border-t border-slate-100 pt-4 mt-8">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Abuse Controls & Emergency Stops</h4>

                {/* Emergency Cancel Action */}
                {(selectedCampaign.status === 'sending' || selectedCampaign.status === 'scheduled') ? (
                  <button
                    onClick={() => handleForceCancel(selectedCampaign.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold transition-all"
                  >
                    <span className="flex items-center gap-2"><StopCircle size={15} /> Emergency Stop Dispatch Loop</span>
                    <span className="text-[8px] uppercase tracking-wider font-extrabold bg-rose-200/20 px-2 py-0.5 border border-rose-200 rounded">Kill Queue</span>
                  </button>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold text-center rounded-xl">
                    Dispatch Loop is Idle/Inactive (Status: {selectedCampaign.status})
                  </div>
                )}

                {/* Flag as Spam Action */}
                {!selectedCampaign.is_spam ? (
                  <button
                    onClick={() => {
                      setSpamTargetId(selectedCampaign.id);
                      setShowSpamModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-950 rounded-xl text-white text-xs font-bold transition-all"
                  >
                    <AlertTriangle size={15} className="text-amber-400" />
                    Flag Campaign as Spam
                  </button>
                ) : (
                  <div className="p-3 bg-rose-50/50 border border-rose-200 text-rose-600 text-xs font-black text-center rounded-xl flex items-center justify-center gap-2">
                    <AlertCircle size={15} />
                    Blacklisted as Spam / Policy Violation
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* FLAG AS SPAM INPUT MODAL */}
      {showSpamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden border border-rose-200 shadow-2xl relative animate-scaleUp text-slate-800">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-500" />
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <h3 className="font-extrabold text-sm text-rose-700 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500 animate-bounce" />
                Spam Abuse Handling Cockpit
              </h3>
              <button 
                onClick={() => {
                  setShowSpamModal(false);
                  setSpamTargetId(null);
                  setSpamReason('');
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFlagSpamSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-600 font-semibold space-y-1 leading-relaxed">
                <p className="font-bold">Important Abuse Handler Notice:</p>
                <p>Flagging this campaign will instantly fail the Celery sending loop, block future dispatches, and record a system-wide security entry under the audit ledger.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Abuse Violation / Spam Note
                </label>
                <textarea
                  required
                  rows={3}
                  value={spamReason}
                  onChange={(e) => setSpamReason(e.target.value)}
                  placeholder="State the specific reason (e.g. unsolicited affiliate link spam, phishing target, etc.)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-rose-500 font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSpamModal(false);
                    setSpamTargetId(null);
                    setSpamReason('');
                  }}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-rose-500/10 hover:bg-rose-700"
                >
                  Confirm Spam Flag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
