/* Salamah demo. Data contoh, tanpa server: semua berjalan di browser. */
"use strict";
const { animate } = window.Motion || {};
const reduceMq = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const icon = (id) => `<svg class="i" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");
class Abort extends Error {}
let aborting = false, current = null;
const pending = new Set();
// Janji yang bisa dibatalkan saat demo diulang dari awal
function waitable(fn) {
  return new Promise((res, rej) => { pending.add(rej); fn((v) => { pending.delete(rej); res(v); }); });
}
const sleep = (ms) => new Promise((r, j) => setTimeout(() => (aborting ? j(new Abort()) : r()), reduceMq.matches ? Math.min(ms, 150) : ms));
const stagger = (s) => (window.Motion?.stagger ? Motion.stagger(s) : 0);
const num = (v) => String(v).replace(".", ",");
const DAY = 86400000;

function fx(el, kf, opts) {
  if (!animate || reduceMq.matches || !el) return Promise.resolve();
  return animate(el, kf, opts).finished.catch(() => {});
}
const EASE = [0.22, 1, 0.36, 1];

/* ---------------- Data awal ---------------- */
const LOG_TYPES = {
  hands: ["Hygiene check: handwash, hair cover, gloves", "فحص النظافة الشخصية", "5.10"],
  freezer: ["Freezer 1 opening check", "فحص الفريزر 1 عند الافتتاح", "5.5.9"],
  fridge: ["Fridge check (0–4°C)", "فحص الثلاجة", "5.5.3"],
  surface: ["Work surfaces cleaned and sanitized", "تنظيف وتعقيم أسطح العمل", "5.7"],
  sick: ["Staff illness check", "فحص صحة العاملين", "5.5.18"],
  receive: ["Receiving: chilled chicken, probe", "استلام: دجاج مبرد", "5.5.1"],
  invoice: ["Supplier record: Supplier B (sample), lot 2611-26", "سجل المورد ورقم التشغيلة", "5.5.19"],
  cook: ["Cooking core temperature, chicken kabsa", "درجة حرارة الطهي الداخلية", "5.5.6"],
  incident: ["Incident reported by voice: staff vomiting", "بلاغ صوتي عن حادثة", "5.5.18"],
  alarm: ["Freezer 2 alarm, door not closed. Corrective action", "إنذار الفريزر 2 وإجراء تصحيحي", "5.5.3, 5.5.13"],
  power: ["Power outage, freezer 2 sensor offline", "انقطاع الكهرباء", "5.5.3"],
  closing: ["Closing checklist", "قائمة فحص الإغلاق", "5.7"],
  pest: ["Pest control visit report (contractor)", "تقرير زيارة مكافحة الآفات", "5.7.1"],
  hot: ["Hot holding, bain-marie 1", "حفظ الطعام الساخن", "5.5.12"],
  corr: ["Correction", "تصحيح", ""],
};
const CERTS0 = [
  ["Abdul Karim", "Al-Aziziyah", "2026-12-10"], ["Joel Santos", "Al-Rawdah", "2026-12-25"],
  ["Rina Lestari", "Al-Aziziyah", "2027-01-06"], ["Md. Hossain", "Al-Nakheel", "2027-01-17"],
  ["Ravi Kumar", "Al-Rawdah", "2027-03-02"], ["Imran Ali", "Al-Aziziyah", "2027-06-26"], ["Ahmad Saleh", "Al-Nakheel", "2027-09-14"],
];
const BRANCHES = [["Al-Aziziyah, Makkah", 94], ["Al-Rawdah, Jeddah", 97], ["Al-Nakheel, Madinah", 91]];

function freshState() {
  let id = 0;
  const row = (date, time, type, reading, ok, by, extra = {}) => ({ id: ++id, date, time, type, reading, ok, by, ...extra });
  return {
    lang: "id", running: false, auto: false, done: new Set(), scene: -1, seq: 100,
    min: 418, // menit sejak Kamis 26 Nov 00:00; satu-satunya sumber jam simulasi
    stats: { chkDone: 62, chkTotal: 66, out: 2, notes: 140 },
    certs: CERTS0.map(([name, branch, exp], i) => ({ id: i + 1, name, branch, exp })),
    log: [
      row("25 Nov", "07:01", "freezer", "-19,6°C", true, "Rina L."),
      row("25 Nov", "09:28", "receive", "3,4°C", true, "Md. Hossain"),
      row("25 Nov", "09:30", "invoice", "invoice photo", true, "Md. Hossain"),
      row("25 Nov", "13:05", "cook", "78°C", true, "Joel S."),
      row("25 Nov", "13:40", "hot", "64°C", true, "Joel S."),
      row("24 Nov", "23:58", "closing", "5/5", true, "Abdul K.", { late: 43 }),
      row("20 Nov", "10:15", "pest", "report photo", true, "Owner"),
    ].reverse(),
    feed: [["Kemarin", "Daftar periksa tutup Al-Aziziyah terisi 5/5"], ["Kemarin", "Nota Supplier B tercatat"]],
    sensor: Array.from({ length: 72 }, (_, i) => -19.5 + Math.sin(i / 5) * 0.25 + (i % 7) * 0.03),
    sim: null,
  };
}
let S = freshState();

/* ---------------- Gambar foto contoh (SVG) ---------------- */
const shots = {
  thermo(value, label, bg) {
    return `<svg viewBox="0 0 220 140" role="img" aria-label="Foto termometer ${esc(label)} ${num(value)}°C">
      <rect width="220" height="140" fill="${bg}"/><rect x="0" y="100" width="220" height="40" fill="rgba(0,0,0,.12)"/>
      <rect x="34" y="18" width="136" height="98" rx="16" fill="#26332E"/><rect x="44" y="30" width="116" height="52" rx="6" fill="#CFE8C9"/>
      <text x="102" y="56" text-anchor="middle" dominant-baseline="middle" font-family="ui-monospace,Menlo,monospace" font-size="22" font-weight="700" fill="#14241C" textLength="${String(num(value.toFixed(1))).length > 5 ? 100 : 86}" lengthAdjust="spacingAndGlyphs">${num(value.toFixed(1))}°C</text>
      <text x="102" y="102" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#B9C8C2">PROBE · ${esc(label)}</text>
      <line x1="166" y1="70" x2="214" y2="118" stroke="#C7CED2" stroke-width="5" stroke-linecap="round"/></svg>`;
  },
  hands() {
    return `<svg viewBox="0 0 220 140" role="img" aria-label="Foto staf memakai sarung tangan dan penutup rambut">
      <rect width="220" height="140" fill="#CFE3DA"/><circle cx="110" cy="52" r="26" fill="#E9C4A4"/>
      <path d="M80 44a30 24 0 0 1 60 0z" fill="#fff" stroke="#9DB3AA"/><rect x="72" y="80" width="76" height="60" rx="18" fill="#fff"/>
      <rect x="40" y="88" width="34" height="44" rx="14" fill="#5B8DEF"/><rect x="146" y="88" width="34" height="44" rx="14" fill="#5B8DEF"/>
      <text x="110" y="128" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#3F4D47">siap kerja</text></svg>`;
  },
  invoice() {
    return `<svg viewBox="0 0 220 140" role="img" aria-label="Foto nota pemasok">
      <rect width="220" height="140" fill="#B8A98F"/><g transform="rotate(-4 110 70)"><rect x="40" y="10" width="140" height="124" fill="#fff"/>
      <text x="52" y="30" font-family="sans-serif" font-size="12" font-weight="700" fill="#222">INVOICE</text>
      <text x="52" y="46" font-family="sans-serif" font-size="9" fill="#444">Supplier B (sample)</text>
      <text x="52" y="60" font-family="sans-serif" font-size="9" fill="#444">Lot 2611-26 · 26/11/2026</text>
      <text x="52" y="78" font-family="sans-serif" font-size="9" fill="#444">Chilled chicken 20 kg</text>
      <line x1="52" y1="90" x2="168" y2="90" stroke="#ccc"/><line x1="52" y1="102" x2="150" y2="102" stroke="#ccc"/><line x1="52" y1="114" x2="160" y2="114" stroke="#ccc"/></g></svg>`;
  },
  cert(c) {
    return `<svg viewBox="0 0 320 180" role="img" aria-label="Contoh sertifikat kesehatan">
      <rect width="320" height="180" rx="14" fill="#F4F7F5" stroke="#B6C7BF"/><rect width="320" height="34" rx="14" fill="#0B6E4F"/><rect y="20" width="320" height="14" fill="#0B6E4F"/>
      <text x="16" y="22" font-family="sans-serif" font-size="12" font-weight="700" fill="#fff">HEALTH CERTIFICATE · SAMPLE</text>
      <rect x="16" y="50" width="64" height="78" rx="6" fill="#D5DED9"/><circle cx="48" cy="80" r="16" fill="#B3C2BB"/>
      <text x="96" y="62" font-family="sans-serif" font-size="10" fill="#5E6E67">Name</text><text x="96" y="78" font-family="sans-serif" font-size="14" font-weight="700" fill="#13201B">${esc(c.name)}</text>
      <text x="96" y="100" font-family="sans-serif" font-size="10" fill="#5E6E67">Certificate no.</text><text x="96" y="114" font-family="ui-monospace,monospace" font-size="12" fill="#13201B">${c.no}</text>
      <text x="96" y="136" font-family="sans-serif" font-size="10" fill="#5E6E67">Expiry</text><text x="96" y="150" font-family="sans-serif" font-size="13" font-weight="700" fill="#13201B">${c.expLabel}</text>
      <rect x="250" y="112" width="52" height="52" fill="#fff" stroke="#13201B"/><path d="M256 118h12v12h-12zM284 118h12v12h-12zM256 146h12v12h-12zM274 136h6v6h-6zM286 148h10v10h-10z" fill="#13201B"/></svg>`;
  },
};

