/**
 * Textures procédurales (CanvasTexture), dessinées de façon déterministe, sans texte ni marque.
 * Créées une seule fois (cache de module), en sRGB, filtrage anisotrope.
 */
import * as THREE from "three";
import { once } from "./geo";

const RED = "#D40102";

const makeCanvas = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  return c;
};

const toTexture = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
};

const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
};

/* ------------------------------------------------------------------ icônes génériques */

type Icon = "copy" | "scan" | "print" | "send" | "folder" | "settings" | "home";

const icon = (g: CanvasRenderingContext2D, kind: Icon, cx: number, cy: number, s: number, color: string) => {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = Math.max(2, s * 0.09);
  g.lineJoin = "round";
  g.lineCap = "round";
  const page = (x: number, y: number, w: number, h: number) => {
    rr(g, x, y, w, h, s * 0.06);
    g.stroke();
  };
  switch (kind) {
    case "copy":
      page(-s * 0.36, -s * 0.42, s * 0.5, s * 0.64);
      page(-s * 0.12, -s * 0.22, s * 0.5, s * 0.64);
      break;
    case "scan":
      page(-s * 0.32, -s * 0.44, s * 0.64, s * 0.88);
      g.beginPath();
      g.moveTo(-s * 0.48, 0);
      g.lineTo(s * 0.48, 0);
      g.stroke();
      break;
    case "print":
      rr(g, -s * 0.46, -s * 0.12, s * 0.92, s * 0.42, s * 0.08);
      g.stroke();
      page(-s * 0.26, -s * 0.44, s * 0.52, s * 0.3);
      g.fillRect(-s * 0.26, s * 0.16, s * 0.52, s * 0.3);
      break;
    case "send":
      g.beginPath();
      g.moveTo(-s * 0.46, -s * 0.06);
      g.lineTo(s * 0.46, -s * 0.38);
      g.lineTo(s * 0.12, s * 0.42);
      g.lineTo(-s * 0.04, s * 0.08);
      g.closePath();
      g.stroke();
      break;
    case "folder":
      g.beginPath();
      g.moveTo(-s * 0.46, -s * 0.3);
      g.lineTo(-s * 0.12, -s * 0.3);
      g.lineTo(-s * 0.02, -s * 0.18);
      g.lineTo(s * 0.46, -s * 0.18);
      g.lineTo(s * 0.46, s * 0.34);
      g.lineTo(-s * 0.46, s * 0.34);
      g.closePath();
      g.stroke();
      break;
    case "settings": {
      g.beginPath();
      g.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.beginPath();
        g.moveTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3);
        g.lineTo(Math.cos(a) * s * 0.44, Math.sin(a) * s * 0.44);
        g.stroke();
      }
      break;
    }
    case "home":
      g.beginPath();
      g.moveTo(-s * 0.4, -s * 0.02);
      g.lineTo(0, -s * 0.4);
      g.lineTo(s * 0.4, -s * 0.02);
      g.moveTo(-s * 0.28, -s * 0.12);
      g.lineTo(-s * 0.28, s * 0.36);
      g.lineTo(s * 0.28, s * 0.36);
      g.lineTo(s * 0.28, -s * 0.12);
      g.stroke();
      break;
  }
  g.restore();
};

/* ------------------------------------------------------------------ feuille imprimée */

/** Partie visible de la feuille sortant de l'imprimante (haut du canevas = côté imprimante). */
export const getPrintedSheetTexture = () =>
  once("tex:sheet", () =>
    toTexture(
      makeCanvas(1024, 780, (g, W, H) => {
        g.fillStyle = "#FBFBFA";
        g.fillRect(0, 0, W, H);
        const m = 70;
        // lignes de texte (colonne gauche)
        g.fillStyle = "#B9BDC3";
        const lens = [0.92, 0.86, 0.95, 0.7, 0.9, 0.82, 0.6];
        lens.forEach((l, i) => {
          g.fillRect(m, 40 + i * 30, (W * 0.5 - m) * l, 12);
        });
        // titre de section + tiret rouge
        g.fillStyle = RED;
        g.fillRect(m, 270, 70, 12);
        g.fillStyle = "#33363B";
        g.fillRect(m, 300, 330, 26);
        // graphique en barres (colonne gauche)
        const bx = m;
        const by = 640;
        const bars = [0.42, 0.58, 0.5, 0.74, 0.66, 0.92];
        bars.forEach((v, i) => {
          g.fillStyle = i === bars.length - 1 || i === 3 ? RED : "#9AA0A7";
          g.fillRect(bx + i * 62, by - v * 270, 40, v * 270);
        });
        g.fillStyle = "#6C7178";
        g.fillRect(bx - 10, by, 6 * 62 + 10, 4);
        // anneau (colonne droite)
        const cx = W * 0.72;
        const cy = 470;
        const R = 120;
        const seg: Array<[number, string]> = [
          [0.46, RED],
          [0.32, "#8E949B"],
          [0.22, "#CDD1D6"],
        ];
        let a0 = -Math.PI / 2;
        for (const [f, col] of seg) {
          g.beginPath();
          g.strokeStyle = col;
          g.lineWidth = 56;
          g.arc(cx, cy, R, a0, a0 + f * Math.PI * 2);
          g.stroke();
          a0 += f * Math.PI * 2;
        }
        // lignes de texte (colonne droite, haut)
        g.fillStyle = "#B9BDC3";
        [0.9, 0.75, 0.84, 0.62].forEach((l, i) => g.fillRect(W * 0.56, 40 + i * 30, W * 0.36 * l, 12));
        // légende
        [RED, "#8E949B", "#CDD1D6"].forEach((col, i) => {
          g.fillStyle = col;
          g.fillRect(W * 0.58, 640 + i * 34 - 12, 22, 22);
          g.fillStyle = "#B9BDC3";
          g.fillRect(W * 0.58 + 40, 640 + i * 34 - 6, 150 - i * 25, 11);
        });
        // pied de page
        g.fillStyle = "#C9CDD2";
        [0.95, 0.88].forEach((l, i) => g.fillRect(m, 700 + i * 28, (W - 2 * m) * l, 10));
      }),
    ),
  );

