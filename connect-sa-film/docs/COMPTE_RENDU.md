# Compte rendu — Film CONNECT SA (40 s)

## Livré

| Livrable | Fichier |
|---|---|
| Film horizontal 1920×1080, 30 i/s, 1 200 images, voix masculine | `out/CONNECT_FUSION_HORIZONTAL_40S.mp4` |
| Film vertical 1080×1920, 30 i/s, 1 200 images, voix masculine | `out/CONNECT_FUSION_VERTICAL_40S.mp4` |
| Variantes avec voix féminine (même image, piste son remplacée) | `out/CONNECT_FUSION_*_40S_VOIX_FEMININE.mp4` |
| Images clés (3 par format) + planches-contacts | `deliverables/keyframes/` |
| Voix off seule (H/F), musique seule, script minuté | `deliverables/audio/` |
| Sources modifiables | `src/` (Remotion + React Three Fiber), `audio/` (Python), `scripts/` |
| Direction artistique, prompt amélioré | `docs/DIRECTION.md`, `docs/PROMPT_AMELIORE.md` |

Rendu : `scripts/render.sh` (les deux formats) puis `scripts/check_outputs.sh` et `scripts/keyframes.sh`.
Bande-son : `cd audio && .venv/bin/python build_audio.py` (voir `audio/README.md`).

## Ressources encore illustratives — à valider avant diffusion

1. **Logo** — aucun fichier `assets/logo_connect.png` n'a été fourni : le logo a été **extrait de la vidéo prototype**
   (`references/REFERENCE_01_RECHERCHE.mp4`, image de fin, ~610 px de large), détouré sur fond blanc.
   Il est fidèle mais pas à la résolution d'un fichier officiel. → Remplacer `public/assets/logo_connect.png`
   par le fichier officiel (même nom, fond transparent) : tout le film se met à jour au prochain rendu.
2. **Façade** — image extraite du prototype ; elle a l'aspect d'une illustration générée (enseigne « 24, Rue de la
   motte-piquet · BP 4855 Douala »). Sa fidélité documentaire n'est pas confirmée : ne pas la présenter comme une
   photographie du siège tant que ce n'est pas vérifié. → Remplacer `public/assets/facade_reference.png`.
3. **Produits** — les six catégories sont des **modèles 3D génériques sans marque** créés pour ce film
   (portable, poste de bureau, imprimante, copieur, consommables, accessoires). Ils n'attestent pas la
   disponibilité de références précises. Les produits du prototype portaient des marques tierces (Epson/EcoTank) :
   ils n'ont volontairement pas été repris. → Pour la diffusion : remplacer par les références catalogue retenues
   (modèles 3D ou visuels détourés).
4. **Fonds d'écran** des ordinateurs : composés à partir du logo extrait (`public/assets/screen_wallpaper_*.png`).
5. **Numéro de téléphone** 699 922 922 : repris du brief, **à vérifier** ; il est affiché mais non prononcé
   par la voix (modification sans ré-enregistrement).
6. **Interface de recherche** : mise en scène générique (aucun moteur réel, aucun classement revendiqué).

## Voix off

- Synthèse vocale neuronale **hors ligne** (Mimic 3 / VITS) : les services de voix en ligne et les dépôts de
  modèles habituels étaient bloqués par le réseau de l'environnement. Ce n'est **pas** un comédien.
- Voix principale masculine « Bernard » (corpus M-AILABS, usage commercial autorisé avec mention) ;
  alternative féminine « Siwis » (corpus SIWIS, CC-BY 4.0, attribution requise).
- Le texte a été resserré pour tenir dans les fenêtres à débit naturel (voir `deliverables/audio/VOIX_OFF_SCRIPT.md`).
- Contrôle : sans possibilité d'écoute dans l'environnement, la voix a été validée par mesures (calage dans les
  fenêtres, sonie, crêtes, spectrogrammes, rapport signal/bruit) et non à l'oreille.
  **Une écoute humaine est indispensable** ; pour une diffusion, un enregistrement par un comédien professionnel
  sur le même minutage est recommandé.

## Musique et sons

Musique instrumentale **originale générée par code** (ré majeur, ~98,6 BPM, grille calée pour que l'entrée du
studio à 11,4 s et le logo à 35,73 s tombent sur des temps forts). Bruitages synthétisés et calés à l'image :
touches à chaque caractère saisi, clic (appui/relâche), souffles aux transitions, « pops » discrets, scintillement
au logo. Mix −14 LUFS intégrés, crête vraie −1,2 dBTP, 48 kHz stéréo, fin en silence numérique.

## Écarts assumés par rapport au brief

- Accroche du copieur : « Copier. Numériser. Partager. » au lieu de « Votre bureau. Bien équipé. » (évite la
  redite avec « Bien équipés. Bien accompagnés. »).
- Voix off : formulations raccourcies (V3, V7, V8) ; la fin martèle le message « un partenaire sérieux ».
- Le prototype Python mentionné dans le brief n'était pas présent ; la voie Remotion + `@remotion/three` a été retenue.