/* ---------------- Chat ---------------- */
const box = (who) => $(who === "staff" ? "#staff-msgs" : "#owner-msgs");
const t = (k) => T[S.lang][k];
const L = () => LANGS[S.lang];
const DAYS = ["Kamis", "Jumat", "Sabtu", "Minggu"];
const pad = (n) => String(n).padStart(2, "0");
const dayIdx = () => Math.floor(S.min / 1440);
const timeNow = () => `${pad(Math.floor((S.min % 1440) / 60))}:${pad(S.min % 60)}`;
const dateLabel = () => `${26 + dayIdx()} Nov`;
function showClock() { $("#clock").textContent = `${DAYS[dayIdx()]} ${timeNow()}`; }
function advance(n) { S.min += n; showClock(); }

function scrollDown(b) { b.scrollTop = b.scrollHeight; }
function day(who, label) {
  const d = document.createElement("div");
  d.className = "day"; d.textContent = label;
  box(who).append(d); scrollDown(box(who));
}
function bubble(who, html, { out = false, cls = "", dir } = {}) {
  const b = box(who);
  const el = document.createElement("div");
  el.className = `b ${out ? "out" : ""} ${cls}`;
  if (dir) el.dir = dir;
  if (who === "staff") el.lang = S.lang;
  // html boleh berupa fungsi (lang) => html, supaya pesan bisa ditampilkan ulang saat bahasa staf diganti
  const render = typeof html === "function" ? html : null;
  if (render) el._render = render;
  el.innerHTML = `<div class="c"><span class="txt">${render ? render(S.lang) : html}</span></div><time>${timeNow()}</time>`;
  b.append(el); scrollDown(b);
  fx(el, { opacity: [0, 1], transform: ["translateY(10px) scale(0.98)", "translateY(0) scale(1)"] }, { duration: 0.3, ease: EASE });
  return el;
}
async function bot(who, html, o = {}) {
  if (aborting) throw new Abort();
  if (o.typing !== false) {
    const ty = document.createElement("div");
    ty.className = "b typing"; ty.setAttribute("aria-label", "Salamah sedang mengetik");
    ty.innerHTML = "<span></span><span></span><span></span>";
    box(who).append(ty); scrollDown(box(who));
    try { await sleep(o.wait ?? 650); } finally { ty.remove(); }
  }
  const el = bubble(who, html, { ...o, dir: who === "staff" ? L().dir : undefined });
  if (o.say && who === "staff") addSayButton(el, o.say);
  if (o.cls?.includes("alarm")) fx(el, { transform: ["translateX(0)", "translateX(-6px)", "translateX(6px)", "translateX(-3px)", "translateX(0)"] }, { duration: 0.45, delay: 0.2 });
  return el;
}
const me = (html, o) => bubble("staff", html, { out: true, dir: L().dir, ...o });
const meK = (key) => me((lang) => esc(T[lang][key]));
const staffName = () => S.staffName || L().name;
// Instruksi untuk staf dalam bahasa staf, dengan tombol speaker
function ins(key, params = {}, o = {}) {
  return bot("staff", (lang) => esc(fill(T[lang][key], params)), { say: (lang) => fill(T[lang][key], params), ...o });
}
function addSayButton(el, sayFn) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "say";
  const label = () => b.setAttribute("aria-label", `Dengarkan dalam ${LANGS[el.lang].label}`);
  label(); el._sayLabel = label;
  b.innerHTML = icon("volume");
  b.onclick = () => speak(sayFn(el.lang), el.lang, null, b);
  $(".c", el).append(b);
}

// Tombol jawaban di bawah bubble. Mode otomatis menekan pilihan `auto` setelah jeda.
function ask(el, labels, auto = 0) {
  const acts = document.createElement("div");
  acts.className = "acts";
  labels.forEach((l) => {
    const b = document.createElement("button"); b.type = "button";
    if (el.parentElement?.id === "staff-msgs" && T[S.lang][l] != null) { b.dataset.k = l; b.textContent = T[S.lang][l]; } else b.textContent = l;
    acts.append(b);
  });
  el.append(acts); scrollDown(el.parentElement);
  return waitable((resolve) => {
    const btns = $$("button", acts);
    btns.forEach((b, i) => b.addEventListener("click", () => {
      btns.forEach((x) => (x.disabled = true)); b.classList.add("picked"); resolve(i);
    }, { once: true }));
    if (S.auto) autoPress(btns[auto]);
  });
}
async function autoPress(btn) {
  await sleep(900);
  if (!S.auto || btn.disabled) return;
  btn.classList.add("hint");
  await fx(btn, { transform: ["scale(1)", "scale(0.94)", "scale(1)"] }, { duration: 0.35 });
  await sleep(250);
  btn.classList.remove("hint"); btn.click();
}

// Lembar kamera (simulasi) di ponsel staf
function pickPhoto(options, auto = 0) {
  const sheet = $("#sheet"), list = $("#shots");
  list.innerHTML = "";
  options.forEach((o) => {
    const b = document.createElement("button");
    b.type = "button"; b.innerHTML = `${o.svg}<span>${esc(o.label)}</span>`;
    b.onclick = () => done(o);
    list.append(b);
  });
  sheet.hidden = false;
  fx(sheet, { transform: ["translateY(100%)", "translateY(0)"] }, { type: "spring", bounce: 0, visualDuration: 0.35 });
  let done;
  const p = waitable((resolve) => {
    done = async (o) => { await fx(sheet, { transform: "translateY(100%)" }, { duration: 0.2 }); sheet.hidden = true; resolve(o); };
    $("#upload").onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      e.target.value = "";
      done({ upload: URL.createObjectURL(f), label: "foto unggahan", value: null });
    };
    $("#sheet-x").onclick = () => done(options[auto]);
  });
  if (S.auto) autoPress($$("button", list)[auto]);
  $$("button", list)[0]?.focus({ preventScroll: true });
  return p;
}

async function sendPhoto(o) {
  const inner = o.upload ? `<img src="${o.upload}" alt="Foto unggahan staf">` : o.svg;
  const el = me(`<div class="shot">${inner}<div class="scan"></div></div>`);
  const scan = $(".scan", el);
  await fx(scan, { transform: ["translateY(-40%)", "translateY(260%)"] }, { duration: 0.8, repeat: 1, ease: "easeInOut" });
  scan.remove();
  return el;
}

