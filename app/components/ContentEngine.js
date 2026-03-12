"use client";
import { useState, useEffect, useCallback } from "react";

const MARKETS = {
  hq: { name: "HQ Global", lang: "en", emoji: "🇧🇪", ig: "@greenmood.be", li: "Greenmood HQ", color: "#A8C49A" },
  us: { name: "USA", lang: "en-US", emoji: "🇺🇸", ig: "@greenmood.usa", li: "Greenmood USA", color: "#5B8DB8" },
  uk: { name: "UK", lang: "en-GB", emoji: "🇬🇧", ig: "@greenmood.co.uk", li: "Greenmood UK", color: "#B85B5B" },
  fr: { name: "France", lang: "fr", emoji: "🇫🇷", ig: "@greenmood.fr", li: "Greenmood France", color: "#5B6FB8" },
  ae: { name: "UAE", lang: "en", emoji: "🇦🇪", ig: "@greenmood.uae", li: "Greenmood UAE", color: "#C4A46C" },
  pl: { name: "Poland", lang: "pl", emoji: "🇵🇱", ig: "@greenmood.pl", li: "Greenmood Poland", color: "#B85B8D" },
  kr: { name: "South Korea", lang: "ko", emoji: "🇰🇷", ig: "@greenmood.kr", li: "Greenmood Korea", color: "#8DB85B" },
  de: { name: "Germany", lang: "de", emoji: "🇩🇪", ig: "@greenmood.de", li: "Greenmood Germany", color: "#B8A05B" },
};

const PLATFORMS = [
  { id: "linkedin", icon: "💼", label: "LinkedIn" },
  { id: "instagram", icon: "📸", label: "Instagram" },
  { id: "stories", icon: "📱", label: "Stories" },
  { id: "pinterest", icon: "📌", label: "Pinterest" },
];

const CONTENT_TYPES = [
  { id: "article", label: "Article / Blog Post", icon: "📝" },
  { id: "project", label: "Project Showcase", icon: "🏢" },
  { id: "product", label: "Product Highlight", icon: "🌿" },
  { id: "event", label: "Event / Tradeshow", icon: "📍" },
  { id: "education", label: "Educational Carousel", icon: "📊" },
  { id: "behind", label: "Behind the Scenes", icon: "🔧" },
];

const RESOURCES = {
  articles: [
    { title: "Fire Safety & Biophilic Materials", url: "https://greenmood.us/fire-safety-and-biophilic-materials/", tag: "A&D" },
    { title: "Sustainability & LEED v5", url: "https://greenmood.us/sustainability-leed-v5/", tag: "A&D" },
    { title: "Acoustic & Material Performance", url: "https://greenmood.us/acoustic-material-performance/", tag: "A&D" },
    { title: "Acoustic Specification Guide", url: "https://greenmood.us/how-to-specify-biophilic-acoustic-solutions/", tag: "A&D" },
    { title: "Biophilic Design & Workplace Wellbeing", url: "https://greenmood.us/biophilic-design-workplace-wellbeing/", tag: "A&D" },
    { title: "Plant Preservation Process", url: "https://greenmood.us/plant-preservation-process/", tag: "Process" },
  ],
  downloads: [
    { title: "Ball Moss — Tech sheets, CAD, 3D, Acoustic", url: "https://greenmood.us/green-walls/ball-moss/#downloads", tag: "Moss" },
    { title: "Reindeer Moss — Tech sheets, CAD, 3D", url: "https://greenmood.us/green-walls/reindeer-moss/#downloads", tag: "Moss" },
    { title: "Velvet Leaf — Tech sheets, CAD, 3D", url: "https://greenmood.us/green-walls/velvet-leaf/#downloads", tag: "Moss" },
    { title: "Cork Tiles — All patterns", url: "https://greenmood.us/custom-acoustic-cork-walls/", tag: "Cork" },
    { title: "G-Circle — Product sheet", url: "https://greenmood.us/design-collection/g-circle/#downloads", tag: "Product" },
    { title: "Planters — Product sheet", url: "https://greenmood.us/design-collection/planters/#downloads", tag: "Product" },
    { title: "Semi-natural Trees — Product sheet", url: "https://greenmood.us/semi-natural-trees/#downloads", tag: "Trees" },
  ],
  galleries: [
    { title: "Inspiration Gallery", url: "https://greenmood.us/inspiration/", tag: "Photos" },
    { title: "Nextcloud — Marketing Assets", url: "#", tag: "Internal" },
    { title: "Pomelli Photoshoot Library", url: "#", tag: "AI Photos" },
  ],
};

