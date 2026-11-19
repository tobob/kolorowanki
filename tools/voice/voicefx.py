#!/usr/bin/env python3
"""Edyta's voice chains (finish.py --chain): what happens to a trimmed dry take before edges, loudness and AAC.

    sheep        the current Edyta (default): WSOLA pace → pastelki/reels/sheepify.py (+3 semitones, vocal
                 tract 4 % smaller, a 6.8 Hz quaver on held vowels)
    natural      no vocoder at all: pace by longer pauses between sentences (no time-stretch unless a take is
                 still far too fast) → warm EQ → light compression → a touch of small-room ambience
    soft-sheep   natural, but first a very light WORLD lift (+1 semitone, vocal tract 2 % smaller, NO quaver)
    sheep-calm   the current sheep without the wobble (quaver 0) and with the warm EQ/compression/room
                 (keeps the current source and pace: the conservative fix)

All chains share the same building blocks, so every language goes through exactly the same steps; Piper
languages (uk cs sk ro hu) can additionally be matched to the Chatterbox ones with match_eq() (long-term
spectrum) and a small pitch offset (--piper-shift), so Edyta sounds like one character.
Needs numpy, scipy (signal), soundfile; pyworld for the sheep chains; audiotsm for WSOLA.
"""
from __future__ import annotations

import numpy as np
from scipy import signal

CHAINS = ("sheep", "natural", "soft-sheep", "sheep-calm")


# ---------------------------------------------------------------- filters (RBJ biquads)
def _biquad(kind: str, f: float, sr: int, gain_db: float = 0.0, q: float = 0.707) -> np.ndarray:
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f / sr
    cw, sw = np.cos(w), np.sin(w)
    al = sw / (2 * q)
    if kind == "peak":
        b = [1 + al * A, -2 * cw, 1 - al * A]
        a = [1 + al / A, -2 * cw, 1 - al / A]
    elif kind == "lowshelf":
        s = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * cw + s), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - s)]
        a = [(A + 1) + (A - 1) * cw + s, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - s]
    elif kind == "highshelf":
        s = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * cw + s), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - s)]
        a = [(A + 1) - (A - 1) * cw + s, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - s]
    elif kind == "highpass":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + al, -2 * cw, 1 - al]
    elif kind == "lowpass":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + al, -2 * cw, 1 - al]
    else:
        raise ValueError(kind)
    return signal.tf2sos(np.array(b) / a[0], np.array(a) / a[0])


# warm EQ: rumble out, a little low-mid body, the nasal/boxy 1 kHz and the harsh 3–4 kHz eased, air softened
WARM_EQ = [("highpass", 85, 0.0, 0.707), ("peak", 260, 2.0, 0.8), ("peak", 3300, -2.5, 1.2), ("highshelf", 7500, -3.0, 0.707)]


def eq(x: np.ndarray, sr: int, bands=WARM_EQ) -> np.ndarray:
    sos = np.vstack([_biquad(k, f, sr, g, q) for k, f, g, q in bands])
    return signal.sosfilt(sos, x)


def deess(x: np.ndarray, sr: int, f: float = 5500, max_cut_db: float = 6.0, thr_db: float = -12.0) -> np.ndarray:
    """Split at f; where the high band is louder than (full band + thr_db), turn it down (≤ max_cut_db)."""
    hi = signal.sosfiltfilt(_biquad("highpass", f, sr, q=0.6), x)
    lo = x - hi
    def env(s):
        e = np.sqrt(signal.sosfiltfilt(_biquad("lowpass", 40, sr), s * s).clip(1e-12))
        return 20 * np.log10(e)
    over = env(hi) - env(x) - thr_db
    cut = np.clip(over, 0, max_cut_db)
    return lo + hi * 10 ** (-cut / 20)


