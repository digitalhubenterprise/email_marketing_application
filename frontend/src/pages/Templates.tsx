import React, { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { useAuth } from '../App'
import { 
  FileText, 
  Plus, 
  Trash2, 
  Eye, 
  Layout, 
  Code, 
  Monitor, 
  Smartphone, 
  Mail, 
  ArrowLeft, 
  RefreshCw,
  Palette,
  Type,
  Image,
  Link,
  Sliders,
  ChevronUp,
  ChevronDown,
  Copy,
  FolderOpen
} from 'lucide-react'

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  content_html: string;
  created_at: string;
}

interface ContentBlock {
  id: string;
  type: "text" | "image" | "button" | "divider" | "spacer" | "social" | "two-col" | "three-col";
  content: string; // HTML or Text
  url?: string; // For images/links
  color?: string; // Text color, button color
  backgroundColor?: string;
  fontSize?: string;
  textAlign?: "left" | "center" | "right";
  paddingTop?: string;
  paddingBottom?: string;
  height?: string; // For spacers
  width?: string;
  borderRadius?: string;
  col1Content?: string;
  col2Content?: string;
  col3Content?: string;
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
  const [selectedCategory, setSelectedCategory] = useState<"welcome" | "promo" | "newsletter" | "cart" | "reengage">("welcome");

