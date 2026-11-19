#!/usr/bin/env python3
"""Optional: give the Piper languages Edyta's own timbre with Chatterbox voice conversion (S3Gen, MIT).

    CHATTERBOX_PY tools/voice/vc_piper.py RAW_DIR TARGET.wav [--langs uk,cs,sk,ro,hu]

Every Piper take RAW_DIR/<lang>-<line>[.tN].wav is converted onto TARGET.wav's voice (a calm Chatterbox take
of Edyta, or the reference given to render_chatterbox.py --ref) and written over itself; the dry Piper
original is kept as RAW_DIR/piper-dry/<same name> and a converted file is never converted twice. Run it after
fetch_piper.py and before trim_check.py, which then picks the clearest converted take.
2026-11-19: uk converted this way kept Whisper similarity 1.00 (tray and tapOk) and came within ~2 dB of the
Chatterbox languages' brightness (it was ~13 dB duller); earlier tests found other Piper languages harder to
understand after conversion, so check trim_check's scores per language before keeping it.
"""
import argparse
import shutil
from pathlib import Path

import torch
import torchaudio as ta
from chatterbox.vc import ChatterboxVC

ap = argparse.ArgumentParser()
ap.add_argument("raw")
ap.add_argument("target")
ap.add_argument("--langs", default="uk,cs,sk,ro,hu")
a = ap.parse_args()
dev = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
vc = ChatterboxVC.from_pretrained(dev)
raw = Path(a.raw)
(raw / "piper-dry").mkdir(exist_ok=True)
for lang in a.langs.split(","):
    for src in sorted(raw.glob(f"{lang}-*.wav")):
        keep = raw / "piper-dry" / src.name
        if keep.exists() and src.stat().st_mtime > keep.stat().st_mtime:
            continue  # already converted (copy2 keeps the dry take's time; the converted file is newer)
        if not keep.exists():
            shutil.copy2(src, keep)
        with torch.inference_mode():
            wav = vc.generate(str(keep), target_voice_path=a.target)
        ta.save(str(src), wav.cpu(), vc.sr)
        print("vc", src.name, flush=True)
        if dev == "cuda":
            torch.cuda.empty_cache()
