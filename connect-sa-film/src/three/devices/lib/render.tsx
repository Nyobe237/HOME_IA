/**
 * Rendu commun : pièces fusionnées, touches instanciées, écrans émissifs, ombre de contact.
 */
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender, staticFile } from "remotion";
import { useStaticTexture } from "../../useStaticTexture";
import { Built, KeyField, V3, once, rbox } from "./geo";
import { MatKey, getMat } from "./materials";
import { getContactShadowTexture } from "./textures";

export type RenderFlags = { castShadow: boolean; receiveShadow: boolean };

/* ------------------------------------------------------------------ écrans */

/**
 * Matériau d'écran émissif (par instance, car l'intensité dépend de `screenOn`).
 * - map null (chargement / erreur) : couleur de repli proche du fond d'écran.
 * - toneMapped=false : les couleurs du fond d'écran (rouge CONNECT) restent exactes à screenOn = 1.
 */
export const useEmissiveScreen = (tex: THREE.Texture | null, screenOn: number, fallback = "#EEF0F3") => {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#050607",
        roughness: 0.6,
        metalness: 0,
        envMapIntensity: 0,
        emissive: "#FFFFFF",
        toneMapped: false,
        name: "device:screen",
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const on = Math.max(0, screenOn);
  if (mat.emissiveMap !== tex) {
    mat.emissiveMap = tex;
    mat.needsUpdate = true;
  }
  mat.emissive.set(tex ? "#FFFFFF" : fallback);
  mat.emissiveIntensity = on;
  return mat;
};

/**
 * Texture d'écran depuis public/ (useStaticTexture) + garde de rendu :
 * Remotion ne capture l'image qu'après que la texture a été appliquée ET dessinée
 * (le canevas R3F est en frameloop "never" pendant le rendu, on force donc un advance()).
 */
export const useScreenTexture = (publicPath: string) => {
  const tex = useStaticTexture(publicPath, { anisotropy: 8 });
  const advance = useThree((s) => s.advance);
  const [hold] = useState(() => ({ handle: delayRender(`Écran ${publicPath}`), done: false }));
  const release = React.useCallback(() => {
    if (!hold.done) {
      hold.done = true;
      continueRender(hold.handle);
    }
  }, [hold]);
  useEffect(() => {
    // échec de chargement : on libère quand même (repli couleur unie)
    fetch(staticFile(publicPath), { method: "HEAD" })
      .then((r) => {
        if (!r.ok) release();
      })
      .catch(release);
    return release;
  }, [publicPath, release]);
  useEffect(() => {
    if (!tex) return;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    advance(performance.now());
    release();
  }, [tex, advance, release]);
  return tex;
};

/* ------------------------------------------------------------------ touches */

const keyGeo = (w: number, h: number, d: number, r: number) =>
  once(`key:${w.toFixed(5)}:${h}:${d.toFixed(5)}:${r}`, () => rbox(w, h, d, r, 1));

const KeyFieldMeshes: React.FC<{ field: KeyField; flags: RenderFlags }> = ({ field, flags }) => {
  const meshes = useMemo(() => {
    const groups = new Map<string, typeof field.keys>();
    for (const k of field.keys) {
      const id = `${k.w.toFixed(5)}|${k.d.toFixed(5)}`;
      const l = groups.get(id) ?? [];
      l.push(k);
      groups.set(id, l);
    }
    const out: THREE.InstancedMesh[] = [];
    const m = new THREE.Matrix4();
    for (const list of groups.values()) {
      const { w, d } = list[0];
      const im = new THREE.InstancedMesh(keyGeo(w, field.h, d, field.radius), getMat(field.mat), list.length);
      list.forEach((k, i) => {
        m.makeTranslation(k.x, field.top - field.h / 2, k.z);
        im.setMatrixAt(i, field.matrix.clone().multiply(m));
      });
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      out.push(im);
    }
    return out;
  }, [field]);
  useLayoutEffect(() => {
    for (const im of meshes) {
      im.castShadow = flags.castShadow;
      im.receiveShadow = flags.receiveShadow;
    }
  }, [meshes, flags.castShadow, flags.receiveShadow]);
  return (
    <>
      {meshes.map((im, i) => (
        <primitive key={i} object={im} dispose={null} />
      ))}
    </>
  );
};

/* ------------------------------------------------------------------ assemblage */

export const BuiltMeshes: React.FC<{
  built: Built;
  flags: RenderFlags;
  /** matériaux par instance (écrans) qui remplacent la bibliothèque */
  overrides?: Partial<Record<MatKey, THREE.Material>>;
}> = ({ built, flags, overrides }) => (
  <>
    {built.parts.map((p) => (
      <mesh
        key={p.mat}
        geometry={p.geometry}
        material={overrides?.[p.mat] ?? getMat(p.mat)}
        castShadow={flags.castShadow && !p.mat.startsWith("screen")}
        receiveShadow={flags.receiveShadow}
      />
    ))}
    {built.keys.map((f, i) => (
      <KeyFieldMeshes key={i} field={f} flags={flags} />
    ))}
  </>
);

/** Ombre de contact douce (plan transparent sous l'appareil), optionnelle. */
export const ContactShadow: React.FC<{ w: number; d: number; opacity: number; spread?: number }> = ({
  w,
  d,
  opacity,
  spread = 1.28,
}) => {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#000000",
        alphaMap: getContactShadowTexture(),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  mat.opacity = opacity;
  const geo = useMemo(() => once("contactPlane", () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), []);
  return <mesh geometry={geo} material={mat} position={[0, 0.0008, 0]} scale={[w * spread, 1, d * spread]} renderOrder={-1} />;
};

/** Groupe racine d'un appareil : recentre la boîte englobante (X/Z) et pose la base sur y = 0. */
export const DeviceRoot: React.FC<{ offset: V3; name: string; children: React.ReactNode }> = ({ offset, name, children }) => (
  <group name={name} dispose={null}>
    <group position={offset}>{children}</group>
  </group>
);
