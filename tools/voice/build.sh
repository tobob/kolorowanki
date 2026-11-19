#!/usr/bin/env bash
# Edyta's tutorial voice: 17 lines × 17 languages → assets/voice/edyta/<lang>/<line>.m4a + src/audio/edyta-voice.ts
#
#   tools/voice/build.sh            # everything; existing takes are reused
#
# Text: the i18n keys edyta.<line> (src/audio/edyta-lines.ts) (src/i18n/locales/*.ts) — the speech bubble and the voice are the same words.
#   1. lines.ts            export the lines as JSON
#   2. render_chatterbox   pl en de fr es it pt nl sv tr ja zh: Chatterbox Multilingual (MIT) cloning the reference
#                          voice (CB_ARGS below), TAKES takes per line (other seeds)
#   3. fetch_piper         uk cs sk ro hu: Pastelki Piper voices (CC0), speed 0.75; PIPER_VOICES=dir → run the same
#                          models locally (TAKES takes) instead of https://pastelki.club/api/tts
#                          (3b. vc_piper: only cs is converted onto Edyta's voice, see VC_LANGS below)
#   4. trim_check          Whisper: best take per line, cut at the energy-based speech end (endpoint.py: +80 ms, 50 ms
#                          fade to 0, digital silence — no breath, mumble or garbage after the last word)
#   5. finish              pace (WSOLA only for what is > 15 % faster than the target, ≤ 1.15×), the soft finish
#                          (voicefx.py), Piper languages matched to the Chatterbox ones, clean edges again,
#                          loudness (−20.5 LUFS, peak ≤ −2.5 dBFS), AAC 64k, mouth envelope
#   6. trim_check --verify Whisper + the ending check on the final clips (exit 1 if any clip is flagged)
# Needs: ffmpeg; CHATTERBOX_PY (venv with chatterbox-tts), WHISPER_PY (openai-whisper), FX_PY (pastelki/reels/requirements-fx.txt + audiotsm).
# Fast way (2026-11): Bob's PC Jacek (RTX 3060) has one venv with all of it: ~/pastelki-voice (source env.sh; $PY for all
# three; ../gpu_capped.py 0.31 keeps it to a third of the GPU next to the training jobs; GPU_BUSY while it runs).
# Delete WORK when done (≈ 300 MB of WAVs).
#
# Voice (defaults = Edyta B5c, the app voice since 1.0.3, 2026-11-19; set a variable to override it, or to ""
# for the old behaviour of that step — all four empty = the original sheep voice):
#   CB_ARGS      render_chatterbox.py options; default "--exaggeration 0.3 --cfg-weight 0.25 --temperature 0.55
#                --soften --ref tools/voice/ref/heart.wav" (whole lines, a calm reading of the synthetic Kokoro
#                reference voice of make_ref.py; "--sentences S" would speak sentence by sentence)
#   PIPER_ARGS   fetch_piper.py --local options; default "--noise-scale 0.5 --noise-w 0.6 --soften"
#   VC_TARGET    a wav: vc_piper.py converts the Piper takes of VC_LANGS onto that voice; default
#                tools/voice/ref/heart.wav with VC_LANGS=cs (the male Czech voice → Edyta); uk sk ro hu stay plain
#                Piper, conversion made them harder to understand
#   FINISH_ARGS  finish.py options; default "--chain soft --pace natural --lufs -20.5 --piper-match"
# Lines that stay unclear (trim_check SUSPICIOUS) get more takes, then B's livelier delivery
# ("--exaggeration 0.4 --cfg-weight 0.4 --temperature 0.7", same reference): rerun render_chatterbox.py for them by hand
# (--keys, more --takes) and trim_check.py again — it picks a new take only when it is newer.
set -euo pipefail
cd "$(dirname "$0")/../.."
CB_ARGS=${CB_ARGS---exaggeration 0.3 --cfg-weight 0.25 --temperature 0.55 --soften --ref tools/voice/ref/heart.wav}
PIPER_ARGS=${PIPER_ARGS---noise-scale 0.5 --noise-w 0.6 --soften}
VC_TARGET=${VC_TARGET-tools/voice/ref/heart.wav}
VC_LANGS=${VC_LANGS-cs}
FINISH_ARGS=${FINISH_ARGS---chain soft --pace natural --lufs -20.5 --piper-match}
WORK=${WORK:-$(mktemp -d)/edyta-voice}
TAKES=${TAKES:-3}
CHATTERBOX_PY=${CHATTERBOX_PY:-$HOME/.openclaw/workspace/asmr/venv-chatterbox/bin/python}
WHISPER_PY=${WHISPER_PY:-/opt/homebrew/opt/openai-whisper/libexec/bin/python}
FX_PY=${FX_PY:?set FX_PY to a python with pyworld numpy soundfile audiotsm}
mkdir -p "$WORK"/{raw,trimmed}
npx tsx tools/voice/lines.ts > "$WORK/lines.json"
"$CHATTERBOX_PY" tools/voice/render_chatterbox.py "$WORK/lines.json" "$WORK/raw" --takes "$TAKES" $CB_ARGS
if [ -n "${PIPER_VOICES:-}" ]; then
  "$FX_PY" tools/voice/fetch_piper.py "$WORK/lines.json" "$WORK/raw" --local "$PIPER_VOICES" --takes "$TAKES" $PIPER_ARGS
else
  python3 tools/voice/fetch_piper.py "$WORK/lines.json" "$WORK/raw"
fi
[ -n "$VC_TARGET" ] && "$CHATTERBOX_PY" tools/voice/vc_piper.py "$WORK/raw" "$VC_TARGET" --langs "$VC_LANGS"
"$WHISPER_PY" tools/voice/trim_check.py "$WORK/lines.json" "$WORK/raw" "$WORK/trimmed"
"$FX_PY" tools/voice/finish.py "$WORK/lines.json" "$WORK/trimmed" "$WORK/raw" $FINISH_ARGS
"$WHISPER_PY" tools/voice/trim_check.py "$WORK/lines.json" --verify assets/voice/edyta
echo "work files: $WORK"
