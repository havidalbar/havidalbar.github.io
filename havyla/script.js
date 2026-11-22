// Tanggal acara (WIB = +07:00)
const WEDDING_DATE = new Date("2027-05-22T08:00:00+07:00");

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Animasi pakai Motion (sama seperti Haqiba). Reduced motion atau CDN gagal: halaman tetap utuh dalam keadaan statis.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const M = reduce ? null : window.Motion ?? null;
if (!reduce && !M) console.warn("Animasi tidak tersedia: Motion gagal dimuat.");
const EASE = [0.22, 1, 0.36, 1]; // easeOut lembut, cocok untuk undangan
const SPRING = { type: "spring", bounce: 0.35, visualDuration: 0.45 };
const hide = (el) => { el.style.opacity = "0"; };

// Pecah teks jadi span per huruf; aria-label menjaga teks tetap terbaca screen reader.
function split(el) {
  const text = el.textContent;
  el.setAttribute("aria-label", text);
  el.textContent = "";
  return [...text].map((c) => {
    const s = document.createElement("span");
    s.className = "ch"; s.textContent = c; s.setAttribute("aria-hidden", "true");
    el.append(s);
    return s;
  });
}

// Nama tamu dari URL: index.html?to=Budi%20Santoso
const guest = new URLSearchParams(location.search).get("to");
if (guest) $("#guest").textContent = $("#nav-guest").textContent = guest;

/* ---------- Intro + cover ---------- */
let profileLoops = [];
function introAndCover() {
  const letters = split($("#intro .brand"));
  const cv = $$(".cv");
  letters.forEach(hide); cv.forEach(hide);
  M.animate([
    [letters, { opacity: [0, 1], scale: [2.2, 1], filter: ["blur(14px)", "blur(0px)"] }, { duration: 0.7, delay: M.stagger(0.07), ease: EASE }],
    ["#intro .brand", { filter: ["drop-shadow(0 0 0px #e50914)", "drop-shadow(0 0 28px #e50914)"] }, { duration: 0.5 }],
    ["#intro .brand", { scale: [1, 16], opacity: [1, 0] }, { duration: 1, ease: [0.7, 0, 0.84, 0], at: "+0.35" }],
    ["#intro", { opacity: [1, 0] }, { duration: 0.4, at: "-0.35" }],
    [cv, { opacity: [0, 1], y: [24, 0] }, { duration: 0.7, delay: M.stagger(0.15), ease: EASE }],
  ]).finished.then(() => {
    $("#intro")?.remove();
    // profil "hidup": berkedip + berpendar
    profileLoops = [
      M.animate(".profile .eye", { scaleY: [1, 0.1, 1] }, { duration: 0.3, repeat: Infinity, repeatDelay: 3.2 }),
      M.animate(".profile", { filter: ["drop-shadow(0 0 0px rgba(229,9,20,0))", "drop-shadow(0 0 18px rgba(229,9,20,.85))"] },
        { duration: 1.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }),
    ];
  });

  // hover: profil membesar dengan spring, senyum melebar
  M.hover("#open", () => {
    M.animate(".profile", { scale: 1.08 }, SPRING);
    M.animate(".profile .smile", { scaleX: 1.12, scaleY: 1.35 }, SPRING);
    return () => {
      M.animate(".profile", { scale: 1 }, SPRING);
      M.animate(".profile .smile", { scaleX: 1, scaleY: 1 }, SPRING);
    };
  });
}

const music = $("#music");
const musicBtn = $("#music-btn");
const syncMusicBtn = () => { musicBtn.classList.toggle("paused", music.paused); musicBtn.classList.toggle("playing", !music.paused); };
music.onplay = music.onpause = syncMusicBtn;
let musicOff = false; // tamu sengaja mematikan musik lewat tombol, jangan dinyalakan otomatis
musicBtn.onclick = () => { musicOff = !music.paused; musicOff ? music.pause() : music.play().catch(() => {}); };

