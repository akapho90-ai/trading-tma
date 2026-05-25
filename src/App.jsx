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
  { pair: "EUR/USD", symbol: "EUR/USD", dec: 4, signal: "BUY",  kekuatan: 74, tpPct: 0.55, slPct: -0.45 },
  { pair: "GBP/USD", symbol: "GBP/USD", dec: 4, signal: "BUY",  kekuatan: 68, tpPct: 0.60, slPct: -0.50 },
  { pair: "USD/JPY", symbol: "USD/JPY", dec: 2, signal: "SELL", kekuatan: 72, tpPct: -0.50, slPct: 0.40 },
  { pair: "XAU/USD", symbol: "XAU/USD", dec: 1, signal: "BUY",  kekuatan: 85, tpPct: 1.20, slPct: -0.90 },
  { pair: "USD/IDR", symbol: "USD/IDR", dec: 0, signal: "SELL", kekuatan: 60, tpPct: -1.00, slPct: 0.80 },
  { pair: "AUD/USD", symbol: "AUD/USD", dec: 4, signal: "HOLD", kekuatan: 50, tpPct: 0.45, slPct: -0.38 },
  { pair: "USD/CAD", symbol: "USD/CAD", dec: 4, signal: "SELL", kekuatan: 62, tpPct: -0.55, slPct: 0.42 },
  { pair: "BTC/USD", symbol: "BTC/USD", dec: 0, signal: "BUY",  kekuatan: 78, tpPct: 5.00, slPct: -3.50 },
];

