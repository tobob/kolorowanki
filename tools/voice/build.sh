#!/usr/bin/env bash
# Edyta's tutorial voice: 17 lines × 17 languages → assets/voice/edyta/<lang>/<line>.m4a + src/audio/edyta-voice.ts
#
#   tools/voice/build.sh            # everything (≈ 40 min on an Apple-Silicon Mac; existing takes are reused)
#
# Text: the i18n keys edyta.<line> (src/audio/edyta-lines.ts) (src/i18n/locales/*.ts) — the speech bubble and the voice are the same words.
#   1. lines.ts            export the lines as JSON
#   2. render_chatterbox   pl en de fr es it pt nl sv tr ja zh: Chatterbox Multilingual (MIT), Edyta's built-in voice
#   3. fetch_piper         uk cs sk ro hu: Pastelki Piper voices (CC0) via https://pastelki.marchew.work/api/tts
#                          (no voice conversion: Chatterbox VC onto Edyta's voice made these languages hard to
#                          understand, so the Piper takes go straight to the sheep effect)
#   4. trim_check          Whisper: cut to the words, compare with the script (SUSPICIOUS → delete raw take, rerun)
#   5. finish              pastelki/reels/sheepify.py, loudness (−20 dBFS speech RMS, peak ≤ −2 dBFS), AAC 64k, mouth envelope
#   6. trim_check --verify Whisper on the final clips
# Needs: ffmpeg; CHATTERBOX_PY (venv with chatterbox-tts), WHISPER_PY (openai-whisper), FX_PY (pastelki/reels/requirements-fx.txt).
# Delete WORK when done (≈ 100 MB of WAVs).
set -euo pipefail
cd "$(dirname "$0")/../.."
WORK=${WORK:-$(mktemp -d)/edyta-voice}
CHATTERBOX_PY=${CHATTERBOX_PY:-$HOME/.openclaw/workspace/asmr/venv-chatterbox/bin/python}
WHISPER_PY=${WHISPER_PY:-/opt/homebrew/opt/openai-whisper/libexec/bin/python}
FX_PY=${FX_PY:?set FX_PY to a python with pyworld numpy soundfile}
mkdir -p "$WORK"/{raw,piper,trimmed}
npx tsx tools/voice/lines.ts > "$WORK/lines.json"
"$CHATTERBOX_PY" tools/voice/render_chatterbox.py "$WORK/lines.json" "$WORK/raw"
python3 tools/voice/fetch_piper.py "$WORK/lines.json" "$WORK/piper"
cp -n "$WORK"/piper/*.wav "$WORK/raw/"
"$WHISPER_PY" tools/voice/trim_check.py "$WORK/lines.json" "$WORK/raw" "$WORK/trimmed"
"$FX_PY" tools/voice/finish.py "$WORK/lines.json" "$WORK/trimmed" "$WORK/raw"
"$WHISPER_PY" tools/voice/trim_check.py "$WORK/lines.json" --verify assets/voice/edyta
echo "work files: $WORK"
