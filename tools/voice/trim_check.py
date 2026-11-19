#!/usr/bin/env python3
"""Pick the best take of each spoken line, cut it cleanly to the speech, and check it says the right thing
(Whisper, MIT, OpenAI).

    WHISPER_PY tools/voice/trim_check.py LINES.json IN_DIR OUT_DIR       # takes → best take, trimmed → OUT_DIR
    WHISPER_PY tools/voice/trim_check.py LINES.json --verify ASSET_DIR   # check the final m4a clips

Takes: IN_DIR/<lang>-<line>.wav and any extra takes IN_DIR/<lang>-<line>.t<N>.wav (render_chatterbox.py
--takes). Each take is transcribed with word timestamps and compared with the script (words; for ja the
kana reading via pykakasi, for zh pinyin via pypinyin, when installed — Whisper writes kanji/homophones).
The take with the best score wins: similarity, minus a penalty for words heard after the script's end (a
mumble, a repeated phrase) and for being much slower than the language's other takes (a loop). The winner
is cut with endpoint.py: energy-based speech end guided by the last script word, +80 ms, 50 ms fade to
exactly 0, 60 ms digital silence; pauses over 0.35 s shortened. A line is redone only when a take is newer
than OUT_DIR/<lang>-<line>.wav. Score < 0.7 (ja/zh readings < 0.6) → SUSPICIOUS: render more takes.
Report: OUT_DIR/whisper-report.json.

--verify transcribes ASSET_DIR/<lang>/<line>.m4a and runs the ending check on the decoded AAC: energy above
−50 dBFS more than 150 ms after the speech end, > 0.3 s of silence after it or a late start, words after
the script's end, a clip over 6 s (the four-sentence greeting tray 11 s, undo and done 8 s). Problems are printed
as FLAG lines with a summary per language; exit status 1 when any clip is flagged.

WHISPER_PY: a Python with openai-whisper, numpy, scipy, soundfile (ffmpeg on PATH for --verify).
"""
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import whisper
from scipy.signal import resample_poly

sys.path.insert(0, str(Path(__file__).parent))
from endpoint import script_span, speech_bounds, syllables, tail_issues, tidy  # noqa: E402

MAX_S = {"tray": 11.0, "undo": 8.0, "done": 8.0}  # as finish.py

try:
    import pykakasi

    _kks = pykakasi.kakasi()
    _ja = lambda s: "".join(p["hira"] for p in _kks.convert(s))  # noqa: E731
except ImportError:
    _ja = None
try:
    from pypinyin import lazy_pinyin

    _zh = lambda s: " ".join(lazy_pinyin(s))  # noqa: E731
except ImportError:
    _zh = None


def reading(lang: str):
    return _ja if lang == "ja" else _zh if lang == "zh" else None


def tokens(s: str, lang: str) -> list[str]:
    f = reading(lang)
    if f:
        s = f(s)
    s = re.sub(r"[^\w ]", "", s.lower())
    if lang == "ja" or (lang == "zh" and not f):
        return list(s.replace(" ", ""))
    return s.split()


def similarity(text: str, heard: str, lang: str) -> float:
    return difflib.SequenceMatcher(None, tokens(text, lang), tokens(heard, lang)).ratio()


def decode_m4a(f: Path, sr: int = 44100) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def to16k(x: np.ndarray, sr: int) -> np.ndarray:
    return resample_poly(x, 16000, sr).astype(np.float32) if sr != 16000 else x.astype(np.float32)


def listen(model, x: np.ndarray, sr: int, lang: str) -> tuple[str, list[dict]]:
    r = model.transcribe(to16k(x, sr), language=lang, word_timestamps=True, fp16=model.device.type == "cuda")
    return r["text"].strip(), [w for s in r["segments"] for w in s.get("words", [])]


def read_wav(f: Path) -> tuple[np.ndarray, int]:
    x, sr = sf.read(f, always_2d=False)
    return (x.mean(axis=1) if x.ndim > 1 else x).astype(np.float64), sr


