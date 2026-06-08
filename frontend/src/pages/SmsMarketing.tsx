import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { 
  MessageSquare, Plus, CheckCircle, AlertCircle, RefreshCw, 
  Sliders, Settings, ClipboardList, Info, Loader2, Send, Smartphone, Play,
  Users, UserPlus, FolderPlus, Trash2, List, X
} from 'lucide-react'

interface SMSCampaign {
  id: number;
  name: string;
  sender_id: string;
  message: string;
  total_recipients: number;
  sent_count: number;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  created_at: string;
}

interface SMSLog {
  id: number;
  timestamp: string;
  recipient: string;
  sender_id: string;
  message: string;
  status: 'delivered' | 'failed' | 'sent';
  response_code?: string;
  response_message?: string;
}

interface SMSNumber {
  id: number;
  phone_number: string;
  name?: string;
  group_id: number;
  created_at: string;
}

interface SMSGroup {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  numbers: SMSNumber[];
}

interface SmsMarketingProps {
  defaultTab?: 'campaigns' | 'templates' | 'numbers' | 'settings' | 'logs';
}

export default function SmsMarketing({ defaultTab = 'campaigns' }: SmsMarketingProps) {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'numbers' | 'settings' | 'logs'>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Lists & data states
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceCurrency, setBalanceCurrency] = useState('BDT');
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Settings Form States
  const [gatewayProvider, setGatewayProvider] = useState<'bulksmsbd' | 'twilio' | 'vonage' | 'custom'>('bulksmsbd');
  const [bulksmsbdKey, setBulksmsbdKey] = useState('');
  const [bulksmsbdSender, setBulksmsbdSender] = useState('');
  const [twilioKey, setTwilioKey] = useState('');
  const [twilioSender, setTwilioSender] = useState('');
  const [vonageKey, setVonageKey] = useState('');
  const [vonageSender, setVonageSender] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [customSender, setCustomSender] = useState('');
  const [gatewayStatus, setGatewayStatus] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);

  // Derived active keys
  const activeApiKey = gatewayProvider === 'bulksmsbd' ? bulksmsbdKey :
                       gatewayProvider === 'twilio' ? twilioKey :
                       gatewayProvider === 'vonage' ? vonageKey :
                       customKey;
  const activeSenderId = gatewayProvider === 'bulksmsbd' ? bulksmsbdSender :
                         gatewayProvider === 'twilio' ? twilioSender :
                         gatewayProvider === 'vonage' ? vonageSender :
                         customSender;

  // SMS Templates State
  interface SMSTemplate {
    id: number;
    title: string;
    body: string;
    created_at: string;
  }
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  // New Campaign Form State
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignMode, setCampaignMode] = useState<'single' | 'bulk'>('single');
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignSender, setNewCampaignSender] = useState('');
  const [newCampaignMessage, setNewCampaignMessage] = useState('');
  const [newCampaignRecipients, setNewCampaignRecipients] = useState('');
  const [selectedCampaignGroupId, setSelectedCampaignGroupId] = useState<number | ''>('');

  // Manage Numbers State
  const [groups, setGroups] = useState<SMSGroup[]>([]);
  const [numbers, setNumbers] = useState<SMSNumber[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [numbersLoading, setNumbersLoading] = useState(false);
  const [numbersSubTab, setNumbersSubTab] = useState<'numbers' | 'groups'>('numbers');

  // Create Group Modal & Form State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  // Add Number Modal & Form State
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [newNumberPhone, setNewNumberPhone] = useState('');
  const [newNumberName, setNewNumberName] = useState('');
  const [newNumberGroupId, setNewNumberGroupId] = useState<number | ''>('');

  // Loading & Notification states
  const [actionLoading, setActionLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Config
  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/sms-marketing/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGatewayProvider(data.provider || 'bulksmsbd');
        setGatewayStatus(data.is_active);

        // Populate specific provider states
        setBulksmsbdKey(data.bulksmsbd_api_key || (data.provider === 'bulksmsbd' ? data.api_key : '') || '');
        setBulksmsbdSender(data.bulksmsbd_sender_id || (data.provider === 'bulksmsbd' ? data.sender_id : '') || '');

        setTwilioKey(data.twilio_api_key || (data.provider === 'twilio' ? data.api_key : '') || '');
        setTwilioSender(data.twilio_sender_id || (data.provider === 'twilio' ? data.sender_id : '') || '');

        setVonageKey(data.vonage_api_key || (data.provider === 'vonage' ? data.api_key : '') || '');
        setVonageSender(data.vonage_sender_id || (data.provider === 'vonage' ? data.sender_id : '') || '');

        setCustomKey(data.custom_api_key || (data.provider === 'custom' ? data.api_key : '') || '');
        setCustomSender(data.custom_sender_id || (data.provider === 'custom' ? data.sender_id : '') || '');
      }
    } catch (err) {
      console.error("Failed to load SMS configuration", err);
    } finally {
      setConfigLoading(false);
    }
  };

  // Fetch Balance
  const fetchBalance = async () => {
    if (!token) return;
    setBalanceLoading(true);
    try {
      const res = await fetch('/api/sms-marketing/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setBalanceCurrency(data.currency || 'BDT');
      } else {
        setBalance(null);
      }
    } catch (err) {
      console.error(err);
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Fetch Campaigns
  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/sms-marketing/campaigns', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error("Failed to load SMS Campaigns", err);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) queryParams.append('search', search);

      const res = await fetch(`/api/sms-marketing/logs?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalLogs(data.total);
      }
    } catch (err) {
      console.error("Failed to load SMS Logs", err);
    }
  };

  // Fetch Groups
  const fetchGroups = async () => {
    if (!token) return;
    setGroupsLoading(true);
    try {
      const res = await fetch('/api/sms-marketing/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error("Failed to load SMS groups", err);
    } finally {
      setGroupsLoading(false);
    }
  };

  // Fetch Numbers
  const fetchNumbers = async () => {
    if (!token) return;
    setNumbersLoading(true);
    try {
      const res = await fetch('/api/sms-marketing/numbers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNumbers(data);
      }
    } catch (err) {
      console.error("Failed to load SMS numbers", err);
    } finally {
      setNumbersLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    if (token) {
      fetchConfig();
      fetchBalance();
      fetchCampaigns();
      fetchLogs();
      fetchGroups();
      fetchNumbers();
      fetchTemplates();
    }
  }, [token]);

  // Refetch logs or numbers/groups on tab change
  useEffect(() => {
    if (token) {
      if (activeTab === 'logs') {
        fetchLogs();
      } else if (activeTab === 'numbers') {
        fetchGroups();
        fetchNumbers();
      } else if (activeTab === 'templates') {
        fetchTemplates();
      }
    }
  }, [page, limit, search, activeTab]);

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFormSuccess(null);
    setFormError(null);

    try {
      const res = await fetch('/api/sms-marketing/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: gatewayProvider,
          api_key: activeApiKey,
          sender_id: activeSenderId,
          is_active: gatewayStatus,
          bulksmsbd_api_key: bulksmsbdKey,
          bulksmsbd_sender_id: bulksmsbdSender,
          twilio_api_key: twilioKey,
          twilio_sender_id: twilioSender,
          vonage_api_key: vonageKey,
          vonage_sender_id: vonageSender,
          custom_api_key: customKey,
          custom_sender_id: customSender
        })
      });

      if (res.ok) {
        setFormSuccess("SMS API configuration saved successfully!");
        fetchBalance();
      } else {
        const err = await res.json();
        setFormError(err.detail || "Failed to save configuration.");
      }
    } catch (err) {
      setFormError("Network communication error.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Send Test SMS
  const [testNumber, setTestNumber] = useState('');
  const [testMsg, setTestMsg] = useState('Your SmartCampaign OTP is 5928');
  const [testMsgLoading, setTestMsgLoading] = useState(false);
  
  const handleSendTestSMS = async () => {
    if (!testNumber) {
      alert("Please enter a recipient phone number.");
      return;
    }
    setTestMsgLoading(true);
    try {
      const res = await fetch('/api/sms-marketing/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient: testNumber,
          message: testMsg,
          api_key: activeApiKey,
          sender_id: activeSenderId,
          provider: gatewayProvider
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message || "Test SMS submitted successfully!");
        fetchBalance();
        fetchLogs();
      } else {
        alert(data.message || "Failed to submit test SMS.");
      }
    } catch (err) {
      alert("Network error sending test SMS.");
    } finally {
      setTestMsgLoading(false);
    }
  };

  // Handle Create/Dispatch Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = campaignMode === 'single'
      ? `Single SMS to ${newCampaignRecipients.trim()}`
      : newCampaignName.trim();

    if (!finalName || !newCampaignMessage.trim() || !newCampaignRecipients.trim()) {
      alert("Please fill all required fields.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/sms-marketing/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: finalName,
          sender_id: newCampaignSender,
          message: newCampaignMessage,
          recipients: newCampaignRecipients
        })
      });

      if (res.ok) {
        alert(campaignMode === 'single' ? "SMS sent successfully!" : "SMS Campaign created and dispatched successfully!");
        setShowCampaignModal(false);
        setNewCampaignName('');
        setNewCampaignSender('');
        setNewCampaignMessage('');
        setNewCampaignRecipients('');
        setSelectedCampaignGroupId('');
        setCampaignMode('single');
        fetchCampaigns();
        fetchLogs();
        fetchBalance();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to dispatch campaign.");
      }
    } catch (err) {
      alert("Network error dispatching campaign.");
    } finally {
      setActionLoading(false);
    }
  };

  // Create SMS Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert("Group name is required.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/sms-marketing/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription.trim() || null
        })
      });
      if (res.ok) {
        setShowGroupModal(false);
        setNewGroupName('');
        setNewGroupDescription('');
        await fetchGroups();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to create SMS group.");
      }
    } catch (err) {
      alert("Network error creating SMS group.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete SMS Group
  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm("Are you sure you want to delete this group? All phone numbers inside it will also be deleted.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sms-marketing/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchGroups();
        await fetchNumbers();
      } else {
        alert("Failed to delete SMS group.");
      }
    } catch (err) {
      alert("Network error deleting SMS group.");
    } finally {
      setActionLoading(false);
    }
  };

  // Add SMS Phone Number
  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumberPhone.trim() || !newNumberGroupId) {
      alert("Phone number and Group selection are required.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/sms-marketing/numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone_number: newNumberPhone,
          name: newNumberName.trim() || null,
          group_id: Number(newNumberGroupId)
        })
      });
      if (res.ok) {
        setShowNumberModal(false);
        setNewNumberPhone('');
        setNewNumberName('');
        setNewNumberGroupId('');
        await fetchNumbers();
        await fetchGroups(); // Reload groups to update numbers count
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to add phone number.");
      }
    } catch (err) {
      alert("Network error adding phone number.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete SMS Phone Number
  const handleDeleteNumber = async (numberId: number) => {
    if (!confirm("Are you sure you want to delete this phone number?")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sms-marketing/numbers/${numberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchNumbers();
        await fetchGroups(); // Reload groups to update numbers count
      } else {
        alert("Failed to delete phone number.");
      }
    } catch (err) {
      alert("Network error deleting phone number.");
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch SMS Templates
  const fetchTemplates = async () => {
    if (!token) return;
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/sms-marketing/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("Failed to load SMS templates", err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Save SMS Template (Create or Update)
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim() || !templateBody.trim()) {
      alert("Title and Body are required.");
      return;
    }
    setActionLoading(true);
    try {
      const url = editingTemplateId 
        ? `/api/sms-marketing/templates/${editingTemplateId}`
        : '/api/sms-marketing/templates';
      const method = editingTemplateId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: templateTitle.trim(),
          body: templateBody.trim()
        })
      });
      if (res.ok) {
        setShowTemplateModal(false);
        setTemplateTitle('');
        setTemplateBody('');
        setEditingTemplateId(null);
        await fetchTemplates();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to save template.");
      }
    } catch (err) {
      alert("Network error saving template.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete SMS Template
  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm("Are you sure you want to delete this SMS template?")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sms-marketing/templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchTemplates();
      } else {
        alert("Failed to delete template.");
      }
    } catch (err) {
      alert("Network error deleting template.");
    } finally {
      setActionLoading(false);
    }
  };

  // Parse comma-separated sender IDs from settings
  const senderList = activeSenderId
    ? activeSenderId.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <>
      <div className="space-y-4 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="py-5 px-6 brand-gradient-bg rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-white shadow-xl shadow-brand-500/10">
        <div>
          <h2 className="text-lg font-black tracking-wide flex items-center gap-2 force-text-white">
            <MessageSquare size={22} className="force-text-white" />
            <span>SMS MARKETING SUITE</span>
          </h2>
          <p className="text-xs force-text-brand-100 font-medium mt-1">
            Dispatch bulk text campaigns, configure SMS API Gateways, and view SMS delivery statistics.
          </p>
        </div>

        {/* Live Balance Card */}
        <div className="bg-dark-950/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-3 shrink-0">
          <div>
            <span className="text-[9px] font-black uppercase force-text-brand-200 tracking-wider">SMS API Balance</span>
            <p className="text-sm font-black force-text-white mt-px flex items-center gap-1.5">
              {balanceLoading ? (
                <Loader2 size={12} className="animate-spin force-text-white" />
              ) : (
                <span>{balance !== null ? `${balance} ${balanceCurrency}` : 'Not Configured'}</span>
              )}
            </p>
          </div>
          <button 
            onClick={fetchBalance}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
            title="Refresh Balance"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-dark-700/60 pb-px">
        <div className="flex space-x-1 p-1 bg-dark-900/60 rounded-xl border border-dark-800">
          <button
            onClick={() => { setActiveTab('campaigns'); navigate('/sms-marketing'); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'campaigns'
                ? 'brand-gradient-bg text-white shadow-md shadow-brand-500/10'
                : 'text-dark-400 hover:text-dark-100 dark:hover:text-white'
            }`}
          >
            SMS Campaigns
          </button>
          <button
            onClick={() => { setActiveTab('templates'); navigate('/sms-marketing/templates'); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'templates'
                ? 'brand-gradient-bg text-white shadow-md shadow-brand-500/10'
                : 'text-dark-400 hover:text-dark-100 dark:hover:text-white'
            }`}
          >
            SMS Templates
          </button>
          <button
            onClick={() => { setActiveTab('numbers'); navigate('/sms-marketing/numbers'); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'numbers'
                ? 'brand-gradient-bg text-white shadow-md shadow-brand-500/10'
                : 'text-dark-400 hover:text-dark-100 dark:hover:text-white'
            }`}
          >
            Manage Numbers
          </button>
          <button
            onClick={() => { setActiveTab('settings'); navigate('/sms-marketing/settings'); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'settings'
                ? 'brand-gradient-bg text-white shadow-md shadow-brand-500/10'
                : 'text-dark-400 hover:text-dark-100 dark:hover:text-white'
            }`}
          >
            SMS API Settings
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'logs'
                ? 'brand-gradient-bg text-white shadow-md shadow-brand-500/10'
                : 'text-dark-400 hover:text-dark-100 dark:hover:text-white'
            }`}
          >
            SMS Delivery Logs
          </button>
        </div>
      </div>

      {/* SMS Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={14} className="text-brand-400" />
              <span>SMS Campaigns Pool ({campaigns.length})</span>
            </h3>
            <button
              onClick={() => {
                setShowCampaignModal(true);
                const list = activeSenderId ? activeSenderId.split(',').map(s => s.trim()).filter(Boolean) : [];
                setNewCampaignSender(list.length > 0 ? list[0] : '');
              }}
              className="flex items-center gap-1 px-3 py-2 brand-gradient-bg hover:opacity-95 text-white rounded-lg text-[10px] font-bold shadow-md shadow-brand-500/15 transition-all"
            >
              <Plus size={12} />
              <span>CREATE SMS CAMPAIGN</span>
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-xl border border-dark-700/30">
              <MessageSquare className="h-8 w-8 text-dark-500 mx-auto mb-2" />
              <p className="text-xs text-dark-400 font-semibold">No SMS Campaigns found.</p>
            </div>
          ) : (
            <div className="glass-panel rounded-xl overflow-hidden border border-dark-700/30">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                  <thead className="bg-dark-900/60 border-b border-dark-800 text-[10px] font-black uppercase text-dark-400 tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Campaign Name</th>
                      <th className="px-4 py-3">Sender ID</th>
                      <th className="px-4 py-3">Message Preview</th>
                      <th className="px-4 py-3 text-center">Delivered</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-850/60">
                    {campaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-dark-900/30 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-white">{camp.name}</td>
                        <td className="px-4 py-3.5 text-dark-200 font-semibold">{camp.sender_id}</td>
                        <td className="px-4 py-3.5 text-dark-300 max-w-xs truncate" title={camp.message}>
                          {camp.message}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-white">
                          {camp.sent_count} / {camp.total_recipients}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            camp.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-dark-800 text-dark-400'
                          }`}>
                            {camp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-dark-400">
                          {new Date(camp.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SMS Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList size={14} className="text-brand-400" />
              <span>SMS Templates Pool ({templates.length})</span>
            </h3>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search templates..."
                className="bg-dark-900 border border-dark-750 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-1.5 text-xs outline-none text-white transition-all w-full sm:w-64"
              />
              <button
                onClick={() => {
                  setEditingTemplateId(null);
                  setTemplateTitle('');
                  setTemplateBody('');
                  setShowTemplateModal(true);
                }}
                className="flex items-center gap-1 px-3 py-2 brand-gradient-bg hover:opacity-95 text-white rounded-lg text-[10px] font-bold shadow-md shadow-brand-500/15 transition-all shrink-0"
              >
                <Plus size={12} />
                <span>CREATE TEMPLATE</span>
              </button>
            </div>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin text-brand-400" size={24} />
            </div>
          ) : templates.filter(t => t.title.toLowerCase().includes(templateSearch.toLowerCase()) || t.body.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-xl border border-dark-700/30">
              <ClipboardList className="h-8 w-8 text-dark-500 mx-auto mb-2" />
              <p className="text-xs text-dark-400 font-semibold">No SMS Templates found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates
                .filter(t => t.title.toLowerCase().includes(templateSearch.toLowerCase()) || t.body.toLowerCase().includes(templateSearch.toLowerCase()))
                .map((tmpl) => (
                  <div key={tmpl.id} className="glass-panel p-5 rounded-2xl border border-dark-750/30 flex flex-col justify-between space-y-3 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-brand-500/10 group-hover:bg-brand-500 transition-colors" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white line-clamp-1">{tmpl.title}</h4>
                      <p className="text-[11px] text-dark-300 line-clamp-4 leading-normal bg-dark-950/20 p-2.5 rounded-lg border border-dark-850/50 font-mono" title={tmpl.body}>
                        {tmpl.body}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-dark-800 text-[9px] text-dark-450 font-bold uppercase tracking-wider">
                      <span>{new Date(tmpl.created_at).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingTemplateId(tmpl.id);
                            setTemplateTitle(tmpl.title);
                            setTemplateBody(tmpl.body);
                            setShowTemplateModal(true);
                          }}
                          className="px-2 py-1 bg-brand-500/10 hover:bg-brand-500/25 border border-brand-500/10 hover:border-brand-500/30 rounded-lg text-brand-400 hover:text-brand-300 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/10 hover:border-rose-500/30 rounded-lg text-rose-455 hover:text-rose-400 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Manage Numbers Tab */}
      {activeTab === 'numbers' && (
        <div className="space-y-4">
          {/* Sub-tabs menu */}
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex space-x-1 p-1 bg-dark-900/60 rounded-xl border border-dark-800">
              <button
                onClick={() => setNumbersSubTab('numbers')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                  numbersSubTab === 'numbers'
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm'
                    : 'text-dark-400 hover:text-dark-100 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <List size={12} />
                  <span>Number List ({numbers.length})</span>
                </span>
              </button>
              <button
                onClick={() => setNumbersSubTab('groups')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                  numbersSubTab === 'groups'
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm'
                    : 'text-dark-400 hover:text-dark-100 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Users size={12} />
                  <span>Group List ({groups.length})</span>
                </span>
              </button>
            </div>

            {numbersSubTab === 'numbers' ? (
              <button
                onClick={() => setShowNumberModal(true)}
                className="flex items-center gap-1 px-3 py-2 brand-gradient-bg hover:opacity-95 text-white rounded-lg text-[10px] font-bold shadow-md shadow-brand-500/15 transition-all"
              >
                <UserPlus size={12} />
                <span>ADD PHONE NUMBER</span>
              </button>
            ) : (
              <button
                onClick={() => setShowGroupModal(true)}
                className="flex items-center gap-1 px-3 py-2 brand-gradient-bg hover:opacity-95 text-white rounded-lg text-[10px] font-bold shadow-md shadow-brand-500/15 transition-all"
              >
                <FolderPlus size={12} />
                <span>CREATE GROUP</span>
              </button>
            )}
          </div>

          {/* Sub Tab Content: Numbers List */}
          {numbersSubTab === 'numbers' && (
            numbersLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-brand-400" size={24} />
              </div>
            ) : numbers.length === 0 ? (
              <div className="glass-panel p-8 text-center rounded-xl border border-dark-700/30">
                <Smartphone className="h-8 w-8 text-dark-500 mx-auto mb-2" />
                <p className="text-xs text-dark-400 font-semibold">No phone numbers found. Click "Add Phone Number" to start.</p>
              </div>
            ) : (
              <div className="glass-panel rounded-xl overflow-hidden border border-dark-700/30">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-left text-xs">
                    <thead className="bg-dark-900/60 border-b border-dark-800 text-[10px] font-black uppercase text-dark-400 tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Phone Number</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Group</th>
                        <th className="px-4 py-3">Date Added</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-850/60 text-dark-200">
                      {numbers.map((num) => {
                        const groupName = groups.find(g => g.id === num.group_id)?.name || 'Unknown Group';
                        return (
                          <tr key={num.id} className="hover:bg-dark-900/30 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-white">{num.phone_number}</td>
                            <td className="px-4 py-3 font-semibold">{num.name || <span className="text-dark-500 italic">No Name</span>}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[9px] bg-brand-500/10 text-brand-400 border border-brand-500/10 font-bold">
                                {groupName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-dark-450">
                              {new Date(num.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteNumber(num.id)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/10 hover:border-rose-500/30 rounded-lg text-rose-455 hover:text-rose-400 transition-all"
                                title="Delete Number"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Sub Tab Content: Groups List */}
          {numbersSubTab === 'groups' && (
            groupsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-brand-400" size={24} />
              </div>
            ) : groups.length === 0 ? (
              <div className="glass-panel p-8 text-center rounded-xl border border-dark-700/30">
                <Users className="h-8 w-8 text-dark-500 mx-auto mb-2" />
                <p className="text-xs text-dark-400 font-semibold">No groups found. Click "Create Group" to start.</p>
              </div>
            ) : (
              <div className="glass-panel rounded-xl overflow-hidden border border-dark-700/30">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-left text-xs">
                    <thead className="bg-dark-900/60 border-b border-dark-800 text-[10px] font-black uppercase text-dark-400 tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Group Name</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-center">Numbers Count</th>
                        <th className="px-4 py-3">Created At</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-850/60 text-dark-200">
                      {groups.map((grp) => (
                        <tr key={grp.id} className="hover:bg-dark-900/30 transition-colors">
                          <td className="px-4 py-3 font-bold text-white">{grp.name}</td>
                          <td className="px-4 py-3 max-w-xs truncate" title={grp.description}>
                            {grp.description || <span className="text-dark-500 italic">No description</span>}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-brand-400">
                            {grp.numbers?.length || 0}
                          </td>
                          <td className="px-4 py-3 text-dark-450">
                            {new Date(grp.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteGroup(grp.id)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/10 hover:border-rose-500/30 rounded-lg text-rose-455 hover:text-rose-400 transition-all"
                              title="Delete Group"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* SMS API Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Settings Form Panel */}
          <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-dark-750/30 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-dark-800 pb-3">
              <Sliders size={14} className="text-brand-400" />
              <span>SMS API Settings configuration</span>
            </h3>

            {formSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-[11px] font-bold flex items-center gap-2">
                <CheckCircle size={14} />
                <span>{formSuccess}</span>
              </div>
            )}

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-[11px] font-bold flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            )}

            {configLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-brand-400" size={24} />
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">SMS Gateway Provider</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setGatewayProvider('bulksmsbd')}
                      className={`py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        gatewayProvider === 'bulksmsbd'
                          ? 'brand-gradient-bg text-white border-transparent shadow-md shadow-brand-500/10'
                          : 'bg-dark-900 border-dark-750 text-dark-300 hover:text-dark-100 dark:hover:text-white hover:bg-dark-850 dark:hover:bg-dark-800'
                      }`}
                    >
                      BulkSMSBD
                    </button>
                    <button
                      type="button"
                      onClick={() => setGatewayProvider('twilio')}
                      className={`py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        gatewayProvider === 'twilio'
                          ? 'brand-gradient-bg text-white border-transparent shadow-md shadow-brand-500/10'
                          : 'bg-dark-900 border-dark-750 text-dark-300 hover:text-dark-100 dark:hover:text-white hover:bg-dark-850 dark:hover:bg-dark-800'
                      }`}
                    >
                      Twilio
                    </button>
                    <button
                      type="button"
                      onClick={() => setGatewayProvider('vonage')}
                      className={`py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        gatewayProvider === 'vonage'
                          ? 'brand-gradient-bg text-white border-transparent shadow-md shadow-brand-500/10'
                          : 'bg-dark-900 border-dark-750 text-dark-300 hover:text-dark-100 dark:hover:text-white hover:bg-dark-850 dark:hover:bg-dark-800'
                      }`}
                    >
                      Vonage
                    </button>
                    <button
                      type="button"
                      onClick={() => setGatewayProvider('custom')}
                      className={`py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        gatewayProvider === 'custom'
                          ? 'brand-gradient-bg text-white border-transparent shadow-md shadow-brand-500/10'
                          : 'bg-dark-900 border-dark-750 text-dark-300 hover:text-dark-100 dark:hover:text-white hover:bg-dark-850 dark:hover:bg-dark-800'
                      }`}
                    >
                      Custom API
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                    {gatewayProvider === 'bulksmsbd' ? 'BulkSMSBD API Key' : 'Account SID / API Key'}
                  </label>
                  <input
                    type="text"
                    value={activeApiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (gatewayProvider === 'bulksmsbd') setBulksmsbdKey(val);
                      else if (gatewayProvider === 'twilio') setTwilioKey(val);
                      else if (gatewayProvider === 'vonage') setVonageKey(val);
                      else setCustomKey(val);
                    }}
                    placeholder={gatewayProvider === 'bulksmsbd' ? "e.g. IQz2Gpd7Du1LNgfF0AVJ" : "Enter API Key / SID"}
                    className="w-full bg-dark-900 border border-dark-750 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-white transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                    {gatewayProvider === 'bulksmsbd' ? 'Approved Sender ID(s) (Comma-separated)' : 'Sender Phone Number(s) (Comma-separated)'}
                  </label>
                  <input
                    type="text"
                    value={activeSenderId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (gatewayProvider === 'bulksmsbd') setBulksmsbdSender(val);
                      else if (gatewayProvider === 'twilio') setTwilioSender(val);
                      else if (gatewayProvider === 'vonage') setVonageSender(val);
                      else setCustomSender(val);
                    }}
                    placeholder={gatewayProvider === 'bulksmsbd' ? "e.g. 8809617623864, BrandName" : "e.g. +1234567890, +1987654321"}
                    className="w-full bg-dark-900 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    id="gatewayStatus"
                    checked={gatewayStatus}
                    onChange={(e) => setGatewayStatus(e.target.checked)}
                    className="h-4 w-4 bg-dark-900 border border-dark-750 text-brand-500 rounded focus:ring-brand-500 focus:ring-1"
                  />
                  <label htmlFor="gatewayStatus" className="text-dark-300 font-bold select-none cursor-pointer">
                    Activate this SMS Gateway API Provider immediately
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 brand-gradient-bg hover:opacity-95 text-white rounded-xl font-bold shadow-md shadow-brand-500/10 transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Settings size={13} />}
                  <span>SAVE SMS API CONFIGURATION</span>
                </button>
              </form>
            )}
          </div>

          {/* Test & Information Side Panel */}
          <div className="space-y-4">
            {/* Quick Test Connection */}
            <div className="glass-panel p-5 rounded-2xl border border-dark-750/30 space-y-3">
              <h4 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1">
                <Play size={12} className="text-brand-400" />
                <span>Test SMS Dispatcher</span>
              </h4>
              <p className="text-[10px] text-dark-400 font-semibold leading-relaxed">
                Test your gateway setup instantly by sending a mock transaction text message.
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-dark-500 uppercase tracking-wider">Test Recipient Number</label>
                  <input
                    type="text"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="Recipient Number (e.g. 88017...)"
                    className="w-full bg-dark-900 border border-dark-750 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2 outline-none font-medium text-white transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-dark-500 uppercase tracking-wider">Test Message Body</label>
                  <input
                    type="text"
                    value={testMsg}
                    onChange={(e) => setTestMsg(e.target.value)}
                    placeholder="Enter message body"
                    className="w-full bg-dark-900 border border-dark-750 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2 outline-none font-medium text-white transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendTestSMS}
                  disabled={testMsgLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-xl text-[10px] font-bold border border-emerald-500/20 hover:border-emerald-500/40 shadow-sm shadow-emerald-500/5 transition-all duration-200 disabled:opacity-50"
                >
                  {testMsgLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  <span>DISPATCH TEST SMS</span>
                </button>
              </div>
            </div>

            {/* Gateway Guidelines */}
            <div className="glass-panel p-5 rounded-2xl border border-dark-750/30 space-y-2.5">
              <h4 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1">
                <Info size={12} className="text-brand-400" />
                <span>BulkSMSBD Guidelines</span>
              </h4>
              <ul className="text-[10px] text-dark-300 font-semibold space-y-2 leading-relaxed list-disc list-inside">
                <li>Submit recipient numbers starting with the country code <code className="text-brand-400 font-bold font-mono">880</code> (e.g. 88017xxxxxxxx).</li>
                <li>Make sure to purchase credits from bulksmsbd.net and request whitelist status if needed.</li>
                <li>Use URL safe message formatting. Our backend handles parameter encoding automatically.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SMS Delivery Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList size={14} className="text-brand-400" />
              <span>SMS Delivery Logs ({totalLogs})</span>
            </h3>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search recipient or message..."
              className="bg-dark-900 border border-dark-750 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-1.5 text-xs outline-none text-white transition-all w-full sm:w-64"
            />
          </div>

          {logs.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-xl border border-dark-700/30">
              <ClipboardList className="h-8 w-8 text-dark-500 mx-auto mb-2" />
              <p className="text-xs text-dark-400 font-semibold">No logs matching search criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass-panel rounded-xl overflow-hidden border border-dark-700/30">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                    <thead className="bg-dark-900/60 border-b border-dark-800 text-[10px] font-black uppercase text-dark-400 tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Sender ID</th>
                        <th className="px-4 py-3">Message Body</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Response Code / Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-850/60">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-dark-900/30 transition-colors">
                          <td className="px-4 py-3.5 text-dark-450">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-white">{log.recipient}</td>
                          <td className="px-4 py-3.5 text-dark-200 font-semibold">{log.sender_id}</td>
                          <td className="px-4 py-3.5 text-dark-300 max-w-xs truncate" title={log.message}>
                            {log.message}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              log.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-dark-400">
                            {log.response_code ? `[${log.response_code}] ${log.response_message || ''}` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Controls */}
              {totalLogs > limit && (
                <div className="flex justify-between items-center bg-dark-900/40 p-3.5 border border-dark-800 rounded-xl">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 bg-dark-800 hover:bg-dark-750 text-white rounded-lg disabled:opacity-40 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider">
                    Page {page} of {Math.ceil(totalLogs / limit)}
                  </span>
                  <button
                    disabled={page >= Math.ceil(totalLogs / limit)}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 bg-dark-800 hover:bg-dark-750 text-white rounded-lg disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Create SMS Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700/50 max-w-lg w-full rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] text-xs animate-scaleUp overflow-hidden">
            {/* Accent stripe at top */}
            <div className="absolute top-0 left-0 right-0 h-[4px] brand-gradient-bg shrink-0" />

            {/* Fixed Header */}
            <div className="flex justify-between items-center border-b border-slate-200/80 dark:border-slate-800/50 px-6 py-4 mt-1 shrink-0">
              <div className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                {campaignMode === 'single' ? 'Send Single SMS' : 'Create Bulk SMS Campaign'}
              </div>
              <button 
                onClick={() => setShowCampaignModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800/30 rounded-lg transition-colors shrink-0"
                title="Close modal"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Campaign Mode Switcher (Fixed) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-dark-950/45 rounded-xl border border-dark-700/35 shrink-0 mx-6 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCampaignMode('single');
                    setNewCampaignName('');
                    setNewCampaignRecipients('');
                    setSelectedCampaignGroupId('');
                  }}
                  className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center border ${
                    campaignMode === 'single'
                      ? 'bg-brand-500/10 text-brand-400 border-brand-500/20 shadow-sm font-bold'
                      : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/20 border-transparent'
                  }`}
                >
                  Single SMS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCampaignMode('bulk');
                    setNewCampaignName('');
                    setNewCampaignRecipients('');
                    setSelectedCampaignGroupId('');
                  }}
                  className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center border ${
                    campaignMode === 'bulk'
                      ? 'bg-brand-500/10 text-brand-400 border-brand-500/20 shadow-sm font-bold'
                      : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/20 border-transparent'
                  }`}
                >
                  Bulk SMS
                </button>
              </div>

              {/* Scrollable Fields Wrapper */}
              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 px-6 py-4 pr-3.5 scrollbar-thin">
                {campaignMode === 'bulk' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Campaign Name *</label>
                    <input
                      type="text"
                      required
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      placeholder="e.g. Eid Discount SMS Campaign"
                      className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 placeholder:text-dark-450 transition-all"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Sender ID (Approved Masking / Number) *</label>
                  <select
                    required
                    value={newCampaignSender}
                    onChange={(e) => setNewCampaignSender(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 transition-all cursor-pointer"
                  >
                    <option value="">-- Select Sender ID --</option>
                    {senderList.map((sid) => (
                      <option key={sid} value={sid}>
                        {sid}
                      </option>
                    ))}
                  </select>
                  {senderList.length === 0 && (
                    <p className="text-[9px] text-rose-455 font-bold mt-1">
                      No approved Sender ID configured in Settings. Please set one up first!
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Load SMS Template (Optional)</label>
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const selectedTmpl = templates.find(t => t.id === Number(val));
                        if (selectedTmpl) {
                          setNewCampaignMessage(selectedTmpl.body);
                        }
                      }
                    }}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 transition-all cursor-pointer"
                  >
                    <option value="">-- Choose Template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={newCampaignMessage}
                    onChange={(e) => setNewCampaignMessage(e.target.value)}
                    placeholder="Type your SMS content here... (For Masking, Bengali character limit applies)"
                    className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 placeholder:text-dark-455 transition-all leading-normal"
                  />
                  <span className="text-[9px] text-dark-450 font-bold block text-right">
                    Characters: {newCampaignMessage.length} | Parts: {Math.ceil(newCampaignMessage.length / 160) || 1}
                  </span>
                </div>

                {campaignMode === 'bulk' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Select Recipient Group (Optional)</label>
                    <select
                      value={selectedCampaignGroupId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCampaignGroupId(val ? Number(val) : '');
                        if (val) {
                          const selectedGroup = groups.find(g => g.id === Number(val));
                          if (selectedGroup && selectedGroup.numbers) {
                            const phoneNumbers = selectedGroup.numbers.map(n => n.phone_number).join(', ');
                            setNewCampaignRecipients(phoneNumbers);
                          } else {
                            setNewCampaignRecipients('');
                          }
                        } else {
                          setNewCampaignRecipients('');
                        }
                      }}
                      className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 transition-all cursor-pointer"
                    >
                      <option value="">-- Manual Comma-separated Entries --</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.numbers?.length || 0} numbers)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                    {campaignMode === 'single' ? 'Recipient Mobile Number *' : 'Recipients (Comma-separated numbers starting with country code, e.g. 88017...) *'}
                  </label>
                  {campaignMode === 'single' ? (
                    <input
                      type="text"
                      required
                      value={newCampaignRecipients}
                      onChange={(e) => setNewCampaignRecipients(e.target.value)}
                      placeholder="e.g. 8801700000000"
                      className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 placeholder:text-dark-450 transition-all font-mono"
                    />
                  ) : (
                    <textarea
                      required
                      rows={3}
                      value={newCampaignRecipients}
                      onChange={(e) => setNewCampaignRecipients(e.target.value)}
                      placeholder="e.g. 8801700000001, 8801800000002"
                      className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 placeholder:text-dark-450 transition-all leading-normal font-mono"
                    />
                  )}
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-dark-700/20 bg-dark-950/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 bg-dark-950 hover:bg-dark-900 border border-dark-700/60 rounded-xl text-dark-300 hover:text-dark-100 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 brand-gradient-bg hover:opacity-95 text-white rounded-xl font-bold shadow-md shadow-brand-500/10 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 size={12} className="animate-spin" />}
                  <span>{campaignMode === 'single' ? 'Send SMS' : 'Dispatch Campaign'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700/50 max-w-md w-full p-5 rounded-2xl shadow-2xl relative space-y-4 text-xs animate-scaleUp overflow-hidden">
            {/* Accent stripe at top */}
            <div className="absolute top-0 left-0 right-0 h-[3px] brand-gradient-bg" />

            <div className="flex justify-between items-center border-b border-dark-700/20 pb-3 mt-1">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-dark-100 font-sans">Create SMS Group</h3>
              <button 
                onClick={() => setShowGroupModal(false)}
                className="text-dark-400 hover:text-dark-200 p-1.5 hover:bg-dark-800/30 rounded-lg transition-colors"
                title="Close modal"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Group Name *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. VIP Customers"
                  className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 placeholder:text-dark-450 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Describe the target audience for this contact list group..."
                  className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 placeholder:text-dark-455 transition-all leading-normal"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2.5 border-t border-dark-700/20">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="px-4 py-2 bg-dark-950 hover:bg-dark-900 border border-dark-700/60 rounded-xl text-dark-300 hover:text-dark-100 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 brand-gradient-bg hover:opacity-95 text-white rounded-xl font-bold shadow-md shadow-brand-500/10 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 size={12} className="animate-spin" />}
                  <span>Create Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Phone Number Modal */}
      {showNumberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700/50 max-w-md w-full p-5 rounded-2xl shadow-2xl relative space-y-4 text-xs animate-scaleUp overflow-hidden">
            {/* Accent stripe at top */}
            <div className="absolute top-0 left-0 right-0 h-[3px] brand-gradient-bg" />

            <div className="flex justify-between items-center border-b border-dark-700/20 pb-3 mt-1">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-dark-100 font-sans">Add Phone Number</h3>
              <button 
                onClick={() => setShowNumberModal(false)}
                className="text-dark-400 hover:text-dark-200 p-1.5 hover:bg-dark-800/30 rounded-lg transition-colors"
                title="Close modal"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddNumber} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newNumberPhone}
                  onChange={(e) => setNewNumberPhone(e.target.value)}
                  placeholder="e.g. 8801700000000"
                  className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 placeholder:text-dark-450 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Contact Name (Optional)</label>
                <input
                  type="text"
                  value={newNumberName}
                  onChange={(e) => setNewNumberName(e.target.value)}
                  placeholder="e.g. Abdur Razzak"
                  className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 placeholder:text-dark-450 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Select SMS Group *</label>
                <select
                  required
                  value={newNumberGroupId}
                  onChange={(e) => setNewNumberGroupId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 transition-all cursor-pointer"
                >
                  <option value="">-- Choose Group --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                {groups.length === 0 && (
                  <p className="text-[10px] text-rose-455 font-semibold mt-1">
                    Please create an SMS Group first!
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2.5 border-t border-dark-700/20">
                <button
                  type="button"
                  onClick={() => setShowNumberModal(false)}
                  className="px-4 py-2 bg-dark-950 hover:bg-dark-900 border border-dark-700/60 rounded-xl text-dark-300 hover:text-dark-100 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newNumberGroupId}
                  className="px-4 py-2 brand-gradient-bg hover:opacity-95 text-white rounded-xl font-bold shadow-md shadow-brand-500/10 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 size={12} className="animate-spin" />}
                  <span>Add Contact</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create/Edit SMS Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700/50 max-w-md w-full p-5 rounded-2xl shadow-2xl relative space-y-4 text-xs animate-scaleUp overflow-hidden">
            {/* Accent stripe at top */}
            <div className="absolute top-0 left-0 right-0 h-[3px] brand-gradient-bg" />

            <div className="flex justify-between items-center border-b border-dark-700/20 pb-3 mt-1">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-dark-100 font-sans">
                {editingTemplateId ? 'Edit SMS Template' : 'Create SMS Template'}
              </h3>
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="text-dark-400 hover:text-dark-200 p-1.5 hover:bg-dark-800/30 rounded-lg transition-colors"
                title="Close modal"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Template Title *</label>
                <input
                  type="text"
                  required
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="e.g. OTP Message, Marketing Offer"
                  className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 placeholder:text-dark-450 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Template Content *</label>
                <textarea
                  required
                  rows={5}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="Type your SMS template message content here..."
                  className="w-full bg-dark-950 border border-dark-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-3 py-2.5 outline-none font-medium text-dark-100 placeholder:text-dark-455 transition-all leading-normal"
                />
                <span className="text-[9px] text-dark-450 font-bold block text-right">
                  Characters: {templateBody.length} | Parts: {Math.ceil(templateBody.length / 160) || 1}
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-2.5 border-t border-dark-700/20">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 bg-dark-950 hover:bg-dark-900 border border-dark-700/60 rounded-xl text-dark-300 hover:text-dark-100 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 brand-gradient-bg hover:opacity-95 text-white rounded-xl font-bold shadow-md shadow-brand-500/10 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 size={12} className="animate-spin" />}
                  <span>{editingTemplateId ? 'Save Changes' : 'Create Template'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
