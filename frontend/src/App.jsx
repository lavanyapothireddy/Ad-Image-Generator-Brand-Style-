import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const TONES = ["Professional", "Playful", "Luxurious", "Bold & Edgy", "Minimalist", "Warm & Friendly", "Authoritative", "Trendy & Youthful"];
const AD_TYPES = ["Social Media Post", "Billboard", "Banner Ad", "Story/Reel", "Print Magazine", "Email Header", "YouTube Thumbnail", "Product Launch"];
const INDUSTRIES = ["Technology", "Fashion & Beauty", "Food & Beverage", "Healthcare", "Finance", "Real Estate", "Fitness & Wellness", "Education", "Travel", "Automotive", "Retail", "Entertainment"];

export default function App() {
  const [form, setForm] = useState({
    brand_name: "", tagline: "", industry: "", tone: "Professional",
    colors: "", audience: "", ad_type: "Social Media Post", extra_notes: ""
  });
  const [result, setResult] = useState(null);
  const [variations, setVariations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [error, setError] = useState("");
  const [refineFeedback, setRefineFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const [activeTab, setActiveTab] = useState("generator");
  const [copied, setCopied] = useState("");

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.brand_name || !form.industry) {
      setError("Brand name and industry are required.");
      return;
    }
    setLoading(true); setError(""); setResult(null); setVariations(null);
    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) { setResult(data.ad); setActiveTab("result"); }
      else setError(data.error || "Generation failed.");
    } catch (e) {
      setError("Cannot connect to server. Make sure the backend is running.");
    }
    setLoading(false);
  };

  const refine = async () => {
    if (!refineFeedback.trim()) return;
    setRefining(true);
    try {
      const res = await fetch(`${API_BASE}/api/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ existing_ad: result, feedback: refineFeedback, brand_name: form.brand_name })
      });
      const data = await res.json();
      if (data.success) { setResult(data.ad); setRefineFeedback(""); }
      else setError(data.error);
    } catch (e) { setError("Refinement failed."); }
    setRefining(false);
  };

  const genVariations = async () => {
    setLoadingVariations(true);
    try {
      const res = await fetch(`${API_BASE}/api/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_name: form.brand_name, industry: form.industry, tone: form.tone, count: 3 })
      });
      const data = await res.json();
      if (data.success) setVariations(data.variations);
    } catch (e) { setError("Variations failed."); }
    setLoadingVariations(false);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ brand: form, ad: result }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${form.brand_name.replace(/\s+/g, "_")}_ad.json`; a.click();
  };

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>◈</div>
            <div>
              <div style={styles.logoTitle}>BRANDFORGE</div>
              <div style={styles.logoSub}>AI Ad Generator</div>
            </div>
          </div>
          <div style={styles.badge}>Powered by Groq × LLaMA 3.3</div>
        </div>
      </header>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {["generator", "result", "variations"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}>
            {tab === "generator" ? "⚡ Generator" : tab === "result" ? "🎨 Ad Output" : "🔀 Variations"}
          </button>
        ))}
      </div>

      <main style={styles.main}>
        {/* GENERATOR TAB */}
        {activeTab === "generator" && (
          <div style={styles.grid}>
            <section style={styles.formCard}>
              <div style={styles.sectionLabel}>BRAND IDENTITY</div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Brand Name *</label>
                <input style={styles.input} placeholder="e.g. NovaSkin" value={form.brand_name}
                  onChange={e => update("brand_name", e.target.value)} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Tagline</label>
                <input style={styles.input} placeholder="e.g. Glow from within" value={form.tagline}
                  onChange={e => update("tagline", e.target.value)} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Industry *</label>
                <select style={styles.select} value={form.industry} onChange={e => update("industry", e.target.value)}>
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>

              <div style={styles.twoCol}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Brand Tone</label>
                  <select style={styles.select} value={form.tone} onChange={e => update("tone", e.target.value)}>
                    {TONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Ad Format</label>
                  <select style={styles.select} value={form.ad_type} onChange={e => update("ad_type", e.target.value)}>
                    {AD_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Brand Colors</label>
                <input style={styles.input} placeholder="e.g. Deep navy, gold, cream white" value={form.colors}
                  onChange={e => update("colors", e.target.value)} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Target Audience</label>
                <input style={styles.input} placeholder="e.g. Women 25-40, skincare enthusiasts" value={form.audience}
                  onChange={e => update("audience", e.target.value)} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Additional Notes</label>
                <textarea style={styles.textarea} rows={3} placeholder="Any special requirements, competitor differentiation, seasonal theme, etc."
                  value={form.extra_notes} onChange={e => update("extra_notes", e.target.value)} />
              </div>

              {error && <div style={styles.error}>{error}</div>}

              <button style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
                onClick={generate} disabled={loading}>
                {loading ? <><span style={styles.spinner}></span> Crafting Your Ad...</> : "⚡ Generate Ad"}
              </button>
            </section>

            {/* Preview Panel */}
            <section style={styles.previewPanel}>
              <div style={styles.sectionLabel}>LIVE PREVIEW</div>
              {result ? (
                <AdPreview ad={result} brandName={form.brand_name} />
              ) : (
                <div style={styles.emptyPreview}>
                  <div style={styles.emptyIcon}>◈</div>
                  <p>Fill in brand details and click Generate to see your ad come to life</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* RESULT TAB */}
        {activeTab === "result" && result && (
          <div style={styles.resultLayout}>
            <div style={styles.resultLeft}>
              <AdPreview ad={result} brandName={form.brand_name} large />

              {/* Refine */}
              <div style={styles.refineBox}>
                <div style={styles.sectionLabel}>REFINE WITH AI</div>
                <div style={styles.refineRow}>
                  <input style={{ ...styles.input, flex: 1 }}
                    placeholder="e.g. Make headline more emotional, change CTA to be urgent..."
                    value={refineFeedback} onChange={e => setRefineFeedback(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && refine()} />
                  <button style={{ ...styles.btn, ...styles.btnSm, ...(refining ? styles.btnDisabled : {}) }}
                    onClick={refine} disabled={refining}>
                    {refining ? "..." : "Refine"}
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.resultRight}>
              {/* Copy sections */}
              {[
                { key: "headline", label: "HEADLINE", value: result.headline },
                { key: "subheadline", label: "SUBHEADLINE", value: result.subheadline },
                { key: "body_copy", label: "BODY COPY", value: result.body_copy },
                { key: "cta", label: "CALL TO ACTION", value: result.cta },
              ].map(({ key, label, value }) => (
                <div key={key} style={styles.copyBlock}>
                  <div style={styles.copyBlockHeader}>
                    <span style={styles.copyLabel}>{label}</span>
                    <button style={styles.copyBtn} onClick={() => copy(value, key)}>
                      {copied === key ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <p style={styles.copyText}>{value}</p>
                </div>
              ))}

              {/* Image Prompt */}
              <div style={styles.copyBlock}>
                <div style={styles.copyBlockHeader}>
                  <span style={styles.copyLabel}>🖼 IMAGE PROMPT</span>
                  <button style={styles.copyBtn} onClick={() => copy(result.image_prompt, "img")}>
                    {copied === "img" ? "✓ Copied" : "Copy for Midjourney/DALL-E"}
                  </button>
                </div>
                <p style={{ ...styles.copyText, fontFamily: "var(--font-mono)", fontSize: 12, color: "#a78bfa" }}>
                  {result.image_prompt}
                </p>
              </div>

              {/* Style Guide */}
              {result.brand_style_guide && (
                <div style={styles.copyBlock}>
                  <div style={styles.copyBlockHeader}>
                    <span style={styles.copyLabel}>🎨 BRAND STYLE GUIDE</span>
                  </div>
                  <div style={styles.styleGuide}>
                    <div><span style={styles.sgLabel}>Display Font:</span> {result.brand_style_guide.primary_font}</div>
                    <div><span style={styles.sgLabel}>Accent Font:</span> {result.brand_style_guide.accent_font}</div>
                    <div><span style={styles.sgLabel}>Mood:</span> {result.brand_style_guide.mood}</div>
                    <div style={styles.palette}>
                      {(result.brand_style_guide.color_palette || []).map((c, i) => (
                        <div key={i} style={{ ...styles.swatch, background: c }} title={c} onClick={() => copy(c, `color${i}`)}>
                          <span style={styles.swatchLabel}>{copied === `color${i}` ? "✓" : c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div style={styles.actionRow}>
                <button style={styles.btn} onClick={exportJSON}>⬇ Export JSON</button>
                <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={genVariations}>
                  {loadingVariations ? "Generating..." : "🔀 Get Variations"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "result" && !result && (
          <div style={styles.emptyState}>Generate an ad first to see results here.</div>
        )}

        {/* VARIATIONS TAB */}
        {activeTab === "variations" && (
          <div>
            {variations ? (
              <div style={styles.variationsGrid}>
                {variations.map((v, i) => (
                  <div key={i} style={styles.variationCard}>
                    <div style={styles.varNum}>V{i + 1}</div>
                    <div style={styles.varHeadline}>{v.headline}</div>
                    <div style={styles.varSub}>{v.subheadline}</div>
                    <p style={styles.varBody}>{v.body_copy}</p>
                    <div style={styles.varCta}>{v.cta}</div>
                    <button style={styles.copyBtn} onClick={() => copy(`${v.headline}\n${v.subheadline}\n${v.body_copy}\n${v.cta}`, `var${i}`)}>
                      {copied === `var${i}` ? "✓ Copied All" : "Copy All"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>Go to the Result tab and click "Get Variations" after generating an ad.</p>
                {form.brand_name && (
                  <button style={{ ...styles.btn, marginTop: 20 }} onClick={() => { genVariations(); }}>
                    {loadingVariations ? "Generating..." : "⚡ Generate Variations Now"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function AdPreview({ ad, brandName, large }) {
  const colors = ad.brand_style_guide?.color_palette || ["#ff4d6d", "#7c3aed", "#f59e0b"];
  const [c1, c2] = colors;

  return (
    <div style={{
      ...styles.adCanvas,
      background: `linear-gradient(135deg, ${c1 || "#ff4d6d"}22, ${c2 || "#7c3aed"}33)`,
      border: `1px solid ${c1 || "#ff4d6d"}44`,
      minHeight: large ? 320 : 240,
    }}>
      <div style={{ ...styles.adBrand, color: c1 || "#ff4d6d" }}>{brandName?.toUpperCase()}</div>
      <div style={styles.adHeadline}>{ad.headline}</div>
      <div style={styles.adSub}>{ad.subheadline}</div>
      <div style={{ ...styles.adCta, background: c1 || "#ff4d6d" }}>{ad.cta}</div>
      <div style={styles.adMood}>{ad.brand_style_guide?.mood || ""}</div>
    </div>
  );
}

/* ---- Styles ---- */
const styles = {
  root: { minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f8", fontFamily: "'DM Sans', sans-serif" },
  header: { borderBottom: "1px solid #2a2a3a", padding: "0 32px", background: "#111118" },
  headerInner: { maxWidth: 1400, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: { fontSize: 28, color: "#ff4d6d" },
  logoTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 3, color: "#f0f0f8" },
  logoSub: { fontSize: 11, color: "#888899", letterSpacing: 2, textTransform: "uppercase" },
  badge: { background: "#1a1a24", border: "1px solid #2a2a3a", padding: "6px 14px", borderRadius: 20, fontSize: 12, color: "#a78bfa" },
  tabBar: { display: "flex", gap: 0, borderBottom: "1px solid #2a2a3a", padding: "0 32px", background: "#0d0d14" },
  tab: { padding: "14px 24px", background: "none", border: "none", color: "#888899", cursor: "pointer", fontSize: 13, fontWeight: 500, borderBottom: "2px solid transparent", transition: "all .2s", fontFamily: "'DM Sans', sans-serif" },
  tabActive: { color: "#ff4d6d", borderBottomColor: "#ff4d6d" },
  main: { maxWidth: 1400, margin: "0 auto", padding: "32px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" },
  formCard: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 12, padding: 28, display: "flex", flexDirection: "column", gap: 16 },
  sectionLabel: { fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 3, color: "#ff4d6d", textTransform: "uppercase", marginBottom: 4 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "#888899", fontWeight: 500, letterSpacing: 0.5 },
  input: { background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 8, padding: "10px 14px", color: "#f0f0f8", fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border .2s" },
  select: { background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 8, padding: "10px 14px", color: "#f0f0f8", fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif" },
  textarea: { background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 8, padding: "10px 14px", color: "#f0f0f8", fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif", resize: "vertical" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  error: { background: "#ff4d6d22", border: "1px solid #ff4d6d44", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#ff4d6d" },
  btn: { background: "linear-gradient(135deg, #ff4d6d, #7c3aed)", border: "none", borderRadius: 8, padding: "13px 24px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'DM Sans', sans-serif", transition: "opacity .2s" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  btnSm: { padding: "10px 18px", whiteSpace: "nowrap" },
  btnOutline: { background: "none", border: "1px solid #2a2a3a", color: "#f0f0f8" },
  spinner: { width: 14, height: 14, border: "2px solid #ffffff44", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" },
  previewPanel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 12, padding: 28 },
  emptyPreview: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 16, color: "#888899", textAlign: "center", fontSize: 14 },
  emptyIcon: { fontSize: 48, color: "#2a2a3a" },
  adCanvas: { borderRadius: 10, padding: 28, display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden" },
  adBrand: { fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 4, fontWeight: 700 },
  adHeadline: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, lineHeight: 1.1, color: "#f0f0f8" },
  adSub: { fontSize: 14, color: "#ccccdd", lineHeight: 1.5, maxWidth: "80%" },
  adCta: { display: "inline-block", padding: "8px 20px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#fff", width: "fit-content", marginTop: 8 },
  adMood: { fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#888899", letterSpacing: 2, marginTop: 4 },
  resultLayout: { display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, alignItems: "start" },
  resultLeft: { display: "flex", flexDirection: "column", gap: 20 },
  resultRight: { display: "flex", flexDirection: "column", gap: 16 },
  refineBox: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12 },
  refineRow: { display: "flex", gap: 10 },
  copyBlock: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  copyBlockHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  copyLabel: { fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#888899" },
  copyBtn: { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#a78bfa", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  copyText: { fontSize: 14, color: "#f0f0f8", lineHeight: 1.6 },
  styleGuide: { display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#ccccdd" },
  sgLabel: { color: "#888899", marginRight: 6 },
  palette: { display: "flex", gap: 8, marginTop: 4 },
  swatch: { width: 60, height: 36, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  swatchLabel: { fontSize: 9, color: "#fff", textShadow: "0 1px 3px #00000088", fontFamily: "'Space Mono', monospace" },
  actionRow: { display: "flex", gap: 12 },
  emptyState: { textAlign: "center", color: "#888899", padding: 80, fontSize: 15 },
  variationsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 },
  variationCard: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 10 },
  varNum: { fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#ff4d6d", letterSpacing: 2 },
  varHeadline: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "#f0f0f8" },
  varSub: { fontSize: 13, color: "#a78bfa", fontWeight: 500 },
  varBody: { fontSize: 13, color: "#888899", lineHeight: 1.6 },
  varCta: { background: "#1a1a24", border: "1px solid #2a2a3a", padding: "6px 14px", borderRadius: 20, fontSize: 12, color: "#f59e0b", width: "fit-content", fontWeight: 600 },
};

// Spinner animation
const styleEl = document.createElement("style");
styleEl.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleEl);