// Komposer untuk mengetik angka (tombol "Ubah" atau foto unggahan)
function typeNumber() {
  const f = $("#composer"), inp = $("#num");
  f.hidden = false; inp.placeholder = t("typeNum"); inp.value = ""; inp.focus();
  return waitable((resolve) => {
    f.onsubmit = (e) => {
      e.preventDefault();
      const v = parseFloat(inp.value.replace(",", "."));
      if (Number.isNaN(v)) { inp.setAttribute("aria-invalid", "true"); inp.focus(); return; }
      inp.removeAttribute("aria-invalid"); f.hidden = true; me(`${num(v)}°C`); resolve(v);
    };
  });
}

// Foto termometer -> baca angka -> konfirmasi -> nilai akhir
async function readTemp(options, auto = 0) {
  const o = await pickPhoto(options, auto);
  await sendPhoto(o);
  if (o.value == null) { await ins("typeNum"); return typeNumber(); }
  const v = `${num(o.value.toFixed(1))}°C`;
  const q = await bot("staff", (lang) => fill(esc(T[lang].read), { v: `<b class="big">${v}</b>` }), { say: (lang) => fill(T[lang].read, { v }) });
  const k = await ask(q, ["correct", "change"], 0);
  return k === 0 ? o.value : typeNumber();
}

/* ---------------- Suara (TTS) ---------------- */
let speaking = null;
function voiceBubbleHTML(label) {
  const bars = Array.from({ length: 26 }, (_, i) => `<i style="height:${6 + ((i * 37) % 18)}px"></i>`).join("");
  return `<div class="voice"><button type="button" aria-label="Putar pesan suara">${icon("play")}</button><div><div class="wave">${bars}</div><small>${esc(label)}</small></div></div>`;
}
function waveOn(wave, on) {
  if (!wave) return;
  wave.classList.toggle("on", on);
  wave._anims?.forEach((a) => a.stop()); wave._anims = null;
  if (on && animate && !reduceMq.matches) wave._anims = $$("i", wave).map((b, i) => animate(b, { transform: ["scaleY(1)", "scaleY(0.4)", "scaleY(1)"] }, { duration: 0.6, delay: i * 0.03, repeat: Infinity }));
}
function findVoice(lang) {
  if (!("speechSynthesis" in window)) return null;
  const code = LANGS[lang].tts.toLowerCase(), alt = lang === "tl" ? ["fil", "tl"] : [code.split("-")[0]];
  const voices = speechSynthesis.getVoices();
  return voices.find((x) => x.lang.replace("_", "-").toLowerCase() === code) || voices.find((x) => alt.some((a) => x.lang.toLowerCase().startsWith(a))) || null;
}
function speak(text, lang, wave, btn) {
  if (!("speechSynthesis" in window)) return toast("Browser ini tidak bisa memutar suara.");
  speechSynthesis.cancel();
  const v = findVoice(lang);
  // Tanpa suara untuk bahasa itu, browser membaca dengan suara bahasa lain. Lebih baik diam dan menjelaskan.
  if (!v) return toast(`Suara ${LANGS[lang].label} belum terpasang di browser/perangkat ini. Di produk, pesan suara direkam sekali per bahasa dan dicek penutur asli, jadi tidak bergantung pada browser.`);
  const u = new SpeechSynthesisUtterance(text.replace(/^\d\/\d\s*/, ""));
  u.lang = LANGS[lang].tts; u.voice = v; u.rate = 0.95;
  btn?.classList.add("on");
  u.onend = u.onerror = () => { waveOn(wave, false); btn?.classList.remove("on"); };
  waveOn(wave, true);
  speaking = u; speechSynthesis.speak(u);
}
// Pesan suara selalu memakai bahasa bubble-nya saat ini (ikut berubah saat bahasa staf diganti)
async function voiceNote(key) {
  const el = await bot("staff", (lang) => voiceBubbleHTML(`${T[lang].voice} · ${LANGS[lang].label}`));
  el._bind = () => { const wave = $(".wave", el); $(".voice button", el).onclick = () => speak(T[el.lang][key], el.lang, wave); };
  el._bind();
  if (S.auto) speak(T[el.lang][key], el.lang, $(".wave", el));
  return el;
}

/* ---------------- Whisper ---------------- */
const SAMPLES = [
  { code: "id", label: "Bahasa Indonesia", url: "audio/lapor-id.mp3", ref: "Pak, satu pekerja di dapur muntah setelah makan siang. Sisa ayamnya sudah saya pisahkan." },
  { code: "ar", label: "العربية", url: "audio/lapor-ar.mp3", ref: "أحد العمال في المطبخ تقيأ بعد الغداء. عزلت الدجاج المتبقي.", idText: "Salah satu pekerja di dapur muntah setelah makan siang. Saya sudah memisahkan sisa ayamnya." },
  { code: "hi", label: "हिन्दी", url: "audio/lapor-hi.mp3", ref: "रसोई में एक कर्मचारी को दोपहर के खाने के बाद उल्टी हुई। बचा हुआ चिकन अलग रख दिया है।", idText: "Seorang pekerja di dapur muntah setelah makan siang. Sisa ayamnya sudah disisihkan." },
  { code: "en", label: "English", url: "audio/lapor-en.mp3", ref: "One kitchen worker vomited after lunch. I have separated the leftover chicken.", idText: "Satu pekerja dapur muntah setelah makan siang. Sisa ayamnya sudah saya pisahkan." },
];
const W = { worker: null, loading: null, id: 0, cbs: new Map(), prog: {}, onprog: null };
function whisperLoad() {
  if (W.loading) return W.loading;
  W.worker = new Worker("whisper-worker.js", { type: "module" });
  W.loading = new Promise((res, rej) => {
    W.worker.onmessage = ({ data: d }) => {
      if (d.type === "progress") { W.prog[d.file] = d.pct; const v = Object.values(W.prog); W.onprog?.(Math.round(v.reduce((a, b) => a + b, 0) / v.length)); }
      else if (d.type === "ready") res();
      else if (d.type === "result") { W.cbs.get(d.id)?.res(d); W.cbs.delete(d.id); }
      else if (d.type === "error") {
        const c = W.cbs.get(d.id);
        if (c) { c.rej(new Error(d.message)); W.cbs.delete(d.id); } else { W.loading = null; rej(new Error(d.message)); }
      }
    };
    W.worker.onerror = (e) => { W.loading = null; rej(e); };
    W.worker.postMessage({ type: "load" });
  });
  return W.loading;
}
// Terjemahan ke bahasa pemilik memakai penerjemah bawaan Chrome (di perangkat) bila ada.
// Dipanggil tepat setelah klik pengguna, karena unduhan paket bahasa butuh aktivasi pengguna.
function startTranslator(src) {
  if (src === "id" || !("Translator" in self)) return Promise.resolve(null);
  return Translator.create({ sourceLanguage: src, targetLanguage: "id" }).catch(() => null);
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
async function translateToId(trP, text) {
  const tr = await withTimeout(trP, 15000);
  if (!tr) return null;
  return withTimeout(tr.translate(text).catch(() => null), 10000);
}
async function toPCM(src) {
  const buf = typeof src === "string" ? await (await fetch(src)).arrayBuffer() : await src.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  const ab = await ctx.decodeAudioData(buf);
  ctx.close();
  return ab.getChannelData(0).slice();
}
async function transcribe(src, lang) {
  await whisperLoad();
  const audio = await toPCM(src);
  const id = ++W.id;
  return new Promise((res, rej) => {
    W.cbs.set(id, { res, rej });
    W.worker.postMessage({ type: "run", id, audio, lang: WHISPER_LANG[lang] }, [audio.buffer]);
  });
}
async function recordVoice() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream), chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const bar = document.createElement("div");
  bar.className = "composer";
  bar.innerHTML = `<span class="pill bad" style="margin:auto 0">● REC <span id="rt">0:00</span></span><button type="button" class="btn primary" style="margin-left:auto">${icon("check")}Selesai</button>`;
  $("#staff").insertBefore(bar, $("#sheet"));
  let s = 0; const timer = setInterval(() => { s++; $("#rt", bar).textContent = `0:${String(s).padStart(2, "0")}`; if (s >= 20) stop(); }, 1000);
  let stop;
  const p = new Promise((resolve) => {
    rec.onstop = () => { stream.getTracks().forEach((x) => x.stop()); bar.remove(); resolve(new Blob(chunks, { type: rec.mimeType })); };
    stop = () => { clearInterval(timer); if (rec.state !== "inactive") rec.stop(); };
    $("button", bar).onclick = stop;
  });
  rec.start();
  return p;
}
function audioBubble(src, label) {
  const el = me(voiceBubbleHTML(label));
  const a = new Audio(src), wave = $(".wave", el);
  a.onplay = () => waveOn(wave, true); a.onended = a.onpause = () => waveOn(wave, false);
  $(".voice button", el).onclick = () => (a.paused ? a.play() : a.pause());
  return { el, a };
}