def compress(x: np.ndarray, sr: int, ratio: float = 2.0, thr_rel_db: float = -10.0, attack_ms: float = 8,
             release_ms: float = 150) -> np.ndarray:
    """Gentle RMS compressor; threshold relative to the speech level (90th percentile of a 10 ms envelope)."""
    n = max(1, int(sr * 0.01))
    e = np.sqrt(np.convolve(x * x, np.ones(n) / n, mode="same") + 1e-12)
    lev = 20 * np.log10(e)
    thr = np.percentile(lev[lev > lev.max() - 40], 90) + thr_rel_db
    want = np.minimum(0.0, (thr - lev) * (1 - 1 / ratio))
    g = np.empty_like(want)
    aa, ar = np.exp(-1 / (sr * attack_ms / 1000)), np.exp(-1 / (sr * release_ms / 1000))
    cur = 0.0
    for i, w in enumerate(want):  # gain smoothing (attack when reducing, release when recovering)
        k = aa if w < cur else ar
        cur = k * cur + (1 - k) * w
        g[i] = cur
    return x * 10 ** (g / 20)


def room(x: np.ndarray, sr: int, rt60: float = 0.28, wet_db: float = -20.0, predelay_ms: float = 9.0, seed: int = 7) -> np.ndarray:
    """A touch of small-room ambience: decaying, low-passed noise impulse response mixed in quietly."""
    rng = np.random.default_rng(seed)
    n = int(sr * rt60)
    t = np.arange(n) / sr
    ir = rng.standard_normal(n) * np.exp(-6.9 * t / rt60)
    ir = signal.sosfilt(_biquad("lowpass", 4500, sr, q=0.6), ir)
    ir = np.concatenate([np.zeros(int(sr * predelay_ms / 1000)), ir])
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = signal.fftconvolve(x, ir)[: len(x)]
    return x + wet * 10 ** (wet_db / 20)


# ---------------------------------------------------------------- pace without time-stretch
def lengthen_pauses(x: np.ndarray, sr: int, min_gap_s: float = 0.16, target_s: float = 0.42) -> np.ndarray:
    """Pauses between phrases (silent gaps ≥ min_gap_s, from endpoint's energy segments) → at least target_s.
    Slows the delivery the way a calm reader does — by breathing between sentences — without touching the
    syllables (no WSOLA warble)."""
    from endpoint import HOP, frames_db, segments, speech_level

    d = frames_db(x, sr)
    segs = segments(d, speech_level(d) - 30)
    if len(segs) < 2:
        return x
    out, last = [], 0
    for (a0, b0), (a1, _) in zip(segs, segs[1:]):
        gap = (a1 - b0) * HOP
        if gap < min_gap_s or gap >= target_s:
            continue
        mid = int((b0 + a1) / 2 * HOP * sr)  # insert digital silence in the middle of the gap
        out += [x[last:mid], np.zeros(int((target_s - gap) * sr))]
        last = mid
    out.append(x[last:])
    return np.concatenate(out)


# ---------------------------------------------------------------- WORLD lift (soft sheep / Piper pitch match)
def world_shift(x: np.ndarray, sr: int, semitones: float, warp: float = 1.0) -> np.ndarray:
    import importlib.metadata
    import sys
    import types

    if "pkg_resources" not in sys.modules:  # as sheepify.py
        sh = types.ModuleType("pkg_resources")
        sh.get_distribution = lambda name: types.SimpleNamespace(version=importlib.metadata.version(name))  # type: ignore[attr-defined]
        sys.modules["pkg_resources"] = sh
    import pyworld as pw

    x = x.astype(np.float64)
    f0, t = pw.harvest(x, sr, f0_floor=70, f0_ceil=800, frame_period=5.0)
    f0 = pw.stonemask(x, f0, t, sr)
    v = f0 > 0
    if v.any():  # fold octave errors back (squeaks), as sheepify
        med = np.median(f0[v])
        f0 = np.where(v & (f0 > 1.6 * med), f0 / 2, f0)
        f0 = np.where(v & (f0 < 0.62 * med), f0 * 2, f0)
    sp = pw.cheaptrick(x, f0, t, sr)
    ap = pw.d4c(x, f0, t, sr)
    if warp != 1.0:
        bins = sp.shape[1]
        src = np.clip(np.arange(bins) / warp, 0, bins - 1)
        lo = np.floor(src).astype(int)
        hi = np.minimum(lo + 1, bins - 1)
        fr = src - lo
        sp = np.ascontiguousarray(sp[:, lo] * (1 - fr) + sp[:, hi] * fr)
    f0 = np.where(v, f0 * 2 ** (semitones / 12), 0.0)
    y = pw.synthesize(f0, sp, ap, sr, frame_period=5.0)[: len(x)]
    return y * (np.sqrt(np.mean(x ** 2)) / (np.sqrt(np.mean(y ** 2)) + 1e-12))


