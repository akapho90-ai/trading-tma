import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AV_KEY = "YAKZR9RCX8C99N0A";
const AV_BASE = "https://www.alphavantage.co/query";

const SAHAM_META = [
  { kode: "BBCA.JKT", display: "BBCA", nama: "Bank Central Asia",     sektor: "Perbankan",  signal: "BUY",  kekuatan: 82, alasan: "Support kuat 6.050, volume naik 34%. Laba Q1 solid, CASA dominan." },
  { kode: "BRPT.JKT", display: "BRPT", nama: "Barito Renewables",     sektor: "Energi",     signal: "BUY",  kekuatan: 76, alasan: "Laba naik 8× Q1 2026. Bullish continuation. Entry ideal 2.400–2.500." },
  { kode: "AMMN.JKT", display: "AMMN", nama: "Amman Mineral",         sektor: "Tambang",    signal: "HOLD", kekuatan: 55, alasan: "Konsolidasi. Tunggu break 7.500 untuk konfirmasi uptrend." },
  { kode: "ANTM.JKT", display: "ANTM", nama: "Aneka Tambang",         sektor: "Emas/Nikel", signal: "BUY",  kekuatan: 71, alasan: "Oversold extreme. Emas safe haven solid. Rebound probable ke 3.500." },
  { kode: "TLKM.JKT", display: "TLKM", nama: "Telkom Indonesia",      sektor: "Telko",      signal: "HOLD", kekuatan: 50, alasan: "Sideways jangka pendek. Defensif tapi momentum belum muncul." },
  { kode: "BBRI.JKT", display: "BBRI", nama: "Bank Rakyat Indonesia", sektor: "Perbankan",  signal: "SELL", kekuatan: 35, alasan: "Tekanan asing. Rupiah lemah menekan margin. Tunggu stabilisasi 3.900." },
];

const FOREX_META = [
  { pair: "EUR/USD", symbol: "EURUSD", dec: 4, signal: "BUY",  kekuatan: 74, tp: "1.0920", sl: "1.0800", alasan: "DXY melemah, ECB hawkish. Break struktur bullish di 1.0830." },
  { pair: "GBP/USD", symbol: "GBPUSD", dec: 4, signal: "BUY",  kekuatan: 68, tp: "1.2850", sl: "1.2660", alasan: "Momentum naik post-CPI UK. Support 1.2680 terjaga kuat." },
  { pair: "USD/JPY", symbol: "USDJPY", dec: 2, signal: "SELL", kekuatan: 72, tp: "153.50", sl: "156.80", alasan: "BoJ intervensi verbal. Overbought RSI 78. Short dari resistance 156." },
  { pair: "XAU/USD", symbol: "XAUUSD", dec: 1, signal: "BUY",  kekuatan: 85, tp: "3400",   sl: "3250",   alasan: "Safe haven demand kuat. Geopolitik memanas. ATH baru sangat mungkin." },
  { pair: "USD/IDR", symbol: "USDIDR", dec: 0, signal: "SELL", kekuatan: 60, tp: "16100",  sl: "16550",  alasan: "BI intervensi aktif. Rupiah kemungkinan rebound jika IHSG stabil." },
];

const FALLBACK_PRICES = {
  EURUSD: 1.0854, GBPUSD: 1.2731, USDJPY: 155.42,
  XAUUSD: 3312.5, USDIDR: 16380,
  "BBCA.JKT": 6200, "BRPT.JKT": 2480, "AMMN.JKT": 7350,
  "ANTM.JKT": 3280, "TLKM.JKT": 2850, "BBRI.JKT": 4100,
};

