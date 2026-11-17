const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rp = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");

// WhatsApp: satu nomor di <body data-wa>, pesan pembuka berbeda per tombol.
const wa = document.body.dataset.wa;
const waText = (name) => `Halo Haqiba, ${name ? `saya ${name}. Saya` : "saya"} mau ikut uji coba gratis.`;
const waUrl = (name) => `https://wa.me/${wa}?text=${encodeURIComponent(waText(name))}`;
console.assert(waText("Aminah") === "Halo Haqiba, saya Aminah. Saya mau ikut uji coba gratis.", "waText dengan nama");
console.assert(waText("") === "Halo Haqiba, saya mau ikut uji coba gratis.", "waText tanpa nama");

// href tetap diisi (tanpa nama) supaya link jalan walau dialog tidak tersedia.
for (const a of $$("[data-wa-from]")) {
  a.href = waUrl("");
  a.target = "_blank";
  a.rel = "noopener";
}

// Tanya nama dulu sebelum membuka WhatsApp.
const dlg = $("#wa-dialog");
if (dlg?.showModal) {
  const nameInput = $("input[name=nama]", dlg);
  const store = { get: () => { try { return localStorage.getItem("haqiba-nama") || ""; } catch { return ""; } },
                  set: (v) => { try { localStorage.setItem("haqiba-nama", v); } catch {} } };
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-wa-from]");
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return; // klik dengan modifier: biarkan link biasa
    e.preventDefault();
    nameInput.value = store.get();
    dlg.showModal();
    nameInput.focus();
  });
  $("form", dlg).addEventListener("submit", (e) => {
    if (e.submitter?.value === "batal") return; // method=dialog menutup sendiri
    const name = nameInput.value.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!name) { e.preventDefault(); nameInput.focus(); return; }
    store.set(name);
    window.open(waUrl(name), "_blank", "noopener");
  });
}

// Menu HP
const toggle = $(".nav__toggle"), menu = $("#menu");
const setMenu = (open) => { menu.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", String(open)); toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu"); };
toggle.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

// Kalkulator harga final
function calc({ rate, price, fee, ship, duty, buf }) {
  const base = Math.round(price * rate * (1 + buf / 100));
  const dutyRp = Math.round((base * duty) / 100 / 1000) * 1000; // perkiraan, dibulatkan ke ribuan
  return { base, extra: fee + ship, duty: dutyRp, total: base + fee + ship + dutyRp };
}
console.assert(calc({ rate: 4250, price: 170, fee: 0, ship: 293250, duty: 17.3, buf: 0 }).total === 1140750, "calc: contoh SAR 170 harus Rp1.140.750");

// Domestik: penjual dan pembeli di negara yang sama, jadi tanpa kurs dan bea.
function calcDomestic({ price, fee, ship }) {
  return { base: price, extra: fee + ship, total: price + fee + ship };
}
console.assert(calcDomestic({ price: 85, fee: 15, ship: 25 }).total === 125, "calcDomestic: contoh Madinah-Riyadh harus SAR 125");