const SYSTEM_PROMPT = `You are the social media strategist for Greenmood, a Belgian biophilic design company manufacturing preserved moss walls, cork acoustic panels, and architectural biophilic products.

Key facts: Founded 2014 Brussels by Sadig Alakbarov. Products: preserved moss walls (Ball Moss NRC 0.73, Reindeer Moss, Velvet Leaf, Forest), Cork Tiles by Alain Gilles (Parenthèse, Sillon, Brickx, Morse), Design Collection (G-Circle, Hoverlight, Cascade, Rings, Pouf, Planters, Modulor, Framed, Perspective Lines), Semi-natural Trees, Custom Logos. 100% natural, 0% maintenance, handcrafted in Europe. Fire rated B-S2-d0 / FSI 0 SDI 15. WELL v2 + LEED v5 compatible.

Market tones: US = data-driven, WELL/LEED angle, dollar figures. UK = editorial, design-forward. BE/HQ = international authority. FR = French language, Belgian designer pride. UAE = premium, GCC market, wellness credentials. PL = Polish language, local production (Bogdaniec). KR = Korean language. DE = German language.

Rules: Never use em dashes as list markers. Always credit designers. Product names stay English. LinkedIn: NO link in post body (kills reach), put link in first comment, hook on first line. Instagram: hashtags after 3 dots on new lines, 20 relevant hashtags.

Respond ONLY with valid JSON. No markdown backticks, no preamble, no explanation outside JSON.`;

// ========== Helpers ==========
function CopyIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LinkIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ========== Sub-components ==========