def trim(spec: dict, src: Path, out: Path, model) -> None:
    out.mkdir(parents=True, exist_ok=True)
    rep_f = out / "whisper-report.json"
    report = json.loads(rep_f.read_text()) if rep_f.exists() else {}
    for lang, lines in spec.items():
        for key, text in lines.items():
            name = f"{lang}-{key}"
            takes = sorted([p for p in [src / f"{name}.wav", *src.glob(f"{name}.t*.wav")] if p.exists()])
            dest = out / f"{name}.wav"
            if not takes or (dest.exists() and dest.stat().st_mtime > max(p.stat().st_mtime for p in takes)):
                continue
            scored = []
            for p in takes:
                x, sr = read_wav(p)
                heard, words = listen(model, x, sr, lang)
                ws, we, extra = script_span(words, text, reading(lang)) if words else (0.0, len(x) / sr, [])
                a, b = speech_bounds(x, sr, (ws, we) if words else None)
                rate = syllables(text, lang) / max(0.3, b - a)
                sim = similarity(text, heard, lang)
                # extra words after a pause are cut off with the tail (small penalty); glued to the last
                # word (the end had to be capped at the word's end + 0.3 s) they may leave a remnant
                glued = bool(extra) and words and b >= we + 0.29
                scored.append({"take": p.name, "sim": round(sim, 3), "heard": heard, "extra": extra, "glued": glued, "a": a, "b": b, "rate": rate, "x": x, "sr": sr})
            # a take far slower than its siblings is a loop or a stall
            med = float(np.median([s["rate"] for s in scored]))
            for s in scored:
                pen = (0.3 if s["glued"] else 0.1 if s["extra"] else 0) + (0.3 if s["rate"] < 0.6 * med else 0)
                s["score"] = round(s["sim"] - pen, 3)
            best = max(scored, key=lambda s: s["score"])
            sf.write(dest, tidy(best["x"], best["sr"], best["a"], best["b"]).astype(np.float32), best["sr"], subtype="FLOAT")
            limit = 0.6 if lang in ("ja", "zh") else 0.7
            flag = "SUSPICIOUS " if best["score"] < limit else ""
            others = " ".join(f"{s['take']}={s['score']:.2f}" for s in scored)
            print(f"{flag}{name} {best['score']:.2f} [{others}] {best['b'] - best['a']:.2f}s | {best['heard']}" + (f" | EXTRA {best['extra']}" if best["extra"] else ""), flush=True)
            report[name] = {k: best[k] for k in ("take", "sim", "score", "heard", "extra")} | {"takes": len(scored)}
            rep_f.write_text(json.dumps(report, ensure_ascii=False, indent=1))


def verify(spec: dict, assets: Path, model) -> int:
    flagged = 0
    per: dict[str, list[str]] = {}
    for lang, lines in spec.items():
        for key, text in lines.items():
            f = assets / lang / f"{key}.m4a"
            if not f.exists():
                per.setdefault(lang, []).append(f"{key}: missing")
                print(f"FLAG {lang}-{key} missing", flush=True)
                flagged += 1
                continue
            x = decode_m4a(f)
            heard, words = listen(model, x, 44100, lang)
            sim = similarity(text, heard, lang)
            ws, we, extra = script_span(words, text, reading(lang)) if words else (0.0, 0.0, [])
            issues, a, b = tail_issues(x, 44100, (ws, we) if words else None)
            dur = len(x) / 44100
            if dur > MAX_S.get(key, 6.0):
                issues.append(f"long ({dur:.1f}s)")
            if extra:
                issues.append(f"extra words {extra}")
            rate = syllables(text, lang) / max(0.3, b - a)
            flagged += bool(issues)
            if issues:
                per.setdefault(lang, []).append(f"{key}: {'; '.join(issues)}")
            print(f"{'FLAG ' if issues else ''}{lang}-{key} {sim:.2f} {dur:.2f}s speech {a:.2f}–{b:.2f} {rate:.1f} syl/s | {heard}" + (f" | {'; '.join(issues)}" if issues else ""), flush=True)
    print("\nper language:")
    for lang in spec:
        p = per.get(lang, [])
        print(f"  {lang}: {'ok' if not p else str(len(p)) + ' flagged — ' + ' / '.join(p)}")
    print(f"{flagged} flagged clips")
    return 1 if flagged else 0


def main() -> None:
    spec = json.loads(Path(sys.argv[1]).read_text())
    # on CUDA in half precision (1.6 GB instead of 3.2 GB: it shares the GPU with other work)
    import torch

    if torch.cuda.is_available():
        model = whisper.load_model("large-v3-turbo", device="cpu").half()
        for m in model.modules():  # Whisper's LayerNorm computes in float32 and needs float32 weights
            if isinstance(m, torch.nn.LayerNorm):
                m.float()
        model = model.to("cuda")
        # word timestamps: Whisper's Triton kernels can fail to load (a SystemError its fallback does not
        # catch) — run the small median filter and DTW on the CPU instead
        import whisper.timing as wt

        _mf, _dtw = wt.median_filter, wt.dtw
        wt.median_filter = lambda x, w: _mf(x.cpu(), w).to(x.device)
        wt.dtw = lambda x: _dtw(x.cpu())
    else:
        model = whisper.load_model("large-v3-turbo")
    if sys.argv[2] == "--verify":
        sys.exit(verify(spec, Path(sys.argv[3]), model))
    trim(spec, Path(sys.argv[2]), Path(sys.argv[3]), model)


if __name__ == "__main__":
    main()
