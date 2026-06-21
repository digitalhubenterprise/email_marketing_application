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
  Image as ImageIcon,
  Link as LinkIcon,
  Sliders,
  ChevronUp,
  ChevronDown,
  Copy,
  FolderOpen,
  Search,
  Check,
  ExternalLink,
  Sparkles,
  Layers,
  Settings,
  Paintbrush
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
  const [searchQuery, setSearchQuery] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [contentHtml, setContentHtml] = useState("");

  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showCreator, setShowCreator] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"welcome" | "promo" | "newsletter" | "cart" | "reengage">("welcome");

  // Mobile/Tablet responsive active builder tab
  const [activeBuilderTab, setActiveBuilderTab] = useState<"design" | "canvas" | "preview">("canvas");

  // Visual Builder States
  const [builderMode, setBuilderMode] = useState<"visual" | "html">("visual");
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: "b1", type: "text", content: "<h2>Hi {{first_name | 'Friend'}},</h2><p>Welcome to our official newsletter list. We have loaded our default template.</p>", textAlign: "left", fontSize: "14px", color: "#2d3748" },
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
      { id: "1", type: "text", content: "<h2>Welcome Aboard!</h2><p>We are absolutely thrilled to have you here {{first_name | 'Friend'}}. Your account is fully activated.</p>", color: "#1a1c2e" },
      { id: "2", type: "button", content: "Get Started Now", url: "https://example.com/start", color: "#ffffff", backgroundColor: brandPrimary, borderRadius: "6px", textAlign: "center" },
      { id: "3", type: "text", content: "<p>If you have any questions, simply reply to this email.</p>", color: "#4a5568" }
    ]},
    { id: "w2", cat: "welcome", name: "SaaS Premium Intro", sub: "🚀 Let's optimize your deliverability paths", blocks: [
      { id: "1", type: "text", content: "<h2>Let's Scale Your Sends</h2><p>Hey {{first_name | 'Friend'}}, here is a quick overview of what you can accomplish with your new premium SMTP routing nodes.</p>", color: "#1a1c2e" },
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
      { id: "1", type: "text", content: "<span style='color:#e03131; font-weight:bold; font-size:11px;'>SPECIAL PROMOTION</span><h2>Get 30% Off Lifetime Pro</h2><p>Hi {{first_name | 'Friend'}}, unlock unlimited contact imports and deep tracking dashboards.</p>", color: "#1a1c2e" },
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
      { id: "1", type: "text", content: "<h2>Don't miss out!</h2><p>Hi {{first_name | 'Friend'}}, we noticed you left items in your shopping cart. We have reserved them for a limited time.</p>" },
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
      { id: "1", type: "text", content: "<h2>We miss you, {{first_name | 'Friend'}}!</h2><p>We have added multiple templates and visual grids since your last send. Come back and check them out.</p>" },
      { id: "2", type: "button", content: "Reactivate Account", url: "https://example.com/reactivate", color: "#ffffff", backgroundColor: "#ab33e5", borderRadius: "8px" }
    ]},
    { id: "r2", cat: "reengage", name: "$10 Free Reactivation Gift", sub: "💵 We've credited your account with $10!", blocks: [
      { id: "1", type: "text", content: "<h2>Here is a $10 credit</h2><p>Use it toward any premium monthly plan or contact expansion pack.</p>" }
    ]},
    { id: "r3", cat: "reengage", name: "Founder Quick Check-in", sub: "💬 Quick question from our founder...", blocks: [
      { id: "1", type: "text", content: "<p>Hey {{first_name | 'Friend'}},</p><p>I noticed you haven't sent any email templates recently. Is there anything we can build to make your flows easier?</p><p>Regards,<br/>Alex, Founder</p>" }
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

    // On mobile viewports, automatically switch tabs to let them see the loaded canvas
    if (window.innerWidth < 1024) {
      setActiveBuilderTab("canvas");
    }
  };

  const compileBlocksToHtml = (): string => {
    let body = "";
    blocks.forEach(b => {
      const align = b.textAlign || "left";
      const padTop = b.paddingTop || "10px";
      const padBot = b.paddingBottom || "10px";
      const color = b.color || "#333333";

      if (b.type === "text") {
        body += `<tr><td align="${align}" style="padding-top:${padTop}; padding-bottom:${padBot}; color:${color}; font-size:${b.fontSize || '14px'}; font-family:${brandFont}, sans-serif; line-height:1.6;">${b.content}</td></tr>`;
      } else if (b.type === "button") {
        body += `<tr><td align="${align}" style="padding-top:${padTop}; padding-bottom:${padBot};">
          <table border="0" cellpadding="0" cellspacing="0" style="display:inline-block;">
            <tr>
              <td align="center" bgcolor="${b.backgroundColor || brandPrimary}" style="border-radius:${b.borderRadius || '6px'};">
                <a href="${b.url || '#'}" target="_blank" style="font-size:13px; font-weight:bold; color:${color}; text-decoration:none; padding:12px 24px; display:inline-block; font-family:${brandFont}, sans-serif;">${b.content}</a>
              </td>
            </tr>
          </table>
        </td></tr>`;
      } else if (b.type === "image") {
        body += `<tr><td align="${align}" style="padding-top:${padTop}; padding-bottom:${padBot}; font-size: 0;">
          <img src="${b.url || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=60'}" alt="Image" style="max-width:100%; height:auto; border-radius:${b.borderRadius || '0px'}; display:block; margin: 0 auto;" />
        </td></tr>`;
      } else if (b.type === "divider") {
        body += `<tr><td style="padding-top:${padTop}; padding-bottom:${padBot};"><hr style="border:0; border-top:1px solid #e2e8f0;" /></td></tr>`;
      } else if (b.type === "spacer") {
        body += `<tr><td style="height:${b.height || '20px'};"></td></tr>`;
      } else if (b.type === "two-col") {
        body += `<tr><td style="padding-top:${padTop}; padding-bottom:${padBot};">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" valign="top" style="font-family:${brandFont}, sans-serif; font-size:13px; color:#4a5568; line-height:1.6;">${b.col1Content || 'Column 1'}</td>
              <td width="4%"></td>
              <td width="48%" valign="top" style="font-family:${brandFont}, sans-serif; font-size:13px; color:#4a5568; line-height:1.6;">${b.col2Content || 'Column 2'}</td>
            </tr>
          </table>
        </td></tr>`;
      } else if (b.type === "three-col") {
        body += `<tr><td style="padding-top:${padTop}; padding-bottom:${padBot};">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td width="30%" valign="top" style="font-family:${brandFont}, sans-serif; font-size:13px; color:#4a5568; line-height:1.6;">${b.col1Content || 'Column 1'}</td>
              <td width="5%"></td>
              <td width="30%" valign="top" style="font-family:${brandFont}, sans-serif; font-size:13px; color:#4a5568; line-height:1.6;">${b.col2Content || 'Column 2'}</td>
              <td width="5%"></td>
              <td width="30%" valign="top" style="font-family:${brandFont}, sans-serif; font-size:13px; color:#4a5568; line-height:1.6;">${b.col3Content || 'Column 3'}</td>
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
            <td align="center" bgcolor="${brandPrimary}" style="padding:32px 20px;">
              <h1 style="color:#ffffff; margin:0; font-size:26px; font-family:'${brandFont}', sans-serif; font-weight:700; letter-spacing: -0.5px;">SmartCampaign</h1>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:32px 24px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                ${body}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px; background-color:#f8f9fa; font-size:11px; color:#a0aec0; border-top:1px solid #edf2f7; font-family: sans-serif;">
              <p style="margin:0; line-height: 1.5;">Sent by SmartCampaign. All rights reserved.</p>
              <p style="margin:6px 0 0 0;"><a href="{{unsubscribe}}" style="color:${brandPrimary}; text-decoration:none; font-weight:600;">Unsubscribe</a> from this list.</p>
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

    // On mobile viewports, automatically switch tabs to let them see the new canvas element
    if (window.innerWidth < 1024) {
      setActiveBuilderTab("canvas");
    }
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

  // Search filter
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dark-800">
        <div className="flex items-center gap-3">
          {(previewTemplate || showCreator) && (
            <button
              onClick={() => {
                setPreviewTemplate(null);
                setShowCreator(false);
              }}
              className="p-2.5 bg-dark-900 hover:bg-dark-800 text-dark-300 hover:text-white rounded-xl border border-dark-800 transition-all duration-200 hover:scale-[1.05]"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <Layout size={20} className="shrink-0" />
              </div>
              <span className="brand-gradient-text">
                {showCreator 
                  ? "Visual Design Workspace" 
                  : previewTemplate 
                    ? `Review Design: ${previewTemplate.name}` 
                    : "Email Templates Library"
                }
              </span>
            </h2>
            <p className="text-[11px] text-dark-400 mt-1 font-medium">
              {showCreator 
                ? "Construct responsive layouts and personalize templates with custom CRM tags." 
                : "Manage and create modern, responsive newsletters and welcome triggers."
              }
            </p>
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
              setSelectedBlockId("b1");
              setActiveBuilderTab("canvas");
            }}
            className="flex items-center gap-2 px-5 py-2.5 brand-gradient-bg text-white text-xs font-extrabold rounded-xl shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 glow-btn"
          >
            <Plus size={16} />
            <span>Create New Template</span>
          </button>
        )}
      </div>

      {!showCreator && !previewTemplate ? (
        /* ================== DISPLAY SAVED LIST ================== */
        <div className="space-y-6">
          {/* Filters & search panel */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-dark-900/30 p-3 rounded-xl border border-dark-850">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" size={15} />
              <input
                type="text"
                placeholder="Search templates by name or subject..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-dark-950/80 hover:bg-dark-950 focus:bg-dark-950 border border-dark-800 hover:border-dark-700 focus:border-brand-500 rounded-xl text-xs text-white placeholder:text-dark-600 focus:outline-none transition-all duration-200"
              />
            </div>
            <div className="text-[10px] text-dark-400 font-semibold flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-dark-900 border border-dark-800 font-mono text-brand-400 font-extrabold">{filteredTemplates.length}</span> templates found
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <RefreshCw className="animate-spin text-brand-500" size={28} />
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setPreviewTemplate(t)}
                  className="group relative bg-dark-900/20 hover:bg-dark-900/50 border border-dark-800/80 hover:border-brand-500/40 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/5 flex flex-col justify-between min-h-[190px] overflow-hidden"
                >
                  {/* Subtle hover background decoration */}
                  <div className="absolute -right-16 -top-16 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors duration-300" />
                  
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 group-hover:scale-110 transition-transform duration-300">
                          <Mail size={16} />
                        </div>
                        <h3 className="text-xs font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-1">
                          {t.name}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setPreviewTemplate(t)}
                          className="p-2 bg-dark-950/80 hover:bg-dark-800 text-dark-400 hover:text-white border border-dark-800 hover:border-dark-750 rounded-xl transition-all duration-200"
                          title="Preview Template"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(t.id, e)}
                          className="p-2 bg-dark-950/80 hover:bg-rose-500/10 text-dark-500 hover:text-rose-400 border border-dark-800 hover:border-rose-500/20 rounded-xl transition-all duration-200"
                          title="Delete Template"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-dark-950/40 p-3 rounded-xl border border-dark-850 hover:border-dark-800 transition-colors">
                      <span className="text-dark-500 font-semibold block text-[8px] uppercase tracking-wider mb-1">Subject Line</span>
                      <p className="text-[11px] text-dark-300 font-medium font-mono line-clamp-2 leading-relaxed">
                        {t.subject}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-dark-800/40 pt-3.5 mt-5 text-[9px] text-dark-500 font-medium">
                    <span className="bg-dark-950 px-2 py-0.5 rounded border border-dark-800 font-mono text-[8px]">ID: #{t.id}</span>
                    <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-dark-800 rounded-2xl bg-dark-900/10 flex flex-col items-center justify-center gap-4">
              <div className="p-4 rounded-full bg-dark-950 border border-dark-800 text-dark-600 shadow-inner">
                <FileText size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">No Saved Templates</p>
                <p className="text-[10px] text-dark-500 max-w-[280px] mx-auto leading-normal">
                  Launch the visual builder workspace to create responsive marketing emails.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreator(true);
                  setName("");
                  setSubject("");
                  setBlocks([
                    { id: "b1", type: "text", content: "<h2>Hi {{first_name | 'Friend'}},</h2><p>Enter your content blocks here. Custom fields like {{company}} are auto-mapped.</p>" }
                  ]);
                  setSelectedBlockId("b1");
                  setActiveBuilderTab("canvas");
                }}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-dark-900 hover:bg-dark-800 text-white border border-dark-850 hover:border-brand-500/20 text-[10px] font-bold rounded-lg transition-all duration-200"
              >
                <Plus size={13} />
                <span>Create One Now</span>
              </button>
            </div>
          )}
        </div>
      ) : showCreator ? (
        /* ================== VISUAL DRAG & DROP BUILDER ================== */
        <div className="space-y-4 animate-scaleUp">
          {/* Segmented workspace navigation bar for mobile and tablet viewports */}
          <div className="flex lg:hidden bg-dark-900/50 p-1.5 rounded-2xl border border-dark-800 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveBuilderTab("design")}
              className={`flex-1 py-2 px-2.5 text-[10px] font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 ${
                activeBuilderTab === "design"
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/10"
                  : "text-dark-400 hover:text-white"
              }`}
            >
              <Layers size={13} />
              <span>Design</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveBuilderTab("canvas")}
              className={`flex-1 py-2 px-2.5 text-[10px] font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 ${
                activeBuilderTab === "canvas"
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/10"
                  : "text-dark-400 hover:text-white"
              }`}
            >
              <Layout size={13} />
              <span>Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveBuilderTab("preview")}
              className={`flex-1 py-2 px-2.5 text-[10px] font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 ${
                activeBuilderTab === "preview"
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/10"
                  : "text-dark-400 hover:text-white"
              }`}
            >
              <Sliders size={13} />
              <span>Preview</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Column 1: Preset Templates & Sidebar Blocks */}
            <div className={`${activeBuilderTab === "design" ? "block" : "hidden"} lg:block lg:col-span-3 space-y-4`}>
              {/* Curated template library */}
              <div className="glass-panel p-4 rounded-2xl border border-dark-700/30 space-y-4 shadow-lg shadow-dark-950/15">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-dark-800">
                  <FolderOpen size={13} className="text-brand-400" />
                  <span>Preset Templates</span>
                </h4>

                {/* Category selector */}
                <div className="flex bg-dark-950 border border-dark-850 p-0.5 rounded-lg overflow-x-auto scrollbar-none gap-0.5">
                  {(["welcome", "promo", "newsletter", "cart", "reengage"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button" 
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex-1 py-1 px-1.5 text-[8px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-200 ${
                        selectedCategory === cat 
                          ? "bg-brand-500 text-white shadow-md shadow-brand-500/10" 
                          : "text-dark-400 hover:text-white"
                      }`}
                    >
                      {cat === "reengage" ? "Re" : cat === "newsletter" ? "News" : cat}
                    </button>
                  ))}
                </div>

                {/* Filtered layouts catalog */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                  {presetTemplates
                    .filter(p => p.cat === selectedCategory)
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => loadPresetLayout(p)}
                        className="w-full text-left p-2.5 bg-dark-950 hover:bg-dark-900/60 border border-dark-850 hover:border-brand-500/25 rounded-xl text-[10px] font-bold text-dark-300 hover:text-white transition-all duration-250 flex items-center justify-between group"
                      >
                        <div className="truncate max-w-[150px] space-y-0.5">
                          <span className="block truncate font-bold text-dark-200 group-hover:text-white">{p.name}</span>
                          <span className="block truncate text-[8px] text-dark-500 font-mono font-normal">{p.sub}</span>
                        </div>
                        <Plus size={12} className="text-dark-500 group-hover:text-brand-400 transition-colors shrink-0 ml-1" />
                      </button>
                    ))}
                </div>
              </div>

              {/* Layout Canvas Blocks List */}
              <div className="glass-panel p-4 rounded-2xl border border-dark-700/30 space-y-4 shadow-lg shadow-dark-950/15">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-dark-800">
                  <Layers size={13} className="text-brand-400" />
                  <span>Available Block Types</span>
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { type: "text", label: "Text Body", icon: Type },
                    { type: "image", label: "Image Block", icon: ImageIcon },
                    { type: "button", label: "CTA Button", icon: LinkIcon },
                    { type: "divider", label: "Divider Row", icon: Sliders },
                    { type: "two-col", label: "2-Col Row", icon: Layout },
                    { type: "three-col", label: "3-Col Row", icon: Layout }
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button" 
                        onClick={() => addBlock(item.type as any)}
                        className="p-3 bg-dark-950 hover:bg-dark-900 border border-dark-850 hover:border-brand-500/20 rounded-xl text-[10px] font-extrabold text-dark-300 hover:text-white flex flex-col items-center justify-center gap-2.5 transition-all duration-200 hover:scale-[1.03] hover:shadow-md"
                      >
                        <div className="p-1.5 rounded-lg bg-brand-500/5 text-brand-400">
                          <Icon size={14} />
                        </div>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Global Account Brand Defaults */}
              <div className="glass-panel p-4 rounded-2xl border border-dark-700/30 space-y-4 shadow-lg shadow-dark-950/15">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-dark-800">
                  <Palette size={13} className="text-brand-400" />
                  <span>Account Brand colors</span>
                </h4>
                <div className="space-y-2.5 text-[10px]">
                  <div className="flex justify-between items-center bg-dark-950 p-2.5 rounded-xl border border-dark-850">
                    <span className="text-dark-400 font-semibold">Primary Color</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-dark-500 font-mono">{brandPrimary}</span>
                      <input
                        type="color" value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)}
                        className="w-5.5 h-5.5 bg-transparent border-0 cursor-pointer rounded-md overflow-hidden"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-dark-950 p-2.5 rounded-xl border border-dark-850">
                    <span className="text-dark-400 font-semibold">Secondary Color</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-dark-500 font-mono">{brandSecondary}</span>
                      <input
                        type="color" value={brandSecondary} onChange={e => setBrandSecondary(e.target.value)}
                        className="w-5.5 h-5.5 bg-transparent border-0 cursor-pointer rounded-md overflow-hidden"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-dark-950 p-2.5 rounded-xl border border-dark-850">
                    <span className="text-dark-400 font-semibold">Font Family</span>
                    <select
                      value={brandFont} onChange={e => setBrandFont(e.target.value)}
                      className="bg-dark-900 text-white border border-dark-800 px-2.5 py-1 rounded-lg text-[9px] cursor-pointer focus:outline-none"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Roboto">Roboto</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Live interactive editor & wizard setup */}
            <div className={`${activeBuilderTab === "canvas" ? "block" : "hidden"} lg:block lg:col-span-6 space-y-4`}>
              {/* Top Wizard Config inputs */}
              <div className="glass-panel p-4.5 rounded-2xl border border-dark-700/30 space-y-3.5 shadow-lg shadow-dark-950/15">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Template Name</label>
                    <input
                      type="text" required value={name} onChange={e => setName(e.target.value)}
                      placeholder="e.g. Welcome sequence"
                      className="w-full px-3.5 py-2 bg-dark-950 border border-dark-850 hover:border-dark-700 focus:border-brand-500 rounded-xl text-xs text-white focus:outline-none placeholder:text-dark-600 transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider">Email Subject</label>
                    <input
                      type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                      placeholder="e.g. Hi {{first_name}}, welcome aboard!"
                      className="w-full px-3.5 py-2 bg-dark-950 border border-dark-850 hover:border-dark-700 focus:border-brand-500 rounded-xl text-xs text-white focus:outline-none placeholder:text-dark-600 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Blocks list canvas wrapper */}
              <div className="glass-panel p-4 rounded-2xl border border-dark-700/30 flex flex-col gap-4 min-h-[500px] shadow-lg shadow-dark-950/15">
                <div className="flex justify-between items-center pb-2 border-b border-dark-800">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={11} className="text-brand-400" />
                    <span>Interactive Live Canvas Editor</span>
                  </span>
                  
                  {/* HTML Source code switch */}
                  <div className="flex bg-dark-950 border border-dark-850 p-0.5 rounded-lg">
                    <button
                      type="button" onClick={() => setBuilderMode("visual")}
                      className={`px-3 py-1.5 text-[8.5px] font-bold rounded-md transition-all duration-250 ${
                        builderMode === "visual" 
                          ? "bg-brand-500 text-white shadow-md shadow-brand-500/10" 
                          : "text-dark-400 hover:text-white"
                      }`}
                    >
                      Visual Blocks
                    </button>
                    <button
                      type="button" onClick={() => setBuilderMode("html")}
                      className={`px-3 py-1.5 text-[8.5px] font-bold rounded-md transition-all duration-250 ${
                        builderMode === "html" 
                          ? "bg-brand-500 text-white shadow-md shadow-brand-500/10" 
                          : "text-dark-400 hover:text-white"
                      }`}
                    >
                      HTML Source
                    </button>
                  </div>
                </div>

                {builderMode === "html" ? (
                  <textarea
                    value={contentHtml} onChange={e => setContentHtml(e.target.value)}
                    placeholder="Write direct responsive HTML source code..."
                    className="w-full px-4 py-3 bg-dark-950/40 hover:bg-dark-950/65 focus:bg-dark-950/80 border border-dark-850 focus:border-brand-500 rounded-2xl text-[11px] font-mono text-white focus:outline-none leading-relaxed h-[380px] transition-all duration-200"
                  />
                ) : (
                  /* Dynamic interactive blocks rendering */
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                    {blocks.length > 0 ? (
                      blocks.map((b, idx) => {
                        const isSelected = selectedBlockId === b.id;
                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              setSelectedBlockId(b.id);
                              // On mobile screens, automatically navigate to settings tab when block is selected
                              if (window.innerWidth < 1024) {
                                setActiveBuilderTab("preview");
                              }
                            }}
                            className={`group relative p-4 border rounded-xl cursor-pointer transition-all duration-255 ${
                              isSelected 
                                ? "bg-dark-950 border-brand-500/80 shadow-xl shadow-brand-500/5 ring-2 ring-brand-500/40" 
                                : "bg-dark-950/30 border-dark-850 hover:bg-dark-950/50 hover:border-dark-750"
                            }`}
                          >
                            {/* Block type label & context buttons */}
                            <div className="flex justify-between items-center mb-3">
                              <span className={`text-[7px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider border ${
                                isSelected
                                  ? "bg-brand-500/10 border-brand-500/25 text-brand-400"
                                  : "bg-dark-900 border-dark-800 text-dark-400"
                              }`}>
                                {b.type} block
                              </span>

                              {/* Action controls - visible on hover, or always visible when block is selected (essential for mobile touch responsiveness) */}
                              <div className={`flex items-center gap-1 transition-opacity duration-255 ${
                                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              }`}>
                                <button
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); moveBlock(idx, "up"); }}
                                  className="p-1 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded border border-dark-800 transition-colors"
                                >
                                  <ChevronUp size={11} />
                                </button>
                                <button
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); moveBlock(idx, "down"); }}
                                  className="p-1 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded border border-dark-800 transition-colors"
                                >
                                  <ChevronDown size={11} />
                                </button>
                                <button
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); cloneBlock(b); }}
                                  className="p-1 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded border border-dark-800 transition-colors"
                                  title="Clone"
                                >
                                  <Copy size={11} />
                                </button>
                                <button
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }}
                                  className="p-1 bg-dark-900 hover:bg-rose-500/10 text-dark-400 hover:text-rose-450 rounded border border-dark-800 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            {/* Block preview rendering content */}
                            <div className="text-[12px] text-white">
                              {b.type === "text" && (
                                <div 
                                  className="prose prose-sm prose-invert max-w-none text-dark-200" 
                                  dangerouslySetInnerHTML={{ 
                                    __html: DOMPurify.sanitize(b.content || "<p class='text-dark-500'>[Select this block to edit text content...]</p>") 
                                  }} 
                                />
                              )}
                              {b.type === "button" && (
                                <div className="flex justify-center my-2">
                                  <span
                                    style={{
                                      backgroundColor: b.backgroundColor || brandPrimary,
                                      color: b.color || "#ffffff",
                                      borderRadius: b.borderRadius || "6px"
                                    }}
                                    className="px-5 py-2 text-[10px] font-bold shadow-md shadow-brand-500/10 block-btn"
                                  >
                                    {b.content}
                                  </span>
                                </div>
                              )}
                              {b.type === "image" && (
                                <div className="flex justify-center my-2">
                                  <img
                                    src={b.url || "https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=60"}
                                    alt="Block Graphic"
                                    className="max-h-[100px] w-auto object-cover rounded-lg border border-dark-850 shadow-sm"
                                  />
                                </div>
                              )}
                              {b.type === "divider" && (
                                <hr className="border-0 border-t border-dark-800/80 my-4" />
                              )}
                              {b.type === "spacer" && (
                                <div 
                                  style={{ height: b.height || '20px' }} 
                                  className="border border-dashed border-dark-800/60 flex items-center justify-center text-[8px] text-dark-500 font-semibold rounded-lg bg-dark-950/20"
                                >
                                  Spacer Block ({b.height || '20px'})
                                </div>
                              )}
                              {b.type === "two-col" && (
                                <div className="grid grid-cols-2 gap-4 bg-dark-900/10 p-3 rounded-xl border border-dark-850/50">
                                  <div 
                                    className="p-2 border border-dashed border-dark-800/60 rounded-lg text-[10px] text-dark-300" 
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.col1Content || "Column 1") }} 
                                  />
                                  <div 
                                    className="p-2 border border-dashed border-dark-800/60 rounded-lg text-[10px] text-dark-300" 
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.col2Content || "Column 2") }} 
                                  />
                                </div>
                              )}
                              {b.type === "three-col" && (
                                <div className="grid grid-cols-3 gap-3 bg-dark-900/10 p-3 rounded-xl border border-dark-850/50">
                                  <div 
                                    className="p-2 border border-dashed border-dark-800/60 rounded-lg text-[10px] text-dark-300" 
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.col1Content || "Col 1") }} 
                                  />
                                  <div 
                                    className="p-2 border border-dashed border-dark-800/60 rounded-lg text-[10px] text-dark-300" 
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.col2Content || "Col 2") }} 
                                  />
                                  <div 
                                    className="p-2 border border-dashed border-dark-800/60 rounded-lg text-[10px] text-dark-300" 
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.col3Content || "Col 3") }} 
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-20 border border-dashed border-dark-800 rounded-2xl bg-dark-900/5 text-dark-500 text-[11px] font-semibold">
                        Add layout blocks from the sidebar to populate your email builder.
                      </div>
                    )}
                  </div>
                )}

                {/* Action Footer dispatches */}
                <div className="mt-auto border-t border-dark-800 pt-4">
                  <button
                    onClick={handleCreate}
                    disabled={!name || !subject}
                    className="w-full py-3.5 brand-gradient-bg hover:shadow-xl hover:shadow-brand-500/10 text-white font-extrabold rounded-xl text-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 glow-btn disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FileText size={14} />
                    <span>Compile and Save Design Template</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Column 3: Block settings properties inspector & Bezel Mock Preview */}
            <div className={`${activeBuilderTab === "preview" ? "block" : "hidden"} lg:block lg:col-span-3 space-y-4`}>
              {/* Properties inspector */}
              <div className="glass-panel p-4 rounded-2xl border border-dark-700/30 space-y-4 shadow-lg shadow-dark-950/15">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-dark-800">
                  <Settings size={13} className="text-brand-400" />
                  <span>Properties Inspector</span>
                </h4>

                {activeSelectedBlock ? (
                  <div className="space-y-4 text-[10px] text-dark-300">
                    <div className="flex justify-between items-center pb-1">
                      <span className="font-extrabold text-[8px] uppercase bg-brand-500/10 border border-brand-500/20 text-brand-400 px-2.5 py-0.5 rounded-lg tracking-wider">
                        Editing: {activeSelectedBlock.type}
                      </span>
                    </div>

                    {(activeSelectedBlock.type === "text" || activeSelectedBlock.type === "button") && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Content / Label</label>
                        {activeSelectedBlock.type === "text" ? (
                          <textarea
                            value={activeSelectedBlock.content}
                            onChange={e => updateBlock(activeSelectedBlock.id, { content: e.target.value })}
                            rows={7}
                            className="w-full px-3 py-2 bg-dark-950 border border-dark-850 hover:border-dark-750 focus:border-brand-500 rounded-xl text-white font-mono text-[9.5px] leading-relaxed focus:outline-none transition-colors"
                          />
                        ) : (
                          <input
                            type="text" value={activeSelectedBlock.content}
                            onChange={e => updateBlock(activeSelectedBlock.id, { content: e.target.value })}
                            className="w-full px-3 py-2 bg-dark-950 border border-dark-850 hover:border-dark-750 focus:border-brand-500 rounded-xl text-white font-bold focus:outline-none transition-colors"
                          />
                        )}
                      </div>
                    )}

                    {activeSelectedBlock.type === "image" && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Image URL</label>
                        <input
                          type="text" value={activeSelectedBlock.url || ""}
                          onChange={e => updateBlock(activeSelectedBlock.id, { url: e.target.value })}
                          placeholder="https://example.com/asset.jpg"
                          className="w-full px-3 py-2 bg-dark-950 border border-dark-850 hover:border-dark-750 focus:border-brand-500 rounded-xl text-white focus:outline-none transition-colors font-mono text-[9px]"
                        />
                      </div>
                    )}

                    {activeSelectedBlock.type === "button" && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider">Destination URL</label>
                        <input
                          type="text" value={activeSelectedBlock.url || ""}
                          onChange={e => updateBlock(activeSelectedBlock.id, { url: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-dark-950 border border-dark-850 hover:border-dark-750 focus:border-brand-500 rounded-xl text-white font-mono text-[9px] focus:outline-none transition-colors"
                        />
                      </div>
                    )}

                    {(activeSelectedBlock.type === "two-col" || activeSelectedBlock.type === "three-col") && (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider font-mono">Column 1 HTML</label>
                          <textarea
                            value={activeSelectedBlock.col1Content || ""}
                            onChange={e => updateBlock(activeSelectedBlock.id, { col1Content: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 bg-dark-950 border border-dark-850 focus:border-brand-500 rounded-xl text-white text-[9.5px] font-mono focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider font-mono">Column 2 HTML</label>
                          <textarea
                            value={activeSelectedBlock.col2Content || ""}
                            onChange={e => updateBlock(activeSelectedBlock.id, { col2Content: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 bg-dark-950 border border-dark-850 focus:border-brand-500 rounded-xl text-white text-[9.5px] font-mono focus:outline-none"
                          />
                        </div>
                        {activeSelectedBlock.type === "three-col" && (
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider font-mono">Column 3 HTML</label>
                            <textarea
                              value={activeSelectedBlock.col3Content || ""}
                              onChange={e => updateBlock(activeSelectedBlock.id, { col3Content: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 bg-dark-950 border border-dark-850 focus:border-brand-500 rounded-xl text-white text-[9.5px] font-mono focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {activeSelectedBlock.type === "spacer" && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-dark-400 uppercase tracking-wider font-mono">Height (px)</label>
                        <input
                          type="text" value={activeSelectedBlock.height || "20px"}
                          onChange={e => updateBlock(activeSelectedBlock.id, { height: e.target.value })}
                          className="w-full px-3 py-2 bg-dark-950 border border-dark-850 hover:border-dark-750 focus:border-brand-500 rounded-xl text-white font-bold focus:outline-none transition-colors"
                        />
                      </div>
                    )}

                    {/* Formatting selectors */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-dark-800">
                      {activeSelectedBlock.textAlign !== undefined && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[8.5px] font-bold text-dark-400 uppercase">Alignment</label>
                          <select
                            value={activeSelectedBlock.textAlign || "left"}
                            onChange={e => updateBlock(activeSelectedBlock.id, { textAlign: e.target.value as any })}
                            className="bg-dark-950 text-white border border-dark-850 px-2.5 py-1.5 rounded-lg text-[9px] focus:outline-none cursor-pointer"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                      )}
                      {activeSelectedBlock.borderRadius !== undefined && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[8.5px] font-bold text-dark-400 uppercase">Corners</label>
                          <input
                            type="text" value={activeSelectedBlock.borderRadius || "6px"}
                            onChange={e => updateBlock(activeSelectedBlock.id, { borderRadius: e.target.value })}
                            className="w-full px-3 py-1.5 bg-dark-950 border border-dark-850 focus:border-brand-500 rounded-lg text-white text-[9.5px] focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-dark-500">
                    <Paintbrush size={18} className="mx-auto mb-2 text-dark-700 animate-pulse" />
                    <span className="text-[9.5px] font-semibold block max-w-[140px] mx-auto leading-normal">
                      Select a block on the canvas to configure properties.
                    </span>
                  </div>
                )}
              </div>

              {/* Live frame renderer (device frame bezel) */}
              <div className="glass-panel p-4 rounded-2xl border border-dark-700/30 shadow-lg shadow-dark-950/15 flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2 border-b border-dark-800">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Bezel Mock Preview</span>
                  
                  <div className="flex bg-dark-950 border border-dark-850 p-0.5 rounded-lg">
                    <button
                      type="button" onClick={() => setPreviewMode("desktop")}
                      className={`p-1.5 rounded-md transition-all duration-200 ${
                        previewMode === "desktop" 
                          ? "bg-brand-500 text-white shadow-md shadow-brand-500/10" 
                          : "text-dark-400 hover:text-white"
                      }`}
                      title="Desktop Preview"
                    >
                      <Monitor size={11} />
                    </button>
                    <button
                      type="button" onClick={() => setPreviewMode("mobile")}
                      className={`p-1.5 rounded-md transition-all duration-200 ${
                        previewMode === "mobile" 
                          ? "bg-brand-500 text-white shadow-md shadow-brand-500/10" 
                          : "text-dark-400 hover:text-white"
                      }`}
                      title="Mobile Preview"
                    >
                      <Smartphone size={11} />
                    </button>
                  </div>
                </div>

                {/* Styled bezel device simulation */}
                <div className="flex justify-center py-4 bg-dark-950/30 rounded-2xl border border-dark-850/60 overflow-hidden">
                  <div className={`transition-all duration-300 shadow-2xl relative ${
                    previewMode === "mobile" 
                      ? "w-full max-w-[240px] h-[370px] border-[10px] border-dark-950 rounded-[36px] ring-2 ring-dark-800/40" 
                      : "w-full h-[370px] border border-dark-800 rounded-xl"
                  }`}>
                    {/* Status Bar simulation for Mobile Frame */}
                    {previewMode === "mobile" && (
                      <div className="bg-dark-950 text-[7px] text-dark-400 font-bold px-4 py-1.5 flex justify-between items-center select-none border-b border-dark-900 relative">
                        <span>9:41 AM</span>
                        <div className="w-14 h-3.5 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-0.5 z-50 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-dark-900 rounded-full ml-auto mr-2" />
                        </div> {/* Camera notch */}
                        <div className="flex items-center gap-1">
                          <span>5G</span>
                          <div className="w-4 h-2 border border-dark-500 rounded-sm p-0.5 flex items-center">
                            <div className="w-full h-full bg-emerald-500 rounded-2xs" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <iframe
                      title="Block Canvas Bezel Render"
                      srcDoc={builderMode === "visual" ? compileBlocksToHtml().replace("{{first_name | 'Friend'}}", "John").replace("{{email}}", "john@domain.com") : contentHtml}
                      className="w-full h-full border-0 bg-white"
                      sandbox=""
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================== DETAILED SINGLE VIEW ================== */
        <div className="space-y-4 animate-scaleUp">
          <div className="glass-panel p-4 rounded-2xl border border-dark-700/30 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3 font-sans">
              <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <Mail size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">{previewTemplate?.name}</span>
                <span className="text-[10px] text-dark-400 font-mono block truncate">Subject: {previewTemplate?.subject}</span>
              </div>
            </div>

            <div className="flex bg-dark-950 border border-dark-850 p-0.5 rounded-lg shrink-0">
              <button
                type="button" onClick={() => setPreviewMode("desktop")}
                className={`p-2 rounded-md transition-all duration-200 ${
                  previewMode === "desktop" 
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/10" 
                    : "text-dark-400 hover:text-white"
                }`}
              >
                <Monitor size={12} />
              </button>
              <button
                type="button" onClick={() => setPreviewMode("mobile")}
                className={`p-2 rounded-md transition-all duration-200 ${
                  previewMode === "mobile" 
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/10" 
                    : "text-dark-400 hover:text-white"
                }`}
              >
                <Smartphone size={12} />
              </button>
            </div>
          </div>

          <div className="flex justify-center p-4 sm:p-6 bg-dark-950/30 rounded-2xl border border-dark-850 overflow-hidden">
            <div className={`transition-all duration-300 shadow-2xl relative bg-white ${
              previewMode === "mobile" 
                ? "w-full max-w-[280px] xs-mid:max-w-[320px] md:max-w-[340px] h-[480px] md:h-[550px] border-[8px] md:border-[12px] border-dark-950 rounded-[32px] md:rounded-[44px] ring-4 ring-dark-800/30" 
                : "w-full h-[480px] md:h-[550px] border border-dark-800 rounded-2xl"
            }`}>
              {/* Phone speaker and camera simulation for detailed mobile review */}
              {previewMode === "mobile" && (
                <div className="bg-dark-950 text-[8px] text-dark-400 font-bold px-6 py-2 flex justify-between items-center select-none border-b border-dark-900 relative">
                  <span>9:41 AM</span>
                  <div className="w-18 h-4.5 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-0.5 z-50 flex items-center justify-center">
                    <div className="w-2 h-2 bg-dark-900 rounded-full ml-auto mr-3" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <div className="w-5 h-2.5 border border-dark-500 rounded-sm p-0.5 flex items-center">
                      <div className="w-full h-full bg-emerald-500 rounded-2xs" />
                    </div>
                  </div>
                </div>
              )}
              
              <iframe
                title="Saved Design Bezel Preview"
                srcDoc={previewTemplate?.content_html?.replace("{{first_name | 'Friend'}}", "John").replace("{{email}}", "john@domain.com") || ""}
                className="w-full h-full border-0 bg-white"
                sandbox=""
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