/* ---------- Video prewedding (YouTube) ---------- */
// Browser hanya mengizinkan autoplay tanpa suara, jadi video diputar mute saat terlihat; tombol Putar menyalakan suara dari awal.
const playBtn = $("#play"), trailer = playBtn.parentElement;
let yt = null, ytMuted = true, ytState = -1, ytAudible = false;
const ytCmd = (func, args = []) => yt?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
const exitPageFullscreen = () => {
  // halaman yang sudah fullscreen membuat tombol fullscreen video tidak berfungsi, jadi fullscreen halaman dilepas
  if (document.fullscreenElement === document.documentElement) document.exitFullscreen().catch(() => {});
};
// file:// tidak mengirim referrer, sehingga YouTube selalu menolak (Error 153); di sana tombol membuka YouTube langsung
const ytBlocked = location.protocol === "file:";
function loadYT() {
  if (yt || ytBlocked) return;
  const id = trailer.dataset.yt;
  yt = document.createElement("iframe");
  // tanpa referrer YouTube menolak dengan "Error 153 / error konfigurasi", jadi kebijakan referrer diset eksplisit
  yt.referrerPolicy = "strict-origin-when-cross-origin";
  yt.src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}&rel=0&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  yt.title = "Prewedding Clip of Ayla & Havid";
  yt.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  yt.allowFullscreen = true;
  // minta YouTube mengirim status pemutar (dipakai untuk mengatur musik latar)
  yt.onload = () => yt.contentWindow.postMessage(JSON.stringify({ event: "listening" }), "*");
  trailer.append(yt); trailer.classList.add("playing");
  playBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>Suara';
  playBtn.setAttribute("aria-label", "Nyalakan suara video prewedding");
}
function ytWithSound() {
  exitPageFullscreen();
  ytCmd("seekTo", [0, true]); ytCmd("unMute"); ytCmd("playVideo");
}
playBtn.onclick = () => {
  if (ytBlocked) { open(`https://youtu.be/${trailer.dataset.yt}`, "_blank", "noopener"); return; }
  if (!yt) { loadYT(); yt.addEventListener("load", ytWithSound, { once: true }); } else ytWithSound();
  if (M) M.animate(playBtn, { scale: [1, 1.4], opacity: [1, 0] }, { duration: 0.3 }).finished.then(() => { playBtn.hidden = true; });
  else playBtn.hidden = true;
};
addEventListener("message", (e) => {
  if (!yt || e.source !== yt.contentWindow) return;
  let d; try { d = JSON.parse(e.data); } catch { return; }
  if (typeof d.info?.muted === "boolean") ytMuted = d.info.muted;
  const state = d.event === "onStateChange" ? d.info : d.info?.playerState;
  if (typeof state === "number") ytState = state;
  // video bersuara (diputar & tidak mute) = musik berhenti; dijeda/selesai/mute = musik menyala lagi
  const audible = ytState === 1 && !ytMuted;
  if (audible === ytAudible) return;
  ytAudible = audible;
  if (audible) { music.pause(); lbVid.pause(); playBtn.hidden = true; } else resumeMusic();
});

/* ---------- Autoplay saat terlihat ---------- */
const thumbs = $$(".thumb > video");
const autoplay = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
  if (target === trailer) { if (isIntersecting) loadYT(); return; }
  if (isIntersecting) {
    if (!target.src) target.src = target.parentElement.dataset.video;
    target.play().catch(() => {});
  } else target.pause();
}), { threshold: 0.5 });
if (!reduce) [trailer, ...thumbs].forEach((el) => autoplay.observe(el));