# ---------------------------------------------------------------- spectral match (Piper → Chatterbox)
def ltas(x: np.ndarray, sr: int, nfft: int = 2048) -> tuple[np.ndarray, np.ndarray]:
    """Long-term average spectrum of the speech frames (dB), on 1/3-octave band centres 100 Hz–10 kHz."""
    f, P = signal.welch(x, sr, nperseg=nfft)
    centres = 100 * 2 ** (np.arange(0, 21) / 3)
    out = []
    for c in centres:
        b = (f >= c / 2 ** (1 / 6)) & (f < c * 2 ** (1 / 6))
        out.append(10 * np.log10(np.mean(P[b]) + 1e-20))
    return centres, np.array(out)


def match_eq(x: np.ndarray, sr: int, target_db: np.ndarray, source_db: np.ndarray, limit_db: float = 8.0) -> np.ndarray:
    """Linear-phase FIR that moves source_db's shape (from ltas) toward target_db; level-neutral at 1 kHz,
    smoothed over neighbouring bands and limited to ±limit_db."""
    centres = 100 * 2 ** (np.arange(0, 21) / 3)
    diff = target_db - source_db
    diff = np.convolve(np.pad(diff, 1, mode="edge"), [0.25, 0.5, 0.25], mode="valid")
    diff -= np.interp(1000, centres, diff)
    # only the voice's own band (250 Hz–8 kHz): below it Chatterbox has rumble/breath, above it Piper (22 kHz
    # models) has nothing to lift — taper to 0 dB outside
    diff *= np.clip((np.log2(centres) - np.log2(160)) / (np.log2(250) - np.log2(160)), 0, 1)
    diff *= np.clip((np.log2(12000) - np.log2(centres)) / (np.log2(12000) - np.log2(8000)), 0, 1)
    diff = np.clip(diff, -limit_db, limit_db)
    freqs = np.concatenate([[0], centres, [sr / 2]]) / (sr / 2)
    gains = 10 ** (np.concatenate([[diff[0]], diff, [diff[-1]]]) / 20)
    fir = signal.firwin2(1025, freqs, gains)
    return signal.fftconvolve(x, fir, mode="same")


# ---------------------------------------------------------------- the chains
def polish(y: np.ndarray, sr: int) -> np.ndarray:
    """The shared 'warm, calm' finish: warm EQ → de-ess → light compression → small room."""
    y = eq(y, sr)
    y = deess(y, sr)
    y = compress(y, sr)
    return room(y, sr)


def apply(chain: str, x: np.ndarray, sr: int, *, piper_shift: float = 0.0) -> np.ndarray:
    """x: the dry, trimmed (and, for the sheep chains, already paced) take. piper_shift: semitones for a
    Piper language (pitch match), applied in the same WORLD pass as the soft sheep or on its own."""
    if chain == "sheep":
        from sheepify import sheepify

        return sheepify(x, sr, bleat=False).astype(np.float64)
    if chain == "sheep-calm":  # sheepify's lift (+3 semitones, vocal tract 4 % smaller) without its quaver
        return polish(world_shift(x, sr, 3.0 + piper_shift, warp=1.04), sr)
    if chain == "soft-sheep":
        return polish(world_shift(x, sr, 1.0 + piper_shift, warp=1.02), sr)
    if chain == "natural":
        y = world_shift(x, sr, piper_shift) if abs(piper_shift) >= 0.25 else x
        return polish(y, sr)
    raise ValueError(chain)

