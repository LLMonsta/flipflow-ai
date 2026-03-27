# FlipFlow AI

Analyze Facebook Marketplace listings and know instantly if they're worth flipping.

---

## Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API key
```bash
cp .env.example .env
# Open .env and paste your Anthropic API key
```

### 3. Run the app
```bash
npm run dev
```

This starts both the Express server (port 3001) and the Vite dev server (port 5173).
Open http://localhost:5173

---

## Deploy to Railway (free)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create flipflow-ai --public --push
```

### 2. Deploy on Railway
1. Go to https://railway.app and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your `flipflow-ai` repo
4. Click **Variables** → Add:
   - `ANTHROPIC_API_KEY` = your key from https://console.anthropic.com
5. Railway auto-deploys. Your live URL appears in 2-3 minutes.

That's it. Your API key stays on the server — never exposed to users.

---

## Project Structure

```
flipflow-ai/
├── server/
│   └── index.js        ← Express proxy server
├── src/
│   ├── main.jsx         ← React entry point
│   └── FlipFlowAI.jsx   ← Full UI component
├── index.html
├── vite.config.js       ← Proxies /analyze to Express in dev
├── package.json
├── railway.toml         ← Railway deploy config
└── .env.example
```

## How the proxy works

```
User uploads image
      ↓
React app → POST /analyze (your server)
      ↓
Express adds API key → POST api.anthropic.com
      ↓
JSON response → back to React UI
```

API key never touches the browser.
