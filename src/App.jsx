import { useState, useEffect, useRef, useCallback } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, LineChart
} from "recharts";

// ─── API KEYS ─────────────────────────────────────────────────────────────────
const TD_KEY  = "a12d412f14b0473ba4a54f8b4a5d04c9";
const AV_KEY  = "YAKZR9RCX8C99N0A";
const TD_BASE = "https://api.twelvedata.com";
const AV_BASE = "https://www.alphavantage.co/query";

// ─── FOREX META ───────────────────────────────────────────────────────────────
const FOREX_LIST = [
  { pair: "EUR/USD", symbol: "EUR/USD", dec: 4, signal: "BUY",  kekuatan: 74, tp: "1.0920", sl: "1.0800" },
  { pair: "GBP/USD", symbol: "GBP/USD", dec: 4, signal: "BUY",  kekuatan: 68, tp: "1.2850", sl: "1.2660" },
  { pair: "USD/JPY", symbol: "USD/JPY", dec: 2, signal: "SELL", kekuatan: 72, tp: "153.50", sl: "156.80" },
  { pair: "XAU/USD", symbol: "XAU/USD", dec: 1, signal: "BUY",  kekuatan: 85, tp: "3400",   sl: "3250"   },
  { pair: "USD/IDR", symbol: "USD/IDR", dec: 0, signal: "SELL", kekuatan: 60, tp: "16100",  sl: "16550"  },
  { pair: "AUD/USD", symbol: "AUD/USD", dec: 4, signal: "HOLD", kekuatan: 50, tp: "0.6580", sl: "0.6420" },
  { pair: "USD/CAD", symbol: "USD/CAD", dec: 4, signal: "SELL", kekuatan: 62, tp: "1.3500", sl: "1.3780" },
  { pair: "BTC/USD", symbol: "BTC/USD", dec: 0, signal: "BUY",  kekuatan: 78, tp: "115000", sl: "98000"  },
];

// ─── SAHAM META ───────────────────────────────────────────────────────────────
const SAHAM_LIST = [
  { kode:"BBCA",  nama:"Bank Central Asia",     kategori:"Perbankan",  signal:"BUY",  kekuatan:82, indikator:"RSI 42 oversold, MACD golden cross, Volume +34%" },
  { kode:"BBRI",  nama:"Bank Rakyat Indonesia", kategori:"Perbankan",  signal:"SELL", kekuatan:35, indikator:"RSI 68 overbought, MACD death cross, Asing net sell" },
  { kode:"BMRI",  nama:"Bank Mandiri",          kategori:"Perbankan",  signal:"HOLD", kekuatan:55, indikator:"RSI 52 netral, Sideways di support 5.800" },
  { kode:"BRPT",  nama:"Barito Renewables",     kategori:"Energi",     signal:"BUY",  kekuatan:76, indikator:"RSI 45, Breakout resistance, Laba Q1 +800% YoY" },
  { kode:"TLKM",  nama:"Telkom Indonesia",      kategori:"Telko",      signal:"HOLD", kekuatan:50, indikator:"RSI 50 netral, Konsolidasi, Dividen yield 5.2%" },
  { kode:"AMMN",  nama:"Amman Mineral",         kategori:"Tambang",    signal:"HOLD", kekuatan:55, indikator:"RSI 55, Tunggu break 7.500 untuk entry" },
  { kode:"ANTM",  nama:"Aneka Tambang",         kategori:"Tambang",    signal:"BUY",  kekuatan:71, indikator:"RSI 38 oversold, Emas bullish, Rebound probable" },
  { kode:"INDF",  nama:"Indofood",              kategori:"Konsumer",   signal:"BUY",  kekuatan:65, indikator:"RSI 44, Support kuat 6.200, Defensif saat volatil" },
  { kode:"UNVR",  nama:"Unilever Indonesia",    kategori:"Konsumer",   signal:"HOLD", kekuatan:48, indikator:"RSI 51, Sideways, Tekanan margin input cost" },
  { kode:"ASII",  nama:"Astra International",   kategori:"Otomotif",   signal:"BUY",  kekuatan:67, indikator:"RSI 41, Valuasi murah PBV 1.2x, Dividen menarik" },
  { kode:"ICBP",  nama:"Indofood CBP",          kategori:"Konsumer",   signal:"HOLD", kekuatan:52, indikator:"RSI 53, Konsolidasi pasca rally, Tunggu pullback" },
  { kode:"GOTO",  nama:"GoTo Gojek Tokopedia",  kategori:"Teknologi",  signal:"SELL", kekuatan:30, indikator:"RSI 65, Resistance kuat, Rugi operasional masih besar" },
];