/* ---------------- Pemilik ---------------- */
async function ownerMsg(html, o = {}) { return bot("owner", html, { wait: 500, ...o }); }
const pill = (cls, ic, text) => `<span class="pill ${cls}">${icon(ic)}${text}</span><br>`;

/* ---------------- Sensor ---------------- */
function chartSVG(svg, data, { draw = false } = {}) {
  const W0 = 640, H = 220, P = { l: 40, r: 12, t: 12, b: 28 }, min = -22, max = -4;
  const x = (i) => P.l + (i / (data.length - 1)) * (W0 - P.l - P.r);
  const y = (v) => P.t + ((max - v) / (max - min)) * (H - P.t - P.b);
  let d = "", pen = false;
  data.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
  const last = data.length - 1, lv = data[last];
  svg.innerHTML = `<rect class="zone" x="${P.l}" y="${P.t}" width="${W0 - P.l - P.r}" height="${y(-18) - P.t}" opacity=".6"/>
    <g class="grid">${[-20, -15, -10, -5].map((v) => `<line x1="${P.l}" x2="${W0 - P.r}" y1="${y(v)}" y2="${y(v)}"/><text x="6" y="${y(v) + 4}">${v}°</text>`).join("")}</g>
    <line class="lim" x1="${P.l}" x2="${W0 - P.r}" y1="${y(-18)}" y2="${y(-18)}"/><text x="${P.l + 6}" y="${y(-18) - 6}" style="fill:var(--bad)">batas -18°C</text>
    <path class="line" d="${d}" pathLength="1"/>
    ${lv != null ? `<circle class="now" cx="${x(last)}" cy="${y(lv)}" r="4.5"/><text x="${x(last) - 8}" y="${y(lv) - 10}" text-anchor="end" style="font-weight:700;fill:var(--ink)">${num(lv.toFixed(1))}°C</text>` : `<text x="${x(last) - 8}" y="${y(-12)}" text-anchor="end" style="font-weight:700;fill:var(--warn)">tidak ada data</text>`}
    <text x="${P.l}" y="${H - 8}">6 jam lalu</text><text x="${W0 - P.r}" y="${H - 8}" text-anchor="end">sekarang</text>`;
  if (draw) { const p = $(".line", svg); p.style.strokeDasharray = "1"; fx(p, { strokeDashoffset: [1, 0] }, { duration: 1.2, ease: "easeInOut" }).then(() => (p.style.strokeDasharray = "")); }
}
function drawCharts(draw) { $$("svg.chart").forEach((s) => chartSVG(s, S.sensor, { draw })); }
function sensorChip() {
  const c = $("#sensor-chip"), st = S.sim?.state;
  const [cls, txt] = st === "alarm" ? ["bad", "Alarm terkirim"] : st === "door" ? ["warn", "Naik, dipantau"] : st === "power" ? ["warn", "Sensor tidak mengirim data"] : ["", "Normal"];
  c.className = `chip ${cls}`; c.textContent = txt;
}
// Simulasi: 1 tick = 5 menit. Alarm bila di atas -18°C selama 6 tick (30 menit).
function simulate(kind) {
  if (S.sim) return S.sim.promise;
  let resolve; const promise = new Promise((r) => (resolve = r));
  S.sim = { state: kind, above: 0, gap: 0, promise };
  $$("[data-sim]").forEach((b) => (b.disabled = true));
  sensorChip();
  const tick = async () => {
    const sim = S.sim; const cur = S.sensor[S.sensor.length - 1] ?? -19.5;
    let next = cur;
    if (sim.state === "door") { next = Math.min(-8.5, cur + 1.6); sim.above = next > -18 ? sim.above + 1 : 0; }
    else if (sim.state === "alarm") next = Math.min(-8.5, cur + 0.3);
    else if (sim.state === "recover") next = Math.max(-19.4, cur - 1.8);
    else if (sim.state === "power") { next = null; sim.gap++; }
    S.sensor = [...S.sensor.slice(1), next == null ? null : next + (Math.random() - 0.5) * 0.2];
    advance(5);
    drawCharts(false);
    if (sim.state === "door" && sim.above >= 6) { sim.state = "alarm"; sensorChip(); sim.wait = freezerAlarm(next).then(() => { sim.state = "recover"; sensorChip(); }).catch(() => {}); }
    if (sim.state === "recover" && next <= -19.3) return finish("alarm");
    if (sim.state === "power" && sim.gap >= 8) { S.sensor[S.sensor.length - 1] = -17.6; return finish("power"); }
    sim.timer = setTimeout(tick, reduceMq.matches ? 120 : 650);
  };
  const finish = async (what) => {
    if (what === "power") await powerReport();
    S.sim = null; sensorChip(); drawCharts(false);
    $$("[data-sim]").forEach((b) => (b.disabled = false));
    resolve();
  };
  tick();
  return promise;
}
async function freezerAlarm(v) {
  S.stats.out++;
  addFeed(timeNow(), "Alarm freezer 2 dikirim ke pemilik dan supervisor");
  if ($("#v-dapur").hidden) toast("Alarm dikirim ke WhatsApp pemilik dan supervisor.");
  const m = await ownerMsg(pill("bad", "alert", "ALARM SUHU") + `<b>Freezer 2, cabang Al-Aziziyah</b><br>${num(v.toFixed(1))}°C selama 30 menit (batas -18°C). Kemungkinan pintu tidak tertutup rapat.<br><small class="muted">Supervisor Imran sudah diberi tahu.</small>`, { cls: "alarm" });
  const k = await ask(m, ["Sudah ditangani", "Telepon supervisor"], 0);
  if (k === 1) { toast("Di produk, tombol ini membuka panggilan WhatsApp ke supervisor."); await ask(await ownerMsg("Tandai sudah ditangani?"), ["Sudah ditangani"], 0); }
  addLog("alarm", `${num(v.toFixed(1))}°C → -19,3°C`, false, "Sensor / Imran A.");
  await ownerMsg(`Tercatat ✓ Pintu ditutup. Suhu kembali normal dalam beberapa menit. Kejadian ini masuk Buku Catatan Dapur.`);
}
async function powerReport() {
  addLog("power", "40 min no data", true, "Sensor");
  addFeed(timeNow(), "Sensor freezer 2 tidak mengirim data 40 menit");
  await ownerMsg(pill("warn", "power", "SENSOR TIDAK MENGIRIM DATA") + `Freezer 2 Al-Aziziyah tidak mengirim data selama 40 menit, kemungkinan listrik padam.<br><br>Aturan: makanan dingin di atas 4°C lebih dari 2 jam wajib dibuang (5.5.3). Sekarang baru 40 menit, belum lewat batas. Jangan buka pintu kulkas dan freezer.`, { cls: "warn" });
}

/* ---------------- Log, feed, statistik ---------------- */
function addLog(type, reading, ok, by, extra = {}) {
  const r = { id: ++S.seq, date: dateLabel(), time: timeNow(), type, reading, ok, by, fresh: true, ...extra };
  S.log.unshift(r); renderLog(); renderDash(); return r;
}
function addFeed(time, text) { S.feed.unshift([time, text]); renderFeed(); }
function addChecks(n, ok = true) { S.stats.chkTotal += n; if (ok) S.stats.chkDone += n; }

