import { useState, useEffect, useRef, useCallback } from "react";
import {
  Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, LineChart
} from "recharts";

// ─── API KEYS ─────────────────────────────────────────────────────────────────
const TD_KEY  = "a12d412f14b0473ba4a54f8b4a5d04c9";
const AV_KEY  = "YAKZR9RCX8C99N0A";
const TD_BASE = "https://api.twelvedata.com";
const AV_BASE = "https://www.alphavantage.co/query";

// ─── FOREX META ───────────────────────────────────────────────────────────────
// TP & SL dihitung dinamis dari harga live (persen dari entry)
// Tidak lagi hardcode agar selalu sesuai harga pasar
// slPct = risiko (selalu kecil & tight), tpPct = reward (min 2x slPct → RR ≥ 1:2)
const FOREX_LIST = [
  { pair: "EUR/USD", symbol: "EUR/USD", dec: 4, signal: "BUY",  kekuatan: 74, slPct: -0.25, tpPct:  0.625 }, // RR 1:2.5
  { pair: "GBP/USD", symbol: "GBP/USD", dec: 4, signal: "BUY",  kekuatan: 68, slPct: -0.30, tpPct:  0.750 }, // RR 1:2.5
  { pair: "USD/JPY", symbol: "USD/JPY", dec: 2, signal: "SELL", kekuatan: 72, slPct:  0.25, tpPct: -0.625 }, // RR 1:2.5
  { pair: "XAU/USD", symbol: "XAU/USD", dec: 1, signal: "BUY",  kekuatan: 85, slPct: -0.50, tpPct:  1.500 }, // RR 1:3.0
  { pair: "USD/IDR", symbol: "USD/IDR", dec: 0, signal: "SELL", kekuatan: 60, slPct:  0.40, tpPct: -1.000 }, // RR 1:2.5
  { pair: "AUD/USD", symbol: "AUD/USD", dec: 4, signal: "HOLD", kekuatan: 50, slPct: -0.20, tpPct:  0.500 }, // RR 1:2.5
  { pair: "USD/CAD", symbol: "USD/CAD", dec: 4, signal: "SELL", kekuatan: 62, slPct:  0.22, tpPct: -0.550 }, // RR 1:2.5
  { pair: "BTC/USD", symbol: "BTC/USD", dec: 0, signal: "BUY",  kekuatan: 78, slPct: -1.50, tpPct:  4.500 }, // RR 1:3.0
];

// ─── SAHAM SYARIAH (IDX ISSI / JII) ──────────────────────────────────────────
const SYARIAH_KODE = new Set([
  "AADI","AALI","ABMM","ACST","ADCP","ADHI","ADMR","ADRO","AGAR","AGII",
  "AIMS","AISA","AKPI","AKRA","AKSI","ALDO","AMAN","AMFG","AMIN","ANDI",
  "ANJT","ANTM","APLN","ARCI","ARNA","ASII","ASPI","ASRI","ASSA","ATIC",
  "ATLA","AUTO","AVIA","AYLS","BAIK","BAPI","BATR","BAUT","BBRM","BEST",
  "BIKE","BINO","BIRD","BISI","BLES","BOLT","BRAM","BRIS","BRMS","BRNA",
  "BRPT","BSBK","BSDE","BSML","BSSR","BUAH","BUKK","BULL","BYAN","CAKK",
  "CAMP","CANI","CARE","CASS","CBDK","CBRE","CCSI","CEKA","CGAS","CHEM",
  "CINT","CITA","CITY","CLEO","CLPI","CMNP","CMRY","COAL","CPIN","CPRO",
  "CRAB","CRSN","CSAP","CSMI","CSRA","CTBN","CTRA","DAAZ","DADA","DATA",
  "DAYA","DCII","DEPO","DEWI","DGWG","DILD","DMAS","AMMN","ANTM","BYAN",
  "ICBP","INDF","KLBF","MYOR","PTBA","SMGR","INTP","TLKM","UNTR","CPIN",
  "BRPT","INCO","ITMG","MTEL","DNET","SMMA","ADMR","GOTO","AMRT","ISAT",
]);

