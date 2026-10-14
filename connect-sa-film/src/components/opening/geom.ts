/**
 * Ouverture S1–S3 : géométrie (H 1920×1080 / V 1080×1920) et chronologie partagée.
 * Tous les calculs sont purs (fonction du numéro d'image absolu) pour que les passages
 * de témoin entre fenêtres (S1→S2 à 90, S2→S3 à 246) soient identiques au pixel près.
 */
import { EASE } from "../../theme";
import { TL, prog, lerp } from "../../time";

export const E = TL.events;
export const NNBSP = " ";

/** Image de passage de témoin S2 -> S3 (la carte est dessinée par S3 à partir d'ici). */
export const CARD_HANDOFF = E.cardLift[1]; // 246
/** Image de passage de témoin S1 -> S2 pour le trait rouge (début de la fenêtre S2). */
export const LINE_HANDOFF = TL.windows.S2[0]; // 90
/** Image à partir de laquelle S2 peint son propre fond (S1 n'a plus de contenu visible). */
export const S2_BG_FROM = 103;

export type Rect = { x: number; y: number; w: number; h: number };

export type OpeningGeom = {
  isV: boolean;
  W: number;
  H: number;
  s1: {
    l1Font: number;
    l1LineH: number;
    l1Tops: number[];
    l1Words: string[][];
    l2Font: number;
    l2LineH: number;
    l2Top: number;
    lineY: number;
    lineW: number;
    lineCx: number;
  };
  bar: { cx: number; cy0: number; cy1: number; w: number; h: number; font: number; iconX: number; textX: number; icon: number };
  list: { x: number; w: number; skel1: { y: number; h: number }; card: { y: number; h: number }; skel2: { y: number; h: number } };
  card: {
    pad: number;
    padTop: number;
    logoW: number;
    gap: number;
    font: number;
    lines: string[];
    btn: number;
    btnRight: number;
    radius: number;
  };
  lift: { scale: number; cx: number; cy: number };
  pointer: { from: [number, number]; ctrl: [number, number]; size: number };
  pres: {
    facade: Rect & { r: number };
    logo: { x: number; y: number; w: number };
    align: "left" | "center";
    textX: number; // H : bord gauche ; V : centre
    dash: { x0: number; y: number; len: number };
    title: { top: number; font: number; lineH: number; lines: string[] };
    sub: { top: number; font: number; lineH: number };
    exitOrigin: [number, number];
  };
  ring: { cx: number; cy: number; rx: number; ry: number; rotationDeg: number };
  /** raccord de la courbe sur l'ellipse : angle paramétrique, sens (1 = horaire à l'écran), tensions */
  curve: { joinDeg: number; dir: 1 | -1; k0: number; k1: number };
  rippleR: number;
};

const LOGO_RATIO = 165 / 630; // hauteur / largeur du fichier logo

export const logoH = (w: number) => w * LOGO_RATIO;

const GEOM_H: OpeningGeom = {
  isV: false,
  W: 1920,
  H: 1080,
  s1: {
    l1Font: 110,
    l1LineH: 138,
    l1Tops: [376],
    l1Words: [["Du", "matériel", `informatique${NNBSP}?`]],
    l2Font: 80,
    l2LineH: 100,
    l2Top: 576,
    lineY: 540,
    lineW: 1290,
    lineCx: 960,
  },
  bar: { cx: 960, cy0: 540, cy1: 300, w: 1000, h: 84, font: 34, iconX: 40, textX: 86, icon: 30 },
  list: { x: 460, w: 1000, skel1: { y: 384, h: 100 }, card: { y: 508, h: 184 }, skel2: { y: 716, h: 100 } },
  card: {
    pad: 36,
    padTop: 34,
    logoW: 250,
    gap: 16,
    font: 30,
    lines: [`Informatique & Bureautique — Douala • Yaoundé`],
    btn: 58,
    btnRight: 34,
    radius: 20,
  },
  lift: { scale: 1.1, cx: 960, cy: 540 },
  pointer: { from: [1780, 1190], ctrl: [1600, 820], size: 46 },
  pres: {
    facade: { x: 150, y: 298, w: 860, h: 484, r: 28 },
    logo: { x: 1090, y: 317, w: 560 },
    align: "left",
    textX: 1090,
    dash: { x0: 1093, y: 511, len: 84 },
    title: { top: 548, font: 64, lineH: 72, lines: ["Informatique &", "Bureautique"] },
    sub: { top: 708, font: 42, lineH: 54 },
    exitOrigin: [960, 760],
  },
  ring: TL.seams.ringAt342.horizontal,
  curve: { joinDeg: 4, dir: 1, k0: 300, k1: 200 },
  rippleR: 230,
};

