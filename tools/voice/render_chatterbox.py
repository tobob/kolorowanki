#!/usr/bin/env python3
"""Speak Edyta's tutorial lines with Chatterbox Multilingual (MIT, Resemble AI) — same voice and settings
as Edyta in the Pastelki reels (pastelki/reels/render_lines.py + lines.json: built-in "default" voice,
exaggeration ~0.8; here 0.75 for a calmer teacher tone).

    ~/.openclaw/workspace/asmr/venv-chatterbox/bin/python tools/voice/render_chatterbox.py LINES.json OUT_DIR [lang,lang…] [--seed N]

Writes OUT_DIR/<lang>-<line>.wav. Existing files are kept (delete one to re-render it).
Order: all of Polish first, then English, then every other language line by line in the key order of
lines.json (instructions → praise → hints), so a partial run still covers the important lines everywhere.
Runs on Apple Silicon (MPS), ~20–40 s per short line.
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

ap = argparse.ArgumentParser()
ap.add_argument("lines")
ap.add_argument("out")
ap.add_argument("langs", nargs="?", default=",".join(sorted(CHATTERBOX_LANGS)))
ap.add_argument("--seed", type=int, default=1000)
a = ap.parse_args()

spec = json.loads(Path(a.lines).read_text())
out = Path(a.out)
out.mkdir(parents=True, exist_ok=True)
dev = "mps" if torch.backends.mps.is_available() else "cpu"
model = ChatterboxMultilingualTTS.from_pretrained(device=dev)
# Keep a pristine copy of the built-in voice and restore it for every line (see render_lines.py:
# generate() reuses model.conds, which a previous reference would have overwritten).
BUILTIN = os.path.join(tempfile.mkdtemp(), "builtin_conds.pt")
model.conds.save(BUILTIN)
langs = a.langs.split(",")
assert all(l in CHATTERBOX_LANGS for l in langs), langs
keys = list(spec[langs[0]].keys())
first = [l for l in ("pl", "en") if l in langs]
rest = [l for l in langs if l not in first]
jobs = [(l, k) for l in first for k in keys] + [(l, k) for k in keys for l in rest]
for lang, key in jobs:
    text = spec[lang][key]
    dest = out / f"{lang}-{key}.wav"
    if dest.exists():
        continue
    torch.manual_seed(a.seed + keys.index(key))
    t = time.time()
    model.conds = Conditionals.load(BUILTIN, map_location=dev).to(dev)
    wav = model.generate(text, language_id=lang, exaggeration=EXAGGERATION, cfg_weight=0.4)
    ta.save(str(dest), wav, model.sr)
    print(f"{dest.name} {wav.shape[-1] / model.sr:.2f}s ({time.time() - t:.0f}s) {text}", flush=True)
