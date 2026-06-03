import React, { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { 
  Send, Plus, Trash2, Edit, Shield, Play, Eye, EyeOff, 
  CheckCircle, AlertCircle, RefreshCw, Layers, Sliders, 
  HelpCircle, Settings, ClipboardList, Info, Loader2, Server
} from 'lucide-react'

interface Service {
  id: number;
  title: string;
  category: string;
  focus: string;
  angle: string;
  active: boolean;
  created_at: string;
}

interface Log {
  id: number;
  timestamp: string;
  service_title: string;
  category: string;
  status: string;
  message: string;
}

interface Stats {
  total_posts: number;
  success_posts: number;
  failed_posts: number;
  active_services: number;
  inactive_services: number;
  scheduler_status: string;
}

interface Config {
  telegram_channel: string;
  interval_hours: number;
  is_active: boolean;
  has_bot_token: boolean;
  has_groq_key: boolean;
  last_run?: string;
  next_run?: string;
}

interface TelegramMarketingProps {
  defaultTab?: 'dashboard' | 'imei' | 'server' | 'remote' | 'logs' | 'settings';
}

export default function TelegramMarketing({ defaultTab = 'dashboard' }: TelegramMarketingProps) {
  const { token } = useAuth();
  
  // Page Tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'imei' | 'server' | 'remote' | 'logs' | 'settings'>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  
  // Data lists states
  const [services, setServices] = useState<Service[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_posts: 0,
    success_posts: 0,
    failed_posts: 0,
    active_services: 0,
    inactive_services: 0,
    scheduler_status: 'Inactive'
  });
  
  // Configuration Settings State
  const [botToken, setBotToken] = useState('');
  const [channel, setChannel] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [intervalHours, setIntervalHours] = useState(2);
  const [schedulerActive, setSchedulerActive] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [hasBotToken, setHasBotToken] = useState(false);
  const [hasGroqKey, setHasGroqKey] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [nextRun, setNextRun] = useState<string | null>(null);

  // Visibility toggles
  const [showBotToken, setShowBotToken] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);

  // Pagination states for logs
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Modals / Loading indicator states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showTriggerModal, setShowTriggerModal] = useState(false);

  // Services form state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceCategory, setServiceCategory] = useState('IMEI Service');
  const [serviceFocus, setServiceFocus] = useState('');
  const [serviceAngle, setServiceAngle] = useState('Highly secure network factory unlocking key');
  const [serviceIsActive, setServiceIsActive] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/telegram-marketing/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/telegram-marketing/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data: Config = await res.json();
        setChannel(data.telegram_channel || '');
        setIntervalHours(data.interval_hours);
        setSchedulerActive(data.is_active);
        setHasBotToken(data.has_bot_token);
        setHasGroqKey(data.has_groq_key);
        setLastRun(data.last_run || null);
        setNextRun(data.next_run || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/telegram-marketing/services', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter) queryParams.append('status', statusFilter);
      if (searchFilter) queryParams.append('search', searchFilter);

      const res = await fetch(`/api/telegram-marketing/logs?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalLogs(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchConfig();
      fetchServices();
      fetchLogs();
    }
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'logs') {
      fetchLogs();
    }
  }, [page, limit, statusFilter, searchFilter, activeTab]);

  // Handle settings config update
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setActionLoading(true);

    try {
      const res = await fetch('/api/telegram-marketing/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          telegram_channel: channel,
          interval_hours: Number(intervalHours),
          is_active: schedulerActive,
          telegram_bot_token: botToken || undefined,
          groq_api_key: groqKey || undefined
        })
      });

      if (res.ok) {
        setFormSuccess('Configuration options saved successfully!');
        setBotToken('');
        setGroqKey('');
        await fetchConfig();
        await fetchStats();
      } else {
        const err = await res.json();
        setFormError(err.detail || 'Failed to update credentials settings.');
      }
    } catch (err) {
      setFormError('Network communication error. Verify credentials.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle service creation or update
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setActionLoading(true);

    const payload = {
      title: serviceTitle,
      category: serviceCategory,
      focus: serviceFocus,
      angle: serviceAngle,
      active: serviceIsActive
    };

    try {
      const url = editingServiceId 
        ? `/api/telegram-marketing/services/${editingServiceId}`
        : '/api/telegram-marketing/services';
      
      const method = editingServiceId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowServiceModal(false);
        setServiceTitle('');
        setServiceFocus('');
        setEditingServiceId(null);
        await fetchServices();
        await fetchStats();
      } else {
        const err = await res.json();
        setFormError(err.detail || 'Failed to save service.');
      }
    } catch (err) {
      setFormError('Network error. Check input validations.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditServiceClick = (s: Service) => {
    setEditingServiceId(s.id);
    setServiceTitle(s.title);
    setServiceCategory(s.category);
    setServiceFocus(s.focus);
    setServiceAngle(s.angle);
    setServiceIsActive(s.active);
    setShowServiceModal(true);
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm('Are you sure you want to delete this rotation service topic?')) return;
    try {
      const res = await fetch(`/api/telegram-marketing/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchServices();
        await fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger AI Generator manually
  const handleTriggerAIPost = async () => {
    setActionLoading(true);
    setTriggerResult(null);
    setShowTriggerModal(true);

    try {
      const res = await fetch('/api/telegram-marketing/trigger-post', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTriggerResult({ success: true, message: data.message });
        await fetchStats();
        await fetchLogs();
      } else {
        setTriggerResult({ success: false, message: data.detail || 'Failed to generate dynamic marketing post.' });
      }
    } catch (err) {
      setTriggerResult({ success: false, message: 'Network error communicating with generator node.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Helpers
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  const renderServicesTab = (categoryName: string, label: string) => {
    const targetCategory = categoryName === 'imei' ? 'IMEI Service' : categoryName === 'server' ? 'Server Service' : 'Remote Service';
    const displayedServices = services.filter(s => s.category === targetCategory);

    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="flex justify-between items-center pb-1">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders size={13} className="text-brand-400" />
            <span>{label} Topics Pool ({displayedServices.length})</span>
          </h3>
          <button
            onClick={() => {
              setEditingServiceId(null);
              setServiceTitle('');
              setServiceFocus('');
              setServiceCategory(targetCategory);
              setServiceAngle(categoryName === 'imei' ? 'Instant remote network unlocking service' : categoryName === 'server' ? 'Official server auto-API license renewal' : 'Hourly or daily remote software rentals');
              setServiceIsActive(true);
              setShowServiceModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 brand-gradient-bg hover:opacity-95 text-white rounded-lg text-[10px] font-bold shadow-md shadow-brand-500/15 transition-all"
          >
            <Plus size={12} />
            <span>Add Topic</span>
          </button>
        </div>

        {displayedServices.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-xl border border-dark-700/30">
            <Layers className="h-8 w-8 text-dark-500 mx-auto mb-2" />
            <p className="text-xs text-dark-400 font-semibold">No promotional {label.toLowerCase()} topics found.</p>
            <button
              onClick={() => {
                setEditingServiceId(null);
                setServiceTitle('');
                setServiceFocus('');
                setServiceCategory(targetCategory);
                setServiceAngle(categoryName === 'imei' ? 'Instant remote network unlocking service' : categoryName === 'server' ? 'Official server auto-API license renewal' : 'Hourly or daily remote software rentals');
                setServiceIsActive(true);
                setShowServiceModal(true);
              }}
              className="mt-3 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-white border border-dark-700 rounded-lg text-[10px] font-bold"
            >
              Create First Service
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayedServices.map((s) => (
              <div key={s.id} className="glass-panel p-4 rounded-xl border border-dark-700/30 flex flex-col justify-between hover:border-brand-500/30 transition-all duration-200">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-dark-850 pb-2">
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      {s.category}
                    </span>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-dark-600'}`} />
                  </div>

                  <h4 className="text-sm font-extrabold text-white truncate">{s.title}</h4>
                  
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-dark-500 uppercase tracking-widest block">Focus Angle</span>
                    <p className="text-[10px] text-dark-300 leading-relaxed line-clamp-2">{s.angle}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-dark-500 uppercase tracking-widest block">Details</span>
                    <p className="text-[10px] text-dark-400 leading-relaxed font-semibold font-mono line-clamp-3">{s.focus}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 border-t border-dark-850 pt-3 mt-4">
                  <button
                    onClick={() => handleEditServiceClick(s)}
                    className="p-1.5 text-dark-400 hover:text-white bg-dark-900/60 hover:bg-dark-800 rounded-lg border border-dark-800 transition-colors"
                    title="Edit Service"
                  >
                    <Edit size={11} />
                  </button>
                  <button
                    onClick={() => handleDeleteService(s.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/15 transition-colors"
                    title="Delete Service"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-dark-700/20">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Send size={18} className="text-brand-400 rotate-[320deg] shrink-0" />
            <span>Telegram AI Marketing Dispatcher</span>
          </h2>
          <p className="text-[10px] text-dark-400 mt-0.5">
            Automated LLM promoter targeting carrier locks and rentals. Alternates services periodically directly into channels.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerAIPost}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-[10px] font-bold shadow-md shadow-brand-500/10 transition-all shrink-0"
          >
            <Play size={11} fill="currentColor" />
            <span>Run AI Post Now</span>
          </button>
          
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-900/60 border border-dark-700/30 rounded-md">
            <span className={`h-1.5 w-1.5 rounded-full ${stats.scheduler_status === 'Active' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[9px] font-bold text-dark-300 uppercase tracking-wider">Scheduler: {stats.scheduler_status}</span>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-dark-800 gap-1.5">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'dashboard'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-dark-400 hover:text-white hover:border-dark-700'
          }`}
        >
          <Layers size={13} />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab('imei')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'imei'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-dark-400 hover:text-white hover:border-dark-700'
          }`}
        >
          <Send size={13} className="rotate-[320deg]" />
          <span>IMEI Service</span>
        </button>
        <button
          onClick={() => setActiveTab('server')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'server'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-dark-400 hover:text-white hover:border-dark-700'
          }`}
        >
          <Server size={13} />
          <span>Server Service</span>
        </button>
        <button
          onClick={() => setActiveTab('remote')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'remote'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-dark-400 hover:text-white hover:border-dark-700'
          }`}
        >
          <Sliders size={13} />
          <span>Remote Service</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'logs'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-dark-400 hover:text-white hover:border-dark-700'
          }`}
        >
          <ClipboardList size={13} />
          <span>Logs & Trace</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'settings'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-dark-400 hover:text-white hover:border-dark-700'
          }`}
        >
          <Settings size={13} />
          <span>Integration API</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      
      {/* 1. OVERVIEW DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 flex items-center gap-3">
              <div className="h-9 w-9 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-400 border border-brand-500/20">
                <Send size={16} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-dark-400 uppercase tracking-widest">Total Posts</p>
                <h4 className="text-lg font-black text-white leading-tight">{stats.total_posts}</h4>
              </div>
            </div>
            
            <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 flex items-center gap-3">
              <div className="h-9 w-9 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <CheckCircle size={16} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-dark-400 uppercase tracking-widest">Successful Sends</p>
                <h4 className="text-lg font-black text-white leading-tight">{stats.success_posts}</h4>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 flex items-center gap-3">
              <div className="h-9 w-9 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-400 border border-rose-500/20">
                <AlertCircle size={16} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-dark-400 uppercase tracking-widest">Errors Logged</p>
                <h4 className="text-lg font-black text-white leading-tight">{stats.failed_posts}</h4>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 flex items-center gap-3">
              <div className="h-9 w-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400 border border-amber-500/20">
                <Layers size={16} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-dark-400 uppercase tracking-widest">Rotated Services</p>
                <h4 className="text-lg font-black text-white leading-tight">
                  {stats.active_services} <span className="text-[10px] text-dark-400 font-normal">Active</span>
                </h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Quick Status / Description Panel */}
            <div className="lg:col-span-8 space-y-4">
              <div className="glass-panel p-4 rounded-xl border border-dark-700/30 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Info size={13} className="text-brand-400" />
                  <span>SaaS AI Dispatch Node Overview</span>
                </h3>
                <p className="text-xs text-dark-300 leading-relaxed">
                  The automated AI Campaign manager alternates promotions between active services (GSM carrier unlocks, server credentials, and remote rentals). At the interval specified in Settings, the background engine requests a Groq AI LLM payload using system-engineered prompts, verifies the message contains no credentials leaks, and dispatches the promotion straight to your Telegram news channel.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-dark-900/40 rounded-lg border border-dark-800 text-[10px] space-y-1">
                    <span className="text-dark-400 block font-bold">Last Run Timestamp:</span>
                    <span className="text-white font-mono font-semibold">{lastRun ? formatDateTime(lastRun) : 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-dark-900/40 rounded-lg border border-dark-800 text-[10px] space-y-1">
                    <span className="text-dark-400 block font-bold">Next Run Estimated Ticks:</span>
                    <span className="text-brand-400 font-mono font-semibold">
                      {nextRun && schedulerActive ? formatDateTime(nextRun) : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Setup Guideline Warning */}
              <div className="p-3 bg-brand-500/10 border border-brand-500/20 text-brand-300 rounded-xl flex gap-2.5 text-[10px] items-start leading-relaxed">
                <HelpCircle size={14} className="shrink-0 text-brand-400 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-0.5 text-white">How to initialize your automatic dispatcher:</h4>
                  <ol className="list-decimal pl-4 space-y-0.5 font-semibold">
                    <li>Create your Telegram channel and add your bot as an administrator.</li>
                    <li>Configure credentials in the <strong>Integration API</strong> tab.</li>
                    <li>Add promotional service topics in the <strong>Service Rotation</strong> tab.</li>
                    <li>Toggle the scheduler switch on inside Integration settings.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Quick Actions / Integration Health Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="glass-panel p-4 rounded-xl border border-dark-700/30 space-y-3.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Integration Health</h3>
                
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] p-2 bg-dark-900/40 rounded-lg border border-dark-800">
                    <span className="text-dark-400 font-bold">Telegram Token Status</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${hasBotToken ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {hasBotToken ? 'Configured' : 'Missing'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] p-2 bg-dark-900/40 rounded-lg border border-dark-800">
                    <span className="text-dark-400 font-bold">Groq Cloud API Key</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${hasGroqKey ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {hasGroqKey ? 'Configured' : 'Missing'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] p-2 bg-dark-900/40 rounded-lg border border-dark-800">
                    <span className="text-dark-400 font-bold">Target Broadcast Channel</span>
                    <span className={`font-mono text-white ${channel ? 'text-white' : 'text-rose-400'}`}>
                      {channel || 'Not Configured'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SERVICES ROTATION TAB */}
      {activeTab === 'imei' && renderServicesTab('imei', 'IMEI Service')}
      {activeTab === 'server' && renderServicesTab('server', 'Server Service')}
      {activeTab === 'remote' && renderServicesTab('remote', 'Remote Service')}

      {/* 3. AUDIT LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-dark-750">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ClipboardList size={13} className="text-brand-400" />
              <span>Telegram Dispatch Audit Logs ({totalLogs})</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search filter */}
              <input
                type="text"
                placeholder="Search logs..."
                value={searchFilter}
                onChange={(e) => { setSearchFilter(e.target.value); setPage(1); }}
                className="px-2.5 py-1 bg-dark-950/50 border border-dark-700/50 rounded-lg text-[10px] text-white focus:outline-none focus:border-brand-500"
              />

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-2 py-1 bg-dark-950/50 border border-dark-700/50 rounded-lg text-[10px] text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">All Statuses</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
              </select>

              {/* Pagination limit */}
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-dark-950/50 border border-dark-700/50 rounded-lg text-[10px] text-white focus:outline-none focus:border-brand-500"
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-brand-500 h-6 w-6" />
            </div>
          ) : logs.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-xl border border-dark-700/30">
              <ClipboardList className="h-8 w-8 text-dark-500 mx-auto mb-2" />
              <p className="text-xs text-dark-400 font-semibold">No dispatch logs found mapping your current filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="glass-panel p-3.5 rounded-xl border border-dark-700/30 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-850 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${log.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {log.status}
                      </span>
                      <span className="font-semibold text-white">{log.service_title}</span>
                      <span className="text-[10px] text-dark-500">•</span>
                      <span className="text-[10px] text-dark-400 font-semibold">{log.category}</span>
                    </div>
                    <span className="text-[10px] text-dark-500 font-semibold font-mono">{formatDateTime(log.timestamp)}</span>
                  </div>

                  <p className="text-dark-300 leading-relaxed font-semibold font-mono p-2.5 bg-dark-950/40 border border-dark-900/60 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {log.message}
                  </p>
                </div>
              ))}

              {/* Pagination controls */}
              <div className="flex items-center justify-between border-t border-dark-850 pt-3">
                <span className="text-[10px] text-dark-400 font-semibold">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalLogs)} of {totalLogs} logs
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="px-2.5 py-1 bg-dark-900 hover:bg-dark-800 disabled:opacity-30 border border-dark-800 rounded-lg text-[10px] font-bold text-white transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page * limit >= totalLogs}
                    onClick={() => setPage(prev => prev + 1)}
                    className="px-2.5 py-1 bg-dark-900 hover:bg-dark-800 disabled:opacity-30 border border-dark-800 rounded-lg text-[10px] font-bold text-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. INTEGRATION SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 glass-panel p-4 rounded-xl border border-dark-700/30 shadow-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings size={13} className="text-brand-400" />
              <span>Telegram API & Credentials Configurations</span>
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {formError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg flex items-center gap-2">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg flex items-center gap-2">
                  <CheckCircle size={12} className="shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bot Token */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Telegram Bot Token</label>
                  <div className="relative">
                    <input
                      type={showBotToken ? "text" : "password"}
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder={hasBotToken ? "••••••••••••••••••••••••" : "e.g. 123456:ABC-DEF..."}
                      className="w-full pl-3.5 pr-9 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white placeholder:text-dark-600 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBotToken(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white"
                    >
                      {showBotToken ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                {/* Groq Key */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Groq Cloud API Key</label>
                  <div className="relative">
                    <input
                      type={showGroqKey ? "text" : "password"}
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder={hasGroqKey ? "••••••••••••••••••••••••" : "e.g. gsk_abc123..."}
                      className="w-full pl-3.5 pr-9 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white placeholder:text-dark-600 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqKey(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white"
                    >
                      {showGroqKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Broadcast Channel */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Broadcast Channel Username *</label>
                  <input
                    type="text"
                    required
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    placeholder="e.g. @my_carrier_unlocks"
                    className="w-full px-3.5 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white placeholder:text-dark-600 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Interval Frequency */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Interval Hours (1-168) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="168"
                    value={intervalHours}
                    onChange={(e) => setIntervalHours(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Scheduler Toggle */}
              <div className="flex items-center gap-3 p-3 bg-dark-900/40 border border-dark-800 rounded-lg">
                <input
                  type="checkbox"
                  id="schedulerToggle"
                  checked={schedulerActive}
                  onChange={(e) => setSchedulerActive(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500/20 bg-dark-950 border-dark-750"
                />
                <div>
                  <label htmlFor="schedulerToggle" className="text-xs font-bold text-white cursor-pointer select-none">
                    Enable Automatic AI Scheduling
                  </label>
                  <p className="text-[10px] text-dark-400 leading-tight">
                    When active, the celery engine checks and posts updates at the specified hourly interval.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-brand-500/10 transition-all flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="animate-spin h-3.5 w-3.5" />
                  ) : (
                    'Save Configurations'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4 glass-panel p-4 rounded-xl border border-dark-700/30 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Credential Guard</h3>
              <p className="text-[11px] text-dark-300 leading-relaxed font-semibold">
                To prevent accidental credentials leakage, all generated LLM copy outputs are inspected before dispatch. If Groq API signatures, Telegram tokens, Database paths, or JWT strings are detected, the posting sequence terminates immediately and logs a Fail-Safe abort event.
              </p>
            </div>
            <div className="pt-4 border-t border-dark-850 mt-4 flex items-center gap-2 text-dark-400 text-[10px] font-bold">
              <Shield size={13} className="text-emerald-400 shrink-0" />
              <span>Abuse Prevention active</span>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-xl border border-dark-700/30 p-5 space-y-4 shadow-2xl relative">
            <h3 className="text-sm font-bold text-white border-b border-dark-800 pb-2">
              {editingServiceId ? 'Edit Rotation Topic' : 'Add Rotation Topic'}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-3.5">
              {formError && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Topic Title *</label>
                  <input
                    type="text" required value={serviceTitle} onChange={e => setServiceTitle(e.target.value)}
                    placeholder="e.g. GSM iPhone Unlocks"
                    className="w-full px-3 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Service Category *</label>
                  <select
                    value={serviceCategory} onChange={e => setServiceCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="IMEI Service">IMEI Service</option>
                    <option value="Server Service">Server Service</option>
                    <option value="Remote Service">Remote Service</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Angle & Hook *</label>
                <input
                  type="text" required value={serviceAngle} onChange={e => setServiceAngle(e.target.value)}
                  placeholder="e.g. Instant remote bypass with permanent unlocking keys"
                  className="w-full px-3 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Details & Key Words *</label>
                <textarea
                  required value={serviceFocus} onChange={e => setServiceFocus(e.target.value)} rows={3}
                  placeholder="Provide focus points for the AI, e.g.: support iOS 17/18, permanent server bypass, clean unlocks, official unlock portal url: https://unlock.org"
                  className="w-full px-3 py-2 bg-dark-950/45 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox" id="serviceActive" checked={serviceIsActive} onChange={e => setServiceIsActive(e.target.checked)}
                  className="w-3.5 h-3.5 text-brand-500 bg-dark-950 border-dark-750 rounded"
                />
                <label htmlFor="serviceActive" className="text-[10px] font-bold text-dark-300 cursor-pointer">
                  Activate in rotation queue
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-3.5 py-1.5 bg-dark-900 border border-dark-800 hover:bg-dark-800 text-white rounded-lg text-[10px] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 brand-gradient-bg hover:opacity-95 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="animate-spin h-3 w-3" /> : 'Save Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIAGNOSTIC TRIGGER POST MODAL */}
      {showTriggerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-xl border border-dark-700/30 p-5 space-y-4 shadow-2xl relative">
            <h3 className="text-sm font-bold text-white border-b border-dark-800 pb-2">
              AI Generator Tracing Console
            </h3>

            <div className="p-3 bg-dark-950 border border-dark-800 rounded-lg min-h-[160px] max-h-[300px] overflow-y-auto font-mono text-[11px] leading-relaxed">
              {actionLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-dark-400 space-y-2">
                  <Loader2 className="animate-spin text-brand-500 h-6 w-6" />
                  <span className="animate-pulse">Consulting LLaMA-3 model & checking leakage filters...</span>
                </div>
              ) : triggerResult ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {triggerResult.success ? (
                      <CheckCircle size={14} className="text-emerald-400" />
                    ) : (
                      <AlertCircle size={14} className="text-rose-400" />
                    )}
                    <span className={triggerResult.success ? "text-emerald-400" : "text-rose-400"}>
                      Status: {triggerResult.success ? 'Success' : 'Aborted'}
                    </span>
                  </div>
                  
                  <div className="p-2.5 bg-dark-900/60 border border-dark-850 rounded-lg text-dark-300 whitespace-pre-wrap">
                    {triggerResult.message}
                  </div>
                </div>
              ) : (
                <span className="text-dark-500">Initializing sequence...</span>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-dark-800">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowTriggerModal(false)}
                className="px-4 py-1.5 brand-gradient-bg hover:opacity-95 text-white rounded-lg text-[10px] font-bold disabled:opacity-50"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
