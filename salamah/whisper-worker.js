// Whisper di browser (transformers.js). Dipakai untuk laporan kejadian lewat pesan suara.
// shortcut: model "base" (~80 MB, diunduh sekali lalu di-cache browser); di produk berjalan di server Riyadh.
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";

let asr;
function load() {
  asr ??= pipeline("automatic-speech-recognition", "Xenova/whisper-base", {
    dtype: { encoder_model: "q8", decoder_model_merged: "q8" },
    progress_callback: (p) => { if (p.status === "progress") self.postMessage({ type: "progress", file: p.file, pct: p.progress }); },
  });
  return asr;
}

self.onmessage = async ({ data }) => {
  try {
    const run = await load();
    if (data.type === "load") return self.postMessage({ type: "ready" });
    // Hanya transkripsi: terjemahan Whisper-base terlalu lemah, terjemahan dikerjakan terpisah.
    const said = await run(data.audio, { language: data.lang, task: "transcribe", chunk_length_s: 30 });
    self.postMessage({ type: "result", id: data.id, text: said.text.trim() });
  } catch (e) {
    asr = undefined;
    self.postMessage({ type: "error", id: data.id, message: String(e?.message || e) });
  }
};
