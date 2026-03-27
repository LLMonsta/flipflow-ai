import { useState, useRef } from "react";

const SYSTEM_PROMPT = `You are FlipFlow AI, an expert flipper and resale strategist.

You will receive one or more images of a marketplace listing. Use ALL images together to get a complete picture of the item's condition, damage, accessories, and details.

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "verdict": "GREAT DEAL" | "GOOD DEAL" | "PASS",
  "reasoning": "2-3 sentence honest explanation",
  "recommendedOffer": "$XXX",
  "resaleLow": "$XXX",
  "resaleHigh": "$XXX",
  "estimatedProfit": "$XXX–$XXX",
  "riskLevel": "Low" | "Medium" | "High",
  "riskNote": "One sentence on the main risk",
  "sellerMessage": "Full ready-to-send message to the seller",
  "resellPrice": "$XXX",
  "resellPlatforms": ["Platform1", "Platform2"],
  "resellTime": "X–X days",
  "bonusTips": ["tip 1", "tip 2", "tip 3"]
}

Rules:
- Be realistic, not optimistic
- Focus on profit and speed
- If it's a bad deal, clearly say PASS
- Keep everything concise and actionable`;

const VERDICT_STYLES = {
  "GREAT DEAL": { accent: "#22c55e", bg: "#052010", label: "🔥 GREAT DEAL" },
  "GOOD DEAL":  { accent: "#eab308", bg: "#1a1500", label: "✅ GOOD DEAL"  },
  "PASS":       { accent: "#ef4444", bg: "#1a0505", label: "🚫 PASS"        },
};
const RISK_COLOR = { Low: "#22c55e", Medium: "#eab308", High: "#ef4444" };
const MAX_IMAGES = 8;

