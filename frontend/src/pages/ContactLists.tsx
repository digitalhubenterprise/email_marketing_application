import React, { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { 
  Users, 
  Plus, 
  Trash2, 
  Upload, 
  ArrowLeft, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  UserPlus, 
  UserCheck 
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
        // Clear input element
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
    setUploadResult(null);
    setUploadError(null);
    await fetchContacts(list.id);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedList && (
            <button
              onClick={() => setSelectedList(null)}
              className="p-2.5 bg-dark-900 hover:bg-dark-800 text-dark-300 hover:text-white rounded-xl border border-dark-700 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {selectedList ? `${selectedList.name}` : "Subscriber Lists"}
            </h2>
            <p className="text-sm text-dark-400 mt-1">
              {selectedList 
                ? `Manage leads inside this segment (Total: ${contacts.length})` 
                : "Create custom subscriber groups and manage segmented contact data"}
            </p>
          </div>
        </div>
      </div>

      {!selectedList ? (
        /* ================== LIST OVERVIEW ================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Creation Form */}
          <div className="glass-panel p-6 rounded-3xl border border-dark-700/30">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Users size={18} className="text-brand-400" />
              New Contact List
            </h3>

            <form onSubmit={handleCreateList} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">List Name</label>
                <input
                  type="text" required value={listName} onChange={e => setListName(e.target.value)}
                  placeholder="e.g. Cold SaaS Leads V1"
                  className="w-full px-4 py-3 bg-dark-900 border border-dark-700/50 rounded-xl text-sm focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={listDesc} onChange={e => setListDesc(e.target.value)}
                  placeholder="Notes about this audience segment..." rows={3}
                  className="w-full px-4 py-3 bg-dark-900 border border-dark-700/50 rounded-xl text-sm focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-500"
                />
              </div>

              <button
                type="submit"
                disabled={creatingList || !listName}
                className="w-full py-3.5 brand-gradient-bg text-white font-bold rounded-xl text-xs transition-transform hover:scale-[1.01] flex items-center justify-center gap-2 glow-btn disabled:opacity-50"
              >
                Create Audience List
                <Plus size={14} />
              </button>
            </form>
          </div>

          {/* List Display Card */}
          <div className="lg:col-span-2 space-y-4">
            {loadingLists ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              </div>
            ) : lists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lists.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => selectListDetails(l)}
                    className="glass-panel p-6 rounded-2xl border border-dark-700/30 cursor-pointer transition-all duration-300 hover:border-brand-500/30 hover:bg-dark-800/40 relative group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl border border-brand-500/20">
                        <Users size={20} />
                      </div>
                      <button
                        onClick={(e) => handleDeleteList(l.id, e)}
                        className="p-2 bg-dark-900 hover:bg-rose-500/10 text-dark-400 hover:text-rose-400 rounded-lg border border-dark-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <h4 className="font-bold text-white text-base truncate mb-1">{l.name}</h4>
                    <p className="text-xs text-dark-400 font-medium truncate mb-4">{l.description || "No description provided."}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-dark-700/30">
                      <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">Subscriber Count</span>
                      <span className="text-sm font-extrabold text-brand-400 bg-brand-500/5 px-2.5 py-0.5 rounded-full border border-brand-500/15">
                        {l.contacts_count} Leads
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-dark-700/50 rounded-3xl bg-dark-900/30">
                <Users size={32} className="mx-auto text-dark-500 mb-3" />
                <p className="text-sm text-dark-400">No contact lists found. Create your first list above.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================== DETAILED CONTACTS VIEW ================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left panel: Add Contact Manually & CSV Uploader */}
          <div className="space-y-6">
            {/* Single addition form */}
            <div className="glass-panel p-6 rounded-3xl border border-dark-700/30">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider text-dark-300">
                <UserPlus size={16} className="text-brand-400" />
                Add Single Lead
              </h3>

              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <input
                    type="text" value={conName} onChange={e => setConName(e.target.value)}
                    placeholder="Full Name (optional)"
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-500"
                  />
                </div>

                <div>
                  <input
                    type="email" required value={conEmail} onChange={e => setConEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingContact || !conEmail}
                  className="w-full py-2.5 brand-gradient-bg text-white font-bold rounded-xl text-xs transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5 glow-btn disabled:opacity-50"
                >
                  <UserPlus size={12} />
                  {addingContact ? "Adding..." : "Add Lead"}
                </button>
              </form>
            </div>

            {/* CSV Import card */}
            <div className="glass-panel p-6 rounded-3xl border border-dark-700/30">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider text-dark-300">
                <Upload size={16} className="text-emerald-400" />
                Bulk CSV Import
              </h3>

              <form onSubmit={handleCSVUpload} className="space-y-4">
                <div className="border-2 border-dashed border-dark-700/60 rounded-2xl p-6 text-center hover:border-brand-500/50 transition-colors bg-dark-900/30">
                  <Upload size={24} className="mx-auto text-dark-400 mb-2" />
                  <p className="text-[10px] text-dark-400 font-semibold mb-3 uppercase tracking-wider">Drag or Select CSV File</p>
                  
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
                    className="px-3 py-1.5 bg-dark-800 text-[10px] font-bold text-white rounded-lg border border-dark-700"
                  >
                    Browse Files
                  </button>
                  {csvFile && (
                    <p className="text-xs text-brand-300 font-semibold mt-3 truncate">{csvFile.name}</p>
                  )}
                </div>

                {uploadError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadResult && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle size={14} />
                      Import Complete
                    </div>
                    <p className="text-[10px] text-dark-300 mt-1">
                      Added: <span className="text-white font-bold">{uploadResult.success_count}</span> leads.
                      Failed: <span className="text-rose-400 font-bold">{uploadResult.failed_count}</span>.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !csvFile}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <UserCheck size={12} />
                  {uploading ? "Processing CSV..." : "Upload & Parse CSV"}
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Contacts Table */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-dark-700/30">
            <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
              <Mail size={16} className="text-brand-400" />
              Contacts Directory
            </h3>

            {loadingContacts ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              </div>
            ) : contacts.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700/50 pb-3 text-xs font-bold text-dark-400 uppercase tracking-wider">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Email Address</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/10">
                    {contacts.map((c) => (
                      <tr key={c.id} className="text-xs text-dark-200 hover:bg-dark-700/5">
                        <td className="py-3 font-semibold text-white">{c.name || "—"}</td>
                        <td className="py-3 font-mono">{c.email}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${c.is_unsubscribed 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}
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
              <div className="text-center py-20 border border-dashed border-dark-700/50 rounded-2xl bg-dark-900/30">
                <p className="text-xs text-dark-400">Audience is empty. Use the manual fields or uploader to add leads.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
