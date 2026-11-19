#!/usr/bin/env python3
"""Speak Edyta's tutorial lines with Chatterbox Multilingual (MIT, Resemble AI) — same voice and settings
as Edyta in the Pastelki reels (pastelki/reels/render_lines.py + lines.json: built-in "default" voice,
exaggeration ~0.8; here 0.75 for a calmer teacher tone; cfg_weight 0.3 = slower, more deliberate pacing
for 2–4-year-olds — finish.py slows any take that is still too fast).

    CHATTERBOX_PY tools/voice/render_chatterbox.py LINES.json OUT_DIR [lang,lang…] [--seed N] [--takes N] [--keys a,b]

Writes OUT_DIR/<lang>-<line>.wav and, with --takes N > 1, extra takes <lang>-<line>.t1.wav … (other seeds);
trim_check.py keeps the best take. Existing files are kept (delete one to re-render it). --keys: only these
lines. Short Chinese lines can loop (the model repeats the sentence): extra takes are the cure.
Order: all of Polish first, then English, then every other language line by line in the key order of
lines.json (instructions → praise → hints), so a partial run still covers the important lines everywhere.
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
a = ap.parse_args()

spec = json.loads(Path(a.lines).read_text())
out = Path(a.out)
out.mkdir(parents=True, exist_ok=True)
dev = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
model = ChatterboxMultilingualTTS.from_pretrained(device=dev)
# Keep a pristine copy of the built-in voice and restore it for every line (see render_lines.py:
# generate() reuses model.conds, which a previous reference would have overwritten).
BUILTIN = os.path.join(tempfile.mkdtemp(), "builtin_conds.pt")
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
    text = spec[lang][key]
    dest = out / (f"{lang}-{key}.wav" if take == 0 else f"{lang}-{key}.t{take}.wav")
    if dest.exists():
        continue
    torch.manual_seed(a.seed + keys.index(key) + 1000 * take)
    t = time.time()
    model.conds = Conditionals.load(BUILTIN, map_location=dev).to(dev)
    try:
        wav = model.generate(text, language_id=lang, exaggeration=EXAGGERATION, cfg_weight=CFG_WEIGHT)
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