/* ------------------------------------------------------------------ écran de l'imprimante */

export const getPrinterLcdTexture = () =>
  once("tex:lcd", () =>
    toTexture(
      makeCanvas(512, 320, (g, W, H) => {
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#1D2129");
        bg.addColorStop(1, "#11141A");
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
        // barre d'état
        g.fillStyle = "#3A404B";
        g.fillRect(24, 22, 120, 14);
        g.fillStyle = "#E9ECF0";
        for (let i = 0; i < 4; i++) g.fillRect(W - 40 - i * 12, 34 - i * 4 - 6, 7, 6 + i * 4);
        // trois tuiles
        const kinds: Icon[] = ["copy", "scan", "print"];
        const tw = 134;
        const th = 170;
        const gap = 22;
        const x0 = (W - (3 * tw + 2 * gap)) / 2;
        kinds.forEach((k, i) => {
          const x = x0 + i * (tw + gap);
          const y = 74;
          rr(g, x, y, tw, th, 18);
          g.fillStyle = i === 0 ? RED : "#2C323C";
          g.fill();
          icon(g, k, x + tw / 2, y + th / 2 - 12, 66, "#FFFFFF");
          g.fillStyle = i === 0 ? "rgba(255,255,255,0.75)" : "#7D8592";
          g.fillRect(x + 30, y + th - 34, tw - 60, 10);
        });
        // pagination
        [0, 1, 2].forEach((i) => {
          g.beginPath();
          g.fillStyle = i === 0 ? "#E9ECF0" : "#4B525E";
          g.arc(W / 2 - 18 + i * 18, H - 26, 5, 0, Math.PI * 2);
          g.fill();
        });
      }),
    ),
  );

/* ------------------------------------------------------------------ écran tactile du copieur */

export const getCopierUiTexture = () =>
  once("tex:copierUi", () =>
    toTexture(
      makeCanvas(1024, 600, (g, W, H) => {
        const bg = g.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, "#F6F7F9");
        bg.addColorStop(1, "#E3E6EA");
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
        // en-tête
        g.fillStyle = "#FFFFFF";
        g.fillRect(0, 0, W, 78);
        g.fillStyle = "#D5D9DE";
        g.fillRect(0, 78, W, 2);
        g.fillStyle = RED;
        rr(g, 36, 26, 28, 28, 6);
        g.fill();
        g.fillStyle = "#9AA0A8";
        g.fillRect(82, 34, 180, 12);
        g.beginPath();
        g.arc(W - 54, 40, 18, 0, Math.PI * 2);
        g.fillStyle = "#C3C8CE";
        g.fill();
        g.fillStyle = "#9AA0A8";
        g.fillRect(W - 210, 34, 120, 12);
        // tuiles 3 x 2
        const kinds: Icon[] = ["copy", "scan", "print", "send", "folder", "settings"];
        const cols = 3;
        const tw = 276;
        const th = 206;
        const gx = 34;
        const gy = 30;
        const x0 = (W - (cols * tw + (cols - 1) * gx)) / 2;
        const y0 = 112;
        kinds.forEach((k, i) => {
          const x = x0 + (i % cols) * (tw + gx);
          const y = y0 + Math.floor(i / cols) * (th + gy);
          // ombre douce
          g.fillStyle = "rgba(20,24,30,0.08)";
          rr(g, x + 2, y + 6, tw, th, 22);
          g.fill();
          rr(g, x, y, tw, th, 22);
          g.fillStyle = i === 0 ? RED : "#FFFFFF";
          g.fill();
          icon(g, k, x + tw / 2, y + th / 2 - 18, 92, i === 0 ? "#FFFFFF" : "#2B2F35");
          g.fillStyle = i === 0 ? "rgba(255,255,255,0.8)" : "#B4BAC2";
          g.fillRect(x + tw / 2 - 60, y + th - 46, 120, 14);
        });
        // barre inférieure
        g.fillStyle = "#FFFFFF";
        g.fillRect(0, H - 56, W, 56);
        icon(g, "home", W / 2, H - 28, 34, "#3A3F46");
      }),
    ),
  );

/* ------------------------------------------------------------------ grille d'aération */

/** Motif de perforations (gris sur fond transparent), répétable. */
export const getVentTexture = () =>
  once("tex:vent", () => {
    const t = toTexture(
      makeCanvas(256, 256, (g, W, H) => {
        g.fillStyle = "#2A2C31";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#060607";
        const step = 32;
        for (let y = 0; y < H; y += step) {
          for (let x = 0; x < W; x += step) {
            const ox = (y / step) % 2 ? step / 2 : 0;
            g.beginPath();
            g.arc(x + ox + step / 4, y + step / 2, 9, 0, Math.PI * 2);
            g.fill();
          }
        }
      }),
    );
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  });

/* ------------------------------------------------------------------ ombre de contact */

/** Ombre douce de contact (canal alpha), rectangle arrondi flouté. */
export const getContactShadowTexture = () =>
  once("tex:contact", () =>
    toTexture(
      makeCanvas(256, 256, (g, W, H) => {
        g.clearRect(0, 0, W, H);
        g.filter = "blur(22px)";
        g.fillStyle = "rgba(0,0,0,1)";
        rr(g, 48, 48, W - 96, H - 96, 40);
        g.fill();
        g.filter = "none";
      }),
      false,
    ),
  );