const NEWS = [
  { id: "n1", waktu: "09:32", tag: "IHSG",   level: "high",   judul: "IHSG rebound +1.1% ke 6.162 dipimpin sektor perbankan & energi" },
  { id: "n2", waktu: "09:15", tag: "EMAS",   level: "high",   judul: "Harga emas XAU/USD tembus $3.312, tertinggi 3 pekan terakhir" },
  { id: "n3", waktu: "08:55", tag: "FOREX",  level: "medium", judul: "DXY tertekan setelah data NFP AS di bawah ekspektasi pasar" },
  { id: "n4", waktu: "08:40", tag: "BRPT",   level: "high",   judul: "BRPT: Laba Q1 2026 naik 800% YoY, manajemen optimis full year" },
  { id: "n5", waktu: "08:20", tag: "BI",     level: "medium", judul: "BI pertahankan suku bunga 5.75%, fokus stabilitas rupiah" },
  { id: "n6", waktu: "07:50", tag: "GLOBAL", level: "low",    judul: "Wall Street mixed: S&P500 +0.3%, Nasdaq -0.1% jelang FOMC" },
  { id: "n7", waktu: "07:30", tag: "ANTM",   level: "medium", judul: "ANTM catat volume abnormal pagi ini, sinyal akumulasi asing" },
];

const fmt = (n, d = 0) =>
  Number(n).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtRp = (n) => {
  if (!isFinite(n) || isNaN(n)) return "Rp –";
  if (n >= 1e12) return `Rp ${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `Rp ${(n / 1e9).toFixed(2)}M`;
  if (n >= 1e6)  return `Rp ${(n / 1e6).toFixed(2)}jt`;
  if (n >= 1e3)  return `Rp ${(n / 1e3).toFixed(0)}rb`;
  return `Rp ${Number(n).toFixed(0)}`;
};

const sigColor = (s) => s === "BUY" ? "#059669" : s === "SELL" ? "#dc2626" : "#d97706";
const sigBg    = (s) => s === "BUY" ? "#f0fdf4" : s === "SELL" ? "#fef2f2" : "#fffbeb";
const sigBdr   = (s) => s === "BUY" ? "#86efac" : s === "SELL" ? "#fca5a5" : "#fde68a";

async function fetchForexPrice(symbol) {
  try {
    const from = symbol.slice(0, 3);
    const to   = symbol.slice(3);
    const url = `${AV_BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${AV_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    const rate = data?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"];
    if (rate) return parseFloat(rate);
  } catch (_) {}
  return null;
}

async function fetchStockPrice(symbol) {
  try {
    const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    const price = data?.["Global Quote"]?.["05. price"];
    if (price) return parseFloat(price);
  } catch (_) {}
  return null;
}

const priceStore = {};
const priceListeners = {};

function subscribePriceStore(symbol, cb) {
  if (!priceListeners[symbol]) priceListeners[symbol] = new Set();
  priceListeners[symbol].add(cb);
  return () => priceListeners[symbol].delete(cb);
}

function notifyListeners(symbol, val) {
  if (priceListeners[symbol]) priceListeners[symbol].forEach(cb => cb(val));
}

function usePrice(symbol, base, isForex = false) {
  const [price,  setPrice]  = useState(priceStore[symbol] ?? base);
  const [chg,    setChg]    = useState(0);
  const [hist,   setHist]   = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({ t: i, v: base * (1 + (Math.random() - 0.5) * 0.004) }))
  );
  const [apiOk,  setApiOk]  = useState(false);
  const [loading,setLoading] = useState(true);
  const baseRef = useRef(base);
  const priceRef = useRef(priceStore[symbol] ?? base);

  useEffect(() => {
    const unsub = subscribePriceStore(symbol, (v) => {
      priceRef.current = v;
      setPrice(v);
      setChg(((v - baseRef.current) / baseRef.current) * 100);
      setHist(h => [...h.slice(-29), { t: Date.now(), v }]);
    });
    return unsub;
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    async function fetchReal() {
      setLoading(true);
      let realPrice = null;
      if (isForex) {
        realPrice = await fetchForexPrice(symbol);
      } else {
        realPrice = await fetchStockPrice(symbol);
      }
      if (cancelled) return;
      if (realPrice && realPrice > 0) {
        priceStore[symbol] = realPrice;
        priceRef.current   = realPrice;
        baseRef.current    = realPrice;
        setPrice(realPrice);
        setChg(0);
        setHist(h => [...h.slice(-19), { t: Date.now(), v: realPrice }]);
        notifyListeners(symbol, realPrice);
        setApiOk(true);
      } else {
        const fb = FALLBACK_PRICES[symbol] ?? base;
        priceRef.current = fb;
        setPrice(fb);
      }
      setLoading(false);
    }
    fetchReal();
    const refreshId = setInterval(fetchReal, 60000);
    return () => { cancelled = true; clearInterval(refreshId); };
  }, [symbol, base, isForex]);

  useEffect(() => {
    const vol = isForex
      ? (symbol.includes("IDR") ? 0.0002 : symbol.includes("XAU") ? 0.0004 : 0.0002)
      : 0.001;
    const id = setInterval(() => {
      const delta = (Math.random() - 0.48) * vol;
      const next  = Math.max(priceRef.current * (1 + delta), 0.0001);
      priceRef.current = next;
      setPrice(next);
      setChg(((next - baseRef.current) / baseRef.current) * 100);
      setHist(h => [...h.slice(-29), { t: Date.now(), v: next }]);
      notifyListeners(symbol, next);
    }, 3000);
    return () => clearInterval(id);
  }, [symbol, isForex]);

  return { price, chg, hist, apiOk, loading };
}

