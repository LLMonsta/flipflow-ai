import express from "express";
import fetch from "node-fetch";

const app  = express();
app.use(express.json({ limit: "50mb" }));

const DAILY_LIMIT = 3;
const usage = new Map();
const getKey = (ip) => `${ip}::${new Date().toISOString().slice(0,10)}`;
const getUsage = (ip) => usage.get(getKey(ip)) || 0;
const incUsage = (ip) => { const k = getKey(ip); usage.set(k, (usage.get(k) || 0) + 1); };

app.get("/scans-left", (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  res.json({ scansLeft: Math.max(0, DAILY_LIMIT - getUsage(ip)), limit: DAILY_LIMIT });
});

app.post("/analyze", async (req, res) => {
  const ip     = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set." });
  if (getUsage(ip) >= DAILY_LIMIT) return res.status(429).json({ error: "You've used all 3 free scans today. Come back tomorrow!", scansLeft: 0 });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    if (data.content) incUsage(ip);
    res.json({ ...data, scansLeft: Math.max(0, DAILY_LIMIT - getUsage(ip)) });
  } catch (err) {
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>FlipFlow AI</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#080808;color:#e0e0e0;font-family:'IBM Plex Mono',monospace;display:flex;justify-content:center;min-height:100vh}
#app{width:100%;max-width:500px;padding:28px 18px 60px;display:flex;flex-direction:column;gap:12px}
.topbar{display:flex;align-items:center;justify-content:space-between}
.wordmark{display:flex;gap:2px}
.flip{font-size:22px;font-weight:700;color:#00E676;letter-spacing:2px}
.flow{font-size:22px;font-weight:700;color:#fff;letter-spacing:2px}
.scan-pill{font-size:10px;color:#00E676;border:1px solid rgba(0,230,118,.25);border-radius:20px;padding:3px 10px;letter-spacing:1px}
.scan-pill.empty{color:#FF3D57;border-color:rgba(255,61,87,.25)}
.hero{text-align:center;padding:28px 0 8px}
.hero-big{font-size:64px;font-weight:700;color:#161616;line-height:1}
.hero-sub{font-size:11px;color:#1e1e1e;letter-spacing:4px;margin-top:6px}
.dropzone{border:1px solid #141414;border-radius:12px;background:#0d0d0d;padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;transition:border-color .2s}
.dropzone:hover{border-color:#1e1e1e}
.drop-icon{font-size:28px;color:#1e1e1e;margin-bottom:4px}
.drop-main{font-size:15px;font-weight:700;color:#ccc}
.drop-sub{font-size:11px;color:#2a2a2a;letter-spacing:1px}
.drop-cta{margin-top:14px;font-size:11px;color:#00E676;letter-spacing:3px;border:1px solid rgba(0,230,118,.2);padding:7px 20px;border-radius:4px}
.thumb-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.thumb{position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;border:1px solid #1a1a1a}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.thumb-x{position:absolute;top:4px;right:4px;background:rgba(0,0,0,.8);border:none;border-radius:50%;width:18px;height:18px;color:#fff;font-size:9px;cursor:pointer}
.thumb-add{aspect-ratio:1;border-radius:8px;border:1px dashed #1e1e1e;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:22px;color:#333}
.thumb-meta{display:flex;justify-content:space-between;font-size:11px;margin-top:8px}
.thumb-count{color:#444}
.clear-link{background:none;border:none;color:#333;font-size:11px;cursor:pointer;text-decoration:underline;font-family:inherit}
.scan-btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:18px;background:#00E676;color:#000;border:none;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:3px;cursor:pointer;font-family:'IBM Plex Mono',monospace;transition:all .2s;width:100%}
.scan-btn:hover:not(:disabled){background:#1aff88;transform:translateY(-2px)}
.scan-btn:disabled{background:#0d0d0d;color:#1e1e1e;cursor:not-allowed}
.disclaimer{text-align:center;font-size:10px;color:#1e1e1e;letter-spacing:1px}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{width:48px;height:48px;border:2px solid #161616;border-top-color:#00E676;border-radius:50%;animation:spin .7s linear infinite;margin-bottom:24px}
.load-title{font-size:18px;font-weight:700;letter-spacing:4px;color:#fff}
.load-sub{font-size:11px;color:#333;letter-spacing:1px;margin-top:8px}
@keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ticker{margin-top:32px;font-size:10px;color:#161616;overflow:hidden;white-space:nowrap}
.ticker-inner{animation:scroll 10s linear infinite;display:inline-block}
.verdict-hero{border:1px solid;border-radius:12px;padding:20px}
.verdict-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.verdict-word{font-size:32px;font-weight:700;letter-spacing:2px;flex:1}
.roi-badge{border:1px solid;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700}
.verdict-reason{font-size:13px;color:#666;line-height:1.6}
.profit-banner{background:#0d0d0d;border:1px solid #161616;border-radius:12px;padding:20px;display:flex;justify-content:space-between;align-items:center}
.profit-label{font-size:10px;color:#333;letter-spacing:3px;margin-bottom:6px}
.profit-num{font-size:28px;font-weight:700;color:#00E676}
.profit-small{font-size:13px;color:#444;line-height:1.8}
.stats-row{background:#0d0d0d;border:1px solid #161616;border-radius:10px;padding:14px 16px;display:flex;align-items:center}
.stat{flex:1;text-align:center}
.stat-l{font-size:9px;color:#2a2a2a;letter-spacing:1.5px;margin-bottom:4px}
.stat-v{font-size:13px;font-weight:700}
.stat-divider{width:1px;height:30px;background:#141414;flex-shrink:0}
.card{background:#0d0d0d;border:1px solid #141414;border-radius:12px;padding:18px}
.card-head{display:flex;align-items:center;gap:8px;font-size:10px;color:#333;letter-spacing:2px;margin-bottom:14px}
.dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.row{font-size:12px;color:#888;line-height:1.6;margin-bottom:8px;display:flex}
.copy-btn{margin-left:auto;background:#141414;border:1px solid #1e1e1e;border-radius:4px;color:#555;padding:3px 10px;cursor:pointer;font-size:10px;letter-spacing:1px;font-family:'IBM Plex Mono',monospace}
.copy-btn.copied{background:rgba(0,230,118,.1);border-color:rgba(0,230,118,.3);color:#00E676}
.msg-box{background:#080808;border:1px solid #111;border-radius:8px;padding:14px;font-size:12px;color:#aaa;line-height:1.8;white-space:pre-wrap}
.cash-row{display:flex;justify-content:space-between;margin-bottom:10px}
.cash-l{font-size:9px;color:#2a2a2a;letter-spacing:2px;margin-bottom:4px}
.cash-v{font-size:24px;font-weight:700;color:#fff}
.range-note{font-size:11px;color:#2a2a2a;margin-bottom:12px}
.platforms{display:flex;gap:6px;flex-wrap:wrap}
.ptag{background:#111;border:1px solid #1a1a1a;border-radius:20px;padding:4px 12px;font-size:11px;color:#444}
.risk-note{font-size:11px;color:#2a2a2a;line-height:1.6;padding:6px 0}
.reset-btn{padding:14px;background:none;border:1px solid #141414;border-radius:10px;color:#2a2a2a;font-size:12px;letter-spacing:2px;cursor:pointer;font-family:'IBM Plex Mono',monospace;width:100%}
.limit-box{background:#0d0d0d;border:1px solid #1e1e1e;border-radius:12px;padding:24px;text-align:center}
.limit-title{font-size:14px;font-weight:700;color:#FF3D57;margin-bottom:8px}
.limit-sub{font-size:12px;color:#444;line-height:1.7}
.new-btn{font-size:11px;color:#333;background:none;border:1px solid #1a1a1a;border-radius:6px;padding:5px 12px;cursor:pointer;font-family:'IBM Plex Mono',monospace}
@keyframes fadein{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.fadein{animation:fadein .35s ease forwards}
</style>
</head>
<body>
<div id="app"></div>
<script>
const SYSTEM_PROMPT = "You are FlipFlow AI, an expert flipper and resale strategist. You will receive one or more images of a marketplace listing. Return ONLY a valid JSON object: {verdict: BUY|MAYBE|SKIP, profitLow: number, profitHigh: number, offerPrice: number, askingPrice: number, resaleLow: number, resaleHigh: number, resellPrice: number, riskLevel: Low|Medium|High, riskNote: string, reasoning: string, sellerMessage: string, resellPlatforms: [string], resellTime: string, profitTips: [string], whatToCheck: [string]}. All dollar amounts as numbers only. Be realistic. If it won't make money say SKIP.";
const VERDICT={BUY:{label:"BUY IT",color:"#00E676",bg:"rgba(0,230,118,0.07)",border:"rgba(0,230,118,0.25)",icon:"▲"},MAYBE:{label:"MAYBE",color:"#FFB300",bg:"rgba(255,179,0,0.07)",border:"rgba(255,179,0,0.25)",icon:"◆"},SKIP:{label:"SKIP IT",color:"#FF3D57",bg:"rgba(255,61,87,0.07)",border:"rgba(255,61,87,0.25)",icon:"▼"}};
const RISK_COLOR={Low:"#00E676",Medium:"#FFB300",High:"#FF3D57"};
const MAX=8;
const fmt=n=>"$"+Number(n).toLocaleString();
let images=[],scansLeft=null,result=null;
fetch("/scans-left").then(r=>r.json()).then(d=>{scansLeft=d.scansLeft;render();}).catch(()=>{});
function readFile(file){return new Promise(res=>{const r=new FileReader();r.onload=()=>res({url:URL.createObjectURL(file),b64:r.result.split(",")[1],name:file.name});r.readAsDataURL(file);});}
async function addFiles(files){const valid=Array.from(files).filter(f=>f.type.startsWith("image/")).slice(0,MAX-images.length);if(!valid.length)return;const next=await Promise.all(valid.map(readFile));const seen=new Set(images.map(i=>i.name));images=[...images,...next.filter(i=>!seen.has(i.name))].slice(0,MAX);render();}
async function analyze(){if(!images.length)return;renderLoading();try{const res=await fetch("/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:SYSTEM_PROMPT,messages:[{role:"user",content:[...images.map(img=>({type:"image",source:{type:"base64",media_type:"image/jpeg",data:img.b64}})),{type:"text",text:"Analyze these "+images.length+" listing image(s). Is this worth flipping?"}]}]})});const data=await res.json();if(res.status===429){alert(data.error);scansLeft=0;render();return;}if(data.scansLeft!==undefined)scansLeft=data.scansLeft;const raw=(data.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();result=JSON.parse(raw);renderResults();}catch(e){alert("Couldn't read that listing. Try again.");render();}}
function reset(){images=[];result=null;render();}
function copyMsg(){navigator.clipboard.writeText(result.sellerMessage);const btn=document.getElementById("copy-btn");if(btn){btn.textContent="✓ SENT";btn.classList.add("copied");setTimeout(()=>{btn.textContent="COPY";btn.classList.remove("copied");},2000);}}
function render(){const app=document.getElementById("app");const pill=scansLeft!==null?'<div class="scan-pill '+(scansLeft===0?"empty":"")+'">'+( scansLeft===0?"NO SCANS LEFT":scansLeft+" LEFT")+"</div>":"";let body;if(images.length===0){body='<div class="dropzone" onclick="document.getElementById(\'fi\').click()" ondrop="onDrop(event)" ondragover="event.preventDefault()"><div class="drop-icon">⬆</div><div class="drop-main">Drop your listing screenshots</div><div class="drop-sub">Price photo · condition shots · serial numbers</div><div class="drop-cta">TAP TO UPLOAD</div></div>';}else{const thumbs=images.map((img,i)=>'<div class="thumb"><img src="'+img.url+'"/><button class="thumb-x" onclick="removeImg('+i+')">✕</button></div>').join("");const add=images.length<MAX?'<div class="thumb-add" onclick="document.getElementById(\'fi\').click()">+</div>':"";body='<div><div class="thumb-grid">'+thumbs+add+'</div><div class="thumb-meta"><span class="thumb-count">'+images.length+' photo'+(images.length>1?"s":"")+" ready</span><button class=\"clear-link\" onclick=\"reset()\">clear</button></div></div>";}
const action=scansLeft===0?'<div class="limit-box"><div class="limit-title">Daily limit reached</div><div class="limit-sub">Come back tomorrow for 3 more free scans.</div></div>':'<button class="scan-btn" onclick="analyze()" '+(images.length?"":"disabled")+'>◈ SCAN FOR PROFIT</button>';
app.innerHTML='<div class="fadein" style="display:flex;flex-direction:column;gap:12px;width:100%"><div class="topbar"><div class="wordmark"><span class="flip">FLIP</span><span class="flow">FLOW</span></div>'+pill+'</div><div class="hero"><div class="hero-big">$???</div><div class="hero-sub">WAITING IN THIS LISTING</div></div>'+body+'<input id="fi" type="file" accept="image/*" multiple style="display:none" onchange="onFileInput(event)"/>'+action+'<div class="disclaimer">3 free scans per day · No account needed</div></div>';}
function renderLoading(){document.getElementById("app").innerHTML='<div class="fadein" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center"><div class="spinner"></div><div class="load-title">SCANNING DEAL</div><div class="load-sub">Reviewing '+images.length+' photo'+(images.length>1?"s":"")+'</div><div class="ticker"><span class="ticker-inner">ANALYZING · PRICING · COMPARING · CALCULATING · ANALYZING · PRICING · COMPARING · CALCULATING · </span></div></div>';}
function renderResults(){const r=result;const v=VERDICT[r.verdict]||VERDICT.SKIP;const roi=r.offerPrice?Math.round((r.profitHigh/r.offerPrice)*100):0;const rc=RISK_COLOR[r.riskLevel]||"#FFB300";const pill=scansLeft!==null?'<div class="scan-pill '+(scansLeft===0?"empty":"")+'">'+scansLeft+" LEFT</div>":"";const checks=(r.whatToCheck||[]).map(c=>'<div class="row"><span style="color:#FFB300;margin-right:8px">→</span>'+c+"</div>").join("");const tips=(r.profitTips||[]).map(t=>'<div class="row"><span style="color:#00E676;font-weight:700;margin-right:8px">+$</span>'+t+"</div>").join("");const ptags=(r.resellPlatforms||[]).map(p=>'<span class="ptag">'+p+"</span>").join("");
document.getElementById("app").innerHTML='<div class="fadein" style="display:flex;flex-direction:column;gap:12px;width:100%"><div class="topbar"><div class="wordmark"><span class="flip">FLIP</span><span class="flow">FLOW</span></div><div style="display:flex;align-items:center;gap:8px">'+pill+'<button class="new-btn" onclick="reset()">+ NEW SCAN</button></div></div><div class="verdict-hero" style="background:'+v.bg+';border-color:'+v.border+'"><div class="verdict-row"><span style="font-size:22px;color:'+v.color+'">'+v.icon+'</span><span class="verdict-word" style="color:'+v.color+'">'+v.label+'</span><span class="roi-badge" style="border-color:'+v.border+';color:'+v.color+'">'+roi+'% ROI</span></div><p class="verdict-reason">'+r.reasoning+'</p></div><div class="profit-banner"><div><div class="profit-label">ESTIMATED PROFIT</div><div class="profit-num">'+fmt(r.profitLow)+'<span style="color:#333"> – </span>'+fmt(r.profitHigh)+'</div></div><div style="text-align:right"><div class="profit-small">Offer <span style="color:#FF3D57">'+fmt(r.offerPrice)+'</span></div><div class="profit-small">Resell <span style="color:#00E676">'+fmt(r.resellPrice)+'</span></div></div></div><div class="stats-row"><div class="stat"><div class="stat-l">ASK</div><div class="stat-v" style="color:#555;text-decoration:line-through">'+fmt(r.askingPrice)+'</div></div><div class="stat-divider"></div><div class="stat"><div class="stat-l">YOUR OFFER</div><div class="stat-v" style="color:#00E676">'+fmt(r.offerPrice)+'</div></div><div class="stat-divider"></div><div class="stat"><div class="stat-l">RISK</div><div class="stat-v" style="color:'+rc+'">'+r.riskLevel+'</div></div><div class="stat-divider"></div><div class="stat"><div class="stat-l">SELL IN</div><div class="stat-v" style="color:#FFB300">'+r.resellTime+'</div></div></div>'+(checks?'<div class="card"><div class="card-head"><span class="dot" style="background:#FFB300"></span>CHECK IN PERSON</div>'+checks+'</div>':'')+'<div class="card"><div class="card-head"><span class="dot" style="background:#00E676"></span>FIRE THIS MESSAGE<button id="copy-btn" class="copy-btn" onclick="copyMsg()">COPY</button></div><div class="msg-box">'+r.sellerMessage+'</div></div><div class="card"><div class="card-head"><span class="dot" style="background:#FFB300"></span>CASH OUT PLAN</div><div class="cash-row"><div><div class="cash-l">LIST FOR</div><div class="cash-v">'+fmt(r.resellPrice)+'</div></div><div style="text-align:right"><div class="cash-l">GONE IN</div><div class="cash-v" style="color:#FFB300">'+r.resellTime+'</div></div></div><div class="range-note">Range: '+fmt(r.resaleLow)+' – '+fmt(r.resaleHigh)+'</div><div class="platforms">'+ptags+'</div></div>'+(tips?'<div class="card"><div class="card-head"><span class="dot" style="background:#00E676"></span>STACK MORE PROFIT</div>'+tips+'</div>':'")+'<div class="risk-note"><span style="color:'+rc+';margin-right:6px">⚠</span>'+r.riskNote+'</div><button class="reset-btn" onclick="reset()">← SCAN ANOTHER DEAL</button></div>';}
function onFileInput(e){addFiles(e.target.files);e.target.value="";}
function onDrop(e){e.preventDefault();addFiles(e.dataTransfer.files);}
function removeImg(i){images=images.filter((_,j)=>j!==i);render();}
render();
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => console.log(`FlipFlow running on port ${PORT}`));
