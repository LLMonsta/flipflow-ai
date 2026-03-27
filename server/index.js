import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "50mb" }));

const DAILY_LIMIT = 3;
const usage = new Map();

const getClientIp = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.socket.remoteAddress ||
  "unknown";

const getUsageKey = (ip) =>
  `${ip}::${new Date().toISOString().slice(0, 10)}`;

const getUsage = (ip) => usage.get(getUsageKey(ip)) || 0;

const incrementUsage = (ip) => {
  const key = getUsageKey(ip);
  usage.set(key, (usage.get(key) || 0) + 1);
};

app.get("/scans-left", (req, res) => {
  const ip = getClientIp(req);
  res.json({
    scansLeft: Math.max(0, DAILY_LIMIT - getUsage(ip)),
    limit: DAILY_LIMIT,
  });
});

app.post("/analyze", async (req, res) => {
  const ip = getClientIp(req);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set." });
  }

  if (getUsage(ip) >= DAILY_LIMIT) {
    return res.status(429).json({
      error: "You have used all 3 free scans today. Come back tomorrow!",
      scansLeft: 0,
    });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    if (data.content) {
      incrementUsage(ip);
    }

    res.json({
      ...data,
      scansLeft: Math.max(0, DAILY_LIMIT - getUsage(ip)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Analysis failed. Please try again.",
    });
  }
});

