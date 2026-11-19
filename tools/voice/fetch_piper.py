#!/usr/bin/env python3
"""Speak Edyta's lines for the languages Chatterbox does not know (uk cs sk ro hu) with the Pastelki
Piper voices (CC0; https://pastelki.marchew.work/api/tts — 60 lines per hour per visitor, so we wait
between requests and back off on 429/503). A female voice is used where Pastelki has one.

    python3 tools/voice/fetch_piper.py LINES.json OUT_DIR
    PY tools/voice/fetch_piper.py LINES.json OUT_DIR --local VOICE_DIR [--takes N]   # same voices, run here
        [--langs uk,cs] [--keys a,b] [--speed-scale 1.0] [--noise-scale 0.667] [--noise-w 0.8] [--soften]

Writes OUT_DIR/<lang>-<line>.wav, line by line in the key order of lines.json (instructions first).
Existing files are kept. --local runs the Piper models itself, exactly as pastelki/tts/server.py does
(piper-tts 1.6.0; length_scale = 1/speed, the voice's speaker, lowercase text for letter-based models) —
no rate limit. Piper draws phoneme durations at random (noise_w), so --takes N writes extra takes
<lang>-<line>.t1.wav … for trim_check.py to choose from.
Voice options (--local only; defaults = the current Edyta): --speed-scale multiplies every voice's speed
(0.9 = 10 % slower at the source, no time-stretch afterwards); --noise-scale / --noise-w are Piper's
expressiveness and duration randomness (lower = steadier, calmer); --soften speaks "!" as "." (the
bubble keeps its text), as render_chatterbox.py --soften.
VOICE_DIR holds <model>.onnx + .onnx.json from https://huggingface.co/rhasspy/piper-voices
(model names: pastelki/tts/voices.json).
"""
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://pastelki.marchew.work/api/tts"
VOICES = {"uk": "uk-tetiana", "cs": "cs-jirka", "sk": "sk-lili", "ro": "ro-mihai", "hu": "hu-anna"}
# slow and clear for 2–4-year-olds (was 0.9 everywhere, which children found too fast): length_scale 1.33; the
# Czech voice is the slowest of all already (3.6 syllables/s at 0.9), so it is slowed less — at 0.75 the intro
# line took 11 s
SPEED = {"cs-jirka": 0.85}
DEFAULT_SPEED = 0.75
MODELS = {"uk-tetiana": ("uk_UA-ukrainian_tts-medium", "tetiana"), "cs-jirka": ("cs_CZ-jirka-medium", None),
          "sk-lili": ("sk_SK-lili-medium", None), "ro-mihai": ("ro_RO-mihai-medium", None), "hu-anna": ("hu_HU-anna-medium", None)}
GAP_S = 61  # stay under the server's 60 lines per hour



def opt(name: str, default):
    return type(default)(args[args.index(name) + 1]) if name in args else default


def local(voice_dir: Path):
    import io
    import wave

    from piper import PiperVoice, SynthesisConfig

    cache = {}

    def say(voice: str, text: str) -> bytes:
        model, speaker = MODELS[voice]
        if model not in cache:
            cache[model] = PiperVoice.load(str(voice_dir / f"{model}.onnx"))
        v = cache[model]
        sid = v.config.speaker_id_map.get(speaker) if speaker else None
        cfg = SynthesisConfig(speaker_id=sid, length_scale=1 / (SPEED.get(voice, DEFAULT_SPEED) * opt("--speed-scale", 1.0)))
        if "--noise-scale" in args:
            cfg.noise_scale = opt("--noise-scale", 0.667)
        if "--noise-w" in args:
            cfg.noise_w_scale = opt("--noise-w", 0.8)
        if "--soften" in args:
            text = text.replace("!", ".").replace("¡", "")
        if str(getattr(v.config.phoneme_type, "value", "")) == "text":
            text = text.lower()
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            v.synthesize_wav(text, w, syn_config=cfg)
        return buf.getvalue()

    return say


spec = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
args = sys.argv[3:]
say = local(Path(args[args.index("--local") + 1])) if "--local" in args else None
takes = int(args[args.index("--takes") + 1]) if "--takes" in args else 1
keys = [k for k in spec["pl"].keys() if "--keys" not in args or k in opt("--keys", "").split(",")]
langs = opt("--langs", ",".join(VOICES)).split(",")
for key in keys:
    for lang, voice in VOICES.items():
        if lang not in langs:
            continue
        text = spec[lang][key]
        dest = out / f"{lang}-{key}.wav"
        if say:
            for t in range(takes):
                d = dest if t == 0 else out / f"{lang}-{key}.t{t}.wav"
                if not d.exists():
                    d.write_bytes(say(voice, text))
                    print("ok", d.name, voice, "(local)", flush=True)
            continue
        if dest.exists():
            continue
        body = json.dumps({"voice": voice, "text": text, "speed": SPEED.get(voice, DEFAULT_SPEED)}).encode()
        for attempt in range(8):
            req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json", "User-Agent": "kolorowanki-voice-tool"})
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    dest.write_bytes(r.read())
                print("ok", dest.name, voice, flush=True)
                break
            except urllib.error.HTTPError as e:
                wait = 60 * (attempt + 1) if e.code == 429 else 20
                print(f"{dest.name}: HTTP {e.code}, waiting {wait}s", flush=True)
                time.sleep(wait)
        time.sleep(GAP_S)
