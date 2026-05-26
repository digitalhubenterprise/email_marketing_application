import React, { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { 
  Users, Plus, Trash2, Upload, ArrowLeft, Mail, 
  CheckCircle, AlertCircle, UserPlus, UserCheck, 
  FileText, Search, User, Filter, RefreshCw, Sparkles
} from 'lucide-react'

interface ContactList {
  id: number;
  name: string;
  description: string;
  created_at: string;
  contacts_count: number;
}

interface Contact {
  id: number;
  email: string;
  name: string;
  tags: string;
  is_unsubscribed: boolean;
  created_at: string;
}

export default function ContactLists() {
  const { token } = useAuth();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // New List Fields
  const [listName, setListName] = useState("");
  const [listDesc, setListDesc] = useState("");
  const [creatingList, setCreatingList] = useState(false);

  // New Contact Fields
  const [conName, setConName] = useState("");
  const [conEmail, setConEmail] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  // CSV Upload Fields
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Search & Filters inside contacts
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, unsubscribed

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/contacts/lists", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLists(false);
    }
  };

  const fetchContacts = async (listId: number) => {
    setLoadingContacts(true);
    try {
      const res = await fetch(`/api/contacts/lists/${listId}/contacts`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [token]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingList(true);
    try {
      const res = await fetch("/api/contacts/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: listName, description: listDesc })
      });
      if (res.ok) {
        setListName("");
        setListDesc("");
        await fetchLists();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingList(false);
    }
  };

  const handleDeleteList = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deleting this mailing list will delete all contacts inside it. Are you sure?")) return;
    try {
      const res = await fetch(`/api/contacts/lists/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchLists();
        if (selectedList?.id === id) setSelectedList(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList) return;
    setAddingContact(true);
    try {
      const res = await fetch(`/api/contacts/lists/${selectedList.id}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: conName, email: conEmail })
      });
      if (res.ok) {
        setConName("");
        setConEmail("");
        await fetchContacts(selectedList.id);
        await fetchLists(); // update list contact count
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingContact(false);
    }
  };

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList || !csvFile) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const res = await fetch(`/api/contacts/lists/${selectedList.id}/upload-csv`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setUploadResult(data);
        setCsvFile(null);
        const fileInput = document.getElementById("csv-file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        await fetchContacts(selectedList.id);
        await fetchLists();
      } else {
        const err = await res.json();
        setUploadError(err.detail || "Failed to process CSV file.");
      }
    } catch (err) {
      setUploadError("Connection error during import.");
    } finally {
      setUploading(false);
    }
  };

  const selectListDetails = async (list: ContactList) => {
    setSelectedList(list);
    setSearchTerm("");
    setStatusFilter("all");
    setUploadResult(null);
    setUploadError(null);
    await fetchContacts(list.id);
  };

  // Inline filter logic for contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = 
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" 
        ? true 
        : statusFilter === "active" 
          ? !c.is_unsubscribed 
          : c.is_unsubscribed;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3.5 animate-fadeIn">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-dark-700/20">
        <div className="flex items-center gap-2">
          {selectedList && (
            <button
              onClick={() => setSelectedList(null)}
              className="p-1.5 bg-dark-950 hover:bg-dark-900 text-dark-400 hover:text-white rounded-lg border border-dark-700/50 transition-colors"
              title="Back to segments list"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Users size={18} className="text-brand-400 shrink-0" />
              <span>{selectedList ? `${selectedList.name}` : "Subscriber Lists"}</span>
            </h2>
            <p className="text-[10px] text-dark-400 mt-0.5">
              {selectedList 
                ? `Manage leads inside this segment (Showing: ${filteredContacts.length} / Total: ${contacts.length})` 
                : "Create custom subscriber groups and manage segmented contact data"}
            </p>
          </div>
        </div>
      </div>

      {!selectedList ? (
        /* ================== LIST OVERVIEW ================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-start">
          {/* Creation Form */}
          <div className="glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20">
            <h3 className="text-sm font-bold text-white mb-3.5 flex items-center gap-2">
              <Users size={14} className="text-brand-400 shrink-0" />
              <span>New Contact List</span>
            </h3>

            <form onSubmit={handleCreateList} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">List Name</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Users size={13} />
                  </div>
                  <input
                    type="text" required value={listName} onChange={e => setListName(e.target.value)}
                    placeholder="e.g. Cold SaaS Leads V1"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">Description</label>
                <div className="relative">
                  <div className="absolute left-3 top-3.5 text-dark-500">
                    <FileText size={13} />
                  </div>
                  <textarea
                    value={listDesc} onChange={e => setListDesc(e.target.value)}
                    placeholder="Notes about this audience segment..." rows={3}
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingList || !listName}
                className="w-full py-2 brand-gradient-bg text-white font-bold rounded-lg text-xs transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 glow-btn disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creatingList ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Creating Segment...</span>
                  </>
                ) : (
                  <>
                    <Plus size={12} />
                    <span>Create Audience List</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* List Display Grid */}
          <div className="lg:col-span-2 space-y-3">
            {loadingLists ? (
              <div className="flex justify-center py-16">
                <RefreshCw className="animate-spin text-brand-500" size={18} />
              </div>
            ) : lists.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lists.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => selectListDetails(l)}
                    className="glass-panel p-3.5 rounded-xl border border-dark-700/30 cursor-pointer transition-all duration-300 hover:border-brand-500/30 hover:bg-dark-900/60 relative group flex flex-col justify-between min-h-[110px]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <div className="p-1.5 bg-brand-500/10 text-brand-400 rounded-lg border border-brand-500/20">
                        <Users size={14} />
                      </div>
                      <button
                        onClick={(e) => handleDeleteList(l.id, e)}
                        className="p-1 bg-dark-950 hover:bg-rose-500/10 text-dark-400 hover:text-rose-400 border border-dark-700/50 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
                        title="Delete list"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    <div className="relative z-10 flex-1">
                      <h4 className="font-bold text-white text-xs truncate">{l.name}</h4>
                      <p className="text-[10px] text-dark-400 font-medium truncate mt-0.5">{l.description || "No description provided."}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-dark-700/25 relative z-10 mt-3">
                      <span className="text-[8px] text-dark-500 font-bold uppercase tracking-wider">Subscriber Count</span>
                      <span className="text-[10px] font-extrabold text-brand-400 bg-brand-500/5 px-2.5 py-0.5 rounded-full border border-brand-500/15 flex items-center gap-1">
                        <Sparkles size={8} />
                        {l.contacts_count} Leads
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-dark-700/50 rounded-xl bg-dark-900/25 flex flex-col items-center justify-center gap-2">
                <div className="h-9 w-9 rounded-full bg-dark-950/80 border border-dark-700/40 flex items-center justify-center text-dark-500">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">No lists found</p>
                  <p className="text-[10px] text-dark-500 mt-0.5 max-w-[180px] mx-auto">Create a contact segment on the left to start importing leads.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================== DETAILED CONTACTS VIEW ================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-start">
          {/* Left panel: Add Contact Manually & CSV Uploader */}
          <div className="space-y-3.5">
            {/* Single addition form */}
            <div className="glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20">
              <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                <UserPlus size={14} className="text-brand-400 shrink-0" />
                <span>Add Single Lead</span>
              </h3>

              <form onSubmit={handleAddContact} className="space-y-2.5">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <User size={13} />
                  </div>
                  <input
                    type="text" value={conName} onChange={e => setConName(e.target.value)}
                    placeholder="Full Name (optional)"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>

                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Mail size={13} />
                  </div>
                  <input
                    type="email" required value={conEmail} onChange={e => setConEmail(e.target.value)}
                    placeholder="Email Address *"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-lg text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingContact || !conEmail}
                  className="w-full py-2 brand-gradient-bg text-white font-bold rounded-lg text-xs transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 glow-btn disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {addingContact ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={12} />
                      <span>Add Lead</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* CSV Import card */}
            <div className="glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20">
              <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                <Upload size={14} className="text-emerald-400 shrink-0" />
                <span>Bulk CSV Import</span>
              </h3>

              <form onSubmit={handleCSVUpload} className="space-y-3">
                <div className="border-2 border-dashed border-dark-700/60 rounded-xl p-4 text-center hover:border-brand-500/50 transition-colors bg-dark-950/20 flex flex-col items-center justify-center relative">
                  <Upload size={18} className="text-dark-400 mb-1" />
                  <p className="text-[8px] text-dark-400 font-semibold mb-2 uppercase tracking-wider">Upload leads in bulk</p>
                  
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    required
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("csv-file-input")?.click()}
                    className="px-2.5 py-1 bg-dark-800 hover:bg-dark-750 text-[9px] font-bold text-white rounded-lg border border-dark-700 transition-colors"
                  >
                    Browse Files
                  </button>
                  {csvFile && (
                    <p className="text-[10px] text-brand-300 font-semibold mt-2.5 truncate max-w-[160px]">{csvFile.name}</p>
                  )}
                </div>

                {uploadError && (
                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg flex items-center gap-1.5 animate-fadeIn">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadResult && (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg space-y-0.5 animate-fadeIn">
                    <div className="flex items-center gap-1 font-bold">
                      <CheckCircle size={12} className="shrink-0" />
                      Import Complete
                    </div>
                    <p className="text-[9px] text-dark-300">
                      Added: <span className="text-white font-bold">{uploadResult.success_count}</span>.
                      Failed: <span className="text-rose-400 font-bold">{uploadResult.failed_count}</span>.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !csvFile}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={12} />
                      <span>Upload & Parse CSV</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Contacts Directory Table */}
          <div className="lg:col-span-2 glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-dark-700/20">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 shrink-0">
                <Mail size={14} className="text-brand-400 shrink-0" />
                <span>Contacts Directory</span>
              </h3>

              {/* Advanced Search & Filtering bar */}
              <div className="flex items-center gap-2 flex-1 max-w-sm sm:justify-end">
                {/* Search field */}
                <div className="relative flex-1">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-500">
                    <Search size={11} />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name or email..."
                    className="w-full pl-8 pr-2 py-1 bg-dark-950/50 hover:bg-dark-950/80 border border-dark-700/40 rounded-lg text-[10px] focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/10 focus:outline-none text-white transition-all duration-200"
                  />
                </div>

                {/* Filter field */}
                <div className="relative">
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-dark-500">
                    <Filter size={10} />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-6 pr-6 py-1 bg-dark-950/50 hover:bg-dark-950/80 border border-dark-700/40 rounded-lg text-[10px] focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/10 focus:outline-none text-white appearance-none cursor-pointer transition-all duration-200"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="unsubscribed">Unsubscribed</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-dark-500 text-[6px]">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {loadingContacts ? (
              <div className="flex justify-center py-20">
                <RefreshCw className="animate-spin text-brand-500" size={18} />
              </div>
            ) : filteredContacts.length > 0 ? (
              <div className="overflow-x-auto max-h-[460px] pr-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700/40 pb-2 text-[9px] font-bold text-dark-400 uppercase tracking-wider">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Email Address</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-750/30">
                    {filteredContacts.map((c) => (
                      <tr key={c.id} className="text-[11px] text-dark-200 hover:bg-dark-700/5 transition-colors">
                        <td className="py-2.5 font-semibold text-white truncate max-w-[120px]">{c.name || "—"}</td>
                        <td className="py-2.5 font-mono text-dark-300 truncate max-w-[160px]">{c.email}</td>
                        <td className="py-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border
                            ${c.is_unsubscribed 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
                          `}>
                            {c.is_unsubscribed ? "Unsubscribed" : "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-dark-700/50 rounded-xl bg-dark-900/25 flex flex-col items-center justify-center gap-1.5 animate-fadeIn">
                <Mail size={14} className="text-dark-500" />
                <p className="text-[10px] text-dark-400">No matching contacts found</p>
                <p className="text-[9px] text-dark-500">Add manual leads or upload a CSV file above.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