/* ---------------- Adegan ---------------- */
const SCENES = [
  { time: "07:00", name: "Buka dapur", run: scOpen, story: {
    when: "07:00 · Buka dapur", title: "Staf mengisi daftar periksa di WhatsApp, dalam bahasanya sendiri",
    body: ["Tidak perlu memasang aplikasi. Salamah mengirim 5 butir pendek dengan pesan suara, dan staf menjawab dengan foto atau satu sentuhan.", "Coba ganti bahasa staf lewat menu di kanan atas ponsel kiri, lalu putar pesan suaranya. Coba juga pilih foto freezer -16,2°C untuk melihat peringatan ke supervisor."],
    rules: ["5.10 Kebersihan pekerja", "5.5.9 Cek freezer saat buka", "5.5.3 Suhu penyimpanan", "5.7 Pembersihan", "5.5.18 Pekerja sakit"] } },
  { time: "09:30", name: "Barang datang", run: scReceive, story: {
    when: "09:30 · Barang datang", title: "Suhu barang diukur dan dicatat saat tiba",
    body: ["Staf memotret termometer tusuk di daging dingin. Bila di atas 4°C, Salamah meminta staf menolak barang dan memberi tahu pemilik saat itu juga.", "Foto nota pemasok menjadi catatan asal bahan: nama pemasok, tanggal, dan nomor produksi, disimpan minimal 180 hari."],
    rules: ["5.5.1 Penerimaan barang", "5.5.19 Catatan asal bahan 180 hari"] } },
  { time: "13:00", name: "Masak", run: scCook, story: {
    when: "13:00 · Masak", title: "Suhu inti makanan matang, bukan angka di layar alat",
    body: ["Aturan meminta suhu makanan diukur dengan termometer tusuk. Salamah membaca angka dari foto, staf mengonfirmasi dengan satu sentuhan, dan catatan langsung terkunci dengan jam dan nama."],
    rules: ["5.5.6 Suhu masak minimal 75°C"] } },
  { time: "13:40", name: "Laporan suara", run: scVoice, story: {
    when: "13:40 · Ada kejadian", title: "Staf melapor dengan suara, dalam bahasa apa saja",
    body: ["Staf yang tidak lancar menulis cukup bicara. Whisper, program pengenal suara, mengubah suara menjadi teks, lalu teks itu diterjemahkan ke bahasa pemilik. Salamah kemudian memandu langkah yang diminta aturan.", "Di demo ini Whisper berjalan langsung di browser Anda. Pertama kali perlu mengunduh model sekitar 80 MB, setelah itu tersimpan. Di produk, proses ini berjalan di server Salamah di Riyadh."],
    rules: ["5.5.18 Kejadian dan laporan", "Pasal: lapor bila lebih dari 2 pekerja sakit"] } },
  { time: "02:10", name: "Alarm freezer", run: scAlarm, story: {
    when: "02:10 · Malam, dapur kosong", title: "Pintu freezer tidak tertutup rapat",
    body: ["Sensor membaca suhu setiap 5 menit. Bila di atas -18°C lebih dari 30 menit, pemilik dan supervisor menerima alarm WhatsApp. Di demo, 1 detik sama dengan 5 menit."],
    rules: ["5.5.3 Suhu penyimpanan dan listrik padam", "5.5.13 Sistem pemantauan suhu"], chart: true } },
  { time: "08:00", name: "Sertifikat", run: scCert, story: {
    when: "08:00 · Pagi berikutnya", title: "Sertifikat kesehatan pekerja tidak lagi lewat tanggal",
    body: ["Denda SAR 200 sampai 1.000 per pekerja dijatuhkan tanpa peringatan. Salamah mengingatkan 60, 30, 14, dan 3 hari sebelum sertifikat habis, dengan tombol langsung ke layanan perpanjangan Balady.", "Setiap Senin pemilik juga menerima ringkasan satu minggu."],
    rules: ["Denda 1/5/1 sampai 1/5/3", "5.5.17 Dokumen boleh elektronik"] } },
  { time: "Kapan saja", name: "Inspektur datang", run: scInspector, story: {
    when: "Kapan saja · Inspektur datang", title: "Semua catatan 30 hari ada di HP pemilik",
    body: ["Setiap baris punya jam, nama, foto, dan pasal yang dipenuhi. Catatan terkunci: kesalahan diperbaiki dengan baris koreksi, catatan asli tetap terlihat.", "Buku ini bisa dicetak sebagai PDF dua bahasa (Inggris dan Arab), atau dilampirkan saat mengajukan keberatan atas denda."],
    rules: ["5.5.17 Dokumen keamanan pangan"], cta: true } },
];

function renderStory(i) {
  const s = SCENES[i].story, el = $("#story");
  el.innerHTML = `<div class="when">${esc(s.when)}</div><h2>${esc(s.title)}</h2>${s.body.map((p) => `<p>${esc(p)}</p>`).join("")}
    <div class="rules" aria-label="Pasal Persyaratan Restoran MOMAH">${s.rules.map((r) => `<span>${esc(r)}</span>`).join("")}</div>
    ${s.chart ? `<svg class="chart" viewBox="0 0 640 220" role="img" aria-label="Grafik suhu freezer 2"></svg><div class="cta"><button class="btn" data-sim="door">${icon("door")}Buka pintu freezer</button><button class="btn" data-sim="power">${icon("power")}Listrik padam</button></div>` : ""}
    ${s.cta ? `<div class="cta"><button class="btn primary" id="go-log">${icon("file")}Buka Buku Catatan Dapur</button></div>` : ""}`;
  $$("[data-sim]", el).forEach(bindSim);
  if (s.chart) drawCharts(true);
  $("#go-log", el)?.addEventListener("click", () => showView("log"));
  fx($$(":scope > *", el), { opacity: [0, 1], transform: ["translateY(8px)", "translateY(0)"] }, { duration: 0.35, delay: stagger(0.05) });
}
function setClock(c) {
  const [d, hm] = c.split(" "), [h, m] = hm.split(":").map(Number);
  S.min = DAYS.indexOf(d) * 1440 + h * 60 + m; showClock();
}

async function runScene(i) {
  if (S.running) return;
  S.running = true; S.scene = i; renderTimeline(); renderStory(i);
  current = (async () => {
    try { await SCENES[i].run(); S.done.add(i); }
    catch (e) { if (e instanceof Abort) return; console.error(e); toast("Ada yang gagal di adegan ini. Coba ulangi."); }
    S.running = false; renderTimeline();
  })();
  await current; current = null;
}
async function abortScene() {
  if (!current) return;
  aborting = true;
  pending.forEach((j) => j(new Abort())); pending.clear();
  await current.catch(() => {});
  aborting = false; current = null;
}