function Spark({ hist, color }) {
  return (
    <ResponsiveContainer width={70} height={28}>
      <LineChart data={hist} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Badge({ signal }) {
  return (
    <span style={{
      background: sigBg(signal), color: sigColor(signal),
      border: `1px solid ${sigBdr(signal)}`,
      borderRadius: 5, padding: "2px 7px",
      fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace",
    }}>{signal}</span>
  );
}

function Bar({ value, color }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ flex: 1, height: 4, background: "#e5e7eb", borderRadius: 99 }}>
        <div style={{ width: `${safe}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s" }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "#9ca3af", minWidth: 22 }}>{safe}%</span>
    </div>
  );
}

function LiveBadge({ apiOk, loading }) {
  if (loading) return (
    <span style={{ background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700 }}>⏳ MEMUAT</span>
  );
  if (apiOk) return (
    <span style={{ background: "#f0fdf4", color: "#059669", border: "1px solid #86efac", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700 }}>● LIVE API</span>
  );
  return (
    <span style={{ background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700 }}>◎ SIMULASI</span>
  );
}

function FxRow({ item }) {
  const { price, chg, hist, apiOk, loading } = usePrice(item.symbol, FALLBACK_PRICES[item.symbol], true);
  const up = chg >= 0;
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{item.pair}</span>
          <Badge signal={item.signal} />
          {loading && <span style={{ fontSize: 9, color: "#9ca3af" }}>⏳</span>}
          {!loading && apiOk && <span style={{ fontSize: 9, color: "#059669" }}>●</span>}
        </div>
        <Spark hist={hist} color={up ? "#059669" : "#dc2626"} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>
            {fmt(price, item.dec)}
          </span>
          <span style={{ fontSize: 11, color: up ? "#059669" : "#dc2626", marginLeft: 6 }}>
            {up ? "+" : ""}{chg.toFixed(3)}%
          </span>
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#9ca3af" }}>
          TP {item.tp} · SL {item.sl}
        </div>
      </div>
      <div style={{ marginTop: 4 }}>
        <Bar value={item.kekuatan} color={sigColor(item.signal)} />
      </div>
      <p style={{ margin: "5px 0 0", fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>{item.alasan}</p>
    </div>
  );
}

function SahamRow({ item }) {
  const { price, chg, hist, apiOk, loading } = usePrice(item.kode, FALLBACK_PRICES[item.kode], false);
  const up = chg >= 0;
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{item.display}</span>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>{item.sektor}</span>
          <Badge signal={item.signal} />
          {loading && <span style={{ fontSize: 9, color: "#9ca3af" }}>⏳</span>}
          {!loading && apiOk && <span style={{ fontSize: 9, color: "#059669" }}>●</span>}
        </div>
        <Spark hist={hist} color={up ? "#059669" : "#dc2626"} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>
            Rp {fmt(price)}
          </span>
          <span style={{ fontSize: 11, color: up ? "#059669" : "#dc2626", marginLeft: 6 }}>
            {up ? "+" : ""}{chg.toFixed(2)}%
          </span>
        </div>
      </div>
      <div style={{ marginTop: 4 }}>
        <Bar value={item.kekuatan} color={sigColor(item.signal)} />
      </div>
      <p style={{ margin: "5px 0 0", fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>💡 {item.alasan}</p>
    </div>
  );
}

function TickerItem({ label, symbol, dec, isForex }) {
  const { price, chg, loading } = usePrice(symbol, FALLBACK_PRICES[symbol] ?? 0, isForex);
  const up = chg >= 0;
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 500 }}>
        {loading ? "…" : fmt(price, dec)}
      </div>
      <div style={{ fontSize: 10, color: up ? "#34d399" : "#f87171" }}>
        {loading ? "–" : `${up ? "+" : ""}${chg.toFixed(2)}%`}
      </div>
    </div>
  );
}

function Calc() {
  const [modal,    setModal]    = useState(500000);
  const [profit,   setProfit]   = useState(1.5);
  const [risk,     setRisk]     = useState(0.8);
  const [winRate,  setWinRate]  = useState(60);
  const [periode,  setPeriode]  = useState(12);
  const [unit,     setUnit]     = useState("bulan");
  const [hariUnit, setHariUnit] = useState(20);

  const wr       = Math.max(1, Math.min(99, winRate)) / 100;
  const lr       = 1 - wr;
  const netDaily = wr * (profit / 100) - lr * (risk / 100);
  const isValid  = modal > 0 && profit > 0 && risk > 0 && hariUnit > 0 && periode > 0;

  const totalDays = unit === "bulan" ? periode * hariUnit : periode * hariUnit * 12;
  const hasil      = isValid && netDaily > 0 ? modal * Math.pow(1 + netDaily, totalDays) : modal;
  const multiplier = isValid && netDaily > 0 ? hasil / modal : 1;
  const dd         = modal * (risk / 100) * lr * 5;

  const chartPoints = Math.min(periode + 1, 37);
  const chartData = Array.from({ length: chartPoints }, (_, i) => {
    const d = unit === "bulan" ? i * hariUnit : i * hariUnit * 12;
    const val = isValid && netDaily > 0
      ? Math.round(modal * Math.pow(1 + netDaily, d))
      : modal;
    return { i, val };
  });

  const inp = (label, value, onChange, step = 1, min = 0, max) => (
    <div>
      <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3, fontWeight: 500 }}>{label}</label>
      <input
        type="number" value={value} step={step} min={min} max={max}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        style={{
          width: "100%", padding: "9px 10px", borderRadius: 8,
          border: "1.5px solid #e5e7eb", fontSize: 13,
          fontFamily: "'DM Mono',monospace", background: "#f9fafb",
          boxSizing: "border-box",
        }}
      />
    </div>
  );

  return (
    <div>
      {isValid && netDaily <= 0 && (
        <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 11, color: "#dc2626", lineHeight: 1.6 }}>
          ⚠️ <strong>Peringatan:</strong> Dengan win rate {winRate}%, profit {profit}%, dan risk {risk}%, net harian kamu <strong>negatif ({(netDaily * 100).toFixed(3)}%)</strong>. Modal akan terus berkurang. Sesuaikan parameter.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {inp("Modal Awal (Rp)", modal,    setModal,    50000, 10000)}
        {inp("Profit/Trade (%)", profit,  setProfit,   0.1,   0.1)}
        {inp("Risk/Trade (%)",   risk,    setRisk,     0.1,   0.1)}
        {inp("Win Rate (%)",     winRate, setWinRate,  1,     1, 99)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {inp("Hari Trading/Periode", hariUnit, setHariUnit, 1, 1)}
        <div>
          <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3, fontWeight: 500 }}>Jangka Waktu</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="number" value={periode} min={1}
              onChange={e => { const v = parseInt(e.target.value); if (v > 0) setPeriode(v); }}
              style={{ flex: 1, padding: "9px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontFamily: "'DM Mono',monospace", background: "#f9fafb" }}
            />
            <div style={{ display: "flex", border: "1.5px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
              {["bulan", "tahun"].map(u => (
                <button key={u} onClick={() => setUnit(u)} style={{
                  padding: "0 10px", fontSize: 11, fontWeight: 600,
                  border: "none", cursor: "pointer",
                  background: unit === u ? "#111827" : "#f9fafb",
                  color: unit === u ? "white" : "#6b7280",
                }}>{u}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Hasil Akhir", val: fmtRp(hasil),                color: "#059669", bg: "#f0fdf4", bdr: "#86efac" },
          { label: "×Lipat",     val: `×${multiplier.toFixed(1)}`, color: "#2563eb", bg: "#eff6ff", bdr: "#bfdbfe" },
          { label: "Net/Hari",   val: `${(netDaily*100).toFixed(3)}%`, color: netDaily > 0 ? "#7c3aed" : "#dc2626", bg: netDaily > 0 ? "#f5f3ff" : "#fef2f2", bdr: netDaily > 0 ? "#ddd6fe" : "#fca5a5" },
          { label: "Total Hari", val: fmt(totalDays),               color: "#111827", bg: "#f9fafb", bdr: "#e5e7eb" },
          { label: "Max DD Est.",val: fmtRp(dd),                    color: "#dc2626", bg: "#fef2f2", bdr: "#fca5a5" },
          { label: "Win Rate",   val: `${winRate}%`,                color: "#d97706", bg: "#fffbeb", bdr: "#fde68a" },
        ].map(r => (
          <div key={r.label} style={{ background: r.bg, border: `1.5px solid ${r.bdr}`, borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 2, fontWeight: 500 }}>{r.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: r.color, fontFamily: "'DM Mono',monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 4px 8px", border: "1.5px solid #e5e7eb" }}>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, paddingLeft: 10, fontWeight: 500 }}>
          Kurva Pertumbuhan Modal
          {chartPoints < periode + 1 && (
            <span style={{ color: "#9ca3af", marginLeft: 6, fontSize: 9 }}>(diringkas {chartPoints} titik)</span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={chartData} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="i" tick={{ fontSize: 9, fill: "#9ca3af" }} tickFormatter={v => `${v}${unit === "bulan" ? "bl" : "th"}`} />
            <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickFormatter={v => fmtRp(v)} width={54} />
            <Tooltip
              formatter={v => [fmtRp(v), "Modal"]}
              labelFormatter={v => `${unit === "bulan" ? "Bulan" : "Tahun"} ke-${v}`}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Line type="monotone" dataKey="val" stroke={netDaily > 0 ? "#059669" : "#dc2626"} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 8, lineHeight: 1.6 }}>
        ⚠️ Simulasi berdasarkan win rate {winRate}%, compound penuh tanpa withdrawal.
      </p>
    </div>
  );
      }

const TABS = [
  { id: "forex",  icon: "💱", label: "Forex" },
  { id: "saham",  icon: "📈", label: "Saham" },
  { id: "berita", icon: "📰", label: "Berita" },
  { id: "calc",   icon: "🧮", label: "Kalkulator" },
];

export default function App() {
  const [tab,   setTab]   = useState("forex");
  const [clock, setClock] = useState(new Date());

  const tgUser  = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const userName = tgUser?.first_name || "Trader";

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const buySaham  = SAHAM_META.filter(s => s.signal === "BUY").length;
  const holdSaham = SAHAM_META.filter(s => s.signal === "HOLD").length;
  const sellSaham = SAHAM_META.filter(s => s.signal === "SELL").length;

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Outfit',sans-serif", color: "#111827", paddingBottom: 72 }}>
      <div style={{ background: "#111827", color: "white", padding: "14px 18px 12px", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: 1.5, textTransform: "uppercase" }}>Trading Dashboard</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'DM Serif Display',serif" }}>Halo, {userName} 👋</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontFamily: "'DM Mono',monospace" }}>{clock.toLocaleTimeString("id-ID")}</div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>{clock.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, overflowX: "auto", paddingBottom: 2 }}>
          <TickerItem label="EUR"  symbol="EURUSD" dec={4} isForex={true} />
          <TickerItem label="GBP"  symbol="GBPUSD" dec={4} isForex={true} />
          <TickerItem label="XAU"  symbol="XAUUSD" dec={1} isForex={true} />
          <TickerItem label="JPY"  symbol="USDJPY" dec={2} isForex={true} />
          <TickerItem label="IDR"  symbol="USDIDR" dec={0} isForex={true} />
        </div>
      </div>

      <div style={{ padding: "14px 18px" }}>
        {tab === "forex" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Sinyal Forex & Komoditas</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Alpha Vantage API · Refresh tiap 60 detik</div>
              </div>
              <LiveBadge apiOk={true} loading={false} />
            </div>
            {FOREX_META.map(f => <FxRow key={f.symbol} item={f} />)}
            <div style={{ marginTop: 10, background: "#eff6ff", borderRadius: 8, padding: "10px 12px", border: "1px solid #bfdbfe", fontSize: 11, color: "#1e40af", lineHeight: 1.6 }}>
              ℹ️ Harga dari Alpha Vantage API. ● hijau = data real, ◎ = simulasi jika API limit tercapai.
            </div>
          </div>
        )}

        {tab === "saham" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Watchlist Saham IDX</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Alpha Vantage API · Refresh tiap 60 detik</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[
                { l: "BUY",  c: buySaham,  color: "#059669", bg: "#f0fdf4", bdr: "#86efac" },
                { l: "HOLD", c: holdSaham, color: "#d97706", bg: "#fffbeb", bdr: "#fde68a" },
                { l: "SELL", c: sellSaham, color: "#dc2626", bg: "#fef2f2", bdr: "#fca5a5" },
              ].map(s => (
                <div key={s.l} style={{ flex: 1, background: s.bg, border: `1px solid ${s.bdr}`, borderRadius: 8, padding: "8px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.c}</div>
                  <div style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {SAHAM_META.map(s => <SahamRow key={s.kode} item={s} />)}
            <div style={{ marginTop: 10, background: "#fffbeb", borderRadius: 8, padding: "10px 12px", border: "1px solid #fde68a", fontSize: 11, color: "#92400e", lineHeight: 1.6 }}>
              ⚠️ Edukatif saja, bukan rekomendasi investasi resmi. Riset mandiri tetap diperlukan.
            </div>
          </div>
        )}

        {tab === "berita" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Berita & Sentimen Pasar</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>Kondisi pasar terkini</div>
            {NEWS.map((n) => {
              const dot = n.level === "high" ? "#dc2626" : n.level === "medium" ? "#d97706" : "#9ca3af";
              return (
                <div key={n.id} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ paddingTop: 4, flexShrink: 0 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                      <span style={{ background: "#111827", color: "white", borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>{n.tag}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "'DM Mono',monospace" }}>{n.waktu} WIB</span>
                      {n.level === "high" && <span style={{ fontSize: 9, color: "#dc2626", fontWeight: 700 }}>● PENTING</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65 }}>{n.judul}</p>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 14, background: "#f9fafb", borderRadius: 10, padding: 14, border: "1.5px solid #e5e7eb" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🧭 Sentimen Hari Ini</div>
              {[
                { label: "IHSG",   val: 72, arah: "Bullish" },
                { label: "Rupiah", val: 45, arah: "Netral" },
                { label: "Emas",   val: 85, arah: "Sangat Bullish" },
                { label: "Nikel",  val: 55, arah: "Netral-Positif" },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: s.val > 65 ? "#059669" : s.val < 40 ? "#dc2626" : "#d97706" }}>{s.arah}</span>
                  </div>
                  <Bar value={s.val} color={s.val > 65 ? "#059669" : s.val < 40 ? "#dc2626" : "#d97706"} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "calc" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Kalkulator Compound</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 14 }}>Simulasi pertumbuhan modal dengan compound harian</div>
            <Calc />
          </div>
        )}
      </div>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "white", borderTop: "1.5px solid #f3f4f6",
        display: "flex", zIndex: 30,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 0 8px", border: "none",
            background: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: tab === t.id ? "#111827" : "#9ca3af",
              borderBottom: tab === t.id ? "2px solid #111827" : "2px solid transparent",
              paddingBottom: 1,
            }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
            }
