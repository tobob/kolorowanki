#!/usr/bin/env python3
"""Turn trimmed lines into Edyta's app clips: sheep voice, tidy edges, equal loudness, AAC, mouth envelope.

    FX_PY tools/voice/finish.py LINES.json IN_DIR [FALLBACK_DIR] [--chain sheep] [--pace stretch] [--lufs X] [--piper-match]
          IN_DIR/<lang>-<line>.wav from trim_check.py; a line not trimmed yet is taken from FALLBACK_DIR
          (the raw takes) and only energy-trimmed, so a new language can be heard before Whisper ran.

FX_PY: a Python with pyworld, numpy, soundfile, audiotsm (pastelki/reels/requirements-fx.txt + audiotsm).
For every clip:
  0. pace: the dry take's articulation rate (syllables per second of speech, endpoint.py) is brought down
     to the language's target — 80 % of what the first version spoke (children 2–4 found it too fast) —
     with WSOLA (audiotsm, time-domain: no pitch change, no phase-vocoder smear), at most 1.35× longer;
     a take already slow enough is left alone. Done on the dry voice, BEFORE the sheep effect, so the
     quaver keeps its rate;
  1. pastelki/reels/sheepify.py (WORLD vocoder: +3 semitones, smaller vocal tract, a quaver on held
     vowels) — imported from the Pastelki repo, not copied, so Edyta sounds like in the reels. It gets
     the trimmed take, which ends in digital silence, so it has no noise to resynthesise after the words;
  2. edges again (endpoint.py): speech start/end from energy, +80 ms, 50 ms fade to exactly 0, 60 ms of
     zeros — nothing after the last word but a short fade;
  3. loudness: speech RMS (frames within 35 dB of the loudest) → −20 dBFS, then a smooth peak limiter
     so no sample exceeds −2.5 dBFS (−1.5 dBFS after AAC is checked);
  4. ffmpeg → assets/voice/edyta/<lang>/<line>.m4a (AAC-LC, mono, 44.1 kHz, 64 kbit/s); a clip newer
     than its source is kept as it is (only re-measured);
  5. a mouth envelope: one digit 0–9 per 80 ms (how open her mouth is), stored in the module;
Voice options (defaults = the current Edyta; candidates of 2026-11-19, see voicefx.py):
  --chain sheep|natural|soft-sheep|sheep-calm|soft|softer   step 1 (voicefx.CHAINS);
  --pace stretch|pauses|natural   step 0: WSOLA (default); pauses = longer pauses between phrases
                          (voicefx.lengthen_pauses) plus WSOLA only for what is still more than 15 % too fast
                          (max 1.15×); natural = that WSOLA only, pauses as spoken (trim_check already caps
                          any pause inside a line at 0.35 s), never lengthened;
  --lufs X                step 3 by integrated loudness (EBU R128, pyloudnorm) instead of speech RMS;
  --piper-match           Piper languages (uk cs sk ro hu) get the Chatterbox languages' long-term spectrum
                          (voicefx.match_eq) and median pitch (a WORLD shift, only when ≥ 1.25 semitones apart,
                          at most ±3 st, with a matching vocal-tract warp),
                          measured on this run's dry takes, so the voice reads as one character.
then writes src/audio/edyta-voice.ts and prints a table (duration, rate before → after, stretch, RMS,
peak) with warnings — including the ending check (endpoint.tail_issues) on the decoded AAC.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
# SHEEPIFY_DIR: where pastelki/reels/sheepify.py is (default: the Pastelki repo next to the studio)
sys.path.insert(0, os.environ.get("SHEEPIFY_DIR", str(Path.home() / ".openclaw/workspace/pastelki/reels")))
from sheepify import sheepify  # noqa: E402

sys.path.insert(0, str(Path(__file__).parent))
from endpoint import speaking_time, speech_bounds, syllables, tail_issues, tidy  # noqa: E402
import voicefx  # noqa: E402

LANGS = ["pl", "en", "de", "fr", "es", "it", "pt", "nl", "uk", "cs", "sk", "sv", "ro", "hu", "tr", "ja", "zh"]
TARGET_RMS_DB = -20.0
PEAK_DB = -2.5
FRAME_S = 0.08
# longest sensible clip per line: the greeting has four sentences, undo and the finale three
MAX_S = {"tray": 11.0, "undo": 8.0, "done": 8.0}
# articulation rate (syllables/s) of the first version, 2026-11-18, per language (median of 17 lines) …
RATE_BEFORE = {"pl": 5.57, "en": 6.31, "de": 4.56, "fr": 5.56, "es": 7.59, "it": 6.87, "pt": 7.33, "nl": 5.67, "uk": 4.29,
               "cs": 3.6, "sk": 5.16, "sv": 5.31, "ro": 5.45, "hu": 5.02, "tr": 5.68, "ja": 9.41, "zh": 6.0}
# … and the target: 20 % slower, but never under 3.4 syllables/s (Czech already spoke slowest of all)
TARGET_RATE = {l: max(3.4, round(0.8 * r, 2)) for l, r in RATE_BEFORE.items()}
MAX_STRETCH = 1.35
OUT = ROOT / "assets/voice/edyta"
MODULE = ROOT / "src/audio/edyta-voice.ts"

db = lambda v: 20 * np.log10(max(float(v), 1e-9))


def frames_rms(x: np.ndarray, sr: int, hop_s: float) -> np.ndarray:
    hop = max(1, int(sr * hop_s))
    n = int(np.ceil(len(x) / hop))
    pad = np.pad(x, (0, n * hop - len(x)))
    return np.sqrt(np.mean(pad.reshape(n, hop) ** 2, axis=1) + 1e-12)


PIPER_LANGS = {"uk", "cs", "sk", "ro", "hu"}


def opt(name: str, default=None):
    return type(default)(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default


def slow_down(x: np.ndarray, sr: int, text: str, lang: str, slack: float = 1.0, max_stretch: float = MAX_STRETCH) -> tuple[np.ndarray, float, float]:
    """WSOLA time-stretch of the dry voice to the language's target rate (× slack) → (audio, rate before, factor)."""
    rate = syllables(text, lang) / speaking_time(x, sr)
    f = float(np.clip(rate / (TARGET_RATE[lang] * slack), 1.0, max_stretch))
    if f < 1.02:
        return x, rate, 1.0
    from audiotsm import wsola
    from audiotsm.io.array import ArrayReader, ArrayWriter

    r = ArrayReader(x.reshape(1, -1).astype(np.float32))
    w = ArrayWriter(1)
    # ~40 ms frames, ±10 ms search: speech-sized, so syllables stay intact
    wsola(1, speed=1 / f, frame_length=int(0.04 * sr), synthesis_hop=int(0.02 * sr), tolerance=int(0.01 * sr)).run(r, w)
    return w.data[0].astype(np.float64), rate, f