async function scOpen() {
  setClock("Kamis 06:58"); day("staff", "Kamis 26 Nov"); day("owner", "Kamis 26 Nov");
  S.staffName = staffName(); $("#staff-sub").textContent = `untuk staf · ${S.staffName}`;
  const g = await ins("greet", { name: S.staffName, n: 5 });
  await ask(g, ["start"]); meK("start");
  await voiceNote("hands");
  setClock("Kamis 06:59");
  await ins("hands");
  const p = await pickPhoto([{ svg: shots.hands(), label: "staf siap" }]);
  await sendPhoto(p); await ins("ok", {}, { wait: 350 });
  addLog("hands", "photo", true, staffName());
  const checks = [["freezer", "Freezer 1", "#9FB4C7", [-19.4, -16.2], (v) => v <= -18, "≤ -18°C"], ["fridge", "Kulkas", "#B7C9C2", [3.1], (v) => v >= 0 && v <= 4, "0–4°C"]];
  let bad = 0;
  for (const [key, label, bg, vals, okFn, limit] of checks) {
    setClock(`Kamis 07:0${key === "freezer" ? 1 : 2}`);
    await ins(key);
    const v = await readTemp(vals.map((x) => ({ svg: shots.thermo(x, label, bg), label: `${label} ${num(x.toFixed(1))}°C`, value: x })), 0);
    const ok = okFn(v);
    addLog(key, `${num(v.toFixed(1))}°C`, ok, staffName());
    if (ok) await ins("ok", {}, { wait: 350 });
    else {
      bad++; S.stats.out++;
      await ins("bad", { v: `${num(v.toFixed(1))}°C`, limit }, { cls: "warn" });
      await ownerMsg(pill("warn", "thermo", "SUHU DI LUAR BATAS") + `${label} Al-Aziziyah terbaca <b>${num(v.toFixed(1))}°C</b> saat buka (batas ${limit}). Supervisor sudah diberi tahu.`, { cls: "warn" });
    }
  }
  setClock("Kamis 07:03");
  const s = await ins("surface");
  await ask(s, ["done"]); meK("done");
  addLog("surface", "✓", true, staffName());
  const q = await ins("sick");
  const k = await ask(q, ["no", "yes"], 0); meK(k ? "yes" : "no");
  addLog("sick", k ? "1 worker sick" : "none", !k, staffName());
  if (k) {
    await ins("sickYes");
    await ownerMsg(pill("warn", "alert", "PEKERJA SAKIT") + "Staf Al-Aziziyah melaporkan ada pekerja yang diare atau muntah. Bila lebih dari 2 pekerja, wajib lapor ke pihak berwenang (5.5.18).", { cls: "warn" });
  }
  setClock("Kamis 07:04");
  await ins("finish", { name: S.staffName });
  addChecks(5, !bad);
  addFeed("07:04", `Daftar periksa buka Al-Aziziyah ${5 - bad}/5`);
  await ownerMsg(pill("ok", "check", "BUKA DAPUR") + `Al-Aziziyah: daftar periksa buka dapur terisi ${5 - bad}/5 pukul ${timeNow()} oleh ${esc(staffName())}.`);
}

async function scReceive() {
  setClock("Kamis 09:30"); day("staff", "09:30");
  const ch = (x) => ({ svg: shots.thermo(x, "Ayam dingin", "#C98B7A"), label: `Ayam dingin ${num(x.toFixed(1))}°C`, value: x });
  await ins("recv");
  for (let attempt = 0; attempt < 3; attempt++) {
    const v = await readTemp([ch(6.1), ch(3.2)], attempt === 0 ? 0 : 1);
    if (v <= 4) { addLog("receive", `${num(v.toFixed(1))}°C`, true, staffName()); break; }
    S.stats.out++;
    addLog("receive", `${num(v.toFixed(1))}°C · REJECTED`, false, staffName());
    await ins("reject", { v: `${num(v.toFixed(1))}°C` }, { cls: "warn" });
    await ownerMsg(pill("bad", "alert", "BARANG DITOLAK") + `Ayam dingin dari Supplier B (contoh) terbaca <b>${num(v.toFixed(1))}°C</b> saat tiba di Al-Aziziyah (batas 4°C). Staf diminta menolak barang. Foto tersimpan sebagai bukti.`, { cls: "alarm" });
    setClock("Kamis 10:05");
    await ins("again");
  }
  await ins("accept");
  const inv = await pickPhoto([{ svg: shots.invoice(), label: "Nota Supplier B" }]);
  await sendPhoto(inv);
  await bot("staff", (lang) => `${esc(T[lang].invoiceOk)}<br><small>Supplier B (sample) · 26/11/2026 · Lot 2611-26</small>`, { say: (lang) => T[lang].invoiceOk });
  S.stats.notes++; addChecks(2);
  addLog("invoice", "invoice photo", true, staffName());
  addFeed(timeNow(), "Nota Supplier B tercatat, disimpan 180 hari");
}

async function scCook() {
  setClock("Kamis 13:00"); day("staff", "13:00");
  await ins("cook");
  const v = await readTemp([{ svg: shots.thermo(78, "Kabsa ayam", "#B9774A"), label: "Kabsa ayam 78,0°C", value: 78 }]);
  const ok = v >= 75;
  addLog("cook", `${num(v.toFixed(1))}°C`, ok, staffName()); addChecks(1, ok);
  if (ok) await ins("cookOk");
  else { S.stats.out++; await ins("bad", { v: `${num(v.toFixed(1))}°C`, limit: "≥ 75°C" }, { cls: "warn" }); }
}

async function scVoice() {
  setClock("Kamis 13:40"); day("staff", "13:40");
  whisperLoad().catch(() => {});
  const m = await ins("incHelp");
  let k = await ask(m, ["record", "sample"], 1);
  let src, lang, label, sample;
  if (k === 0) {
    try { src = await recordVoice(); lang = S.lang; label = `${t("voice")} · ${L().label}`; }
    catch { toast("Mikrofon tidak bisa dipakai di sini. Memakai contoh rekaman."); k = 1; }
  }
  if (k === 1) {
    const prefer = Math.max(0, SAMPLES.findIndex((x) => x.code === S.lang));
    const o = await pickPhoto(SAMPLES.map((x) => ({ svg: `<svg viewBox="0 0 220 70" role="img" aria-label="Rekaman ${esc(x.label)}"><rect width="220" height="70" fill="#E3F2EC"/>${Array.from({ length: 30 }, (_, i) => `<rect x="${12 + i * 6.6}" y="${35 - (4 + ((i * 29) % 22)) / 2}" width="3.6" height="${4 + ((i * 29) % 22)}" rx="1.5" fill="#0B6E4F"/>`).join("")}</svg>`, label: x.label, x })), S.auto ? 1 : prefer);
    sample = o.x; src = sample.url; lang = sample.code; label = `${t("voice")} · ${sample.label}`;
  }
  const trP = startTranslator(lang);
  const { a } = audioBubble(typeof src === "string" ? src : URL.createObjectURL(src), label);
  if (S.auto) a.play().catch(() => {});
  const st = await bot("staff", (lang) => `${pill("ok", "volume", "WHISPER")}${esc(T[lang].listening)} <small class="prog muted"></small>`);
  W.onprog = (p) => { const e = $(".prog", st); if (e) e.textContent = `· mengunduh model ${p}%`; };
  let r, fallback = false;
  try { r = await transcribe(src, lang); }
  catch (e) {
    console.warn("Whisper gagal", e);
    if (!sample) { await bot("staff", "Suara belum bisa diproses di browser ini. Coba pakai contoh rekaman."); return; }
    r = { text: sample.ref }; fallback = true;
  }
  W.onprog = null;
  st._render = null;
  $(".txt", st).innerHTML = `${pill("ok", "check", "WHISPER")}${fallback ? "Teks contoh" : "Selesai ✓"}`;
  await bot("staff", (lang) => `${esc(T[lang].incHeard)}: “<bdi dir="auto">${esc(r.text)}</bdi>”${fallback ? '<br><small class="muted">(teks contoh: Whisper tidak bisa dimuat di browser ini)</small>' : ""}`);
  await ins("incSteps");
  const idText = lang === "id" ? null : await translateToId(trP, r.text);
  const trans = lang === "id" ? "" : idText ? `<br><br>Terjemahan (diterjemahkan di perangkat oleh Chrome):<br><i>“${esc(idText)}”</i>`
    : sample ? `<br><br>Terjemahan contoh:<br><i>“${esc(sample.idText)}”</i><br><small class="muted">Penerjemah otomatis tidak tersedia di browser ini.</small>`
    : `<br><small class="muted">Penerjemah otomatis tidak tersedia di browser ini, jadi pemilik melihat teks aslinya.</small>`;
  advance(1);
  addLog("incident", "voice note", false, staffName());
  addFeed(timeNow(), "Laporan kejadian lewat pesan suara");
  const om = await ownerMsg(pill("bad", "alert", "LAPORAN KEJADIAN") + `<b>Al-Aziziyah, ${timeNow()}</b><br>Pesan suara staf (${esc(sample?.label ?? L().label)}):<br><i>“<bdi dir="auto">${esc(r.text)}</bdi>”</i>${trans}<br><br>Staf sudah dipandu: jauhkan pekerja yang sakit, pisahkan dan beri label sisa bahan, foto sisa bahan. Bila lebih dari 2 pekerja sakit, wajib lapor ke pihak berwenang (5.5.18).`, { cls: "alarm" });
  const k2 = await ask(om, ["Sudah ditangani", "Telepon supervisor"], 0);
  if (k2 === 1) toast("Di produk, tombol ini membuka panggilan WhatsApp ke supervisor.");
  await ownerMsg("Tercatat ✓ Laporan dan langkah penanganannya masuk Buku Catatan Dapur.");
}