export default function FlipFlowAI() {
  const [screen, setScreen] = useState("upload");
  const [images, setImages] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRef            = useRef();

  const readFile = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ url: URL.createObjectURL(file), b64: reader.result.split(",")[1], name: file.name });
      reader.readAsDataURL(file);
    });

  const addFiles = async (files) => {
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const toRead   = incoming.slice(0, MAX_IMAGES - images.length);
    if (!toRead.length) return;
    const newImgs = await Promise.all(toRead.map(readFile));
    setImages((prev) => {
      const existing = new Set(prev.map((i) => i.name));
      return [...prev, ...newImgs.filter((i) => !existing.has(i.name))].slice(0, MAX_IMAGES);
    });
  };

  const onInputChange = (e) => { addFiles(e.target.files); e.target.value = ""; };
  const onDrop        = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };
  const onDragOver    = (e) => e.preventDefault();
  const removeImage   = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const analyze = async () => {
    if (!images.length) return;
    setScreen("loading");
    setError(null);

    try {
      const imageBlocks = images.map((img) => ({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: img.b64 },
      }));

      const res = await fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: [
              ...imageBlocks,
              { type: "text", text: `I've uploaded ${images.length} image(s) of this listing. Analyze all of them together and tell me if it's worth flipping for profit.` },
            ],
          }],
        }),
      });

      const data = await res.json();
      const raw  = data.content?.map((b) => b.text || "").join("") || "";
      const json = raw.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(json));
      setScreen("results");
    } catch {
      setError("Couldn't analyze the images. Please try again.");
      setScreen("upload");
    }
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(result.sellerMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setScreen("upload"); setImages([]); setResult(null); setError(null); };

  return (
    <div style={s.root}>
      <style>{css}</style>

      {/* ── UPLOAD ── */}
      {screen === "upload" && (
        <div style={s.page} className="fade-in">
          <div style={s.header}>
            <div style={s.logo}>FlipFlow AI</div>
            <p style={s.subtitle}>Upload listing screenshots and know if it's worth flipping</p>
          </div>

          {images.length === 0 ? (
            <div style={s.dropzone} className="dropzone" onClick={() => inputRef.current.click()} onDrop={onDrop} onDragOver={onDragOver}>
              <div style={s.dropContent}>
                <div style={s.uploadIcon}>📷</div>
                <div style={s.dropText}>Drop screenshots here</div>
                <div style={s.dropSub}>or tap to upload · up to {MAX_IMAGES} images</div>
              </div>
            </div>
          ) : (
            <>
              <div style={s.thumbGrid}>
                {images.map((img, i) => (
                  <div key={i} style={s.thumbWrap}>
                    <img src={img.url} alt={`listing-${i}`} style={s.thumb} />
                    <button style={s.removeBtn} onClick={() => removeImage(i)}>✕</button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <div style={s.addMoreTile} className="add-more" onClick={() => inputRef.current.click()}>
                    <div style={{ fontSize: "24px", color: "#444" }}>+</div>
                    <div style={{ fontSize: "11px", color: "#444", marginTop: "4px" }}>Add more</div>
                  </div>
                )}
              </div>
              <div style={s.countRow}>
                <span style={s.countBadge}>{images.length} / {MAX_IMAGES} images</span>
                <button style={s.clearBtn} onClick={reset}>Clear all</button>
              </div>
            </>
          )}

          <input ref={inputRef} type="file" accept="image/*" multiple onChange={onInputChange} style={{ display: "none" }} />

          {error && <div style={s.errorBox}>{error}</div>}

          <button style={{ ...s.btn, opacity: images.length ? 1 : 0.35 }} disabled={!images.length} onClick={analyze} className="btn">
            Analyze Deal →
          </button>
        </div>
      )}

      {/* ── LOADING ── */}
      {screen === "loading" && (
        <div style={{ ...s.page, ...s.center }} className="fade-in">
          <div style={{ marginBottom: "20px" }}><div className="spinner" /></div>
          <div style={s.loadingText}>Analyzing deal...</div>
          <div style={s.loadingSub}>Reviewing {images.length} image{images.length > 1 ? "s" : ""} · checking prices & risks</div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {screen === "results" && result && (() => {
        const vs = VERDICT_STYLES[result.verdict] || VERDICT_STYLES["PASS"];
        return (
          <div style={s.page} className="fade-in">

            <div style={{ ...s.verdictBanner, background: vs.bg, borderColor: vs.accent + "44" }}>
              <div style={{ ...s.verdictLabel, color: vs.accent }}>{vs.label}</div>
              <p style={s.reasoning}>{result.reasoning}</p>
            </div>

            <div style={s.grid2}>
              <Stat label="Recommended Offer" value={result.recommendedOffer} accent="#22c55e" />
              <Stat label="Estimated Profit"  value={result.estimatedProfit}  accent="#eab308" />
              <Stat label="Resale Range" value={`${result.resaleLow} – ${result.resaleHigh}`} />
              <div style={s.statCard}>
                <div style={s.statLabel}>Risk Level</div>
                <div style={{ ...s.statValue, color: RISK_COLOR[result.riskLevel] || "#fff" }}>{result.riskLevel}</div>
                <div style={s.riskNote}>{result.riskNote}</div>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.cardTitle}>💬 Message to Seller</span>
                <button style={{ ...s.copyBtn, ...(copied ? s.copiedBtn : {}) }} onClick={copyMessage}>
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              <div style={s.messageBox}>{result.sellerMessage}</div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>📦 Resell Plan</div>
              <div style={s.resellRow}>
                <div>
                  <div style={s.statLabel}>List at</div>
                  <div style={{ ...s.statValue, fontSize: "22px" }}>{result.resellPrice}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={s.statLabel}>Sell time</div>
                  <div style={{ ...s.statValue, fontSize: "22px", color: "#eab308" }}>{result.resellTime}</div>
                </div>
              </div>
              <div style={s.platforms}>
                {result.resellPlatforms?.map((p, i) => <span key={i} style={s.platformTag}>{p}</span>)}
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>💡 Tips to Increase Value</div>
              {result.bonusTips?.map((tip, i) => (
                <div key={i} style={s.tip}><span style={{ color: "#22c55e" }}>+</span> {tip}</div>
              ))}
            </div>

            <button style={s.backBtn} onClick={reset} className="back-btn">← Analyze Another Listing</button>
          </div>
        );
      })()}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={s.statCard}>
      <div style={s.statLabel}>{label}</div>
      <div style={{ ...s.statValue, color: accent || "#fff" }}>{value}</div>
    </div>
  );
}

const s = {
  root:     { minHeight: "100vh", background: "#0c0c0c", color: "#e8e8e8", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", justifyContent: "center" },
  page:     { width: "100%", maxWidth: "480px", padding: "36px 20px 48px", display: "flex", flexDirection: "column", gap: "14px" },
  center:   { alignItems: "center", justifyContent: "center", textAlign: "center" },
  header:   { textAlign: "center", marginBottom: "8px" },
  logo:     { fontSize: "28px", fontWeight: "700", color: "#fff", letterSpacing: "-0.5px" },
  subtitle: { color: "#666", fontSize: "14px", marginTop: "6px", lineHeight: 1.5 },

  dropzone:    { border: "1.5px dashed #2a2a2a", borderRadius: "14px", minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#111", transition: "border-color 0.2s" },
  dropContent: { textAlign: "center", padding: "20px" },
  uploadIcon:  { fontSize: "36px", marginBottom: "10px" },
  dropText:    { fontSize: "15px", color: "#ccc", fontWeight: "500" },
  dropSub:     { fontSize: "13px", color: "#555", marginTop: "4px" },

  thumbGrid:   { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" },
  thumbWrap:   { position: "relative", borderRadius: "10px", overflow: "hidden", aspectRatio: "1", background: "#111", border: "1px solid #1e1e1e" },
  thumb:       { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  removeBtn:   { position: "absolute", top: "5px", right: "5px", background: "rgba(0,0,0,0.75)", border: "none", borderRadius: "50%", width: "22px", height: "22px", color: "#fff", cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" },
  addMoreTile: { aspectRatio: "1", borderRadius: "10px", border: "1.5px dashed #2a2a2a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#111", transition: "border-color 0.2s" },

  countRow:    { display: "flex", justifyContent: "space-between", alignItems: "center" },
  countBadge:  { fontSize: "12px", color: "#555" },
  clearBtn:    { background: "none", border: "none", color: "#444", fontSize: "12px", cursor: "pointer", textDecoration: "underline" },

  btn:     { padding: "15px", background: "#fff", color: "#000", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", transition: "opacity 0.2s, transform 0.15s" },
  backBtn: { padding: "13px", background: "none", border: "1.5px solid #222", borderRadius: "12px", color: "#666", fontSize: "14px", cursor: "pointer" },

  loadingText: { fontSize: "20px", fontWeight: "600", color: "#fff" },
  loadingSub:  { fontSize: "13px", color: "#555", marginTop: "6px" },

  verdictBanner: { border: "1px solid", borderRadius: "14px", padding: "20px" },
  verdictLabel:  { fontSize: "26px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "10px" },
  reasoning:     { fontSize: "14px", color: "#aaa", lineHeight: 1.6 },

  grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  statCard:  { background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "16px" },
  statLabel: { fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" },
  statValue: { fontSize: "20px", fontWeight: "700", color: "#fff" },
  riskNote:  { fontSize: "12px", color: "#666", marginTop: "5px", lineHeight: 1.4 },

  card:       { background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "18px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  cardTitle:  { fontSize: "13px", color: "#888", fontWeight: "500", marginBottom: "12px", display: "block" },

  copyBtn:    { background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#aaa", padding: "5px 14px", cursor: "pointer", fontSize: "12px", fontWeight: "500", transition: "all 0.2s" },
  copiedBtn:  { background: "#052010", borderColor: "#22c55e44", color: "#22c55e" },
  messageBox: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#ccc", lineHeight: 1.7, whiteSpace: "pre-wrap" },

  resellRow:   { display: "flex", justifyContent: "space-between", marginBottom: "14px" },
  platforms:   { display: "flex", gap: "8px", flexWrap: "wrap" },
  platformTag: { background: "#1a1a1a", border: "1px solid #252525", borderRadius: "20px", padding: "4px 14px", fontSize: "12px", color: "#888" },

  tip:      { fontSize: "13px", color: "#bbb", lineHeight: 1.6, marginBottom: "6px", display: "flex", gap: "8px" },
  errorBox: { background: "#1a0505", border: "1px solid #ef444433", borderRadius: "10px", padding: "12px 16px", color: "#ef4444", fontSize: "13px" },
};

const css = `
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
  @keyframes spin { to { transform: rotate(360deg) } }
  .spinner { width: 40px; height: 40px; border: 3px solid #1e1e1e; border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
  .dropzone:hover { border-color: #444 !important; }
  .add-more:hover { border-color: #444 !important; }
  .btn:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.9; }
  .back-btn:hover { border-color: #333 !important; color: #aaa !important; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0c0c0c; }
`;