def loudness(x: np.ndarray, sr: int, lufs: float | None = None) -> np.ndarray:
    if lufs is not None:
        import pyloudnorm as pyln

        y = x * 10 ** ((lufs - pyln.Meter(sr).integrated_loudness(x)) / 20)
    else:
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


def read_dry(f: Path) -> tuple[np.ndarray, int]:
    x, sr = sf.read(f, always_2d=False)
    if x.ndim > 1:
        x = x.mean(axis=1)
    a, b = speech_bounds(x, sr)  # a raw fallback take is cut here; a trimmed one is unchanged
    return tidy(x, sr, a, b), sr


def median_f0(x: np.ndarray, sr: int) -> float:
    """Median F0 of a female voice, robust to octave errors and creak (frames folded back to the voice's centre)."""
    import pyworld as pw  # sheepify (imported above) has installed its pkg_resources shim

    f0, _ = pw.harvest(x.astype(np.float64), sr, f0_floor=110, f0_ceil=700, frame_period=10.0)
    f0 = f0[f0 > 0]
    if not len(f0):
        return 0.0
    ref = np.percentile(f0, 60)
    for _ in range(3):
        f0 = np.where(f0 > 1.6 * ref, f0 / 2, np.where(f0 < 0.62 * ref, f0 * 2, f0))
        ref = np.median(f0)
    return float(ref)


def piper_match(files: dict[str, list[Path]]) -> dict[str, tuple[np.ndarray, float]]:
    """--piper-match: per Piper language (spectral correction in dB on voicefx's band centres, semitones),
    from the dry takes of this run: the Chatterbox languages' average long-term spectrum and median F0."""
    def stats(fs):
        sp, f0 = [], []
        for f in fs:
            x, sr = read_dry(f)
            sp.append(voicefx.ltas(x, sr)[1])
            f0.append(median_f0(x, sr))
        return np.mean(sp, axis=0), float(np.median(f0))

    ref = [f for lang, fs in files.items() if lang not in PIPER_LANGS for f in fs]
    if not ref:
        return {}
    ref_sp, ref_f0 = stats(ref)
    out = {}
    for lang, fs in files.items():
        if lang in PIPER_LANGS and fs:
            sp, f0 = stats(fs)
            st = 12 * np.log2(ref_f0 / f0)
            out[lang] = (ref_sp - sp, float(np.clip(round(st * 2) / 2, -3, 3)) if abs(st) >= 1.25 else 0.0)  # smaller gaps are within Chatterbox's own take-to-take spread: no vocoder pass for them
            c = 100 * 2 ** (np.arange(0, 21) / 3)
            d = out[lang][0] - np.interp(1000, c, out[lang][0])
            print(f"piper-match {lang}: pitch {f0:.0f} → {ref_f0:.0f} Hz ({out[lang][1]:+.1f} st), EQ (dB re 1 kHz) "
                  + " ".join(f"{int(fc)}:{np.interp(fc, c, d):+.1f}" for fc in (200, 500, 2000, 4000, 8000)))
    return out