// ─── SEMUA SAHAM IDX (dari PDF + tambahan) ────────────────────────────────────
const SAHAM_LIST = [
  // Perbankan
  { kode:"BBCA",  nama:"Bank Central Asia",        kategori:"Perbankan",  signal:"BUY",  kekuatan:82, syariah:false, indikator:"RSI 42 oversold, MACD golden cross, Volume +34%, DER rendah" },
  { kode:"BBRI",  nama:"Bank Rakyat Indonesia",    kategori:"Perbankan",  signal:"SELL", kekuatan:35, syariah:false, indikator:"RSI 68 overbought, MACD death cross, Asing net sell" },
  { kode:"BMRI",  nama:"Bank Mandiri",             kategori:"Perbankan",  signal:"HOLD", kekuatan:55, syariah:false, indikator:"RSI 52 netral, Sideways di support 5.800, NIM stabil" },
  { kode:"BRIS",  nama:"Bank Syariah Indonesia",   kategori:"Perbankan",  signal:"BUY",  kekuatan:73, syariah:true,  indikator:"RSI 44, CASA growth +12%, Pembiayaan syariah ekspansi" },
  { kode:"BTPS",  nama:"Bank BTPN Syariah",        kategori:"Perbankan",  signal:"BUY",  kekuatan:68, syariah:true,  indikator:"RSI 40, NPF rendah 1.2%, ROE tinggi 26%, Syariah compliant" },
  { kode:"BANK",  nama:"Bank Aladin Syariah",      kategori:"Perbankan",  signal:"HOLD", kekuatan:52, syariah:true,  indikator:"RSI 51, Digital banking growth, Masih rugi operasional" },
  { kode:"BBSS",  nama:"Bumi Benowo Sukses Sejaht",kategori:"Perbankan",  signal:"HOLD", kekuatan:45, syariah:false, indikator:"RSI 50 netral, Volume rendah, Likuiditas terbatas" },
  // Energi & Tambang
  { kode:"ADRO",  nama:"Alamtri Resources Ind.",   kategori:"Tambang",    signal:"BUY",  kekuatan:75, syariah:true,  indikator:"RSI 45, Harga batu bara stabil, Dividen yield 7%, Free cash flow positif" },
  { kode:"AADI",  nama:"Adaro Andalan Indonesia",  kategori:"Tambang",    signal:"BUY",  kekuatan:70, syariah:true,  indikator:"RSI 43, Spin-off dari ADRO, Valuasi murah, Ekspansi energi" },
  { kode:"ADMR",  nama:"Alamtri Minerals Ind.",    kategori:"Tambang",    signal:"HOLD", kekuatan:55, syariah:true,  indikator:"RSI 53, Eksplorasi mineral aktif, Tunggu katalis harga" },
  { kode:"ANTM",  nama:"Aneka Tambang",            kategori:"Tambang",    signal:"BUY",  kekuatan:71, syariah:true,  indikator:"RSI 38 oversold, Emas bullish, Rebound probable, HPAL proyek" },
  { kode:"INCO",  nama:"Vale Indonesia",           kategori:"Tambang",    signal:"HOLD", kekuatan:58, syariah:true,  indikator:"RSI 52, Nikel harga bergejolak, EV demand jangka panjang" },
  { kode:"PTBA",  nama:"Bukit Asam",               kategori:"Tambang",    signal:"BUY",  kekuatan:72, syariah:true,  indikator:"RSI 41, PLTU Sumsel lanjut, Dividen konsisten, ROE 25%" },
  { kode:"ITMG",  nama:"Indo Tambangraya Megah",   kategori:"Tambang",    signal:"BUY",  kekuatan:69, syariah:true,  indikator:"RSI 40, Ekspor batu bara kuat, Dividen yield 8.5%, Kas bersih" },
  { kode:"BYAN",  nama:"Bayan Resources",          kategori:"Tambang",    signal:"SELL", kekuatan:38, syariah:true,  indikator:"RSI 67, Valuasi premium, Harga batu bara softening" },
  { kode:"BRPT",  nama:"Barito Pacific",           kategori:"Energi",     signal:"BUY",  kekuatan:76, syariah:true,  indikator:"RSI 45, Breakout resistance, Laba Q1 +800% YoY, Renewables" },
  { kode:"BUMI",  nama:"Bumi Resources",           kategori:"Tambang",    signal:"SELL", kekuatan:30, syariah:false, indikator:"RSI 66, Utang tinggi, Arus kas negatif, Risiko delisting" },
  { kode:"ARCI",  nama:"Archi Indonesia",          kategori:"Tambang",    signal:"HOLD", kekuatan:50, syariah:true,  indikator:"RSI 51, Produksi emas stabil, Tunggu harga emas naik" },
  // Telekomunikasi & Teknologi
  { kode:"TLKM",  nama:"Telkom Indonesia",         kategori:"Telko",      signal:"HOLD", kekuatan:50, syariah:true,  indikator:"RSI 50 netral, Konsolidasi, Dividen yield 5.2%, TowerCo spin-off" },
  { kode:"ISAT",  nama:"Indosat Ooredoo Hutchison",kategori:"Telko",      signal:"BUY",  kekuatan:65, syariah:true,  indikator:"RSI 42, Merger synergy realized, EBITDA margin naik, 5G rollout" },
  { kode:"MTEL",  nama:"Mitratel",                 kategori:"Telko",      signal:"BUY",  kekuatan:67, syariah:true,  indikator:"RSI 43, Tower co pure play, Pendapatan recurring, Dividend potential" },
  { kode:"DNET",  nama:"Indoritel Makmur Int.",    kategori:"Teknologi",  signal:"HOLD", kekuatan:52, syariah:false, indikator:"RSI 53, Investasi di Indomaret, Likuiditas rendah" },
  { kode:"GOTO",  nama:"GoTo Gojek Tokopedia",     kategori:"Teknologi",  signal:"SELL", kekuatan:30, syariah:false, indikator:"RSI 65, Resistance kuat, Rugi operasional masih besar, Bakar uang" },
  { kode:"BELI",  nama:"Global Digital Niaga",     kategori:"Teknologi",  signal:"SELL", kekuatan:32, syariah:false, indikator:"RSI 64, Blibli masih rugi, Kompetisi e-commerce ketat" },
  { kode:"DCII",  nama:"DCI Indonesia",            kategori:"Teknologi",  signal:"BUY",  kekuatan:80, syariah:true,  indikator:"RSI 38, Data center demand tinggi, AI tailwind, ROE 28%" },
  { kode:"CYBR",  nama:"ITSEC Asia",              kategori:"Teknologi",  signal:"BUY",  kekuatan:71, syariah:true,  indikator:"RSI 40, Cybersecurity demand naik, Revenue +45% YoY" },
  // Konsumer
  { kode:"INDF",  nama:"Indofood",                 kategori:"Konsumer",   signal:"BUY",  kekuatan:65, syariah:true,  indikator:"RSI 44, Support kuat 6.200, Defensif saat volatil, COGS efisien" },
  { kode:"ICBP",  nama:"Indofood CBP",             kategori:"Konsumer",   signal:"HOLD", kekuatan:52, syariah:true,  indikator:"RSI 53, Konsolidasi pasca rally, Tunggu pullback ke 9.500" },
  { kode:"UNVR",  nama:"Unilever Indonesia",       kategori:"Konsumer",   signal:"HOLD", kekuatan:48, syariah:false, indikator:"RSI 51, Sideways, Tekanan margin input cost, Dividen 100%" },
  { kode:"MYOR",  nama:"Mayora Indah",             kategori:"Konsumer",   signal:"BUY",  kekuatan:68, syariah:true,  indikator:"RSI 41, Ekspor meningkat, Brand kuat, Valuasi wajar" },
  { kode:"CPIN",  nama:"Charoen Pokphand Ind.",    kategori:"Konsumer",   signal:"HOLD", kekuatan:54, syariah:true,  indikator:"RSI 52, Harga DOC stabil, Margin tertekan pakan" },
  { kode:"KLBF",  nama:"Kalbe Farma",              kategori:"Konsumer",   signal:"BUY",  kekuatan:70, syariah:true,  indikator:"RSI 42, Farmasi defensif, ROE 18%, Pipeline produk baru" },
  { kode:"CMRY",  nama:"Cisarua Mountain Dairy",   kategori:"Konsumer",   signal:"BUY",  kekuatan:72, syariah:true,  indikator:"RSI 40, Produk premium, Volume naik, Ekspansi kapasitas" },
  { kode:"CLEO",  nama:"Sariguna Primatirta",      kategori:"Konsumer",   signal:"BUY",  kekuatan:66, syariah:true,  indikator:"RSI 43, AMDK tumbuh, Distribusi luas, Margin stabil" },
  { kode:"CAMP",  nama:"Campina Ice Cream",        kategori:"Konsumer",   signal:"HOLD", kekuatan:50, syariah:true,  indikator:"RSI 51, Musiman, Ekspansi gerai, Harga bahan naik" },
  // Properti & Konstruksi
  { kode:"BSDE",  nama:"Bumi Serpong Damai",       kategori:"Properti",   signal:"HOLD", kekuatan:53, syariah:true,  indikator:"RSI 52, Properti sideways, Marketing sales turun, Land bank besar" },
  { kode:"CTRA",  nama:"Ciputra Development",      kategori:"Properti",   signal:"BUY",  kekuatan:63, syariah:true,  indikator:"RSI 44, Backlog kuat, Proyek township, KPR demand naik" },
  { kode:"ASRI",  nama:"Alam Sutera Realty",       kategori:"Properti",   signal:"HOLD", kekuatan:47, syariah:false, indikator:"RSI 50, Utang USD exposure, Penjualan flat, Restrukturisasi" },
  { kode:"DMAS",  nama:"Puradelta Lestari",        kategori:"Properti",   signal:"BUY",  kekuatan:69, syariah:true,  indikator:"RSI 41, Kawasan industri GIIC, Investasi FDI naik, Dividend" },
  { kode:"CBDK",  nama:"Bangun Kosambi Sukses",    kategori:"Properti",   signal:"BUY",  kekuatan:74, syariah:true,  indikator:"RSI 38, IPO segar, Proyek BSD, Valuasi attractif" },
  { kode:"ADHI",  nama:"Adhi Karya",               kategori:"Konstruksi", signal:"HOLD", kekuatan:48, syariah:false, indikator:"RSI 50, BUMN konstruksi, Proyek IKN, Utang tinggi" },
  { kode:"ADCP",  nama:"Adhi Commuter Properti",   kategori:"Properti",   signal:"HOLD", kekuatan:51, syariah:true,  indikator:"RSI 52, TOD development, LRT Jabodebek, Pendapatan baru" },
  // Otomotif & Industri
  { kode:"ASII",  nama:"Astra International",      kategori:"Otomotif",   signal:"BUY",  kekuatan:67, syariah:true,  indikator:"RSI 41, Valuasi murah PBV 1.2x, Dividen menarik, Diversifikasi" },
  { kode:"AUTO",  nama:"Astra Otoparts",           kategori:"Otomotif",   signal:"BUY",  kekuatan:63, syariah:true,  indikator:"RSI 43, Komponen EV, Ekspansi ASEAN, Margin naik" },
  { kode:"BOLT",  nama:"Garuda Metalindo",         kategori:"Industri",   signal:"HOLD", kekuatan:49, syariah:true,  indikator:"RSI 51, Baut & fastener, Volume produksi flat" },
  { kode:"BRAM",  nama:"Indo Kordsa",              kategori:"Industri",   signal:"HOLD", kekuatan:52, syariah:true,  indikator:"RSI 52, Kabel ban, Ekspor kuat, Margin tertekan" },
  { kode:"BUKK",  nama:"Bukaka Teknik Utama",      kategori:"Industri",   signal:"BUY",  kekuatan:64, syariah:true,  indikator:"RSI 42, Proyek infrastruktur, Order book penuh, EPC" },
  // Agrikultur
  { kode:"AALI",  nama:"Astra Agro Lestari",       kategori:"Agrikultur", signal:"HOLD", kekuatan:53, syariah:true,  indikator:"RSI 52, CPO harga stabil, Produktivitas FFB naik" },
  { kode:"ANJT",  nama:"Austindo Nusantara Jaya",  kategori:"Agrikultur", signal:"BUY",  kekuatan:64, syariah:true,  indikator:"RSI 43, Replanting selesai, CPO outlook positif" },
  { kode:"ANDI",  nama:"Andira Agro",              kategori:"Agrikultur", signal:"HOLD", kekuatan:48, syariah:true,  indikator:"RSI 50, Karet & sawit, Volume kecil, Likuiditas rendah" },
  { kode:"CSRA",  nama:"Cisadane Sawit Raya",      kategori:"Agrikultur", signal:"BUY",  kekuatan:60, syariah:true,  indikator:"RSI 41, Luas kebun naik, CPO demand Asia" },
  // Infrastruktur
  { kode:"UNTR",  nama:"United Tractors",          kategori:"Infrastruktur", signal:"BUY",  kekuatan:74, syariah:true, indikator:"RSI 42, Alat berat mining, Dividen yield 6%, Kas bersih besar" },
  { kode:"SMGR",  nama:"Semen Indonesia",          kategori:"Infrastruktur", signal:"HOLD", kekuatan:51, syariah:true, indikator:"RSI 52, Permintaan semen naik tipis, Proyek IKN, Kapasitas idle" },
  { kode:"INTP",  nama:"Indocement",               kategori:"Infrastruktur", signal:"HOLD", kekuatan:49, syariah:true, indikator:"RSI 51, Valuasi premium, Utilisasi rendah, Kompetisi ketat" },
  { kode:"CMNP",  nama:"Citra Marga Nusaphala",    kategori:"Infrastruktur", signal:"BUY",  kekuatan:61, syariah:true, indikator:"RSI 43, Jalan tol Jabotabek, Trafik naik, Recurring income" },
  { kode:"BIRD",  nama:"Blue Bird",                kategori:"Infrastruktur", signal:"HOLD", kekuatan:52, syariah:true, indikator:"RSI 52, Taksi konvensional, Ride hailing persaingan" },
  { kode:"ASSA",  nama:"Adi Sarana Armada",        kategori:"Infrastruktur", signal:"BUY",  kekuatan:65, syariah:true, indikator:"RSI 41, Fleet management, Logistik ekspansi, ROE 15%" },
  // Keuangan non-bank
  { kode:"ABMM",  nama:"ABM Investama",            kategori:"Keuangan",   signal:"HOLD", kekuatan:50, syariah:false, indikator:"RSI 51, Holding energi, Diversifikasi aset" },
  { kode:"ACES",  nama:"Aspirasi Hidup Indonesia", kategori:"Ritel",      signal:"BUY",  kekuatan:67, syariah:true,  indikator:"RSI 42, Ace Hardware, SSSG positif, Ekspansi gerai" },
  { kode:"AMRT",  nama:"Sumber Alfaria Trijaya",   kategori:"Ritel",      signal:"BUY",  kekuatan:73, syariah:true,  indikator:"RSI 40, Alfamart jaringan terbesar, Revenue tumbuh, SSG+" },
  { kode:"DAYA",  nama:"Duta Intidaya",            kategori:"Ritel",      signal:"HOLD", kekuatan:48, syariah:true,  indikator:"RSI 51, Watsons Indonesia, Ekspansi toko baru" },
  { kode:"CSAP",  nama:"Catur Sentosa Adiprana",   kategori:"Ritel",      signal:"BUY",  kekuatan:61, syariah:true,  indikator:"RSI 42, Material bangunan, Proyek infrastruktur benefit" },
  // Healthcare
  { kode:"CARE",  nama:"Metro Healthcare Ind.",    kategori:"Kesehatan",  signal:"BUY",  kekuatan:66, syariah:true,  indikator:"RSI 41, Rumah sakit ekspansi, Pasien naik, Margin recovery" },
  { kode:"BMHS",  nama:"Bundamedik",               kategori:"Kesehatan",  signal:"HOLD", kekuatan:52, syariah:true,  indikator:"RSI 53, RS Bundamedik, Pasien JKN, Kapasitas naik" },
  { kode:"KLBF",  nama:"Kalbe Farma",              kategori:"Kesehatan",  signal:"BUY",  kekuatan:70, syariah:true,  indikator:"RSI 42, Farmasi defensif, ROE 18%, Pipeline produk baru" },
  { kode:"DGNS",  nama:"Diagnos Laboratorium",     kategori:"Kesehatan",  signal:"BUY",  kekuatan:63, syariah:true,  indikator:"RSI 43, Lab diagnostik, Post-pandemic recovery, Ekspansi" },
  { kode:"CHEK",  nama:"Diastika Biotekindo",      kategori:"Kesehatan",  signal:"HOLD", kekuatan:50, syariah:true,  indikator:"RSI 51, Alat kesehatan, Impor USD exposure" },
  // Media & Lainnya
  { kode:"BMTR",  nama:"Global Mediacom",          kategori:"Media",      signal:"SELL", kekuatan:33, syariah:false, indikator:"RSI 63, TV terrestrial declining, Streaming persaingan ketat" },
  { kode:"AVIA",  nama:"Avia Avian",               kategori:"Industri",   signal:"BUY",  kekuatan:74, syariah:true,  indikator:"RSI 41, Cat dekoratif #1, Margin tinggi, Ekspansi distribusi" },
  { kode:"AKRA",  nama:"AKR Corporindo",           kategori:"Distribusi", signal:"BUY",  kekuatan:68, syariah:true,  indikator:"RSI 42, Distribusi BBM, Kawasan JIIPE, Logistik kuat" },
  { kode:"CEKA",  nama:"Wilmar Cahaya Indonesia",  kategori:"Konsumer",   signal:"HOLD", kekuatan:51, syariah:true,  indikator:"RSI 52, Minyak goreng, Margin volatile, DER rendah" },
  { kode:"AKPI",  nama:"Argha Karya Prima Ind.",   kategori:"Industri",   signal:"HOLD", kekuatan:49, syariah:true,  indikator:"RSI 50, Kemasan plastik, Kapasitas naik, Input cost turun" },
  { kode:"ALDO",  nama:"Alkindo Naratama",         kategori:"Industri",   signal:"BUY",  kekuatan:62, syariah:true,  indikator:"RSI 43, Kemasan kertas, Permintaan naik, Efisiensi biaya" },
  { kode:"SMMA",  nama:"Sinar Mas Multiartha",     kategori:"Keuangan",   signal:"HOLD", kekuatan:55, syariah:false, indikator:"RSI 53, Holding keuangan, Diversifikasi bisnis" },
  { kode:"TPIA",  nama:"Chandra Asri Petrochemical",kategori:"Kimia",     signal:"HOLD", kekuatan:54, syariah:true,  indikator:"RSI 52, Petrokimia, Kapasitas ekspansi, Harga PTA volatile" },
  { kode:"DEPO",  nama:"Caturkarda Depo Bangunan", kategori:"Ritel",      signal:"BUY",  kekuatan:65, syariah:true,  indikator:"RSI 42, Material bangunan, Konsumen retail, Ekspansi" },
  { kode:"DATA",  nama:"Remala Abadi",             kategori:"Teknologi",  signal:"BUY",  kekuatan:60, syariah:true,  indikator:"RSI 43, Data center, Cloud demand, Kapasitas ekspansi" },
  { kode:"AGII",  nama:"Samator Indo Gas",         kategori:"Industri",   signal:"HOLD", kekuatan:52, syariah:true,  indikator:"RSI 52, Gas industri, Pelanggan manufaktur stabil" },
  { kode:"AMMN",  nama:"Amman Mineral Nusa Tenggara",kategori:"Tambang",  signal:"HOLD", kekuatan:55, syariah:true,  indikator:"RSI 55, Tembaga & emas, Tunggu break 7.500 untuk entry" },
];

