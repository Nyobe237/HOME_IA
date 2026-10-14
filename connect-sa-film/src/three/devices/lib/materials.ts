/**
 * Bibliothèque de matériaux PBR partagés (une instance par clé pour tout le film).
 * Les métaux (aluminium, chrome) ont besoin d'un environnement (scene.environment, ex. RoomEnvironment
 * via PMREMGenerator) : sans lui ils paraissent sombres.
 */
import * as THREE from "three";
import { once } from "./geo";
import { getCopierUiTexture, getPrintedSheetTexture, getPrinterLcdTexture, getVentTexture } from "./textures";

type Def =
  | ({ kind: "std" } & THREE.MeshStandardMaterialParameters)
  | ({ kind: "phys" } & THREE.MeshPhysicalMaterialParameters);

const DEFS = {
  // métaux
  alu: { kind: "phys", color: "#C9CDD3", metalness: 1, roughness: 0.3 },
  aluSoft: { kind: "phys", color: "#B9BEC5", metalness: 1, roughness: 0.42 },
  aluDark: { kind: "phys", color: "#5D6168", metalness: 1, roughness: 0.38 },
  chrome: { kind: "std", color: "#E3E6EA", metalness: 1, roughness: 0.14 },
  trackpad: { kind: "phys", color: "#B2B7BE", metalness: 0.85, roughness: 0.22 },
  // plastiques sombres
  keycap: { kind: "std", color: "#1E1F23", metalness: 0, roughness: 0.55 },
  keyDeck: { kind: "std", color: "#0E0F11", metalness: 0, roughness: 0.75 },
  glass: { kind: "phys", color: "#060708", metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 },
  satinBlack: { kind: "phys", color: "#18191C", metalness: 0.15, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.35 },
  glossBlack: { kind: "phys", color: "#0D0E10", metalness: 0, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 },
  graphite: { kind: "phys", color: "#2B2D32", metalness: 0.05, roughness: 0.5, clearcoat: 0.18, clearcoatRoughness: 0.4 },
  graphiteDark: { kind: "std", color: "#1A1B1E", metalness: 0, roughness: 0.62 },
  slot: { kind: "std", color: "#070708", metalness: 0, roughness: 0.92 },
  rubber: { kind: "std", color: "#111214", metalness: 0, roughness: 0.88 },
  leather: { kind: "phys", color: "#151618", metalness: 0, roughness: 0.62, sheen: 0.4, sheenRoughness: 0.6, sheenColor: "#5a5d63" },
  // plastiques clairs
  white: { kind: "phys", color: "#ECEEF1", metalness: 0, roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.3 },
  whiteMatte: { kind: "std", color: "#DFE2E6", metalness: 0, roughness: 0.62 },
  lightGrey: { kind: "phys", color: "#C9CDD2", metalness: 0, roughness: 0.48, clearcoat: 0.15, clearcoatRoughness: 0.4 },
  midGrey: { kind: "std", color: "#8C9198", metalness: 0, roughness: 0.5 },
  darkGrey: { kind: "phys", color: "#3E4248", metalness: 0, roughness: 0.46, clearcoat: 0.2, clearcoatRoughness: 0.35 },
  interior: { kind: "std", color: "#2C2F34", metalness: 0, roughness: 0.8 },
  paper: { kind: "std", color: "#F7F7F5", metalness: 0, roughness: 0.82 },
  paperEdge: { kind: "std", color: "#E6E7E5", metalness: 0, roughness: 0.85 },
  // accents
  red: { kind: "phys", color: "#D40102", metalness: 0, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.15 },
  cyan: { kind: "phys", color: "#009FD8", metalness: 0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.15 },
  magenta: { kind: "phys", color: "#D3087F", metalness: 0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.15 },
  yellow: { kind: "phys", color: "#F4C300", metalness: 0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.15 },
  black: { kind: "phys", color: "#161719", metalness: 0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.15 },
  // écran (remplacé par un matériau émissif par instance, voir useEmissiveScreen)
  screen: { kind: "std", color: "#050607", metalness: 0, roughness: 0.14 },
  ledWhite: { kind: "std", color: "#000000", emissive: "#EAF4FF", emissiveIntensity: 2.2, toneMapped: false },
  ledRed: { kind: "std", color: "#000000", emissive: "#FF2A1F", emissiveIntensity: 1.6, toneMapped: false },
} satisfies Record<string, Def>;

/** Matériaux texturés (textures procédurales créées à la demande). */
const TEXTURED = {
  printSheet: () => new THREE.MeshStandardMaterial({ color: "#FFFFFF", map: getPrintedSheetTexture(), roughness: 0.8, metalness: 0 }),
  vent: () => new THREE.MeshStandardMaterial({ color: "#FFFFFF", map: getVentTexture(), roughness: 0.6, metalness: 0.1 }),
  lcd: () =>
    new THREE.MeshStandardMaterial({ color: "#000000", emissive: "#FFFFFF", emissiveMap: getPrinterLcdTexture(), roughness: 0.2, toneMapped: false }),
  copierUi: () =>
    new THREE.MeshStandardMaterial({ color: "#000000", emissive: "#FFFFFF", emissiveMap: getCopierUiTexture(), roughness: 0.2, toneMapped: false }),
} satisfies Record<string, () => THREE.Material>;

export type MatKey = keyof typeof DEFS | keyof typeof TEXTURED;

export const getMat = (key: MatKey): THREE.Material =>
  once(`mat:${key}`, () => {
    if (key in TEXTURED) {
      const m = TEXTURED[key as keyof typeof TEXTURED]();
      m.name = `device:${key}`;
      return m;
    }
    const { kind, ...p } = DEFS[key as keyof typeof DEFS] as Def;
    const m = kind === "phys" ? new THREE.MeshPhysicalMaterial(p) : new THREE.MeshStandardMaterial(p);
    m.name = `device:${key}`;
    return m;
  });