function NavBar({ view, setView }) {
  const tabs = [
    { id: "create", icon: "✨", label: "Create" },
    { id: "calendar", icon: "📅", label: "Calendar" },
    { id: "history", icon: "🗂", label: "History" },
    { id: "resources", icon: "📚", label: "Resources" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, padding: "6px", background: "rgba(0,0,0,0.25)", borderRadius: 10, marginBottom: 28 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setView(t.id)} style={{
          flex: 1, padding: "10px 8px", borderRadius: 8, border: "none",
          background: view === t.id ? "rgba(168,196,154,0.15)" : "transparent",
          color: view === t.id ? "#A8C49A" : "rgba(255,255,255,0.35)",
          cursor: "pointer", fontSize: 13, fontWeight: view === t.id ? 600 : 400,
          transition: "all 0.2s", fontFamily: "inherit",
        }}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

function LinkedInPreview({ post, market }) {
  const m = MARKETS[market];
  return (
    <div style={{ background: "#fff", borderRadius: 8, padding: 16, maxWidth: 480, color: "#000", fontSize: 13, lineHeight: 1.5, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <img src="/favicon.png" alt="G" style={{ width: 40, height: 40, borderRadius: "50%" }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{m?.li || "Greenmood"}</div>
          <div style={{ fontSize: 11, color: "#666" }}>Biophilic acoustic systems · {post.timing}</div>
        </div>
      </div>
      <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, maxHeight: 200, overflow: "hidden", position: "relative" }}>
        {post.text?.slice(0, 300)}
        {post.text?.length > 300 && <span style={{ color: "#0a66c2" }}>...see more</span>}
      </div>
      <div style={{ marginTop: 12, padding: "8px 0", borderTop: "1px solid #eee", display: "flex", gap: 24, color: "#666", fontSize: 12 }}>
        <span>👍 Like</span><span>💬 Comment</span><span>🔄 Repost</span><span>📤 Send</span>
      </div>
    </div>
  );
}

function InstagramPreview({ post, market }) {
  const m = MARKETS[market];
  return (
    <div style={{ background: "#000", borderRadius: 8, maxWidth: 320, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", alignItems: "center" }}>
        <img src="/favicon.png" alt="G" style={{ width: 26, height: 26, borderRadius: "50%" }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{m?.ig?.replace("@","") || "greenmood"}</div>
      </div>
      <div style={{ width: "100%", aspectRatio: "4/5", background: "linear-gradient(165deg, #1B3A2D 0%, #0F2318 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#A8C49A", marginBottom: 12, textTransform: "uppercase" }}>GREENMOOD</div>
          <div style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.3, fontFamily: "'Spectral', serif" }}>Carousel Slide 1</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 12 }}>Swipe →</div>
        </div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>♡</span>
          <span style={{ fontSize: 18 }}>💬</span>
          <span style={{ fontSize: 18 }}>📤</span>
          <span style={{ fontSize: 18, marginLeft: "auto" }}>🔖</span>
        </div>
        <div style={{ fontSize: 12, color: "#fff", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700 }}>{m?.ig?.replace("@","")}</span>{" "}
          {post.text?.slice(0, 100)}<span style={{ color: "#888" }}>...more</span>
        </div>
      </div>
    </div>
  );
}

// ========== Main App ==========
export default function ContentEngine() {
  const [view, setView] = useState("create");
  const [step, setStep] = useState("type");
  const [contentType, setContentType] = useState(null);
  const [brief, setBrief] = useState("");
  const [markets, setMarkets] = useState(["hq", "us"]);
  const [platforms, setPlatforms] = useState(["linkedin", "instagram"]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [editText, setEditText] = useState("");
  const [showPreview, setShowPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [calendar, setCalendar] = useState({});
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [scheduleKey, setScheduleKey] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");

  useEffect(() => {
    try {
      const h = localStorage.getItem("gm-history");
      if (h) setHistory(JSON.parse(h));
      const c = localStorage.getItem("gm-calendar");
      if (c) setCalendar(JSON.parse(c));
    } catch {}
  }, []);

  const saveHistory = (h) => { setHistory(h); try { localStorage.setItem("gm-history", JSON.stringify(h)); } catch {} };
  const saveCalendar = (c) => { setCalendar(c); try { localStorage.setItem("gm-calendar", JSON.stringify(c)); } catch {} };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };
  const toggle = (arr, set, id) => set(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const generate = useCallback(async () => {
    setGenerating(true); setError(null);
    const mNames = markets.map(m => `${MARKETS[m].name} (${MARKETS[m].lang})`).join(", ");

    const prompt = `${SYSTEM_PROMPT}

Generate social media content:
TYPE: ${contentType}
BRIEF: ${brief}
MARKETS: ${mNames}
PLATFORMS: ${platforms.join(", ")}
MARKET IDs: ${markets.join(", ")}
PLATFORM IDs: ${platforms.join(", ")}

JSON structure required:
{"title":"campaign title","posts":{"marketId--platformId":{"text":"full post text ready to copy","first_comment":"link for linkedin first comment or null","hashtags":"hashtags string","timing":"posting time e.g. Tue 9:00 CET","notes":"any notes"}},"pomelli_prompts":["2-3 image generation prompts"],"stories":["3-5 story descriptions if stories selected"]}

Each market MUST have a unique angle. Not translations. Different hooks, different data points, different cultural angles.`;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      setResults(parsed);
      setActiveTab(Object.keys(parsed.posts)[0]);
      setStep("results");
      const entry = { id: Date.now(), title: parsed.title, type: contentType, brief, date: new Date().toISOString(), markets, platforms, results: parsed };
      saveHistory([entry, ...history].slice(0, 50));
    } catch (err) { setError(err.message); }
    finally { setGenerating(false); }
  }, [brief, contentType, markets, platforms, history]);

  const schedulePost = (key, date) => {
    const updated = { ...calendar, [date]: [...(calendar[date] || []), { key, title: results?.title, post: results?.posts[key] }] };
    saveCalendar(updated);
    setScheduleKey(null);
  };

  const removeFromCalendar = (date, idx) => {
    const updated = { ...calendar };
    updated[date] = updated[date].filter((_, i) => i !== idx);
    if (!updated[date].length) delete updated[date];
    saveCalendar(updated);
  };

  const exportAll = () => {
    if (!results) return;
    let o = `# ${results.title}\n# ${new Date().toLocaleDateString()}\n\n`;
    Object.entries(results.posts).forEach(([k, p]) => {
      const [m, pl] = k.split("--");
      o += `---\n## ${MARKETS[m]?.emoji} ${MARKETS[m]?.name} — ${pl}\nAccount: ${pl === "linkedin" ? MARKETS[m]?.li : MARKETS[m]?.ig}\nTiming: ${p.timing}\n\n${p.text}\n\n${p.hashtags || ""}\n${p.first_comment ? "\nFIRST COMMENT: " + p.first_comment + "\n" : ""}\n`;
    });
    if (results.pomelli_prompts?.length) { o += "---\n## POMELLI PROMPTS\n\n"; results.pomelli_prompts.forEach((p, i) => o += `${i+1}. ${p}\n\n`); }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([o], { type: "text/markdown" }));
    a.download = `greenmood-${Date.now()}.md`; a.click();
  };

  const loadFromHistory = (entry) => {
    setResults(entry.results); setActiveTab(Object.keys(entry.results.posts)[0]);
    setStep("results"); setView("create");
  };

  // ========== Styles ==========
  const card = { background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 20, marginBottom: 10, transition: "border-color 0.2s" };
  const btn = { background: "rgba(168,196,154,0.12)", border: "1px solid rgba(168,196,154,0.3)", color: "#A8C49A", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.15s" };
  const btnSm = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4, transition: "all 0.15s" };
  const chip = (active, color) => ({ padding: "7px 14px", borderRadius: 20, border: `1px solid ${active ? (color || "#A8C49A") + "80" : "rgba(255,255,255,0.08)"}`, background: active ? `${color || "#A8C49A"}18` : "transparent", color: active ? (color || "#A8C49A") : "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.15s", fontFamily: "inherit" });
  const input = { width: "100%", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 14, color: "#E8E4DE", fontSize: 14, lineHeight: 1.6, outline: "none", fontFamily: "inherit", resize: "vertical" };
  const label = { fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 10, textTransform: "uppercase" };

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(168,196,154,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/favicon.png" alt="Greenmood" style={{ width: 34, height: 34, borderRadius: 8 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: 1, color: "rgba(255,255,255,0.6)" }}>CONTENT ENGINE</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 0.5 }}>Greenmood Social Media</div>
          </div>
        </div>
        {results && view === "create" && step === "results" && (
          <button onClick={exportAll} style={btn}><CopyIcon size={12} /> Export All</button>
        )}
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "20px 16px" }}>
        <NavBar view={view} setView={setView} />

        {/* ===== CREATE ===== */}
        {view === "create" && (
          <>
            {step === "type" && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 300, color: "#fff", marginBottom: 24 }}>What are we creating?</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {CONTENT_TYPES.map(ct => (
                    <button key={ct.id} onClick={() => { setContentType(ct.id); setStep("brief"); }}
                      style={{ ...card, cursor: "pointer", textAlign: "center", padding: "28px 16px", border: "1px solid rgba(255,255,255,0.06)" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(168,196,154,0.3)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}>
                      <div style={{ fontSize: 34, marginBottom: 10 }}>{ct.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#fff" }}>{ct.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "brief" && (
              <div>
                <button onClick={() => setStep("type")} style={{ ...btnSm, border: "none", color: "#A8C49A", marginBottom: 20, padding: 0 }}>← Back</button>
                <h2 style={{ fontSize: 22, fontWeight: 300, color: "#fff", marginBottom: 20 }}>
                  {CONTENT_TYPES.find(c => c.id === contentType)?.icon} {CONTENT_TYPES.find(c => c.id === contentType)?.label}
                </h2>

                <div style={{ marginBottom: 24 }}>
                  <label style={label}>Brief</label>
                  <textarea value={brief} onChange={e => setBrief(e.target.value)}
                    placeholder="Describe what you want to promote... Paste an article URL, describe a project, a product feature, an event..."
                    style={{ ...input, minHeight: 110 }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={label}>Markets</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(MARKETS).map(([id, m]) => (
                      <button key={id} onClick={() => toggle(markets, setMarkets, id)} style={chip(markets.includes(id), m.color)}>
                        {m.emoji} {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <label style={label}>Platforms</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {PLATFORMS.map(p => (
                      <button key={p.id} onClick={() => toggle(platforms, setPlatforms, p.id)} style={chip(platforms.includes(p.id), "#C4A46C")}>
                        {p.icon} {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={generate} disabled={!brief.trim() || generating || !markets.length || !platforms.length}
                  style={{ ...btn, width: "100%", padding: "14px", fontSize: 14, justifyContent: "center", opacity: (!brief.trim() || !markets.length || !platforms.length) ? 0.4 : 1 }}>
                  {generating ? `⏳ Generating ${markets.length} × ${platforms.length} posts...` : "Generate Content →"}
                </button>
                {error && <p style={{ color: "#E57373", marginTop: 10, fontSize: 12 }}>{error}</p>}
              </div>
            )}

            {step === "results" && results && (
              <div>
                <button onClick={() => setStep("brief")} style={{ ...btnSm, border: "none", color: "#A8C49A", padding: 0, marginBottom: 16 }}>← Edit brief</button>
                <h2 style={{ fontSize: 20, fontWeight: 300, color: "#fff", marginBottom: 4 }}>{results.title}</h2>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>{Object.keys(results.posts).length} posts generated</p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 20 }}>
                  {Object.keys(results.posts).map(key => {
                    const [m] = key.split("--");
                    const pl = key.split("--")[1];
                    return (
                      <button key={key} onClick={() => { setActiveTab(key); setShowPreview(null); }}
                        style={chip(activeTab === key, MARKETS[m]?.color)}>
                        {MARKETS[m]?.emoji} {pl}
                      </button>
                    );
                  })}
                </div>

                {activeTab && results.posts[activeTab] && (() => {
                  const post = results.posts[activeTab];
                  const [market, platform] = activeTab.split("--");
                  const isEditing = editKey === activeTab;

                  return (
                    <div style={{ ...card, padding: 24 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: "#fff", fontSize: 15 }}>{MARKETS[market]?.emoji} {MARKETS[market]?.name} — {platform}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                            {platform === "linkedin" ? MARKETS[market]?.li : MARKETS[market]?.ig} · {post.timing}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setShowPreview(showPreview === activeTab ? null : activeTab)} style={btnSm}>
                            {showPreview === activeTab ? "Hide" : "👁 Preview"}
                          </button>
                          <button onClick={() => { setScheduleKey(activeTab); setScheduleDate(""); }} style={btnSm}>
                            📅 Schedule
                          </button>
                          {!isEditing && <button onClick={() => { setEditKey(activeTab); setEditText(post.text); }} style={btnSm}>✏️ Edit</button>}
                          <button onClick={() => copy(post.text + (post.hashtags ? "\n\n" + post.hashtags : ""), activeTab)} style={btn}>
                            {copied === activeTab ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                          </button>
                        </div>
                      </div>

                      {scheduleKey === activeTab && (
                        <div style={{ background: "rgba(168,196,154,0.04)", border: "1px solid rgba(168,196,154,0.12)", borderRadius: 8, padding: 12, marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
                          <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, padding: "4px 8px", color: "#fff", fontSize: 12, fontFamily: "inherit" }} />
                          <button onClick={() => scheduleDate && schedulePost(activeTab, scheduleDate)} disabled={!scheduleDate} style={{ ...btn, padding: "4px 12px", fontSize: 11, opacity: scheduleDate ? 1 : 0.4 }}>Add</button>
                          <button onClick={() => setScheduleKey(null)} style={btnSm}>Cancel</button>
                        </div>
                      )}

                      {showPreview === activeTab && (
                        <div style={{ marginBottom: 16, display: "flex", gap: 16, justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                          {platform === "linkedin" ? <LinkedInPreview post={post} market={market} /> :
                           platform === "instagram" ? <InstagramPreview post={post} market={market} /> :
                           <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", padding: 20 }}>Preview available for LinkedIn and Instagram</div>}
                        </div>
                      )}

                      {isEditing ? (
                        <div>
                          <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ ...input, minHeight: 250 }} />
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button onClick={() => { setResults(p => ({ ...p, posts: { ...p.posts, [activeTab]: { ...p.posts[activeTab], text: editText } } })); setEditKey(null); }} style={btn}>Save</button>
                            <button onClick={() => setEditKey(null)} style={btnSm}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 8, padding: 16, fontSize: 13, lineHeight: 1.85, color: "rgba(255,255,255,0.85)", whiteSpace: "pre-wrap", marginBottom: 12, border: "1px solid rgba(255,255,255,0.03)" }}>
                          {post.text}
                        </div>
                      )}

                      {post.hashtags && !isEditing && <div style={{ fontSize: 12, color: "rgba(168,196,154,0.45)", marginBottom: 12, lineHeight: 1.5 }}>{post.hashtags}</div>}

                      {post.first_comment && !isEditing && (
                        <div style={{ background: "rgba(196,164,108,0.05)", border: "1px solid rgba(196,164,108,0.12)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#C4A46C", letterSpacing: 1, marginBottom: 4 }}>FIRST COMMENT</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>{post.first_comment}</span>
                            <button onClick={() => copy(post.first_comment, activeTab + "-c")} style={{ ...btnSm, padding: "2px 8px" }}>
                              {copied === activeTab + "-c" ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                            </button>
                          </div>
                        </div>
                      )}
                      {post.notes && !isEditing && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>💡 {post.notes}</div>}
                    </div>
                  );
                })()}

                {results.pomelli_prompts?.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: "#A8C49A", letterSpacing: 1, marginBottom: 12 }}>📸 POMELLI PROMPTS</h3>
                    {results.pomelli_prompts.map((p, i) => (
                      <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: 14 }}>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, flex: 1 }}>{p}</div>
                        <button onClick={() => copy(p, "pm-" + i)} style={btnSm}>
                          {copied === "pm-" + i ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {results.stories?.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: "#C4A46C", letterSpacing: 1, marginBottom: 12 }}>📱 STORIES</h3>
                    {results.stories.map((st, i) => (
                      <div key={i} style={{ ...card, padding: 14, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                        <span style={{ color: "#C4A46C", fontWeight: 600 }}>Story {i+1}:</span> {st}
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => { setStep("type"); setResults(null); setBrief(""); setContentType(null); }}
                  style={{ ...card, cursor: "pointer", textAlign: "center", marginTop: 24, color: "rgba(255,255,255,0.3)", fontSize: 14, border: "1px dashed rgba(255,255,255,0.08)" }}>
                  + New Content
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== CALENDAR ===== */}
        {view === "calendar" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 300, color: "#fff" }}>📅 Content Calendar</h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }} style={btnSm}>←</button>
                <span style={{ fontSize: 14, color: "#fff", minWidth: 140, textAlign: "center" }}>
                  {new Date(calYear, calMonth).toLocaleDateString("en", { month: "long", year: "numeric" })}
                </span>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }} style={btnSm}>→</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                <div key={d} style={{ padding: 8, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{d}</div>
              ))}
              {(() => {
                const firstDay = new Date(calYear, calMonth, 1).getDay();
                const offset = firstDay === 0 ? 6 : firstDay - 1;
                const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                const cells = [];
                for (let i = 0; i < offset; i++) cells.push(<div key={"e"+i} />);
                for (let d = 1; d <= daysInMonth; d++) {
                  const dateStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                  const items = calendar[dateStr] || [];
                  const isToday = dateStr === new Date().toISOString().split("T")[0];
                  cells.push(
                    <div key={d} style={{ minHeight: 80, padding: 6, borderRadius: 6, background: isToday ? "rgba(168,196,154,0.06)" : "rgba(255,255,255,0.015)", border: isToday ? "1px solid rgba(168,196,154,0.2)" : "1px solid rgba(255,255,255,0.025)" }}>
                      <div style={{ fontSize: 11, color: isToday ? "#A8C49A" : "rgba(255,255,255,0.3)", fontWeight: isToday ? 700 : 400, marginBottom: 3 }}>{d}</div>
                      {items.map((item, idx) => {
                        const [m, pl] = (item.key || "").split("--");
                        return (
                          <div key={idx} style={{ fontSize: 9, padding: "2px 4px", borderRadius: 3, marginBottom: 2, background: `${MARKETS[m]?.color || "#A8C49A"}15`, color: MARKETS[m]?.color || "#A8C49A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>{MARKETS[m]?.emoji} {pl}</span>
                            <span onClick={() => removeFromCalendar(dateStr, idx)} style={{ cursor: "pointer", opacity: 0.4, fontSize: 10 }}>×</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return cells;
              })()}
            </div>
            {!Object.keys(calendar).length && (
              <div style={{ textAlign: "center", padding: 48, color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
                No posts scheduled yet. Generate content and use "📅 Schedule" to add posts here.
              </div>
            )}
          </div>
        )}

        {/* ===== HISTORY ===== */}
        {view === "history" && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 300, color: "#fff", marginBottom: 24 }}>🗂 Generation History</h2>
            {!history.length ? (
              <div style={{ textAlign: "center", padding: 48, color: "rgba(255,255,255,0.2)", fontSize: 14 }}>No generations yet.</div>
            ) : history.map(entry => (
              <div key={entry.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => loadFromHistory(entry)}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(168,196,154,0.2)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}>
                <div>
                  <div style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>
                    {CONTENT_TYPES.find(c => c.id === entry.type)?.icon} {entry.title}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
                    {new Date(entry.date).toLocaleDateString()} · {entry.markets.map(m => MARKETS[m]?.emoji).join(" ")} · {Object.keys(entry.results.posts).length} posts
                  </div>
                </div>
                <span style={{ color: "#A8C49A", fontSize: 12 }}>Open →</span>
              </div>
            ))}
          </div>
        )}

        {/* ===== RESOURCES ===== */}
        {view === "resources" && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 300, color: "#fff", marginBottom: 6 }}>📚 Brand Resources</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Quick access to everything for content creation</p>

            <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
              {["all", "articles", "downloads", "galleries"].map(f => (
                <button key={f} onClick={() => setResourceFilter(f)} style={chip(resourceFilter === f, "#A8C49A")}>
                  {f === "all" ? "All" : f === "articles" ? "📝 Articles" : f === "downloads" ? "📥 Tech Sheets" : "📸 Photos"}
                </button>
              ))}
            </div>

            {(resourceFilter === "all" || resourceFilter === "articles") && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#A8C49A", letterSpacing: 1, marginBottom: 10 }}>A&D GUIDANCE ARTICLES</h3>
                {RESOURCES.articles.map((r, i) => (
                  <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
                    <span style={{ fontSize: 13, color: "#E8E4DE" }}>{r.title}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(168,196,154,0.08)", color: "#A8C49A" }}>{r.tag}</span>
                      <button onClick={() => copy(r.url, "res-" + i)} style={{ ...btnSm, padding: "3px 8px" }} title="Copy link">
                        {copied === "res-" + i ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                      </button>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, padding: "3px 8px", textDecoration: "none", color: "rgba(255,255,255,0.4)" }} title="Open">
                        <LinkIcon />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(resourceFilter === "all" || resourceFilter === "downloads") && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#C4A46C", letterSpacing: 1, marginBottom: 10 }}>TECHNICAL SHEETS & CAD</h3>
                {RESOURCES.downloads.map((r, i) => (
                  <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
                    <span style={{ fontSize: 13, color: "#E8E4DE" }}>{r.title}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(196,164,108,0.08)", color: "#C4A46C" }}>{r.tag}</span>
                      <button onClick={() => copy(r.url, "dl-" + i)} style={{ ...btnSm, padding: "3px 8px" }} title="Copy link">
                        {copied === "dl-" + i ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                      </button>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, padding: "3px 8px", textDecoration: "none", color: "rgba(255,255,255,0.4)" }} title="Open">
                        <LinkIcon />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(resourceFilter === "all" || resourceFilter === "galleries") && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#5B8DB8", letterSpacing: 1, marginBottom: 10 }}>PHOTO LIBRARIES</h3>
                {RESOURCES.galleries.map((r, i) => (
                  <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
                    <span style={{ fontSize: 13, color: "#E8E4DE" }}>{r.title}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(91,141,184,0.08)", color: "#5B8DB8" }}>{r.tag}</span>
                      <button onClick={() => copy(r.url, "gal-" + i)} style={{ ...btnSm, padding: "3px 8px" }} title="Copy link">
                        {copied === "gal-" + i ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                      </button>
                      {r.url !== "#" && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, padding: "3px 8px", textDecoration: "none", color: "rgba(255,255,255,0.4)" }} title="Open">
                          <LinkIcon />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Color palette */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 14 }}>COLOR PALETTE</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { hex: "#1B3A2D", name: "Forest" }, { hex: "#8B3E23", name: "Copper" },
                  { hex: "#F4F2EE", name: "Cream" }, { hex: "#A8C49A", name: "Sage" }, { hex: "#0F2318", name: "Dark" },
                ].map(c => (
                  <div key={c.hex} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => copy(c.hex, "col-" + c.hex)}>
                    <div style={{ width: 52, height: 52, borderRadius: 8, background: c.hex, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 4 }} />
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{copied === "col-" + c.hex ? "✓ Copied" : c.hex}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