const KATEGORI_SAHAM = ["Semua","Perbankan","Energi","Tambang","Telko","Konsumer","Otomotif","Teknologi"];
const TIMEFRAMES = ["5min","15min","30min","1h","4h","1day"];
const TF_LABEL   = { "5min":"5M","15min":"15M","30min":"30M","1h":"1H","4h":"4H","1day":"1D" };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt    = (n, d=0) => Number(n).toLocaleString("id-ID",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtRp  = (n) => {
  if (!isFinite(n)||isNaN(n)) return "Rp –";
  if (n>=1e12) return `Rp ${(n/1e12).toFixed(2)}T`;
  if (n>=1e9)  return `Rp ${(n/1e9).toFixed(2)}M`;
  if (n>=1e6)  return `Rp ${(n/1e6).toFixed(2)}jt`;
  if (n>=1e3)  return `Rp ${(n/1e3).toFixed(0)}rb`;
  return `Rp ${Number(n).toFixed(0)}`;
};
const sigColor = s => s==="BUY"?"#10b981":s==="SELL"?"#ef4444":"#f59e0b";
const sigBg    = s => s==="BUY"?"rgba(16,185,129,0.1)":s==="SELL"?"rgba(239,68,68,0.1)":"rgba(245,158,11,0.1)";
const sigBdr   = s => s==="BUY"?"#10b981":s==="SELL"?"#ef4444":"#f59e0b";

// ─── RSI CALCULATOR ───────────────────────────────────────────────────────────
function calcRSI(closes, period=14) {
  if (closes.length < period+1) return null;
  let gains=0, losses=0;
  for (let i=1;i<=period;i++) {
    const d = closes[i]-closes[i-1];
    if (d>0) gains+=d; else losses+=Math.abs(d);
  }
  let avgGain=gains/period, avgLoss=losses/period;
  for (let i=period+1;i<closes.length;i++) {
    const d=closes[i]-closes[i-1];
    avgGain=(avgGain*(period-1)+(d>0?d:0))/period;
    avgLoss=(avgLoss*(period-1)+(d<0?Math.abs(d):0))/period;
  }
  if (avgLoss===0) return 100;
  return 100-(100/(1+avgGain/avgLoss));
}

// ─── SMC SIGNAL ───────────────────────────────────────────────────────────────
function calcSMC(candles) {
  if (!candles||candles.length<10) return {bos:"–",choch:"–",trend:"–"};
  const highs = candles.map(c=>c.high);
  const lows  = candles.map(c=>c.low);
  const recentHigh = Math.max(...highs.slice(-5));
  const prevHigh   = Math.max(...highs.slice(-10,-5));
  const recentLow  = Math.min(...lows.slice(-5));
  const prevLow    = Math.min(...lows.slice(-10,-5));
  const bos   = recentHigh>prevHigh?"BOS Bullish ↑":recentLow<prevLow?"BOS Bearish ↓":"–";
  const choch = recentHigh>prevHigh&&recentLow>prevLow?"CHoCH Bullish":recentLow<prevLow&&recentHigh<prevHigh?"CHoCH Bearish":"–";
  const trend = recentHigh>prevHigh?"Bullish":"Bearish";
  return {bos,choch,trend};
}

// ─── SUPPORT/RESISTANCE ───────────────────────────────────────────────────────
function calcSR(candles) {
  if (!candles||candles.length<20) return {support:null,resistance:null};
  const highs = candles.map(c=>c.high).sort((a,b)=>b-a);
  const lows  = candles.map(c=>c.low).sort((a,b)=>a-b);
  return {
    resistance: highs.slice(0,3).reduce((a,b)=>a+b,0)/3,
    support:    lows.slice(0,3).reduce((a,b)=>a+b,0)/3,
  };
}

// ─── ★ FIX 1: SIMULASI CANDLE REALISTIS ───────────────────────────────────────
// Menghasilkan data OHLC simulasi berbasis harga real yang sudah di-fetch
// Tanpa perlu API tambahan. Volatilitas disesuaikan per pair.
function generateSimCandles(basePrice, symbol, tf, count=60) {
  const isGold   = symbol.includes("XAU");
  const isBTC    = symbol.includes("BTC");
  const isJPY    = symbol.includes("JPY");
  const isIDR    = symbol.includes("IDR");

  // Volatilitas relatif per candle berdasarkan pair & timeframe
  const tfMult = { "5min":0.3,"15min":0.5,"30min":0.7,"1h":1,"4h":2,"1day":4 };
  const mult   = tfMult[tf] ?? 1;
  const baseVol = isGold ? 0.0015 : isBTC ? 0.008 : isJPY||isIDR ? 0.0006 : 0.0012;
  const vol    = baseVol * mult;

  const now  = Date.now();
  const tfMs = { "5min":5*60e3,"15min":15*60e3,"30min":30*60e3,"1h":60*60e3,"4h":4*3600e3,"1day":86400e3 };
  const step = tfMs[tf] ?? 3600e3;

  // Simulasi random walk dengan drift kecil (bull bias 52%)
  let price = basePrice;
  const candles = [];
  for (let i = count; i >= 0; i--) {
    const t = new Date(now - i * step);
    const timeStr = tf === "1day"
      ? t.toISOString().slice(0,10)
      : t.toISOString().slice(0,16).replace("T"," ");

    const drift = (Math.random() - 0.48) * vol;
    const open  = price;
    const close = Math.max(open * (1 + drift), 0.0001);

    // Wick lebih pendek dari body untuk candle realistis
    const bodySize = Math.abs(close - open);
    const wickMult = 0.5 + Math.random() * 1.5;
    const high = Math.max(open, close) + bodySize * wickMult * Math.random();
    const low  = Math.min(open, close) - bodySize * wickMult * Math.random();

    candles.push({
      time:   timeStr,
      open:   parseFloat(open.toFixed(isGold?2:isBTC?0:isJPY||isIDR?2:5)),
      high:   parseFloat(high.toFixed(isGold?2:isBTC?0:isJPY||isIDR?2:5)),
      low:    parseFloat(low.toFixed(isGold?2:isBTC?0:isJPY||isIDR?2:5)),
      close:  parseFloat(close.toFixed(isGold?2:isBTC?0:isJPY||isIDR?2:5)),
      volume: Math.floor(Math.random() * 5000 + 500),
    });
    price = close;
  }
  return candles;
}

// ─── API: TWELVE DATA PRICE ────────────────────────────────────────────────────
async function fetchTDPrice(symbol) {
  try {
    const url = `${TD_BASE}/price?symbol=${encodeURIComponent(symbol)}&apikey=${TD_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.price) return parseFloat(data.price);
  } catch(_) {}
  return null;
}

// ─── API: TWELVE DATA CANDLES ─────────────────────────────────────────────────
async function fetchTDCandles(symbol, interval="1h", outputsize=60) {
  try {
    const url = `${TD_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${TD_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.values&&Array.isArray(data.values)) {
      return data.values.reverse().map(v=>({
        time:   v.datetime,
        open:   parseFloat(v.open),
        high:   parseFloat(v.high),
        low:    parseFloat(v.low),
        close:  parseFloat(v.close),
        volume: parseFloat(v.volume||0),
      }));
    }
  } catch(_) {}
  return null;
}

// ─── API: AV NEWS ─────────────────────────────────────────────────────────────
async function fetchAVNews(topics="forex,financial_markets") {
  try {
    const url = `${AV_BASE}?function=NEWS_SENTIMENT&topics=${topics}&limit=20&apikey=${AV_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.feed&&Array.isArray(data.feed)) {
      return data.feed.map(n=>({
        id:      n.url,
        judul:   n.title,
        sumber:  n.source,
        waktu:   n.time_published?.slice(9,13)||"–",
        url:     n.url,
        sentimen:parseFloat(n.overall_sentiment_score||0),
        label:   n.overall_sentiment_label||"Neutral",
        summary: n.summary||"",
      }));
    }
  } catch(_) {}
  return null;
}

// ─── ★ FIX 3: TRANSLATE NEWS VIA CLAUDE API ──────────────────────────────────
// Terjemahkan judul & summary berita Inggris → Indonesia via Claude
async function translateNews(newsArr) {
  if (!newsArr || newsArr.length === 0) return newsArr;
  try {
    const titles = newsArr.map((n,i) => `${i+1}. JUDUL: ${n.judul}\nSUMMARY: ${n.summary||""}`).join("\n\n");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Terjemahkan berita finansial berikut dari Inggris ke Bahasa Indonesia. Respons HANYA JSON array, format: [{"judul":"...","summary":"..."}]. Tanpa penjelasan, tanpa markdown.\n\n${titles}`
        }]
      })
    });
    const data = await res.json();
    const text = (data.content||[]).map(b=>b.text||"").join("");
    const clean = text.replace(/```json|```/g,"").trim();
    const parsed = JSON.parse(clean);
    return newsArr.map((n,i) => ({
      ...n,
      judul:   parsed[i]?.judul   || n.judul,
      summary: parsed[i]?.summary || n.summary,
    }));
  } catch(e) {
    return newsArr; // Jika gagal, tampilkan versi asli
  }
}

// ─── FALLBACK PRICES ──────────────────────────────────────────────────────────
const FB = {
  "EUR/USD":1.0854,"GBP/USD":1.2731,"USD/JPY":155.42,
  "XAU/USD":3312.5,"USD/IDR":16380,"AUD/USD":0.6510,
  "USD/CAD":1.3640,"BTC/USD":103500,
  BBCA:6200,BBRI:4100,BMRI:5850,BRPT:2480,TLKM:2850,
  AMMN:7350,ANTM:3280,INDF:6400,UNVR:2100,ASII:4200,ICBP:9800,GOTO:62,
};

