#!/usr/bin/env python3
"""Bande-son complète du film CONNECT SA (40,000 s, 48 kHz, stéréo) — une seule commande, déterministe.

    cd audio && .venv/bin/python build_audio.py

Produit :
  public/audio/connect_mix.wav                 mix principal (voix masculine) utilisé par le film
  public/audio/connect_mix_voix_feminine.wav   mix alternatif (voix féminine)
  public/audio/stems/{voice,voice_female,music,sfx}.wav
  deliverables/audio/VOIX_OFF_CONNECT_SA.wav, VOIX_OFF_CONNECT_SA_feminine.wav, MUSIQUE_SEULE.wav
  deliverables/audio/VOIX_OFF_SCRIPT.md, audio/analysis/report.json, audio/analysis/*.png
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from connect_audio import analysis as an  # noqa: E402
from connect_audio import dsp, music, sfx  # noqa: E402
from connect_audio import voice as V  # noqa: E402

ROOT = HERE.parent
PUB = ROOT / "public" / "audio"
DELIV = ROOT / "deliverables" / "audio"
ANA = HERE / "analysis"
SR = dsp.SR
DUR = 40.0
N = int(DUR * SR)

MAIN_VOICE = V.VoiceProfile(key="bernard", seeds=(1, 2, 3, 4), exciter_db=-24.0)
ALT_VOICE = V.VoiceProfile(key="siwis", seeds=(1, 2, 3, 4), exciter_db=-26.0)

MUSIC_LUFS = -21.5  # bed level before ducking
DUCK_DB = -8.5
TARGET_LUFS = -14.0
CEIL_DBTP = -1.2


def fit(x):
    x = x[:N]
    if len(x) < N:
        x = np.concatenate([x, np.zeros((N - len(x),) + x.shape[1:])])
    return x


def duck_gain(voice: np.ndarray) -> np.ndarray:
    mono = np.abs(voice).max(1)
    env = dsp.env_follow(mono, 0.06, 0.35, SR)
    act = np.clip((dsp.a2db(env) + 50) / 12, 0, 1)  # 0 below -50 dBFS, 1 above -38 dBFS
    # smooth (no pumping on syllables)
    k = int(0.12 * SR)
    act = np.convolve(act, np.ones(k) / k, mode="same")
    return 1 - (1 - dsp.db2a(DUCK_DB)) * np.clip(act, 0, 1)


def master(mix: np.ndarray) -> tuple[np.ndarray, dict]:
    y = mix.copy()
    for _ in range(3):
        lufs = an.integrated_lufs(y, SR)
        y = y * dsp.db2a(TARGET_LUFS - lufs)
        y, _g = dsp.true_peak_limiter(y, CEIL_DBTP, SR)
    y = dsp.fade(y, 0.0, 0.5)
    y[-int(0.01 * SR):] = 0.0
    return y, {"lufs_i": round(an.integrated_lufs(y, SR), 2), "true_peak_dbtp": round(an.true_peak_db(y), 2),
               "sample_peak_dbfs": round(float(dsp.a2db(np.abs(y).max())), 2)}


def script_md(placed, placed_f, info_m, rep):
    L = ["# Voix off — CONNECT SA (40 s)", "",
         "Synthèse vocale neuronale **hors ligne** (modèles Mimic 3 / VITS, français) — ce n'est pas un enregistrement de comédien.",
         "Pour une diffusion, faire réenregistrer ce texte par un comédien professionnel en conservant les mêmes temps.", "",
         f"- Voix principale : **{V.tts.VOICES[MAIN_VOICE.key].label}** (masculine) — corpus M-AILABS (usage commercial autorisé avec mention).",
         f"- Voix alternative : **{V.tts.VOICES[ALT_VOICE.key].label}** (féminine) — corpus SIWIS, licence CC-BY 4.0 (attribution requise).",
         "- Prononciation forcée pour le moteur : « Connecte » pour CONNECT, « S A » pour SA.", "",
         "| # | Texte | Fenêtre (s) | Voix masc. (s) | Voix fém. (s) |", "|---|---|---|---|---|"]
    for a, b in zip(placed, placed_f):
        L.append(f"| {a['id']} | {a['text']} | {a['window'][0]:.2f}–{a['window'][1]:.2f} | {a['start']:.2f}–{a['end']:.2f} | {b['start']:.2f}–{b['end']:.2f} |")
    L += ["", "## Musique", "",
          f"Composition originale générée par code : {info_m['key']}, {info_m['bpm']} BPM (grille calée pour que l'entrée du studio à 11,4 s et le logo à {info_m['logo_s']} s tombent sur des premiers temps), progression {info_m['progression']}.", "",
          "## Mesures", "", f"- Mix principal : {rep['main']['lufs_i']} LUFS intégrés, crête vraie {rep['main']['true_peak_dbtp']} dBTP",
          f"- Mix voix féminine : {rep['alt']['lufs_i']} LUFS, crête vraie {rep['alt']['true_peak_dbtp']} dBTP",
          "- Durée exacte 40,000 s, 48 kHz, stéréo 24 bits, fin en silence numérique.", ""]
    return "\n".join(L)


def main():
    tl = json.loads((ROOT / "src" / "timeline.json").read_text())
    for d in (PUB / "stems", DELIV, ANA):
        d.mkdir(parents=True, exist_ok=True)
    log = lambda *a: print(*a, flush=True)

    log("== voix principale")
    voice, placed = V.build_voice_track(tl["voiceover"], MAIN_VOICE, DUR, log)
    log("== voix alternative")
    voice_f, placed_f = V.build_voice_track(tl["voiceover"], ALT_VOICE, DUR, log)
    voice, voice_f = fit(voice), fit(voice_f)

    log("== musique")
    mus, info_m = music.build()
    mus = fit(mus)
    mus = mus * dsp.db2a(MUSIC_LUFS - an.integrated_lufs(mus, SR))

    log("== bruitages")
    fx, cues = sfx.build(tl)
    fx = fit(fx)

    rep = {"music": info_m, "sfx_cues": cues, "voice_main": placed, "voice_alt": placed_f}
    for key, vo in (("main", voice), ("alt", voice_f)):
        g = duck_gain(vo)
        mix = vo + mus * g[:, None] + fx
        mixed, m = master(mix)
        rep[key] = m
        name = "connect_mix.wav" if key == "main" else "connect_mix_voix_feminine.wav"
        dsp.write_wav(PUB / name, mixed, SR, 24)
        log(f"   {name}: {m}")
        if key == "main":
            an.spectrogram_png(mixed.mean(1), SR, ANA / "spec_mix.png", "Mix principal")

    # stems + livrables
    dsp.write_wav(PUB / "stems" / "voice.wav", voice, SR, 24)
    dsp.write_wav(PUB / "stems" / "voice_female.wav", voice_f, SR, 24)
    dsp.write_wav(PUB / "stems" / "music.wav", mus, SR, 24)
    dsp.write_wav(PUB / "stems" / "sfx.wav", fx, SR, 24)
    for src, name in ((voice, "VOIX_OFF_CONNECT_SA.wav"), (voice_f, "VOIX_OFF_CONNECT_SA_feminine.wav")):
        y = src * dsp.db2a(-16.0 - an.integrated_lufs(src, SR))
        y, _ = dsp.true_peak_limiter(y, CEIL_DBTP, SR)
        dsp.write_wav(DELIV / name, y, SR, 24)
    y = mus * dsp.db2a(-16.0 - an.integrated_lufs(mus, SR))
    y, _ = dsp.true_peak_limiter(y, CEIL_DBTP, SR)
    dsp.write_wav(DELIV / "MUSIQUE_SEULE.wav", y, SR, 24)

    an.waveform_png([("voix", voice.mean(1)), ("musique", mus.mean(1)), ("bruitages", fx.mean(1))], SR, ANA / "stems.png",
                    "Stems")
    (ANA / "report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=2))
    (DELIV / "VOIX_OFF_SCRIPT.md").write_text(script_md(placed, placed_f, info_m, rep))
    # contrôle : aucune ligne hors fenêtre, aucun chevauchement
    for P in (placed, placed_f):
        for a in P:
            assert a["window"][0] <= a["start"] and a["end"] <= a["window"][1] + 1e-3, a
        for a, b in zip(P, P[1:]):
            assert a["end"] <= b["start"], (a["id"], b["id"])
    log("OK")


if __name__ == "__main__":
    main()
