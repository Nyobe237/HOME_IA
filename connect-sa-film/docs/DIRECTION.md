# CONNECT SA — Film 40 s : direction artistique et cahier des charges technique

Ce document est la référence commune de toute l'équipe (image, 3D, son). Les valeurs de temps
renvoient à `src/timeline.json` (images à 30 i/s, numérotation **absolue** 0..1199).

## 1. Intention

Présenter CONNECT SA (informatique & bureautique, Douala et Yaoundé) comme **un interlocuteur sérieux**
pour équiper une entreprise **et** accompagner ses équipements dans la durée.
Public : dirigeants, acheteurs, responsables informatiques et administratifs au Cameroun.
Ton : professionnel, direct, lisible. Le film doit se comprendre **sans le son** et donner envie de contacter CONNECT.

Inspiration de rythme (référence Ecobank « Re-defined ») : typographie qui se tape/se révèle, orbite d'objets
autour d'un centre, variations de profondeur, objet héros au premier plan, signature finale stable.
On n'en reprend que la grammaire de mouvement, jamais les éléments graphiques.

## 2. Fil conducteur : une seule trajectoire rouge

1. S1 : un trait rouge souligne la question.
2. S1→S2 : ce trait devient le contour de la barre de recherche.
3. S2 : le clic sur le résultat CONNECT émet une onde rouge.
4. S3 : le petit tiret rouge de la présentation s'étire en courbe, balaie l'écran et se referme en **ellipse** :
   c'est l'anneau-orbite du studio (raccord exact à l'image 342, voir `seams.ringAt342`).
5. S4–S6 : l'anneau rouge (3D, lumineux) porte les appareils en orbite, puis reste au sol sous la collection.
6. S7 : la trajectoire relie les trois services.
7. S8 : elle termine sa course en soulignant le logo.

## 3. Règles globales (obligatoires)

- **Piloté par le numéro d'image** : aucune animation CSS, aucun `Math.random()`, `Date`, `setTimeout`.
  Toute variation pseudo-aléatoire = fonction déterministe (ex. `random(seed)` de `remotion`).
- Utiliser `useAbsFrame()` (src/time.tsx) pour les temps absolus, `prog()` pour les progressions,
  `COLORS / FONTS / EASE / BG / RING` (src/theme.ts), `useLayout()` (src/layout.ts).
- Palette : blanc, rouge du logo `#D40102`, gris clairs, graphite. Aucune autre teinte dominante.
- Typographie : Inter / Inter Display (embarquées). Typographie française : espace fine insécable
  (U+202F) avant « ? », « ! », « : », « ; ». Guillemets « ».
- Lisibilité : corps minimal 30 px (horizontal) / 38 px (vertical) pour tout texte informatif ;
  contraste net ; aucun texte ne chevauche un produit. Chaque texte reste lisible ≥ 1,2 s.
- Vertical (1080×1920) : **recomposer** (pas de simple recadrage). Zones de sécurité :
  haut 200 px, bas 280 px, côtés 72 px (interfaces des réseaux sociaux).
- Logo : uniquement via `<Logo>` (src/components/Logo.tsx) → fichier `public/assets/logo_connect.png`,
  proportions préservées, jamais recoloré, jamais déformé, toujours sur fond clair.
- Aucune marque tierce (pas d'Epson, HP, Canon, Google…), aucun prix, promotion, délai garanti,
  certification ou partenariat. L'interface de recherche est une **mise en scène générique** :
  pas de logo de moteur, pas de « 1er résultat », pas d'étoiles, pas d'URL réelle.
- Appareils : **génériques**, sans marque ; les écrans peuvent afficher le logo CONNECT.

## 4. Scènes

### S1 — Question (0–96, fenêtre 0–110) — fond clair `BG.light`
- Ligne 1 : « Du matériel informatique ? » — H : Inter Display Bold ~110 px sur une ligne ;
  V : deux lignes « Du matériel / informatique ? » ~104 px. Révélation par masque (mots qui montent, décalage 3 i).
- Trait rouge (5–6 px, bouts arrondis) qui se dessine sous la ligne 1 (`redLineDrawS1`).
- Ligne 2 : « Douala ou Yaoundé. » (`line2In`) — « Douala » et « Yaoundé » en encre, « ou » en gris.
- Sortie (`s1Exit`) : le texte monte et s'efface ; le trait rouge se rétracte/s'élargit et **devient le
  contour de la barre de recherche** de S2.

### S2 — Recherche simulée (96–246)
- Barre de recherche en pilule centrée (H ~1000×84 ; V ~900×96), contour rouge 2 px, loupe grise,
  curseur texte clignotant (période 16 images, piloté par l'image).
- Saisie de « matériel informatique Douala » : un caractère par entrée de `typingCharFrames` (le son est calé dessus).
- Résultats (`resultsSkeletonIn`, `connectResultIn`) : une ligne squelette au-dessus, la carte CONNECT
  (logo + « Informatique & Bureautique — Douala • Yaoundé » + petite flèche), une ligne squelette en dessous.
- Pointeur souris (flèche noire, liseré blanc, ombre douce) : entre à `cursorIn`, arrive à `cursorArrive`,
  survol (bord rouge, léger soulèvement), clic à `click` (pression `clickDown`→`clickUp`), onde rouge `rippleS2`.
- `cardLift` : les autres lignes disparaissent, la carte se soulève, grandit et se centre → devient S3.

### S3 — Présentation CONNECT (246–342, fenêtre 240–350)
- La carte se déploie (`presentationBuild`) : logo, visuel de façade (coins arrondis, ombre douce, léger
  zoom lent 1,00→1,05), petit tiret rouge, « Informatique & Bureautique », « Douala • Yaoundé ».
  H : façade à gauche (~860×484), logo + textes à droite. V : logo en haut, façade, textes dessous.
- `curveSweep` (300–342) : le tiret rouge s'étire en courbe qui balaie l'écran puis se referme en ellipse
  correspondant **exactement** à `seams.ringAt342[format]` (centre, rayons, rotation), trait `RING`
  (cœur `#FF2A1F`→`#D40102`, ~5 px, halo flou 18 px opacité 0,55).
- `bgToGraphite` (312–342) : le fond passe de `BG.light` à `BG.graphite` ; le contenu se réduit et s'efface.
  À l'image 342 il ne reste que l'ellipse rouge sur graphite.

### S4 — Studio graphite, orbite (342–582) — fenêtre studio 326–960
- `stageFadeIn` : la scène 3D apparaît par-dessus S3 avec un anneau qui coïncide avec l'ellipse 2D.
- Portable, poste de bureau, imprimante, copieur, toner arrivent sur la trajectoire (`devicesFlyIn`, décalés),
  puis l'ensemble tourne lentement autour du centre de l'anneau incliné (~8°). Position, échelle et ordre de
  profondeur varient en continu. Espacements propres, silhouettes lisibles, aucune collision.
- Titre « Votre équipement entre en scène. » (`orbitTitleIn` → `orbitTitleOut`), blanc, H en haut à gauche
  dans la marge, V centré en haut sur deux lignes.

### S5 — Trois présentations (582–816 ; `heroes`)
- Portable (582–660), imprimante (660–738), copieur (738–816). L'appareil héros vient au premier plan
  (mouvement lent, légère rotation), les autres reculent et s'assombrissent.
- Bloc texte (H à droite ; V en bas, au-dessus de la zone de sécurité) : tiret rouge, catégorie, accroche.
  - « Ordinateurs portables » — « Vos idées. / En mouvement. »
  - « Imprimantes » — « Vos documents. / Avec précision. »
  - « Copieurs multifonctions » — « Copier. Numériser. / Partager. »
  (Le « Votre bureau. Bien équipé. » proposé est réservé à l'esprit de S6/S7 pour éviter la redite.)

### S6 — Toute la gamme (816–948)
- `toLight` : le studio s'éclaircit (graphite → `BG.light`) ; lumière retravaillée pour fond clair.
- Composition collective claire des **six** catégories : copieur, poste de bureau, imprimante (arrière),
  portable, consommables (toners), accessoires (avant). Toutes visibles, aucune ne masque une autre.
- Titre « Tout pour votre bureau. » + légende des six catégories (pastilles rouges) lisible.
- Le mouvement ralentit jusqu'à quasi-immobilité (préparation de la fin).

### S7 — Services (948–1068, fenêtre 940–1080) — fond clair
- Titre « Bien équipés. Bien accompagnés. » (« Bien accompagnés. » en rouge).
- Trois services, icônes au trait sobres (tracé animé) aux images `serviceIcons` :
  « Installation », « Maintenance & SAV », « Location de copieurs ». H en ligne, V en colonne.
- Une trajectoire rouge relie les trois icônes. Sortie `servicesExit`.

### S8 — Signature (1068–1200, fenêtre 1056–1200) — fond clair
- Collection 3D (EndcardProducts) dans `seams.endcardProductsRegion`, logo + textes dans `endcardTextRegion`.
- Logo (punctuation sonore à `logoHit`), trait rouge qui le souligne, « Informatique & Bureautique »,
  « Douala • Yaoundé », « Parlons de vos besoins. », téléphone « 699 922 922 » (à vérifier avant diffusion).
- Tout est en place à `endStableFrom` (1088) puis **parfaitement stable** jusqu'à 1199 (~3,7 s).

## 5. Son

- Musique instrumentale originale (générée par code), voix off française, saisie clavier, clic,
  souffles courts aux transitions, ponctuation au logo, sortie propre à 40,0 s.
- Voix off : texte et fenêtres dans `timeline.json > voiceover` (prononciation : « Connecte », « èssa »).
- Mixage : voix au premier plan, musique ducking, −14 LUFS intégrés, crête vraie ≤ −1 dBTP, 48 kHz stéréo.

## 6. Organisation des fichiers (propriété exclusive)

| Domaine | Fichiers |
|---|---|
| Intégration (chef de projet) | `src/Root.tsx`, `src/Film.tsx`, `src/theme.ts`, `src/layout.ts`, `src/time.tsx`, `src/fonts.ts`, `src/timeline.json`, `src/components/Logo.tsx`, `src/three/useStaticTexture.ts` |
| Ressources | `scripts/extract_assets.py`, `public/assets/**` |
| Appareils 3D | `src/three/devices/**` |
| Studio 3D (S4–S6, produits S8) | `src/three/stage/**`, `src/scenes/StageScene.tsx`, `src/three/EndcardProducts.tsx` |
| Ouverture 2D (S1–S3) | `src/scenes/S1Intro.tsx`, `src/scenes/S2Search.tsx`, `src/scenes/S3Presentation.tsx`, `src/components/opening/**` |
| Fin 2D (S7–S8) | `src/scenes/S7Services.tsx`, `src/scenes/S8EndCard.tsx`, `src/components/ending/**` |
| Son | `audio/**`, `public/audio/**`, `deliverables/audio/**` |

Chaque domaine crée son propre point d'entrée de prévisualisation `src/preview/<domaine>.ts(x)`
(avec `registerRoot`) pour ne dépendre que de ses fichiers :
`npx remotion still src/preview/<domaine>.ts <Composition> out/preview/<domaine>/<nom>.png --frame=<n>`.

## 7. Performance de rendu

Rendu WebGL logiciel (SwiftShader, 4 cœurs). Viser ≤ 1,5 s par image 1920×1080 pour les scènes 3D :
géométrie raisonnable (< 150 k triangles au total), une seule ombre portée 2048 px max, pas de post-traitement lourd.