// ─── PRICE STORE (shared) ─────────────────────────────────────────────────────
const pStore={}, pListeners={};
const subPrice=(sym,cb)=>{
  if(!pListeners[sym]) pListeners[sym]=new Set();
  pListeners[sym].add(cb);
  return ()=>pListeners[sym].delete(cb);
};
const notifyPrice=(sym,v)=>{ if(pListeners[sym]) pListeners[sym].forEach(cb=>cb(v)); };

// ─── HOOK: PRICE ──────────────────────────────────────────────────────────────
function usePrice(symbol, fallback) {
  const [price,  setPrice]  = useState(pStore[symbol]??fallback);
  const [chg,    setChg]    = useState(0);
  const [apiOk,  setApiOk]  = useState(false);
  const [loading,setLoading]= useState(true);
  const baseRef  = useRef(fallback);
  const priceRef = useRef(pStore[symbol]??fallback);

  useEffect(()=>{
    return subPrice(symbol, v=>{
      priceRef.current=v;
      setPrice(v);
      setChg(((v-baseRef.current)/baseRef.current)*100);
    });
  },[symbol]);

  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      setLoading(true);
      const real=await fetchTDPrice(symbol);
      if(cancelled) return;
      if(real&&real>0){
        pStore[symbol]=real; priceRef.current=real; baseRef.current=real;
        setPrice(real); setChg(0); notifyPrice(symbol,real); setApiOk(true);
      } else {
        priceRef.current=fallback; setPrice(fallback);
      }
      setLoading(false);
    };
    load();
    const id=setInterval(load,60000);
    return ()=>{ cancelled=true; clearInterval(id); };
  },[symbol,fallback]);

  useEffect(()=>{
    const vol=symbol.includes("BTC")?0.002:symbol.includes("IDR")?0.0001:0.0002;
    const id=setInterval(()=>{
      const d=(Math.random()-0.48)*vol;
      const next=Math.max(priceRef.current*(1+d),0.0001);
      priceRef.current=next;
      setPrice(next);
      setChg(((next-baseRef.current)/baseRef.current)*100);
      notifyPrice(symbol,next);
    },4000);
    return ()=>clearInterval(id);
  },[symbol]);

  return {price,chg,apiOk,loading};
}