/* ---------- Popup foto & video episode ---------- */
const lb = $("#lightbox"), lbImg = $("img", lb), lbVid = $("video", lb), lbCap = $(".lb-cap", lb);
// musik latar dan video tidak berbunyi bersamaan
const resumeMusic = () => { if (!musicOff && !ytAudible && lbVid.paused) music.play().catch(() => {}); };
music.addEventListener("play", () => { if (ytAudible) ytCmd("pauseVideo"); lbVid.pause(); });
lbVid.addEventListener("play", () => { exitPageFullscreen(); if (ytAudible) ytCmd("pauseVideo"); music.pause(); });
lbVid.addEventListener("pause", resumeMusic);
lbVid.addEventListener("ended", resumeMusic);
function openPhoto(el) {
  const img = $("img", el), video = el.dataset.video, thumb = $("video", el);
  if (!img && !video) return; // foto belum ada
  lbImg.hidden = !!video; lbVid.hidden = !video;
  if (video) {
    thumb?.pause();
    lbVid.src = video; lbVid.poster = thumb?.poster || "";
    if (thumb?.currentTime) lbVid.currentTime = 0;
    lbVid.play().catch(() => {});
  } else { lbImg.src = img.src; lbImg.alt = img.alt; }
  lbCap.textContent = el.dataset.caption || img?.alt || "";
  lb.showModal();
  if (M) M.animate(lb, { opacity: [0, 1], scale: [0.9, 1] }, SPRING);
}
async function closePhoto() {
  lbVid.pause();
  if (M) await M.animate(lb, { opacity: 0, scale: 0.94 }, { duration: 0.2 }).finished;
  lb.close();
  lb.style.opacity = lb.style.transform = "";
  if (!lbVid.hidden) {
    lbVid.removeAttribute("src"); lbVid.load();
    thumbs.forEach((v) => v.src && v.play().catch(() => {})); // pratinjau mute lanjut lagi
  }
}
$$("[data-zoom]").forEach((el) => {
  el.onclick = () => openPhoto(el);
  el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPhoto(el); } };
});
$(".lb-close").onclick = closePhoto;
lb.onclick = (e) => { if (e.target === lb) closePhoto(); }; // klik di luar foto
lb.addEventListener("cancel", (e) => { e.preventDefault(); closePhoto(); }); // tombol Esc / back

let opened = false;
async function openInvitation() {
  if (opened) return;
  opened = true;
  musicBtn.hidden = false;
  music.play().catch(syncMusicBtn);
  document.documentElement.requestFullscreen?.().catch(() => {});

  const finish = () => {
    $("#cover")?.remove();
    $("#intro")?.remove();
    document.body.classList.remove("locked");
  };
  if (!M) return finish();
  try {
    profileLoops.forEach((a) => a.stop());
    // transisi pilih profil: profil zoom memenuhi layar seperti Netflix
    M.animate([
      [".cv:not(.profile-btn), #guest", { opacity: 0, y: -12 }, { duration: 0.35, ease: "easeIn" }],
      [".profile", { scale: 5 }, { duration: 0.9, ease: [0.65, 0, 0.35, 1], at: 0.1 }],
      [".profile", { opacity: 0 }, { duration: 0.4, at: 0.6 }],
      ["#cover", { opacity: 0 }, { duration: 0.5, at: 0.55 }],
    ]);
  } catch {}
  // halaman muncul di tengah zoom (tidak menunggu animasi selesai), jadi tidak bisa macet di layar hitam
  setTimeout(() => {
    try { heroIn(); } catch { $$(".hero .up, .hero-bg, #nav").forEach((el) => { el.style.opacity = 1; el.style.transform = el.style.filter = "none"; }); }
  }, 550);
  setTimeout(finish, 1100);
}
$("#open").onclick = $("#open2").onclick = openInvitation;

/* ---------- Hero ---------- */
function heroIn() {
  M.animate(".hero-bg", { opacity: [0, 1], scale: [1.25, 1] }, { duration: 1.8, ease: EASE });
  M.animate(".hero .up", { opacity: [0, 1], y: [30, 0], filter: ["blur(6px)", "blur(0px)"] },
    { duration: 0.9, delay: M.stagger(0.12, { startDelay: 0.4 }), ease: EASE });
  M.animate("#nav", { opacity: [0, 1], y: [-20, 0] }, { duration: 0.6, delay: 0.8, ease: EASE });
  // parallax: foto turun lebih lambat dan teks memudar saat discroll
  const hero = $("#hero");
  M.scroll(M.animate(".hero-bg", { y: [0, 160] }, { ease: "linear" }), { target: hero, offset: ["start start", "end start"] });
  M.scroll(M.animate(".hero-content", { opacity: [1, 0], y: [0, -60] }, { ease: "linear" }), { target: hero, offset: ["center center", "end start"] });
  M.scroll(M.animate("#progress", { scaleX: [0, 1] }, { ease: "linear" }));
}