const form = $("#calc");
const F = form.elements;
const UNIT = { SAR: "SAR", IDR: "Rp", AED: "AED", QAR: "QAR" };
const money = (code, n) => (code === "IDR" ? rp(n) : `${code} ${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`);
// Contoh awal per negara: [harga, fee, ongkir]
const EXAMPLE = { SAR: [85, 15, 25], IDR: [150000, 20000, 15000], AED: [90, 15, 20], QAR: [90, 15, 20] };
// Negara default mode domestik ditebak dari zona waktu perangkat; selain itu Arab Saudi.
const TZ = { "Asia/Riyadh": "SAR", "Asia/Dubai": "AED", "Asia/Qatar": "QAR", "Asia/Jakarta": "IDR", "Asia/Pontianak": "IDR", "Asia/Makassar": "IDR", "Asia/Jayapura": "IDR" };
F.dom.value = TZ[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? "SAR";

let mode = "intl";
const saved = {};
const num = (name, max = Infinity) => Math.min(max, Math.max(0, Number(F[name].value) || 0));
const fill = ([p, f, s]) => { F.price.value = p; F.fee.value = f; F.ship.value = s; };

const renderCalc = () => {
  const intl = mode === "intl", code = F.dom.value;
  const r = intl
    ? calc({ rate: num("cur"), price: num("price"), fee: num("fee"), ship: num("ship"), duty: num("duty", 100), buf: num("buf", 20) })
    : calcDomestic({ price: num("price"), fee: num("fee"), ship: num("ship") });
  for (const k of ["base", "extra", "duty", "total"]) if (k in r) $(`[data-o="${k}"]`, form).textContent = intl ? rp(r[k]) : money(code, r[k]);
  $$("[data-unit]", form).forEach((e) => { e.textContent = intl ? "Rp" : UNIT[code]; });
  $("[data-unit-price]", form).textContent = `(${intl ? F.cur.selectedOptions[0].textContent.split(" ")[0] : UNIT[code]})`;
  $('[data-l="base"]', form).textContent = intl ? "Harga dalam rupiah" : "Harga barang";
  $(".cf-out", form).classList.toggle("total-only", !F.detail.checked); // pembeli hanya melihat total
};

const setMode = (m) => {
  if (m === mode) return;
  saved[mode] = [F.price.value, F.fee.value, F.ship.value];
  mode = m;
  $$(".seg button", form).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
  $$(".only-intl", form).forEach((e) => { e.hidden = m !== "intl"; });
  $$(".only-dom", form).forEach((e) => { e.hidden = m !== "dom"; });
  fill(saved[m] ?? EXAMPLE[F.dom.value]);
  renderCalc();
};

$(".seg", form).addEventListener("click", (e) => { const b = e.target.closest("button[data-mode]"); if (b) setMode(b.dataset.mode); });
form.addEventListener("input", (e) => {
  if (e.target === F.dom) fill(EXAMPLE[F.dom.value]); // ganti negara = ganti mata uang, angka lama tidak relevan
  renderCalc();
});
form.addEventListener("submit", (e) => e.preventDefault());
renderCalc();

// Pengecek barang terbatas
const rules = {
  zamzam: ["no", "Tidak boleh dijual", "Air zamzam tidak boleh diperjualbelikan. Haqiba menolak produk ini di etalase."],
  kurma: ["warn", "Cek izin BPOM", "Makanan yang dijual ulang di Indonesia perlu izin BPOM."],
  parfum: ["warn", "Cek izin BPOM", "Kosmetik dan parfum yang dijual ulang di Indonesia perlu izin BPOM."],
  ponsel: ["warn", "Wajib registrasi IMEI", "Ponsel dari luar negeri harus didaftarkan IMEI-nya supaya bisa dipakai di Indonesia."],
  busana: ["ok", "Tidak ada peringatan khusus", "Busana dan sajadah bisa langsung dipajang. Bea tetap dihitung di harga final."],
};
const out = $(".checker__out");
$(".checker__chips").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-k]");
  if (!b) return;
  $$(".checker__chips button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  const [kind, title, text] = rules[b.dataset.k];
  out.innerHTML = `<p class="verdict verdict--${kind}"><b>${title}</b> ${text}</p>`;
});

// Animasi. Reduced motion atau CDN gagal: halaman tetap utuh dalam keadaan statis.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Motion dimuat sebagai script biasa (bukan module) supaya halaman juga jalan saat dibuka langsung dari file.
const M = reduce ? null : window.Motion ?? null;
if (!reduce && !M) console.warn("Animasi tidak tersedia: Motion gagal dimuat.");
heroDemo(M);
if (M) { chatSim(M); tripSim(M); mapSim(M); dashSim(M); expSim(M); tapSim(M); trackScroll(M); countUp(M); }

/* ---------- helpers ---------- */
// Titik tengah el relatif terhadap kotak isi box (tanpa border).
function center(box, el) {
  const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
  return [r.left - b.left - box.clientLeft + r.width / 2, r.top - b.top - box.clientTop + r.height / 2];
}
const UP = { opacity: [0, 1], transform: ["translateY(14px)", "translateY(0px)"] };
const POP = { opacity: [0, 1], transform: ["scale(0.9)", "scale(1)"] };
function tap(box, finger, el, t) {
  const [x, y] = center(box, el);
  const tr = (s) => `translate(${x}px, ${y}px) scale(${s})`;
  return [
    [finger, { opacity: [0, 1], transform: [tr(1.5), tr(1)] }, { at: t, duration: 0.35, ease: "easeOut" }],
    [finger, { transform: [tr(1), tr(0.7), tr(1)] }, { at: t + 0.45, duration: 0.3 }],
    [el, { transform: ["scale(1)", "scale(0.93)", "scale(1)"] }, { at: t + 0.45, duration: 0.3 }],
    [finger, { opacity: [1, 0] }, { at: t + 0.9, duration: 0.25 }],
  ];
}
// Jalankan animasi berulang hanya saat elemen terlihat.
function whileVisible({ inView }, el, start) {
  let anims = null;
  inView(el, () => {
    anims ??= start();
    anims.forEach((a) => a.play());
    return () => anims.forEach((a) => a.pause());
  }, { amount: 0.35 });
}

