#!/usr/bin/env bash
# Variantes « voix féminine » : même image, piste son remplacée (aucun re-rendu de l'image).
set -euo pipefail
cd "$(dirname "$0")/.."
for f in HORIZONTAL VERTICAL; do
  ffmpeg -v error -y -i "out/CONNECT_FUSION_${f}_40S.mp4" -i public/audio/connect_mix_voix_feminine.wav \
    -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart \
    "out/CONNECT_FUSION_${f}_40S_VOIX_FEMININE.mp4"
done
ls -la out/*VOIX_FEMININE.mp4
