#!/usr/bin/env bash
# Extrait les images clés des exports et des planches-contacts de comparaison.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p deliverables/keyframes
declare -A T=( [01_recherche]=6.9 [02_orbite]=15.0 [03_signature]=38.5 )
for k in "${!T[@]}"; do
  ffmpeg -v error -y -ss "${T[$k]}" -i out/CONNECT_FUSION_HORIZONTAL_40S.mp4 -frames:v 1 "deliverables/keyframes/H_${k}.png"
  ffmpeg -v error -y -ss "${T[$k]}" -i out/CONNECT_FUSION_VERTICAL_40S.mp4 -frames:v 1 "deliverables/keyframes/V_${k}.png"
done
# Planches-contacts (1 image / seconde)
ffmpeg -v error -y -i out/CONNECT_FUSION_HORIZONTAL_40S.mp4 -vf "fps=1,scale=384:216,tile=8x5" -frames:v 1 deliverables/keyframes/PLANCHE_HORIZONTALE.png
ffmpeg -v error -y -i out/CONNECT_FUSION_VERTICAL_40S.mp4 -vf "fps=1,scale=180:320,tile=10x4" -frames:v 1 deliverables/keyframes/PLANCHE_VERTICALE.png
ls -la deliverables/keyframes