app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FlipFlow AI</title>
  <style>
    :root {
      --bg: #0a0b0f;
      --panel: #12141b;
      --panel-2: #171a23;
      --border: #242938;
      --text: #f4f7fb;
      --muted: #9aa3b2;
      --green: #25d366;
      --green-2: #18b956;
      --yellow: #ffb020;
      --red: #ff5d5d;
      --blue: #5aa7ff;
      --shadow: 0 18px 40px rgba(0,0,0,.35);
      --radius: 18px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top, rgba(37,211,102,.12), transparent 30%),
        linear-gradient(180deg, #0a0b0f 0%, #0d1117 100%);
      color: var(--text);
      min-height: 100vh;
    }

    .wrap {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 18px 60px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 22px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      letter-spacing: -.02em;
      font-size: 28px;
    }

    .brand-badge {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--green), var(--blue));
      color: #08110b;
      font-size: 20px;
      box-shadow: var(--shadow);
    }

    .pill {
      border: 1px solid var(--border);
      background: rgba(255,255,255,.03);
      padding: 10px 14px;
      border-radius: 999px;
      font-size: 13px;
      color: var(--muted);
    }

    .pill strong { color: var(--text); }

    .hero {
      background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: var(--shadow);
      margin-bottom: 22px;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: 1.2fr .8fr;
      gap: 22px;
    }

    .hero h1 {
      margin: 0 0 10px;
      font-size: clamp(34px, 6vw, 58px);
      line-height: .96;
      letter-spacing: -.04em;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.6;
      max-width: 620px;
    }

    .hero-card {
      background: rgba(255,255,255,.03);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px;
      align-self: stretch;
    }

    .hero-card h3 {
      margin: 0 0 10px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--muted);
    }

    .hero-list {
      margin: 0;
      padding-left: 18px;
      color: var(--text);
      line-height: 1.8;
    }

    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }

    .uploader {
      padding: 22px;
      margin-bottom: 18px;
    }

    .dropzone {
      border: 1.5px dashed #33405a;
      background: linear-gradient(180deg, rgba(90,167,255,.06), rgba(37,211,102,.04));
      border-radius: 20px;
      padding: 28px;
      text-align: center;
    }

    .dropzone h2 {
      margin: 10px 0 8px;
      font-size: 24px;
      letter-spacing: -.03em;
    }

    .dropzone p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
    }

    .upload-icon {
      font-size: 38px;
    }

    .btn-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 16px;
      justify-content: center;
    }

    button {
      border: 0;
      cursor: pointer;
      border-radius: 14px;
      font-weight: 700;
      transition: .18s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--green), var(--green-2));
      color: #07120a;
      padding: 14px 18px;
      font-size: 15px;
      min-width: 180px;
    }

    .btn-primary:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: rgba(255,255,255,.04);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 14px 18px;
      font-size: 15px;
    }

    .thumbs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }

    .thumb {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      aspect-ratio: 1/1;
    }

    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .thumb button {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0,0,0,.72);
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      font-size: 14px;
    }

    .meta {
      margin-top: 14px;
      color: var(--muted);
      font-size: 14px;
    }

    .loading {
      display: none;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 14px;
      padding: 42px 18px;
      text-align: center;
      color: var(--muted);
    }

    .spinner {
      width: 46px;
      height: 46px;
      border: 4px solid rgba(255,255,255,.12);
      border-top-color: var(--green);
      border-radius: 50%;
      animation: spin .9s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .results {
      display: none;
      margin-top: 18px;
      gap: 18px;
    }

    .verdict {
      padding: 22px;
      border-radius: 20px;
      border: 1px solid var(--border);
    }

    .verdict-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
      flex-wrap: wrap;
    }

    .verdict h2 {
      margin: 0;
      font-size: clamp(30px, 5vw, 48px);
      line-height: 1;
      letter-spacing: -.04em;
    }

    .badge {
      padding: 10px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 800;
      border: 1px solid currentColor;
    }

    .reason {
      margin-top: 14px;
      color: var(--muted);
      line-height: 1.7;
      font-size: 15px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-top: 18px;
    }

    .stat {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px;
    }

    .stat-label {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -.04em;
    }

    .section {
      margin-top: 18px;
      padding: 20px;
    }

    .section h3 {
      margin: 0 0 14px;
      font-size: 18px;
      letter-spacing: -.03em;
    }

    .message-box,
    .list-box {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      color: #dbe2ee;
      line-height: 1.7;
    }

    .copy-btn {
      margin-top: 12px;
      background: rgba(255,255,255,.05);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 12px 14px;
      width: 100%;
    }

    .error {
      display: none;
      margin-top: 16px;
      background: rgba(255,93,93,.08);
      color: #ffb7b7;
      border: 1px solid rgba(255,93,93,.25);
      padding: 16px;
      border-radius: 16px;
      line-height: 1.6;
    }

    ul {
      margin: 0;
      padding-left: 18px;
    }

    li { margin-bottom: 8px; }

    .footer-note {
      margin-top: 18px;
      text-align: center;
      color: var(--muted);
      font-size: 13px;
    }

    @media (max-width: 820px) {
      .hero-grid,
      .grid {
        grid-template-columns: 1fr;
      }

      .hero {
        padding: 22px;
      }

      .brand {
        font-size: 22px;
      }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <div class="brand">
        <div class="brand-badge">↗</div>
        <div>FlipFlow AI</div>
      </div>
      <div class="pill">Free scans left today: <strong id="scansLeftTop">...</strong></div>
    </div>

    <div class="hero card">
      <div class="hero-grid">
        <div>
          <h1>Know if a flip is worth it in seconds.</h1>
          <p>
            Upload marketplace screenshots and FlipFlow AI will tell you the deal verdict,
            what to offer, estimated profit, resale range, risk level, and the exact message to send.
          </p>
        </div>
        <div class="hero-card">
          <h3>What it gives you</h3>
          <ul class="hero-list">
            <li>Buy / Maybe / Skip verdict</li>
            <li>Offer price and resale range</li>
            <li>Estimated profit</li>
            <li>Risk check</li>
            <li>Copy-paste seller message</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card uploader">
      <div class="dropzone">
        <div class="upload-icon">📸</div>
        <h2>Upload listing screenshots</h2>
        <p>Tap to upload. Use price, condition, and detail photos for the best analysis.</p>
        <div class="btn-row">
          <button class="btn-secondary" id="pickBtn">Choose images</button>
          <button class="btn-primary" id="analyzeBtn" disabled>Analyze deal</button>
        </div>
        <input id="fileInput" type="file" accept="image/*" multiple style="display:none;" />
      </div>

      <div class="meta" id="metaText">No screenshots selected yet.</div>
      <div class="thumbs" id="thumbs"></div>
      <div class="error" id="errorBox"></div>

      <div class="loading" id="loadingBox">
        <div class="spinner"></div>
        <div><strong>Scanning listing...</strong></div>
        <div>Checking pricing, profit, resale potential, and risk.</div>
      </div>

      <div class="results" id="resultsWrap">
        <div class="verdict" id="verdictCard">
          <div class="verdict-top">
            <h2 id="verdictText">BUY</h2>
            <div class="badge" id="riskBadge">Risk: Medium</div>
          </div>
          <div class="reason" id="reasonText"></div>
        </div>

        <div class="grid">
          <div class="stat">
            <div class="stat-label">Offer</div>
            <div class="stat-value" id="offerValue">$0</div>
          </div>
          <div class="stat">
            <div class="stat-label">Profit Range</div>
            <div class="stat-value" id="profitValue">$0</div>
          </div>
          <div class="stat">
            <div class="stat-label">Resell Range</div>
            <div class="stat-value" id="resellRangeValue">$0</div>
          </div>
          <div class="stat">
            <div class="stat-label">Resell Price</div>
            <div class="stat-value" id="resellValue">$0</div>
          </div>
        </div>

        <div class="card section">
          <h3>Message to seller</h3>
          <div class="message-box" id="sellerMessage"></div>
          <button class="copy-btn" id="copyBtn">Copy message</button>
        </div>

        <div class="card section">
          <h3>What to check in person</h3>
          <div class="list-box"><ul id="checkList"></ul></div>
        </div>

        <div class="card section">
          <h3>Profit tips</h3>
          <div class="list-box"><ul id="tipsList"></ul></div>
        </div>

        <div class="card section">
          <h3>Extra details</h3>
          <div class="list-box"><ul id="detailsList"></ul></div>
        </div>
      </div>

      <div class="footer-note">3 free scans per day. No account required.</div>
    </div>
  </div>

  <script>
    const SYSTEM_PROMPT =
      "You are FlipFlow AI, an expert flipper and resale strategist. Analyze marketplace listing images and return ONLY valid JSON with these fields: verdict (BUY, MAYBE, or SKIP), profitLow (number), profitHigh (number), offerPrice (number), askingPrice (number), resaleLow (number), resaleHigh (number), resellPrice (number), riskLevel (Low, Medium, or High), riskNote (string), reasoning (string, 2-3 sentences), sellerMessage (string, full message), resellPlatforms (array of strings), resellTime (string), profitTips (array of 3 strings), whatToCheck (array of 2 strings). Dollar amounts as numbers only. Be realistic. Return SKIP if it will not make money.";

    const fileInput = document.getElementById("fileInput");
    const pickBtn = document.getElementById("pickBtn");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const thumbs = document.getElementById("thumbs");
    const metaText = document.getElementById("metaText");
    const loadingBox = document.getElementById("loadingBox");
    const resultsWrap = document.getElementById("resultsWrap");
    const errorBox = document.getElementById("errorBox");
    const scansLeftTop = document.getElementById("scansLeftTop");

    const verdictText = document.getElementById("verdictText");
    const riskBadge = document.getElementById("riskBadge");
    const reasonText = document.getElementById("reasonText");
    const offerValue = document.getElementById("offerValue");
    const profitValue = document.getElementById("profitValue");
    const resellRangeValue = document.getElementById("resellRangeValue");
    const resellValue = document.getElementById("resellValue");
    const sellerMessage = document.getElementById("sellerMessage");
    const checkList = document.getElementById("checkList");
    const tipsList = document.getElementById("tipsList");
    const detailsList = document.getElementById("detailsList");
    const copyBtn = document.getElementById("copyBtn");
    const verdictCard = document.getElementById("verdictCard");

    let images = [];
    let scansLeft = 0;

    function formatMoney(n) {
      return "$" + Number(n || 0).toLocaleString();
    }

    function showError(msg) {
      errorBox.style.display = "block";
      errorBox.textContent = msg;
    }

    function hideError() {
      errorBox.style.display = "none";
      errorBox.textContent = "";
    }

    function updateTopScans() {
      scansLeftTop.textContent = scansLeft;
    }

    async function loadScans() {
      try {
        const res = await fetch("/scans-left");
        const data = await res.json();
        scansLeft = data.scansLeft ?? 0;
        updateTopScans();
      } catch {
        scansLeftTop.textContent = "?";
      }
    }

    function refreshThumbs() {
      thumbs.innerHTML = "";
      metaText.textContent = images.length
        ? images.length + " screenshot" + (images.length > 1 ? "s" : "") + " selected"
        : "No screenshots selected yet.";
      analyzeBtn.disabled = images.length === 0 || scansLeft === 0;

      images.forEach((img, index) => {
        const div = document.createElement("div");
        div.className = "thumb";
        div.innerHTML = '<img src="' + img.url + '" alt="Screenshot" />';
        const btn = document.createElement("button");
        btn.textContent = "×";
        btn.onclick = (e) => {
          e.stopPropagation();
          images.splice(index, 1);
          refreshThumbs();
        };
        div.appendChild(btn);
        thumbs.appendChild(div);
      });
    }

    function fileToData(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            url: URL.createObjectURL(file),
            base64: reader.result.split(",")[1],
            type: file.type || "image/jpeg"
          });
        };
        reader.readAsDataURL(file);
      });
    }

    async function addFiles(fileList) {
      const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
      const next = await Promise.all(files.map(fileToData));
      images = images.concat(next).slice(0, 8);
      refreshThumbs();
      hideError();
    }

    pickBtn.addEventListener("click", (e) => {
      e.preventDefault();
      fileInput.click();
    });

    fileInput.addEventListener("change", async (e) => {
      await addFiles(e.target.files);
      e.target.value = "";
    });

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(sellerMessage.textContent);
        copyBtn.textContent = "Copied";
        setTimeout(() => {
          copyBtn.textContent = "Copy message";
        }, 1500);
      } catch {}
    });

    function setVerdictStyle(verdict, riskLevel) {
      if (verdict === "BUY") {
        verdictCard.style.background = "rgba(37,211,102,.08)";
        verdictCard.style.borderColor = "rgba(37,211,102,.35)";
        verdictText.style.color = "#25d366";
      } else if (verdict === "MAYBE") {
        verdictCard.style.background = "rgba(255,176,32,.08)";
        verdictCard.style.borderColor = "rgba(255,176,32,.35)";
        verdictText.style.color = "#ffb020";
      } else {
        verdictCard.style.background = "rgba(255,93,93,.08)";
        verdictCard.style.borderColor = "rgba(255,93,93,.35)";
        verdictText.style.color = "#ff5d5d";
      }

      riskBadge.textContent = "Risk: " + riskLevel;
      if (riskLevel === "Low") riskBadge.style.color = "#25d366";
      else if (riskLevel === "Medium") riskBadge.style.color = "#ffb020";
      else riskBadge.style.color = "#ff5d5d";
    }

    analyzeBtn.addEventListener("click", async () => {
      if (!images.length) return;
      hideError();
      resultsWrap.style.display = "none";
      loadingBox.style.display = "flex";
      analyzeBtn.disabled = true;

      try {
        const content = images.map((img) => ({
          type: "image",
          source: {
            type: "base64",
            media_type: img.type || "image/jpeg",
            data: img.base64
          }
        }));

        content.push({
          type: "text",
          text: "Analyze these marketplace screenshots and tell me if this item is worth flipping for profit."
        });

        const res = await fetch("/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1200,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content }]
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Analysis failed.");
        }

        scansLeft = data.scansLeft ?? scansLeft;
        updateTopScans();

        let rawText = "";
        if (data.content && data.content.length > 0) {
          rawText = data.content[0].text || "";
        }

        rawText = rawText.trim();

        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          console.error("Parse error:", rawText);
          showError("AI returned a bad response. Check Railway logs.");
          loadingBox.style.display = "none";
          return;
        }

        verdictText.textContent = parsed.verdict || "SKIP";
        reasonText.textContent = parsed.reasoning || "No reasoning returned.";
        offerValue.textContent = formatMoney(parsed.offerPrice);
        profitValue.textContent = formatMoney(parsed.profitLow) + " - " + formatMoney(parsed.profitHigh);
        resellRangeValue.textContent = formatMoney(parsed.resaleLow) + " - " + formatMoney(parsed.resaleHigh);
        resellValue.textContent = formatMoney(parsed.resellPrice);
        sellerMessage.textContent = parsed.sellerMessage || "";

        checkList.innerHTML = "";
        (parsed.whatToCheck || []).forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          checkList.appendChild(li);
        });

        tipsList.innerHTML = "";
        (parsed.profitTips || []).forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          tipsList.appendChild(li);
        });

        detailsList.innerHTML = "";
        [
          "Asking price: " + formatMoney(parsed.askingPrice),
          "Risk note: " + (parsed.riskNote || "None"),
          "Resell platforms: " + ((parsed.resellPlatforms || []).join(", ") || "None listed"),
          "Expected resell time: " + (parsed.resellTime || "Unknown")
        ].forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          detailsList.appendChild(li);
        });

        setVerdictStyle(parsed.verdict, parsed.riskLevel || "Medium");

        loadingBox.style.display = "none";
        resultsWrap.style.display = "grid";
      } catch (err) {
        loadingBox.style.display = "none";
        showError(err.message || "Something went wrong.");
      } finally {
        analyzeBtn.disabled = images.length === 0 || scansLeft === 0;
      }
    });

    loadScans();
    refreshThumbs();
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("FlipFlow running on port " + PORT);
});
