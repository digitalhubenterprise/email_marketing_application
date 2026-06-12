import React, { useEffect, useState, useRef } from 'react'
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  Calendar,
  Lock,
  List,
  ShieldCheck
} from 'lucide-react'

interface BackupConfig {
  provider: string;
  s3_endpoint: string | null;
  s3_bucket: string | null;
  s3_access_key: string | null;
  s3_region: string | null;
  s3_folder: string | null;
  ftp_host: string | null;
  ftp_port: number;
  ftp_username: string | null;
  ftp_path: string | null;
  ftp_secure: boolean;
  schedule_days: number;
  is_active: boolean;
  last_run: string | null;
  next_run: string | null;
}

interface BackupFile {
  filename: string;
  size_bytes: number;
  created_at: string | null;
}

interface BackupLog {
  id: number;
  filename: string;
  status: string;
  size_bytes: number;
  message: string | null;
  created_at: string;
}

export default function AdminBackups() {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [triggeringDb, setTriggeringDb] = useState(false);
  const [triggeringFull, setTriggeringFull] = useState(false);
  const triggering = triggeringDb || triggeringFull;
  const [restoring, setRestoring] = useState(false);
  const [restoreLogs, setRestoreLogs] = useState<string[]>([]);
  const [restoreStatus, setRestoreStatus] = useState<string>('idle'); // idle, running, success, failed
  const [showRestoreConsole, setShowRestoreConsole] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState('');
  const consoleBottomRef = useRef<HTMLDivElement | null>(null);
  const [logsTab, setLogsTab] = useState<'backup' | 'restore'>('backup');

  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [restoreLogs]);

  const checkActiveRestore = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/backups/restore/active", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.active && data.filename) {
          const targetFile = data.filename;
          setRestoringFilename(targetFile);
          setRestoreStatus('running');
          setShowRestoreConsole(true);
          setRestoreLogs(["[1/5] Resuming active restoration console session...", "[1/5] Listening for Redis background task events..."]);
          
          let pollCount = 0;
          const interval = setInterval(async () => {
            pollCount += 1;
            const currentToken = localStorage.getItem("admin_token");
            try {
              const statusRes = await fetch(`/api/admin/backups/restore/status?filename=${encodeURIComponent(targetFile)}`, {
                headers: { "Authorization": `Bearer ${currentToken}` }
              });
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.logs && statusData.logs.length > 0) {
                  setRestoreLogs(statusData.logs);
                }
                if (statusData.status === 'success' || statusData.status === 'failed') {
                  clearInterval(interval);
                  setRestoreStatus(statusData.status);
                  fetchFiles();
                  fetchLogs();
                  if (statusData.status === 'success') {
                    setRestoreLogs(prev => [...prev, "[SUCCESS] Database restoration complete! Redirecting to dashboard in 4 seconds..."]);
                    setTimeout(() => {
                      window.location.href = "/admin";
                    }, 4000);
                  }
                  return;
                }
              }
            } catch (e) {
              console.error("Error polling active restore:", e);
            }
            if (pollCount >= 100) {
              clearInterval(interval);
              setRestoreStatus('failed');
            }
          }, 1500);
        }
      }
    } catch (e) {
      console.error("Failed to check active restore:", e);
    }
  };
  
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  
  // Form states
  const [provider, setProvider] = useState('ftp');
  const [s3Endpoint, setS3Endpoint] = useState('');
  const [s3Bucket, setS3Bucket] = useState('');
  const [s3AccessKey, setS3AccessKey] = useState('');
  const [s3SecretKey, setS3SecretKey] = useState('');
  const [s3Region, setS3Region] = useState('');
  const [s3Folder, setS3Folder] = useState('backups');
  
  const [ftpHost, setFtpHost] = useState('');
  const [ftpPort, setFtpPort] = useState(21);
  const [ftpUsername, setFtpUsername] = useState('');
  const [ftpPassword, setFtpPassword] = useState('');
  const [ftpPath, setFtpPath] = useState('/');
  const [ftpSecure, setFtpSecure] = useState(true);
  
  const [scheduleDays, setScheduleDays] = useState(1);
  const [retentionCount, setRetentionCount] = useState(5);
  const [isActive, setIsActive] = useState(false);

  // Restore confirmation states
  const [selectedFileToRestore, setSelectedFileToRestore] = useState<string | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');

  // Pagination states
  const [logsPage, setLogsPage] = useState(1);
  const logsPerPage = 10;

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch('/api/admin/backups/config', {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setProvider(data.provider);
        setS3Endpoint(data.s3_endpoint || '');
        setS3Bucket(data.s3_bucket || '');
        setS3AccessKey(data.s3_access_key || '');
        setS3Region(data.s3_region || '');
        setS3Folder(data.s3_folder || 'backups');
        
        setFtpHost(data.ftp_host || '');
        setFtpPort(data.ftp_port ?? 21);
        setFtpUsername(data.ftp_username || '');
        setFtpPath(data.ftp_path || '/');
        setFtpSecure(data.ftp_secure ?? true);
        
        setScheduleDays(data.schedule_days ?? 1);
        setRetentionCount(data.retention_count ?? 5);
        setIsActive(data.is_active ?? false);
      }
    } catch (err) {
      console.error("Failed to fetch backup config:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    setFilesLoading(true);
    setFilesError(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch('/api/admin/backups/files', {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      } else {
        const errorData = await res.json();
        setFilesError(errorData.detail || "Could not fetch remote files.");
      }
    } catch (err: any) {
      setFilesError(err.message || "Connection failed to backups API.");
    } finally {
      setFilesLoading(false);
    }
  };

  const fetchLogs = async (tab: 'backup' | 'restore' = logsTab) => {
    setLogsLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/backups/logs?page=${logsPage}&limit=${logsPerPage}&log_type=${tab}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchFiles();
    checkActiveRestore();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [logsPage, logsTab]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    const token = localStorage.getItem("admin_token");

    const payload: any = {
      provider,
      schedule_days: scheduleDays,
      retention_count: retentionCount,
      is_active: isActive
    };

    if (provider === 's3') {
      payload.s3_endpoint = s3Endpoint;
      payload.s3_bucket = s3Bucket;
      payload.s3_access_key = s3AccessKey;
      payload.s3_region = s3Region;
      payload.s3_folder = s3Folder;
      if (s3SecretKey) {
        payload.s3_secret_key = s3SecretKey;
      }
    } else {
      payload.ftp_host = ftpHost;
      payload.ftp_port = ftpPort;
      payload.ftp_username = ftpUsername;
      payload.ftp_path = ftpPath;
      payload.ftp_secure = ftpSecure;
      if (ftpPassword) {
        payload.ftp_password = ftpPassword;
      }
    }

    try {
      const res = await fetch('/api/admin/backups/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSaveSuccess("Backup configurations updated successfully.");
        setS3SecretKey('');
        setFtpPassword('');
        fetchConfig();
        fetchFiles();
        setTimeout(() => setSaveSuccess(null), 4000);
      } else {
        const data = await res.json();
        setSaveError(data.detail || "Failed to update backup configurations.");
      }
    } catch (err: any) {
      setSaveError(err.message || "Network request error.");
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerBackup = async (fullSite: boolean = false) => {
    if (fullSite) {
      setTriggeringFull(true);
    } else {
      setTriggeringDb(true);
    }
    const token = localStorage.getItem("admin_token");
    const initialLatestLogId = logs.length > 0 ? logs[0].id : -1;
    
    try {
      const res = await fetch(`/api/admin/backups/trigger?full_site=${fullSite}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        // Start background polling to check when Celery completes the upload
        let pollCount = 0;
        const interval = setInterval(async () => {
          pollCount += 1;
          const currentToken = localStorage.getItem("admin_token");
          try {
            const [resFiles, resLogs] = await Promise.all([
              fetch('/api/admin/backups/files', { headers: { "Authorization": `Bearer ${currentToken}` } }),
              fetch(`/api/admin/backups/logs?page=1&limit=10`, { headers: { "Authorization": `Bearer ${currentToken}` } })
            ]);
            
            if (resFiles.ok) {
              const dataFiles = await resFiles.json();
              setFiles(dataFiles);
            }
            
            if (resLogs.ok) {
              const dataLogs = await resLogs.json();
              setLogs(dataLogs);
              
              // If a new log has appeared, stop loading early
              if (dataLogs.length > 0 && dataLogs[0].id !== initialLatestLogId) {
                clearInterval(interval);
                setTriggeringDb(false);
                setTriggeringFull(false);
                // Refresh config to get new last_run timestamp
                const resConfig = await fetch('/api/admin/backups/config', { headers: { "Authorization": `Bearer ${currentToken}` } });
                if (resConfig.ok) {
                  const dataConfig = await resConfig.json();
                  setConfig(dataConfig);
                }
                return;
              }
            }
          } catch (e) {
            console.error("Polling error:", e);
          }
          
          if (pollCount >= 8) { // 24 seconds max
            clearInterval(interval);
            setTriggeringDb(false);
            setTriggeringFull(false);
          }
        }, 3000);
        
        alert(`${fullSite ? 'Full Website' : 'Database'} backup process initialized in background! The system will automatically refresh the list and logs as soon as the upload completes.`);
      } else {
        const data = await res.json();
        alert(`Backup trigger failed: ${data.detail}`);
        setTriggeringDb(false);
        setTriggeringFull(false);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
      setTriggeringDb(false);
      setTriggeringFull(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (restoreConfirmText !== 'RESTORE') {
      alert("Please type 'RESTORE' to confirm database override.");
      return;
    }
    if (!selectedFileToRestore) return;

    const targetFile = selectedFileToRestore;
    setRestoringFilename(targetFile);
    setSelectedFileToRestore(null);
    setRestoreConfirmText('');
    setRestoreLogs(["[1/5] Initializing restore sequence...", "[1/5] Registering background celery restoration task..."]);
    setRestoreStatus('running');
    setShowRestoreConsole(true);

    const token = localStorage.getItem("admin_token");

    try {
      const res = await fetch(`/api/admin/backups/restore?filename=${encodeURIComponent(targetFile)}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        let pollCount = 0;
        const interval = setInterval(async () => {
          pollCount += 1;
          const currentToken = localStorage.getItem("admin_token");
          try {
            const statusRes = await fetch(`/api/admin/backups/restore/status?filename=${encodeURIComponent(targetFile)}`, {
              headers: { "Authorization": `Bearer ${currentToken}` }
            });
            if (statusRes.ok) {
              const data = await statusRes.json();
              if (data.logs && data.logs.length > 0) {
                setRestoreLogs(data.logs);
              }
              if (data.status === 'success' || data.status === 'failed') {
                clearInterval(interval);
                setRestoreStatus(data.status);
                fetchFiles();
                fetchLogs();
                if (data.status === 'success') {
                  setRestoreLogs(prev => [...prev, "[SUCCESS] Database restoration complete! Redirecting to dashboard in 4 seconds..."]);
                  setTimeout(() => {
                    window.location.href = "/admin";
                  }, 4000);
                }
                return;
              }
            }
          } catch (e) {
            console.error("Error polling restore status:", e);
          }
          
          if (pollCount >= 100) { // 150 seconds timeout
            clearInterval(interval);
            setRestoreStatus('failed');
            setRestoreLogs(prev => [...prev, "[ERROR] Restoration task timed out on frontend polling limit."]);
          }
        }, 1500);
      } else {
        const data = await res.json();
        setRestoreStatus('failed');
        setRestoreLogs(prev => [...prev, `[ERROR] Trigger failed: ${data.detail}`]);
      }
    } catch (err: any) {
      setRestoreStatus('failed');
      setRestoreLogs(prev => [...prev, `[ERROR] Network error: ${err.message}`]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        <p className="text-[10px] text-slate-500 mt-2 font-semibold animate-pulse font-mono">LOADING BACKUPS PARAMETERS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 -mt-3 relative">
      {/* Title Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] gap-4">
        <div>
          <h2 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
            💾 Remote Backups & Recovery Controller
          </h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider font-mono">
            Automate daily snapshots of databases and configurations to secure cloud channels
          </p>
        </div>
        
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-bold animate-slideDown flex items-center gap-1.5 self-start md:self-auto">
            <CheckCircle size={14} className="text-emerald-500" />
            {saveSuccess}
          </div>
        )}
        
        {saveError && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-2 rounded-xl text-[10px] font-bold animate-slideDown flex items-center gap-1.5 self-start md:self-auto">
            <AlertTriangle size={14} className="text-rose-500" />
            {saveError}
          </div>
        )}
      </div>

      {/* Warning Alert banner */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
        <div className="space-y-1">
          <h4 className="text-xs font-black text-amber-900">Disaster Recovery & Decryption Safety Warning</h4>
          <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
            In case of hosting crash or migrations, when running a fresh setup, you <strong>MUST</strong> ensure your new <code className="bg-amber-100 px-1 py-0.2 rounded text-[10px] font-mono">ENCRYPTION_KEY</code> and <code className="bg-amber-100 px-1 py-0.2 rounded text-[10px] font-mono">JWT_SECRET</code> in <code className="font-mono">.env</code> match the original installation exactly. If they do not match, the restored SMTP nodes passwords cannot be decrypted by the system!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column - Backup Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders size={14} className="text-brand-500" /> Backup Storage Target
            </h3>

            {/* Provider Switcher */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Connection Mode</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setProvider('ftp')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    provider === 'ftp'
                      ? 'bg-white text-brand-600 shadow-sm border border-slate-200/40'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  FTP / Secure FTPS
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('s3')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    provider === 's3'
                      ? 'bg-white text-brand-600 shadow-sm border border-slate-200/40'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  S3-Compatible Cloud
                </button>
              </div>
            </div>

            {/* FTP Form */}
            {provider === 'ftp' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] uppercase font-black text-slate-400">FTP Host IP</label>
                    <input
                      type="text"
                      value={ftpHost}
                      onChange={(e) => setFtpHost(e.target.value)}
                      placeholder="e.g. 67.211.221.230"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      required
                    />
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[9px] uppercase font-black text-slate-400">Port</label>
                    <input
                      type="number"
                      value={ftpPort}
                      onChange={(e) => setFtpPort(parseInt(e.target.value) || 21)}
                      placeholder="21"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-slate-400">FTP Username</label>
                  <input
                    type="text"
                    value={ftpUsername}
                    onChange={(e) => setFtpUsername(e.target.value)}
                    placeholder="User account email/login"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-slate-400">FTP Password</label>
                  <input
                    type="password"
                    value={ftpPassword}
                    onChange={(e) => setFtpPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  />
                  <p className="text-[8px] text-slate-400 font-bold">Leave blank to keep current password unchanged.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-slate-400">FTP Target Path</label>
                  <input
                    type="text"
                    value={ftpPath}
                    onChange={(e) => setFtpPath(e.target.value)}
                    placeholder="/Remote_Backups_SMartCampains"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    required
                  />
                </div>

                {/* FTPS toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-900">Enforce FTPS (FTP over TLS)</h5>
                    <p className="text-[8px] text-slate-400 font-bold mt-0.5">Encrypts command channels and payloads securely</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFtpSecure(!ftpSecure)}
                    className={`h-5 w-10 rounded-full transition-colors relative ${ftpSecure ? 'bg-brand-500' : 'bg-slate-350'}`}
                  >
                    <div className={`h-4.5 w-4.5 rounded-full bg-white transition-transform absolute top-0.25 ${ftpSecure ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            )}

            {/* S3 Form */}
            {provider === 's3' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-slate-400">Endpoint API URL</label>
                  <input
                    type="text"
                    value={s3Endpoint}
                    onChange={(e) => setS3Endpoint(e.target.value)}
                    placeholder="https://s3.amazonaws.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase font-black text-slate-400">S3 Bucket</label>
                    <input
                      type="text"
                      value={s3Bucket}
                      onChange={(e) => setS3Bucket(e.target.value)}
                      placeholder="my-backup-bucket"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase font-black text-slate-400">Region</label>
                    <input
                      type="text"
                      value={s3Region}
                      onChange={(e) => setS3Region(e.target.value)}
                      placeholder="us-west-2"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-slate-400">Access Key ID</label>
                  <input
                    type="text"
                    value={s3AccessKey}
                    onChange={(e) => setS3AccessKey(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-slate-400">Secret Access Key</label>
                  <input
                    type="password"
                    value={s3SecretKey}
                    onChange={(e) => setS3SecretKey(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  />
                  <p className="text-[8px] text-slate-400 font-bold">Leave blank to keep current secret key unchanged.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-slate-400">Directory Folder Path</label>
                  <input
                    type="text"
                    value={s3Folder}
                    onChange={(e) => setS3Folder(e.target.value)}
                    placeholder="backups"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    required
                  />
                </div>
              </div>
            )}

            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3 pt-2">
              <Calendar size={14} className="text-brand-500" /> Automation Scheduler
            </h3>

            {/* Scheduler days */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] uppercase font-black text-slate-400">Run Interval Frequency</label>
                <span className="text-[10px] font-black text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg">
                  Every {scheduleDays} {scheduleDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                value={scheduleDays}
                onChange={(e) => setScheduleDays(parseInt(e.target.value))}
                className="w-full accent-brand-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-slate-400 font-black">
                <span>1 DAY</span>
                <span>2 D</span>
                <span>3 D</span>
                <span>4 D</span>
                <span>5 D</span>
                <span>6 D</span>
                <span>7 DAYS (1 WEEK)</span>
              </div>
            </div>

            {/* Retention Count */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] uppercase font-black text-slate-400">Backups to Retain (Per Type)</label>
                <span className="text-[10px] font-black text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg">
                  Keep {retentionCount} {retentionCount === 1 ? 'Backup' : 'Backups'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={retentionCount}
                onChange={(e) => setRetentionCount(parseInt(e.target.value) || 5)}
                className="w-full accent-brand-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-slate-400 font-black">
                <span>1 BACKUP</span>
                <span>5 B</span>
                <span>10 B</span>
                <span>15 B</span>
                <span>20 B</span>
                <span>25 B</span>
                <span>30 BACKUPS</span>
              </div>
            </div>

            {/* Active Toggle Switch */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
              <div>
                <h5 className="text-[10px] font-bold text-slate-900">Activate Backup Scheduler</h5>
                <p className="text-[8px] text-slate-400 font-bold mt-0.5">Automates backups in background using celery beat</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`h-5 w-10 rounded-full transition-colors relative ${isActive ? 'bg-emerald-500' : 'bg-slate-350'}`}
              >
                <div className={`h-4.5 w-4.5 rounded-full bg-white transition-transform absolute top-0.25 ${isActive ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-slate-900 text-white rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10"
            >
              {saving ? <div className="animate-spin h-3.5 w-3.5 border-b-2 border-white rounded-full" /> : <ShieldCheck size={13} />}
              <span>Save Storage Settings</span>
            </button>
          </form>

          {/* Action Trigger Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
              ⚡ Backup Actions
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Manually compile current DB records, environment configs, and optional codebase files into a secure remote ZIP archive.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => handleTriggerBackup(false)}
                disabled={triggering}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white transition-colors rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10"
              >
                {triggeringDb ? <div className="animate-spin h-3.5 w-3.5 border-b-2 border-white rounded-full" /> : <Play size={11} />}
                <span>Trigger Database Backup</span>
              </button>

              <button
                onClick={() => handleTriggerBackup(true)}
                disabled={triggering}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white transition-colors rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/15"
              >
                {triggeringFull ? <div className="animate-spin h-3.5 w-3.5 border-b-2 border-white rounded-full" /> : <Database size={12} />}
                <span>Trigger Full Website Backup</span>
              </button>
            </div>

            {config && (config.last_run || config.next_run) && (
              <div className="pt-2 border-t border-slate-100 space-y-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                {config.last_run && (
                  <div className="flex justify-between">
                    <span>Last Backup Executed:</span>
                    <span className="text-slate-850 font-bold font-mono">{formatDate(config.last_run)}</span>
                  </div>
                )}
                {config.next_run && config.is_active && (
                  <div className="flex justify-between">
                    <span>Next Scheduled Run:</span>
                    <span className="text-brand-600 font-bold font-mono">{formatDate(config.next_run)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column - Remote Archives Recovery Grid & Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Remote Archives Grid */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Database size={14} className="text-brand-500 animate-pulse" /> Remote Backups Recovery Grid
              </h3>
              <button
                onClick={fetchFiles}
                disabled={filesLoading}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 transition-all hover:bg-slate-100 flex items-center justify-center"
                title="Refresh Remote Files List"
              >
                <RefreshCw size={12} className={filesLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {filesError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-semibold flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                <span>{filesError}</span>
              </div>
            ) : filesLoading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500" />
                <p className="text-[9px] text-slate-400 mt-2 font-bold font-mono">QUERING REMOTE DIRECTORIES...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                No backup zip files found on remote backup drive.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[9px] uppercase font-black text-slate-450 tracking-wider">
                      <th className="py-3 px-4">Zip File Name</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Created Time</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10px] font-semibold text-slate-700">
                    {files.map((file) => (
                      <tr key={file.filename} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{file.filename}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{formatBytes(file.size_bytes)}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{formatDate(file.created_at)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedFileToRestore(file.filename)}
                            disabled={restoring}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                          >
                            <RotateCcw size={10} /> Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historical Backup Logs */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setLogsTab('backup'); setLogsPage(1); }}
                  className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all flex items-center gap-1.5 ${
                    logsTab === 'backup'
                      ? 'border-brand-500 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <List size={13} /> Backup Execution Ledger
                </button>
                <button
                  onClick={() => { setLogsTab('restore'); setLogsPage(1); }}
                  className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all flex items-center gap-1.5 ${
                    logsTab === 'restore'
                      ? 'border-brand-500 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <RotateCcw size={12} /> Restore Logs
                </button>
              </div>
              <button
                onClick={() => fetchLogs()}
                disabled={logsLoading}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 transition-all hover:bg-slate-100 flex items-center justify-center"
                title="Refresh Logs List"
              >
                <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {logsLoading && logs.length === 0 ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-500" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                No backup records logged yet.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-[9px] uppercase font-black text-slate-450 tracking-wider">
                        <th className="py-2.5 px-4">Target File</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Size</th>
                        <th className="py-2.5 px-4">Execution Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10px] text-slate-650 font-semibold">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/20 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800 max-w-[150px] truncate" title={log.filename}>
                            {log.filename.startsWith("[RESTORE] ") ? log.filename.replace("[RESTORE] ", "") : log.filename}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${
                              log.status === 'success'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                : 'bg-rose-50 border-rose-100 text-rose-600'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500">
                            {log.filename.startsWith("[RESTORE] ") ? '—' : formatBytes(log.size_bytes)}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500">{formatDate(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <button
                    onClick={() => setLogsPage(prev => Math.max(prev - 1, 1))}
                    disabled={logsPage === 1 || logsLoading}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-650 hover:text-slate-800 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span>Page {logsPage}</span>
                  <button
                    onClick={() => setLogsPage(prev => prev + 1)}
                    disabled={logs.length < logsPerPage || logsLoading}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-650 hover:text-slate-800 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Double confirmation Modal overlay */}
      {selectedFileToRestore && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl relative animate-scaleUp text-center space-y-6">
            <div className="h-14 w-14 bg-rose-50 border border-rose-200 rounded-2xl mx-auto flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/5 font-black text-2xl animate-pulse">
              ⚠️
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">CRITICAL RESTORATION REQUEST</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                You are about to completely override the current database tables and system configurations with the historical backup snapshot:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-[10px] font-mono font-bold text-slate-800 truncate select-all">
                {selectedFileToRestore}
              </div>
            </div>

            <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl text-left space-y-2.5 text-[10px] text-rose-700 font-semibold leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Lock size={12} /> Data Override Safeguards
              </div>
              <p>
                1. This action drops all existing database tables instantly.
                <br />
                2. All campaigns, settings, contacts, lists, and billing logs will revert to this backup timestamp.
                <br />
                3. The platform will automatically enter maintenance mode to safeguard processes.
                {selectedFileToRestore?.includes('_full_') && (
                  <>
                    <br />
                    <strong className="text-rose-800">4. WARNING: This is a Full Website Backup. Restoring it will overwrite all active website code files and configuration variables with the archived version.</strong>
                  </>
                )}
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[9px] uppercase font-black text-slate-400">Type "RESTORE" to authorize this change</label>
              <input
                type="text"
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
                placeholder="RESTORE"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 font-black tracking-widest text-center"
              />
            </div>
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => { setSelectedFileToRestore(null); setRestoreConfirmText(''); }}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider transition-colors text-slate-500"
              >
                Cancel Action
              </button>
              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={restoreConfirmText !== 'RESTORE'}
                className="w-1/2 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-rose-500/15"
              >
                Proceed Restoration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live progress logs console modal */}
      {showRestoreConsole && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-955 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl relative flex flex-col space-y-4 max-h-[85vh]">
            
            {/* Console Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  {restoreStatus === 'running' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    restoreStatus === 'running' ? 'bg-emerald-500' :
                    restoreStatus === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}></span>
                </span>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-200">
                    System Restoration Console
                  </h4>
                  <p className="text-[8px] font-mono text-slate-500 truncate max-w-[320px]">
                    File: {restoringFilename}
                  </p>
                </div>
              </div>
              
              <div className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${
                restoreStatus === 'running' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 animate-pulse' :
                restoreStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {restoreStatus}
              </div>
            </div>

            {/* Console Body */}
            <div className="flex-1 bg-slate-900 border border-slate-850 rounded-2xl p-4 overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300 space-y-1.5 h-64 min-h-64 shadow-inner">
              {restoreLogs.map((log, idx) => {
                let colorClass = "text-slate-300";
                if (log.startsWith("[ERROR]")) {
                  colorClass = "text-rose-400 font-bold";
                } else if (log.startsWith("[SUCCESS]")) {
                  colorClass = "text-emerald-400 font-bold border-t border-emerald-800/40 pt-1.5 mt-1.5";
                } else if (log.startsWith(" -")) {
                  colorClass = "text-slate-400 pl-3";
                } else if (log.startsWith("[TIMEOUT]")) {
                  colorClass = "text-rose-500 font-bold";
                } else if (log.includes("[1/5]") || log.includes("[2/5]") || log.includes("[3/5]") || log.includes("[4/5]") || log.includes("[5/5]")) {
                  colorClass = "text-amber-400 font-semibold";
                }
                return (
                  <div key={idx} className={`${colorClass} whitespace-pre-wrap`}>
                    {log}
                  </div>
                );
              })}
              <div ref={consoleBottomRef} />
              {restoreStatus === 'running' && (
                <div className="text-emerald-400/60 animate-pulse flex items-center gap-1 font-semibold pt-1">
                  <span>●</span> <span>Waiting for next log entry...</span>
                </div>
              )}
            </div>

            {/* Warning under console */}
            {restoreStatus === 'running' && (
              <div className="p-3 bg-amber-950/20 border border-amber-800/20 rounded-xl text-[9px] text-amber-500 leading-relaxed font-semibold">
                ⚠️ Restoration override in progress. Do NOT refresh the page, shut down the server, or close Docker containers during this process.
              </div>
            )}

            {/* Console Footer */}
            <div className="pt-2 flex justify-end gap-3 border-t border-slate-900">
              <button
                type="button"
                disabled={restoreStatus === 'running'}
                onClick={() => {
                  setShowRestoreConsole(false);
                  if (restoreStatus === 'success') {
                    window.location.href = "/admin";
                  } else {
                    setRestoreStatus('idle');
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-md"
              >
                Close Console
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
