#!/usr/bin/env python3
"""Turn trimmed lines into Edyta's app clips: sheep voice, tidy edges, equal loudness, AAC, mouth envelope.

    FX_PY tools/voice/finish.py LINES.json IN_DIR [FALLBACK_DIR]
          IN_DIR/<lang>-<line>.wav from trim_check.py; a line not trimmed yet is taken from FALLBACK_DIR
          (the raw takes) and only energy-trimmed, so a new language can be heard before Whisper ran.

FX_PY: a Python with pyworld, numpy, soundfile (pastelki/reels/requirements-fx.txt, a scratch venv).
For every clip:
  1. pastelki/reels/sheepify.py (WORLD vocoder: +3 semitones, smaller vocal tract, a quaver on held
     vowels) — imported from the Pastelki repo, not copied, so Edyta sounds like in the reels;
  2. energy trim (leading/trailing frames 40 dB under the loudest are cut, 60 ms kept) + 15 ms fades;
  3. loudness: speech RMS (frames within 35 dB of the loudest) → −20 dBFS, then a smooth peak limiter
     so no sample exceeds −2.5 dBFS (−1.5 dBFS after AAC is checked);
  4. ffmpeg → assets/voice/edyta/<lang>/<line>.m4a (AAC-LC, mono, 44.1 kHz, 64 kbit/s); a clip newer
     than its source is kept as it is (only re-measured);
  5. a mouth envelope: one digit 0–9 per 80 ms (how open her mouth is), stored in the module;
then writes src/audio/edyta-voice.ts and prints a table (duration, RMS, peak) with warnings.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path.home() / ".openclaw/workspace/pastelki/reels"))
from sheepify import sheepify  # noqa: E402

LANGS = ["pl", "en", "de", "fr", "es", "it", "pt", "nl", "uk", "cs", "sk", "sv", "ro", "hu", "tr", "ja", "zh"]
TARGET_RMS_DB = -20.0
PEAK_DB = -2.5
FRAME_S = 0.08
OUT = ROOT / "assets/voice/edyta"
MODULE = ROOT / "src/audio/edyta-voice.ts"

db = lambda v: 20 * np.log10(max(float(v), 1e-9))


def frames_rms(x: np.ndarray, sr: int, hop_s: float) -> np.ndarray:
    hop = max(1, int(sr * hop_s))
    n = int(np.ceil(len(x) / hop))
    pad = np.pad(x, (0, n * hop - len(x)))
    return np.sqrt(np.mean(pad.reshape(n, hop) ** 2, axis=1) + 1e-12)


def energy_trim(x: np.ndarray, sr: int) -> np.ndarray:
    r = frames_rms(x, sr, 0.01)
    on = np.where(20 * np.log10(r / r.max()) > -40)[0]
    if len(on) == 0:
        return x
    a = max(0, (on[0] - 6) * int(sr * 0.01))
    b = min(len(x), (on[-1] + 7) * int(sr * 0.01))
    y = x[a:b].copy()
    n = min(len(y) // 2, int(0.015 * sr))
    ramp = np.linspace(0, 1, n)
    y[:n] *= ramp
    y[len(y) - n:] *= ramp[::-1]
    return y


def loudness(x: np.ndarray, sr: int) -> np.ndarray:
    r = frames_rms(x, sr, 0.02)
    speech = r[20 * np.log10(r / r.max()) > -35]
    rms = np.sqrt(np.mean(speech ** 2))
    y = x * 10 ** ((TARGET_RMS_DB - db(rms)) / 20)
    thr = 10 ** (PEAK_DB / 20)
    if np.max(np.abs(y)) > thr:
        # gain = what each sample needs, spread over ±4 ms (min filter) and smoothed, so the limiter
        # never clicks; a final clamp catches the last fraction of a dB
        g = np.minimum(1.0, thr / np.maximum(np.abs(y), 1e-9))
        w = max(1, int(sr * 0.004))
        gp = np.pad(g, (w, w), constant_values=1.0)
        gmin = np.min(np.lib.stride_tricks.sliding_window_view(gp, 2 * w + 1), axis=1)
        k = np.ones(2 * w + 1) / (2 * w + 1)
        gs = np.convolve(np.pad(gmin, (w, w), mode="edge"), k, mode="valid")
        y = np.clip(y * np.minimum(gs, gmin), -thr, thr)
    return y


def envelope(x: np.ndarray, sr: int) -> str:
    r = frames_rms(x, sr, FRAME_S)
    ref = np.percentile(r, 90)
    v = np.clip(r / ref, 0, 1)
    v[20 * np.log10(r / r.max()) < -30] = 0
    return "".join(str(int(round(a * 9))) for a in v)


def decode(f: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-f", "f32le", "-ac", "1", "-ar", "44100", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def speech_rms_db(y: np.ndarray, sr: int) -> float:
    r = frames_rms(y, sr, 0.02)
    speech = r[20 * np.log10(r / r.max()) > -35]
    return db(np.sqrt(np.mean(speech ** 2)))


def main() -> None:
    spec = json.loads(Path(sys.argv[1]).read_text())
    srcs = [Path(p) for p in sys.argv[2:4]]
    keys = list(spec["pl"].keys())
    clips: dict[str, dict[str, dict]] = {}
    warn = []
    stale: list[Path] = []
    print(f"{'clip':16} {'dur s':>6} {'rms dB':>7} {'peak dB':>8}")
    for lang in LANGS:
        for key in keys:
            f = next((d / f"{lang}-{key}.wav" for d in srcs if (d / f"{lang}-{key}.wav").exists()), srcs[0] / f"{lang}-{key}.wav")
            dest = OUT / lang / f"{key}.m4a"
            if not f.exists():
                if dest.exists():
                    stale.append(dest)  # a clip of a line that changed or was removed
                warn.append(f"{lang}-{key}: missing")
                continue
            if not dest.exists() or dest.stat().st_mtime < f.stat().st_mtime:
                x, sr = sf.read(f, always_2d=False)
                if x.ndim > 1:
                    x = x.mean(axis=1)
                y = sheepify(x, sr, bleat=False).astype(np.float64)
                y = loudness(energy_trim(y, sr), sr)
                dest.parent.mkdir(parents=True, exist_ok=True)
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-",
                                "-ar", "44100", "-ac", "1", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(dest)],
                               input=y.astype(np.float32).tobytes(), check=True)
            y = decode(dest)
            dur, rms, peak = len(y) / 44100, speech_rms_db(y, 44100), db(np.max(np.abs(y)))
            print(f"{lang + '-' + key:16} {dur:6.2f} {rms:7.1f} {peak:8.1f}")
            if not 0.8 <= dur <= 8.0:
                warn.append(f"{lang}-{key}: duration {dur:.2f} s")
            if rms < -26:
                warn.append(f"{lang}-{key}: quiet ({rms:.1f} dB)")
            if peak > -1.5:
                warn.append(f"{lang}-{key}: peak {peak:.1f} dB")
            clips.setdefault(lang, {})[key] = {"ms": int(round(dur * 1000)), "mouth": envelope(y, 44100)}
    lines = [
        "// Generated by tools/voice/finish.py — do not edit. Edyta's spoken tutorial lines (tools/voice/build.sh).",
        "// mouth: one digit per 80 ms, 0 = closed … 9 = wide open. A missing clip = the bubble text only.",
        "import type { Lang } from '@/coloring/types';",
        "",
        "import type { EdytaLine } from './edyta-lines';",
        "",
        "export type VoiceClip = { src: number; ms: number; mouth: string };",
        "",
        "export const EDYTA_VOICE: Partial<Record<Lang, Partial<Record<EdytaLine, VoiceClip>>>> = {",
    ]
    for lang in LANGS:
        if lang not in clips:
            continue
        lines.append(f"  {lang}: {{")
        for key, c in clips[lang].items():
            lines.append(f"    {key}: {{ src: require('@/assets/voice/edyta/{lang}/{key}.m4a'), ms: {c['ms']}, mouth: {json.dumps(c['mouth'])} }},")
        lines.append("  },")
    lines.append("};")
    # new module first (atomically), then drop stale clips — a running Metro never sees a require() of a
    # file that is gone
    tmp = MODULE.with_suffix(".tmp")
    tmp.write_text("\n".join(lines) + "\n")
    tmp.replace(MODULE)
    for p in stale:
        p.unlink()
    print("wrote", MODULE.relative_to(ROOT))
    per = {l: len(clips.get(l, {})) for l in LANGS}
    print("clips per language:", ", ".join(f"{l} {n}/{len(keys)}" for l, n in per.items()), f"— total {sum(per.values())}")
    print("\n".join(["WARN " + w for w in warn if "missing" not in w]) or "no warnings")


if __name__ == "__main__":
    main()