/* ---------- hero: demo produk ---------- */
function heroDemo(M) {
  const phone = $(".phone"), finger = $(".finger", phone);
  const screens = $$(".screen", phone), chaps = $$(".chap[data-chap]"), ctl = $(".chap--ctl");
  const bars = chaps.map((c) => $("i", c));
  const row = $(".chapters");
  const mark = (i) => {
    chaps.forEach((c, j) => c.setAttribute("aria-current", String(j === i)));
    // Di HP baris tombol bisa digeser: bawa tombol aktif ke tengah tanpa menggeser halaman.
    if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: chaps[i].offsetLeft - row.clientWidth / 2 + chaps[i].offsetWidth / 2, behavior: "smooth" });
  };

  if (!M) { // statis: tombol hanya mengganti layar
    mark(1);
    chaps.forEach((c, i) => c.addEventListener("click", () => {
      screens.forEach((s, j) => { s.style.opacity = j === i ? "1" : "0"; s.style.visibility = j === i ? "visible" : "hidden"; });
      mark(i);
    }));
    return;
  }

  const { animate, stagger, inView } = M;
  const s = screens;
  const enter = (scr) => [scr, { opacity: [0, 1], transform: ["translateX(30px)", "translateX(0px)"] }, { at: 0, duration: 0.45, ease: "easeOut" }];
  const T = (scr, el, t) => tap(phone, finger, $(el, scr), t);
  const G = "#DDF7E8", W = "#FFFFFF";

  const chapters = [
    () => [4.6, [enter(s[0]),
      [$$(".nfc__ring", s[0]), { transform: ["scale(0.5)", "scale(1)"] }, { at: 0.3, duration: 0.6, delay: stagger(0.15), ease: "easeOut" }],
      [$(".notif", s[0]), { opacity: [0, 1], transform: ["translateY(40px)", "translateY(0px)"] }, { at: 1.4, duration: 0.45, ease: "easeOut" }],
      ...T(s[0], ".notif__btn", 2.6)]],
    () => [4.6, [enter(s[1]),
      [$$(".prod", s[1]), UP, { at: 0.35, duration: 0.35, delay: stagger(0.15) }],
      ...T(s[1], ".add", 1.6),
      [$(".cartbar", s[1]), { opacity: [0, 1], transform: ["translateY(50px)", "translateY(0px)"] }, { at: 2.4, duration: 0.4, ease: "easeOut" }]]],
    () => [5, [enter(s[2]),
      [$$(".hotel", s[2]), UP, { at: 0.35, duration: 0.3, delay: stagger(0.12) }],
      ...T(s[2], ".hotel--pick", 1.2),
      [$(".hotel--pick", s[2]), { backgroundColor: [W, G] }, { at: 1.65, duration: 0.2 }],
      [$(".typed", s[2]), { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"] }, { at: 2.1, duration: 0.8, ease: "linear" }],
      ...T(s[2], ".cta-in", 3.4)]],
    () => [5, [enter(s[3]),
      [$$(".step", s[3]), UP, { at: 0.4, duration: 0.35, delay: stagger(0.5) }],
      [$(".photo", s[3]), POP, { at: 2.0, duration: 0.4 }],
      [$(".toast", s[3]), POP, { at: 3.0, duration: 0.35 }]]],
    () => [5.2, [enter(s[4]),
      [$$(".r", s[4]), UP, { at: 0.4, duration: 0.3, delay: stagger(0.3) }],
      ...T(s[4], ".cta-in", 3.5)]],
    () => [4.8, [enter(s[5]),
      [$$(".t", s[5]), UP, { at: 0.4, duration: 0.35, delay: stagger(0.5) }]]],
  ];

  let cur = null, visible = false, paused = false;
  function play(i) {
    cur?.stop();
    mark(i);
    const [dur, seq] = chapters[i]();
    // Reset lewat animasi juga: animasi yang sudah selesai menahan nilai akhirnya di atas inline style.
    seq.push(
      [screens.filter((_, j) => j !== i), { opacity: 0 }, { at: 0, duration: 0.2 }],
      [bars.filter((_, j) => j !== i), { transform: "scaleX(0)" }, { at: 0, duration: 0.01 }],
      [bars[i], { transform: ["scaleX(0)", "scaleX(1)"] }, { at: 0, duration: dur, ease: "linear" }],
    );
    cur = animate(seq);
    curIdx = i;
    curDur = dur;
    if (paused || !visible) cur.pause();
  }
  // shortcut: polling status, karena `finished` tidak resolve setelah pause() lalu play(); ganti kalau Motion memperbaikinya.
  let curIdx = 0, curDur = 0;
  setInterval(() => {
    if (cur && !paused && visible && (cur.state === "finished" || cur.time >= curDur - 0.02)) play((curIdx + 1) % chapters.length);
  }, 150);
  const setPaused = (p) => { paused = p; ctl.setAttribute("aria-pressed", String(p)); $("span", ctl).textContent = p ? "Putar" : "Jeda"; p ? cur.pause() : visible && cur.play(); };

  phone.classList.add("is-live");
  chaps.forEach((c, i) => c.addEventListener("click", () => { paused = false; setPaused(false); play(i); }));
  ctl.hidden = false;
  ctl.addEventListener("click", () => setPaused(!paused));
  inView(".stage", () => { visible = true; if (!paused) cur?.play(); return () => { visible = false; cur?.pause(); }; });
  play(0);
}

/* ---------- fitur ---------- */
function chatSim(M) {
  const box = $('[data-sim="chat"]');
  const fing = $(".finger", box), [b1, b2, link, sys] = $$(".bub", box);
  whileVisible(M, box, () => [M.animate([
    [b1, UP, { at: 0.3, duration: 0.35 }],
    [b2, UP, { at: 1.4, duration: 0.35 }],
    [link, UP, { at: 2.4, duration: 0.35 }],
    ...tap(box, fing, link, 3.1),
    [sys, POP, { at: 4.2, duration: 0.4 }],
    [[b1, b2, link, sys], { opacity: [1, 0] }, { at: 7, duration: 0.4 }],
  ], { repeat: Infinity })]);
}

function tripSim(M) {
  const box = $('[data-sim="trip"]'), orders = $$(".to", box), closed = $(".trip__closed", box);
  const kgEl = $("[data-kg]", box), cd = $("[data-cd]", box), bar = $(".tquota", box), fill = $("span", bar);
  const steps = [[0.8, 15.5], [1.8, 19], [2.8, 22.4], [3.8, 25]], total = 7.5;
  const two = (n) => String(Math.floor(n)).padStart(2, "0");
  whileVisible(M, box, () => [
    M.animate([
      [orders, UP, { at: 0.8, duration: 0.3, delay: M.stagger(1) }],
      [closed, POP, { at: 4.4, duration: 0.35 }],
      [box, { opacity: [1, 1] }, { at: total - 0.01, duration: 0.01 }],
    ], { repeat: Infinity }),
    M.animate(0, total, { duration: total, ease: "linear", repeat: Infinity, onUpdate: (t) => {
      let kg = 12;
      for (const [at, v] of steps) if (t >= at) kg = v;
      kgEl.textContent = String(kg).replace(".", ",");
      fill.style.transform = `scaleX(${kg / 25})`;
      bar.classList.toggle("is-full", kg >= 25);
      const s = 8049 - Math.floor(t); // 02:14:09 berjalan mundur
      cd.textContent = `${two(s / 3600)}:${two((s % 3600) / 60)}:${two(s % 60)}`;
    } }),
  ]);
}

function expSim(M) {
  const box = $('[data-sim="exp"]'), fing = $(".finger", box);
  const btn = $(".exp__btn", box), opts = $$(".opt", box), csv = $(".fmt--on", box);
  whileVisible(M, box, () => [M.animate([
    ...tap(box, fing, btn, 0.3),
    [opts, { opacity: [0.3, 1], transform: ["scale(0.9)", "scale(1)"] }, { at: 1.1, duration: 0.25, delay: M.stagger(0.2) }],
    ...tap(box, fing, csv, 1.9),
    [csv, { opacity: [0.3, 1] }, { at: 2.3, duration: 0.2 }],
    [$(".exp__file", box), UP, { at: 2.8, duration: 0.35 }],
    [$(".exp__prog i", box), { transform: ["scaleX(0)", "scaleX(1)"] }, { at: 3.0, duration: 1.1, ease: "easeInOut" }],
    [$$(".sr", box), UP, { at: 4.2, duration: 0.25, delay: M.stagger(0.15) }],
    [$(".exp__ok", box), POP, { at: 5.0, duration: 0.3 }],
    [box, { opacity: [1, 1] }, { at: 7.99, duration: 0.01 }],
  ], { repeat: Infinity })]);
}

function mapSim(M) {
  const box = $('[data-sim="map"]'), path = $("#route", box), dot = $(".m-courier", box), st = $(".map__st", box);
  const len = path.getTotalLength();
  const place = (p) => { const pt = path.getPointAtLength(len * p); dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y); };
  place(1);
  whileVisible(M, box, () => [M.animate(0, 1, {
    duration: 6, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.5,
    onUpdate: (p) => { place(p); st.textContent = p < 0.98 ? "Kurir dalam perjalanan" : "Diserahkan di lobi, 16.42"; },
  })]);
}

