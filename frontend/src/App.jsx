import { useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const TONES = ["Professional", "Playful", "Luxurious", "Bold & Edgy", "Minimalist", "Warm & Friendly", "Authoritative", "Trendy & Youthful"];
const AD_TYPES = ["Social Media Post", "Billboard", "Banner Ad", "Story/Reel", "Print Magazine", "Email Header", "YouTube Thumbnail", "Product Launch"];
const INDUSTRIES = ["Technology", "Fashion & Beauty", "Food & Beverage", "Healthcare", "Finance", "Real Estate", "Fitness & Wellness", "Education", "Travel", "Automotive", "Retail", "Entertainment"];

function generateImageUrl(prompt) {
  const full = prompt + ", professional advertisement, ultra high quality, 4k, cinematic lighting, commercial photography";
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 99999)}`;
}

export default function App() {
  const [form, setForm] = useState({
    brand_name: "", tagline: "", industry: "", tone: "Professional",
    colors: "", audience: "", ad_type: "Social Media Post", extra_notes: ""
  });
  const [ad, setAd] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [error, setError] = useState("");
  const [rendered, setRendered] = useState(false);
  const canvasRef = useRef(null);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.brand_name || !form.industry) { setError("Brand name and industry are required."); return; }
    setError(""); setAd(null); setImageUrl(""); setRendered(false);
    setAdLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "Generation failed."); setAdLoading(false); return; }

      setAd(data.ad);
      setAdLoading(false);
      setImageLoading(true);

      const url = generateImageUrl(data.ad.image_prompt);
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageUrl(url);
        setImageLoading(false);
        setTimeout(() => renderCanvas(img, data.ad), 100);
      };
      img.onerror = () => { setImageLoading(false); setError("Image generation failed. Try again."); };
      img.src = url;
    } catch (e) {
      setError("Cannot connect to server."); setAdLoading(false);
    }
  };

  const renderCanvas = (img, adData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;

    // Draw background image
    ctx.drawImage(img, 0, 0, W, H);

    // Dark overlay gradient from bottom
    const grad = ctx.createLinearGradient(0, H * 0.3, 0, H);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.5, "rgba(0,0,0,0.65)");
    grad.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const palette = adData.brand_style_guide?.color_palette || ["#ff4d6d", "#7c3aed", "#f59e0b"];
    const accent = palette[0] || "#ff4d6d";
    const accent2 = palette[1] || "#7c3aed";

    // Top brand bar
    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, accent + "dd");
    topGrad.addColorStop(1, accent2 + "aa");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 72);

    // Brand name in bar
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial";
    ctx.letterSpacing = "6px";
    ctx.fillText(form.brand_name.toUpperCase(), 36, 46);

    // Ad type pill top right
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, W - 220, 16, 184, 40, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "13px Arial";
    ctx.fillText(form.ad_type.toUpperCase(), W - 208, 41);

    // Accent line
    ctx.fillStyle = accent;
    ctx.fillRect(36, H * 0.52, 6, 120);

    // Headline
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${adData.headline.length > 25 ? 56 : 68}px Arial`;
    wrapText(ctx, adData.headline.toUpperCase(), 56, H * 0.56, W - 100, 76);

    // Subheadline
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "26px Arial";
    wrapText(ctx, adData.subheadline, 56, H * 0.78, W - 100, 36);

    // Body copy
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "18px Arial";
    wrapText(ctx, adData.body_copy, 56, H * 0.86, W - 100, 26);

    // CTA Button
    const ctaW = Math.min(adData.cta.length * 18 + 60, 340);
    const ctaX = 56, ctaY = H - 110;
    const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
    ctaGrad.addColorStop(0, accent);
    ctaGrad.addColorStop(1, accent2);
    ctx.fillStyle = ctaGrad;
    roundRect(ctx, ctaX, ctaY, ctaW, 56, 28);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.fillText(adData.cta.toUpperCase(), ctaX + 30, ctaY + 36);

    // Tagline bottom right
    if (form.tagline) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "italic 18px Arial";
      const tw = ctx.measureText(`"${form.tagline}"`).width;
      ctx.fillText(`"${form.tagline}"`, W - tw - 36, H - 36);
    }

    // Color palette dots bottom left
    (palette).slice(0, 3).forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(W - 60 - i * 28, H - 36, 10, 0, Math.PI * 2);
      ctx.fill();
    });

    setRendered(true);
  };

  const regenerateImage = () => {
    if (!ad) return;
    setRendered(false); setImageUrl(""); setImageLoading(true);
    const url = generateImageUrl(ad.image_prompt);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { setImageUrl(url); setImageLoading(false); setTimeout(() => renderCanvas(img, ad), 100); };
    img.onerror = () => { setImageLoading(false); setError("Image failed. Try again."); };
    img.src = url;
  };

  const downloadAd = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${form.brand_name.replace(/\s+/g, "_")}_ad.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const isLoading = adLoading || imageLoading;

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.logoWrap}>
          <span style={S.logoMark}>◈</span>
          <div>
            <div style={S.logoTitle}>BRANDFORGE</div>
            <div style={S.logoSub}>AI Ad Image Generator</div>
          </div>
        </div>
        <div style={S.pill}>Groq × LLaMA 3.3 × Pollinations</div>
      </header>

      <div style={S.layout}>
        {/* LEFT — Form */}
        <aside style={S.sidebar}>
          <div style={S.sectionLabel}>BRAND DETAILS</div>

          {[
            { label: "Brand Name *", key: "brand_name", placeholder: "e.g. NovaSkin" },
            { label: "Tagline", key: "tagline", placeholder: "e.g. Glow from within" },
            { label: "Brand Colors", key: "colors", placeholder: "e.g. Deep navy, gold, cream" },
            { label: "Target Audience", key: "audience", placeholder: "e.g. Women 25-40" },
          ].map(({ label, key, placeholder }) => (
            <div key={key} style={S.field}>
              <label style={S.label}>{label}</label>
              <input style={S.input} placeholder={placeholder} value={form[key]}
                onChange={e => update(key, e.target.value)} />
            </div>
          ))}

          <div style={S.field}>
            <label style={S.label}>Industry *</label>
            <select style={S.select} value={form.industry} onChange={e => update("industry", e.target.value)}>
              <option value="">Select...</option>
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>Brand Tone</label>
            <select style={S.select} value={form.tone} onChange={e => update("tone", e.target.value)}>
              {TONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>Ad Format</label>
            <select style={S.select} value={form.ad_type} onChange={e => update("ad_type", e.target.value)}>
              {AD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>Extra Notes</label>
            <textarea style={S.textarea} rows={3}
              placeholder="Seasonal theme, competitor edge, special message..."
              value={form.extra_notes} onChange={e => update("extra_notes", e.target.value)} />
          </div>

          {error && <div style={S.error}>{error}</div>}

          <button style={{ ...S.btn, ...(isLoading ? S.btnOff : {}) }} onClick={generate} disabled={isLoading}>
            {isLoading ? <><Spin /> {adLoading ? "Writing Ad Copy..." : "Generating Image (10-20s)..."}</> : "⚡ Generate Ad Image"}
          </button>

          {rendered && (
            <div style={S.actionGroup}>
              <button style={S.btn} onClick={downloadAd}>⬇ Download PNG</button>
              <button style={{ ...S.btn, ...S.btnGhost }} onClick={regenerateImage} disabled={imageLoading}>
                🔄 New Image
              </button>
            </div>
          )}
        </aside>

        {/* RIGHT — Canvas Output */}
        <main style={S.canvasWrap}>
          {!rendered && !isLoading && (
            <div style={S.placeholder}>
              <div style={S.placeholderIcon}>◈</div>
              <p style={S.placeholderText}>Your complete ad image will appear here</p>
              <p style={S.placeholderSub}>Fill in the form and click Generate</p>
            </div>
          )}

          {isLoading && (
            <div style={S.placeholder}>
              <Spin large />
              <p style={S.placeholderText}>
                {adLoading ? "✍️ Writing ad copy with Groq..." : "🎨 Generating image with AI..."}
              </p>
              <p style={S.placeholderSub}>
                {imageLoading ? "This takes 10–20 seconds — free GPU queue" : ""}
              </p>
              <div style={S.progressBar}>
                <div style={{ ...S.progressFill, width: adLoading ? "35%" : "85%" }} />
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            style={{
              ...S.canvas,
              display: rendered ? "block" : "none"
            }}
          />

          {rendered && (
            <div style={S.canvasActions}>
              <button style={S.btn} onClick={downloadAd}>⬇ Download PNG</button>
              <button style={{ ...S.btn, ...S.btnGhost }} onClick={regenerateImage}>🔄 Regenerate Image</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────
function wrapText(ctx, text, x, y, maxW, lineH) {
  if (!text) return;
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (let w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line !== "") {
      ctx.fillText(line.trim(), x, cy);
      line = w + " ";
      cy += lineH;
    } else line = test;
  }
  ctx.fillText(line.trim(), x, cy);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function Spin({ large }) {
  return <span style={{
    width: large ? 40 : 14, height: large ? 40 : 14,
    border: `${large ? 4 : 2}px solid #ffffff22`,
    borderTopColor: "#ff4d6d",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0
  }} />;
}

// ── Styles ───────────────────────────────────────────────
const S = {
  root: { minHeight: "100vh", background: "#08080f", color: "#f0f0f8", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" },
  header: { background: "#0f0f1a", borderBottom: "1px solid #1e1e2e", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  logoWrap: { display: "flex", alignItems: "center", gap: 12 },
  logoMark: { fontSize: 26, color: "#ff4d6d" },
  logoTitle: { fontSize: 22, fontWeight: 800, letterSpacing: 3, fontFamily: "sans-serif" },
  logoSub: { fontSize: 10, color: "#666677", letterSpacing: 2, textTransform: "uppercase" },
  pill: { background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 20, padding: "5px 14px", fontSize: 11, color: "#a78bfa" },
  layout: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: 340, flexShrink: 0, background: "#0f0f1a", borderRight: "1px solid #1e1e2e", padding: "24px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 },
  sectionLabel: { fontFamily: "monospace", fontSize: 10, letterSpacing: 3, color: "#ff4d6d", textTransform: "uppercase" },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 11, color: "#666677", fontWeight: 600, letterSpacing: 0.5 },
  input: { background: "#08080f", border: "1px solid #1e1e2e", borderRadius: 8, padding: "9px 12px", color: "#f0f0f8", fontSize: 13, outline: "none", fontFamily: "inherit" },
  select: { background: "#08080f", border: "1px solid #1e1e2e", borderRadius: 8, padding: "9px 12px", color: "#f0f0f8", fontSize: 13, outline: "none", fontFamily: "inherit" },
  textarea: { background: "#08080f", border: "1px solid #1e1e2e", borderRadius: 8, padding: "9px 12px", color: "#f0f0f8", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical" },
  error: { background: "#ff4d6d18", border: "1px solid #ff4d6d44", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#ff4d6d" },
  btn: { background: "linear-gradient(135deg, #ff4d6d, #7c3aed)", border: "none", borderRadius: 8, padding: "12px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" },
  btnOff: { opacity: 0.5, cursor: "not-allowed" },
  btnGhost: { background: "none", border: "1px solid #2a2a3e", color: "#f0f0f8" },
  actionGroup: { display: "flex", flexDirection: "column", gap: 8 },
  canvasWrap: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 20, overflowY: "auto", background: "#08080f" },
  placeholder: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" },
  placeholderIcon: { fontSize: 64, color: "#1e1e2e" },
  placeholderText: { fontSize: 18, color: "#444455", fontWeight: 600 },
  placeholderSub: { fontSize: 13, color: "#333344" },
  progressBar: { width: 280, height: 4, background: "#1e1e2e", borderRadius: 2, overflow: "hidden", marginTop: 8 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #ff4d6d, #7c3aed)", borderRadius: 2, transition: "width 0.5s ease" },
  canvas: { maxWidth: "100%", maxHeight: "80vh", borderRadius: 12, boxShadow: "0 0 60px #ff4d6d22, 0 0 120px #7c3aed11" },
  canvasActions: { display: "flex", gap: 12 },
};

const _s = document.createElement("style");
_s.textContent = `@keyframes spin{to{transform:rotate(360deg)}} input:focus,select:focus,textarea:focus{border-color:#ff4d6d!important;outline:none}`;
document.head.appendChild(_s);