const GEOM_V: OpeningGeom = {
  isV: true,
  W: 1080,
  H: 1920,
  s1: {
    l1Font: 104,
    l1LineH: 130,
    l1Tops: [698, 810],
    l1Words: [["Du", "matériel"], [`informatique${NNBSP}?`]],
    l2Font: 86,
    l2LineH: 108,
    l2Top: 996,
    lineY: 960,
    lineW: 668,
    lineCx: 540,
  },
  bar: { cx: 540, cy0: 960, cy1: 560, w: 900, h: 96, font: 40, iconX: 44, textX: 98, icon: 36 },
  list: { x: 90, w: 900, skel1: { y: 652, h: 124 }, card: { y: 806, h: 274 }, skel2: { y: 1112, h: 124 } },
  card: {
    pad: 42,
    padTop: 40,
    logoW: 300,
    gap: 20,
    font: 38,
    lines: ["Informatique & Bureautique", "Douala • Yaoundé"],
    btn: 70,
    btnRight: 38,
    radius: 24,
  },
  lift: { scale: 1.04, cx: 540, cy: 919 },
  pointer: { from: [1160, 1760], ctrl: [1010, 1330], size: 56 },
  pres: {
    facade: { x: 72, y: 656, w: 936, h: 526, r: 32 },
    logo: { x: 230, y: 430, w: 620 },
    align: "center",
    textX: 540,
    dash: { x0: 498, y: 1244, len: 84 },
    title: { top: 1276, font: 60, lineH: 74, lines: ["Informatique & Bureautique"] },
    sub: { top: 1352, font: 46, lineH: 58 },
    exitOrigin: [540, 1180],
  },
  ring: TL.seams.ringAt342.vertical,
  curve: { joinDeg: -4, dir: -1, k0: 230, k1: 120 },
  rippleR: 250,
};

export const getGeom = (isV: boolean): OpeningGeom => (isV ? GEOM_V : GEOM_H);

/* ------------------------------------------------------------------ */
/* Barre de recherche : position verticale (centre -> haut quand les résultats arrivent) */
export const BAR_UP: [number, number] = [161, 184];
export const barCy = (f: number, g: OpeningGeom) => lerp(g.bar.cy0, g.bar.cy1, prog(f, BAR_UP[0], BAR_UP[1], EASE.inOut));
/** Décalage vertical de la liste de résultats (attachée à la barre pendant sa montée). */
export const listOffset = (f: number, g: OpeningGeom) => barCy(f, g) - g.bar.cy1;

/* ------------------------------------------------------------------ */
/* Trait rouge S1 -> contour de la barre S2 */
export type PillState = { cx: number; cy: number; w: number; h: number; sw: number; open: number; exit: number };

