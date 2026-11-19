"""Where Edyta's speech starts and ends, and a clean cut there — shared by trim_check.py and finish.py.

Why: text-to-speech keeps "talking" after the sentence (Chatterbox: a breath, a mumble, a repeated word or
garbage tokens; Piper: long sentence pauses). Whisper's word timestamps alone are a poor end marker — the last
word's end is often late and sometimes swallows the mumble — and a plain "40 dB under the peak" energy
trim keeps a mumble that is loud. So the end is found from energy, guided by the words:

  speech_bounds(x, sr, words)  energy segments (20 ms RMS every 10 ms, above speech level − 30 dB, gaps under
                               120 ms closed, blips under 40 ms dropped); with Whisper words only the segments
                               that start before the last word of the script ends count, and the end is never
                               later than that word's end + 0.3 s (a mumble glued to the last word is cut).
  tidy(x, sr, a, b)            keep a − 50 ms … b + 80 ms, 15 ms fade-in, 50 ms fade-out to exactly 0, then
                               60 ms of digital silence (AAC's last frame then has nothing to smear), and
                               long pauses inside the line shortened to 0.35 s.
  tail_issues(x, sr, words)    the automatic check: energy above −50 dBFS more than 150 ms after the speech
                               end, a long silent tail or lead, a clip much longer than its speech.
  syllables(text, lang)        for the speech rate (syllables per second): vowel groups; kana (ja), hanzi (zh).
"""
from __future__ import annotations

import difflib
import re

import numpy as np

HOP = 0.01  # s between analysis frames
WIN = 0.02  # s analysis window
GAP_S = 0.12  # gaps shorter than this inside a segment are closed
MIN_SEG_S = 0.04
MAX_PAUSE_S = 0.35  # longer pauses inside a line are shortened to this
TAIL_DB = -50.0  # check: nothing above this …
TAIL_AFTER_S = 0.15  # … later than this after the speech end


def frames_db(x: np.ndarray, sr: int) -> np.ndarray:
    """dBFS of a 20 ms window every 10 ms; frame i covers [i·hop, i·hop + win)."""
    h, w = int(sr * HOP), int(sr * WIN)
    n = max(1, int(np.ceil(len(x) / h)))
    p = np.pad(np.asarray(x, dtype=np.float64), (0, n * h + w - len(x)))
    c = np.concatenate([[0.0], np.cumsum(p * p)])
    i = np.arange(n) * h
    return 10 * np.log10((c[i + w] - c[i]) / w + 1e-14)


def speech_level(d: np.ndarray) -> float:
    return float(np.percentile(d, 90))


def segments(d: np.ndarray, thr: float) -> list[tuple[int, int]]:
    """Runs of frames above thr as (first, last + 1), small gaps closed, blips dropped."""
    on = np.concatenate([[False], d > thr, [False]])
    edges = np.flatnonzero(np.diff(on.astype(np.int8)))
    runs = list(zip(edges[::2], edges[1::2]))
    merged: list[list[int]] = []
    for a, b in runs:
        if merged and a - merged[-1][1] < GAP_S / HOP:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    return [(a, b) for a, b in merged if (b - a) * HOP >= MIN_SEG_S]


def _norm(s: str) -> str:
    return re.sub(r"[^\w]", "", s.lower())