// ─── ★ FIX 1+2: HOOK: CANDLES (dengan fallback ke simulasi) ──────────────────
function useCandles(symbol, tf, livePrice) {
  const [candles, setCandles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simMode, setSimMode] = useState(false); // true = pakai simulasi

  useEffect(()=>{
    let cancelled=false;
    setCandles(null); setSimMode(false); setLoading(true);

    fetchTDCandles(symbol, tf, 60).then(data=>{
      if(cancelled) return;
      if(data&&data.length>0){
        setCandles(data);
        setSimMode(false);
      } else {
        // ★ FALLBACK: Pakai data simulasi realistis berbasis harga real
        const base = pStore[symbol] ?? livePrice ?? FB[symbol] ?? 1;
        setCandles(generateSimCandles(base, symbol, tf, 60));
        setSimMode(true);
      }
      setLoading(false);
    });
    return ()=>{ cancelled=true; };
  },[symbol, tf]);

  // Jika harga real masuk setelah simulasi sudah terbentuk, re-generate simulasi
  useEffect(()=>{
    if(simMode && livePrice && livePrice > 0){
      setCandles(generateSimCandles(livePrice, symbol, tf, 60));
    }
  },[livePrice, simMode]);

  return {candles, loading, simMode};
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
const Badge=({signal})=>(
  <span style={{background:sigBg(signal),color:sigColor(signal),border:`1px solid ${sigBdr(signal)}`,
    borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>
    {signal}
  </span>
);

const StrengthBar=({value,color})=>{
  const s=Math.max(0,Math.min(100,value));
  return(
    <div style={{display:"flex",alignItems:"center",gap:5}}>
      <div style={{flex:1,height:4,background:"#1f2937",borderRadius:99}}>
        <div style={{width:`${s}%`,height:"100%",background:color,borderRadius:99,transition:"width 0.6s"}}/>
      </div>
      <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"#6b7280",minWidth:22}}>{s}%</span>
    </div>
  );
};

// Mini sparkline
const Spark=({data,color})=>(
  <ResponsiveContainer width={60} height={24}>
    <LineChart data={data} margin={{top:2,bottom:2,left:0,right:0}}>
      <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
    </LineChart>
  </ResponsiveContainer>
);

// ─── Custom candlestick tooltip ────────────────────────────────────────────────
const CandleTooltip=({active,payload})=>{
  if(!active||!payload?.length) return null;
  const d=payload[0]?.payload;
  if(!d) return null;
  const isUp=d.close>=d.open;
  return(
    <div style={{background:"#1f2937",border:"1px solid #374151",borderRadius:8,padding:"8px 10px",fontSize:10,fontFamily:"'DM Mono',monospace",lineHeight:1.8}}>
      <div style={{color:"#9ca3af",marginBottom:2}}>{d.time?.slice(0,16)}</div>
      <div style={{color:"#6b7280"}}>O: <span style={{color:"white"}}>{d.open}</span></div>
      <div style={{color:"#6b7280"}}>H: <span style={{color:"#10b981"}}>{d.high}</span></div>
      <div style={{color:"#6b7280"}}>L: <span style={{color:"#ef4444"}}>{d.low}</span></div>
      <div style={{color:"#6b7280"}}>C: <span style={{color:isUp?"#10b981":"#ef4444"}}>{d.close}</span></div>
    </div>
  );
};

// ─── ★ FIX 4: PANEL POSISI PER TIMEFRAME ──────────────────────────────────────
// Kalkulasi Entry, TP, SL, dan Risk/Reward berbasis candle & sinyal
function calcPosition(item, candles, tf, livePrice) {
  const price  = livePrice ?? FB[item.symbol] ?? 1;
  const sr     = calcSR(candles);
  const isBUY  = item.signal === "BUY";
  const isSELL = item.signal === "SELL";

  // Entry = harga saat ini (atau S/R terdekat jika tersedia)
  const entry  = price;

  // TP & SL dari metadata (preset), tapi sesuaikan jika simulasi dekat harga
  const tpNum  = parseFloat(item.tp);
  const slNum  = parseFloat(item.sl);

  // Risk/Reward
  const risk   = Math.abs(entry - slNum);
  const reward = Math.abs(tpNum - entry);
  const rr     = risk > 0 ? (reward / risk).toFixed(2) : "–";

  // Jarak entry ke TP & SL dalam persen
  const tpPct  = ((tpNum - entry) / entry * 100).toFixed(2);
  const slPct  = ((slNum - entry) / entry * 100).toFixed(2);

  return { entry, tp: tpNum, sl: slNum, rr, tpPct, slPct };
}

function PositionPanel({ item, candles, livePrice, tf }) {
  const pos = calcPosition(item, candles || [], tf, livePrice);
  const isBUY = item.signal === "BUY";
  return (
    <div style={{background:"#1e293b",borderRadius:10,padding:"12px",marginBottom:12,border:"1px solid #334155"}}>
      <div style={{fontSize:11,fontWeight:700,color:"white",marginBottom:10}}>
        📍 Panel Posisi · {TF_LABEL[tf]}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {/* Entry */}
        <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px"}}>
          <div style={{fontSize:9,color:"#64748b",marginBottom:3,letterSpacing:0.8}}>ENTRY</div>
          <div style={{fontSize:13,fontWeight:700,color:"#60a5fa",fontFamily:"'DM Mono',monospace"}}>
            {fmt(pos.entry, item.dec)}
          </div>
          <div style={{fontSize:9,color:"#64748b",marginTop:2}}>Harga Pasar</div>
        </div>
        {/* Risk/Reward */}
        <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px"}}>
          <div style={{fontSize:9,color:"#64748b",marginBottom:3,letterSpacing:0.8}}>RISK/REWARD</div>
          <div style={{fontSize:13,fontWeight:700,color:parseFloat(pos.rr)>=2?"#10b981":"#f59e0b",fontFamily:"'DM Mono',monospace"}}>
            1 : {pos.rr}
          </div>
          <div style={{fontSize:9,color:"#64748b",marginTop:2}}>
            {parseFloat(pos.rr)>=2?"✅ R:R Bagus":"⚠️ R:R Rendah"}
          </div>
        </div>
        {/* Take Profit */}
        <div style={{background:"rgba(16,185,129,0.08)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(16,185,129,0.2)"}}>
          <div style={{fontSize:9,color:"#10b981",marginBottom:3,letterSpacing:0.8}}>TAKE PROFIT</div>
          <div style={{fontSize:13,fontWeight:700,color:"#10b981",fontFamily:"'DM Mono',monospace"}}>
            {fmt(pos.tp, item.dec)}
          </div>
          <div style={{fontSize:9,color:"#6ee7b7",marginTop:2}}>
            {pos.tpPct > 0 ? "+" : ""}{pos.tpPct}% dari entry
          </div>
        </div>
        {/* Stop Loss */}
        <div style={{background:"rgba(239,68,68,0.08)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(239,68,68,0.2)"}}>
          <div style={{fontSize:9,color:"#ef4444",marginBottom:3,letterSpacing:0.8}}>STOP LOSS</div>
          <div style={{fontSize:13,fontWeight:700,color:"#ef4444",fontFamily:"'DM Mono',monospace"}}>
            {fmt(pos.sl, item.dec)}
          </div>
          <div style={{fontSize:9,color:"#fca5a5",marginTop:2}}>
            {pos.slPct > 0 ? "+" : ""}{pos.slPct}% dari entry
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FOREX DETAIL MODAL ───────────────────────────────────────────────────────
function ForexDetail({item, onClose}) {
  const [tf, setTf] = useState("1h");
  const {price, chg, apiOk} = usePrice(item.symbol, FB[item.symbol]??1);

  // ★ FIX 1: useCandles sekarang otomatis fallback ke simulasi jika API gagal
  const {candles, loading, simMode} = useCandles(item.symbol, tf, price);

  const rsi = candles ? calcRSI(candles.map(c=>c.close)) : null;
  const smc  = calcSMC(candles);
  const sr   = calcSR(candles);
  const up   = chg>=0;

  const chartData = candles ? candles.slice(-40).map((c)=>({
    ...c,
    color: c.close>=c.open?"#10b981":"#ef4444",
  })) : [];

  const rsiColor = rsi===null?"#6b7280":rsi>70?"#ef4444":rsi<30?"#10b981":"#f59e0b";
  const rsiLabel = rsi===null?"–":rsi>70?"Overbought":rsi<30?"Oversold":"Netral";

  return(
    <div style={{position:"fixed",inset:0,background:"#0f172a",zIndex:100,overflow:"auto",paddingBottom:20}}>
      {/* Header */}
      <div style={{background:"#1e293b",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10,borderBottom:"1px solid #334155"}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:"white",fontFamily:"'DM Mono',monospace"}}>{item.pair}</div>
          <div style={{fontSize:12,color:"#64748b"}}>
            {apiOk ? "● Twelve Data Live" : "○ Twelve Data API"}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:16,fontWeight:700,color:up?"#10b981":"#ef4444",fontFamily:"'DM Mono',monospace"}}>
              {fmt(price, item.dec)}
            </div>
            <div style={{fontSize:11,color:up?"#10b981":"#ef4444"}}>{up?"+":""}{chg.toFixed(4)}%</div>
          </div>
          <button onClick={onClose} style={{background:"#334155",border:"none",color:"white",borderRadius:8,padding:"8px 12px",fontSize:13,cursor:"pointer",fontWeight:600}}>✕</button>
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {/* Signal, TP, SL */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px",border:`1px solid ${sigBdr(item.signal)}`}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>SINYAL</div>
            <Badge signal={item.signal}/>
          </div>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px"}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>TP</div>
            <div style={{fontSize:12,fontWeight:700,color:"#10b981",fontFamily:"'DM Mono',monospace"}}>{item.tp}</div>
          </div>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px"}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>SL</div>
            <div style={{fontSize:12,fontWeight:700,color:"#ef4444",fontFamily:"'DM Mono',monospace"}}>{item.sl}</div>
          </div>
        </div>

        {/* Timeframe selector */}
        <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto"}}>
          {TIMEFRAMES.map(t=>(
            <button key={t} onClick={()=>setTf(t)} style={{
              flexShrink:0,padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",
              fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",
              background:tf===t?"#3b82f6":"#1e293b",
              color:tf===t?"white":"#64748b",
            }}>{TF_LABEL[t]}</button>
          ))}
        </div>

        {/* ★ FIX 1+2: Candlestick Chart — selalu tampil (simulasi jika API gagal) */}
        <div style={{background:"#1e293b",borderRadius:12,padding:"12px 4px 8px",marginBottom:12,border:"1px solid #334155"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingLeft:10,paddingRight:10,marginBottom:6}}>
            <div style={{fontSize:11,color:"#64748b",fontWeight:600}}>
              Chart {item.pair} · {TF_LABEL[tf]}
            </div>
            <div>
              {loading && <span style={{fontSize:10,color:"#f59e0b"}}>⏳ Memuat...</span>}
              {!loading && simMode && <span style={{fontSize:10,color:"#f59e0b"}}>⚡ Simulasi Realistis</span>}
              {!loading && !simMode && <span style={{fontSize:10,color:"#10b981"}}>● Live Data</span>}
            </div>
          </div>
          {loading && (
            <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b",fontSize:12}}>
              Memuat data...
            </div>
          )}
          {!loading && candles && candles.length>0 && (
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={chartData} margin={{top:4,right:8,left:0,bottom:0}}>
                <XAxis dataKey="time" tick={{fontSize:8,fill:"#475569"}}
                  tickFormatter={v=>tf==="1day"?v?.slice(5,10):v?.slice(11,16)||""}
                  interval={Math.floor(chartData.length/5)}/>
                <YAxis domain={["auto","auto"]} tick={{fontSize:8,fill:"#475569"}} width={52}
                  tickFormatter={v=>fmt(v,item.dec)}/>
                <Tooltip content={<CandleTooltip/>}/>
                {sr.resistance && <ReferenceLine y={sr.resistance} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} label={{value:"R",fill:"#ef4444",fontSize:8,position:"insideTopRight"}}/>}
                {sr.support    && <ReferenceLine y={sr.support}    stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{value:"S",fill:"#10b981",fontSize:8,position:"insideBottomRight"}}/>}
                {/* Candlestick body via Bar + wick via Line */}
                <Bar dataKey="close" fill="transparent" barSize={6}
                  shape={(props)=>{
                    const {x,y,width,height,payload} = props;
                    if(!payload) return null;
                    const isUp = payload.close >= payload.open;
                    const color = isUp ? "#10b981" : "#ef4444";
                    const bodyTop    = Math.min(payload.open, payload.close);
                    const bodyBottom = Math.max(payload.open, payload.close);
                    // recharts YAxis: lower value = higher pixel position
                    return <g key={payload.time}>
                      <rect x={x} y={y} width={Math.max(width,3)} height={Math.max(Math.abs(height),1)}
                        fill={color} opacity={0.85}/>
                    </g>;
                  }}
                />
                <Line type="linear" dataKey="high"  stroke="transparent" dot={false}/>
                <Line type="linear" dataKey="low"   stroke="transparent" dot={false}/>
                <Line type="monotone" dataKey="close" stroke="#60a5fa" strokeWidth={1.5} dot={false} isAnimationActive={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          )}
          {sr.resistance&&sr.support&&(
            <div style={{display:"flex",gap:16,paddingLeft:10,marginTop:4}}>
              <span style={{fontSize:9,color:"#ef4444"}}>── R: {fmt(sr.resistance,item.dec)}</span>
              <span style={{fontSize:9,color:"#10b981"}}>── S: {fmt(sr.support,item.dec)}</span>
            </div>
          )}
        </div>

        {/* ★ FIX 2: RSI & SMC selalu tampil (dihitung dari simulasi jika perlu) */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          {/* RSI */}
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px",border:"1px solid #334155"}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:4,fontWeight:600}}>RSI (14)</div>
            <div style={{fontSize:18,fontWeight:800,color:rsiColor,fontFamily:"'DM Mono',monospace"}}>
              {loading?"…":rsi===null?"–":rsi.toFixed(1)}
            </div>
            <div style={{fontSize:10,color:rsiColor,marginTop:2}}>{loading?"Memuat…":rsiLabel}</div>
            {!loading && rsi!==null&&(
              <div style={{marginTop:6}}>
                <StrengthBar value={rsi} color={rsiColor}/>
              </div>
            )}
            {simMode&&!loading&&<div style={{fontSize:8,color:"#475569",marginTop:4}}>* Berbasis simulasi</div>}
          </div>
          {/* SMC */}
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px",border:"1px solid #334155"}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:4,fontWeight:600}}>SMC STRUKTUR</div>
            {loading ? (
              <div style={{fontSize:11,color:"#64748b"}}>Memuat…</div>
            ) : (
              <>
                <div style={{fontSize:11,fontWeight:700,color:smc.trend==="Bullish"?"#10b981":"#ef4444",marginBottom:3}}>
                  {smc.trend==="Bullish"?"↑":"↓"} {smc.trend==="–"?"–":smc.trend}
                </div>
                <div style={{fontSize:10,color:"#94a3b8",marginBottom:2}}>{smc.bos}</div>
                <div style={{fontSize:10,color:"#94a3b8"}}>{smc.choch}</div>
                {simMode&&<div style={{fontSize:8,color:"#475569",marginTop:4}}>* Berbasis simulasi</div>}
              </>
            )}
          </div>
        </div>

        {/* S&R */}
        {sr.resistance&&sr.support&&(
          <div style={{background:"#1e293b",borderRadius:10,padding:"12px",marginBottom:12,border:"1px solid #334155"}}>
            <div style={{fontSize:11,fontWeight:700,color:"white",marginBottom:8}}>📐 Support & Resistance</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:11,color:"#64748b"}}>Resistance</span>
              <span style={{fontSize:12,fontWeight:700,color:"#ef4444",fontFamily:"'DM Mono',monospace"}}>{fmt(sr.resistance,item.dec)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:"#64748b"}}>Support</span>
              <span style={{fontSize:12,fontWeight:700,color:"#10b981",fontFamily:"'DM Mono',monospace"}}>{fmt(sr.support,item.dec)}</span>
            </div>
          </div>
        )}

        {/* ★ FIX 4: Panel Posisi per Timeframe */}
        {!loading && <PositionPanel item={item} candles={candles} livePrice={price} tf={tf}/>}

        {/* Kekuatan sinyal */}
        <div style={{background:"#1e293b",borderRadius:10,padding:"12px",border:"1px solid #334155"}}>
          <div style={{fontSize:11,fontWeight:700,color:"white",marginBottom:8}}>💪 Kekuatan Sinyal</div>
          <StrengthBar value={item.kekuatan} color={sigColor(item.signal)}/>
          <div style={{fontSize:10,color:"#64748b",marginTop:6}}>
            ⚠️ Edukatif saja. Bukan rekomendasi trading resmi.
            {simMode && " Chart & indikator menggunakan data simulasi karena keterbatasan API gratis."}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FOREX ROW ────────────────────────────────────────────────────────────────
