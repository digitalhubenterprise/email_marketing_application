import React, { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { FileText, Plus, Trash2, Eye, Layout, Code, Monitor, Smartphone, Mail, Sparkles, ArrowLeft, RefreshCw } from 'lucide-react'

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
        const newT = await res.json();
        setName("");
        setSubject("");
        setContentHtml("");
        setShowCreator(false);
        await fetchTemplates();
        setPreviewTemplate(newT);
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
        const updated = templates.filter(t => t.id !== id);
        setTemplates(updated);
        if (previewTemplate?.id === id) {
          setPreviewTemplate(null);
        }
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
<body style="font-family: Arial, sans-serif; background-color: #f6f6f9; margin: 0; padding: 20px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.04); border: 1px solid #e1e9fe;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #4c6ef5 0%, #3b51db 100%); padding: 25px 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold; font-family: sans-serif;">SmartCampaign Digest</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 20px; color: #414467; line-height: 1.5; font-size: 13px;">
              <h2 style="color: #1a1c2e; font-size: 16px; margin-top: 0; font-family: sans-serif;">Hi {{name}},</h2>
              <p>We are thrilled to bring you our latest updates for this month! We have added custom socket diagnostics and faster email queues.</p>
              
              <div style="background-color: #f0f4ff; border-radius: 8px; padding: 12px; margin: 15px 0; border: 1px solid #c8d7fd;">
                <h4 style="margin: 0 0 4px 0; color: #4c6ef5; font-size: 13px;">🚀 Dynamic Multi-SMTP routing</h4>
                <p style="margin: 0; font-size: 11px; color: #51557d;">Connect external delivery nodes seamlessly and route campaigns with higher delivery priority!</p>
              </div>

              <p>Let us know your feedback on our new system.</p>

              <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                <tr>
                  <td align="center" style="border-radius: 6px;" bgcolor="#4c6ef5">
                    <a href="https://beta.smartcampaign.today" target="_blank" style="font-size: 12px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; border: 1px solid #4c6ef5; display: inline-block; font-family: sans-serif;">Explore Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px; background-color: #f6f6f9; font-size: 10px; color: #878cae; border-top: 1px solid #ececf3;">
              <p style="margin: 0;">You are receiving this because you signed up at SmartCampaign.</p>
              <p style="margin: 5px 0 0 0;"><a href="#" style="color: #4c6ef5; text-decoration: none;">Unsubscribe</a> from this list.</p>
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
<body style="font-family: Arial, sans-serif; background-color: #f6f6f9; margin: 0; padding: 20px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
          <tr>
            <td align="center" style="padding: 30px 20px; color: #414467; line-height: 1.5; font-size: 13px;">
              <span style="font-weight: bold; color: #4c6ef5; text-transform: uppercase; font-size: 10px; tracking-wider: 2px;">LIFETIME PROMOTION</span>
              <h2 style="color: #1a1c2e; font-size: 18px; margin: 5px 0 15px 0; font-weight: bold; font-family: sans-serif;">Get 30% Off SmartCampaign Pro</h2>
              <p>Hey {{name}},</p>
              <p>For a limited time, we are offering an exclusive discount on our premium plans. Access unlimited contact uploads, detailed CRM nodes integrations, and priority sending.</p>
              
              <div style="text-align: center; margin: 25px 0;">
                <span style="font-size: 13px; text-decoration: line-through; color: #878cae;">$29.00/mo</span>
                <span style="font-size: 24px; font-weight: bold; color: #10b981; margin-left: 8px;">$19.00/mo</span>
                <p style="font-size: 10px; color: #878cae; margin-top: 4px;">Locked in forever. Cancel anytime.</p>
              </div>

              <div style="text-align: center;">
                <a href="https://beta.smartcampaign.today/billing" target="_blank" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); font-size: 12px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 8px rgba(16, 185, 129, 0.15); font-family: sans-serif;">Claim Discount Now</a>
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
<body style="font-family: Arial, sans-serif; background-color: #f6f6f9; margin: 0; padding: 20px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding: 30px 20px; color: #414467; line-height: 1.5; font-size: 13px;">
              <h2 style="color: #1a1c2e; font-size: 18px; margin-top: 0; font-family: sans-serif;">Welcome {{name}}!</h2>
              <p>Thank you for choosing SmartCampaign. We built this SaaS to help you manage newsletters, verify delivery paths, and scale your audience efficiently.</p>
              <p>Here are the first 3 steps to take:</p>
              <ol style="padding-left: 20px; margin: 10px 0;">
                <li style="margin-bottom: 6px;">Configure a custom SMTP server under <b>SMTP Servers</b> tab.</li>
                <li style="margin-bottom: 6px;">Upload a CSV list of subscribers under <b>Contact Lists</b> tab.</li>
                <li style="margin-bottom: 6px;">Launch your first email campaign under <b>Campaigns</b> tab!</li>
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
    <div className="space-y-2.5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-dark-700/15">
        <div className="flex items-center gap-1.5">
          {(previewTemplate || showCreator) && (
            <button
              onClick={() => {
                setPreviewTemplate(null);
                setShowCreator(false);
              }}
              className="p-1 bg-dark-950 hover:bg-dark-900 text-dark-400 hover:text-white rounded-md border border-dark-700/50 transition-colors animate-fadeIn"
              title="Back to templates list"
            >
              <ArrowLeft size={12} />
            </button>
          )}
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <Layout size={16} className="text-brand-400 shrink-0" />
              <span>
                {showCreator 
                  ? "New Template Design" 
                  : previewTemplate 
                    ? `Preview: ${previewTemplate.name}` 
                    : "Design Templates"
                }
              </span>
            </h2>
            <p className="text-[9px] text-dark-400 mt-0.5">Build responsive templates with dynamic variables `{"{{name}}"}` and `{"{{email}}"}`</p>
          </div>
        </div>

        {!previewTemplate && !showCreator && (
          <button
            onClick={() => {
              setShowCreator(true);
              setName("");
              setSubject("");
              setContentHtml("");
            }}
            className="flex items-center self-start sm:self-center gap-1 px-2.5 py-1.5 brand-gradient-bg text-white text-[11px] font-bold rounded-md shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            <Plus size={12} />
            <span>Create New Template</span>
          </button>
        )}
      </div>

      {!showCreator && !previewTemplate ? (
        /* ================== DISPLAY LIST AS DIRECTORY TABLE ================== */
        <div>
          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="animate-spin text-brand-500" size={16} />
            </div>
          ) : templates.length > 0 ? (
            <div className="glass-panel overflow-hidden border border-dark-700/30 rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700/40 bg-dark-950/50 text-[9px] font-bold text-dark-400 uppercase tracking-wider">
                      <th className="py-2 px-3">Template Name</th>
                      <th className="py-2 px-3">Subject Line</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800/30 text-xs">
                    {templates.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setPreviewTemplate(t)}
                        className="hover:bg-dark-900/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-2 px-3 font-bold text-white flex items-center gap-2">
                          <Layout size={12} className="text-brand-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{t.name}</span>
                        </td>
                        <td className="py-2 px-3 text-dark-350 font-medium font-mono text-[11px] truncate max-w-[340px]">
                          {t.subject}
                        </td>
                        <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewTemplate(t)}
                              className="p-1 bg-dark-950 hover:bg-dark-900 text-brand-400 hover:text-brand-300 border border-dark-800 rounded-md transition-colors"
                              title="Preview template"
                            >
                              <Eye size={11} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(t.id, e)}
                              className="p-1 bg-dark-950 hover:bg-rose-500/10 text-dark-500 hover:text-rose-400 border border-dark-800 rounded-md transition-colors"
                              title="Delete template"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-dark-700/50 rounded-lg bg-dark-900/25 flex flex-col items-center justify-center gap-1.5">
              <div className="h-7 w-7 rounded-full bg-dark-950/80 border border-dark-700/40 flex items-center justify-center text-dark-500">
                <FileText size={14} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white">No email templates</p>
                <p className="text-[9px] text-dark-500 mt-0.5 max-w-[180px] mx-auto">Create a template above or choose a pre-configured layout block.</p>
              </div>
            </div>
          )}
        </div>
      ) : showCreator ? (
        /* ================== CREATOR SECTION ================== */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
          {/* Creator Inputs */}
          <div className="glass-panel p-2.5 rounded-lg border border-dark-700/30 shadow-md shadow-dark-950/20 space-y-2.5">
            {/* Quick presets load */}
            <div className="space-y-1">
              <span className="text-[7.5px] font-bold text-dark-400 uppercase tracking-wider">Load Dynamic Layout Presets:</span>
              <div className="flex gap-1">
                <button
                  type="button" onClick={() => loadPreset("welcome")}
                  className="flex-1 py-1 bg-dark-950 hover:bg-dark-900 rounded-md border border-dark-700/60 text-[9px] font-bold text-brand-400 transition-colors"
                >
                  Welcome
                </button>
                <button
                  type="button" onClick={() => loadPreset("newsletter")}
                  className="flex-1 py-1 bg-dark-950 hover:bg-dark-900 rounded-md border border-dark-700/60 text-[9px] font-bold text-brand-400 transition-colors"
                >
                  Newsletter
                </button>
                <button
                  type="button" onClick={() => loadPreset("promo")}
                  className="flex-1 py-1 bg-dark-950 hover:bg-dark-900 rounded-md border border-dark-700/60 text-[9px] font-bold text-brand-400 transition-colors"
                >
                  Promo
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-2 pt-1.5 border-t border-dark-700/15">
              <div className="flex flex-col gap-0.5">
                <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Template Title</label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-500">
                    <FileText size={11} />
                  </div>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Welcome sequence"
                    className="w-full pl-7.5 pr-2.5 py-1.5 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-md text-[11px] focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Email Subject Line</label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-500">
                    <Mail size={11} />
                  </div>
                  <input
                    type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Hi {{name}}! Welcome aboard!"
                    className="w-full pl-7.5 pr-2.5 py-1.5 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-md text-[11px] focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">HTML Source Code</label>
                <div className="relative">
                  <div className="absolute left-2.5 top-2.5 text-dark-500">
                    <Code size={11} />
                  </div>
                  <textarea
                    required value={contentHtml} onChange={e => setContentHtml(e.target.value)}
                    placeholder="Write responsive HTML tags here. Supports {{name}} and {{email}} tag variables."
                    rows={6}
                    className="w-full pl-7.5 pr-2.5 py-1.5 bg-dark-950/45 hover:bg-dark-950/70 focus:bg-dark-950/90 border border-dark-700/40 rounded-md text-[11px] focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/20 focus:outline-none text-white font-mono placeholder:text-dark-600 leading-normal"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!name || !subject || !contentHtml}
                className="w-full py-1.5 brand-gradient-bg text-white font-bold rounded-md text-[11px] transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1 glow-btn disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={11} />
                <span>Save Design Template</span>
              </button>
            </form>
          </div>

          {/* Right Panel: Live Render Preview */}
          <div className="glass-panel p-2.5 rounded-lg border border-dark-700/30 shadow-md shadow-dark-950/20 space-y-2.5">
            <div className="flex justify-between items-center pb-1.5 border-b border-dark-700/15">
              <h3 className="text-[10px] font-bold text-white flex items-center gap-1">
                <Code size={12} className="text-brand-400 shrink-0" />
                <span>Real-Time HTML Render Preview</span>
              </h3>

              <div className="flex bg-dark-950 border border-dark-700/60 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setPreviewMode("desktop")}
                  className={`p-0.5 rounded-md transition-all ${previewMode === "desktop" ? "bg-brand-500 text-white" : "text-dark-400"}`}
                  title="Desktop Preview"
                >
                  <Monitor size={10} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={`p-0.5 rounded-md transition-all ${previewMode === "mobile" ? "bg-brand-500 text-white" : "text-dark-400"}`}
                  title="Mobile Preview"
                >
                  <Smartphone size={10} />
                </button>
              </div>
            </div>

            <div className={`mx-auto bg-white rounded-lg overflow-hidden shadow-inner border border-dark-700/20 transition-all duration-300 ${
              previewMode === "mobile" ? "max-w-[280px] h-[330px]" : "w-full h-[330px]"
            }`}>
              {contentHtml ? (
                <iframe
                  title="Live Preview"
                  srcDoc={contentHtml.replace("{{name}}", "John Doe").replace("{{email}}", "john@domain.com")}
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-dark-900/10 text-dark-500 p-4 text-center gap-1">
                  <Monitor size={28} className="text-dark-700" />
                  <p className="text-[11px] font-bold text-dark-350">Live Preview Box</p>
                  <p className="text-[9px] mt-0.5 leading-normal max-w-[180px] mx-auto text-dark-400">Start writing HTML tags in the builder or click a dynamic preset layout to preview rendering details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ================== DETAILED SINGLE VIEW ================== */
        <div className="space-y-2.5 glass-panel p-2.5 rounded-lg border border-dark-700/30 shadow-md">
          <div className="flex items-center justify-between pb-1.5 border-b border-dark-700/15">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">Previewing: {previewTemplate?.name}</span>
              <span className="text-[9px] text-dark-400 font-semibold truncate max-w-[200px]">Subject: {previewTemplate?.subject}</span>
            </div>

            <div className="flex bg-dark-950 border border-dark-700/60 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`p-0.5 rounded-md transition-all ${previewMode === "desktop" ? "bg-brand-500 text-white" : "text-dark-400"}`}
              >
                <Monitor size={10} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`p-0.5 rounded-md transition-all ${previewMode === "mobile" ? "bg-brand-500 text-white" : "text-dark-400"}`}
              >
                <Smartphone size={10} />
              </button>
            </div>
          </div>

          <div className={`mx-auto bg-white rounded-lg overflow-hidden border border-dark-700/20 shadow-2xl transition-all duration-300 ${
            previewMode === "mobile" ? "max-w-[280px] h-[350px]" : "w-full h-[350px]"
          }`}>
            <iframe
              title="Saved Preview"
              srcDoc={previewTemplate?.content_html?.replace("{{name}}", "John Doe").replace("{{email}}", "john@domain.com") || ""}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
