/**
 * CONTRAT D'INTERFACE des appareils 3D (génériques, sans marque).
 * - Unités : mètres (échelle réelle approximative).
 * - Origine : centre de la base, posé sur y = 0 ; face avant orientée vers +Z.
 * - DEVICE_DIMS = boîte englobante (largeur X, hauteur Y, profondeur Z).
 * Implémentation provisoire (boîtes) : remplacée par les modèles détaillés.
 */
import React from "react";

export type DeviceKind = "laptop" | "desktop" | "printer" | "copier" | "toner" | "accessories";
export const DEVICE_KINDS: DeviceKind[] = ["laptop", "desktop", "printer", "copier", "toner", "accessories"];

export const DEVICE_DIMS: Record<DeviceKind, { w: number; h: number; d: number }> = {
  laptop: { w: 0.33, h: 0.23, d: 0.26 },
  desktop: { w: 0.8, h: 0.48, d: 0.42 },
  printer: { w: 0.42, h: 0.28, d: 0.38 },
  copier: { w: 0.62, h: 1.18, d: 0.66 },
  toner: { w: 0.42, h: 0.16, d: 0.16 },
  accessories: { w: 0.5, h: 0.2, d: 0.26 },
};

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
  /** 0..1 : intensité de l'écran allumé (portable, poste) */
  screenOn?: number;
  castShadow?: boolean;
};

export const Device: React.FC<DeviceProps> = ({ kind, castShadow = true }) => {
  const d = DEVICE_DIMS[kind];
  return (
    <mesh position={[0, d.h / 2, 0]} castShadow={castShadow} receiveShadow>
      <boxGeometry args={[d.w, d.h, d.d]} />
      <meshStandardMaterial color={kind === "copier" ? "#e9eaec" : "#2a2c31"} metalness={0.2} roughness={0.5} />
    </mesh>
  );
};
