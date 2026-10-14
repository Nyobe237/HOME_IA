/**
 * Studio 3D : caméra pilotée, environnement RoomEnvironment (PMREM), éclairage clé / ambiance / contre-jour,
 * sol « attrape-ombres » transparent (les ombres tombent sur le fond CSS), ombres de contact douces,
 * brouillard de profondeur (fait reculer et assombrit les appareils hors héros).
 */
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Device, DEVICE_DIMS } from "../devices";
import { CamRig, D2R, V3, applyRig, lerp } from "./math";
import type { DeviceState } from "./choreo";

/* ------------------------------------------------------------------ */
/* Caméra + rendu                                                      */
/* ------------------------------------------------------------------ */

export const RigCamera: React.FC<{ rig: CamRig; W: number; H: number }> = ({ rig, W, H }) => {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera & { manual?: boolean };
    cam.manual = true;
    applyRig(cam, rig, W, H);
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1;
  });
  return null;
};

/* ------------------------------------------------------------------ */
/* Environnement                                                       */
/* ------------------------------------------------------------------ */

const envCache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

export const StudioEnvironment: React.FC<{ intensity: number; rotationY?: number }> = ({ intensity, rotationY = 0 }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const env = useMemo(() => {
    const hit = envCache.get(gl);
    if (hit) return hit;
    const pm = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const tex = pm.fromScene(room, 0.04).texture;
    pm.dispose();
    envCache.set(gl, tex);
    return tex;
  }, [gl]);
  useLayoutEffect(() => {
    scene.environment = env;
    scene.environmentIntensity = intensity;
    scene.environmentRotation.set(0, rotationY, 0);
  });
  return null;
};

/* ------------------------------------------------------------------ */
/* Brouillard                                                          */
/* ------------------------------------------------------------------ */

export const SceneFog: React.FC<{ color: string; near: number; far: number }> = ({ color, near, far }) => {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    if (!(scene.fog instanceof THREE.Fog)) scene.fog = new THREE.Fog(color, near, far);
    const fog = scene.fog as THREE.Fog;
    fog.color.set(color);
    fog.near = near;
    fog.far = far;
  });
  return null;
};

/* ------------------------------------------------------------------ */
/* Lumières                                                            */
/* ------------------------------------------------------------------ */

export type LightRig = {
  /** 0 = graphite, 1 = fond clair */
  light: number;
  /** 0..1 mise en avant héros */
  focus: number;
  heroPos: V3;
  /** centre de la zone d'ombres */
  center: V3;
  /** étendue de la caméra d'ombre */
  shadowExtent?: number;
};

export const StudioLights: React.FC<LightRig> = ({ light, focus, heroPos, center, shadowExtent = 4.2 }) => {
  const keyTarget = useMemo(() => new THREE.Object3D(), []);
  const heroTarget = useMemo(() => new THREE.Object3D(), []);
  const L = light;
  const key = lerp(lerp(2.7, 1.9, focus), 2.3, L);
  const fill = lerp(lerp(0.35, 0.18, focus), 0.85, L);
  const rimA = lerp(lerp(3.4, 2.2, focus), 1.0, L);
  const rimB = lerp(lerp(1.6, 1.0, focus), 0.45, L);
  const spot = focus * lerp(2.6, 0.8, L);
  return (
    <>
      <primitive object={keyTarget} position={center} />
      <primitive object={heroTarget} position={[heroPos[0], heroPos[1] + 0.35, heroPos[2]]} />
      <directionalLight
        position={[center[0] - 3.4, center[1] + 6.2, center[2] + 4.4]}
        target={keyTarget}
        intensity={key}
        color="#FFF7EE"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      <directionalLight position={[center[0] + 4.5, center[1] + 2.2, center[2] + 3.5]} target={keyTarget} intensity={fill} color="#E8EEF8" />
      <directionalLight position={[center[0] + 1.8, center[1] + 3.6, center[2] - 5.5]} target={keyTarget} intensity={rimA} color="#FFFFFF" />
      <directionalLight position={[center[0] - 4.2, center[1] + 2.4, center[2] - 3.8]} target={keyTarget} intensity={rimB} color="#FFE6E2" />
      <spotLight
        position={[heroPos[0] - 1.6, heroPos[1] + 3.4, heroPos[2] + 2.6]}
        target={heroTarget}
        intensity={spot * 14}
        angle={0.42}
        penumbra={0.85}
        decay={1}
        distance={0}
        color="#FFFFFF"
        visible={spot > 0.001}
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Sol attrape-ombres + ombres de contact                              */
/* ------------------------------------------------------------------ */

export const ShadowFloor: React.FC<{ opacity: number; center: V3 }> = ({ opacity, center }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], 0, center[2]]} receiveShadow renderOrder={0}>
    <planeGeometry args={[30, 30]} />
    <shadowMaterial transparent opacity={opacity} depthWrite={false} fog={false} color="#0B0C0E" />
  </mesh>
);

let blobTex: THREE.DataTexture | null = null;
const getBlobTexture = () => {
  if (blobTex) return blobTex;
  const N = 128;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = ((x + 0.5) / N) * 2 - 1;
      const v = ((y + 0.5) / N) * 2 - 1;
      const r = Math.min(1, Math.hypot(u, v));
      const a = Math.pow(1 - r * r, 2.2) * (1 - 0.35 * r);
      const i = (y * N + x) * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = Math.round(255 * Math.max(0, a));
    }
  }
  blobTex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  blobTex.needsUpdate = true;
  blobTex.magFilter = THREE.LinearFilter;
  blobTex.minFilter = THREE.LinearFilter;
  return blobTex;
};

export const ContactShadow: React.FC<{ s: DeviceState; strength: number }> = ({ s, strength }) => {
  const tex = useMemo(getBlobTexture, []);
  const d = DEVICE_DIMS[s.kind];
  const h = Math.max(0, s.pos[1]);
  const spread = 1 + h * 0.9;
  const op = (strength / (1 + h * 3.2)) * (s.visible ? 1 : 0);
  return (
    <mesh
      position={[s.pos[0], 0.003, s.pos[2]]}
      rotation={[-Math.PI / 2, 0, s.yaw * D2R]}
      scale={[d.w * s.scale * 1.35 * spread, d.d * s.scale * 1.6 * spread, 1]}
      renderOrder={1}
      visible={op > 0.002}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent opacity={op} depthWrite={false} fog={false} toneMapped={false} color="#000000" />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/* Appareil                                                            */
/* ------------------------------------------------------------------ */

export const DeviceActor: React.FC<{ s: DeviceState; contact: number }> = ({ s, contact }) => (
  <>
    <group position={s.pos} rotation={[0, s.yaw * D2R, s.roll * D2R]} scale={s.scale} visible={s.visible}>
      <Device kind={s.kind} screenOn={s.screenOn} castShadow />
    </group>
    <ContactShadow s={s} strength={contact} />
  </>
);
