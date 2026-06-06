import React, { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { 
  Users, Plus, Trash2, Upload, ArrowLeft, Mail, 
  CheckCircle, AlertCircle, UserPlus, UserCheck, 
  FileText, Search, User, Filter, RefreshCw, Sparkles, X, Edit
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showImportCSVModal, setShowImportCSVModal] = useState(false);

  // New Contact Fields
  const [conName, setConName] = useState("");
  const [conEmail, setConEmail] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  // Modify Contact Fields
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [updatingContact, setUpdatingContact] = useState(false);

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
        setShowCreateModal(false);
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
        setShowAddLeadModal(false);
        await fetchContacts(selectedList.id);
        await fetchLists(); // update list contact count
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!selectedList) return;
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`/api/contacts/lists/${selectedList.id}/contacts/${contactId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchContacts(selectedList.id);
        await fetchLists(); // update list contact count
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenModifyModal = (c: Contact) => {
    setEditingContact(c);
    setEditName(c.name || "");
    setEditEmail(c.email);
    setEditStatus(c.is_unsubscribed ? "unsubscribed" : "active");
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList || !editingContact) return;
    setUpdatingContact(true);
    try {
      const res = await fetch(`/api/contacts/lists/${selectedList.id}/contacts/${editingContact.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          status: editStatus
        })
      });
      if (res.ok) {
        setEditingContact(null);
        await fetchContacts(selectedList.id);
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to update contact.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingContact(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-dark-700/20 gap-2">
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
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
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

        {selectedList ? (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setConName("");
                setConEmail("");
                setShowAddLeadModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-[10px] sm:text-xs font-bold rounded-lg border border-brand-500/20 transition-all hover:scale-[1.015] active:scale-[0.985]"
            >
              <UserPlus size={12} className="stroke-[2.5]" />
              <span>Add Single Lead</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCsvFile(null);
                setUploadResult(null);
                setUploadError(null);
                setShowImportCSVModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-bold rounded-lg border border-emerald-500/20 transition-all hover:scale-[1.015] active:scale-[0.985]"
            >
              <Upload size={12} className="stroke-[2.5]" />
              <span>Bulk CSV Import</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setListName("");
              setListDesc("");
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 brand-gradient-bg hover:opacity-95 text-white text-[10px] sm:text-xs font-bold rounded-lg shadow-md shadow-brand-500/15 hover:scale-[1.015] active:scale-[0.985] transition-all self-start sm:self-auto"
          >
            <Plus size={12} className="stroke-[3]" />
            <span>Create Contact List</span>
          </button>
        )}
      </div>

      {!selectedList ? (
        /* ================== LIST OVERVIEW ================== */
        <div className="space-y-4">
          {loadingLists ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="animate-spin text-brand-500" size={20} />
            </div>
          ) : lists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {lists.map((l, idx) => {
                const formattedDate = l.created_at 
                  ? new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Recent';

                // Dynamic color styling depending on index
                const colorThemes = [
                  { bg: "bg-brand-500/10 border-brand-500/20 text-brand-450 dark:text-brand-400", border: "hover:border-brand-500/40 hover:shadow-brand-500/5" },
                  { bg: "bg-sky-500/10 border-sky-500/20 text-sky-500 dark:text-sky-400", border: "hover:border-sky-500/40 hover:shadow-sky-500/5" },
                  { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400", border: "hover:border-emerald-500/40 hover:shadow-emerald-500/5" },
                  { bg: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400", border: "hover:border-amber-500/40 hover:shadow-amber-500/5" }
                ];
                const theme = colorThemes[idx % colorThemes.length];

                return (
                  <div
                    key={l.id}
                    onClick={() => selectListDetails(l)}
                    className={`relative overflow-hidden glass-panel p-4 rounded-2xl border border-dark-750/30 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-md hover:shadow-lg group flex flex-col justify-between min-h-[140px] bg-dark-900/60 ${theme.border}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                    <div className="flex justify-between items-center mb-2 relative z-10 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${theme.bg}`}>
                          <Users size={14} className="stroke-[2.5]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-white text-xs truncate uppercase tracking-wider leading-none">{l.name}</h4>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteList(l.id, e)}
                        className="p-1.5 bg-dark-950/80 hover:bg-rose-500/10 text-dark-400 hover:text-rose-500 border border-dark-700/60 hover:border-rose-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 shadow-sm shrink-0"
                        title="Delete list"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    <div className="relative z-10 flex-1 min-w-0 mt-1">
                      <p className="text-[10px] text-dark-400 font-medium line-clamp-2 leading-relaxed">{l.description || "No description provided."}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-dark-700/25 relative z-10 mt-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] text-dark-500 font-extrabold uppercase tracking-widest">Total Assets</span>
                        <span className="text-[9.5px] font-extrabold text-brand-500 dark:text-brand-455 bg-brand-500/5 px-2.5 py-0.5 rounded-full border border-brand-500/15 flex items-center gap-1">
                          <Sparkles size={8.5} className="animate-pulse" />
                          {l.contacts_count} Leads
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[8px] text-dark-500 font-extrabold uppercase tracking-widest">Created On</span>
                        <span className="text-[9px] font-bold text-dark-400 font-mono">{formattedDate}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-dark-700/50 rounded-2xl bg-dark-900/15 flex flex-col items-center justify-center gap-2.5">
              <div className="h-10 w-10 rounded-full bg-dark-950/80 border border-dark-700/40 flex items-center justify-center text-dark-500 shadow-inner">
                <Users size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">No lists configured</p>
                <p className="text-[10px] text-dark-500 mt-1 max-w-[200px] mx-auto leading-normal">Create an audience segment to start importing lead folders.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================== DETAILED CONTACTS VIEW ================== */
        <div className="w-full animate-fadeIn">
          {/* Contacts Directory Table */}
          <div className="w-full glass-panel p-3.5 md:p-4 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/20 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-dark-700/20">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 shrink-0">
                <Mail size={14} className="text-brand-400 shrink-0" />
                <span>Contacts Directory</span>
                <span className="text-[9px] font-extrabold text-brand-500 dark:text-brand-450 bg-brand-500/5 px-2 py-0.5 rounded-md border border-brand-500/15 font-sans">
                  {filteredContacts.length} Leads
                </span>
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
                    <tr className="border-b border-dark-750/50 text-[9.5px] font-extrabold text-dark-400 uppercase tracking-widest bg-dark-950/15">
                      <th className="py-3 px-3 pl-4 w-8 font-mono">#</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3 hidden sm:table-cell">Email Address</th>
                      <th className="py-3 px-3 text-right">Status</th>
                      <th className="py-3 px-3 text-right hidden sm:table-cell w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-750/30">
                    {filteredContacts.map((c, idx) => {
                      const initials = c.name 
                        ? c.name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        : c.email.slice(0, 2).toUpperCase();
                      const initialsColorThemes = [
                        "bg-brand-500/10 border-brand-500/20 text-brand-400",
                        "bg-sky-500/10 border-sky-500/20 text-sky-400",
                        "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                        "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
                        "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      ];
                      const avatarTheme = initialsColorThemes[idx % initialsColorThemes.length];

                      return (
                        <tr key={c.id} className="text-[11.5px] text-dark-200 hover:bg-white/[0.012] transition-colors duration-200">
                          <td className="py-3.5 px-3 pl-4 font-mono text-[10px] text-dark-500 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-[10px] font-extrabold tracking-wider shrink-0 shadow-inner ${avatarTheme}`}>
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-white text-xs block truncate max-w-[120px] sm:max-w-[180px] leading-tight">
                                  {c.name || "—"}
                                </span>
                                <span className="text-[9.5px] text-dark-450 font-mono block truncate max-w-[140px] sm:hidden mt-0.5">
                                  {c.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-dark-300 truncate max-w-[160px] md:max-w-none hidden sm:table-cell">
                            {c.email}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border
                              ${c.is_unsubscribed 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
                            `}>
                              {c.is_unsubscribed ? "Unsubscribed" : "Active"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right hidden sm:table-cell">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenModifyModal(c)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 hover:text-brand-300 border border-brand-500/25 hover:border-brand-500/35 rounded-lg text-[10px] font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                              >
                                <Edit size={10} className="stroke-[2.5]" />
                                <span>Modify</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(c.id)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 hover:border-rose-500/35 rounded-lg text-[10px] font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                              >
                                <Trash2 size={10} className="stroke-[2.5]" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

      {/* Add Single Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-900 border border-dark-700/50 rounded-2xl p-5 shadow-2xl relative animate-scaleUp overflow-hidden">
            {/* Accent stripe at top */}
            <div className="absolute top-0 left-0 right-0 h-[3px] brand-gradient-bg" />
            
            <button
              onClick={() => setShowAddLeadModal(false)}
              className="absolute right-4 top-4 p-1.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
              title="Close modal"
            >
              <X size={15} />
            </button>

            <h3 className="text-sm font-extrabold text-white mb-1 flex items-center gap-2 mt-1">
              <UserPlus size={16} className="text-brand-400" />
              <span>Add Single Lead</span>
            </h3>
            <p className="text-[10px] text-dark-450 font-semibold mb-4">Enter contact details to manually subscribe a new lead.</p>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[9px] font-extrabold text-dark-455 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <User size={13} />
                  </div>
                  <input
                    type="text"
                    value={conName}
                    onChange={(e) => setConName(e.target.value)}
                    placeholder="Full Name (optional)"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-xl text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-[9px] font-extrabold text-dark-455 uppercase tracking-widest">Email Address *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Mail size={13} />
                  </div>
                  <input
                    type="email"
                    required
                    value={conEmail}
                    onChange={(e) => setConEmail(e.target.value)}
                    placeholder="Email Address *"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-xl text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="flex-1 py-2 bg-dark-950 hover:bg-dark-800 text-xs font-bold text-white border border-dark-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingContact || !conEmail}
                  className="flex-1 py-2 brand-gradient-bg hover:opacity-95 text-white font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/25 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {addingContact ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} />
                      <span>Add Lead</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showImportCSVModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-900 border border-dark-700/50 rounded-2xl p-5 shadow-2xl relative animate-scaleUp overflow-hidden">
            {/* Accent stripe at top */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
            
            <button
              onClick={() => {
                setShowImportCSVModal(false);
                setUploadResult(null);
                setUploadError(null);
                setCsvFile(null);
              }}
              className="absolute right-4 top-4 p-1.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
              title="Close modal"
            >
              <X size={15} />
            </button>

            <h3 className="text-sm font-extrabold text-white mb-1 flex items-center gap-2 mt-1">
              <Upload size={16} className="text-emerald-400" />
              <span>Bulk CSV Import</span>
            </h3>
            <p className="text-[10px] text-dark-450 font-semibold mb-4">Select a CSV file containing contact records to upload in bulk.</p>

            <form onSubmit={handleCSVUpload} className="space-y-4">
              <div className="border-2 border-dashed border-dark-700/60 rounded-xl p-6 text-center hover:border-brand-500/50 transition-colors bg-dark-950/20 flex flex-col items-center justify-center relative">
                <Upload size={24} className="text-dark-400 mb-2" />
                <p className="text-[9px] text-dark-400 font-extrabold mb-3 uppercase tracking-wider">Drag and drop or upload file</p>
                
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
                  className="px-3 py-1.5 bg-dark-800 hover:bg-dark-750 text-[10px] font-bold text-white rounded-lg border border-dark-700 transition-colors"
                >
                  Browse Files
                </button>
                {csvFile && (
                  <p className="text-xs text-brand-300 font-semibold mt-3 truncate max-w-[200px]">{csvFile.name}</p>
                )}
              </div>

              {uploadError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] rounded-lg flex items-center gap-1.5 animate-fadeIn">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadResult && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg space-y-1 animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle size={14} className="shrink-0" />
                    Import Complete
                  </div>
                  <p className="text-[10px] text-dark-300">
                    Added: <span className="text-white font-bold">{uploadResult.success_count}</span> leads.
                  </p>
                  <p className="text-[10px] text-dark-300">
                    Failed: <span className="text-rose-455 font-bold">{uploadResult.failed_count}</span> records.
                  </p>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportCSVModal(false);
                    setUploadResult(null);
                    setUploadError(null);
                    setCsvFile(null);
                  }}
                  className="flex-1 py-2 bg-dark-950 hover:bg-dark-800 text-xs font-bold text-white border border-dark-800 rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={uploading || !csvFile}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={13} />
                      <span>Upload & Parse</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-900 border border-dark-700/50 rounded-2xl p-5 shadow-2xl relative animate-scaleUp overflow-hidden">
            {/* Accent stripe at top */}
            <div className="absolute top-0 left-0 right-0 h-[3px] brand-gradient-bg" />
            
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-1.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
              title="Close modal"
            >
              <X size={15} />
            </button>

            <h3 className="text-sm font-extrabold text-white mb-1 flex items-center gap-2 mt-1">
              <Users size={16} className="text-brand-400" />
              <span>Create Contact List</span>
            </h3>
            <p className="text-[10px] text-dark-450 font-semibold mb-4">Configure a new contact segment to import leads.</p>

            <form onSubmit={handleCreateList} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[9px] font-extrabold text-dark-455 uppercase tracking-widest">List Name</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Users size={13} />
                  </div>
                  <input
                    type="text"
                    required
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    placeholder="e.g. Cold SaaS Leads V1"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-xl text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-[9px] font-extrabold text-dark-455 uppercase tracking-widest">Description</label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-dark-500">
                    <FileText size={13} />
                  </div>
                  <textarea
                    value={listDesc}
                    onChange={(e) => setListDesc(e.target.value)}
                    placeholder="Provide details about this segment..."
                    rows={3}
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-xl text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-dark-950 hover:bg-dark-800 text-xs font-bold text-white border border-dark-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingList || !listName}
                  className="flex-1 py-2 brand-gradient-bg hover:opacity-95 text-white font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/25 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {creatingList ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Create List</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modify Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-900 border border-dark-700/50 rounded-2xl p-5 shadow-2xl relative animate-scaleUp overflow-hidden">
            {/* Accent stripe at top */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-indigo-500" />
            
            <button
              onClick={() => setEditingContact(null)}
              className="absolute right-4 top-4 p-1.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
              title="Close modal"
            >
              <X size={15} />
            </button>

            <h3 className="text-sm font-extrabold text-white mb-1 flex items-center gap-2 mt-1">
              <User size={16} className="text-blue-400" />
              <span>Modify Lead Details</span>
            </h3>
            <p className="text-[10px] text-dark-450 font-semibold mb-4">Edit the name, email address, or subscription status for this contact.</p>

            <form onSubmit={handleUpdateContact} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[9px] font-extrabold text-dark-455 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <User size={13} />
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-xl text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-[9px] font-extrabold text-dark-455 uppercase tracking-widest">Email Address *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Mail size={13} />
                  </div>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email Address *"
                    className="w-full pl-9 pr-3.5 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-xl text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-[9px] font-extrabold text-dark-455 uppercase tracking-widest">Status</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <Filter size={13} />
                  </div>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-xl text-xs focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white appearance-none cursor-pointer transition-all duration-200"
                  >
                    <option value="active">Active</option>
                    <option value="unsubscribed">Unsubscribed</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dark-500 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  className="flex-1 py-2 bg-dark-950 hover:bg-dark-800 text-xs font-bold text-white border border-dark-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingContact || !editEmail}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {updatingContact ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
