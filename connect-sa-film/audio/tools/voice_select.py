"""Candidate voice comparison (objective, since nobody listens in this pipeline).

For each of the 7 French voices: synthesize every VO line (3 seeds, default scales), measure
prosody (F0 median / range / std), pause noise floor, voiced spectral flatness, HNR, spectral tilt,
clicks, speech rate and natural duration vs. window; write WAVs (for the optional ASR check),
spectrogram PNGs and a JSON/Markdown summary into audio/analysis/voices/.

  audio/.venv/bin/python audio/tools/voice_select.py [--seeds 1 2 3]
"""
from __future__ import annotations

import argparse
import json
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from connect_audio import analysis as an  # noqa: E402
from connect_audio import tts  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "audio" / "analysis" / "voices"
VOWELS = set("aeiouyøœəɛɔɑ") | {"ɑ̃", "ɔ̃", "ɛ̃", "œ̃"}


def n_syll(text):
    n = 0
    for sent in tts.phonemize(text):
        for _, ph in sent:
            n += sum(1 for p in ph if p and p[0] in VOWELS)
    return n


def write_wav16(p, a, sr):
    a = np.clip(a / (np.abs(a).max() + 1e-9) * 0.9, -1, 1)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((a * 32767).astype("<i2").tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, nargs="+", default=[1, 2, 3])
    ap.add_argument("--voices", nargs="+", default=list(tts.VOICES))
    ap.add_argument("--wavdir", default=str(OUT / "wav"))
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    wavdir = Path(a.wavdir)
    wavdir.mkdir(parents=True, exist_ok=True)
    tl = json.loads((ROOT / "src" / "timeline.json").read_text())
    lines = tl["voiceover"]
    refs, summary = {}, {}
    for vk in a.voices:
        v = tts.VOICES[vk]
        per = []
        concat = []
        for ln in lines:
            sp = tts.spoken_text(ln["text"])
            ns = n_syll(sp)
            for s in a.seeds:
                x, sr = tts.synth(sp, v, seed=s)
                m = an.voice_metrics(x, sr, ns)
                m.update(id=ln["id"], seed=s, window=ln["window"][1] - ln["window"][0])
                per.append(m)
                p = wavdir / f"{vk}_{ln['id']}_s{s}.wav"
                write_wav16(p, x, sr)
                refs[str(p)] = ln["text"].replace("CONNECT SA", "Connect SA")
                if s == a.seeds[0]:
                    concat += [x / (np.abs(x).max() + 1e-9), np.zeros(int(0.3 * sr))]
        keys = ["f0_median_hz", "f0_range_st", "f0_std_st", "noise_floor_db", "flatness_voiced", "hnr_db",
                "tilt_db", "centroid_hz", "clicks", "syll_per_s", "voiced_ratio"]
        agg = {k: float(np.nanmedian([m[k] for m in per])) for k in keys}
        agg["clicks_total"] = int(sum(m["clicks"] for m in per))
        # natural duration (seed-averaged active duration) / window -> needed length_scale
        fit = {}
        for ln in lines:
            d = np.mean([m["dur_active_s"] for m in per if m["id"] == ln["id"]])
            w = ln["window"][1] - ln["window"][0] - 0.16
            fit[ln["id"]] = round(float(w / d), 3)
        agg["max_fit_scale_by_line"] = fit
        agg["min_needed_scale"] = float(min(fit.values()))
        agg["label"] = v.label
        agg["gender"] = v.gender
        summary[vk] = agg
        allx = np.concatenate(concat)
        an.spectrogram_png(allx, sr, OUT / f"spec_{vk}.png", title=f"{v.label} — full script, seed {a.seeds[0]}",
                           width=1800, height=360, fmax=sr / 2)
        print(vk, json.dumps({k: (round(val, 3) if isinstance(val, float) else val) for k, val in agg.items()},
                             ensure_ascii=False), flush=True)
    (OUT / "metrics.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False))
    (OUT / "asr_refs.json").write_text(json.dumps(refs, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
