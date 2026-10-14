/**
 * CONTRAT D'INTERFACE des appareils 3D (génériques, sans marque).
 * - Unités : mètres (échelle réelle approximative).
 * - Origine : centre de la boîte englobante en X/Z, base posée sur y = 0 ; face avant orientée vers +Z.
 * - DEVICE_DIMS = boîte englobante réelle (largeur X, hauteur Y, profondeur Z) :
 *   l'appareil occupe [-w/2, w/2] x [0, h] x [-d/2, d/2].
 * - Les métaux (aluminium) attendent un environnement (scene.environment, ex. RoomEnvironment + PMREM).
 * Détails, matériaux et budgets : src/three/devices/README.md
 */
import React from "react";
import { Laptop, buildLaptop } from "./Laptop";
import { Desktop, buildDesktop } from "./Desktop";
import { Printer, buildPrinter } from "./Printer";
import { Copier, buildCopier } from "./Copier";
import { Toner, buildToner } from "./Toner";
import { Accessories, buildAccessories } from "./Accessories";
import { ContactShadow, RenderFlags } from "./lib/render";
import type { Built } from "./lib/geo";

export type DeviceKind = "laptop" | "desktop" | "printer" | "copier" | "toner" | "accessories";
export const DEVICE_KINDS: DeviceKind[] = ["laptop", "desktop", "printer", "copier", "toner", "accessories"];

const BUILDERS: Record<DeviceKind, () => Built> = {
  laptop: buildLaptop,
  desktop: buildDesktop,
  printer: buildPrinter,
  copier: buildCopier,
  toner: buildToner,
  accessories: buildAccessories,
};

/** Boîtes englobantes réelles, calculées depuis les géométries construites (mètres). */
export const DEVICE_DIMS: Record<DeviceKind, { w: number; h: number; d: number }> = Object.fromEntries(
  DEVICE_KINDS.map((k) => {
    const b = BUILDERS[k]().bbox;
    return [k, { w: b.max.x - b.min.x, h: b.max.y - b.min.y, d: b.max.z - b.min.z }];
  }),
) as Record<DeviceKind, { w: number; h: number; d: number }>;

export const DEVICE_LABELS: Record<DeviceKind, string> = {
  laptop: "Ordinateurs portables",
  desktop: "Postes de bureau",
  printer: "Imprimantes",
  copier: "Copieurs",
  toner: "Consommables",
  accessories: "Accessoires",
};

export type DeviceProps = {
  kind: DeviceKind;
  /** 0..1 (au-delà = plus lumineux) : intensité des écrans (portable, poste, écrans de commande). Défaut 1. */
  screenOn?: number;
  /** Les maillages projettent une ombre (défaut true). */
  castShadow?: boolean;
  /** Les maillages reçoivent les ombres (défaut true). */
  receiveShadow?: boolean;
  /** Opacité d'une ombre de contact douce posée au sol sous l'appareil (0 = aucune, défaut). */
  contactShadow?: number;
};

const COMPONENTS: Record<DeviceKind, React.FC<{ screenOn: number; flags: RenderFlags }>> = {
  laptop: Laptop,
  desktop: Desktop,
  printer: Printer,
  copier: Copier,
  toner: Toner,
  accessories: Accessories,
};

/** Géométrie construite (cache) : utile pour les statistiques ou un pré-chargement. */
/** Géométrie construite (cache) : utile pour les statistiques ou un pré-chargement. */
export const getDeviceBuild = (kind: DeviceKind): Built => BUILDERS[kind]();

export const Device: React.FC<DeviceProps> = ({ kind, screenOn = 1, castShadow = true, receiveShadow = true, contactShadow = 0 }) => {
  const C = COMPONENTS[kind];
  const d = DEVICE_DIMS[kind];
  return (
    <group>
      <C screenOn={screenOn} flags={{ castShadow, receiveShadow }} />
      {contactShadow > 0 ? <ContactShadow w={d.w} d={d.d} opacity={contactShadow} /> : null}
    </group>
  );
};
