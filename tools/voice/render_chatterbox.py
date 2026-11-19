#!/usr/bin/env python3
"""Speak Edyta's tutorial lines with Chatterbox Multilingual (MIT, Resemble AI) — same voice and settings
as Edyta in the Pastelki reels (pastelki/reels/render_lines.py + lines.json: built-in "default" voice,
exaggeration ~0.8; here 0.75 for a calmer teacher tone; cfg_weight 0.3 = slower, more deliberate pacing
for 2–4-year-olds — finish.py slows any take that is still too fast).

    CHATTERBOX_PY tools/voice/render_chatterbox.py LINES.json OUT_DIR [lang,lang…] [--seed N] [--takes N] [--keys a,b]
        [--exaggeration 0.75] [--cfg-weight 0.3] [--temperature 0.8] [--ref VOICE.wav] [--soften] [--sentences 0.45]

Writes OUT_DIR/<lang>-<line>.wav and, with --takes N > 1, extra takes <lang>-<line>.t1.wav … (other seeds);
trim_check.py keeps the best take. Existing files are kept (delete one to re-render it). --keys: only these
lines. Short Chinese lines can loop (the model repeats the sentence): extra takes are the cure.
Order: all of Polish first, then English, then every other language line by line in the key order of
lines.json (instructions → praise → hints), so a partial run still covers the important lines everywhere.
Voice options (defaults = the current Edyta; the calmer candidates of 2026-11-19 are in build.sh):
  --exaggeration/--cfg-weight/--temperature  Chatterbox's own knobs (lower exaggeration = calmer, flatter
                 intonation; lower cfg_weight = slower; lower temperature = steadier takes);
  --ref WAV      clone this reference voice (audio_prompt_path) instead of the built-in one;
  --soften       the spoken text only (the bubble keeps its "!"): "!" → "." / "！" → "。", which takes the
                 announcer push out of greetings and praise;
  --sentences S  speak each sentence on its own and join them with S seconds of silence (each sentence cut
                 at its energy-based speech edges): a calmer, story-like pace with real pauses instead of a
                 time-stretch, and short inputs — the cloned voices run out of GPU memory on long lines.
CUDA when present (Jacek, RTX 3060: a few seconds per line, ~3 GB VRAM), else Apple Silicon (MPS, ~20–40 s).
"""
import argparse
import json
import os
import tempfile
import time
from pathlib import Path

import torch
import torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS, Conditionals

CHATTERBOX_LANGS = {"pl", "en", "de", "fr", "es", "it", "pt", "nl", "sv", "tr", "ja", "zh"}
EXAGGERATION = 0.75
CFG_WEIGHT = 0.3

ap = argparse.ArgumentParser()
ap.add_argument("lines")
ap.add_argument("out")
ap.add_argument("langs", nargs="?", default=",".join(sorted(CHATTERBOX_LANGS)))
ap.add_argument("--seed", type=int, default=1000)
ap.add_argument("--takes", type=int, default=1)
ap.add_argument("--keys", default="")
ap.add_argument("--exaggeration", type=float, default=EXAGGERATION)
ap.add_argument("--cfg-weight", type=float, default=CFG_WEIGHT)
ap.add_argument("--temperature", type=float, default=0.8)
ap.add_argument("--ref", default="")
ap.add_argument("--soften", action="store_true")
ap.add_argument("--sentences", type=float, default=0.0)
a = ap.parse_args()


def spoken(text: str) -> str:
    if not a.soften:
        return text
    return text.replace("！", "。").replace("!", ".").replace("¡", "")


def sentences(text: str) -> list[str]:
    import re

    out: list[str] = []
    for p in (p.strip() for p in re.findall(r"[^.!?。！？]+[.!?。！？]*", text)):
        if not p.strip(" .!?。！？"):
            continue
        if out and (len(out[-1].split()) <= 2 and len(out[-1]) <= 12):
            # a lone "Hello." / "Brawo." is too short to speak on its own: "Hello, I'm Edyta …"
            prev = out.pop().rstrip(".!?。！？")
            sep = "、" if re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", prev) else ", "
            out.append(prev + sep + (p[0].lower() + p[1:] if sep == ", " and p[1:2].islower() else p))
        else:
            out.append(p)
    return out


def say(text: str, lang: str):
    """One take: the whole line, or (--sentences) sentence by sentence joined with pauses."""
    kw = dict(language_id=lang, exaggeration=a.exaggeration,
              cfg_weight=a.cfg_weight, temperature=a.temperature)
    if not a.sentences:
        return model.generate(text, **kw)
    import sys as _sys

    _sys.path.insert(0, str(Path(__file__).parent))
    from endpoint import speech_bounds

    parts = []
    for i, s in enumerate(sentences(text)):
        w = model.generate(s, **kw)[0].cpu()
        if dev == "cuda":
            torch.cuda.empty_cache()
        b0, b1 = speech_bounds(w.numpy().astype("float64"), model.sr)
        w = w[max(0, int((b0 - 0.03) * model.sr)): int((b1 + 0.08) * model.sr)].clone()
        f = int(0.03 * model.sr)
        w[-f:] *= torch.linspace(1, 0, f)
        if parts:
            parts.append(torch.zeros(int(a.sentences * model.sr)))
        parts.append(w)
    return torch.cat(parts).unsqueeze(0)

spec = json.loads(Path(a.lines).read_text())
out = Path(a.out)
out.mkdir(parents=True, exist_ok=True)
dev = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
model = ChatterboxMultilingualTTS.from_pretrained(device=dev)
# Keep a pristine copy of the built-in voice and restore it for every line (see render_lines.py:
# generate() reuses model.conds, which a previous reference would have overwritten).
BUILTIN = os.path.join(tempfile.mkdtemp(), "builtin_conds.pt")
if a.ref:
    # the reference voice is analysed once (not on every generate(): that is slow and, next to the training
    # jobs, fragments the GPU share until long lines run out of memory) and restored for every line like
    # the built-in voice
    model.prepare_conditionals(a.ref, exaggeration=a.exaggeration)
model.conds.save(BUILTIN)
langs = a.langs.split(",")
assert all(l in CHATTERBOX_LANGS for l in langs), langs
keys = list(spec[langs[0]].keys())
only = [k for k in a.keys.split(",") if k]
first = [l for l in ("pl", "en") if l in langs]
rest = [l for l in langs if l not in first]
jobs = [(l, k, i) for i in range(a.takes) for l in first for k in keys] + [(l, k, i) for i in range(a.takes) for k in keys for l in rest]
for lang, key, take in jobs:
    if only and key not in only:
        continue
    text = spoken(spec[lang][key])
    dest = out / (f"{lang}-{key}.wav" if take == 0 else f"{lang}-{key}.t{take}.wav")
    if dest.exists():
        continue
    torch.manual_seed(a.seed + keys.index(key) + 1000 * take)
    t = time.time()
    model.conds = Conditionals.load(BUILTIN, map_location=dev).to(dev)
    try:
        wav = say(text, lang)
    except torch.OutOfMemoryError:
        # a take that loops keeps generating (up to 1000 tokens) until the GPU share is used up: it would be
        # a bad take anyway — skip it, the other seeds remain
        print(f"{dest.name} skipped (out of GPU memory: the model looped)", flush=True)
        torch.cuda.empty_cache()
        continue
    finally:
        if dev == "cuda":
            torch.cuda.empty_cache()
    ta.save(str(dest), wav, model.sr)
    print(f"{dest.name} {wav.shape[-1] / model.sr:.2f}s ({time.time() - t:.0f}s) {text}", flush=True)
