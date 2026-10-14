#!/usr/bin/env bash
# Remplace la bande-son des MP4 rendus par les mix courants (aucun re-rendu de l'image) :
#   out/CONNECT_FUSION_{HORIZONTAL,VERTICAL}_40S.mp4               <- public/audio/connect_mix.wav
#   out/CONNECT_FUSION_{HORIZONTAL,VERTICAL}_40S_VOIX_FEMININE.mp4 <- public/audio/connect_mix_voix_feminine.wav
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/tmp
for f in HORIZONTAL VERTICAL; do
  src="out/CONNECT_FUSION_${f}_40S.mp4"
  cp "$src" "out/tmp/${f}_video.mp4"
  for variant in "" "_VOIX_FEMININE"; do
    wav=public/audio/connect_mix.wav
    [[ -n "$variant" ]] && wav=public/audio/connect_mix_voix_feminine.wav
    ffmpeg -v error -y -i "out/tmp/${f}_video.mp4" -i "$wav" -map 0:v:0 -map 1:a:0 -c:v copy \
      -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart "out/CONNECT_FUSION_${f}_40S${variant}.mp4"
  done
done
rm -rf out/tmp
bash scripts/check_outputs.sh