function dashSim(M) {
  const box = $('[data-sim="dash"]'), rows = $$(".drow", box), oks = $$(".st .ok", box), profit = $("[data-profit]", box);
  const steps = [[1.6, 46], [2.4, 79], [3.2, 96], [4.4, 168]], total = 7.5;
  whileVisible(M, box, () => [
    M.animate([
      [rows, UP, { at: 0.2, duration: 0.3, delay: M.stagger(0.15) }],
      ...steps.map(([t], i) => [oks[i], POP, { at: t, duration: 0.3 }]),
      [$(".ding", box), POP, { at: 4.4, duration: 0.35 }],
      [box, { opacity: [1, 1] }, { at: total - 0.01, duration: 0.01 }],
    ], { repeat: Infinity }),
    M.animate(0, total, { duration: total, ease: "linear", repeat: Infinity, onUpdate: (t) => {
      let v = 0; for (const [at, sar] of steps) if (t >= at) v = sar;
      profit.textContent = `SAR ${v}`;
    } }),
  ]);
}

function tapSim(M) {
  const box = $('[data-sim="tap"]'), ph = $(".miniphone", box), sticker = $(".sticker", box);
  const kids = [...$(".miniphone__scr", box).children];
  whileVisible(M, box, () => {
    const dx = center(box, sticker)[0] - center(box, ph)[0];
    const to = `translateX(${dx}px) rotate(-8deg)`, from = "translateX(0px) rotate(0deg)";
    return [M.animate([
      [kids, { opacity: [0, 0] }, { at: 0, duration: 0.01 }],
      [ph, { transform: [from, to] }, { at: 0.4, duration: 0.8, ease: "easeInOut" }],
      [$$(".ripple", box), { opacity: [0.9, 0], transform: ["scale(1)", "scale(1.7)"] }, { at: 1.2, duration: 0.9, delay: M.stagger(0.3) }],
      [ph, { transform: [to, from] }, { at: 2.2, duration: 0.7, ease: "easeInOut" }],
      [kids, UP, { at: 2.5, duration: 0.3, delay: M.stagger(0.12) }],
      [kids, { opacity: [1, 1] }, { at: 5.6, duration: 0.01 }],
    ], { repeat: Infinity })];
  });
}

function trackScroll(M) {
  const list = $('[data-sim="track"]'), items = $$("li", list);
  list.classList.add("is-live");
  M.scroll((p) => items.forEach((li, i) => li.classList.toggle("on", p >= i / (items.length - 1) - 0.001)),
    { target: list, offset: ["start 85%", "end 55%"] });
}

function countUp(M) {
  for (const el of $$("[data-count]")) {
    const to = Number(el.dataset.count), dec = Number(el.dataset.dec);
    const suffix = el.textContent.replace(/^[\d.,]+/, "");
    const fmt = (v) => v.toLocaleString("id-ID", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
    M.inView(el, () => { M.animate(0, to, { duration: 1.2, ease: "easeOut", onUpdate: (v) => { el.textContent = fmt(v); } }); }, { amount: 0.6 });
  }
}