// Remove duplicate KLBF
const uniqueSaham = Array.from(new Map(SAHAM_LIST.map(s => [s.kode, s])).values());

const KATEGORI_SAHAM = ["Semua","Syariah","Perbankan","Tambang","Energi","Telko","Teknologi","Konsumer","Properti","Konstruksi","Otomotif","Industri","Agrikultur","Infrastruktur","Ritel","Kesehatan","Keuangan","Media","Kimia","Distribusi"];
const SAHAM_VIEWS = ["Semua","Top Gainer","Top Loser","Paling Aktif"];
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

// ─── SIMULASI CANDLE REALISTIS ─────────────────────────────────────────────────
function generateSimCandles(basePrice, symbol, tf, count=60) {
  const isGold   = symbol.includes("XAU");
  const isBTC    = symbol.includes("BTC");
  const isJPY    = symbol.includes("JPY");
  const isIDR    = symbol.includes("IDR");
  const tfMult = { "5min":0.3,"15min":0.5,"30min":0.7,"1h":1,"4h":2,"1day":4 };
  const mult   = tfMult[tf] ?? 1;
  const baseVol = isGold ? 0.0015 : isBTC ? 0.008 : isJPY||isIDR ? 0.0006 : 0.0012;
  const vol    = baseVol * mult;
  const now  = Date.now();
  const tfMs = { "5min":5*60e3,"15min":15*60e3,"30min":30*60e3,"1h":60*60e3,"4h":4*3600e3,"1day":86400e3 };
  const step = tfMs[tf] ?? 3600e3;
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
    if (data.price) return { price: parseFloat(data.price), src: "twelvedata" };
    // Rate limit or plan error — log for debug
    if (data.code || data.status === "error") console.warn("TwelveData error:", data.message || data.code);
  } catch(e) { console.warn("TwelveData fetch failed:", e.message); }
  return null;
}

