import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "50mb" }));

const DAILY_LIMIT = 3;
const usage = new Map();

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function getUsageKey(ip) {
  return `${ip}::${new Date().toISOString().slice(0, 10)}`;
}

function getUsage(ip) {
  return usage.get(getUsageKey(ip)) || 0;
}

function incrementUsage(ip) {
  const key = getUsageKey(ip);
  usage.set(key, (usage.get(key) || 0) + 1);
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err };
  }
}

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
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY not set.",
    });
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
      return res.status(response.status).json({
        error:
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message || "Anthropic request failed.",
        raw: data,
      });
    }

    if (data.content) {
      incrementUsage(ip);
    }

    return res.json({
      ...data,
      scansLeft: Math.max(0, DAILY_LIMIT - getUsage(ip)),
    });
  } catch (err) {
    console.error("Analyze route error:", err);
    return res.status(500).json({
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
      --bg: #0b0d12;
      --panel: #131722;
      --panel-2: #1a2030;
      --border: #2a3142;
      --text: #f4f7fb;
      --muted: #9ca6b7;
      --green: #6be675;
      --green-dark: #49c957;
      --red: #ff6b6b;
      --yellow: #ffb84d;
      --shadow: 0 20px 45px rgba(0,0,0,0.35);
      --radius: 18px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top, rgba(107,230,117,.12), transparent 30%),
        linear-gradient(180deg, #0b0d12 0%, #10141c 100%);
      min-height: 100vh;
    }

    .wrap {
      max-width: 980px;
      margin: 0 auto;
      padding: 24px 18px 60px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .brand-badge {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--green), #7fd2ff);
      color: #07120a;
      box-shadow: var(--shadow);
      font-size: 20px;
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

    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }

    .hero {
      padding: 28px;
      margin-bottom: 18px;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 22px;
    }

    .hero h1 {
      margin: 0 0 12px;
      font-size: clamp(34px, 6vw, 56px);
      line-height: 0.98;
      letter-spacing: -0.05em;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.6;
    }

    .hero-card {
      background: rgba(255,255,255,.03);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px;
    }

    .hero-card h3 {
      margin: 0 0 10px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: var(--muted);
    }

    .hero-card ul {
      margin: 0;
      padding-left: 18px;
      line-height: 1.9;
    }

    .uploader {
      padding: 22px;
    }

    .dropzone {
      border: 1.5px dashed #3a465d;
      background: linear-gradient(180deg, rgba(127,210,255,.06), rgba(107,230,117,.05));
      border-radius: 20px;
      padding: 28px;
      text-align: center;
    }

    .dropzone h2 {
      margin: 10px 0 8px;
      font-size: 24px;
      letter-spacing: -0.03em;
    }

    .dropzone p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
    }

    .upload-icon {
      font-size: 36px;
    }

    .btn-row {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    button {
      border: 0;
      border-radius: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: .18s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--green), var(--green-dark));
      color: #07120a;
      padding: 14px 20px;
      min-width: 180px;
      font-size: 15px;
    }

    .btn-primary:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: rgba(255,255,255,.04);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 14px 20px;
      font-size: 15px;
    }

    .meta {
      margin-top: 14px;
      color: var(--muted);
      font-size: 14px;
    }

    .thumbs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .thumb {
      position: relative;
      aspect-ratio: 1 / 1;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--panel-2);
    }

    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .thumb-remove {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      background: rgba(0,0,0,.72);
      color: white;
      font-size: 14px;
    }

    .error {
      display: none;
      margin-top: 16px;
      background: rgba(255,107,107,.08);
      border: 1px solid rgba(255,107,107,.25);
      color: #ffbaba;
      padding: 16px;
      border-radius: 16px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
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
      animation: spin