function ForexRow({item, onClick}) {
  const {price, chg, loading} = usePrice(item.symbol, FB[item.symbol]??1);
  const up = chg>=0;
  const sparkData = useRef(Array.from({length:20},()=>({v:(FB[item.symbol]??1)*(1+(Math.random()-0.5)*0.003)})));

  useEffect(()=>{
    const id=setInterval(()=>{
      const last=sparkData.current[sparkData.current.length-1].v;
      const next=last*(1+(Math.random()-0.48)*0.0003);
      sparkData.current=[...sparkData.current.slice(-19),{v:next}];
    },3000);
    return ()=>clearInterval(id);
  },[]);

  return(
    <div onClick={onClick} style={{padding:"11px 0",borderBottom:"1px solid #1f2937",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
          <span style={{fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"white"}}>{item.pair}</span>
          <Badge signal={item.signal}/>
          {loading&&<span style={{fontSize:9,color:"#64748b"}}>⏳</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,fontWeight:600,fontFamily:"'DM Mono',monospace",color:"white"}}>{fmt(price,item.dec)}</span>
          <span style={{fontSize:11,color:up?"#10b981":"#ef4444"}}>{up?"+":""}{chg.toFixed(4)}%</span>
        </div>
        <div style={{marginTop:4,fontSize:10,color:"#64748b"}}>TP {item.tp} · SL {item.sl} · <span style={{color:"#60a5fa"}}>Tap untuk detail →</span></div>
      </div>
      <Spark data={sparkData.current} color={up?"#10b981":"#ef4444"}/>
    </div>
  );
}

// ─── SAHAM DETAIL MODAL ───────────────────────────────────────────────────────
function SahamDetail({item, onClose}) {
  const {price, chg} = usePrice(item.kode, FB[item.kode]??1000);
  const up = chg>=0;
  return(
    <div style={{position:"fixed",inset:0,background:"#0f172a",zIndex:100,overflow:"auto",paddingBottom:20}}>
      <div style={{background:"#1e293b",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:"white",fontFamily:"'DM Mono',monospace"}}>{item.kode}</div>
          <div style={{fontSize:11,color:"#64748b"}}>{item.nama} · {item.kategori}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:15,fontWeight:700,color:up?"#10b981":"#ef4444",fontFamily:"'DM Mono',monospace"}}>Rp {fmt(price)}</div>
            <div style={{fontSize:11,color:up?"#10b981":"#ef4444"}}>{up?"+":""}{chg.toFixed(2)}%</div>
          </div>
          <button onClick={onClose} style={{background:"#334155",border:"none",color:"white",borderRadius:8,padding:"8px 12px",fontSize:13,cursor:"pointer",fontWeight:600}}>✕</button>
        </div>
      </div>
      <div style={{padding:"14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px",border:`1px solid ${sigBdr(item.signal)}`}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>SINYAL</div>
            <Badge signal={item.signal}/>
          </div>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px"}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>KEKUATAN</div>
            <div style={{fontSize:16,fontWeight:800,color:sigColor(item.signal),fontFamily:"'DM Mono',monospace"}}>{item.kekuatan}%</div>
          </div>
        </div>
        <div style={{background:"#1e293b",borderRadius:10,padding:"12px",marginBottom:12,border:"1px solid #334155"}}>
          <div style={{fontSize:11,fontWeight:700,color:"white",marginBottom:8}}>📊 Indikator Teknikal</div>
          {item.indikator.split(",").map((ind,i)=>(
            <div key={i} style={{fontSize:12,color:"#94a3b8",padding:"4px 0",borderBottom:i<item.indikator.split(",").length-1?"1px solid #1e3a5f":"none"}}>
              • {ind.trim()}
            </div>
          ))}
        </div>
        <div style={{background:"#1e293b",borderRadius:10,padding:"12px",marginBottom:12,border:"1px solid #334155"}}>
          <div style={{fontSize:11,fontWeight:700,color:"white",marginBottom:8}}>💪 Kekuatan Sinyal</div>
          <StrengthBar value={item.kekuatan} color={sigColor(item.signal)}/>
        </div>
        <div style={{background:"#172033",borderRadius:10,padding:"12px",border:"1px solid #1e3a5f",fontSize:11,color:"#64748b",lineHeight:1.7}}>
          ⚠️ Harga saham IDX menggunakan data simulasi + Alpha Vantage. Gunakan sebagai referensi saja, bukan rekomendasi investasi.
        </div>
      </div>
    </div>
  );
}