// ─── SAHAM SYARIAH (IDX ISSI / JII) ──────────────────────────────────────────
const SYARIAH_KODE = new Set([
  "AADI","AALI","ABMM","ACST","ADCP","ADHI","ADMR","ADRO","AGAR","AGII",
  "AIMS","AISA","AKPI","AKRA","AKSI","ALDO","AMAN","AMFG","AMIN","ANDI",
  "ANJT","ANTM","APLN","ARCI","ARNA","ASII","ASPI","ASRI","ASSA","ATIC",
  "ATLA","AUTO","AVIA","AYLS","BAIK","BAPI","BATR","BAUT","BBRM","BEST",
  "BIKE","BINO","BIRD","BISI","BLES","BOLT","BRAM","BRIS","BRMS","BSSR",
  "BSWD","BTEK","BTPS","BUDI","BUKK","BUMI","BUTR","BUVA","CARS","CASH",
  "CASS","CEKA","CENT","CINT","CLPI","CMNP","CMRY","CNMA","CNTX","COAL",
  "CPIN","CPOR","CRSN","CSAP","CSIS","CSRA","CTRA","CTTH","CYBER","DATA",
  "DEAL","DEFI","DEWA","DGIK","DHCO","DILD","DIVA","DKFT","DLTA","DMMX",
  "DMND","DNAA","DOOH","DOID","DPNS","DPUM","DRMA","DSFI","DSNG","DUST",
  "DVLA","DYAN","EAST","ECII","EEAL","EFOR","EKAD","ELIT","ELPI","ELSA",
  "EMDE","EMTK","ENRG","EPAC","EPMT","ERAA","ERAL","ESIP","ESSA","ESTI",
  "ETWA","EXCL","FAPA","FAST","FASW","FILE","FMII","FORU","FPNI","FAPA",
  "FUJI","GAMA","GDST","GDYR","GEAR","GEMA","GEMS","GGRM","GGRP","GHON",
  "GIFI","GJTL","GKOI","GLVA","GMFI","GMTD","GOLD","GOLL","GOTO","GPRA",
  "GRAHA","GRIA","GRPM","GSMF","GWSA","GULA","HAIS","HALO","HDIT","HDTX",
  "HEAL","HEXT","HIAM","HILON","HISP","HITS","HMSP","HOKI","HOMI","HOPO",
  "HRTA","HRUM","HSTM","IATA","IBOS","IBST","ICBP","ICON","IDPR","IFII",
  "IFSH","IGAR","IIKP","IKAI","IKAN","IKBI","IMAS","IMPC","IMJS","INAF",
  "INAI","INCF","INCO","INDF","INDO","INDR","INDX","INDY","INKP","INPC",
  "INPS","INRU","INTA","INTD","INTP","IPAC","IPCC","IPCM","IPOL","IRRA",
  "ISAT","ISCW","ISSP","ITMA","ITMG","JAWA","JECC","JGLE","JIHD","JIPS",
  "JKON","JKSW","JMAS","JPFA","JRPT","JSMR","JSTB","JTPE","KAEF","KAPA",
  "KARK","KBLI","KBLM","KBLV","KBRI","KDSI","KEEN","KEJU","KIAS","KICI",
  "KIJA","KINO","KIOS","KJEN","KKGI","KLBF","KLIN","KOBX","KOCI","KOKA",
  "KOKS","KOMI","KOPI","KOTA","KPAL","KPAS","KPIG","KRAK","KRAS","KREN",
  "LION","LMAS","LPCK","LPIN","LPKR","LPLI","LPSH","LRNA","LSIP","LTLS",
  "LUCK","MAIN","MAPA","MAPB","MAPI","MARI","MARK","MASA","MBAP","MBSS",
  "MBTO","MCOL","MDIA","MDKA","MDKI","MDLN","MDRN","MEDC","MEGA","MFIN",
  "MFMI","MGNA","MICE","MIDI","MIKA","MINA","MIRA","MITI","MKNT","MKPI",
  "MLBI","MLIA","MLPL","MLPT","MMUG","MMLP","MNCN","MPMX","MPOW","MPPA",
  "MRAT","MREI","MRPK","MSIN","MSKY","MTDL","MTEL","MTFN","MTLA","MTMH",
  "MTPS","MTRG","MTSM","MYOR","MYRX","MYTX","NANO","NASA","NFCX","NICK",
  "NICL","NIPS","NIRO","NKIT","NLAS","NPGF","NRCA","NSSS","NTBK","NUSA",
  "NVBA","OASA","OBMD","OKAS","OMRE","OPMS","PADI","PANI","PANR","PANS",
  "PAPM","PBRX","PBSA","PCAR","PDES","PEGE","PEHA","PGAS","PGJO","PGLI",
  "PGUN","PIED","PIGO","PILI","PJAA","PKPK","PLIN","PLJA","PMJS","PMMP",
  "PNBS","PNGO","PNIN","PNLF","PNSE","POLA","POLI","POLL","POLY","POOL",
  "PORT","POWR","PPGL","PPRE","PPRO","PRAS","PRDA","PRIM","PRMS","PTBA",
  "PTDU","PTIS","PTPW","PTSN","PTSP","PUDP","PURA","PURE","PWON","PZZA",
  "RAAM","RACY","RALS","RANC","RBMS","RCHG","RDTX","RELI","REMD","RICY",
  "RIGS","RIMO","RINF","RISE","RMBA","RMKO","RMTX","RODA","ROTI","SADI",
  "SGER","SSTM","STAA","STTP","SUGI","SULI","SUPR","SURE","SURYA","SOCI",
  "SOFE","SOHO","SONA","SPMA","SPTO","SRIL","SRTG","SSIA","SSMS","SSTM",
  "TAXI","TBMS","TBRM","TCID","TCPI","TEBE","TECH","TELE","TFAS","TFCO",
  "TGKA","TIFA","TINS","TIRA","TIRT","TKIM","TLKM","TMAS","TMPO","TOBA",
  "TOTAL","TOTL","TOWR","TPIA","TPMA","TPORE","TRIL","TRIM","TRIN","TRIS",
  "TRJA","TRST","TRUE","TRUK","TSPC","TUGU","TUNS","TURI","UCID","UDNG",
  "UFOE","UNGO","UNIT","UNTR","UNVR","URBN","VIVA","VLOG","VOKS","VOTE",
  "VPAC","WAPO","WEGE","WEHA","WICO","WIDI","WIFI","WIIM","WIKA","WIKG",
  "WINS","WIRG","WIRT","WLAN","WOOD","WOWS","WREI","WSBP","WSKT","WTON",
  "YELO","YPAS","YULE","ZBRA","ZINC","ZONE"
]);