def script_span(words: list[dict], text: str, reading=None) -> tuple[float, float, list[str]]:
    """Start of the first and end of the last Whisper word that belong to the script, and any words
    Whisper heard after the script's last word (a mumble, a repeat). `reading` maps text to a comparable
    form (kana for Japanese, pinyin for Chinese) so kanji vs kana or homophones still match."""
    f = reading or (lambda s: s)
    t = _norm(f(text))
    own: list[int] = []
    h = ""
    for k, w in enumerate(words):
        s = _norm(f(w["word"]))
        h += s
        own += [k] * len(s)
    if not words:
        return 0.0, 0.0, []
    if not t or not h:
        return float(words[0]["start"]), float(words[-1]["end"]), []
    sm = difflib.SequenceMatcher(None, t, h, autojunk=False)
    hit = [j for a, j, n in sm.get_matching_blocks() for j in range(j, j + n)]
    if not hit:
        return float(words[0]["start"]), float(words[-1]["end"]), []
    first, last = own[min(hit)], own[max(hit)]
    # the script's own text matched up to here: what comes after the script's end is extra
    covered = sum(n for _, _, n in sm.get_matching_blocks())
    extra = [w["word"].strip() for w in words[last + 1 :] if _norm(w["word"])]  # not a lone "!" or "?"
    if len(h) > 1.35 * len(t) and covered < 0.9 * len(h):
        extra.append(f"(+{len(h) - len(t)} chars)")
    return float(words[first]["start"]), float(words[last]["end"]), extra


WEAK_DB = 20.0  # frames this far under the speech level are "decay" at the edges …
MAX_DECAY_S = 0.15  # … and at most this much of it is kept before the first / after the last strong frame


def speech_bounds(x: np.ndarray, sr: int, span: tuple[float, float] | None = None) -> tuple[float, float]:
    """(start, end) of the speech in seconds; `span` = (first word start, last word end) from Whisper.

    Segments count from the first word's start − 0.1 s to the last word's end + 0.1 s (a final "t" can
    be released after a short closure); the end is at most that word's end + 0.3 s. Then a long weak
    plateau at either edge (a breath, a low hum glued to the last word) is cut to 150 ms of decay."""
    d = frames_db(x, sr)
    level = speech_level(d)
    segs = segments(d, max(level - 30.0, -75.0))
    if not segs:
        return 0.0, len(x) / sr
    if span:
        ws, we = span
        keep = [s for s in segs if s[0] * HOP < we + 0.1 and s[1] * HOP > ws - 0.1] or segs
        a = max(keep[0][0] * HOP, ws - 0.25)
        b = min(keep[-1][1] * HOP + (WIN - HOP), we + 0.3)
    else:
        # without words: a short blip after a clear pause at either end is a click or a breath, not speech
        while len(segs) > 1 and segs[-1][1] - segs[-1][0] < 0.1 / HOP and segs[-1][0] - segs[-2][1] > 0.3 / HOP:
            segs.pop()
        while len(segs) > 1 and segs[0][1] - segs[0][0] < 0.1 / HOP and segs[1][0] - segs[0][1] > 0.3 / HOP:
            segs.pop(0)
        a, b = segs[0][0] * HOP, segs[-1][1] * HOP + (WIN - HOP)
    i0, i1 = int(a / HOP), max(int(a / HOP) + 1, int(b / HOP))
    strong = np.flatnonzero(d[i0:i1] > level - WEAK_DB)
    if len(strong):
        a = max(a, (i0 + strong[0]) * HOP - MAX_DECAY_S)
        b = min(b, (i0 + strong[-1]) * HOP + WIN + MAX_DECAY_S)
    return a, b


def _fade(n: int) -> np.ndarray:
    return (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))) if n > 0 else np.zeros(0)


def shorten_pauses(x: np.ndarray, sr: int) -> np.ndarray:
    """Pauses inside the line longer than MAX_PAUSE_S → MAX_PAUSE_S (cut in the middle of the quiet, with a
    short crossfade), so a slow Piper sentence break does not leave a child waiting."""
    d = frames_db(x, sr)
    segs = segments(d, max(speech_level(d) - 30.0, -75.0))
    out, pos = [], 0
    xf = int(0.01 * sr)
    for (_, b), (a2, _) in zip(segs, segs[1:]):
        gap = (a2 - b) * HOP
        if gap <= MAX_PAUSE_S:
            continue
        # keep half the allowed pause after the speech and half before the next segment
        cut_a, cut_b = int((b * HOP + MAX_PAUSE_S / 2) * sr), int((a2 * HOP - MAX_PAUSE_S / 2) * sr)
        if cut_b - cut_a <= 2 * xf:
            continue
        out.append(x[pos : cut_a + xf].copy())
        pos = cut_b - xf
    out.append(x[pos:].copy())
    if len(out) == 1:
        return x
    y = out[0]
    ramp = _fade(2 * xf)
    for s in out[1:]:
        o = min(2 * xf, len(y), len(s))
        r = ramp[:o] if o == 2 * xf else _fade(o)
        y = np.concatenate([y[: len(y) - o], y[len(y) - o :] * r[::-1] + s[:o] * r, s[o:]])
    return y


