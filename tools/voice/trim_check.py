#!/usr/bin/env python3
"""Cut each spoken line to its words and check that it says the right thing (Whisper, MIT, OpenAI) —
same idea as pastelki/reels/trim_lines.py.

    WHISPER_PY tools/voice/trim_check.py LINES.json IN_DIR OUT_DIR       # trim raw lines → OUT_DIR
    WHISPER_PY tools/voice/trim_check.py LINES.json --verify ASSET_DIR   # transcribe the final m4a clips

Files: IN_DIR/<lang>-<line>.wav → OUT_DIR/<lang>-<line>.wav (lines already trimmed and newer are skipped);
--verify reads ASSET_DIR/<lang>/<line>.m4a.

WHISPER_PY: a Python with openai-whisper (e.g. /opt/homebrew/opt/openai-whisper/libexec/bin/python).
Text-to-speech often keeps "talking" after the sentence (breaths, mumbles); the line is cut 80 ms before
the first and 200 ms after the last word, with 15 ms fades. The transcript is compared with the script
(words; characters for ja/zh). Similarity < 0.7 is printed as SUSPICIOUS — re-render that line with
another seed. In trim mode a JSON report is written to OUT_DIR/whisper-report.json.
"""
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import whisper


def read(f: Path) -> tuple[np.ndarray, int]:
    sr = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate",
                             "-of", "csv=p=0", str(f)], capture_output=True, text=True, check=True).stdout.strip())
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-f", "f32le", "-ac", "1", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy(), sr


def write(f: Path, y: np.ndarray, sr: int) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-", "-c:a", "pcm_f32le", str(f)],
                   input=y.astype(np.float32).tobytes(), check=True)


def tokens(s: str, lang: str) -> list[str]:
    s = re.sub(r"[^\w ]", "", s.lower())
    return list(s.replace(" ", "")) if lang in ("ja", "zh") else s.split()


spec = json.loads(Path(sys.argv[1]).read_text())
verify = sys.argv[2] == "--verify"
src = Path(sys.argv[3] if verify else sys.argv[2])
out = None if verify else Path(sys.argv[3])
if out:
    out.mkdir(parents=True, exist_ok=True)
model = whisper.load_model("large-v3-turbo")
report = {}
for lang, lines in spec.items():
    for key, text in lines.items():
        f = src / lang / f"{key}.m4a" if verify else src / f"{lang}-{key}.wav"
        if not f.exists() or (out and (out / f.name).exists() and (out / f.name).stat().st_mtime > f.stat().st_mtime):
            continue
        r = model.transcribe(str(f), language=lang, word_timestamps=not verify, fp16=False)
        heard = r["text"].strip()
        sim = difflib.SequenceMatcher(None, tokens(text, lang), tokens(heard, lang)).ratio()
        report[f"{lang}-{key}"] = {"sim": round(sim, 3), "heard": heard}
        flag = "SUSPICIOUS " if sim < 0.7 else ""
        print(f"{flag}{lang}-{key} {sim:.2f} | {heard}", flush=True)
        if verify:
            continue
        x, sr = read(f)
        words = [w for s in r["segments"] for w in s.get("words", [])]
        if words:
            a = max(0, int((words[0]["start"] - 0.08) * sr))
            b = min(len(x), int((words[-1]["end"] + 0.2) * sr))
            x = x[a:b].copy()
        n = min(len(x) // 2, int(0.015 * sr))
        ramp = np.linspace(0, 1, n, dtype=np.float32)
        x[:n] *= ramp
        x[len(x) - n:] *= ramp[::-1]
        write(out / f.name, x, sr)
if out:
    rep = out / "whisper-report.json"
    old = json.loads(rep.read_text()) if rep.exists() else {}
    rep.write_text(json.dumps({**old, **report}, ensure_ascii=False, indent=1))