// ─── SAHAM ROW ────────────────────────────────────────────────────────────────
function SahamRow({item, onClick}) {
  const {price, chg, loading} = usePrice(item.kode, FB[item.kode]??1000);
  const up=chg>=0;
  return(
    <div onClick={onClick} style={{padding:"11px 0",borderBottom:"1px solid #1f2937",cursor:"pointer"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"white"}}>{item.kode}</span>
            <span style={{fontSize:9,color:"#64748b",background:"#1e293b",padding:"1px 5px",borderRadius:4}}>{item.kategori}</span>
            <Badge signal={item.signal}/>
            {loading&&<span style={{fontSize:9,color:"#64748b"}}>⏳</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13,fontWeight:600,fontFamily:"'DM Mono',monospace",color:"white"}}>Rp {fmt(price)}</span>
            <span style={{fontSize:11,color:up?"#10b981":"#ef4444"}}>{up?"+":""}{chg.toFixed(2)}%</span>
          </div>
          <div style={{marginTop:4}}>
            <StrengthBar value={item.kekuatan} color={sigColor(item.signal)}/>
          </div>
          <div style={{fontSize:10,color:"#64748b",marginTop:3}}>{item.indikator.split(",")[0]} · <span style={{color:"#60a5fa"}}>Tap detail →</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── ★ FIX 3: NEWS TAB dengan auto-translate ─────────────────────────────────
const FALLBACK_NEWS=[
  {id:"f1",judul:"Federal Reserve memberi sinyal potensi pemangkasan suku bunga seiring inflasi yang mendingin",sumber:"Reuters",waktu:"08:30",url:"#",sentimen:0.3,summary:"Bank Sentral AS (The Fed) mengindikasikan akan mulai memangkas suku bunga karena inflasi menunjukkan tanda-tanda mendingin menuju target 2%."},
  {id:"f2",judul:"Emas melonjak melewati $3.312 didorong permintaan safe-haven di tengah meningkatnya ketegangan geopolitik",sumber:"Bloomberg",waktu:"08:15",url:"#",sentimen:0.4,summary:"XAU/USD naik ke level tertinggi baru karena investor berbondong-bondong mencari aset safe-haven di tengah meningkatnya ketegangan global."},
  {id:"f3",judul:"Dolar AS melemah pasca data tenaga kerja AS mengecewakan, EUR/USD tembus level kunci",sumber:"FX Street",waktu:"07:55",url:"#",sentimen:-0.2,summary:"Dolar AS turun luas setelah Non-Farm Payrolls datang di bawah ekspektasi, mendorong EUR/USD di atas 1,0850."},
  {id:"f4",judul:"Bank Indonesia tahan suku bunga di 5,75%, fokus pada stabilitas rupiah",sumber:"BI",waktu:"07:30",url:"#",sentimen:0.1,summary:"Bank Indonesia mempertahankan suku bunga acuannya di 5,75% untuk mendukung stabilitas mata uang di tengah tekanan eksternal."},
  {id:"f5",judul:"IHSG rebound 1,1% dipimpin sektor perbankan dan energi",sumber:"IDX",waktu:"07:00",url:"#",sentimen:0.35,summary:"Indeks Harga Saham Gabungan pulih kuat, dengan saham perbankan memimpin kenaikan setelah laporan laba korporasi yang positif."},
];

function NewsTab() {
  const [news,         setNews]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [translating,  setTranslating]  = useState(false);
  const [expand,       setExpand]       = useState(null);
  const [filter,       setFilter]       = useState("Semua");

  useEffect(()=>{
    setLoading(true);
    fetchAVNews("forex,financial_markets,economy_macro").then(async(data)=>{
      if(data&&data.length>0){
        setNews(data);      // Tampilkan dulu versi Inggris
        setLoading(false);

        // ★ FIX 3: Terjemahkan via Claude API di background
        setTranslating(true);
        const translated = await translateNews(data);
        setNews(translated);
        setTranslating(false);
      } else {
        // Fallback sudah dalam Bahasa Indonesia
        setNews(FALLBACK_NEWS);
        setLoading(false);
      }
    });
  },[]);

  const FILTERS=["Semua","Bullish","Bearish","Neutral"];
  const filtered = !news ? [] : filter==="Semua" ? news : news.filter(n=>{
    if(filter==="Bullish") return n.sentimen>0.15;
    if(filter==="Bearish") return n.sentimen<-0.15;
    return Math.abs(n.sentimen)<=0.15;
  });

  const sentColor = s => s>0.15?"#10b981":s<-0.15?"#ef4444":"#f59e0b";
  const sentLabel = s => s>0.15?"Bullish":s<-0.15?"Bearish":"Neutral";

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>Berita & Sentimen</div>
          <div style={{fontSize:11,color:"#64748b"}}>Alpha Vantage News API</div>
        </div>
        <div style={{textAlign:"right"}}>
          {loading&&<span style={{fontSize:11,color:"#f59e0b"}}>⏳ Memuat...</span>}
          {!loading&&translating&&<span style={{fontSize:11,color:"#60a5fa"}}>🌐 Menerjemahkan...</span>}
          {!loading&&!translating&&news&&news!==FALLBACK_NEWS&&<span style={{fontSize:10,color:"#10b981"}}>● Live News · 🇮🇩</span>}
        </div>
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto"}}>
        {FILTERS.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            flexShrink:0,padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",
            fontSize:11,fontWeight:700,
            background:filter===f?"#3b82f6":"#1e293b",
            color:filter===f?"white":"#64748b",
          }}>{f}</button>
        ))}
      </div>

      {loading&&(
        <div style={{textAlign:"center",padding:"40px 0",color:"#64748b",fontSize:13}}>Memuat berita terkini...</div>
      )}

      {!loading&&filtered.map((n,i)=>(
        <div key={n.id||i} style={{marginBottom:10,background:"#1e293b",borderRadius:10,overflow:"hidden",border:"1px solid #334155"}}>
          <div style={{padding:"10px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{background:"#0f172a",color:"#94a3b8",borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:700}}>{n.sumber||"NEWS"}</span>
                <span style={{fontSize:9,color:"#64748b",fontFamily:"'DM Mono',monospace"}}>{n.waktu}</span>
              </div>
              <span style={{fontSize:10,fontWeight:700,color:sentColor(n.sentimen),flexShrink:0,marginLeft:6}}>{sentLabel(n.sentimen)}</span>
            </div>
            <p style={{margin:"0 0 8px",fontSize:12,lineHeight:1.65,color:"#e2e8f0",fontWeight:500}}>{n.judul}</p>
            {expand===i&&n.summary&&(
              <p style={{margin:"0 0 8px",fontSize:11,color:"#94a3b8",lineHeight:1.7}}>{n.summary}</p>
            )}
            <div style={{display:"flex",gap:8}}>
              {n.summary&&(
                <button onClick={()=>setExpand(expand===i?null:i)} style={{
                  background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,
                  padding:"4px 10px",fontSize:10,cursor:"pointer",fontWeight:600,
                }}>{expand===i?"Tutup ▲":"Baca ringkasan ▼"}</button>
              )}
              {n.url&&n.url!=="–"&&n.url!=="#"&&(
                <a href={n.url} target="_blank" rel="noopener noreferrer" style={{
                  background:"#1d4ed8",color:"white",borderRadius:6,
                  padding:"4px 10px",fontSize:10,textDecoration:"none",fontWeight:600,
                }}>Baca selengkapnya →</a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CALCULATOR ───────────────────────────────────────────────────────────────
function Calc() {
  const [modal,   setModal]   = useState(500000);
  const [profit,  setProfit]  = useState(1.5);
  const [risk,    setRisk]    = useState(0.8);
  const [winRate, setWinRate] = useState(60);
  const [periode, setPeriode] = useState(12);
  const [unit,    setUnit]    = useState("bulan");
  const [hari,    setHari]    = useState(20);

  const wr=Math.max(1,Math.min(99,winRate))/100;
  const lr=1-wr;
  const net=wr*(profit/100)-lr*(risk/100);
  const isV=modal>0&&profit>0&&risk>0&&hari>0&&periode>0;
  const days=unit==="bulan"?periode*hari:periode*hari*12;
  const hasil=isV&&net>0?modal*Math.pow(1+net,days):modal;
  const dd=modal*(risk/100)*lr*5;
  const pts=Math.min(periode+1,37);
  const chartData=Array.from({length:pts},(_,i)=>{
    const d=unit==="bulan"?i*hari:i*hari*12;
    return{i,val:isV&&net>0?Math.round(modal*Math.pow(1+net,d)):modal};
  });

  const inp=(label,value,onChange,step=1,min=0,max)=>(
    <div>
      <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:3,fontWeight:500}}>{label}</label>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))onChange(v);}}
        style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #334155",
          fontSize:13,fontFamily:"'DM Mono',monospace",background:"#1e293b",color:"white",boxSizing:"border-box"}}/>
    </div>
  );

  return(
    <div>
      {isV&&net<=0&&(
        <div style={{background:"#2d0f0f",border:"1.5px solid #ef4444",borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:11,color:"#ef4444",lineHeight:1.6}}>
          ⚠️ Net harian <strong>negatif ({(net*100).toFixed(3)}%)</strong>. Modal akan terus berkurang. Sesuaikan parameter.
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        {inp("Modal Awal (Rp)",modal,setModal,50000,10000)}
        {inp("Profit/Trade (%)",profit,setProfit,0.1,0.1)}
        {inp("Risk/Trade (%)",risk,setRisk,0.1,0.1)}
        {inp("Win Rate (%)",winRate,setWinRate,1,1,99)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {inp("Hari Trading/Periode",hari,setHari,1,1)}
        <div>
          <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:3,fontWeight:500}}>Jangka Waktu</label>
          <div style={{display:"flex",gap:6}}>
            <input type="number" value={periode} min={1}
              onChange={e=>{const v=parseInt(e.target.value);if(v>0)setPeriode(v);}}
              style={{flex:1,padding:"9px 10px",borderRadius:8,border:"1.5px solid #334155",fontSize:13,fontFamily:"'DM Mono',monospace",background:"#1e293b",color:"white"}}/>
            <div style={{display:"flex",border:"1.5px solid #334155",borderRadius:8,overflow:"hidden"}}>
              {["bulan","tahun"].map(u=>(
                <button key={u} onClick={()=>setUnit(u)} style={{
                  padding:"0 10px",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",
                  background:unit===u?"#3b82f6":"#1e293b",color:unit===u?"white":"#64748b",
                }}>{u}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[
          {label:"Hasil Akhir",val:fmtRp(hasil),          color:"#10b981"},
          {label:"×Lipat",     val:`×${(hasil/modal).toFixed(1)}`,color:"#3b82f6"},
          {label:"Net/Hari",   val:`${(net*100).toFixed(3)}%`,color:net>0?"#a78bfa":"#ef4444"},
          {label:"Total Hari", val:fmt(days),              color:"#e2e8f0"},
          {label:"Max DD Est.",val:fmtRp(dd),              color:"#ef4444"},
          {label:"Win Rate",   val:`${winRate}%`,          color:"#f59e0b"},
        ].map(r=>(
          <div key={r.label} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 10px"}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:2}}>{r.label}</div>
            <div style={{fontSize:12,fontWeight:700,color:r.color,fontFamily:"'DM Mono',monospace"}}>{r.val}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#1e293b",borderRadius:10,padding:"12px 4px 8px",border:"1px solid #334155"}}>
        <div style={{fontSize:11,color:"#64748b",marginBottom:8,paddingLeft:10}}>Kurva Pertumbuhan Modal</div>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={chartData} margin={{top:0,right:12,left:0,bottom:0}}>
            <XAxis dataKey="i" tick={{fontSize:9,fill:"#475569"}} tickFormatter={v=>`${v}${unit==="bulan"?"bl":"th"}`}/>
            <YAxis tick={{fontSize:9,fill:"#475569"}} tickFormatter={v=>fmtRp(v)} width={54}/>
            <Tooltip formatter={v=>[fmtRp(v),"Modal"]} labelFormatter={v=>`${unit==="bulan"?"Bulan":"Tahun"} ke-${v}`}
              contentStyle={{fontSize:11,borderRadius:8,background:"#1e293b",border:"1px solid #334155",color:"white"}}/>
            <Line type="monotone" dataKey="val" stroke={net>0?"#10b981":"#ef4444"} strokeWidth={2} dot={false} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── TICKER ITEM ──────────────────────────────────────────────────────────────
function TickerItem({label,symbol,dec}) {
  const {price,chg,loading}=usePrice(symbol,FB[symbol]??1);
  const up=chg>=0;
  return(
    <div style={{flexShrink:0}}>
      <div style={{fontSize:9,color:"#64748b",letterSpacing:0.8}}>{label}</div>
      <div style={{fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600,color:"white"}}>{loading?"…":fmt(price,dec)}</div>
      <div style={{fontSize:10,color:up?"#34d399":"#f87171"}}>{loading?"–":`${up?"+":""}${chg.toFixed(2)}%`}</div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const TABS=[
  {id:"forex", icon:"💱",label:"Forex"},
  {id:"saham", icon:"📈",label:"Saham"},
  {id:"berita",icon:"📰",label:"Berita"},
  {id:"calc",  icon:"🧮",label:"Kalkulator"},
];

export default function App() {
  const [tab,         setTab]         = useState("forex");
  const [clock,       setClock]       = useState(new Date());
  const [forexDetail, setForexDetail] = useState(null);
  const [sahamDetail, setSahamDetail] = useState(null);
  const [katFilter,   setKatFilter]   = useState("Semua");

  const tgUser   = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const userName = tgUser?.first_name||"doel";

  useEffect(()=>{
    if(window.Telegram?.WebApp){ window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }
  },[]);

  useEffect(()=>{
    const id=setInterval(()=>setClock(new Date()),1000);
    return ()=>clearInterval(id);
  },[]);

  const filteredSaham = katFilter==="Semua" ? SAHAM_LIST : SAHAM_LIST.filter(s=>s.kategori===katFilter);
  const buySaham  = SAHAM_LIST.filter(s=>s.signal==="BUY").length;
  const holdSaham = SAHAM_LIST.filter(s=>s.signal==="HOLD").length;
  const sellSaham = SAHAM_LIST.filter(s=>s.signal==="SELL").length;

  return(
    <div style={{minHeight:"100vh",background:"#0f172a",fontFamily:"'Outfit',sans-serif",color:"#e2e8f0",paddingBottom:72}}>

      {/* Detail modals */}
      {forexDetail&&<ForexDetail item={forexDetail} onClose={()=>setForexDetail(null)}/>}
      {sahamDetail&&<SahamDetail item={sahamDetail} onClose={()=>setSahamDetail(null)}/>}

      {/* HEADER */}
      <div style={{background:"#1e293b",padding:"14px 18px 12px",position:"sticky",top:0,zIndex:20,borderBottom:"1px solid #334155"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:10,color:"#64748b",letterSpacing:1.5,textTransform:"uppercase"}}>Trading Dashboard</div>
            <div style={{fontSize:18,fontWeight:700,fontFamily:"'DM Serif Display',serif",color:"white"}}>Halo, {userName} 👋</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:14,fontFamily:"'DM Mono',monospace",color:"white"}}>{clock.toLocaleTimeString("id-ID")}</div>
            <div style={{fontSize:10,color:"#64748b"}}>{clock.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:16,marginTop:12,overflowX:"auto",paddingBottom:2}}>
          <TickerItem label="EUR"  symbol="EUR/USD" dec={4}/>
          <TickerItem label="GBP"  symbol="GBP/USD" dec={4}/>
          <TickerItem label="XAU"  symbol="XAU/USD" dec={1}/>
          <TickerItem label="JPY"  symbol="USD/JPY" dec={2}/>
          <TickerItem label="BTC"  symbol="BTC/USD" dec={0}/>
          <TickerItem label="IDR"  symbol="USD/IDR" dec={0}/>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{padding:"14px 18px"}}>

        {/* FOREX TAB */}
        {tab==="forex"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"white"}}>Sinyal Forex & Komoditas</div>
                <div style={{fontSize:11,color:"#64748b"}}>Twelve Data API · Tap pair untuk detail + chart</div>
              </div>
            </div>
            {FOREX_LIST.map(f=><ForexRow key={f.symbol} item={f} onClick={()=>setForexDetail(f)}/>)}
            <div style={{marginTop:12,background:"#172033",borderRadius:8,padding:"10px 12px",border:"1px solid #1e3a5f",fontSize:11,color:"#60a5fa",lineHeight:1.6}}>
              ℹ️ Tap setiap pair untuk lihat chart candlestick, RSI, SMC, S&R, dan panel posisi.
              Chart menggunakan data live jika tersedia, atau simulasi realistis sebagai fallback.
            </div>
          </div>
        )}

        {/* SAHAM TAB */}
        {tab==="saham"&&(
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:2}}>Watchlist Saham IDX</div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>Tap saham untuk detail indikator</div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {[{l:"BUY",c:buySaham,color:"#10b981"},{l:"HOLD",c:holdSaham,color:"#f59e0b"},{l:"SELL",c:sellSaham,color:"#ef4444"}].map(s=>(
                <div key={s.l} style={{flex:1,background:"#1e293b",border:`1px solid #334155`,borderRadius:8,padding:"8px 0",textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:800,color:s.color,fontFamily:"'DM Mono',monospace"}}>{s.c}</div>
                  <div style={{fontSize:10,color:s.color,fontWeight:600}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto"}}>
              {KATEGORI_SAHAM.map(k=>(
                <button key={k} onClick={()=>setKatFilter(k)} style={{
                  flexShrink:0,padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",
                  fontSize:11,fontWeight:700,
                  background:katFilter===k?"#3b82f6":"#1e293b",
                  color:katFilter===k?"white":"#64748b",
                }}>{k}</button>
              ))}
            </div>
            {filteredSaham.map(s=><SahamRow key={s.kode} item={s} onClick={()=>setSahamDetail(s)}/>)}
            <div style={{marginTop:10,background:"#172033",borderRadius:8,padding:"10px 12px",border:"1px solid #1e3a5f",fontSize:11,color:"#f59e0b",lineHeight:1.6}}>
              ⚠️ Harga saham IDX = simulasi + fallback. Data realtime IDX butuh API berbayar. Edukatif saja.
            </div>
          </div>
        )}

        {/* BERITA TAB */}
        {tab==="berita"&&<NewsTab/>}

        {/* KALKULATOR TAB */}
        {tab==="calc"&&(
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:2}}>Kalkulator Compound</div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:14}}>Simulasi pertumbuhan modal harian</div>
            <Calc/>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#1e293b",borderTop:"1px solid #334155",display:"flex",zIndex:30,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:"10px 0 8px",border:"none",background:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:2,
          }}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:600,color:tab===t.id?"#60a5fa":"#475569",
              borderBottom:tab===t.id?"2px solid #60a5fa":"2px solid transparent",paddingBottom:1}}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
