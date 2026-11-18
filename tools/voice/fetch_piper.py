#!/usr/bin/env python3
"""Speak Edyta's lines for the languages Chatterbox does not know (uk cs sk ro hu) with the Pastelki
Piper voices (CC0; https://pastelki.marchew.work/api/tts — 60 lines per hour per visitor, so we wait
between requests and back off on 429/503). A female voice is used where Pastelki has one.

    python3 tools/voice/fetch_piper.py LINES.json OUT_DIR

Writes OUT_DIR/<lang>-<line>.wav, line by line in the key order of lines.json (instructions first).
Existing files are kept.
"""
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://pastelki.marchew.work/api/tts"
VOICES = {"uk": "uk-tetiana", "cs": "cs-jirka", "sk": "sk-lili", "ro": "ro-mihai", "hu": "hu-anna"}
SPEED = 0.9  # a little slower for small children
GAP_S = 61  # stay under the server's 60 lines per hour

spec = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
keys = list(spec["pl"].keys())
for key in keys:
    for lang, voice in VOICES.items():
        text = spec[lang][key]
        dest = out / f"{lang}-{key}.wav"
        if dest.exists():
            continue
        body = json.dumps({"voice": voice, "text": text, "speed": SPEED}).encode()
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