/* ---------- Reveal saat scroll ---------- */
const FROM = { up: { y: [40, 0] }, left: { x: [-60, 0] }, right: { x: [60, 0] }, zoom: { scale: [0.88, 1] } };
const reveal = (targets, kind, opts) =>
  M.animate(targets, { opacity: [0, 1], filter: ["blur(8px)", "blur(0px)"], ...FROM[kind] }, { duration: 1, ease: EASE, ...opts });

function setupReveals() {
  $$(".hero-bg, .hero .up").forEach(hide);
  $$("[data-a]").forEach((el) => {
    hide(el);
    M.inView(el, () => { reveal(el, el.dataset.a); }, { amount: 0.25 });
  });
  $$("[data-stagger]").forEach((g) => {
    const kids = [...g.children];
    kids.forEach(hide);
    M.inView(g, () => { reveal(kids, g.dataset.stagger || "up", { delay: M.stagger(0.12) }); }, { amount: 0.2 });
  });
  // judul: huruf naik satu per satu, lalu garis merah memanjang
  $$("main .split").forEach((h) => {
    const chars = split(h);
    chars.forEach(hide);
    h.classList.add("pre");
    M.inView(h, () => {
      h.classList.remove("pre");
      M.animate(chars, { opacity: [0, 1], y: [28, 0], rotate: [10, 0] }, { duration: 0.6, delay: M.stagger(0.035), ease: EASE });
    }, { amount: 0.5 });
  });
}

/* ---------- Peta: kartu terbuka, rute tergambar, pin jatuh, lalu gelombang berdenyut ---------- */
function mapAnim() {
  const card = $("#map-card"), path = $(".route path", card), pin = $(".pin", card);
  const ripples = $$(".ripple", card), info = [...$(".map-info", card).children];
  [card, pin, ...info].forEach(hide);
  path.setAttribute("stroke-dashoffset", "1"); // rute disembunyikan, lalu digambar
  M.inView(card, () => {
    // shortcut: Motion tidak menganimasikan path SVG ini, jadi stroke-dashoffset diatur manual lewat onUpdate.
    M.animate(1, 0, { duration: 1.4, delay: 0.6, ease: "easeInOut", onUpdate: (v) => path.setAttribute("stroke-dashoffset", v) });
    M.animate([
      [card, { opacity: [0, 1], clipPath: ["inset(0% 0% 100% 0% round 10px)", "inset(0% 0% 0% 0% round 10px)"] }, { duration: 0.9, ease: EASE }],
      [pin, { opacity: [0, 1], y: [-120, 0] }, { type: "spring", bounce: 0.5, visualDuration: 0.6, at: "-0.3" }],
      [info, { opacity: [0, 1], y: [16, 0] }, { duration: 0.6, delay: M.stagger(0.1), ease: EASE, at: "-0.3" }],
    ]).finished.then(() => {
      M.animate(ripples, { opacity: [0.9, 0], scale: [0.4, 2.4] }, { duration: 2, repeat: Infinity, delay: M.stagger(0.65), ease: "easeOut" });
      M.animate(pin, { y: [0, -8, 0] }, { duration: 1.6, repeat: Infinity, repeatDelay: 0.4, ease: "easeInOut" });
    });
  }, { amount: 0.35 });
}

function ayatAnim() {
  const el = $(".arab"), orns = $$(".orn");
  // huruf Arab tersambung, jadi dipecah per kata, bukan per huruf
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  const spans = words.map((w, i) => {
    const s = document.createElement("span");
    s.className = "w"; s.textContent = w;
    el.append(s, i < words.length - 1 ? " " : "");
    return s;
  });
  [...spans, ...orns].forEach(hide);
  M.inView(orns[0], () => { M.animate(orns[0], { opacity: [0, 1], scaleX: [0.3, 1] }, { duration: 1.1, ease: EASE }); }, { amount: 1 });
  M.inView(el, () => {
    M.animate(spans, { opacity: [0, 1], y: [14, 0], filter: ["blur(6px)", "blur(0px)"] }, { duration: 0.7, delay: M.stagger(0.12), ease: EASE });
    M.animate(orns[1], { opacity: [0, 1], scaleX: [0.3, 1] }, { duration: 1, delay: spans.length * 0.12, ease: EASE });
  }, { amount: 0.4 });
}

