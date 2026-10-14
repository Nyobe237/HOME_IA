# Bande-son CONNECT SA

```bash
cd audio
python3 -m venv .venv && .venv/bin/pip install numpy scipy onnxruntime gruut gruut-lang-fr phonemes2ids
.venv/bin/python build_audio.py
```

Sorties : `public/audio/connect_mix.wav` (utilisé par le film), `public/audio/connect_mix_voix_feminine.wav`,
`public/audio/stems/`, `deliverables/audio/` (voix seules, musique seule, script minuté), `audio/analysis/`.

## Modules

- `connect_audio/tts.py` — synthèse française hors ligne (Mimic 3 / VITS ONNX), bruit de synthèse injecté depuis un
  générateur à graine → prises reproductibles ; substitutions de prononciation (« Connecte », « S A »).
- `connect_audio/voice.py` — choix de prise, calage dans les fenêtres de `src/timeline.json`, traitement (EQ, de-esseur,
  compression, réverbération courte).
- `connect_audio/music.py` — musique originale procédurale (ré majeur, ~98,6 BPM, temps forts à 11,4 s et 35,73 s).
- `connect_audio/sfx.py` — bruitages calés sur les images (`events` de la timeline).
- `build_audio.py` — ducking, mixage, mastering −14 LUFS / −1,2 dBTP, exports et rapport.

## Modèles de voix (non versionnés, `audio/models/fr_FR/<voix>/`)

Depuis le dépôt MycroftAI/mimic3-voices :
`https://media.githubusercontent.com/media/MycroftAI/mimic3-voices/master/voices/fr_FR/<voix>/generator.onnx`
et `config.json`, `phonemes.txt`, `phoneme_map.txt`, `speakers.txt` via `raw.githubusercontent.com`.
Voix utilisées : `m-ailabs_low` (locuteur « bernard », licence M-AILABS : usage commercial avec mention),
`siwis_low` (CC-BY 4.0, attribution requise).