def tidy(x: np.ndarray, sr: int, a: float, b: float, pause: bool = True) -> np.ndarray:
    """Cut to a − 50 ms … b + 80 ms, fade in 15 ms, fade out the last 50 ms to exactly 0, add 60 ms of zeros."""
    i0 = max(0, int((a - 0.05) * sr))
    i1 = min(len(x), int((b + 0.08) * sr))
    y = np.asarray(x[i0:i1], dtype=np.float64).copy()
    if pause:
        y = shorten_pauses(y, sr)
    fi, fo = min(len(y) // 2, int(0.015 * sr)), min(len(y) // 2, int(0.05 * sr))
    y[:fi] *= _fade(fi)
    y[len(y) - fo :] *= _fade(fo)[::-1]
    y[-1:] = 0.0
    return np.concatenate([y, np.zeros(int(0.06 * sr))])


def tail_issues(x: np.ndarray, sr: int, span: tuple[float, float] | None = None) -> tuple[list[str], float, float]:
    """The automatic ending check on a finished clip → (problems, speech start, speech end).

    Flags energy above −50 dBFS more than 150 ms after the speech end — except one short, soft burst
    (≤ 120 ms, under −35 dBFS): the release of a final plosive ("zpět", "alatt") after its closure, which
    Whisper's last-word end often misses. Breaths, hums and mumbles are longer or louder. Also flags more
    than 0.3 s after the speech and a start later than 0.25 s (from energy: Whisper's first-word time is
    often late)."""
    a, b = speech_bounds(x, sr, span)
    a = speech_bounds(x, sr)[0]
    d = frames_db(x, sr)
    dur = len(x) / sr
    issues = []
    late = np.flatnonzero((np.arange(len(d)) * HOP > b + TAIL_AFTER_S) & (d > TAIL_DB))
    release = len(late) and (late[-1] - late[0] + 1) * HOP <= 0.12 and d[late].max() < -35
    if len(late) and not release:
        issues.append(f"tail {d[late].max():.0f} dBFS at {late[0] * HOP:.2f}s (speech ends {b:.2f}s)")
    end = late[-1] * HOP + WIN if release else b
    if dur - end > 0.3:
        issues.append(f"{dur - end:.2f}s after speech")
    if a > 0.25:
        issues.append(f"starts late ({a:.2f}s)")
    return issues, a, b


_VOWELS = re.compile(r"[aeiouyáéíóúůýäöüëïõãâêîôûàèìòùăőűœæøåаеєиіїоуюяыэё]+", re.I)
_SMALL_KANA = set("ゃゅょぁぃぅぇぉャュョァィゥェォ")


def syllables(text: str, lang: str) -> int:
    if lang == "ja":  # morae: kana (small ones join the previous), kanji ≈ 1.5 each
        n = sum(1 for c in text if ("぀" <= c <= "ヿ") and c not in _SMALL_KANA and c != "ー")
        n += round(1.5 * sum(1 for c in text if "一" <= c <= "鿿"))
        return max(1, n)
    if lang == "zh":
        return max(1, sum(1 for c in text if "一" <= c <= "鿿"))
    return max(1, len(_VOWELS.findall(text)))


def speaking_time(x: np.ndarray, sr: int) -> float:
    """Seconds of actual speech (energy segments, pauses over 120 ms left out) — for the articulation rate."""
    d = frames_db(x, sr)
    return max(HOP, sum(b - a for a, b in segments(d, max(speech_level(d) - 30.0, -75.0))) * HOP)