async function scAlarm() {
  setClock("Jumat 02:10"); day("owner", "Jumat 27 Nov");
  if (S.auto) { await sleep(800); await waitable((r) => simulate("door").then(r)); return; }
  toast("Tekan “Buka pintu freezer” atau “Listrik padam” di panel kanan.");
  await waitable((r) => { S.waitSim = r; });
  if (S.sim) await waitable((r) => S.sim.promise.then(r));
}
function bindSim(b) {
  b.onclick = async () => { const kind = b.dataset.sim; const p = simulate(kind); S.waitSim?.(); S.waitSim = null; await p; };
}

async function scCert() {
  setClock("Jumat 08:00"); day("owner", "Jumat 08:00");
  const c = S.certs.find((x) => x.name === "Abdul Karim");
  const m = await ownerMsg(pill("warn", "file", "SERTIFIKAT") + `Sertifikat kesehatan <b>${esc(c.name)}</b> (Al-Aziziyah) habis dalam <b>${daysLeft(c)} hari</b>, tanggal ${fmtDate(c.exp)}. Tanpa sertifikat berlaku, ia tidak boleh bekerja dan denda dihitung per pekerja.`, { cls: "warn" });
  const k = await ask(m, ["Buka Balady", "Ingatkan lagi"], 1);
  if (k === 0) window.open("https://www.balady.gov.sa/en/services/renewal-health-certificate", "_blank", "noopener");
  else await ownerMsg("Baik, Salamah mengingatkan lagi besok pukul 08:00.");
  c.reminded = true; renderDash();
  addFeed(timeNow(), `Pengingat sertifikat ${c.name} dikirim`);
  const soon = S.certs.filter((x) => daysLeft(x) <= 60).length;
  await sleep(500);
  await ownerMsg(`<b>Ringkasan minggu ini · Grup Al-Nakheel</b><br>Daftar periksa terisi ${pct()}%<br>Suhu keluar batas: ${S.stats.out} kali<br>Sertifikat habis ≤ 60 hari: ${soon} orang<br>Nota pemasok tercatat: ${S.stats.notes}`);
}

async function scInspector() {
  setClock("Jumat 10:30");
  if (S.auto) { await sleep(1500); showView("log"); await sleep(2500); }
}

/* ---------------- Tampilan: timeline, dashboard, log ---------------- */
function renderTimeline() {
  const ol = $("#timeline");
  if (!ol.children.length) {
    ol.innerHTML = SCENES.map((s, i) => `<li><button type="button" data-i="${i}"><span class="t">${s.time}</span><span class="n">${s.name}</span></button></li>`).join("");
    $$("button", ol).forEach((b) => (b.onclick = () => runScene(+b.dataset.i)));
  }
  $$("li", ol).forEach((li, i) => {
    li.dataset.state = i === S.scene && S.running ? "active" : S.done.has(i) ? "done" : "";
    const b = $("button", li); b.disabled = S.running && i !== S.scene;
    if (i === S.scene && S.running) { b.setAttribute("aria-current", "step"); li.scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMq.matches ? "auto" : "smooth" }); }
    else b.removeAttribute("aria-current");
  });
}
const daysLeft = (c) => Math.round((new Date(c.exp + "T08:00:00") - new Date(2026, 10, 26 + dayIdx(), 8)) / DAY);
const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const pct = () => Math.round((S.stats.chkDone / S.stats.chkTotal) * 100);

const shown = {};
function counter(el, key, to, fmt = (v) => Math.round(v)) {
  const from = shown[key] ?? 0; shown[key] = to;
  if (!animate || reduceMq.matches || from === to) { el.textContent = fmt(to); return; }
  animate(from, to, { duration: 0.8, ease: "easeOut", onUpdate: (v) => (el.textContent = fmt(v)) });
}
function renderDash() {
  const soon = S.certs.filter((c) => daysLeft(c) <= 60).length;
  const st = $("#stats");
  const cards = [["chk", "Daftar periksa terisi", pct(), "ok", "target 80%", (v) => `${Math.round(v)}%`],
    ["out", "Suhu keluar batas", S.stats.out, S.stats.out ? "warn" : "ok", "30 hari terakhir"],
    ["soon", "Sertifikat habis ≤ 60 hari", soon, soon ? "warn" : "ok", `dari ${S.certs.length} pekerja`],
    ["notes", "Nota pemasok tercatat", S.stats.notes, "", "disimpan 180 hari atau lebih"]];
  if (!st.children.length) st.innerHTML = cards.map(([k, label]) => `<div class="stat"><div class="k">${label}</div><div class="v" data-k="${k}">0</div><div class="s"></div></div>`).join("");
  cards.forEach(([k, , v, cls, sub, f]) => { const el = $(`[data-k="${k}"]`, st); el.className = `v ${cls}`; el.nextElementSibling.textContent = sub; if (!$("#v-dash").hidden) counter(el, k, v, f); else { el.textContent = f ? f(v) : v; shown[k] = v; } });
  $("#branches").innerHTML = `<tr><th>Cabang</th><th>Terisi</th><th>Status</th></tr>` + BRANCHES.map(([n, p], i) => {
    const alarm = i === 0 && S.sim?.state === "alarm";
    return `<tr><td>${n}</td><td>${i === 0 ? pct() : p}%</td><td><span class="days ${alarm ? "bad" : "ok"}">${alarm ? "Alarm" : "Aman"}</span></td></tr>`;
  }).join("");
  const sorted = [...S.certs].sort((a, b) => daysLeft(a) - daysLeft(b));
  $("#certs").innerHTML = `<tr><th>Nama</th><th class="c-branch">Cabang</th><th>Habis</th><th>Pengingat</th></tr>` + sorted.map((c) => {
    const d = daysLeft(c), cls = d <= 14 ? "bad" : d <= 60 ? "warn" : "ok";
    const rem = [60, 30, 14, 3].map((n) => `<span class="${d <= n ? "sent" : ""}" title="${d <= n ? "terkirim" : "terjadwal"}">${n} hari</span>`).join("");
    return `<tr class="${c.fresh ? "new" : ""}"><td>${esc(c.name)}<small class="muted m-only">${esc(c.branch)}</small></td><td class="c-branch">${esc(c.branch)}</td><td><span class="days ${cls}">${d} hari</span><br><small class="muted">${fmtDate(c.exp)}</small></td><td><div class="rem">${rem}</div></td></tr>`;
  }).join("");
}
function renderFeed() { $("#feed").innerHTML = S.feed.slice(0, 7).map(([tm, tx]) => `<li><time>${esc(tm)}</time><span>${esc(tx)}</span></li>`).join(""); }

function renderLog() {
  const rows = S.log.map((r) => {
    const [en, ar, rule] = LOG_TYPES[r.type];
    const item = r.type === "corr" ? `Correction of #${r.of}: ${esc(r.reason)}` : esc(en);
    return `<tr class="${r.type === "corr" ? "corr" : ""} ${r.fresh ? "new" : ""}" data-id="${r.id}">
      <td class="c-id">#${r.id}</td><td class="c-date">${r.date}</td><td class="c-time">${r.time}${r.late ? `<span class="late">LATE +${r.late} min</span>` : ""}</td>
      <td class="c-item">${item}<br><small class="muted" lang="ar" dir="rtl">${ar}</small></td>
      <td class="c-read ${r.ok ? "res-ok" : "res-bad"}">${esc(r.reading)}</td><td class="c-by">${esc(r.by)}</td><td class="c-rule">${rule || "-"}</td>
      <td class="c-act"><span class="lock" title="Terkunci">${icon("lock")}</span>${r.type !== "corr" ? `<button type="button" class="link-btn" data-corr="${r.id}">Koreksi</button>` : ""}</td></tr>`;
  }).join("");
  $("#log").innerHTML = `<tr><th>#</th><th>Date / <span lang="ar">التاريخ</span></th><th>Time / <span lang="ar">الوقت</span></th><th>Item / <span lang="ar">البند</span></th><th>Reading / <span lang="ar">القراءة</span></th><th>By / <span lang="ar">بواسطة</span></th><th>Rule</th><th><span class="sr">Aksi</span></th></tr>${rows}`;
  $$("[data-corr]").forEach((b) => (b.onclick = () => correctDialog(+b.dataset.corr)));
}

