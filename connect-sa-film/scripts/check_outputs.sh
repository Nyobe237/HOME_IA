#!/usr/bin/env bash
# Contrôle technique des exports : durée, nombre d'images, dimensions, cadence, audio, sonie.
set -uo pipefail
cd "$(dirname "$0")/.."
for f in out/CONNECT_FUSION_HORIZONTAL_40S.mp4 out/CONNECT_FUSION_VERTICAL_40S.mp4; do
  [[ -f "$f" ]] || { echo "MANQUANT : $f"; continue; }
  echo "== $f ($(du -h "$f" | cut -f1))"
  ffprobe -v error -count_frames -select_streams v:0 \
    -show_entries stream=codec_name,width,height,r_frame_rate,nb_read_frames,pix_fmt -of default=nw=1 "$f"
  ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate -of default=nw=1 "$f"
  ffprobe -v error -show_entries format=duration -of default=nw=1 "$f"
  ffmpeg -nostats -hide_banner -i "$f" -map 0:a:0 -af ebur128=peak=true -f null - 2>&1 \
    | grep -A12 "Summary" | grep -E "I:|LRA:|Peak:" | sed 's/^/  sonie /'
done