// ─── API: FALLBACK — Frankfurter (forex) + Metals-API shim ───────────────────
// For forex pairs, use open.er-api.com (no key, generous limits)
// For XAU/USD, use Frankfurter ECB rates (gold in EUR then convert) or direct metals API
async function fetchFallbackPrice(symbol) {
  try {
    // Forex pairs via exchangerate-api (free, no key)
    const FOREX_MAP = {
      "EUR/USD": { base:"EUR", quote:"USD" },
      "GBP/USD": { base:"GBP", quote:"USD" },
      "USD/JPY": { base:"USD", quote:"JPY" },
      "AUD/USD": { base:"AUD", quote:"USD" },
      "USD/CAD": { base:"USD", quote:"CAD" },
      "USD/IDR": { base:"USD", quote:"IDR" },
    };
    if (FOREX_MAP[symbol]) {
      const { base, quote } = FOREX_MAP[symbol];
      const res  = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const data = await res.json();
      if (data.rates && data.rates[quote]) {
        return { price: data.rates[quote], src: "er-api" };
      }
    }
    // XAU/USD — use gold-api.com (no key needed for basic price)
    if (symbol === "XAU/USD") {
      const res  = await fetch("https://data-asg.goldprice.org/dbXRates/USD");
      const data = await res.json();
      if (data.items && data.items[0]?.xauPrice) {
        return { price: data.items[0].xauPrice, src: "goldprice.org" };
      }
    }
    // BTC/USD — CoinGecko no-key endpoint
    if (symbol === "BTC/USD") {
      const res  = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
      const data = await res.json();
      if (data.bitcoin?.usd) {
        return { price: data.bitcoin.usd, src: "coingecko" };
      }
    }
  } catch(e) { console.warn("Fallback price fetch failed:", e.message); }
  return null;
}

// ─── COMBINED PRICE FETCH ─────────────────────────────────────────────────────
async function fetchBestPrice(symbol) {
  const td = await fetchTDPrice(symbol);
  if (td) return td;
  const fb = await fetchFallbackPrice(symbol);
  if (fb) return fb;
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

// ─── TRANSLATE NEWS VIA CLAUDE API ────────────────────────────────────────────
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
    return newsArr;
  }
}

// ─── FALLBACK PRICES ──────────────────────────────────────────────────────────
const FB = {
  "EUR/USD":1.0854,"GBP/USD":1.2731,"USD/JPY":155.42,
  "XAU/USD":3312.5,"USD/IDR":16380,"AUD/USD":0.6510,
  "USD/CAD":1.3640,"BTC/USD":103500,
  BBCA:8500,BBRI:4100,BMRI:5850,BRPT:2480,TLKM:2850,
  AMMN:7350,ANTM:3280,INDF:6400,UNVR:2100,ASII:4200,ICBP:9800,GOTO:62,
  BRIS:2100,BTPS:1650,BANK:580,ADRO:2100,AADI:6800,ADMR:650,INCO:3200,
  PTBA:3050,ITMG:25000,BYAN:18000,BUMI:85,ARCI:620,ISAT:1800,MTEL:630,
  DNET:2100,BELI:450,DCII:35000,CYBR:890,MYOR:2300,CPIN:4800,KLBF:1620,
  CMRY:4200,CLEO:680,CAMP:1100,BSDE:1050,CTRA:980,ASRI:380,DMAS:225,
  CBDK:2800,ADHI:540,ADCP:195,AUTO:2150,BOLT:430,BRAM:4100,BUKK:1750,
  AALI:9500,ANJT:1200,ANDI:425,CSRA:780,UNTR:22000,SMGR:4200,INTP:6800,
  CMNP:1800,BIRD:2050,ASSA:830,ABMM:2100,ACES:785,AMRT:2700,DAYA:520,
  CSAP:680,CARE:1250,BMHS:340,DGNS:615,CHEK:290,BMTR:460,AVIA:7800,
  AKRA:1580,CEKA:1050,AKPI:680,ALDO:590,SMMA:8400,TPIA:6200,DEPO:890,
  DATA:750,AGII:3100,
};

// ─── PRICE STORE (shared) ─────────────────────────────────────────────────────
const pStore={}, pListeners={};
const subPrice=(sym,cb)=>{
  if(!pListeners[sym]) pListeners[sym]=new Set();
  pListeners[sym].add(cb);
  return ()=>pListeners[sym].delete(cb);
};
const notifyPrice=(sym,v)=>{ if(pListeners[sym]) pListeners[sym].forEach(cb=>cb(v)); };

// Track simulated change % for stock list
const pChgStore = {};

// ─── HOOK: PRICE ──────────────────────────────────────────────────────────────
function usePrice(symbol, fallback) {
  const [price,  setPrice]  = useState(pStore[symbol]??fallback);
  const [chg,    setChg]    = useState(pChgStore[symbol]??0);
  const [apiOk,  setApiOk]  = useState(false);
  const [priceSrc, setPriceSrc] = useState("–");
  const [loading,setLoading]= useState(true);
  const baseRef  = useRef(fallback);
  const priceRef = useRef(pStore[symbol]??fallback);
  const firstLoad = useRef(true);

  useEffect(()=>{
    return subPrice(symbol, v=>{
      priceRef.current=v;
      setPrice(v);
      const c = ((v-baseRef.current)/baseRef.current)*100;
      pChgStore[symbol]=c;
      setChg(c);
    });
  },[symbol]);

  useEffect(()=>{
    let cancelled=false;
    firstLoad.current = true;
    const load=async()=>{
      // Only show loading spinner on first fetch, not on background refresh
      if (firstLoad.current) setLoading(true);
      const result = await fetchBestPrice(symbol);
      if(cancelled) return;
      if(result && result.price > 0){
        const real = result.price;
        pStore[symbol]=real; priceRef.current=real;
        if (firstLoad.current) baseRef.current = real; // baseline only on first load
        setPrice(real); setApiOk(true); setPriceSrc(result.src);
        if (firstLoad.current) setChg(0);
        notifyPrice(symbol, real);
      } else {
        if (firstLoad.current) {
          priceRef.current=fallback; setPrice(fallback);
          setApiOk(false); setPriceSrc("fallback");
        }
      }
      if (firstLoad.current) { setLoading(false); firstLoad.current = false; }
    };
    load();
    const id=setInterval(load, 30000); // refresh every 30s (more responsive)
    return ()=>{ cancelled=true; clearInterval(id); };
  },[symbol,fallback]);

  // Simulated micro-tick between API refreshes (smooth the display)
  useEffect(()=>{
    const vol=symbol.includes("BTC")?0.0008:symbol.includes("XAU")?0.0002:symbol.includes("IDR")?0.00005:0.00008;
    const id=setInterval(()=>{
      const d=(Math.random()-0.495)*vol; // very slight drift, mostly noise
      const next=Math.max(priceRef.current*(1+d),0.0001);
      priceRef.current=next;
      setPrice(next);
      const c=((next-baseRef.current)/baseRef.current)*100;
      pChgStore[symbol]=c;
      setChg(c);
      notifyPrice(symbol,next);
    },3000);
    return ()=>clearInterval(id);
  },[symbol]);

  return {price, chg, apiOk, priceSrc, loading};
}

