# CONNECT SA — film publicitaire 40 s (Remotion + React Three Fiber)

Film motion design pour CONNECT SA (informatique & bureautique, Douala et Yaoundé), en deux formats
(1920×1080 et 1080×1920, 30 i/s, 1 200 images), avec voix off française, musique originale et bruitages.

## Rendre le film

```bash
npm install
bash scripts/render.sh            # les deux formats -> out/*.mp4 (+ contrôle ffprobe / sonie)
bash scripts/keyframes.sh         # images clés et planches-contacts -> deliverables/keyframes/
npx remotion studio               # prévisualisation interactive
```

Le rendu WebGL est logiciel (SwiftShader) : aucun GPU n'est nécessaire. Le chemin de Chromium est réglé dans
`remotion.config.ts` (variable `REMOTION_BROWSER` pour le changer).

## Reconstruire la bande-son

Voir `audio/README.md` : `cd audio && .venv/bin/python build_audio.py`.

## Organisation

- `src/timeline.json` — source unique des temps (image **et** son).
- `src/scenes/` — S1 question, S2 recherche, S3 présentation, StageScene (S4–S6 studio 3D), S7 services, S8 signature.
- `src/three/devices/` — appareils 3D génériques ; `src/three/stage/` — studio, anneau rouge, chorégraphie.
- `public/assets/` — logo (extrait du prototype), façade, fonds d'écran ; **remplacer par les fichiers officiels**.
- `docs/` — direction artistique, prompt amélioré, compte rendu des ressources illustratives.