if (M) { introAndCover(); setupReveals(); mapAnim(); ayatAnim(); } else $("#intro").remove();

// navbar jadi hitam solid saat discroll
addEventListener("scroll", () => $("#nav").classList.toggle("solid", scrollY > 60), { passive: true });

/* ---------- Countdown ---------- */
const pad = (n) => String(n).padStart(2, "0");
function set(id, v) {
  const el = document.getElementById(id);
  if (el.textContent === v) return;
  el.textContent = v;
  if (M && opened) { M.animate(el, { y: [-18, 0] }, SPRING); M.animate(el, { opacity: [0, 1] }, { duration: 0.25 }); }
}
function tick() {
  const diff = Math.max(0, WEDDING_DATE - Date.now()) / 1000;
  set("d", pad(Math.floor(diff / 86400)));
  set("h", pad(Math.floor(diff % 86400 / 3600)));
  set("m", pad(Math.floor(diff % 3600 / 60)));
  set("s", pad(Math.floor(diff % 60)));
}
tick(); setInterval(tick, 1000);

/* ---------- Wedding gift ---------- */
const tabs = $$("[data-tab]"), ind = $(".tab-ind");
// kilau melintas di kartu, seperti kartu ATM terkena cahaya
const shine = (panel) => M && M.animate($$(".shine", panel), { transform: ["translateX(-120%)", "translateX(120%)"] },
  { duration: 1.2, delay: M.stagger(0.25, { startDelay: 0.5 }), ease: "easeInOut" });
tabs.forEach((t, i) => t.onclick = () => {
  if (t.getAttribute("aria-selected") === "true") return;
  tabs.forEach((x) => x.setAttribute("aria-selected", x === t));
  $$(".gift-panel").forEach((p) => p.hidden = p.id !== t.dataset.tab);
  const panel = $(`#${t.dataset.tab}`);
  if (!M) { ind.style.transform = `translateX(${i * 100}%)`; return; }
  M.animate(ind, { x: `${i * 100}%` }, { type: "spring", bounce: 0.25, visualDuration: 0.4 });
  M.animate([...panel.children], { opacity: [0, 1], y: [24, 0], rotateX: [12, 0] }, { duration: 0.6, delay: M.stagger(0.1), ease: EASE });
  shine(panel);
});
if (M) M.inView("#cashless", () => { shine($("#cashless")); }, { amount: 0.5 });

$$(".copy").forEach((b) => b.onclick = async () => {
  const label = $("span", b), text = label.textContent;
  try { await navigator.clipboard.writeText(b.dataset.copy); label.textContent = "Tersalin"; b.classList.add("done"); }
  catch { label.textContent = "Gagal menyalin"; }
  if (M) M.animate(b, { scale: [0.9, 1] }, SPRING);
  setTimeout(() => { label.textContent = text; b.classList.remove("done"); }, 1600);
});

/* ---------- Ucapan ---------- */
// URL Web App Apps Script (lihat apps-script.gs). Kosong = ucapan hanya disimpan di browser pengirim.
const SHEET_URL = "https://script.google.com/macros/s/AKfycbwU_mGUVGrFrsjlHwZ9Z9goBxf53pgdHed8hoNatDLlfAovGZesDaIKCTpSAuGt6HR5/exec";
const COLORS = ["#fbd3dc", "#c8f0d0", "#e0d4fb", "#fff1b8", "#d4ecfb"];
const KEY = "wishes";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
let list = SHEET_URL ? [] : load();