const SAHAM_LIST = [
  { nama: "Telkom Indonesia", ticker: "TLKM.JK", syariah: true },
  { nama: "Astra International", ticker: "ASII.JK", syariah: true },
  { nama: "Adaro Energy", ticker: "ADRO.JK", syariah: true },
  { nama: "Indofood CBP", ticker: "ICBP.JK", syariah: true },
  { nama: "Kalbe Farma", ticker: "KLBF.JK", syariah: true },
  { nama: "Aneka Tambang", ticker: "ANTM.JK", syariah: true },
  { nama: "Vale Indonesia", ticker: "INCO.JK", syariah: true },
  { nama: "United Tractors", ticker: "UNTR.JK", syariah: true },
  { nama: "Bank Syariah Ind", ticker: "BRIS.JK", syariah: true },
  { nama: "Unilever Indonesia", ticker: "UNVR.JK", syariah: true },
];

const TABS = [
  { id: "forex",   label: "Forex & Gold", icon: "💱" },
  { id: "saham",   label: "Saham RI",     icon: "📈" },
  { id: "berita",  label: "Berita AI",    icon: "📰" },
  { id: "calc",    label: "Kalkulator",   icon: "🧮" },
];

// ─── HARGA DEFAULT JIKA API TIMEOUT / ERROR ──────────────────────────────────
const INITIAL_FOREX = {
  "EUR/USD": 1.0850,
  "GBP/USD": 1.2640,
  "USD/JPY": 156.20,
  "XAU/USD": 2345.50,
  "USD/IDR": 16120,
  "AUD/USD": 0.6620,
  "USD/CAD": 1.3680,
  "BTC/USD": 68500,
};

