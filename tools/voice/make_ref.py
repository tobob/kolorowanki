#!/usr/bin/env python3
"""Make the synthetic reference voices for render_chatterbox.py --ref / vc_piper.py (tools/voice/ref/).

    KOKORO_PY tools/voice/make_ref.py tools/voice/ref        # needs kokoro (Kokoro-82M, Apache-2.0); rubberband CLI

Edyta's candidate voice "B" (2026-11-19) clones a Kokoro voice, never a recording of a real person:
  heart.wav        af_heart, speed 0.9, the first phrases (≤ 8 s, cut at a phrase end) of TEXT
  heart_low.wav    heart.wav one semitone lower, formants kept (rubberband -3 -F -p -1): the clone follows
                   the reference's pitch, so this lowers Edyta without any vocoder pass on the clips
  heart_bella.wav  a style blend 0.7 af_heart + 0.3 af_bella (a little darker and calmer), speed 0.9
All are peak-normalised to about −8 dBFS. The committed wavs are the exact references of the 2026-11-19
samples (kokoro 0.9.4); rerunning this may give a very slightly different cut.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline

sys.path.insert(0, str(Path(__file__).parent))
from endpoint import HOP, frames_db, segments, speech_level  # noqa: E402

TEXT = ("Hello, little one. Shall we draw a picture together? First, we pick a colour. "
        "Then we tap the picture, gently, like this. Oh, that looks lovely. You did it all by yourself.")
SR = 24000
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
p = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")


def render(voice, dest: Path, speed: float = 0.9, max_s: float = 8.0) -> None:
    y = np.concatenate([np.asarray(a) for _, _, a in p(TEXT, voice=voice, speed=speed)])
    d = frames_db(y, SR)
    ends = [b for a, b in segments(d, speech_level(d) - 30) if 5 <= b * HOP <= max_s]
    y = y[: int((ends[-1] * HOP + 0.1) * SR)].copy()
    f = int(0.03 * SR)
    y[-f:] *= np.linspace(1, 0, f)
    sf.write(dest, y / np.abs(y).max() * 10 ** (-8 / 20), SR)
    print(dest, f"{len(y) / SR:.2f}s")


render("af_heart", out / "heart.wav")
subprocess.run(["rubberband", "-q", "-3", "-F", "-p", "-1", str(out / "heart.wav"), str(out / "heart_low.wav")], check=True)
render(0.7 * p.load_voice("af_heart") + 0.3 * p.load_voice("af_bella"), out / "heart_bella.wav")