function render() {
  $("#wishes").replaceChildren(...list.map((w, i) => {
    const el = document.createElement("div");
    el.className = "wish";
    el.innerHTML = `<div class="avatar"></div><div><b></b><span class="att"></span><p></p><small></small></div>`;
    const av = $(".avatar", el);
    av.textContent = w.name.slice(0, 2).toUpperCase();
    av.style.background = COLORS[i % COLORS.length];
    $("b", el).textContent = w.name; // textContent: cegah XSS dari input tamu
    const att = $(".att", el);
    att.textContent = w.att === "Hadir" && w.count > 1 ? `Hadir · ${w.count} orang` : w.att || "";
    att.hidden = !w.att; // dari sheet: kehadiran tidak ditampilkan
    att.classList.toggle("no", w.att === "Berhalangan" || w.att === "Tidak Hadir");
    att.classList.toggle("maybe", w.att === "Masih Ragu");
    $("p", el).textContent = w.msg;
    $("small", el).textContent = !w.at ? "" : new Date(w.at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
    return el;
  }));
}

const form = $("#wish-form"), guestsBox = $("#guests"), countEl = $("#w-count"), err = $("#w-err");
let count = 1;
form.addEventListener("input", () => { err.textContent = ""; });
// jumlah tamu hanya muncul kalau memilih Hadir
form.addEventListener("change", (e) => {
  if (e.target.name !== "att") return;
  if (M) M.animate(e.target.nextElementSibling, { scale: [0.92, 1] }, SPRING);
  const show = e.target.value === "Hadir";
  if (show === !guestsBox.hidden) return;
  guestsBox.hidden = !show;
  if (show && M) M.animate(guestsBox, { opacity: [0, 1], height: [0, guestsBox.offsetHeight] }, { duration: 0.35, ease: EASE });
});
$$("[data-step]", form).forEach((b) => b.onclick = () => {
  count = Math.min(5, Math.max(1, count + Number(b.dataset.step)));
  countEl.textContent = count;
  if (M) M.animate(countEl, { scale: [1.4, 1] }, SPRING);
});
$("#w-msg").addEventListener("input", (e) => { $("#w-left").textContent = `${e.target.value.length}/500`; });

if (guest) $("#w-name").value = guest;
form.onsubmit = async (e) => {
  e.preventDefault();
  const att = form.querySelector("[name=att]:checked")?.value;
  const w = { name: $("#w-name").value.trim(), att, count: att === "Hadir" ? count : 0, msg: $("#w-msg").value.trim(), at: Date.now() };
  err.textContent = !w.name ? "Mohon isi nama Anda." : !att ? "Mohon pilih konfirmasi kehadiran." : !w.msg ? "Mohon tulis doa & ucapan." : "";
  if (err.textContent) { if (M) M.animate(form, { x: [0, -8, 8, -5, 5, 0] }, { duration: 0.4 }); return; }
  // optimis: langsung tampil, kirim ke sheet di belakang; kalau gagal, ucapan ditarik dan isian dikembalikan
  list = [w, ...list];
  form.reset(); count = 1; countEl.textContent = "1"; guestsBox.hidden = true; $("#w-left").textContent = "0/500";
  render();
  if (M) M.animate("#wishes .wish:first-child", { opacity: [0, 1], y: [-20, 0], scale: [0.95, 1] }, SPRING);
  if (!SHEET_URL) { try { localStorage.setItem(KEY, JSON.stringify([w, ...load()])); } catch {} return; }
  try {
    // text/plain: tanpa preflight CORS, Apps Script tetap bisa membaca body
    const res = await fetch(SHEET_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ ...w, to: guest || "" }) });
    if (!(await res.json()).ok) throw 0;
  } catch {
    list = list.filter((x) => x !== w); render();
    $("#w-name").value = w.name; $("#w-msg").value = w.msg; $("#w-left").textContent = `${w.msg.length}/500`;
    form.querySelector(`[name=att][value="${w.att}"]`).checked = true;
    if (w.att === "Hadir") { count = w.count; countEl.textContent = count; guestsBox.hidden = false; }
    err.textContent = "Gagal mengirim, periksa koneksi lalu coba lagi.";
  }
};
render();
if (SHEET_URL) fetch(SHEET_URL).then((r) => r.json()).then((l) => { list = l; render(); }).catch(() => {});
