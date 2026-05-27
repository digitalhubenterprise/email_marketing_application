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
  ChevronRight,
  RefreshCw,
  Mail,
  Activity,
  MousePointerClick
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
  scheduled_at?: string;
  auto_resend_hours?: number;
  sending_mode?: string;
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
  const [scheduledAt, setScheduledAt] = useState("");
  const [autoResendHours, setAutoResendHours] = useState(0);
  const [sendingMode, setSendingMode] = useState("auto");
  
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
          content_html: tmpl.content_html,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          auto_resend_hours: Number(autoResendHours) || 0,
          sending_mode: sendingMode
        })
      });

      if (res.ok) {
        setName("");
        setSubject("");
        setSelectedSmtp("");
        setSelectedList("");
        setSelectedTemplate("");
        setScheduledAt("");
        setAutoResendHours(0);
        setSendingMode("auto");
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
    <div className="space-y-3.5 animate-fadeIn">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-dark-700/20">
        <div className="flex items-center gap-2">
          {activeReport && (
            <button
              onClick={() => setActiveReport(null)}
              className="p-1.5 bg-dark-950 hover:bg-dark-900 text-dark-400 hover:text-white rounded-lg border border-dark-700/50 transition-colors"
              title="Back to campaigns"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Send size={18} className="text-brand-400 shrink-0" />
              <span>{activeReport ? `Live Report: ${activeReport.name}` : "Campaigns Manager"}</span>
            </h2>
            <p className="text-[10px] text-dark-400 mt-0.5">
              {activeReport ? `Subject: ${activeReport.subject}` : "Schedule, configure and dispatch newsletters and track delivery ratios"}
            </p>
          </div>
        </div>

        {!activeReport && (
          <button
            onClick={() => setShowWizard(!showWizard)}
            className="flex items-center self-start sm:self-center gap-1.5 px-3 py-2 brand-gradient-bg text-white text-xs font-bold rounded-lg shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            <Plus size={14} />
            <span>{showWizard ? "Show Saved Campaigns" : "New Campaign Wizard"}</span>
          </button>
        )}
      </div>

      {!activeReport ? (
        showWizard ? (
          /* ================== WIZARD CREATION PANELS ================== */
          <div className="max-w-xl mx-auto glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20">
            <h3 className="text-sm font-bold text-white mb-3.5 flex items-center gap-2 border-b border-dark-700/20 pb-2">
              <Send size={14} className="text-brand-400 shrink-0" />
              <span>Configure Email Blast Campaign</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              {error && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg flex items-center gap-2">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">Campaign Title</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Send size={13} />
                  </div>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Promo Launch — May 2026"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">Email Subject Line</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Mail size={13} />
                  </div>
                  <input
                    type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Hi {{name}}, check out our new update!"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                    <Server size={11} className="text-brand-400 shrink-0" />
                    SMTP Node
                  </label>
                  <div className="relative">
                    <select
                      required value={selectedSmtp} onChange={e => setSelectedSmtp(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white appearance-none cursor-pointer transition-all duration-200"
                    >
                      <option value="">Choose SMTP...</option>
                      {smtps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dark-500 text-[8px]">
                      ▼
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                    <Users size={11} className="text-brand-400 shrink-0" />
                    Audience List
                  </label>
                  <div className="relative">
                    <select
                      required value={selectedList} onChange={e => setSelectedList(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white appearance-none cursor-pointer transition-all duration-200"
                    >
                      <option value="">Choose List...</option>
                      {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.contacts_count} leads)</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dark-500 text-[8px]">
                      ▼
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={11} className="text-brand-400 shrink-0" />
                    Email Template
                  </label>
                  <div className="relative">
                    <select
                      required value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white appearance-none cursor-pointer transition-all duration-200"
                    >
                      <option value="">Choose Template...</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dark-500 text-[8px]">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock size={11} className="text-brand-400 shrink-0" />
                    Schedule Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white transition-all duration-200 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                    <RefreshCw size={11} className="text-brand-400 shrink-0" />
                    Auto-Resend Every
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={autoResendHours === 0 ? "" : autoResendHours}
                      onChange={e => setAutoResendHours(Number(e.target.value))}
                      placeholder="e.g. 24 hours"
                      className="w-full pl-3 pr-10 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white transition-all duration-200"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 text-[9px] font-bold">
                      hrs
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                    <Activity size={11} className="text-brand-400 shrink-0" />
                    Sending Mode
                  </label>
                  <div className="relative">
                    <select
                      value={sendingMode}
                      onChange={e => setSendingMode(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white appearance-none cursor-pointer transition-all duration-200"
                    >
                      <option value="auto">Auto (celery worker)</option>
                      <option value="manual">Manual (click send)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dark-500 text-[8px]">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !name || !subject || !selectedSmtp || !selectedList || !selectedTemplate}
                className="w-full py-2.5 brand-gradient-bg text-white font-bold rounded-lg text-xs transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 glow-btn disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-white" />
                    <span>Saving Configuration...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Save Campaign Config</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ================== DISPLAY SAVED LIST ================== */
          <div className="glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20">
            {loading ? (
              <div className="flex justify-center py-20">
                <RefreshCw className="animate-spin text-brand-500" size={18} />
              </div>
            ) : campaigns.length > 0 ? (
              <div className="overflow-x-auto pr-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700/40 pb-2 text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                      <th className="pb-2">Campaign details</th>
                      <th className="pb-2">Target Count</th>
                      <th className="pb-2">Delivered</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-750/30">
                    {campaigns.map((c) => (
                      <tr 
                        key={c.id} 
                        onClick={() => openReport(c)}
                        className="text-[11px] text-dark-200 hover:bg-dark-700/5 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{c.name}</span>
                            <ChevronRight size={10} className="text-dark-500 shrink-0" />
                          </div>
                          <span className="text-[9px] text-dark-400 font-medium block truncate max-w-[200px]">{c.subject}</span>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="text-[7.5px] bg-dark-950/80 text-brand-400 px-1 py-0.5 rounded border border-dark-800 uppercase font-extrabold tracking-wide">{c.sending_mode || 'auto'} mode</span>
                            {c.auto_resend_hours !== undefined && c.auto_resend_hours > 0 && (
                              <span className="text-[7.5px] bg-dark-950/80 text-indigo-400 px-1 py-0.5 rounded border border-dark-800 font-extrabold">every {c.auto_resend_hours}h</span>
                            )}
                            {c.scheduled_at && (
                              <span className="text-[7.5px] bg-dark-950/80 text-amber-400 px-1 py-0.5 rounded border border-dark-800 font-extrabold">Sched: {new Date(c.scheduled_at.endsWith('Z') ? c.scheduled_at : c.scheduled_at + 'Z').toLocaleString()}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 font-mono">{c.total_recipients}</td>
                        <td className="py-2.5 text-brand-400 font-bold font-mono">{c.sent_count} / {c.total_recipients}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border
                            ${c.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                            ${c.status === 'sending' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20 animate-pulse' : ''}
                            ${c.status === 'draft' ? 'bg-dark-800 text-dark-350 border border-dark-700' : ''}
                            ${c.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : ''}
                          `}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          {c.status === 'draft' && (
                            <button
                              onClick={(e) => handleSendCampaign(c.id, e)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 mx-auto hover:scale-[1.02] active:scale-[0.98] transition-all text-[10px]"
                            >
                              <Play size={8} />
                              <span>Send Now</span>
                            </button>
                          )}
                          {c.status !== 'draft' && (
                            <span className="text-[9px] text-brand-400 font-bold uppercase tracking-wider flex items-center gap-0.5 justify-center hover:text-brand-300 transition-colors">
                              <span>Report</span>
                              <ExternalLink size={8} />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-dark-700/50 rounded-xl bg-dark-900/25 flex flex-col items-center justify-center gap-2 animate-fadeIn">
                <Send size={16} className="text-dark-500" />
                <p className="text-xs font-bold text-white">No campaigns found</p>
                <p className="text-[10px] text-dark-500 mt-0.5 max-w-[180px] mx-auto leading-normal">Construct your email broadcast in the wizard above to begin sending.</p>
              </div>
            )}
          </div>
        )
      ) : (
        /* ================== DISPLAY ANALYTICS REPORT ================== */
        <div className="space-y-3.5">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 flex flex-col gap-1 shadow-md shadow-dark-950/10">
              <span className="text-[8px] font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                <Send size={9} />
                Sending Progress
              </span>
              <h4 className="text-lg font-extrabold text-white mt-1 font-mono">
                {activeReport.sent_count} / {activeReport.total_recipients}
              </h4>
              <p className="text-[9px] text-dark-500">Dispatched emails</p>
            </div>
            
            <div className="glass-panel p-3.5 rounded-xl border border-emerald-500/10 flex flex-col gap-1 shadow-md shadow-dark-950/10">
              <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle size={9} />
                Unique Opens
              </span>
              <h4 className="text-lg font-extrabold text-emerald-400 mt-1 font-mono">
                {activeReport.open_count}
              </h4>
              <p className="text-[9px] text-dark-500">
                Rate: <span className="font-bold text-white">{activeReport.sent_count > 0 ? round((activeReport.open_count / activeReport.sent_count) * 100) : 0}%</span>
              </p>
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-indigo-500/10 flex flex-col gap-1 shadow-md shadow-dark-950/10">
              <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <MousePointerClick size={9} />
                Unique Clicks
              </span>
              <h4 className="text-lg font-extrabold text-indigo-400 mt-1 font-mono">
                {activeReport.click_count}
              </h4>
              <p className="text-[9px] text-dark-500">
                CTR: <span className="font-bold text-white">{activeReport.sent_count > 0 ? round((activeReport.click_count / activeReport.sent_count) * 100) : 0}%</span>
              </p>
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 flex flex-col gap-1 shadow-md shadow-dark-950/10 col-span-2 lg:col-span-1">
              <span className="text-[8px] font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                <Activity size={9} />
                Campaign Status
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <Clock size={12} className={activeReport.status === "sending" ? "text-brand-400 animate-spin shrink-0" : "text-dark-400 shrink-0"} />
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  {activeReport.status}
                </h4>
              </div>
              <p className="text-[9px] text-dark-500">Celery queue execution</p>
            </div>
          </div>

          {/* Delivery logs rows */}
          <div className="glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-dark-700/20 pb-2">
              <Clock size={14} className="text-brand-400 shrink-0" />
              <span>Delivery Log Rows ({reportLogs.length})</span>
            </h3>

            {reportLogs.length > 0 ? (
              <div className="overflow-x-auto max-h-[360px] pr-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700/40 pb-2 text-[9px] font-bold text-dark-400 uppercase tracking-wider">
                      <th className="pb-2">Recipient Email</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Opened</th>
                      <th className="pb-2">Clicked</th>
                      <th className="pb-2 text-right">Details / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-750/30">
                    {reportLogs.map((l) => (
                      <tr key={l.id} className="text-[11px] text-dark-200 hover:bg-dark-700/5 transition-colors">
                        <td className="py-2 font-mono text-dark-300 truncate max-w-[150px]" title={l.email}>{l.email}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border
                            ${l.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                            ${l.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : ''}
                            ${l.status === 'pending' ? 'bg-dark-800 text-dark-300 border border-dark-700 animate-pulse' : ''}
                          `}>
                            {l.status}
                          </span>
                        </td>
                        <td className={`py-2 font-bold text-[10px] ${l.opened ? 'text-emerald-400' : 'text-dark-500'}`}>{l.opened ? "YES" : "NO"}</td>
                        <td className={`py-2 font-bold text-[10px] ${l.clicked ? 'text-indigo-400' : 'text-dark-500'}`}>{l.clicked ? "YES" : "NO"}</td>
                        <td className="py-2 text-[10px] text-dark-400 text-right truncate max-w-[150px]" title={l.error_message}>
                          {l.error_message || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-dark-700/50 rounded-xl bg-dark-900/25 flex flex-col items-center justify-center gap-1.5 animate-fadeIn">
                <Clock size={14} className="text-dark-500 animate-pulse" />
                <p className="text-[10px] text-dark-400 font-semibold">Queue is dispatching</p>
                <p className="text-[9px] text-dark-500">Logs will be rendered as Celery tasks register connections.</p>
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