  // Visual Builder States
  const [builderMode, setBuilderMode] = useState<"visual" | "html">("visual");
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: "b1", type: "text", content: "<h2>Hi {{name}},</h2><p>Welcome to our official newsletter list. We have loaded our default template.</p>", textAlign: "left", fontSize: "14px", color: "#2d3748" },
    { id: "b2", type: "button", content: "Visit Website", url: "https://example.com", color: "#ffffff", backgroundColor: "#4c6ef5", textAlign: "center", borderRadius: "8px", paddingTop: "12px", paddingBottom: "12px" },
    { id: "b3", type: "divider", content: "" }
  ]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>("b1");

  // Account Brand settings
  const [brandPrimary, setBrandPrimary] = useState("#4c6ef5");
  const [brandSecondary, setBrandSecondary] = useState("#fab005");
  const [brandFont, setBrandFont] = useState("Inter");

  // Category template list definitions
  const presetTemplates = [
    // Welcome
    { id: "w1", cat: "welcome", name: "Welcome Onboarding Sequence", sub: "👋 Welcome to your new dashboard, let's get started!", blocks: [
      { id: "1", type: "text", content: "<h2>Welcome Aboard!</h2><p>We are absolutely thrilled to have you here {{name}}. Your account is fully activated.</p>", color: "#1a1c2e" },
      { id: "2", type: "button", content: "Get Started Now", url: "https://example.com/start", color: "#ffffff", backgroundColor: brandPrimary, borderRadius: "6px", textAlign: "center" },
      { id: "3", type: "text", content: "<p>If you have any questions, simply reply to this email.</p>", color: "#4a5568" }
    ]},
    { id: "w2", cat: "welcome", name: "SaaS Premium Intro", sub: "🚀 Let's optimize your deliverability paths", blocks: [
      { id: "1", type: "text", content: "<h2>Let's Scale Your Sends</h2><p>Hey {{name}}, here is a quick overview of what you can accomplish with your new premium SMTP routing nodes.</p>", color: "#1a1c2e" },
      { id: "2", type: "two-col", content: "", col1Content: "<h3>Fast Speeds</h3><p>Up to 10k hourly dispatches</p>", col2Content: "<h3>Auto Bounces</h3><p>Idempotent decoders flag blocks</p>" }
    ]},
    { id: "w3", cat: "welcome", name: "Warm Community Greeting", sub: "💬 Join our private Discord community inside!", blocks: [
      { id: "1", type: "text", content: "<h2>Welcome to the Community!</h2><p>Connect with 1,000+ marketers and scale your email flows seamlessly.</p>" },
      { id: "2", type: "button", content: "Join Community Chat", url: "https://discord.gg", color: "#ffffff", backgroundColor: "#5865F2", borderRadius: "8px", textAlign: "center" }
    ]},
    { id: "w4", cat: "welcome", name: "Product Warm-up Intro", sub: "📦 Quick walkthrough of your custom settings", blocks: [
      { id: "1", type: "text", content: "<h2>Ready to explore?</h2><p>Here are three quick tabs to configure first: SMTP Servers, Contacts Lists, and Campaigns.</p>" }
    ]},

    // Promo
    { id: "p1", cat: "promo", name: "Lifetime Deal Promo", sub: "🔥 30% Off Lifetime Deal — SmartCampaign Pro", blocks: [
      { id: "1", type: "text", content: "<span style='color:#e03131; font-weight:bold; font-size:11px;'>SPECIAL PROMOTION</span><h2>Get 30% Off Lifetime Pro</h2><p>Hi {{name}}, unlock unlimited contact imports and deep tracking dashboards.</p>", color: "#1a1c2e" },
      { id: "2", type: "button", content: "Claim 30% Discount", url: "https://example.com/promo", color: "#ffffff", backgroundColor: "#10b981", borderRadius: "6px", textAlign: "center" }
    ]},
    { id: "p2", cat: "promo", name: "Flash Sale Alert", sub: "⏳ Only 24 Hours Left! Get our exclusive bundle", blocks: [
      { id: "1", type: "text", content: "<h2>Hurry, Limited Time Only!</h2><p>We are running a 24-hour flash sale on all standard subscriptions.</p>" },
      { id: "2", type: "button", content: "Upgrade Package", url: "https://example.com/upgrade", color: "#ffffff", backgroundColor: "#e03131", borderRadius: "4px" }
    ]},
    { id: "p3", cat: "promo", name: "Black Friday Launch", sub: "🏷️ Black Friday deals have arrived early!", blocks: [
      { id: "1", type: "text", content: "<h2>Save big today!</h2><p>Use coupon code <b>BLACKFRIDAY</b> at checkout for a flat discount.</p>" }
    ]},
    { id: "p4", cat: "promo", name: "New Feature Showcase", sub: "✨ Upgrade: Drag & Drop React Block Builder", blocks: [
      { id: "1", type: "text", content: "<h2>Introducing Visual Editor</h2><p>Say goodbye to writing manual HTML tags. Drag blocks, configure CTA buttons, and preview on phone templates.</p>" }
    ]},

    // Newsletter
    { id: "n1", cat: "newsletter", name: "Monthly Tech Digest", sub: "📬 Your Monthly SaaS Digest Inside!", blocks: [
      { id: "1", type: "text", content: "<h2>Monthly SaaS Digest</h2><p>We're thrilled to share our core platform updates, custom database indexes, and faster API routes.</p>" },
      { id: "2", type: "divider", content: "" },
      { id: "3", type: "text", content: "<h3>🚀 Dynamic Multi-SMTP routing</h3><p>Manage and throttle dispatches seamlessly across custom delivery nodes.</p>" }
    ]},
    { id: "n2", cat: "newsletter", name: "Weekly Executive Summary", sub: "📊 Executive Trends & Email Marketing Metrics", blocks: [
      { id: "1", type: "text", content: "<h2>Weekly Market Trends</h2><p>Understanding delivery statistics, click margins, and mobile responsive checks.</p>" }
    ]},
    { id: "n3", cat: "newsletter", name: "Industry Insights Brief", sub: "💡 5 email deliverability rules you must know", blocks: [
      { id: "1", type: "text", content: "<h2>Keep spam rates below 0.1%</h2><p>Always verify custom domains with SPF, DKIM, and DMARC properties.</p>" }
    ]},
    { id: "n4", cat: "newsletter", name: "Product Changelog V2", sub: "🛠️ Changelog: Custom fields & tag segments", blocks: [
      { id: "1", type: "text", content: "<h2>Custom Fields & Tagging</h2><p>You can now map CSV files into key-value JSON parameters dynamically.</p>" }
    ]},

    // Abandoned Cart
    { id: "c1", cat: "cart", name: "Forgot Something Reminder", sub: "🛒 Did you leave something in your cart?", blocks: [
      { id: "1", type: "text", content: "<h2>Don't miss out!</h2><p>Hi {{name}}, we noticed you left items in your shopping cart. We have reserved them for a limited time.</p>" },
      { id: "2", type: "button", content: "Complete Checkout", url: "https://example.com/cart", color: "#ffffff", backgroundColor: brandPrimary, borderRadius: "6px" }
    ]},
    { id: "c2", cat: "cart", name: "10% Cart Recover Coupon", sub: "🎁 Still thinking? Take 10% off your cart items!", blocks: [
      { id: "1", type: "text", content: "<h2>Here is 10% off</h2><p>Complete your order now using coupon code <b>RECOVER10</b> at checkout.</p>" }
    ]},
    { id: "c3", cat: "cart", name: "Order Reservation Warning", sub: "⚠️ Warning: Your cart reservation is expiring!", blocks: [
      { id: "1", type: "text", content: "<h2>Final Nudge</h2><p>Items in your cart are in high demand and will be released to other shoppers shortly.</p>" }
    ]},
    { id: "c4", cat: "cart", name: "Checkout Nudge Alert", sub: "⚡ Checkout now to receive free shipping", blocks: [
      { id: "1", type: "text", content: "<h2>Free shipping unlocked!</h2><p>We've added free shipping to your pending order. Click below to checkout.</p>" }
    ]},

    // Re-engagement
    { id: "r1", cat: "reengage", name: "We Miss You Email", sub: "❤️ We haven't seen you in a while...", blocks: [
      { id: "1", type: "text", content: "<h2>We miss you, {{name}}!</h2><p>We have added multiple templates and visual grids since your last send. Come back and check them out.</p>" },
      { id: "2", type: "button", content: "Reactivate Account", url: "https://example.com/reactivate", color: "#ffffff", backgroundColor: "#ab33e5", borderRadius: "8px" }
    ]},
    { id: "r2", cat: "reengage", name: "$10 Free Reactivation Gift", sub: "💵 We've credited your account with $10!", blocks: [
      { id: "1", type: "text", content: "<h2>Here is a $10 credit</h2><p>Use it toward any premium monthly plan or contact expansion pack.</p>" }
    ]},
    { id: "r3", cat: "reengage", name: "Founder Quick Check-in", sub: "💬 Quick question from our founder...", blocks: [
      { id: "1", type: "text", content: "<p>Hey {{name}},</p><p>I noticed you haven't sent any email templates recently. Is there anything we can build to make your flows easier?</p><p>Regards,<br/>Alex, Founder</p>" }
    ]},
    { id: "r4", cat: "reengage", name: "Account Warning Deactivation", sub: "⚠️ Inactive account: action required to keep templates", blocks: [
      { id: "1", type: "text", content: "<h2>Keep your designs safe</h2><p>Log in within 7 days to ensure your templates library remains active.</p>" }
    ]}
  ];

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setTemplates(await res.json());
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
    const finalHtml = builderMode === "visual" ? compileBlocksToHtml() : contentHtml;
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, subject, content_html: finalHtml })
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
        setTemplates(templates.filter(t => t.id !== id));
        if (previewTemplate?.id === id) {
          setPreviewTemplate(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPresetLayout = (p: any) => {
    setName(p.name);
    setSubject(p.sub);
    setBlocks(p.blocks.map((b: any) => ({
      ...b,
      id: Math.random().toString(36).slice(2, 11),
      col1Content: b.col1Content || "",
      col2Content: b.col2Content || "",
      col3Content: b.col3Content || ""
    })) as ContentBlock[]);
  };

  const compileBlocksToHtml = (): string => {
    let body = "";
    blocks.forEach(b => {
      const align = b.textAlign || "left";
      const padTop = b.paddingTop || "10px";
      const padBot = b.paddingBottom || "10px";
      const color = b.color || "#333333";

      if (b.type === "text") {
        body += `<tr><td align="${align}" style="padding-top:${padTop}; padding-bottom:${padBot}; color:${color}; font-size:${b.fontSize || '14px'}; font-family:${brandFont}, sans-serif; line-height:1.5;">${b.content}</td></tr>`;
      } else if (b.type === "button") {
        body += `<tr><td align="${align}" style="padding-top:${padTop}; padding-bottom:${padBot};">
          <table border="0" cellpadding="0" cellspacing="0" style="display:inline-block;">
            <tr>
              <td align="center" bgcolor="${b.backgroundColor || brandPrimary}" style="border-radius:${b.borderRadius || '6px'};">
                <a href="${b.url || '#'}" target="_blank" style="font-size:12px; font-weight:bold; color:${color}; text-decoration:none; padding:10px 20px; display:inline-block; font-family:${brandFont}, sans-serif;">${b.content}</a>
              </td>
            </tr>
          </table>
        </td></tr>`;
      } else if (b.type === "image") {
        body += `<tr><td align="${align}" style="padding-top:${padTop}; padding-bottom:${padBot};">
          <img src="${b.url || 'https://via.placeholder.com/400x150'}" alt="Image" style="max-width:100%; height:auto; border-radius:${b.borderRadius || '0px'};" />
        </td></tr>`;
      } else if (b.type === "divider") {
        body += `<tr><td style="padding-top:${padTop}; padding-bottom:${padBot};"><hr style="border:0; border-top:1px solid #e2e8f0;" /></td></tr>`;
      } else if (b.type === "spacer") {
        body += `<tr><td style="height:${b.height || '20px'};"></td></tr>`;
      } else if (b.type === "two-col") {
        body += `<tr><td style="padding-top:${padTop}; padding-bottom:${padBot};">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" valign="top" style="font-family:${brandFont}, sans-serif; font-size:13px; color:#4a5568; line-height:1.5;">${b.col1Content || 'Column 1'}</td>
              <td width="4%"></td>
              <td width="48%" valign="top" style="font-family:${brandFont}, sans-serif; font-size:13px; color:#4a5568; line-height:1.5;">${b.col2Content || 'Column 2'}</td>
            </tr>
          </table>
        </td></tr>`;
      } else if (b.type === "three-col") {
        body += `<tr><td style="padding-top:${padTop}; padding-bottom:${padBot};">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td width="30%" valign="top" style="font-family:${brandFont}, sans-serif; font-size:13px; color:#4a5568; line-height:1.5;">${b.col1Content || 'Column 1'}</td>
              <td width="5%"></td>
              <td width="30%" valign="top" style="font-family:${brandFont}, sans-serif; font-size:13px; color:#4a5568; line-height:1.5;">${b.col2Content || 'Column 2'}</td>
              <td width="5%"></td>
              <td width="30%" valign="top" style="font-family:${brandFont}, sans-serif; font-size:13px; color:#4a5568; line-height:1.5;">${b.col3Content || 'Column 3'}</td>
            </tr>
          </table>
        </td></tr>`;
      }
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@400;600;700&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
  <title>SmartCampaign</title>
</head>
<body style="font-family:'${brandFont}', Arial, sans-serif; background-color:#f8f9fa; margin:0; padding:20px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width:600px; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
          <!-- Header Banner -->
          <tr>
            <td align="center" bgcolor="${brandPrimary}" style="padding:30px 20px;">
              <h1 style="color:#ffffff; margin:0; font-size:24px; font-family:'${brandFont}', sans-serif; font-weight:700;">SmartCampaign</h1>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:30px 24px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                ${body}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px; background-color:#f8f9fa; font-size:11px; color:#a0aec0; border-top:1px solid #edf2f7;">
              <p style="margin:0;">Sent by SmartCampaign. All rights reserved.</p>
              <p style="margin:5px 0 0 0;"><a href="{{unsubscribe}}" style="color:${brandPrimary}; text-decoration:none; font-weight:600;">Unsubscribe</a> from this list.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const addBlock = (type: ContentBlock["type"]) => {
    const newId = Math.random().toString(36).slice(2, 11);
    let newBlock: ContentBlock = { id: newId, type, content: "New block content", textAlign: "left" };

    if (type === "button") {
      newBlock = { id: newId, type, content: "Click Here", url: "https://example.com", color: "#ffffff", backgroundColor: brandPrimary, borderRadius: "6px", textAlign: "center" };
    } else if (type === "image") {
      newBlock = { id: newId, type, content: "", url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=60", borderRadius: "8px", textAlign: "center" };
    } else if (type === "divider") {
      newBlock = { id: newId, type, content: "" };
    } else if (type === "spacer") {
      newBlock = { id: newId, type, content: "", height: "20px" };
    } else if (type === "two-col") {
      newBlock = { id: newId, type, content: "", col1Content: "<h3>Column 1</h3><p>Enter details</p>", col2Content: "<h3>Column 2</h3><p>Enter details</p>" };
    } else if (type === "three-col") {
      newBlock = { id: newId, type, content: "", col1Content: "<h3>Col 1</h3>", col2Content: "<h3>Col 2</h3>", col3Content: "<h3>Col 3</h3>" };
    }

    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newId);
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } as ContentBlock : b));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;
    setBlocks(newBlocks);
  };

  const cloneBlock = (b: ContentBlock) => {
    const newId = Math.random().toString(36).slice(2, 11);
    const cloned = { ...b, id: newId };
    setBlocks([...blocks, cloned]);
    setSelectedBlockId(newId);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const activeSelectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-dark-700/25">
        <div className="flex items-center gap-2">
          {(previewTemplate || showCreator) && (
            <button
              onClick={() => {
                setPreviewTemplate(null);
                setShowCreator(false);
              }}
              className="p-1.5 bg-dark-950 hover:bg-dark-900 text-dark-400 hover:text-white rounded-lg border border-dark-700/50 transition-colors"
            >
              <ArrowLeft size={13} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Layout size={18} className="text-brand-400 shrink-0" />
              <span>
                {showCreator 
                  ? "Visual Design Workspace" 
                  : previewTemplate 
                    ? `Review Design: ${previewTemplate.name}` 
                    : "Email Templates Builder"
                }
              </span>
            </h2>
            <p className="text-[10px] text-dark-400 mt-0.5">Construct responsive blocks layouts and personalize subject templates with custom CRM tags.</p>
          </div>
        </div>

        {!previewTemplate && !showCreator && (
          <button
            onClick={() => {
              setShowCreator(true);
              setName("");
              setSubject("");
              setBlocks([
                { id: "b1", type: "text", content: "<h2>Hi {{first_name | 'Friend'}},</h2><p>Enter your content blocks here. Custom fields like {{company}} are auto-mapped.</p>" }
              ]);
            }}
            className="flex items-center gap-1.5 px-3 py-2 brand-gradient-bg text-white text-xs font-bold rounded-lg shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            <Plus size={14} />
            <span>Launch Visual Builder</span>
          </button>
        )}
      </div>

      {!showCreator && !previewTemplate ? (
        /* ================== DISPLAY SAVED LIST ================== */
        <div>
          {loading ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="animate-spin text-brand-500" size={18} />
            </div>
          ) : templates.length > 0 ? (
            <div className="glass-panel overflow-hidden border border-dark-700/30 rounded-xl shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700/40 bg-dark-950/40 text-[9px] font-bold text-dark-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Template name</th>
                      <th className="py-2.5 px-4">Subject path</th>
                      <th className="py-2.5 px-4 text-right">Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800/30 text-[11px] text-dark-200">
                    {templates.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setPreviewTemplate(t)}
                        className="hover:bg-dark-900/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <Layout size={12} className="text-brand-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{t.name}</span>
                        </td>
                        <td className="py-3 px-4 text-dark-350 font-mono">
                          {t.subject}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewTemplate(t)}
                              className="p-1 bg-dark-950 hover:bg-dark-900 text-brand-400 hover:text-white border border-dark-800 rounded-md transition-colors"
                              title="Preview"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(t.id, e)}
                              className="p-1 bg-dark-950 hover:bg-rose-500/10 text-dark-500 hover:text-rose-400 border border-dark-800 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={12} />
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
            <div className="text-center py-20 border border-dashed border-dark-700/50 rounded-xl bg-dark-900/25 flex flex-col items-center justify-center gap-2">
              <FileText size={18} className="text-dark-500" />
              <div>
                <p className="text-xs font-bold text-white">No saved email templates</p>
                <p className="text-[10px] text-dark-500 mt-0.5 max-w-[200px] mx-auto leading-normal">Open the workspace visual builder above to load dynamic grids and CTA modules.</p>
              </div>
            </div>
          )}
        </div>
      ) : showCreator ? (
        /* ================== VISUAL DRAG & DROP BUILDER ================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Left panel: Available layouts, template library */}
          <div className="lg:col-span-3 space-y-3">
            {/* Curated template library */}
            <div className="glass-panel p-3 rounded-xl border border-dark-700/30 space-y-3">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                <FolderOpen size={12} className="text-brand-400" />
                <span>20+ Elegant Presets</span>
              </h4>

              {/* Category selector */}
              <div className="grid grid-cols-5 gap-0.5 bg-dark-950 p-0.5 border border-dark-800 rounded-lg">
                <button
                  type="button" onClick={() => setSelectedCategory("welcome")}
                  className={`py-1 text-[8px] font-bold rounded-md transition-all ${selectedCategory === "welcome" ? "bg-brand-500 text-white" : "text-dark-400 hover:text-white"}`}
                  title="Welcome sequence"
                >
                  Welcome
                </button>
                <button
                  type="button" onClick={() => setSelectedCategory("promo")}
                  className={`py-1 text-[8px] font-bold rounded-md transition-all ${selectedCategory === "promo" ? "bg-brand-500 text-white" : "text-dark-400 hover:text-white"}`}
                  title="Product promotion"
                >
                  Promo
                </button>
                <button
                  type="button" onClick={() => setSelectedCategory("newsletter")}
                  className={`py-1 text-[8px] font-bold rounded-md transition-all ${selectedCategory === "newsletter" ? "bg-brand-500 text-white" : "text-dark-400 hover:text-white"}`}
                  title="Monthly digest"
                >
                  News
                </button>
                <button
                  type="button" onClick={() => setSelectedCategory("cart")}
                  className={`py-1 text-[8px] font-bold rounded-md transition-all ${selectedCategory === "cart" ? "bg-brand-500 text-white" : "text-dark-400 hover:text-white"}`}
                  title="Abandoned Cart"
                >
                  Cart
                </button>
                <button
                  type="button" onClick={() => setSelectedCategory("reengage")}
                  className={`py-1 text-[8px] font-bold rounded-md transition-all ${selectedCategory === "reengage" ? "bg-brand-500 text-white" : "text-dark-400 hover:text-white"}`}
                  title="Re-engagement"
                >
                  Re
                </button>
              </div>

              {/* Filtered layouts catalog */}
              <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                {presetTemplates
                  .filter(p => p.cat === selectedCategory)
                  .map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => loadPresetLayout(p)}
                      className="w-full text-left px-2 py-1.5 bg-dark-950 hover:bg-dark-900 border border-dark-800 hover:border-brand-500/40 rounded-lg text-[9.5px] font-bold text-dark-200 transition-all flex items-center justify-between"
                    >
                      <span className="truncate max-w-[140px]">{p.name}</span>
                      <Plus size={10} className="text-brand-400" />
                    </button>
                  ))}
              </div>
            </div>

            {/* Layout Canvas Blocks List */}
            <div className="glass-panel p-3 rounded-xl border border-dark-700/30 space-y-2">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-dark-700/10 pb-1.5">
                <Sliders size={12} className="text-brand-400" />
                <span>Available Block Types</span>
              </h4>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button" onClick={() => addBlock("text")}
                  className="p-2 bg-dark-950 hover:bg-dark-900 border border-dark-800 rounded-lg text-[10px] font-bold text-white flex flex-col items-center justify-center gap-1.5 hover:border-brand-500/40 transition-all"
                >
                  <Type size={14} className="text-brand-400" />
                  <span>Text Body</span>
                </button>
                <button
                  type="button" onClick={() => addBlock("image")}
                  className="p-2 bg-dark-950 hover:bg-dark-900 border border-dark-800 rounded-lg text-[10px] font-bold text-white flex flex-col items-center justify-center gap-1.5 hover:border-brand-500/40 transition-all"
                >
                  <Image size={14} className="text-brand-400" />
                  <span>Image Block</span>
                </button>
                <button
                  type="button" onClick={() => addBlock("button")}
                  className="p-2 bg-dark-950 hover:bg-dark-900 border border-dark-800 rounded-lg text-[10px] font-bold text-white flex flex-col items-center justify-center gap-1.5 hover:border-brand-500/40 transition-all"
                >
                  <Link size={14} className="text-brand-400" />
                  <span>CTA Button</span>
                </button>
                <button
                  type="button" onClick={() => addBlock("divider")}
                  className="p-2 bg-dark-950 hover:bg-dark-900 border border-dark-800 rounded-lg text-[10px] font-bold text-white flex flex-col items-center justify-center gap-1.5 hover:border-brand-500/40 transition-all"
                >
                  <Sliders size={14} className="text-brand-400" />
                  <span>Divider Row</span>
                </button>
                <button
                  type="button" onClick={() => addBlock("two-col")}
                  className="p-2 bg-dark-950 hover:bg-dark-900 border border-dark-800 rounded-lg text-[10px] font-bold text-white flex flex-col items-center justify-center gap-1.5 hover:border-brand-500/40 transition-all"
                >
                  <Layout size={14} className="text-brand-400" />
                  <span>2-Col Row</span>
                </button>
                <button
                  type="button" onClick={() => addBlock("three-col")}
                  className="p-2 bg-dark-950 hover:bg-dark-900 border border-dark-800 rounded-lg text-[10px] font-bold text-white flex flex-col items-center justify-center gap-1.5 hover:border-brand-500/40 transition-all"
                >
                  <Layout size={14} className="text-brand-400" />
                  <span>3-Col Row</span>
                </button>
              </div>
            </div>

            {/* Global Account Brand Defaults */}
            <div className="glass-panel p-3 rounded-xl border border-dark-700/30 space-y-2">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={12} className="text-brand-400" />
                <span>Account Brand colors</span>
              </h4>
              <div className="space-y-1.5 pt-1 border-t border-dark-700/10 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-dark-400">Primary Color</span>
                  <input
                    type="color" value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)}
                    className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dark-400">Secondary Color</span>
                  <input
                    type="color" value={brandSecondary} onChange={e => setBrandSecondary(e.target.value)}
                    className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dark-400">Font Family</span>
                  <select
                    value={brandFont} onChange={e => setBrandFont(e.target.value)}
                    className="bg-dark-950 text-white border border-dark-800 px-1 py-0.5 rounded text-[9.5px] cursor-pointer"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Outfit">Outfit</option>
                    <option value="Roboto">Roboto</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Center panel: Live interactive editor & wizard setup */}
          <div className="lg:col-span-6 space-y-3">
            {/* Top Wizard Config inputs */}
            <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 space-y-2.5 shadow-md shadow-dark-950/15">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Template Name</label>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Welcome sequence"
                    className="w-full px-3 py-1.5 bg-dark-950/50 hover:bg-dark-950/70 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Email Subject</label>
                  <input
                    type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Hi {{first_name}}, welcome aboard!"
                    className="w-full px-3 py-1.5 bg-dark-950/50 hover:bg-dark-950/70 border border-dark-700/40 rounded-lg text-xs text-white focus:outline-none placeholder:text-dark-600 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Interactive Blocks list canvas wrapper */}
            <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 flex flex-col gap-2.5 min-h-[360px]">
              <div className="flex justify-between items-center border-b border-dark-700/10 pb-2">
                <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">Interactive Live Canvas Editor</span>
                
                {/* HTML Source code switch */}
                <div className="flex bg-dark-950 border border-dark-800 p-0.5 rounded-md">
                  <button
                    type="button" onClick={() => setBuilderMode("visual")}
                    className={`px-2 py-0.5 text-[8.5px] font-bold rounded-md transition-all ${builderMode === "visual" ? "bg-brand-500 text-white" : "text-dark-400 hover:text-white"}`}
                  >
                    Visual blocks
                  </button>
                  <button
                    type="button" onClick={() => setBuilderMode("html")}
                    className={`px-2 py-0.5 text-[8.5px] font-bold rounded-md transition-all ${builderMode === "html" ? "bg-brand-500 text-white" : "text-dark-400 hover:text-white"}`}
                  >
                    HTML source
                  </button>
                </div>
              </div>

              {builderMode === "html" ? (
                <textarea
                  value={contentHtml} onChange={e => setContentHtml(e.target.value)}
                  placeholder="Write direct responsive HTML source code..."
                  rows={14}
                  className="w-full px-3 py-2 bg-dark-950/40 hover:bg-dark-950/65 focus:bg-dark-950/80 border border-dark-700/50 rounded-lg text-[11.5px] font-mono text-white focus:outline-none leading-normal h-[330px]"
                />
              ) : (
                /* Dynamic interactive blocks rendering */
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {blocks.map((b, idx) => {
                    const isSelected = selectedBlockId === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBlockId(b.id)}
                        className={`group relative p-3 border rounded-xl cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? "bg-dark-950 border-brand-500 shadow-md shadow-brand-500/5" 
                            : "bg-dark-950/50 border-dark-750 hover:bg-dark-950/80"
                        }`}
                      >
                        {/* Block type label & context buttons */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[7.5px] font-extrabold uppercase bg-dark-900 border border-dark-800 text-brand-400 px-1 py-0.5 rounded tracking-wider">
                            {b.type} block
                          </span>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button" onClick={(e) => { e.stopPropagation(); moveBlock(idx, "up"); }}
                              className="p-0.5 hover:bg-dark-800 text-dark-450 hover:text-white rounded border border-dark-800"
                            >
                              <ChevronUp size={10} />
                            </button>
                            <button
                              type="button" onClick={(e) => { e.stopPropagation(); moveBlock(idx, "down"); }}
                              className="p-0.5 hover:bg-dark-800 text-dark-450 hover:text-white rounded border border-dark-800"
                            >
                              <ChevronDown size={10} />
                            </button>
                            <button
                              type="button" onClick={(e) => { e.stopPropagation(); cloneBlock(b); }}
                              className="p-0.5 hover:bg-dark-800 text-dark-450 hover:text-white rounded border border-dark-800"
                              title="Clone"
                            >
                              <Copy size={10} />
                            </button>
                            <button
                              type="button" onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }}
                              className="p-0.5 hover:bg-rose-500/10 text-dark-450 hover:text-rose-400 rounded border border-dark-800"
                              title="Delete"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>

                        {/* Block preview rendering content */}
                        <div className="text-[11px] text-white">
                          {b.type === "text" && (
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.content || "<p style='color:#a0aec0;'>[Double-click right editor to write text...]</p>") }} />
                          )}
                          {b.type === "button" && (
                            <div className="flex justify-center my-1.5">
                              <span
                                style={{
                                  backgroundColor: b.backgroundColor || brandPrimary,
                                  color: b.color || "#ffffff",
                                  borderRadius: b.borderRadius || "6px"
                                }}
                                className="px-4 py-1.5 text-[10px] font-bold"
                              >
                                {b.content}
                              </span>
                            </div>
                          )}
                          {b.type === "image" && (
                            <div className="flex justify-center my-1">
                              <img
                                src={b.url || "https://via.placeholder.com/200x60"}
                                alt="Block Graphic"
                                className="max-h-[60px] object-cover rounded-lg border border-dark-800"
                              />
                            </div>
                          )}
                          {b.type === "divider" && (
                            <hr className="border-0 border-t border-dark-800/80 my-2" />
                          )}
                          {b.type === "spacer" && (
                            <div style={{ height: b.height || '20px' }} className="border border-dashed border-dark-800 flex items-center justify-center text-[7.5px] text-dark-500">
                              Spacer Block ({b.height || '20px'})
                            </div>
                          )}
                          {b.type === "two-col" && (
                            <div className="grid grid-cols-2 gap-2 bg-dark-900/30 p-2 rounded-lg border border-dark-800">
                              <div className="p-1 border border-dashed border-dark-750/30 rounded text-[9.5px]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.col1Content || "Column 1") }} />
                              <div className="p-1 border border-dashed border-dark-750/30 rounded text-[9.5px]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.col2Content || "Column 2") }} />
                            </div>
                          )}
                          {b.type === "three-col" && (
                            <div className="grid grid-cols-3 gap-2 bg-dark-900/30 p-2 rounded-lg border border-dark-800">
                              <div className="p-1 border border-dashed border-dark-750/30 rounded text-[9.5px]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.col1Content || "Column 1") }} />
                              <div className="p-1 border border-dashed border-dark-750/30 rounded text-[9.5px]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.col2Content || "Column 2") }} />
                              <div className="p-1 border border-dashed border-dark-750/30 rounded text-[9.5px]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.col3Content || "Column 3") }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Footer dispatches */}
              <div className="mt-auto border-t border-dark-700/10 pt-2.5">
                <button
                  onClick={handleCreate}
                  disabled={!name || !subject}
                  className="w-full py-2 brand-gradient-bg text-white font-bold rounded-lg text-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 glow-btn disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={12} />
                  <span>Compile and Save Design Template</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: Block settings properties inspector or interactive Frame preview */}
          <div className="lg:col-span-3 space-y-3.5">
            {/* Properties inspector */}
            <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 space-y-2.5 shadow-md shadow-dark-950/15">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-dark-700/10 pb-1.5">
                <Sliders size={12} className="text-brand-400" />
                <span>Properties Inspector</span>
              </h4>

              {activeSelectedBlock ? (
                <div className="space-y-2.5 text-[10px] text-dark-300">
                  <span className="font-bold text-white uppercase tracking-wide bg-dark-900 border border-dark-800 px-1 py-0.5 rounded text-[8px]">
                    Editing {activeSelectedBlock.type}
                  </span>

                  {(activeSelectedBlock.type === "text" || activeSelectedBlock.type === "button") && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-dark-400">Content / CTA Label</label>
                      {activeSelectedBlock.type === "text" ? (
                        <textarea
                          value={activeSelectedBlock.content}
                          onChange={e => updateBlock(activeSelectedBlock.id, { content: e.target.value })}
                          rows={4}
                          className="w-full px-2 py-1 bg-dark-950 hover:bg-dark-950/80 border border-dark-800 rounded-lg text-white font-mono text-[9px] leading-normal"
                        />
                      ) : (
                        <input
                          type="text" value={activeSelectedBlock.content}
                          onChange={e => updateBlock(activeSelectedBlock.id, { content: e.target.value })}
                          className="w-full px-2.5 py-1 bg-dark-950 hover:bg-dark-950/80 border border-dark-800 rounded-lg text-white font-bold"
                        />
                      )}
                    </div>
                  )}

                  {activeSelectedBlock.type === "image" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-dark-400">Image Asset URL</label>
                      <input
                        type="text" value={activeSelectedBlock.url || ""}
                        onChange={e => updateBlock(activeSelectedBlock.id, { url: e.target.value })}
                        placeholder="https://example.com/asset.jpg"
                        className="w-full px-2.5 py-1 bg-dark-950 hover:bg-dark-950/80 border border-dark-800 rounded-lg text-white font-bold"
                      />
                    </div>
                  )}

                  {activeSelectedBlock.type === "button" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-dark-400">Destination Link (URL)</label>
                      <input
                        type="text" value={activeSelectedBlock.url || ""}
                        onChange={e => updateBlock(activeSelectedBlock.id, { url: e.target.value })}
                        className="w-full px-2.5 py-1 bg-dark-950 hover:bg-dark-950/80 border border-dark-800 rounded-lg text-white font-mono text-[9px]"
                      />
                    </div>
                  )}

                  {(activeSelectedBlock.type === "two-col" || activeSelectedBlock.type === "three-col") && (
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-dark-400">Column 1 Content</label>
                        <textarea
                          value={activeSelectedBlock.col1Content || ""}
                          onChange={e => updateBlock(activeSelectedBlock.id, { col1Content: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 bg-dark-950 border border-dark-800 rounded text-white text-[9px]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-dark-400">Column 2 Content</label>
                        <textarea
                          value={activeSelectedBlock.col2Content || ""}
                          onChange={e => updateBlock(activeSelectedBlock.id, { col2Content: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 bg-dark-950 border border-dark-800 rounded text-white text-[9px]"
                        />
                      </div>
                      {activeSelectedBlock.type === "three-col" && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-dark-400">Column 3 Content</label>
                          <textarea
                            value={activeSelectedBlock.col3Content || ""}
                            onChange={e => updateBlock(activeSelectedBlock.id, { col3Content: e.target.value })}
                            rows={2}
                            className="w-full px-2 py-1 bg-dark-950 border border-dark-800 rounded text-white text-[9px]"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {activeSelectedBlock.type === "spacer" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-dark-400">Height (pixels)</label>
                      <input
                        type="text" value={activeSelectedBlock.height || "20px"}
                        onChange={e => updateBlock(activeSelectedBlock.id, { height: e.target.value })}
                        className="w-full px-2.5 py-1 bg-dark-950 hover:bg-dark-950/80 border border-dark-800 rounded-lg text-white font-bold"
                      />
                    </div>
                  )}

                  {/* Formatting selectors */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dark-700/10">
                    {activeSelectedBlock.textAlign !== undefined && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-dark-400">Alignment</label>
                        <select
                          value={activeSelectedBlock.textAlign || "left"}
                          onChange={e => updateBlock(activeSelectedBlock.id, { textAlign: e.target.value as any })}
                          className="bg-dark-950 text-white border border-dark-800 px-1 py-0.5 rounded text-[9.5px]"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    )}
                    {activeSelectedBlock.borderRadius !== undefined && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-dark-400">Corners (radius)</label>
                        <input
                          type="text" value={activeSelectedBlock.borderRadius || "6px"}
                          onChange={e => updateBlock(activeSelectedBlock.id, { borderRadius: e.target.value })}
                          className="w-full px-2 bg-dark-950 border border-dark-800 rounded py-0.5 text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-dark-500">
                  <Sliders size={14} className="mx-auto mb-1 text-dark-700" />
                  <span>Choose any canvas block to inspect properties.</span>
                </div>
              )}
            </div>

            {/* Live frame renderer (device frame bezel) */}
            <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 shadow-md shadow-dark-950/15 flex flex-col gap-2">
              <div className="flex justify-between items-center pb-2 border-b border-dark-700/10">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Bezel Mock Preview</span>
                
                <div className="flex bg-dark-950 border border-dark-800 p-0.5 rounded-md">
                  <button
                    type="button" onClick={() => setPreviewMode("desktop")}
                    className={`p-0.5 rounded transition-all ${previewMode === "desktop" ? "bg-brand-500 text-white" : "text-dark-400"}`}
                  >
                    <Monitor size={10} />
                  </button>
                  <button
                    type="button" onClick={() => setPreviewMode("mobile")}
                    className={`p-0.5 rounded transition-all ${previewMode === "mobile" ? "bg-brand-500 text-white" : "text-dark-400"}`}
                  >
                    <Smartphone size={10} />
                  </button>
                </div>
              </div>

              <div className={`mx-auto bg-white rounded-lg overflow-hidden border border-dark-750/30 transition-all duration-300 ${
                previewMode === "mobile" ? "max-w-[200px] h-[240px] border-8 border-dark-950 rounded-2xl" : "w-full h-[240px]"
              }`}>
                <iframe
                  title="Block Canvas Bezel Render"
                  srcDoc={builderMode === "visual" ? compileBlocksToHtml().replace("{{name}}", "John Doe").replace("{{email}}", "john@domain.com") : contentHtml}
                  className="w-full h-full border-0"
                  sandbox=""
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================== DETAILED SINGLE VIEW ================== */
        <div className="space-y-3.5">
          <div className="glass-panel p-3.5 rounded-xl border border-dark-700/30 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">Previewing Template: {previewTemplate?.name}</span>
              <span className="text-[9.5px] text-brand-400 font-mono">Subject: {previewTemplate?.subject}</span>
            </div>

            <div className="flex bg-dark-950 border border-dark-800 p-0.5 rounded-md">
              <button
                type="button" onClick={() => setPreviewMode("desktop")}
                className={`p-1 rounded transition-all ${previewMode === "desktop" ? "bg-brand-500 text-white" : "text-dark-400"}`}
              >
                <Monitor size={11} />
              </button>
              <button
                type="button" onClick={() => setPreviewMode("mobile")}
                className={`p-1 rounded transition-all ${previewMode === "mobile" ? "bg-brand-500 text-white" : "text-dark-400"}`}
              >
                <Smartphone size={11} />
              </button>
            </div>
          </div>

          <div className={`mx-auto bg-white rounded-xl overflow-hidden border border-dark-750/30 shadow-2xl transition-all duration-300 ${
            previewMode === "mobile" ? "max-w-[340px] h-[480px] border-[12px] border-dark-950 rounded-3xl" : "w-full h-[480px]"
          }`}>
            <iframe
              title="Saved Design Bezel Preview"
              srcDoc={previewTemplate?.content_html?.replace("{{name}}", "John Doe").replace("{{email}}", "john@domain.com") || ""}
              className="w-full h-full border-0"
              sandbox=""
            />
          </div>
        </div>
      )}
    </div>
  );
}
