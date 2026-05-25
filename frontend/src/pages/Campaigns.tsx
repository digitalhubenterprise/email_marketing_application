import React, { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { 
  Send, 
  Plus, 
  Trash2, 
  Play, 
  Server, 
  Users, 
  FileText, 
  AlertCircle, 
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react'

interface Campaign {
  id: number;
  name: string;
  subject: string;
  content_html: string;
  smtp_server_id: number;
  contact_list_id: number;
  status: string;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
}

export default function Campaigns() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [smtps, setSmtps] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form fields for new campaign wizard
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedSmtp, setSelectedSmtp] = useState("");
  const [selectedList, setSelectedList] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [activeReport, setActiveReport] = useState<Campaign | null>(null);
  const [reportLogs, setReportLogs] = useState<any[]>([]);
  const [pollingInterval, setPollingInterval] = useState<any>(null);

  const fetchData = async () => {
    try {
      const authHeader = { "Authorization": `Bearer ${token}` };
      
      const cRes = await fetch("/api/campaigns", { headers: authHeader });
      const smtpRes = await fetch("/api/smtp", { headers: authHeader });
      const lRes = await fetch("/api/contacts/lists", { headers: authHeader });
      const tRes = await fetch("/api/templates", { headers: authHeader });

      if (cRes.ok) setCampaigns(await cRes.json());
      if (smtpRes.ok) setSmtps(await smtpRes.json());
      if (lRes.ok) setLists(await lRes.json());
      if (tRes.ok) setTemplates(await tRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Polling campaign status when reviewing live reports
  useEffect(() => {
    let interval: any = null;
    if (activeReport && (activeReport.status === "sending")) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/campaigns", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const list: Campaign[] = await res.json();
            const updated = list.find(c => c.id === activeReport.id);
            if (updated) {
              setActiveReport(updated);
              // Update general list as well
              setCampaigns(list);
              if (updated.status !== "sending") {
                clearInterval(interval);
              }
            }
          }
          // Fetch log rows
          const logRes = await fetch(`/api/campaigns/${activeReport.id}/logs`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (logRes.ok) {
            setReportLogs(await logRes.json());
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);
      setPollingInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeReport, token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Pick content html from template
    const tmpl = templates.find(t => t.id === Number(selectedTemplate));
    if (!tmpl) {
      setError("Please choose a saved email template first.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          subject,
          smtp_server_id: Number(selectedSmtp),
          contact_list_id: Number(selectedList),
          content_html: tmpl.content_html
        })
      });

      if (res.ok) {
        setName("");
        setSubject("");
        setSelectedSmtp("");
        setSelectedList("");
        setSelectedTemplate("");
        setShowWizard(false);
        await fetchData();
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to save campaign.");
      }
    } catch (err) {
      setError("Connection failure.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendCampaign = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Start sending this email campaign now?")) return;
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const campaignData = await res.json();
        setActiveReport(campaignData);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to trigger campaign.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openReport = async (campaign: Campaign) => {
    setActiveReport(campaign);
    try {
      const logRes = await fetch(`/api/campaigns/${campaign.id}/logs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (logRes.ok) {
        setReportLogs(await logRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header title */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {activeReport && (
            <button
              onClick={() => setActiveReport(null)}
              className="p-2.5 bg-dark-900 hover:bg-dark-800 text-dark-300 hover:text-white rounded-xl border border-dark-700 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {activeReport ? `Live Report: ${activeReport.name}` : "Campaigns Manager"}
            </h2>
            <p className="text-sm text-dark-400 mt-1">
              {activeReport ? `Subject: ${activeReport.subject}` : "Schedule, configure and dispatch newsletters and track delivery ratios"}
            </p>
          </div>
        </div>

        {!activeReport && (
          <button
            onClick={() => setShowWizard(!showWizard)}
            className="flex items-center gap-2 px-5 py-3 brand-gradient-bg text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:scale-[1.01] transition-transform"
          >
            <Plus size={16} />
            {showWizard ? "Show Saved Campaigns" : "New Campaign Wizard"}
          </button>
        )}
      </div>

      {!activeReport ? (
        showWizard ? (
          /* ================== WIZARD CREATION PANELS ================== */
          <div className="max-w-2xl mx-auto glass-panel p-8 rounded-3xl border border-dark-700/30">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-dark-700/30 pb-4">
              <Send size={18} className="text-brand-400" />
              Configure Email Blast Campaign
            </h3>

            <form onSubmit={handleCreate} className="space-y-6">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">Campaign Title</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. SmartCampaign Promo Launch — May 2026"
                  className="w-full px-4 py-3 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">Email Subject Line</label>
                <input
                  type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Hi {{name}}, check out our new update!"
                  className="w-full px-4 py-3 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Server size={12} className="text-brand-400" />
                    SMTP Node
                  </label>
                  <select
                    required value={selectedSmtp} onChange={e => setSelectedSmtp(e.target.value)}
                    className="w-full px-4 py-3.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white"
                  >
                    <option value="">Choose SMTP...</option>
                    {smtps.map(s => <option key={s.id} value={s.id}>{s.name} ({s.host})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Users size={12} className="text-brand-400" />
                    Audience List
                  </label>
                  <select
                    required value={selectedList} onChange={e => setSelectedList(e.target.value)}
                    className="w-full px-4 py-3.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white"
                  >
                    <option value="">Choose List...</option>
                    {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.contacts_count} leads)</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FileText size={12} className="text-brand-400" />
                    Email Template
                  </label>
                  <select
                    required value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
                    className="w-full px-4 py-3.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white"
                  >
                    <option value="">Choose Template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !name || !subject || !selectedSmtp || !selectedList || !selectedTemplate}
                className="w-full py-4 px-6 brand-gradient-bg text-white font-bold rounded-xl text-xs transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 glow-btn disabled:opacity-50"
              >
                Save Campaign Config
              </button>
            </form>
          </div>
        ) : (
          /* ================== DISPLAY SAVED LIST ================== */
          <div className="glass-panel p-6 rounded-3xl border border-dark-700/30">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              </div>
            ) : campaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700/50 pb-3.5 text-xs font-bold text-dark-400 uppercase tracking-wider">
                      <th>Campaign details</th>
                      <th>Target Count</th>
                      <th>Delivered</th>
                      <th>Status</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/10">
                    {campaigns.map((c) => (
                      <tr 
                        key={c.id} 
                        onClick={() => openReport(c)}
                        className="text-xs text-dark-200 hover:bg-dark-700/5 transition-colors cursor-pointer"
                      >
                        <td className="py-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            {c.name}
                            <ChevronRight size={12} className="text-dark-500" />
                          </div>
                          <span className="text-[10px] text-dark-400 font-medium">{c.subject}</span>
                        </td>
                        <td className="py-4">{c.total_recipients}</td>
                        <td className="py-4 text-brand-400 font-bold">{c.sent_count} / {c.total_recipients}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${c.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
                            ${c.status === 'sending' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 animate-pulse' : ''}
                            ${c.status === 'draft' ? 'bg-dark-800 text-dark-300 border border-dark-750' : ''}
                            ${c.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : ''}
                          `}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          {c.status === 'draft' && (
                            <button
                              onClick={(e) => handleSendCampaign(c.id, e)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 mx-auto hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                              <Play size={10} />
                              Send Now
                            </button>
                          )}
                          {c.status !== 'draft' && (
                            <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-center">
                              Inspect Report
                              <ExternalLink size={10} />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-dark-700/50 rounded-2xl bg-dark-900/30">
                <Send size={32} className="mx-auto text-dark-500 mb-3" />
                <p className="text-sm text-dark-400">No campaigns created yet. Build one in the wizard.</p>
              </div>
            )}
          </div>
        )
      ) : (
        /* ================== DISPLAY ANALYTICS REPORT ================== */
        <div className="space-y-8">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-dark-700/30">
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Sending Progress</span>
              <h4 className="text-2xl font-extrabold text-white mt-2">
                {activeReport.sent_count} / {activeReport.total_recipients}
              </h4>
              <p className="text-xs text-dark-500 mt-1">Dispatched emails</p>
            </div>
            
            <div className="glass-panel p-6 rounded-2xl border border-emerald-500/10">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle size={10} />
                Unique Opens
              </span>
              <h4 className="text-2xl font-extrabold text-emerald-400 mt-2">
                {activeReport.open_count}
              </h4>
              <p className="text-xs text-dark-500 mt-1">
                Rate: {activeReport.sent_count > 0 ? round((activeReport.open_count / activeReport.sent_count) * 100) : 0}%
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-indigo-500/10">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Unique Clicks</span>
              <h4 className="text-2xl font-extrabold text-indigo-400 mt-2">
                {activeReport.click_count}
              </h4>
              <p className="text-xs text-dark-500 mt-1">
                CTR: {activeReport.sent_count > 0 ? round((activeReport.click_count / activeReport.sent_count) * 100) : 0}%
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-dark-700/30">
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Campaign Status</span>
              <div className="mt-2 flex items-center gap-2">
                <Clock size={16} className={activeReport.status === "sending" ? "text-brand-400 animate-spin" : "text-dark-400"} />
                <h4 className="text-xl font-extrabold text-white uppercase tracking-wider">
                  {activeReport.status}
                </h4>
              </div>
              <p className="text-xs text-dark-500 mt-1">Status of queue worker</p>
            </div>
          </div>

          {/* Delivery logs rows */}
          <div className="glass-panel p-6 rounded-3xl border border-dark-700/30">
            <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
              <Clock size={16} className="text-brand-400" />
              Delivery Log Rows ({reportLogs.length})
            </h3>

            {reportLogs.length > 0 ? (
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700/50 pb-3 text-xs font-bold text-dark-400 uppercase tracking-wider">
                      <th className="pb-3">Recipient Email</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Opened</th>
                      <th className="pb-3">Clicked</th>
                      <th className="pb-3">Error details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/10">
                    {reportLogs.map((l) => (
                      <tr key={l.id} className="text-xs text-dark-200 hover:bg-dark-700/5">
                        <td className="py-3 font-mono">{l.email}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${l.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
                            ${l.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : ''}
                            ${l.status === 'pending' ? 'bg-dark-700 text-dark-300 animate-pulse' : ''}
                          `}>
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 font-bold text-emerald-400">{l.opened ? "YES" : "NO"}</td>
                        <td className="py-3 font-bold text-indigo-400">{l.clicked ? "YES" : "NO"}</td>
                        <td className="py-3 text-[10px] text-dark-400 truncate max-w-[200px]" title={l.error_message}>
                          {l.error_message || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-dark-700/50 rounded-2xl bg-dark-900/30">
                <p className="text-xs text-dark-400">Queue is executing or waiting to send logs.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Float round helper
function round(v: number): number {
  return Math.round(v * 10) / 10;
}
