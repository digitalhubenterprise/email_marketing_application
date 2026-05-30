import React, { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { 
  Send, 
  Plus, 
  Trash2, 
  Play, 
  Pause,
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
  MousePointerClick,
  Monitor,
  Smartphone,
  Sliders,
  Archive,
  Search,
  Filter
} from 'lucide-react'

interface Campaign {
  id: number;
  name: string;
  subject: string;
  subject_b?: string;
  ab_split_ratio?: number;
  ab_winner_metric?: string;
  ab_winner_subject?: string;
  throttle_limit?: number;
  category?: string;
  is_archived?: boolean;
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
  const [subjectB, setSubjectB] = useState("");
  const [abSplitRatio, setAbSplitRatio] = useState(0);
  const [abWinnerMetric, setAbWinnerMetric] = useState("open_rate");
  const [throttleLimit, setThrottleLimit] = useState(0);
  const [category, setCategory] = useState("Newsletter");
  
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
  
  // Filtering & search
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

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
          subject_b: subjectB || null,
          ab_split_ratio: Number(abSplitRatio) || 0,
          ab_winner_metric: abSplitRatio > 0 ? abWinnerMetric : null,
          throttle_limit: Number(throttleLimit) || 0,
          category,
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
        setSubjectB("");
        setAbSplitRatio(0);
        setThrottleLimit(0);
        setCategory("Newsletter");
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

  const handlePauseCampaign = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/campaigns/${id}/pause`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchData();
        if (activeReport && activeReport.id === id) {
          const updated = await res.json();
          setActiveReport(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeCampaign = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/campaigns/${id}/resume`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchData();
        if (activeReport && activeReport.id === id) {
          const updated = await res.json();
          setActiveReport(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveCampaign = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Archive this campaign? It will be hidden from default view.")) return;
    try {
      const res = await fetch(`/api/campaigns/${id}/archive`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchData();
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

  // Filter and search campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All" || c.category === categoryFilter;
    const isNotArchived = !c.is_archived;
    return matchesSearch && matchesCategory && isNotArchived;
  });

  // Calculate live dynamic report statistics
  const mobileOpens = reportLogs.filter(l => l.device_type === 'Mobile' && l.opened).length;
  const desktopOpens = reportLogs.filter(l => l.device_type === 'Desktop' && l.opened).length;
  const totalOpens = mobileOpens + desktopOpens;
  const mobilePct = totalOpens > 0 ? Math.round((mobileOpens / totalOpens) * 100) : 0;
  const desktopPct = totalOpens > 0 ? Math.round((desktopOpens / totalOpens) * 100) : 0;

  // A/B testing metrics parser
  const aSent = reportLogs.filter(l => l.error_code === 'A').length;
  const aOpens = reportLogs.filter(l => l.error_code === 'A' && l.opened).length;
  const bSent = reportLogs.filter(l => l.error_code === 'B').length;
  const bOpens = reportLogs.filter(l => l.error_code === 'B' && l.opened).length;
  const aOpenRate = aSent > 0 ? Math.round((aOpens / aSent) * 100) : 0;
  const bOpenRate = bSent > 0 ? Math.round((bOpens / bSent) * 100) : 0;

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
              <span>{activeReport ? `Live Analytics: ${activeReport.name}` : "Campaigns Workspace"}</span>
            </h2>
            <p className="text-[10px] text-dark-400 mt-0.5">
              {activeReport ? `Category: ${activeReport.category || 'Newsletter'}` : "Design subject split tests, manage hourly dispatches speed, and check live recipient opens."}
            </p>
          </div>
        </div>

        {!activeReport && (
          <button
            onClick={() => setShowWizard(!showWizard)}
            className="flex items-center self-start sm:self-center gap-1.5 px-3 py-2 brand-gradient-bg text-white text-xs font-bold rounded-lg shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            <Plus size={14} />
            <span>{showWizard ? "Browse Sent Campaigns" : "New Campaign Creator"}</span>
          </button>
        )}
      </div>

      {!activeReport ? (
        showWizard ? (
          /* ================== WIZARD CREATION PANELS ================== */
          <div className="max-w-xl mx-auto glass-panel p-4 rounded-xl border border-dark-700/30 shadow-lg space-y-3">
            <h3 className="text-sm font-bold text-white mb-2.5 flex items-center gap-2 border-b border-dark-700/10 pb-2">
              <Sliders size={14} className="text-brand-400" />
              <span>Configure Delivery Parameters</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              {error && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg flex items-center gap-2">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Campaign Name</label>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Promo Launch — June 2026"
                    className="w-full px-3 py-2 bg-dark-950/45 hover:bg-dark-950/70 border border-dark-700/40 rounded-lg text-xs text-white placeholder:text-dark-600 focus:outline-none focus:border-brand-500/80 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Campaign Category</label>
                  <select
                    value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500/80 cursor-pointer"
                  >
                    <option value="Newsletter">Newsletter</option>
                    <option value="Welcome">Welcome Onboarding</option>
                    <option value="Promo">Promotion Launch</option>
                    <option value="Abandoned Cart">Abandoned Cart</option>
                    <option value="Re-engagement">Re-engagement</option>
                  </select>
                </div>
              </div>

              {/* Subject Lines (Subject A & Optional Subject B for A/B split) */}
              <div className="space-y-2 bg-dark-950/40 p-3 rounded-lg border border-dark-800">
                <div className="flex flex-col gap-1">
                  <label className="block text-[9px] font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1">
                    <Mail size={11} />
                    <span>Subject Line A (Core)</span>
                  </label>
                  <input
                    type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Hi {{first_name}}, check out our new update!"
                    className="w-full px-3 py-2 bg-dark-950/70 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-dark-800">
                  <div className="sm:col-span-2 flex flex-col gap-1">
                    <label className="block text-[9px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Mail size={11} />
                      <span>Subject Line B (Optional A/B Test)</span>
                    </label>
                    <input
                      type="text" value={subjectB} onChange={e => setSubjectB(e.target.value)}
                      placeholder="e.g. Quick question for {{first_name | 'Subscriber'}}..."
                      className="w-full px-3 py-2 bg-dark-950/70 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Split test Ratio (%)</label>
                    <input
                      type="number" min={0} max={100} value={abSplitRatio === 0 ? "" : abSplitRatio}
                      onChange={e => setAbSplitRatio(Number(e.target.value))}
                      placeholder="e.g. 20% group"
                      className="w-full px-3 py-2 bg-dark-950/70 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                {abSplitRatio > 0 && (
                  <div className="flex flex-col gap-1 pt-1.5 text-[9px] text-amber-400">
                    <label className="font-bold uppercase tracking-wider">A/B Winner Selection Metric</label>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="winner_metric" value="open_rate" checked={abWinnerMetric === "open_rate"} onChange={() => setAbWinnerMetric("open_rate")} />
                        <span>Best Open Rate (Recommended)</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="winner_metric" value="click_rate" checked={abWinnerMetric === "click_rate"} onChange={() => setAbWinnerMetric("click_rate")} />
                        <span>Best Link Clicks Ratio</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* SMTP, Audience, Template nodes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">SMTP Delivery Node</label>
                  <select
                    required value={selectedSmtp} onChange={e => setSelectedSmtp(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="">Choose SMTP...</option>
                    {smtps.map(s => <option key={s.id} value={s.id}>{s.name} ({s.reputation_score}% rep)</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Target Contacts List</label>
                  <select
                    required value={selectedList} onChange={e => setSelectedList(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="">Choose List...</option>
                    {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.contacts_count} leads)</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Email Template Layout</label>
                  <select
                    required value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="">Choose Template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Resends, Mode and Throttling */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-dark-950/30 p-2.5 rounded-lg border border-dark-800/40">
                <div className="flex flex-col gap-1">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Send Throttling (hour)</label>
                  <input
                    type="number" value={throttleLimit === 0 ? "" : throttleLimit} onChange={e => setThrottleLimit(Number(e.target.value))}
                    placeholder="e.g. 500/hr"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-850 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Schedule Release</label>
                  <input
                    type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                    className="w-full px-2 py-2 bg-dark-950 border border-dark-850 rounded-lg text-xs text-white cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Auto-Resend Inactive</label>
                  <input
                    type="number" value={autoResendHours === 0 ? "" : autoResendHours} onChange={e => setAutoResendHours(Number(e.target.value))}
                    placeholder="e.g. 48 hours"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-850 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Execution Pipeline</label>
                  <select
                    value={sendingMode} onChange={e => setSendingMode(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-850 rounded-lg text-xs text-white cursor-pointer"
                  >
                    <option value="auto">Auto Celery Queue</option>
                    <option value="manual">Manual trigger check</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !name || !subject || !selectedSmtp || !selectedList || !selectedTemplate}
                className="w-full py-2.5 brand-gradient-bg text-white font-bold rounded-lg text-xs hover:scale-[1.01] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Deploying campaign dispatches..." : "Schedule Campaign Delivery"}
              </button>
            </form>
          </div>
        ) : (
          /* ================== DISPLAY SAVED LIST ================== */
          <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 shadow-md space-y-3.5">
            
            {/* Search and Category Filter Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-dark-950/40 p-2.5 border border-dark-850 rounded-xl">
              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder:text-dark-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Filter size={12} className="text-brand-400" />
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Category Filter:</span>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-dark-950 border border-dark-800 px-2 py-1 rounded text-[10.5px] font-bold text-white cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Newsletter">Newsletter</option>
                  <option value="Welcome">Welcome</option>
                  <option value="Promo">Promo</option>
                  <option value="Abandoned Cart">Cart Recovery</option>
                  <option value="Re-engagement">Re-engagement</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <RefreshCw className="animate-spin text-brand-500" size={18} />
              </div>
            ) : filteredCampaigns.length > 0 ? (
              <div className="overflow-x-auto pr-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700/40 pb-2 text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                      <th className="pb-2">Campaign details</th>
                      <th className="pb-2">Type / Category</th>
                      <th className="pb-2">Dispatched Ratio</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-center font-bold">Actions workflow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-750/30">
                    {filteredCampaigns.map((c) => (
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
                            {c.throttle_limit !== undefined && c.throttle_limit > 0 && (
                              <span className="text-[7.5px] bg-dark-950/80 text-emerald-400 px-1 py-0.5 rounded border border-dark-800 font-extrabold">{c.throttle_limit}/hr throttle</span>
                            )}
                            {c.scheduled_at && (
                              <span className="text-[7.5px] bg-dark-950/80 text-amber-400 px-1 py-0.5 rounded border border-dark-800 font-extrabold">Sched: {new Date(c.scheduled_at).toLocaleString()}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 font-bold">
                          <span className="text-[9px] bg-dark-950 border border-dark-800 text-dark-350 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {c.category || "Newsletter"}
                          </span>
                          {c.subject_b && (
                            <span className="text-[7.5px] font-extrabold text-amber-400 ml-1.5 border border-amber-500/25 px-1 py-0.5 rounded uppercase bg-amber-500/5">
                              A/B Test
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-brand-400 font-bold font-mono text-[11.5px]">{c.sent_count} / {c.total_recipients}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-bold uppercase tracking-wider border
                            ${c.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                            ${c.status === 'sending' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20 animate-pulse' : ''}
                            ${c.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                            ${c.status === 'draft' ? 'bg-dark-800 text-dark-350 border border-dark-700' : ''}
                            ${c.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : ''}
                          `}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 justify-center">
                            {c.status === 'draft' && (
                              <button
                                onClick={(e) => handleSendCampaign(c.id, e)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 transition-all text-[9.5px]"
                              >
                                <Play size={8} />
                                <span>Start</span>
                              </button>
                            )}
                            {c.status === 'sending' && (
                              <button
                                onClick={(e) => handlePauseCampaign(c.id, e)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center gap-1 transition-all text-[9.5px]"
                                title="Pause Campaign mid-transit"
                              >
                                <Pause size={8} />
                                <span>Pause</span>
                              </button>
                            )}
                            {c.status === 'paused' && (
                              <button
                                onClick={(e) => handleResumeCampaign(c.id, e)}
                                className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg flex items-center gap-1 transition-all text-[9.5px]"
                                title="Resume dispatching"
                              >
                                <Play size={8} />
                                <span>Resume</span>
                              </button>
                            )}
                            <button
                              onClick={(e) => handleArchiveCampaign(c.id, e)}
                              className="p-1 bg-dark-950 text-dark-500 hover:text-white rounded border border-dark-800 hover:border-dark-700 transition-colors"
                              title="Archive Campaign history"
                            >
                              <Archive size={10} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-dark-700/50 rounded-xl bg-dark-900/25 flex flex-col items-center justify-center gap-2 animate-fadeIn">
                <Send size={16} className="text-dark-500" />
                <p className="text-xs font-bold text-white">No active campaigns found</p>
                <p className="text-[10px] text-dark-500 mt-0.5 max-w-[200px] mx-auto leading-normal">Schedule your newsletter in the wizard above or adjust the category filter.</p>
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

          {/* Advanced Analytics Grid (A/B testing performance & Device breakdown) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Device breakdown graph */}
            <div className="glass-panel p-4 rounded-xl border border-dark-700/30 shadow-md flex flex-col justify-between space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-dark-700/10 pb-2">
                <Monitor size={14} className="text-brand-400" />
                <span>Recipient Device Breakdown</span>
              </h4>

              <div className="space-y-3 py-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-dark-300">
                    <span className="flex items-center gap-1">
                      <Monitor size={10} />
                      Desktop Clients
                    </span>
                    <span className="font-mono">{desktopOpens} opens ({desktopPct}%)</span>
                  </div>
                  <div className="w-full bg-dark-950 rounded-full h-2.5 overflow-hidden">
                    <div style={{ width: `${desktopPct}%` }} className="bg-brand-500 h-full transition-all duration-500" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-dark-300">
                    <span className="flex items-center gap-1">
                      <Smartphone size={10} />
                      Mobile/Tablet Clients
                    </span>
                    <span className="font-mono">{mobileOpens} opens ({mobilePct}%)</span>
                  </div>
                  <div className="w-full bg-dark-950 rounded-full h-2.5 overflow-hidden">
                    <div style={{ width: `${mobilePct}%` }} className="bg-amber-500 h-full transition-all duration-500" />
                  </div>
                </div>
              </div>

              <p className="text-[9px] text-dark-500 leading-normal">Parsing standard User-Agent headers dynamically on click track requests.</p>
            </div>

            {/* A/B Subject Lines performance */}
            <div className="glass-panel p-4 rounded-xl border border-dark-700/30 shadow-md flex flex-col justify-between space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-dark-700/10 pb-2">
                <Sliders size={14} className="text-amber-400" />
                <span>A/B Subject split Performance</span>
              </h4>

              {activeReport.subject_b ? (
                <div className="space-y-3 py-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-dark-300">
                      <span className="truncate max-w-[140px]" title={activeReport.subject}>Subject A: {activeReport.subject}</span>
                      <span className="font-mono shrink-0">{aOpens}/{aSent} ({aOpenRate}%)</span>
                    </div>
                    <div className="w-full bg-dark-950 rounded-full h-2 overflow-hidden">
                      <div style={{ width: `${aOpenRate}%` }} className="bg-brand-500 h-full" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-dark-300">
                      <span className="truncate max-w-[140px]" title={activeReport.subject_b}>Subject B: {activeReport.subject_b}</span>
                      <span className="font-mono shrink-0">{bOpens}/{bSent} ({bOpenRate}%)</span>
                    </div>
                    <div className="w-full bg-dark-950 rounded-full h-2 overflow-hidden">
                      <div style={{ width: `${bOpenRate}%` }} className="bg-amber-500 h-full" />
                    </div>
                  </div>

                  {activeReport.ab_winner_subject && (
                    <div className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 p-1.5 rounded-lg text-emerald-400 font-extrabold flex items-center gap-1.5">
                      <CheckCircle size={10} />
                      <span>Winner Selected: "{activeReport.ab_winner_subject}"</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-dark-500 py-6">
                  <Clock size={16} className="text-dark-700 mb-1" />
                  <span>A/B subject testing wasn't configured for this campaign run.</span>
                </div>
              )}

              <p className="text-[9px] text-dark-500 leading-normal">Evaluates open rates of the split group before sending the winning version to the remainder list.</p>
            </div>
          </div>

          {/* Delivery logs rows */}
          <div className="glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-dark-700/20 pb-2">
              <Clock size={14} className="text-brand-400 shrink-0" />
              <span>Recipient Logs History ({reportLogs.length})</span>
            </h3>

            {reportLogs.length > 0 ? (
              <div className="overflow-x-auto max-h-[360px] pr-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700/40 pb-2 text-[9px] font-bold text-dark-400 uppercase tracking-wider">
                      <th className="pb-2">Recipient Email</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Device</th>
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
                          <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-bold uppercase tracking-wider border
                            ${l.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                            ${l.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : ''}
                            ${l.status === 'pending' ? 'bg-dark-800 text-dark-300 border border-dark-700 animate-pulse' : ''}
                          `}>
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2 font-bold text-dark-400 uppercase text-[9px]">{l.device_type || 'Desktop'}</td>
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