function correctDialog(id) {
  const r = S.log.find((x) => x.id === id), d = $("#dlg");
  d.innerHTML = `<form method="dialog"><h2>Koreksi catatan #${id}</h2><p class="muted small">Catatan asli tidak bisa diubah atau dihapus. Koreksi ditambahkan sebagai baris baru dengan alasan, nama, dan jam.</p>
    <p><b>${esc(LOG_TYPES[r.type][0])}</b> · ${esc(r.reading)}</p>
    <label>Nilai yang benar<input name="v" required value="${esc(r.reading)}"></label>
    <label>Alasan<input name="why" required placeholder="mis. salah ketik angka"></label>
    <div class="row gap"><button class="btn" value="cancel" formnovalidate>Batal</button><button class="btn primary" value="ok">Tambah koreksi</button></div></form>`;
  d.showModal();
  d.onclose = () => {
    if (d.returnValue !== "ok") return;
    const f = new FormData($("form", d));
    const c = { id: ++S.seq, date: dateLabel(), time: timeNow(), type: "corr", of: id, reason: f.get("why"), reading: f.get("v"), ok: true, by: "Owner", fresh: true };
    S.log.splice(S.log.indexOf(r), 0, c); renderLog(); toast(`Koreksi untuk #${id} ditambahkan. Catatan asli tetap tersimpan.`);
  };
}

function addWorkerDialog() {
  const d = $("#dlg"), sample = { name: "Bilal Ahmed", no: "HC-1447-208815", exp: "2027-01-09" };
  sample.expLabel = fmtDate(sample.exp);
  d.innerHTML = `<form method="dialog"><h2>Tambah pekerja</h2><p class="muted small">Pemilik cukup memotret sertifikat Balady pekerja. Salamah membaca nama, nomor, dan tanggal habisnya.</p>
    <div class="cert-card shot" style="width:100%">${shots.cert(sample)}<div class="scan"></div></div>
    <label>Nama<input name="n" required></label><label>Nomor sertifikat<input name="no" required></label>
    <label>Tanggal habis<input name="e" type="date" required></label>
    <label>Cabang<select name="b">${BRANCHES.map(([n]) => `<option>${n.split(",")[0]}</option>`).join("")}</select></label>
    <div class="row gap"><button class="btn" value="cancel" formnovalidate>Batal</button><button class="btn primary" value="ok">Simpan</button></div></form>`;
  d.showModal();
  const f = $("form", d);
  fx($(".scan", d), { transform: ["translateY(-40%)", "translateY(330%)"] }, { duration: 0.9, repeat: 1 }).then(() => {
    $(".scan", d)?.remove();
    f.n.value = sample.name; f.no.value = sample.no; f.e.value = sample.exp;
  });
  d.onclose = async () => {
    if (d.returnValue !== "ok") return;
    const c = { id: S.certs.length + 1, name: f.n.value, branch: f.b.value, exp: f.e.value, fresh: true };
    S.certs.push(c); renderDash();
    addFeed("Baru", `${c.name} ditambahkan, pengingat dijadwalkan`);
    const dl = daysLeft(c);
    const dates = [60, 30, 14, 3].filter((n) => dl > n).map((n) => fmtDate(new Date(new Date(c.exp) - n * DAY).toISOString().slice(0, 10)));
    toast(`Pengingat untuk ${c.name} dijadwalkan${dates.length ? `: ${dates.join(", ")}` : ""}.`);
  };
}

/* ---------------- Navigasi ---------------- */
function showView(v) {
  $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === v)));
  $$(".view").forEach((s) => (s.hidden = s.id !== `v-${v}`));
  const el = $(`#v-${v}`);
  if (v === "dash") { renderDash(); drawCharts(true); fx($$(".stat, .card", el), { opacity: [0, 1], transform: ["translateY(12px)", "translateY(0)"] }, { duration: 0.35, delay: stagger(0.05) }); }
  else if (v === "log") { renderLog(); fx($$("#log tr", el).slice(0, 12), { opacity: [0, 1] }, { duration: 0.3, delay: stagger(0.03) }); }
  else fx(el, { opacity: [0, 1] }, { duration: 0.25 });
  window.scrollTo({ top: 0, behavior: reduceMq.matches ? "auto" : "smooth" });
}
$$(".tabs button").forEach((b, i, all) => {
  b.onclick = () => showView(b.dataset.view);
  b.onkeydown = (e) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (d) { const n = all[(i + d + all.length) % all.length]; n.focus(); n.click(); }
  };
});

let toastTimer;
function toast(msg) {
  const el = $("#toast"); el.textContent = msg; el.hidden = false;
  fx(el, { opacity: [0, 1], transform: ["translate(-50%, 8px)", "translate(-50%, 0)"] }, { duration: 0.2 });
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 4200);
}

/* ---------------- Putar otomatis ---------------- */
async function autoplay() {
  const btn = $("#autoplay");
  if (S.auto) { S.auto = false; btn.innerHTML = `${icon("play")}<span>Putar otomatis</span>`; return; }
  await abortScene();
  resetAll();
  S.auto = true; btn.innerHTML = `${icon("pause")}<span>Hentikan</span>`;
  whisperLoad().catch(() => {});
  showView("dapur");
  for (let i = 0; i < SCENES.length && S.auto; i++) { await runScene(i); await sleep(1400); }
  if (S.auto) toast("Demo selesai. Silakan coba sendiri setiap adegan.");
  S.auto = false; btn.innerHTML = `${icon("play")}<span>Putar otomatis</span>`;
}
function resetAll() {
  if (S.sim) clearTimeout(S.sim.timer);
  speechSynthesis?.cancel?.();
  const lang = S.lang; S = freshState(); S.lang = lang;
  $("#staff-msgs").innerHTML = ""; $("#owner-msgs").innerHTML = "";
  $("#composer").hidden = true; $("#sheet").hidden = true; $$("#staff > .composer:not(#composer)").forEach((x) => x.remove());
  renderTimeline(); renderDash(); renderLog(); renderFeed(); showClock();
  $("#staff-sub").textContent = `untuk staf · ${staffName()}`;
  $$("[data-sim]").forEach((b) => (b.disabled = false));
}

/* ---------------- Mulai ---------------- */
const sel = $("#lang");
sel.innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
sel.value = S.lang; // cegah browser memulihkan pilihan lama setelah muat ulang
sel.onchange = () => {
  S.lang = sel.value;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  $("#staff-sub").textContent = `untuk staf · ${staffName()}`;
  const changed = [];
  $$("#staff-msgs .b").forEach((el) => {
    if (!el._render) return;
    $(".txt", el).innerHTML = el._render(S.lang);
    el.lang = S.lang; el.dir = L().dir;
    el._bind?.(); el._sayLabel?.();
    $$(".acts button[data-k]", el).forEach((b) => (b.textContent = T[S.lang][b.dataset.k]));
    changed.push(el);
  });
  $("#num").placeholder = t("typeNum");
  fx(changed, { opacity: [0.35, 1] }, { duration: 0.35 });
  const note = findVoice(S.lang) ? "" : ` Suara ${L().label} belum terpasang di browser ini, jadi pesan suara tidak diputar.`;
  toast(`Percakapan staf sekarang dalam ${L().label}.${note}`);
};
$("#autoplay").onclick = autoplay;
$("#add-worker").onclick = addWorkerDialog;
$("#print").onclick = () => window.print();
$$("#v-dash [data-sim]").forEach(bindSim);
renderTimeline(); renderDash(); renderLog(); renderFeed(); renderStory(0); drawCharts(false);
if ("speechSynthesis" in window) speechSynthesis.getVoices();
// Mulai dengan adegan pertama agar ponsel tidak kosong
runScene(0);