export const pillState = (f: number, g: OpeningGeom): PillState => {
  const [d0, d1] = E.redLineDrawS1;
  const draw = prog(f, d0, d1, EASE.inOut);
  const left = g.s1.lineCx - g.s1.lineW / 2;
  const wDraw = g.s1.lineW * draw;
  const mw = prog(f, 84, 101, EASE.inOut); // se rétracte (H) / s'élargit (V)
  const open = prog(f, 90, 108, EASE.inOut); // le trait s'ouvre en pilule
  const exit = prog(f, E.cardLift[0], E.cardLift[0] + 14, EASE.inOut);
  const cx = lerp(left + wDraw / 2, g.bar.cx, mw);
  const w = lerp(wDraw, g.bar.w, mw);
  const h = lerp(0, g.bar.h, open);
  const sw = lerp(6, 2, prog(f, 91, 106, EASE.inOut));
  const cy = barCy(f, g) - exit * 26;
  return { cx, cy, w, h, sw, open, exit };
};

/** Chemin de pilule (contour) ; dégénère en trait quand h -> 0. */
export const pillPath = (cx: number, cy: number, w: number, h: number) => {
  const r = Math.min(h / 2, w / 2);
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const f = (n: number) => n.toFixed(2);
  return `M ${f(x0 + r)} ${f(y0)} H ${f(x1 - r)} A ${f(r)} ${f(r)} 0 0 1 ${f(x1 - r)} ${f(y1)} H ${f(x0 + r)} A ${f(r)} ${f(r)} 0 0 1 ${f(x0 + r)} ${f(y0)} Z`;
};

/* ------------------------------------------------------------------ */
/* Pointeur souris */
const bez2 = (a: [number, number], c: [number, number], b: [number, number], t: number): [number, number] => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
};

export const cardListRect = (f: number, g: OpeningGeom): Rect => ({
  x: g.list.x,
  y: g.list.card.y + listOffset(f, g),
  w: g.list.w,
  h: g.list.card.h,
});

/** Centre du bouton flèche de la carte en position de liste (finale). */
export const arrowTarget = (g: OpeningGeom): [number, number] => {
  const c = g.card;
  return [g.list.x + g.list.w - c.btnRight - c.btn / 2, g.list.card.y + g.list.card.h / 2];
};

export const pointerPos = (f: number, g: OpeningGeom): [number, number] => {
  const t = prog(f, E.cursorIn, E.cursorArrive, EASE.soft);
  const [tx, ty] = arrowTarget(g);
  // point d'arrivée : la pointe vise légèrement à gauche/au-dessus du centre de la flèche
  const end: [number, number] = [tx - 4, ty - 2];
  const p = bez2(g.pointer.from, g.pointer.ctrl, end, t);
  // après le clic, le pointeur s'écarte doucement
  const away = prog(f, E.cardLift[0], E.cardLift[0] + 14, EASE.inOut);
  return [p[0] + away * 40, p[1] + away * 50];
};

const insideRect = (p: [number, number], r: Rect, m = 0) => p[0] > r.x + m && p[0] < r.x + r.w - m && p[1] > r.y + m && p[1] < r.y + r.h - m;

/** Première image où le pointeur survole la carte / le bouton (calcul déterministe). */
const firstFrame = (g: OpeningGeom, test: (f: number) => boolean) => {
  for (let f = E.cursorIn; f <= E.cursorArrive; f++) if (test(f)) return f;
  return E.cursorArrive;
};
const hoverCache = new Map<boolean, { card: number; btn: number }>();
export const hoverFrames = (g: OpeningGeom) => {
  const c = hoverCache.get(g.isV);
  if (c) return c;
  const card = firstFrame(g, (f) => insideRect(pointerPos(f, g), cardListRect(f, g)));
  const [tx, ty] = arrowTarget(g);
  const btn = firstFrame(g, (f) => {
    const p = pointerPos(f, g);
    return Math.hypot(p[0] - tx, p[1] - ty) < g.card.btn * 0.62;
  });
  const v = { card, btn };
  hoverCache.set(g.isV, v);
  return v;
};

/* ------------------------------------------------------------------ */
/* Carte CONNECT : état complet (liste -> survol -> clic -> soulèvement -> présentation) */
export type CardState = {
  rect: Rect;
  pre: Rect; // rectangle de la carte avant dépliage (liste / soulèvement)
  radius: number;
  s: number; // échelle du contenu
  enter: number;
  hover: number;
  press: number;
  lift: number;
  unfold: number;
  logo: { x: number; y: number; w: number };
  textOpacity: number;
  btnOpacity: number;
  btnHover: number;
  photo: number;
};