def process(x: np.ndarray, sr: int, text: str, lang: str, chain: str = "sheep", pace: str = "stretch",
            lufs: float | None = None, match: tuple[np.ndarray, float] | None = None) -> tuple[np.ndarray, float, float]:
    """One dry, tidied take → the finished clip (before AAC) → (audio, rate before, stretch)."""
    if pace in ("pauses", "natural"):
        if pace == "pauses":
            x = voicefx.lengthen_pauses(x, sr)
        x, r0, k = slow_down(x, sr, text, lang, slack=1.15, max_stretch=1.15)
    else:
        x, r0, k = slow_down(x, sr, text, lang)
    shift = 0.0
    if match is not None:
        x = voicefx.match_eq(x, sr, match[0], np.zeros_like(match[0]), limit_db=6.0)
        shift = match[1]
    y = voicefx.apply(chain, x, sr, piper_shift=shift)
    a, b = speech_bounds(y, sr)
    return loudness(tidy(y, sr, a, b, pause=False), sr, lufs), r0, k


def main() -> None:
    spec = json.loads(Path(sys.argv[1]).read_text())
    chain, pace, lufs = opt("--chain", "sheep"), opt("--pace", "stretch"), opt("--lufs", 0.0) if "--lufs" in sys.argv else None
    assert chain in voicefx.CHAINS and pace in ("stretch", "pauses", "natural"), (chain, pace)
    pos = [a for i, a in enumerate(sys.argv) if not a.startswith("--") and not sys.argv[i - 1] in ("--chain", "--pace", "--lufs")]
    srcs = [Path(p) for p in pos[2:4]]
    keys = list(spec["pl"].keys())
    have = {lang: sum(1 for k in keys if any((d / f"{lang}-{k}.wav").exists() for d in srcs)) for lang in LANGS}
    if not all(have.values()):
        # never write a module without a whole language (and delete its clips) because a step before failed
        sys.exit(f"no takes for: {', '.join(l for l, n in have.items() if not n)} — run trim_check.py first")
    clips: dict[str, dict[str, dict]] = {}
    warn = []
    stale: list[Path] = []
    print(f"{'clip':16} {'dur s':>6} {'syl/s':>11} {'×':>5} {'rms dB':>7} {'peak dB':>8}")
    rates: dict[str, list[tuple[float, float]]] = {}
    matches = {}
    if "--piper-match" in sys.argv:
        found = {lang: [d / f"{lang}-{k}.wav" for k in keys for d in srcs[:1] if (d / f"{lang}-{k}.wav").exists()] for lang in LANGS}
        matches = piper_match(found)
    for lang in LANGS:
        for key in keys:
            f = next((d / f"{lang}-{key}.wav" for d in srcs if (d / f"{lang}-{key}.wav").exists()), srcs[0] / f"{lang}-{key}.wav")
            dest = OUT / lang / f"{key}.m4a"
            if not f.exists():
                if dest.exists():
                    stale.append(dest)  # a clip of a line that changed or was removed
                warn.append(f"{lang}-{key}: missing")
                continue
            text = spec[lang][key]
            shown = ""
            if not dest.exists() or dest.stat().st_mtime < f.stat().st_mtime:
                x, sr = read_dry(f)
                y, r0, k = process(x, sr, text, lang, chain, pace, lufs, matches.get(lang))
                r1 = syllables(text, lang) / speaking_time(y, sr)
                rates.setdefault(lang, []).append((r0, r1))
                shown = f"{r0:4.1f}→{r1:4.1f} {k:5.2f}"
                dest.parent.mkdir(parents=True, exist_ok=True)
                for _ in range(3):
                    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-",
                                    "-ar", "44100", "-ac", "1", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(dest)],
                                   input=y.astype(np.float32).tobytes(), check=True)
                    # AAC can overshoot the limiter by a few dB on sharp transients: measure the decoded clip
                    # and, if it peaks over −1.5 dBFS, encode again a little quieter
                    over = db(np.max(np.abs(decode(dest)))) - (PEAK_DB + 0.5)
                    if over <= 0:
                        break
                    y = y * 10 ** (-(over + 0.3) / 20)
            y = decode(dest)
            dur, rms, peak = len(y) / 44100, speech_rms_db(y, 44100), db(np.max(np.abs(y)))
            print(f"{lang + '-' + key:16} {dur:6.2f} {shown:>17} {rms:7.1f} {peak:8.1f}")
            issues, _, _ = tail_issues(y, 44100)
            warn += [f"{lang}-{key}: {i}" for i in issues]
            if not 0.8 <= dur <= MAX_S.get(key, 6.0):
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
    print("speech rate, syllables/s (median of the clips made now): " + ", ".join(
        f"{l} {RATE_BEFORE[l]:.1f}→{np.median([r[1] for r in v]):.1f}" for l, v in rates.items()))
    print("\n".join(["WARN " + w for w in warn if "missing" not in w]) or "no warnings")


if __name__ == "__main__":
    main()
