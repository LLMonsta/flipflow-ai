// FlipFlow AI Server

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "50mb" }));

const DAILY_LIMIT = 3;
const usage = new Map();

// Track usage per IP per day
const getKey = (ip) => `${ip}::${new Date().toISOString().slice(0, 10)}`;
const getUsage = (ip) => usage.get(getKey(ip)) || 0;
const incUsage = (ip) => {
  const key = getKey(ip);
  usage.set(key, (usage.get(key) || 0) + 1);
};

// Check scans left
app.get("/scans-left", (req, res) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  res.json({
    scansLeft: Math.max(0, DAILY_LIMIT - getUsage(ip)),
    limit: DAILY_LIMIT,
  });
});

// Analyze endpoint
app.post("/analyze", async (req, res) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

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
    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();

    if (data.content) incUsage(ip);

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

// Basic home route
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>FlipFlow AI</title>
</head>
<body style="background:black;color:white;text-align:center;padding-top:100px;font-family:sans-serif;">
  <h1>FlipFlow AI 🚀</h1>
  <p>Your app is LIVE</p>
  <button onclick="test()">Test API</button>

  <script>
    async function test() {
      const res = await fetch('/scans-left');
      const data = await res.json();
      alert("Scans left: " + data.scansLeft);
    }
  </script>
</body>
</html>
  `);
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log("FlipFlow running on port " + PORT);
});