export const liftRect = (g: OpeningGeom): Rect => {
  const w = g.list.w * g.lift.scale;
  const h = g.list.card.h * g.lift.scale;
  return { x: g.lift.cx - w / 2, y: g.lift.cy - h / 2, w, h };
};

const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});

const logoInCard = (r: Rect, s: number, g: OpeningGeom) => ({
  x: r.x + g.card.pad * s,
  y: r.y + g.card.padTop * s,
  w: g.card.logoW * s,
});

export const UNFOLD: [number, number] = [244, 272];
export const LOGO_FLY: [number, number] = [242, 265];

export const cardState = (f: number, g: OpeningGeom): CardState => {
  const [ci0, ci1] = E.connectResultIn;
  const enter = prog(f, ci0, ci1, EASE.out);
  const hf = hoverFrames(g);
  const hover = prog(f, hf.card, hf.card + 7, EASE.out);
  const btnHover = prog(f, hf.btn, hf.btn + 5, EASE.out);
  const pressDown = prog(f, E.clickDown, E.click, EASE.out);
  const pressUp = prog(f, E.clickUp - 1, E.clickUp + 4, EASE.out);
  const press = pressDown * (1 - pressUp);
  const lift = prog(f, E.cardLift[0], E.cardLift[1], EASE.inOut);
  const unfold = prog(f, UNFOLD[0], UNFOLD[1], EASE.inOut);

  const base = cardListRect(f, g);
  const hoverLift = (g.isV ? 6 : 5) * hover * (1 - lift);
  base.y += (1 - enter) * 30 - hoverLift;
  const lr = liftRect(g);
  let pre = lerpRect(base, lr, lift);
  // pression du clic (léger enfoncement autour du centre)
  const ps = 1 - 0.014 * press;
  pre = {
    x: pre.x + (pre.w * (1 - ps)) / 2,
    y: pre.y + (pre.h * (1 - ps)) / 2,
    w: pre.w * ps,
    h: pre.h * ps,
  };
  const s = lerp(1, g.lift.scale, lift) * ps;
  const fac = g.pres.facade;
  const rect = lerpRect(pre, fac, unfold);
  const radius = lerp(g.card.radius * s, fac.r, unfold);

  const logoA = logoInCard(pre, s, g);
  const fly = prog(f, LOGO_FLY[0], LOGO_FLY[1], EASE.inOut);
  const logo = {
    x: lerp(logoA.x, g.pres.logo.x, fly),
    y: lerp(logoA.y, g.pres.logo.y, fly),
    w: lerp(logoA.w, g.pres.logo.w, fly),
  };
  const textOpacity = enter * (1 - prog(f, 234, 246, EASE.inOut));
  const btnOpacity = enter * (1 - prog(f, 230, 242, EASE.inOut));
  const photo = prog(f, 250, 266, EASE.inOut);
  return { rect, pre, radius, s, enter, hover, press, lift, unfold, logo, textOpacity, btnOpacity, btnHover, photo };
};

/* ------------------------------------------------------------------ */
/* Courbe rouge S3 -> anneau (raccord exact seams.ringAt342) */
export type CurveData = { pts: Float64Array; cum: Float64Array; n: number; Lin: number; Ltot: number; loopD: string };

export const ellipsePoint = (r: OpeningGeom["ring"], th: number): [number, number] => {
  const ph = (r.rotationDeg * Math.PI) / 180;
  const ex = r.rx * Math.cos(th);
  const ey = r.ry * Math.sin(th);
  return [r.cx + ex * Math.cos(ph) - ey * Math.sin(ph), r.cy + ex * Math.sin(ph) + ey * Math.cos(ph)];
};
const ellipseTangent = (r: OpeningGeom["ring"], th: number): [number, number] => {
  const ph = (r.rotationDeg * Math.PI) / 180;
  const dx = -r.rx * Math.sin(th);
  const dy = r.ry * Math.cos(th);
  const tx = dx * Math.cos(ph) - dy * Math.sin(ph);
  const ty = dx * Math.sin(ph) + dy * Math.cos(ph);
  const l = Math.hypot(tx, ty);
  return [tx / l, ty / l];
};

