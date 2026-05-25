import React, { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { FileText, Plus, Trash2, Eye, Layout, Code, Monitor, Smartphone } from 'lucide-react'

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  content_html: string;
  created_at: string;
}

export default function Templates() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [contentHtml, setContentHtml] = useState("");

  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showCreator, setShowCreator] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, subject, content_html: contentHtml })
      });
      if (res.ok) {
        setName("");
        setSubject("");
        setContentHtml("");
        setShowCreator(false);
        await fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchTemplates();
        if (previewTemplate?.id === id) setPreviewTemplate(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Curated elegant template presets users can load instantly
  const loadPreset = (presetType: "newsletter" | "promo" | "welcome") => {
    if (presetType === "newsletter") {
      setName("Monthly Newsletter");
      setSubject("📬 Your Monthly SaaS Digest Inside!");
      setContentHtml(`<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f6f6f9; margin: 0; padding: 40px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e1e9fe;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #4c6ef5 0%, #3b51db 100%); padding: 40px 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">SmartCampaign Digest</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; color: #414467; line-height: 1.6;">
              <h2 style="color: #1a1c2e; font-size: 20px; margin-top: 0;">Hi {{name}},</h2>
              <p>We are thrilled to bring you our latest updates for this month! We have added custom socket diagnostics and faster email queues.</p>
              
              <div style="background-color: #f0f4ff; border-radius: 12px; padding: 20px; margin: 30px 0; border: 1px solid #c8d7fd;">
                <h4 style="margin: 0 0 8px 0; color: #4c6ef5;">🚀 Dynamic Multi-SMTP routing</h4>
                <p style="margin: 0; font-size: 14px;">Connect external delivery nodes seamlessly and route campaigns with higher delivery priority!</p>
              </div>

              <p>Let us know your feedback on our new system.</p>

              <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center" style="border-radius: 8px;" bgcolor="#4c6ef5">
                    <a href="https://beta.smartcampaign.today" target="_blank" style="font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #4c6ef5; display: inline-block;">Explore Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 30px; background-color: #f6f6f9; font-size: 12px; color: #878cae; border-top: 1px solid #ececf3;">
              <p style="margin: 0;">You are receiving this because you signed up at SmartCampaign.</p>
              <p style="margin: 10px 0 0 0;"><a href="#" style="color: #4c6ef5; text-decoration: none;">Unsubscribe</a> from this list.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`);
    } else if (presetType === "promo") {
      setName("Product Launch Discount");
      setSubject("🔥 30% Off Lifetime Deal — SmartCampaign");
      setContentHtml(`<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f6f6f9; margin: 0; padding: 40px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td align="center" style="padding: 40px 30px; color: #414467; line-height: 1.6;">
              <span style="font-weight: bold; color: #4c6ef5; text-transform: uppercase; font-size: 12px; tracking-wider: 2px;">LIFETIME PROMOTION</span>
              <h2 style="color: #1a1c2e; font-size: 24px; margin: 10px 0 20px 0; font-weight: 800;">Get 30% Off SmartCampaign Pro</h2>
              <p>Hey {{name}},</p>
              <p>For a limited time, we are offering an exclusive discount on our premium plans. Access unlimited contact uploads, detailed CRM nodes integrations, and priority sending.</p>
              
              <div style="text-align: center; margin: 40px 0;">
                <span style="font-size: 16px; text-decoration: line-through; color: #878cae;">$29.00/mo</span>
                <span style="font-size: 32px; font-weight: bold; color: #10b981; margin-left: 10px;">$19.00/mo</span>
                <p style="font-size: 12px; color: #878cae; margin-top: 5px;">Locked in forever. Cancel anytime.</p>
              </div>

              <div style="text-align: center;">
                <a href="https://beta.smartcampaign.today/billing" target="_blank" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);">Claim Discount Now</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`);
    } else if (presetType === "welcome") {
      setName("Welcome Aboard");
      setSubject("Welcome to SmartCampaign! Let's get sending");
      setContentHtml(`<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f6f6f9; margin: 0; padding: 40px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px 30px; color: #414467; line-height: 1.6;">
              <h2 style="color: #1a1c2e; font-size: 22px; margin-top: 0;">Welcome {{name}}!</h2>
              <p>Thank you for choosing SmartCampaign. We built this SaaS to help you manage newsletters, verify delivery paths, and scale your audience efficiently.</p>
              <p>Here are the first 3 steps to take:</p>
              <ol>
                <li style="margin-bottom: 8px;">Configure a custom SMTP server under <b>SMTP Servers</b> tab.</li>
                <li style="margin-bottom: 8px;">Upload a CSV list of subscribers under <b>Contact Lists</b> tab.</li>
                <li style="margin-bottom: 8px;">Launch your first email broadcast under <b>Campaigns</b> tab!</li>
              </ol>
              <p>Have any questions? We're here to help.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Design Templates</h2>
          <p className="text-sm text-dark-400 mt-1">Build responsive templates with dynamic variables `{"{{name}}"}` and `{"{{email}}"}`</p>
        </div>

        <button
          onClick={() => {
            setShowCreator(!showCreator);
            setPreviewTemplate(null);
          }}
          className="flex items-center gap-2 px-5 py-3 brand-gradient-bg text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:scale-[1.01] transition-transform"
        >
          <Plus size={16} />
          {showCreator ? "Show Saved Templates" : "Create New Template"}
        </button>
      </div>

      {!showCreator && !previewTemplate ? (
        /* ================== DISPLAY LIST ================== */
        <div>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setPreviewTemplate(t)}
                  className="glass-panel p-6 rounded-3xl border border-dark-700/30 cursor-pointer transition-all duration-300 hover:border-brand-500/30 hover:bg-dark-800/40 relative group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl border border-brand-500/20">
                      <Layout size={20} />
                    </div>
                    <button
                      onClick={(e) => handleDelete(t.id, e)}
                      className="p-2 bg-dark-900 hover:bg-rose-500/10 text-dark-400 hover:text-rose-400 rounded-lg border border-dark-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <h4 className="font-bold text-white text-base truncate mb-1">{t.name}</h4>
                  <p className="text-xs text-dark-400 font-medium truncate mb-6">Subject: {t.subject}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-dark-700/30 text-[10px] text-dark-500 font-bold uppercase tracking-wider">
                    <span>Click to inspect preview</span>
                    <Eye size={12} className="text-brand-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-dark-700/50 rounded-3xl bg-dark-900/30">
              <FileText size={32} className="mx-auto text-dark-500 mb-3" />
              <p className="text-sm text-dark-400">No email templates created yet. Click "Create New Template" above.</p>
            </div>
          )}
        </div>
      ) : showCreator ? (
        /* ================== CREATOR SECTION ================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Creator Inputs */}
          <div className="glass-panel p-6 rounded-3xl border border-dark-700/30 space-y-6">
            <h3 className="text-lg font-bold text-white mb-1">New Template Design</h3>
            
            {/* Quick presets load */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Load Dynamic Layout Presets:</span>
              <div className="flex gap-2.5">
                <button
                  type="button" onClick={() => loadPreset("welcome")}
                  className="flex-1 py-2 bg-dark-900 hover:bg-dark-800 rounded-lg border border-dark-700 text-[10px] font-bold text-brand-300 transition-colors"
                >
                  Welcome sequence
                </button>
                <button
                  type="button" onClick={() => loadPreset("newsletter")}
                  className="flex-1 py-2 bg-dark-900 hover:bg-dark-800 rounded-lg border border-dark-700 text-[10px] font-bold text-brand-300 transition-colors"
                >
                  Newsletter layout
                </button>
                <button
                  type="button" onClick={() => loadPreset("promo")}
                  className="flex-1 py-2 bg-dark-900 hover:bg-dark-800 rounded-lg border border-dark-700 text-[10px] font-bold text-brand-300 transition-colors"
                >
                  Deal Promo
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">Template Title</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Welcome sequence — New Signups"
                  className="w-full px-4 py-3 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">Email Subject Line</label>
                <input
                  type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Hi {{name}}! Welcome aboard!"
                  className="w-full px-4 py-3 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white placeholder:text-dark-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">HTML Source Code</label>
                <textarea
                  required value={contentHtml} onChange={e => setContentHtml(e.target.value)}
                  placeholder="Write responsive HTML tags here. Supports {{name}} and {{email}} tag variables."
                  rows={10}
                  className="w-full p-4 bg-dark-900 border border-dark-700/50 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white font-mono placeholder:text-dark-600 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={!name || !subject || !contentHtml}
                className="w-full py-3.5 brand-gradient-bg text-white font-bold rounded-xl text-xs transition-transform hover:scale-[1.01] glow-btn disabled:opacity-50"
              >
                Save Design Template
              </button>
            </form>
          </div>

          {/* Right Panel: Live Render Preview */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-dark-700/30 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Code size={18} className="text-brand-400" />
                Real-Time HTML Render Preview
              </h3>

              <div className="flex bg-dark-900 border border-dark-700 p-1 rounded-lg">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`p-1.5 rounded-md ${previewMode === "desktop" ? "bg-brand-500 text-white" : "text-dark-400"}`}
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`p-1.5 rounded-md ${previewMode === "mobile" ? "bg-brand-500 text-white" : "text-dark-400"}`}
                >
                  <Smartphone size={14} />
                </button>
              </div>
            </div>

            <div className={`mx-auto bg-white rounded-2xl overflow-hidden shadow-inner border border-dark-700/20 transition-all duration-300 ${
              previewMode === "mobile" ? "max-w-[375px] h-[550px]" : "w-full h-[550px]"
            }`}>
              {contentHtml ? (
                <iframe
                  title="Live Preview"
                  srcDoc={contentHtml.replace("{{name}}", "John Doe").replace("{{email}}", "john@domain.com")}
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-dark-900/10 text-dark-500 p-8 text-center">
                  <Monitor size={48} className="mb-4 text-dark-700" />
                  <p className="text-sm font-semibold">Live Preview Box</p>
                  <p className="text-xs mt-1">Start writing HTML tags in the builder or click a dynamic preset layout to preview rendering details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ================== DETAILED SINGLE VIEW ================== */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPreviewTemplate(null)}
              className="px-4 py-2 bg-dark-900 hover:bg-dark-800 text-xs font-bold text-white border border-dark-700 rounded-xl"
            >
              ← Back to list
            </button>

            <div className="flex bg-dark-900 border border-dark-700 p-1 rounded-lg">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`p-1.5 rounded-md ${previewMode === "desktop" ? "bg-brand-500 text-white" : "text-dark-400"}`}
              >
                <Monitor size={14} />
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`p-1.5 rounded-md ${previewMode === "mobile" ? "bg-brand-500 text-white" : "text-dark-400"}`}
              >
                <Smartphone size={14} />
              </button>
            </div>
          </div>

          <div className={`mx-auto bg-white rounded-3xl overflow-hidden border border-dark-700/20 shadow-2xl transition-all duration-300 ${
            previewMode === "mobile" ? "max-w-[375px] h-[600px]" : "w-full h-[600px]"
          }`}>
            <iframe
              title="Saved Preview"
              srcDoc={previewTemplate?.content_html.replace("{{name}}", "John Doe").replace("{{email}}", "john@domain.com")}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