// ─── HOOK: CANDLES ────────────────────────────────────────────────────────────
// Sim candles are generated ONCE per symbol+tf and cached in a ref.
// They never regenerate on livePrice ticks — only when symbol or tf changes.
function useCandles(symbol, tf, livePrice) {
  const [candles, setCandles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simMode, setSimMode] = useState(false);
  // Cache stable sim data so re-renders from livePrice never replace it
  const simRef = useRef(null);
  const simKeyRef = useRef(null); // tracks "symbol+tf" to know when to regen

  useEffect(()=>{
    let cancelled=false;
    setCandles(null); setSimMode(false); setLoading(true);
    simRef.current = null; // clear cache on symbol/tf change
    simKeyRef.current = null;

    fetchTDCandles(symbol, tf, 60).then(data=>{
      if(cancelled) return;
      if(data&&data.length>0){
        setCandles(data);
        setSimMode(false);
      } else {
        // Generate ONCE using the best price available at this moment
        const base = pStore[symbol] ?? livePrice ?? FB[symbol] ?? 1;
        const key = `${symbol}|${tf}`;
        if(simKeyRef.current !== key || !simRef.current) {
          simRef.current = generateSimCandles(base, symbol, tf, 60);
          simKeyRef.current = key;
        }
        setCandles(simRef.current);
        setSimMode(true);
      }
      setLoading(false);
    });
    return ()=>{ cancelled=true; };
  },[symbol, tf]); // intentionally OMIT livePrice — sim must not re-run on price ticks

  // DO NOT have a second useEffect watching livePrice — that was the root cause of Bug 2 & 3

  return {candles, loading, simMode};
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
const Badge=({signal})=>(
  <span style={{background:sigBg(signal),color:sigColor(signal),border:`1px solid ${sigBdr(signal)}`,
    borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>
    {signal}
  </span>
);

const SyariahBadge=()=>(
  <span style={{background:"rgba(16,185,129,0.1)",color:"#10b981",border:"1px solid rgba(16,185,129,0.3)",
    borderRadius:4,padding:"1px 5px",fontSize:8,fontWeight:700,letterSpacing:0.5}}>☪ SYARIAH</span>
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

const Spark=({data,color})=>(
  <ResponsiveContainer width={60} height={24}>
    <LineChart data={data} margin={{top:2,bottom:2,left:0,right:0}}>
      <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
    </LineChart>
  </ResponsiveContainer>
);

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

// ─── TIMEFRAME TP/SL MULTIPLIER ───────────────────────────────────────────────
// Shorter TF = tighter levels; longer TF = wider levels
// ─── PANEL POSISI FOREX (TP/SL DINAMIS DARI HARGA LIVE) ───────────────────────
// SL = risiko tetap (tight), TP di-scale sesuai TF untuk jaga RR ≥ 1:2
// TF multiplier hanya berlaku pada TP, SL sengaja tetap tight
const TF_TP_MULT = { "5min":0.5, "15min":0.75, "30min":1.0, "1h":1.5, "4h":2.5, "1day":4.0 };

function calcForexPosition(item, livePrice, tf="1h") {
  const price   = livePrice ?? FB[item.symbol] ?? 1;
  const tpMult  = TF_TP_MULT[tf] ?? 1.5;
  // SL = fixed tight risk, TP = scaled by TF multiplier (makin panjang TF makin lebar TP)
  const sl      = price * (1 + item.slPct / 100);
  const tp      = price * (1 + (item.tpPct * tpMult) / 100);
  const risk    = Math.abs(price - sl);
  const reward  = Math.abs(tp - price);
  // Enforce minimum RR 1:2 — jika kurang, TP dinaikkan sampai RR=2
  const minReward = risk * 2;
  const finalTp   = reward >= minReward ? tp : (item.signal === "SELL" ? price - minReward : price + minReward);
  const finalRR   = risk > 0 ? (Math.abs(finalTp - price) / risk) : 2;
  const actualTpPct = ((finalTp - price) / price * 100);
  const actualSlPct = ((sl - price) / price * 100);
  return {
    entry: price,
    tp: finalTp,
    sl,
    rr: finalRR.toFixed(2),
    tpPct: actualTpPct.toFixed(2),
    slPct: actualSlPct.toFixed(2),
  };
}

function PositionPanel({ item, livePrice, tf, isForex }) {
  let pos;
  if (isForex) {
    pos = calcForexPosition(item, livePrice, tf);
  } else {
    // Saham: SL tight 1.5%, TP scaled by TF for min RR 1:2
    const tpMult  = TF_TP_MULT[tf] ?? 1.5;
    const slAbs   = livePrice * 0.015;                        // SL fixed 1.5%
    const tpBase  = livePrice * 0.030 * tpMult;              // TP base 3% × TF
    const reward  = Math.max(tpBase, slAbs * 2);             // enforce min RR 1:2
    const tp      = livePrice + reward;
    const sl      = livePrice - slAbs;
    const rr      = (reward / slAbs).toFixed(2);
    const tpPct   = (reward / livePrice * 100).toFixed(2);
    const slPct   = (-1.5).toFixed(2);
    pos = { entry: livePrice, tp, sl, rr, tpPct, slPct };
  }
  return (
    <div style={{background:"#1e293b",borderRadius:10,padding:"12px",marginBottom:12,border:"1px solid #334155"}}>
      <div style={{fontSize:11,fontWeight:700,color:"white",marginBottom:10}}>
        📍 Panel Posisi · {TF_LABEL[tf]||tf}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px"}}>
          <div style={{fontSize:9,color:"#64748b",marginBottom:3,letterSpacing:0.8}}>ENTRY</div>
          <div style={{fontSize:13,fontWeight:700,color:"#60a5fa",fontFamily:"'DM Mono',monospace"}}>
            {fmt(pos.entry, item.dec??0)}
          </div>
          <div style={{fontSize:9,color:"#64748b",marginTop:2}}>Harga Pasar</div>
        </div>
        <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px"}}>
          <div style={{fontSize:9,color:"#64748b",marginBottom:3,letterSpacing:0.8}}>RISK/REWARD</div>
          <div style={{fontSize:13,fontWeight:700,color:parseFloat(pos.rr)>=2?"#10b981":"#f59e0b",fontFamily:"'DM Mono',monospace"}}>
            1 : {pos.rr}
          </div>
          <div style={{fontSize:9,color:"#64748b",marginTop:2}}>
            {parseFloat(pos.rr)>=2?"✅ R:R Bagus":"⚠️ R:R Rendah"}
          </div>
        </div>
        <div style={{background:"rgba(16,185,129,0.08)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(16,185,129,0.2)"}}>
          <div style={{fontSize:9,color:"#10b981",marginBottom:3,letterSpacing:0.8}}>TAKE PROFIT</div>
          <div style={{fontSize:13,fontWeight:700,color:"#10b981",fontFamily:"'DM Mono',monospace"}}>
            {fmt(pos.tp, item.dec??0)}
          </div>
          <div style={{fontSize:9,color:"#6ee7b7",marginTop:2}}>+{Math.abs(pos.tpPct)}% dari entry</div>
        </div>
        <div style={{background:"rgba(239,68,68,0.08)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(239,68,68,0.2)"}}>
          <div style={{fontSize:9,color:"#ef4444",marginBottom:3,letterSpacing:0.8}}>STOP LOSS</div>
          <div style={{fontSize:13,fontWeight:700,color:"#ef4444",fontFamily:"'DM Mono',monospace"}}>
            {fmt(pos.sl, item.dec??0)}
          </div>
          <div style={{fontSize:9,color:"#fca5a5",marginTop:2}}>{pos.slPct}% dari entry</div>
        </div>
      </div>
    </div>
  );
}

// ─── FOREX DETAIL MODAL ───────────────────────────────────────────────────────
function ForexDetail({item, onClose}) {
  const [tf, setTf] = useState("1h");
  const {price, chg, apiOk, priceSrc} = usePrice(item.symbol, FB[item.symbol]??1);
  const {candles, loading, simMode} = useCandles(item.symbol, tf, price);
  const rsi = candles ? calcRSI(candles.map(c=>c.close)) : null;
  const smc  = calcSMC(candles);
  const sr   = calcSR(candles);
  const up   = chg>=0;
  const chartData = candles ? candles.slice(-40).map((c)=>({...c, color: c.close>=c.open?"#10b981":"#ef4444"})) : [];
  const rsiColor = rsi===null?"#6b7280":rsi>70?"#ef4444":rsi<30?"#10b981":"#f59e0b";
  const rsiLabel = rsi===null?"–":rsi>70?"Overbought":rsi<30?"Oversold":"Netral";

  // ★ TP & SL dihitung dari harga live, disesuaikan timeframe
  const dynPos = calcForexPosition(item, price, tf);

  const srcLabel = apiOk
    ? (priceSrc==="twelvedata" ? "● Twelve Data Live"
      : priceSrc==="goldprice.org" ? "● GoldPrice Live"
      : priceSrc==="coingecko" ? "● CoinGecko Live"
      : `● Live (${priceSrc})`)
    : "○ Memuat harga...";

  return(
    <div style={{position:"fixed",inset:0,background:"#0f172a",zIndex:100,overflow:"auto",paddingBottom:20}}>
      <div style={{background:"#1e293b",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10,borderBottom:"1px solid #334155"}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:"white",fontFamily:"'DM Mono',monospace"}}>{item.pair}</div>
          <div style={{fontSize:12,color:apiOk?"#10b981":"#64748b"}}>{srcLabel}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:16,fontWeight:700,color:up?"#10b981":"#ef4444",fontFamily:"'DM Mono',monospace"}}>{fmt(price, item.dec)}</div>
            <div style={{fontSize:11,color:up?"#10b981":"#ef4444"}}>{up?"+":""}{chg.toFixed(4)}%</div>
          </div>
          <button onClick={onClose} style={{background:"#334155",border:"none",color:"white",borderRadius:8,padding:"8px 12px",fontSize:13,cursor:"pointer",fontWeight:600}}>✕</button>
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {/* Signal + TP/SL dinamis */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px",border:`1px solid ${sigBdr(item.signal)}`}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>SINYAL</div>
            <Badge signal={item.signal}/>
          </div>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px"}}>
            <div style={{fontSize:9,color:"#10b981",marginBottom:3}}>TP (Live)</div>
            <div style={{fontSize:12,fontWeight:700,color:"#10b981",fontFamily:"'DM Mono',monospace"}}>{fmt(dynPos.tp, item.dec)}</div>
            <div style={{fontSize:9,color:"#6ee7b7"}}>+{Math.abs(item.tpPct)}%</div>
          </div>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px"}}>
            <div style={{fontSize:9,color:"#ef4444",marginBottom:3}}>SL (Live)</div>
            <div style={{fontSize:12,fontWeight:700,color:"#ef4444",fontFamily:"'DM Mono',monospace"}}>{fmt(dynPos.sl, item.dec)}</div>
            <div style={{fontSize:9,color:"#fca5a5"}}>{item.slPct}%</div>
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

        {/* Chart */}
        <div style={{background:"#1e293b",borderRadius:12,padding:"12px 4px 8px",marginBottom:12,border:"1px solid #334155"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingLeft:10,paddingRight:10,marginBottom:6}}>
            <div style={{fontSize:11,color:"#64748b",fontWeight:600}}>Chart {item.pair} · {TF_LABEL[tf]}</div>
            <div>
              {loading && <span style={{fontSize:10,color:"#f59e0b"}}>⏳ Memuat...</span>}
              {!loading && simMode && <span style={{fontSize:10,color:"#f59e0b"}}>⚡ Simulasi Realistis</span>}
              {!loading && !simMode && <span style={{fontSize:10,color:"#10b981"}}>● Live Data</span>}
            </div>
          </div>
          {loading && <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b",fontSize:12}}>Memuat data...</div>}
          {!loading && candles && candles.length>0 && (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{top:4,right:8,left:0,bottom:0}}>
                <XAxis dataKey="time" tick={{fontSize:8,fill:"#475569"}}
                  tickFormatter={v=>tf==="1day"?v?.slice(5,10):v?.slice(11,16)||""}
                  interval={Math.floor(chartData.length/5)}/>
                <YAxis domain={["auto","auto"]} tick={{fontSize:8,fill:"#475569"}} width={52} tickFormatter={v=>fmt(v,item.dec)}/>
                <Tooltip content={<CandleTooltip/>}/>
                {sr.resistance && <ReferenceLine y={sr.resistance} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} label={{value:"R",fill:"#ef4444",fontSize:8,position:"insideTopRight"}}/>}
                {sr.support    && <ReferenceLine y={sr.support}    stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{value:"S",fill:"#10b981",fontSize:8,position:"insideBottomRight"}}/>}
                {/* TP & SL lines dinamis sesuai timeframe */}
                <ReferenceLine y={dynPos.tp} stroke="#10b981" strokeDasharray="5 3" strokeWidth={1.5} label={{value:`TP`,fill:"#10b981",fontSize:8,position:"insideTopRight"}}/>
                <ReferenceLine y={dynPos.sl} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5} label={{value:`SL`,fill:"#ef4444",fontSize:8,position:"insideBottomRight"}}/>
                <Line type="monotone" dataKey="close" stroke="#60a5fa" strokeWidth={2} dot={false} isAnimationActive={false}/>
              </LineChart>
            </ResponsiveContainer>
          )}
          {sr.resistance&&sr.support&&(
            <div style={{display:"flex",gap:16,paddingLeft:10,marginTop:4}}>
              <span style={{fontSize:9,color:"#ef4444"}}>── R: {fmt(sr.resistance,item.dec)}</span>
              <span style={{fontSize:9,color:"#10b981"}}>── S: {fmt(sr.support,item.dec)}</span>
            </div>
          )}
        </div>

        {/* RSI & SMC */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px",border:"1px solid #334155"}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:4,fontWeight:600}}>RSI (14)</div>
            <div style={{fontSize:18,fontWeight:800,color:rsiColor,fontFamily:"'DM Mono',monospace"}}>{loading?"…":rsi===null?"–":rsi.toFixed(1)}</div>
            <div style={{fontSize:10,color:rsiColor,marginTop:2}}>{loading?"Memuat…":rsiLabel}</div>
            {!loading && rsi!==null&&<div style={{marginTop:6}}><StrengthBar value={rsi} color={rsiColor}/></div>}
            {simMode&&!loading&&<div style={{fontSize:8,color:"#475569",marginTop:4}}>* Berbasis simulasi</div>}
          </div>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px",border:"1px solid #334155"}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:4,fontWeight:600}}>SMC STRUKTUR</div>
            {loading ? <div style={{fontSize:11,color:"#64748b"}}>Memuat…</div> : (
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

        {/* Panel Posisi */}
        {!loading && <PositionPanel item={item} livePrice={price} tf={tf} isForex={true}/>}

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

  // TP/SL shown dynamically
  const tp = price * (1 + item.tpPct/100);
  const sl = price * (1 + item.slPct/100);

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
        <div style={{marginTop:4,fontSize:10,color:"#64748b"}}>
          TP <span style={{color:"#10b981"}}>{fmt(tp,item.dec)}</span> · SL <span style={{color:"#ef4444"}}>{fmt(sl,item.dec)}</span> · <span style={{color:"#60a5fa"}}>Tap detail →</span>
        </div>
      </div>
      <Spark data={sparkData.current} color={up?"#10b981":"#ef4444"}/>
    </div>
  );
}

// ─── SAHAM DETAIL MODAL ───────────────────────────────────────────────────────
function SahamDetail({item, onClose}) {
  const [tf, setTf] = useState("1h");
  const {price, chg, apiOk, priceSrc} = usePrice(item.kode, FB[item.kode]??1000);
  const {candles, loading, simMode} = useCandles(item.kode, tf, price);
  const up = chg>=0;
  const rsi = candles ? calcRSI(candles.map(c=>c.close)) : null;
  const smc  = calcSMC(candles);
  const sr   = calcSR(candles);
  const rsiColor = rsi===null?"#6b7280":rsi>70?"#ef4444":rsi<30?"#10b981":"#f59e0b";
  const rsiLabel = rsi===null?"–":rsi>70?"Overbought":rsi<30?"Oversold":"Netral";
  const chartData = candles ? candles.slice(-40).map((c)=>({...c, color: c.close>=c.open?"#10b981":"#ef4444"})) : [];
  const srcLabel = apiOk ? `● Live (${priceSrc})` : "○ Memuat harga...";

  const tpMult  = TF_TP_MULT[tf] ?? 1.5;
  const slAbs   = price * 0.015;                              // SL tight 1.5%
  const tpBase  = price * 0.030 * tpMult;                    // TP base 3% × TF mult
  const reward  = Math.max(tpBase, slAbs * 2);               // enforce min RR 1:2
  const tpPrice = price + reward;
  const slPrice = price - slAbs;
  const tpPct   = (reward / price * 100).toFixed(1);
  const slPct   = (1.5).toFixed(1);

  return(
    <div style={{position:"fixed",inset:0,background:"#0f172a",zIndex:100,overflow:"auto",paddingBottom:20}}>
      <div style={{background:"#1e293b",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,borderBottom:"1px solid #334155"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:18,fontWeight:800,color:"white",fontFamily:"'DM Mono',monospace"}}>{item.kode}</div>
            {item.syariah && <SyariahBadge/>}
          </div>
          <div style={{fontSize:11,color:apiOk?"#10b981":"#64748b"}}>{srcLabel}</div>
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
        {/* Signal + TP/SL */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px",border:`1px solid ${sigBdr(item.signal)}`}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>SINYAL</div>
            <Badge signal={item.signal}/>
          </div>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px"}}>
            <div style={{fontSize:9,color:"#10b981",marginBottom:3}}>TP (+{tpPct}%)</div>
            <div style={{fontSize:12,fontWeight:700,color:"#10b981",fontFamily:"'DM Mono',monospace"}}>Rp {fmt(tpPrice)}</div>
          </div>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px"}}>
            <div style={{fontSize:9,color:"#ef4444",marginBottom:3}}>SL (-{slPct}%)</div>
            <div style={{fontSize:12,fontWeight:700,color:"#ef4444",fontFamily:"'DM Mono',monospace"}}>Rp {fmt(slPrice)}</div>
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

        {/* Chart */}
        <div style={{background:"#1e293b",borderRadius:12,padding:"12px 4px 8px",marginBottom:12,border:"1px solid #334155"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingLeft:10,paddingRight:10,marginBottom:6}}>
            <div style={{fontSize:11,color:"#64748b",fontWeight:600}}>Chart {item.kode} · {TF_LABEL[tf]}</div>
            <div>
              {loading && <span style={{fontSize:10,color:"#f59e0b"}}>⏳ Memuat...</span>}
              {!loading && simMode && <span style={{fontSize:10,color:"#f59e0b"}}>⚡ Simulasi</span>}
              {!loading && !simMode && <span style={{fontSize:10,color:"#10b981"}}>● Live Data</span>}
            </div>
          </div>
          {loading && <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b",fontSize:12}}>Memuat data...</div>}
          {!loading && candles && candles.length>0 && (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{top:4,right:8,left:0,bottom:0}}>
                <XAxis dataKey="time" tick={{fontSize:8,fill:"#475569"}}
                  tickFormatter={v=>tf==="1day"?v?.slice(5,10):v?.slice(11,16)||""}
                  interval={Math.floor(chartData.length/5)}/>
                <YAxis domain={["auto","auto"]} tick={{fontSize:8,fill:"#475569"}} width={52} tickFormatter={v=>`${(v/1000).toFixed(0)}rb`}/>
                <Tooltip content={<CandleTooltip/>}/>
                {sr.resistance && <ReferenceLine y={sr.resistance} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} label={{value:"R",fill:"#ef4444",fontSize:8,position:"insideTopRight"}}/>}
                {sr.support    && <ReferenceLine y={sr.support}    stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{value:"S",fill:"#10b981",fontSize:8,position:"insideBottomRight"}}/>}
                {/* TP & SL sesuai timeframe */}
                <ReferenceLine y={tpPrice} stroke="#10b981" strokeDasharray="5 3" strokeWidth={1.5} label={{value:"TP",fill:"#10b981",fontSize:8,position:"insideTopRight"}}/>
                <ReferenceLine y={slPrice} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5} label={{value:"SL",fill:"#ef4444",fontSize:8,position:"insideBottomRight"}}/>
                <Line type="monotone" dataKey="close" stroke="#60a5fa" strokeWidth={2} dot={false} isAnimationActive={false}/>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* RSI & SMC */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px",border:"1px solid #334155"}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:4,fontWeight:600}}>RSI (14)</div>
            <div style={{fontSize:18,fontWeight:800,color:rsiColor,fontFamily:"'DM Mono',monospace"}}>{loading?"…":rsi===null?"–":rsi.toFixed(1)}</div>
            <div style={{fontSize:10,color:rsiColor,marginTop:2}}>{loading?"Memuat…":rsiLabel}</div>
            {!loading && rsi!==null&&<div style={{marginTop:6}}><StrengthBar value={rsi} color={rsiColor}/></div>}
          </div>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px",border:"1px solid #334155"}}>
            <div style={{fontSize:9,color:"#64748b",marginBottom:4,fontWeight:600}}>SMC STRUKTUR</div>
            {loading ? <div style={{fontSize:11,color:"#64748b"}}>Memuat…</div> : (
              <>
                <div style={{fontSize:11,fontWeight:700,color:smc.trend==="Bullish"?"#10b981":"#ef4444",marginBottom:3}}>
                  {smc.trend==="Bullish"?"↑":"↓"} {smc.trend==="–"?"–":smc.trend}
                </div>
                <div style={{fontSize:10,color:"#94a3b8",marginBottom:2}}>{smc.bos}</div>
                <div style={{fontSize:10,color:"#94a3b8"}}>{smc.choch}</div>
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
              <span style={{fontSize:12,fontWeight:700,color:"#ef4444",fontFamily:"'DM Mono',monospace"}}>Rp {fmt(sr.resistance)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:"#64748b"}}>Support</span>
              <span style={{fontSize:12,fontWeight:700,color:"#10b981",fontFamily:"'DM Mono',monospace"}}>Rp {fmt(sr.support)}</span>
            </div>
          </div>
        )}

        {/* Indikator */}
        <div style={{background:"#1e293b",borderRadius:10,padding:"12px",marginBottom:12,border:"1px solid #334155"}}>
          <div style={{fontSize:11,fontWeight:700,color:"white",marginBottom:8}}>📊 Indikator Teknikal</div>
          {item.indikator.split(",").map((ind,i)=>(
            <div key={i} style={{fontSize:12,color:"#94a3b8",padding:"4px 0",borderBottom:i<item.indikator.split(",").length-1?"1px solid #1e3a5f":"none"}}>• {ind.trim()}</div>
          ))}
        </div>

        {/* Kekuatan sinyal */}
        <div style={{background:"#1e293b",borderRadius:10,padding:"12px",border:"1px solid #334155"}}>
          <div style={{fontSize:11,fontWeight:700,color:"white",marginBottom:8}}>💪 Kekuatan Sinyal</div>
          <StrengthBar value={item.kekuatan} color={sigColor(item.signal)}/>
          <div style={{fontSize:10,color:"#64748b",marginTop:6}}>
            ⚠️ Edukatif saja. Bukan rekomendasi investasi resmi.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SAHAM ROW ────────────────────────────────────────────────────────────────
function SahamRow({item, onClick}) {
  const {price, chg, loading} = usePrice(item.kode, FB[item.kode]??1000);
  const up = chg>=0;
  const sparkData = useRef(Array.from({length:20},()=>({v:(FB[item.kode]??1000)*(1+(Math.random()-0.5)*0.005)})));

  useEffect(()=>{
    const id=setInterval(()=>{
      const last=sparkData.current[sparkData.current.length-1].v;
      const next=last*(1+(Math.random()-0.48)*0.0008);
      sparkData.current=[...sparkData.current.slice(-19),{v:next}];
    },3000);
    return ()=>clearInterval(id);
  },[]);

  return(
    <div onClick={onClick} style={{padding:"10px 0",borderBottom:"1px solid #1f2937",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2,flexWrap:"wrap"}}>
          <span style={{fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"white"}}>{item.kode}</span>
          <Badge signal={item.signal}/>
          {item.syariah && <SyariahBadge/>}
        </div>
        <div style={{fontSize:10,color:"#64748b",marginBottom:3}}>{item.nama}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,fontWeight:600,fontFamily:"'DM Mono',monospace",color:"white"}}>Rp {fmt(price)}</span>
          <span style={{fontSize:11,color:up?"#10b981":"#ef4444",fontWeight:600}}>{up?"+":""}{chg.toFixed(2)}%</span>
          {loading&&<span style={{fontSize:9,color:"#64748b"}}>⏳</span>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
        <Spark data={sparkData.current} color={up?"#10b981":"#ef4444"}/>
        <span style={{fontSize:9,color:"#64748b"}}>{item.kategori}</span>
      </div>
    </div>
  );
}

// ─── NEWS TAB ─────────────────────────────────────────────────────────────────
function NewsTab() {
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const [expand,  setExpand]  = useState(null);

  useEffect(()=>{
    setLoading(true);
    fetchAVNews().then(async data=>{
      if(data&&data.length>0){
        const translated=await translateNews(data.slice(0,12));
        setNews(translated);
      } else {
        setNews([
          {id:1,judul:"Bank Indonesia Pertahankan Suku Bunga di 6.25%",sumber:"BI",waktu:"08:00",url:"#",sentimen:0.2,summary:"Rapat Dewan Gubernur memutuskan mempertahankan BI Rate pada level 6,25% dengan mempertimbangkan stabilitas nilai tukar rupiah."},
          {id:2,judul:"Harga Emas Dunia Sentuh Rekor Baru $3.300/Troy Ounce",sumber:"Reuters",waktu:"10:30",url:"#",sentimen:0.5,summary:"Safe haven demand mendorong emas ke level tertinggi sepanjang masa di tengah ketidakpastian geopolitik global."},
          {id:3,judul:"IHSG Ditutup Melemah 0.8% Tekanan Jual Asing",sumber:"IDX",waktu:"16:00",url:"#",sentimen:-0.3,summary:"Indeks Harga Saham Gabungan turun di akhir sesi akibat net sell asing Rp 1.2 Triliun terutama di sektor perbankan."},
        ]);
      }
      setLoading(false);
    });
  },[]);

  const sentColor = s => s > 0.15 ? "#10b981" : s < -0.15 ? "#ef4444" : "#f59e0b";
  const sentLabel = s => s > 0.15 ? "📈 Positif" : s < -0.15 ? "📉 Negatif" : "➡️ Netral";

  const filtered = filter==="all"?news:filter==="pos"?news.filter(n=>n.sentimen>0.15):news.filter(n=>n.sentimen<=-0.15);

  return(
    <div>
      <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:2}}>Berita Pasar</div>
      <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>Berita terkini & analisis sentimen</div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[{k:"all",l:"Semua"},{k:"pos",l:"📈 Positif"},{k:"neg",l:"📉 Negatif"}].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)} style={{
            padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,
            background:filter===f.k?"#3b82f6":"#1e293b",color:filter===f.k?"white":"#64748b",
          }}>{f.l}</button>
        ))}
      </div>
      {loading&&<div style={{textAlign:"center",padding:"40px 0",color:"#64748b",fontSize:13}}>Memuat berita terkini...</div>}
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
            {expand===i&&n.summary&&<p style={{margin:"0 0 8px",fontSize:11,color:"#94a3b8",lineHeight:1.7}}>{n.summary}</p>}
            <div style={{display:"flex",gap:8}}>
              {n.summary&&(
                <button onClick={()=>setExpand(expand===i?null:i)} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",fontSize:10,cursor:"pointer",fontWeight:600}}>
                  {expand===i?"Tutup ▲":"Ringkasan ▼"}
                </button>
              )}
              {n.url&&n.url!=="–"&&n.url!=="#"&&(
                <a href={n.url} target="_blank" rel="noopener noreferrer" style={{background:"#1d4ed8",color:"white",borderRadius:6,padding:"4px 10px",fontSize:10,textDecoration:"none",fontWeight:600}}>Baca →</a>
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
          ⚠️ Net harian <strong>negatif ({(net*100).toFixed(3)}%)</strong>. Modal akan terus berkurang.
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
                <button key={u} onClick={()=>setUnit(u)} style={{padding:"0 10px",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",background:unit===u?"#3b82f6":"#1e293b",color:unit===u?"white":"#64748b"}}>{u}</button>
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

// ─── SAHAM TAB UTAMA ──────────────────────────────────────────────────────────
function SahamTab({ onSahamClick }) {
  const [katFilter,  setKatFilter]  = useState("Semua");
  const [viewFilter, setViewFilter] = useState("Semua");
  const [search,     setSearch]     = useState("");

  // Gunakan uniqueSaham agar tidak ada duplikat
  const allSaham = uniqueSaham;

  // Get live chg dari pChgStore untuk sorting (pakai nilai simulasi)
  const getChg = (kode) => pChgStore[kode] ?? (Math.random()-0.5)*5;

  const buySaham  = allSaham.filter(s=>s.signal==="BUY").length;
  const holdSaham = allSaham.filter(s=>s.signal==="HOLD").length;
  const sellSaham = allSaham.filter(s=>s.signal==="SELL").length;
  const syariahCount = allSaham.filter(s=>s.syariah).length;

  let filtered = allSaham;

  // Filter kategori
  if (katFilter === "Syariah") filtered = filtered.filter(s => s.syariah);
  else if (katFilter !== "Semua") filtered = filtered.filter(s => s.kategori === katFilter);

  // Search
  if (search.trim()) {
    const q = search.trim().toUpperCase();
    filtered = filtered.filter(s => s.kode.includes(q) || s.nama.toUpperCase().includes(q));
  }

  // View filter (sorting)
  if (viewFilter === "Top Gainer") {
    filtered = [...filtered].sort((a,b) => getChg(b.kode) - getChg(a.kode)).slice(0, 20);
  } else if (viewFilter === "Top Loser") {
    filtered = [...filtered].sort((a,b) => getChg(a.kode) - getChg(b.kode)).slice(0, 20);
  } else if (viewFilter === "Paling Aktif") {
    filtered = [...filtered].sort((a,b) => b.kekuatan - a.kekuatan).slice(0, 20);
  }

  return (
    <div>
      {/* Summary */}
      <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:2}}>Saham IDX</div>
      <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>
        {allSaham.length} saham · {syariahCount} Syariah · Tap untuk detail
      </div>

      {/* Stats row */}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {[{l:"BUY",c:buySaham,color:"#10b981"},{l:"HOLD",c:holdSaham,color:"#f59e0b"},{l:"SELL",c:sellSaham,color:"#ef4444"},{l:"☪ SYARIAH",c:syariahCount,color:"#34d399"}].map(s=>(
          <div key={s.l} style={{flex:1,background:"#1e293b",border:`1px solid #334155`,borderRadius:8,padding:"7px 0",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:s.color,fontFamily:"'DM Mono',monospace"}}>{s.c}</div>
            <div style={{fontSize:8,color:s.color,fontWeight:700}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* View filter (Semua / Top Gainer / Top Loser / Paling Aktif) */}
      <div style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto"}}>
        {SAHAM_VIEWS.map(v=>(
          <button key={v} onClick={()=>setViewFilter(v)} style={{
            flexShrink:0,padding:"5px 11px",borderRadius:7,border:"none",cursor:"pointer",
            fontSize:11,fontWeight:700,
            background:viewFilter===v?"#7c3aed":"#1e293b",
            color:viewFilter===v?"white":"#64748b",
          }}>{v}</button>
        ))}
      </div>

      {/* Kategori filter */}
      <div style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto"}}>
        {KATEGORI_SAHAM.map(k=>(
          <button key={k} onClick={()=>setKatFilter(k)} style={{
            flexShrink:0,padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",
            fontSize:10,fontWeight:700,
            background:katFilter===k?"#3b82f6":"#1e293b",
            color:katFilter===k?"white":"#64748b",
          }}>{k}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{marginBottom:12}}>
        <input
          type="text"
          placeholder="🔍 Cari kode atau nama saham..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #334155",
            fontSize:12,background:"#1e293b",color:"white",boxSizing:"border-box",outline:"none"}}
        />
      </div>

      {/* View label */}
      {viewFilter !== "Semua" && (
        <div style={{marginBottom:8,fontSize:11,color:"#7c3aed",fontWeight:600}}>
          {viewFilter === "Top Gainer" && "📈 20 Saham Naik Terbesar"}
          {viewFilter === "Top Loser" && "📉 20 Saham Turun Terbesar"}
          {viewFilter === "Paling Aktif" && "⚡ 20 Saham Sinyal Terkuat"}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"30px 0",color:"#64748b",fontSize:13}}>Tidak ada saham ditemukan</div>
      ) : (
        filtered.map(s=><SahamRow key={s.kode} item={s} onClick={()=>onSahamClick(s)}/>)
      )}

      <div style={{marginTop:10,background:"#172033",borderRadius:8,padding:"10px 12px",border:"1px solid #1e3a5f",fontSize:11,color:"#f59e0b",lineHeight:1.6}}>
        ⚠️ Harga simulasi. Data real IDX membutuhkan API berbayar. Hanya untuk edukasi.
      </div>
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

  const tgUser   = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const userName = tgUser?.first_name||"Trader";

  useEffect(()=>{
    if(window.Telegram?.WebApp){ window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }
  },[]);

  useEffect(()=>{
    const id=setInterval(()=>setClock(new Date()),1000);
    return ()=>clearInterval(id);
  },[]);

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
                <div style={{fontSize:11,color:"#64748b"}}>TP & SL dihitung dari harga live</div>
              </div>
            </div>
            {FOREX_LIST.map(f=><ForexRow key={f.symbol} item={f} onClick={()=>setForexDetail(f)}/>)}
            <div style={{marginTop:12,background:"#172033",borderRadius:8,padding:"10px 12px",border:"1px solid #1e3a5f",fontSize:11,color:"#60a5fa",lineHeight:1.6}}>
              ℹ️ TP & SL dihitung otomatis dari harga pasar live. Tap pair untuk chart & panel posisi lengkap.
            </div>
          </div>
        )}

        {/* SAHAM TAB */}
        {tab==="saham"&&(
          <SahamTab onSahamClick={(s)=>setSahamDetail(s)}/>
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