const curveCache = new Map<boolean, CurveData>();
export const getCurve = (g: OpeningGeom): CurveData => {
  const c = curveCache.get(g.isV);
  if (c) return c;
  const P: Array<[number, number]> = [];
  const d = g.pres.dash;
  const p0: [number, number] = [d.x0, d.y];
  const p1: [number, number] = [d.x0 + d.len, d.y];
  for (let i = 0; i < 24; i++) P.push([lerp(p0[0], p1[0], i / 24), d.y]);
  const th0 = (g.curve.joinDeg * Math.PI) / 180;
  const pj = ellipsePoint(g.ring, th0);
  const tj0 = ellipseTangent(g.ring, th0);
  const tj: [number, number] = [tj0[0] * g.curve.dir, tj0[1] * g.curve.dir];
  const c1: [number, number] = [p1[0] + g.curve.k0, p1[1]];
  const c2: [number, number] = [pj[0] - tj[0] * g.curve.k1, pj[1] - tj[1] * g.curve.k1];
  const NB = 220;
  for (let i = 0; i < NB; i++) {
    const t = i / NB;
    const u = 1 - t;
    P.push([
      u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * pj[0],
      u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * pj[1],
    ]);
  }
  const startLoop = P.length;
  const NL = 1440;
  const loop: Array<[number, number]> = [];
  for (let i = 0; i <= NL; i++) {
    const q = ellipsePoint(g.ring, th0 + g.curve.dir * (i / NL) * Math.PI * 2);
    P.push(q);
    if (i < NL) loop.push(q);
  }
  const n = P.length;
  const pts = new Float64Array(n * 2);
  const cum = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    pts[2 * i] = P[i][0];
    pts[2 * i + 1] = P[i][1];
    if (i > 0) cum[i] = cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  }
  const loopD = "M " + loop.map((q) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(" L ") + " Z";
  const v = { pts, cum, n, Lin: cum[startLoop], Ltot: cum[n - 1], loopD };
  curveCache.set(g.isV, v);
  return v;
};

const locate = (c: CurveData, s: number): [number, number, number] => {
  // renvoie [indice i, x, y] tel que cum[i] <= s < cum[i+1]
  let lo = 0;
  let hi = c.n - 1;
  if (s <= 0) return [0, c.pts[0], c.pts[1]];
  if (s >= c.cum[hi]) return [hi, c.pts[2 * hi], c.pts[2 * hi + 1]];
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (c.cum[m] <= s) lo = m;
    else hi = m;
  }
  const t = (s - c.cum[lo]) / Math.max(1e-9, c.cum[lo + 1] - c.cum[lo]);
  return [lo, lerp(c.pts[2 * lo], c.pts[2 * lo + 2], t), lerp(c.pts[2 * lo + 1], c.pts[2 * lo + 3], t)];
};

/** Portion [s0, s1] (en px d'abscisse curviligne) de la trajectoire, en chemin SVG. */
export const curveSlice = (c: CurveData, s0: number, s1: number) => {
  if (s1 - s0 < 0.25) return "";
  const [i0, x0, y0] = locate(c, s0);
  const [i1, x1, y1] = locate(c, s1);
  const out: string[] = [`M ${x0.toFixed(2)} ${y0.toFixed(2)}`];
  for (let i = i0 + 1; i <= i1; i++) out.push(`L ${c.pts[2 * i].toFixed(2)} ${c.pts[2 * i + 1].toFixed(2)}`);
  out.push(`L ${x1.toFixed(2)} ${y1.toFixed(2)}`);
  return out.join(" ");
};