const INITIAL_SAHAM = {
  "TLKM.JK": { price: 3820, change: -1.2, high: 3890, low: 3800 },
  "ASII.JK": { price: 4950, change: 0.5,  high: 5000, low: 4900 },
  "ADRO.JK": { price: 2860, change: 2.1,  high: 2900, low: 2810 },
  "ICBP.JK": { price: 10900,change: -0.3, high: 11000,low: 10850 },
  "KLBF.JK": { price: 1480, change: 0.0,  high: 1500, low: 1470 },
  "ANTM.JK": { price: 1620, change: -3.5, high: 1690, low: 1610 },
  "INCO.JK": { price: 4420, change: 1.8,  high: 4480, low: 4370 },
  "UNTR.JK": { price: 23800,change: -0.9, high: 24100,low: 23700 },
  "BRIS.JK": { price: 2270, change: 4.6,  high: 2300, low: 2190 },
  "UNVR.JK": { price: 3120, change: -0.6, high: 3160, low: 3100 },
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
function formatNo(num, dec = 0) {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

export default function App() {
  const [tab, setTab] = useState("forex");

  // Market States
  const [forexData, setForexData] = useState(INITIAL_FOREX);
  const [sahamData, setSahamData] = useState(INITIAL_SAHAM);

  // Detail Modals / Views
  const [activePair, setActivePair] = useState(null);
  const [sahamDetail, setSahamDetail] = useState(null);
  const [searchSaham, setSearchSaham] = useState("");

  // Posisi Aktif User (Portofolio Simulasi)
  const [positions, setPositions] = useState([
    { id: 1, pair: "EUR/USD", type: "BUY",  entry: 1.0845, size: 0.5, tp: 1.0905, sl: 1.0795, time: "10:24" },
    { id: 2, pair: "XAU/USD", type: "BUY",  entry: 2341.00,size: 0.2, tp: 2369.00,sl: 2319.00,time: "11:02" },
    { id: 3, pair: "USD/JPY", type: "SELL", entry: 156.45, size: 1.0, tp: 155.65, sl: 157.10, time: "11:15" },
  ]);

  // Jurnal Trading State
  const [journal, setJournal] = useState([
    { id: 1, tanggal: "2026-05-20", instrumen: "XAU/USD", tipe: "BUY",  pnl: 420,  catatan: "Sesuai breakout H4, aman." },
    { id: 2, tanggal: "2026-05-21", instrumen: "EUR/USD", tipe: "SELL", pnl: -110, catatan: "Terkena spike news FOMC, bad." },
    { id: 3, tanggal: "2026-05-22", instrumen: "TLKM.JK",  tipe: "BUY",  pnl: 280,  catatan: "Akumulasi di support MA200." },
  ]);

  // Form Jurnal Baru
  const [jTanggal, setJTanggal] = useState("");
  const [jInstrumen, setJInstrumen] = useState("XAU/USD");
  const [jTipe, setJTipe] = useState("BUY");
  const [jPnl, setJPnl] = useState("");
  const [jCatatan, setJCatatan] = useState("");

  // Fungsi Tambah Jurnal
  const tambahJournal = (e) => {
    e.preventDefault();
    if (!jTanggal || !jInstrumen || !jPnl) return;
    const item = {
      id: Date.now(),
      tanggal: jTanggal,
      instrumen: jInstrumen,
      tipe: jTipe,
      pnl: parseFloat(jPnl) || 0,
      catatan: jCatatan,
    };
    setJournal([item, ...journal]);
    setJPnl("");
    setJCatatan("");
  };

  // ─── FETCH FOREX (BATCH PARALEL & ANTI RACE-CONDITION) ──────────────────────
  const fetchForex = useCallback(async () => {
    try {
      const requests = FOREX_LIST.map(async (f) => {
        try {
          const res = await fetch(`${TD_BASE}/price?symbol=${f.symbol}&apikey=${TD_KEY}`);
          if (!res.ok) throw new Error(`HTTP Error Status: ${res.status}`);
          const data = await res.json();
          
          if (data.code === 429) {
            console.warn("Twelve Data API: Rate Limit Tercapai");
            return { pair: f.pair, price: null };
          }
          
          return { pair: f.pair, price: data.price ? parseFloat(data.price) : null };
        } catch (err) {
          console.error(`Gagal fetch ${f.pair}:`, err);
          return { pair: f.pair, price: null };
        }
      });

      const results = await Promise.all(requests);
      const updatedData = {};
      
      results.forEach((res) => {
        if (res.price !== null && !isNaN(res.price)) {
          updatedData[res.pair] = res.price;
        }
      });

      if (Object.keys(updatedData).length > 0) {
        setForexData((prev) => ({ ...prev, ...updatedData }));
      }
    } catch (error) {
      console.error("Gagal melakukan batch fetch Forex:", error);
    }
  }, []);

  // ─── FETCH SAHAM ─────────────────────────────────────────────────────────────
  const fetchSaham = useCallback(async () => {
    const updatedSaham = {};
    for (const s of SAHAM_LIST) {
      try {
        const res = await fetch(`${AV_BASE}?function=GLOBAL_QUOTE&symbol=${s.ticker}&apikey=${AV_KEY}`);
        if (!res.ok) continue;
        const data = await res.json();

        if (data["Note"] || data["Information"]) {
          console.warn(`Alpha Vantage API: Rate Limit Tercapai untuk ${s.ticker}`);
          continue;
        }

        const quote = data["Global Quote"];
        if (quote && quote["05. price"]) {
          updatedSaham[s.ticker] = {
            price: parseFloat(quote["05. price"]),
            change: parseFloat(quote["10. change percent"]?.replace("%", "") || "0"),
            high: parseFloat(quote["03. high"] || "0"),
            low: parseFloat(quote["04. low"] || "0"),
          };
        }
      } catch (e) {
        console.error(`Gagal fetch data saham ${s.ticker}:`, e);
      }
    }

    if (Object.keys(updatedSaham).length > 0) {
      setSahamData((prev) => ({ ...prev, ...updatedSaham }));
    }
  }, []);

  // Sync polling live data
  useEffect(() => {
    fetchForex();
    fetchSaham();
    const ivForex = setInterval(fetchForex, 6000);  // Setiap 6 detik
    const ivSaham = setInterval(fetchSaham, 30000); // Setiap 30 detik (Rate limit protection)
    return () => {
      clearInterval(ivForex);
      clearInterval(ivSaham);
    };
  }, [fetchForex, fetchSaham]);

  // Simulasi fluktuasi lokal super tipis agar UI terlihat dinamis & hidup
  useEffect(() => {
    const iv = setInterval(() => {
      setForexData((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          const item = FOREX_LIST.find((f) => f.pair === k);
          const dec = item ? item.dec : 4;
          const delta = k === "USD/IDR" ? randRange(-5, 5) : k === "XAU/USD" ? randRange(-0.15, 0.15) : k === "BTC/USD" ? randRange(-4, 4) : randRange(-0.0001, 0.0001);
          next[k] = parseFloat((next[k] + delta).toFixed(dec));
        });
        return next;
      });
    }, 1500);
    return () => clearInterval(iv);
  }, []);

  // Hitung profit global posisi simulasi secara real-time
  const totalPnl = positions.reduce((acc, pos) => {
    const live = forexData[pos.pair] || pos.entry;
    let diff = pos.type === "BUY" ? live - pos.entry : pos.entry - live;
    let multiplier = 1000; 
    if (pos.pair === "USD/JPY") multiplier = 100;
    if (pos.pair === "XAU/USD") multiplier = 100;
    if (pos.pair === "USD/IDR") multiplier = 0.1;
    if (pos.pair === "BTC/USD") multiplier = 1;
    return acc + diff * pos.size * multiplier;
  }, 0);

  // Buat chart candlestick dummy 20 bar untuk instrumen terpilih
  const generateChartData = (basePrice, isSaham = false) => {
    if (!basePrice) return [];
    let cur = basePrice * 0.99;
    const arr = [];
    for (let i = 0; i < 20; i++) {
      const step = basePrice * (isSaham ? 0.006 : 0.0015);
      const o = cur + randRange(-step, step);
      const c = o + randRange(-step * 1.2, step * 1.2);
      const h = Math.max(o, c) + randRange(0, step * 0.4);
      const l = Math.min(o, c) - randRange(0, step * 0.4);
      const v = Math.floor(randRange(100, 1000));
      arr.push({ time: `${i + 9}:00`, open: o, high: h, low: l, close: c, volume: v });
      cur = c;
    }
    return arr;
  };

  // ─── SUB-KOMPONEN 1: TAB FOREX ──────────────────────────────────────────────
  const ForexTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {FOREX_LIST.map((f) => {
        const live = forexData[f.pair] || INITIAL_FOREX[f.pair];
        const color = f.signal === "BUY" ? "#22c55e" : f.signal === "SELL" ? "#ef4444" : "#94a3b8";
        return (
          <div
            key={f.pair}
            onClick={() => setActivePair(f)}
            style={{
              background: "#1e293b",
              borderRadius: 8,
              padding: "12px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              border: "1px solid #334155",
              transition: "transform 0.2s"
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc" }}>{f.pair}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                Signal: <span style={{ color, fontWeight: 700 }}>{f.signal}</span> ({f.kekuatan}%)
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 700, color: f.signal === "BUY" ? "#4ade80" : "#f87171" }}>
                {formatNo(live, f.dec)}
              </div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>TwelveData Live</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ─── SUB-KOMPONEN 2: TAB SAHAM ──────────────────────────────────────────────
  const SahamTab = ({ onSahamClick }) => {
    const filtered = SAHAM_LIST.filter(s =>
      s.nama.toLowerCase().includes(searchSaham.toLowerCase()) ||
      s.ticker.toLowerCase().includes(searchSaham.toLowerCase())
    );

    return (
      <div>
        <input
          type="text"
          placeholder="Cari emiten syariah (contoh: TLKM, BRIS)..."
          value={searchsearchSaham}
          onChange={(e) => setSearchSaham(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 6,
            color: "white",
            fontSize: 13,
            marginBottom: 12,
            boxSizing: "border-box"
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((s) => {
            const data = sahamData[s.ticker] || INITIAL_SAHAM[s.ticker];
            const isUp = data.change >= 0;
            return (
              <div
                key={s.ticker}
                onClick={() => onSahamClick(s)}
                style={{
                  background: "#1e293b",
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  border: "1px solid #334155"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{s.ticker.replace(".JK","")}</span>
                    {s.syariah && <span style={{ background: "#22c55e", color: "white", fontSize: 9, padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>ISSI</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.nama}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "white", fontFamily: "monospace" }}>
                    Rp {formatNo(data.price, 0)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isUp ? "#22c55e" : "#ef4444", marginTop: 2 }}>
                    {isUp ? "+" : ""}{data.change.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── SUB-KOMPONEN 3: TAB BERITA AI ──────────────────────────────────────────
  const NewsTab = () => {
    const news = [
      { id: 1, title: "Sentimen Bullish Emas Kuat Pasca Data Manufaktur AS Melemah", time: "15 mnt lalu", impact: "HIGH", asset: "XAU/USD" },
      { id: 2, title: "Rapat Umum Pemegang Saham TLKM Setujui Dividen Jumbo", time: "1 jam lalu", impact: "MED", asset: "TLKM" },
      { id: 3, title: "Inflasi Zona Eropa Stabil, Euro Menguat Tipis Terhadap Dollar", time: "2 jam lalu", impact: "LOW", asset: "EUR/USD" },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {news.map(n => (
          <div key={n.id} style={{ background: "#1e293b", padding: 12, borderRadius: 8, border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, background: n.impact === "HIGH" ? "#ef4444" : "#eab308", color: "white", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                {n.impact}
              </span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{n.time}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 6 }}>{n.title}</div>
            <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700 }}>Aset Terkait: {n.asset}</div>
          </div>
        ))}
      </div>
    );
  };

  // ─── SUB-KOMPONEN 4: KALKULATOR COMPOUND ────────────────────────────────────
  const Calc = () => {
    const [principal, setPrincipal] = useState(1000);
    const [rate, setRate] = useState(2);
    const [days, setDays] = useState(30);

    let rows = [];
    let current = parseFloat(principal) || 0;
    const pct = (parseFloat(rate) || 0) / 100;
    for (let i = 1; i <= (parseInt(days) || 0); i++) {
      const profit = current * pct;
      current += profit;
      rows.push({ hari: i, profit, total: current });
    }

    return (
      <div style={{ background: "#1e293b", padding: 14, borderRadius: 8, border: "1px solid #334155" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Modal ($/Rp)</label>
            <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} style={{ width: "100%", padding: 6, background: "#0f172a", border: "1px solid #334155", borderRadius: 4, color: "white" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Target/Hari (%)</label>
            <input type="number" value={rate} onChange={e => setRate(e.target.value)} style={{ width: "100%", padding: 6, background: "#0f172a", border: "1px solid #334155", borderRadius: 4, color: "white" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Durasi (Hari)</label>
            <input type="number" value={days} onChange={e => setDays(e.target.value)} style={{ width: "100%", padding: 6, background: "#0f172a", border: "1px solid #334155", borderRadius: 4, color: "white" }} />
          </div>
        </div>
        <div style={{ maxHeight: 150, overflowY: "auto", fontSize: 12, borderTop: "1px solid #334155", paddingTop: 8 }}>
          {rows.map(r => (
            <div key={r.hari} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1e293b" }}>
              <span style={{ color: "#64748b" }}>Hari {r.hari}</span>
              <span style={{ color: "#4ade80", fontFamily: "monospace" }}>+{formatNo(r.profit, 2)}</span>
              <span style={{ color: "white", fontWeight: 600, fontFamily: "monospace" }}>{formatNo(r.total, 2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "#f8fafc", fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>
      {/* HEADER UTAMA */}
      <div style={{ background: "#1e293b", padding: "16px 20px", borderBottom: "1px solid #334155", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#f8fafc", letterSpacing: "-0.5px" }}>
              ARCHITECT <span style={{ color: "#38bdf8" }}>PRO-TRADER</span>
            </h1>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, fontWeight: 600 }}>DASHBOARD INTEGRATED SYSTEM</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Floating PnL</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
              {totalPnl >= 0 ? "+" : ""}${formatNo(totalPnl, 2)}
            </div>
          </div>
        </div>
      </div>

      {/* BODY CONTAINER */}
      <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
        {/* TABS VIEW */}
        {tab === "forex" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <ForexTab />
            <div style={{ fontSize: 11, color: "#475569", textAlign: "center", padding: "4px 0" }}>
              Data otomatis ter-sinkronisasi dari pasar live. Tap pair untuk detail chart & panel posisi lengkap.
            </div>
          </div>
        )}

        {tab === "saham" && (
          <SahamTab onSahamClick={(s) => setSahamDetail(s)} />
        )}

        {tab === "berita" && <NewsTab />}

        {tab === "calc" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 2 }}>Kalkulator Compound</div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 14 }}>Simulasi pertumbuhan modal harian</div>
            <Calc />
          </div>
        )}
      </div>

      {/* DETAIL MODAL: FOREX CHART & SIGNAL PANEL */}
      {activePair && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.95)", zIndex: 50, overflowY: "auto", padding: 16 }}>
          <div style={{ maxWidth: 500, margin: "20px auto", background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: "white" }}>{activePair.pair}</h2>
                <span style={{ fontSize: 11, color: "#64748b" }}>Live Analisis Teknikal Klasik</span>
              </div>
              <button onClick={() => setActivePair(null)} style={{ background: "#334155", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>Tutup</button>
            </div>

            {/* LIVE PRICE BANNER */}
            <div style={{ background: "#0f172a", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, border: "1px solid #334155" }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Harga Live Terkini</span>
              <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: "#38bdf8" }}>
                {formatNo(forexData[activePair.pair], activePair.dec)}
              </span>
            </div>

            {/* CHART CONTAINER */}
            <div style={{ width: "100%", height: 200, background: "#0f172a", borderRadius: 8, padding: "10px 0", marginBottom: 14 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={generateChartData(forexData[activePair.pair] || INITIAL_FOREX[activePair.pair], false)}>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis domain={["auto", "auto"]} stroke="#475569" fontSize={10} tickLine={false} orientation="right" />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "white" }} />
                  <Line type="monotone" dataKey="close" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* STRATEGY MATRIKS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "#0f172a", padding: 10, borderRadius: 6, border: "1px solid #334155" }}>
                <div style={{ fontSize: 10, color: "#64748b" }}>Target Profit (Dinamis)</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", fontFamily: "monospace", marginTop: 2 }}>
                  {formatNo((forexData[activePair.pair] || INITIAL_FOREX[activePair.pair]) * (1 + activePair.tpPct / 100), activePair.dec)}
                </div>
              </div>
              <div style={{ background: "#0f172a", padding: 10, borderRadius: 6, border: "1px solid #334155" }}>
                <div style={{ fontSize: 10, color: "#64748b" }}>Stop Loss (Dinamis)</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", fontFamily: "monospace", marginTop: 2 }}>
                  {formatNo((forexData[activePair.pair] || INITIAL_FOREX[activePair.pair]) * (1 + activePair.slPct / 100), activePair.dec)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: SAHAM */}
      {sahamDetail && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.95)", zIndex: 50, overflowY: "auto", padding: 16 }}>
          <div style={{ maxWidth: 500, margin: "20px auto", background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 18, color: "white" }}>{sahamDetail.ticker}</h2>
                  {sahamDetail.syariah && <span style={{ background: "#22c55e", color: "white", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>SYARIAH ISSI</span>}
                </div>
                <span style={{ fontSize: 12, color: "#64748b" }}>{sahamDetail.nama}</span>
              </div>
              <button onClick={() => setSahamDetail(null)} style={{ background: "#334155", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>Tutup</button>
            </div>

            {/* DETAIL DATA */}
            {(() => {
              const data = sahamData[sahamDetail.ticker] || INITIAL_SAHAM[sahamDetail.ticker];
              return (
                <>
                  <div style={{ background: "#0f172a", padding: 14, borderRadius: 8, border: "1px solid #334155", display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Harga Terakhir</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginTop: 4, fontFamily: "monospace" }}>Rp {formatNo(data.price, 0)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Perubahan Harian</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: data.change >= 0 ? "#22c55e" : "#ef4444", marginTop: 8 }}>
                        {data.change >= 0 ? "+" : ""}{data.change.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* CHART SAHAM */}
                  <div style={{ width: "100%", height: 180, background: "#0f172a", borderRadius: 8, padding: "10px 0", marginBottom: 14 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={generateChartData(data.price, true)}>
                        <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                        <YAxis domain={["auto", "auto"]} stroke="#475569" fontSize={10} tickLine={false} orientation="right" />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }} />
                        <Line type="monotone" dataKey="close" stroke="#22c55e" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* BOTTOM NAV BAR */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#1e293b", borderTop: "1px solid #334155", display: "flex", zIndex: 30, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 0 8px", border: "none", background: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: tab === t.id ? "#38bdf8" : "#64748b" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
