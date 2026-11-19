#!/usr/bin/env bash
# Edyta's tutorial voice: 17 lines × 17 languages → assets/voice/edyta/<lang>/<line>.m4a + src/audio/edyta-voice.ts
#
#   tools/voice/build.sh            # everything; existing takes are reused
#
# Text: the i18n keys edyta.<line> (src/audio/edyta-lines.ts) (src/i18n/locales/*.ts) — the speech bubble and the voice are the same words.
#   1. lines.ts            export the lines as JSON
#   2. render_chatterbox   pl en de fr es it pt nl sv tr ja zh: Chatterbox Multilingual (MIT), Edyta's built-in voice,
#                          exaggeration 0.75, cfg_weight 0.3 (slower), TAKES takes per line (other seeds)
#   3. fetch_piper         uk cs sk ro hu: Pastelki Piper voices (CC0), speed 0.75; PIPER_VOICES=dir → run the same
#                          models locally (TAKES takes) instead of https://pastelki.marchew.work/api/tts
#                          (no voice conversion: Chatterbox VC onto Edyta's voice made these languages hard to
#                          understand, so the Piper takes go straight to the sheep effect)
#   4. trim_check          Whisper: best take per line, cut at the energy-based speech end (endpoint.py: +80 ms, 50 ms
#                          fade to 0, digital silence — no breath, mumble or garbage after the last word)
#   5. finish              pace (WSOLA to 80 % of the first version's speech rate), pastelki/reels/sheepify.py,
#                          clean edges again, loudness (−20 dBFS speech RMS, peak ≤ −2.5 dBFS), AAC 64k, mouth envelope
#   6. trim_check --verify Whisper + the ending check on the final clips (exit 1 if any clip is flagged)
# Needs: ffmpeg; CHATTERBOX_PY (venv with chatterbox-tts), WHISPER_PY (openai-whisper), FX_PY (pastelki/reels/requirements-fx.txt + audiotsm).
# Fast way (2026-11): Bob's PC Jacek (RTX 3060) has one venv with all of it: ~/pastelki-voice (source env.sh; $PY for all
# three; ../gpu_capped.py 0.31 keeps it to a third of the GPU next to the training jobs; GPU_BUSY while it runs).
# Delete WORK when done (≈ 300 MB of WAVs).
#
# Voice candidates (2026-11-19, Bob picks one; empty = the current Edyta, nothing changes):
#   CB_ARGS      extra render_chatterbox.py options, e.g. "--exaggeration 0.4 --cfg-weight 0.4 --temperature 0.7 --soften"
#                (+ "--ref tools/voice/ref/heart.wav" for the synthetic reference voices of make_ref.py,
#                "--sentences 0.45" for sentence-by-sentence synthesis with pauses)
#   PIPER_ARGS   extra fetch_piper.py --local options, e.g. "--noise-scale 0.5 --noise-w 0.6 --soften"
#   VC_TARGET    a wav: vc_piper.py converts the Piper takes onto that voice before trim_check
#   FINISH_ARGS  extra finish.py options, e.g. "--chain natural --pace pauses --lufs -20.5 --piper-match"
#                (--chain soft / softer: the quieter "bedtime" finish of round 2)
# Exact settings of each candidate: the README next to the sample page (edyta-voice-samples.html).
set -euo pipefail
cd "$(dirname "$0")/../.."
WORK=${WORK:-$(mktemp -d)/edyta-voice}
TAKES=${TAKES:-3}
CHATTERBOX_PY=${CHATTERBOX_PY:-$HOME/.openclaw/workspace/asmr/venv-chatterbox/bin/python}
WHISPER_PY=${WHISPER_PY:-/opt/homebrew/opt/openai-whisper/libexec/bin/python}
FX_PY=${FX_PY:?set FX_PY to a python with pyworld numpy soundfile audiotsm}
mkdir -p "$WORK"/{raw,trimmed}
npx tsx tools/voice/lines.ts > "$WORK/lines.json"
"$CHATTERBOX_PY" tools/voice/render_chatterbox.py "$WORK/lines.json" "$WORK/raw" --takes "$TAKES" ${CB_ARGS:-}
if [ -n "${PIPER_VOICES:-}" ]; then
  "$FX_PY" tools/voice/fetch_piper.py "$WORK/lines.json" "$WORK/raw" --local "$PIPER_VOICES" --takes "$TAKES" ${PIPER_ARGS:-}
else
  python3 tools/voice/fetch_piper.py "$WORK/lines.json" "$WORK/raw"
fi
[ -n "${VC_TARGET:-}" ] && "$CHATTERBOX_PY" tools/voice/vc_piper.py "$WORK/raw" "$VC_TARGET"
"$WHISPER_PY" tools/voice/trim_check.py "$WORK/lines.json" "$WORK/raw" "$WORK/trimmed"
"$FX_PY" tools/voice/finish.py "$WORK/lines.json" "$WORK/trimmed" "$WORK/raw" ${FINISH_ARGS:-}
"$WHISPER_PY" tools/voice/trim_check.py "$WORK/lines.json" --verify assets/voice/edyta
echo "work files: $WORK"
