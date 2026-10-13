#!/usr/bin/env bash
# Rendu des deux versions du film CONNECT SA (40 s, 30 i/s, 1200 images chacune).
# Usage : scripts/render.sh [horizontal|vertical|all]   (défaut : all)
# Variables : CONCURRENCY (défaut 2), REMOTION_BROWSER (chemin d'un Chromium headless si différent).
set -euo pipefail
cd "$(dirname "$0")/.."
WHICH="${1:-all}"
CONC="${CONCURRENCY:-2}"
COMMON=(--codec=h264 --crf=15 --x264-preset=slow --pixel-format=yuv420p --image-format=png
        --audio-codec=aac --audio-bitrate=320k --concurrency="$CONC" --log=info)
mkdir -p out
if [[ "$WHICH" == "horizontal" || "$WHICH" == "all" ]]; then
  npx remotion render src/index.ts ConnectHorizontal out/CONNECT_FUSION_HORIZONTAL_40S.mp4 "${COMMON[@]}"
fi
if [[ "$WHICH" == "vertical" || "$WHICH" == "all" ]]; then
  npx remotion render src/index.ts ConnectVertical out/CONNECT_FUSION_VERTICAL_40S.mp4 "${COMMON[@]}"
fi
bash scripts/check_outputs.sh
