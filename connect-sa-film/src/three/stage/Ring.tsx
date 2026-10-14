/**
 * Trajectoire rouge 3D : tube elliptique analytique (cœur émissif + halo doux) et lueur au sol.
 * La géométrie est paramétrique (θ, α) : rayons, épaisseur et pose sont des uniformes,
 * aucune reconstruction de géométrie image par image.
 */
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { RING } from "../../theme";
import type { RingState } from "./choreo";
import type { V3 } from "./math";

const hexToVec3 = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Grille (θ, α) : θ le long de l'anneau, α autour de la section. */
const makeRingGeometry = (segs: number, radial: number) => {
  const g = new THREE.BufferGeometry();
  const uv: number[] = [];
  const pos: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const th = (i / segs) * Math.PI * 2;
    for (let j = 0; j <= radial; j++) {
      const al = (j / radial) * Math.PI * 2;
      uv.push(th, al);
      pos.push(Math.cos(th), 0, Math.sin(th));
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  g.setIndex(idx);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aRing", new THREE.Float32BufferAttribute(uv, 2));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
  return g;
};

const VERT = /* glsl */ `
attribute vec2 aRing;
uniform float uA1;
uniform float uA2;
uniform float uRadius;
uniform float uFlat;
uniform float uDRef;
uniform vec3 uCamSeam;
varying vec3 vN;
varying vec3 vV;
void main() {
  float th = aRing.x;
  float al = aRing.y;
  vec3 c = vec3(uA1 * cos(th), 0.0, uA2 * sin(th));
  vec3 T = normalize(vec3(-uA1 * sin(th), 0.0, uA2 * cos(th)));
  vec3 Y = vec3(0.0, 1.0, 0.0);
  vec3 B = normalize(cross(T, Y));
  vec3 off = cos(al) * Y + sin(al) * B;
  // compensation de profondeur : épaisseur constante à l'écran au raccord
  vec4 wc = modelMatrix * vec4(c, 1.0);
  float k = mix(1.0, distance(wc.xyz, uCamSeam) / uDRef, uFlat);
  vec3 p = c + off * uRadius * k;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * off);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG_CORE = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uEdge;
uniform vec3 uHot;
uniform float uOpacity;
varying vec3 vN;
varying vec3 vV;
void main() {
  float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
  vec3 col = mix(uEdge, uCore, smoothstep(0.05, 0.75, ndv));
  col = mix(col, uHot, smoothstep(0.82, 1.0, ndv) * 0.55);
  gl_FragColor = vec4(col, uOpacity);
}
`;

const FRAG_GLOW = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uPower;
varying vec3 vN;
varying vec3 vV;
void main() {
  float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
  float a = pow(ndv, uPower) * uOpacity;
  gl_FragColor = vec4(uColor, a);
}
`;

export const TrajectoryRing: React.FC<{ ring: RingState; camSeam: V3; dRef: number }> = ({ ring, camSeam, dRef }) => {
  const geoCore = useMemo(() => makeRingGeometry(480, 10), []);
  const geoGlow = useMemo(() => makeRingGeometry(480, 14), []);
  const common = useMemo(
    () => ({
      uA1: { value: 1 },
      uA2: { value: 1 },
      uFlat: { value: 0 },
      uDRef: { value: dRef },
      uCamSeam: { value: new THREE.Vector3(...camSeam) },
    }),
    [camSeam, dRef],
  );
  const core = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG_CORE,
        uniforms: {
          ...common,
          uRadius: { value: 0.01 },
          uCore: { value: hexToVec3(RING.core) },
          uEdge: { value: hexToVec3(RING.base) },
          uHot: { value: hexToVec3("#FF7A66") },
          uOpacity: { value: 1 },
        },
        transparent: true,
        depthWrite: true,
        toneMapped: false,
      }),
    [common],
  );
  const glowA = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG_GLOW,
        uniforms: {
          ...common,
          uRadius: { value: 0.05 },
          uColor: { value: hexToVec3(RING.core) },
          uOpacity: { value: 0.5 },
          uPower: { value: 6 },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.FrontSide,
      }),
    [common],
  );
  const glowB = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG_GLOW,
        uniforms: {
          ...common,
          uRadius: { value: 0.1 },
          uColor: { value: hexToVec3(RING.base) },
          uOpacity: { value: 0.18 },
          uPower: { value: 3 },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.FrontSide,
      }),
    [common],
  );

  useLayoutEffect(() => {
    common.uA1.value = ring.pose.a1;
    common.uA2.value = ring.pose.a2;
    common.uFlat.value = ring.flat;
    core.uniforms.uRadius.value = ring.radius;
    core.uniforms.uOpacity.value = ring.opacity;
    glowA.uniforms.uRadius.value = ring.glowRadius * 0.55;
    glowA.uniforms.uOpacity.value = RING.glowOpacity * ring.glow * ring.opacity;
    glowB.uniforms.uRadius.value = ring.glowRadius * 1.25;
    glowB.uniforms.uOpacity.value = 0.2 * ring.glow * ring.opacity;
  });

  const q = ring.pose.quat;
  return (
    <group position={ring.pose.center} quaternion={q} visible={ring.opacity > 0.001}>
      <mesh geometry={geoCore} material={core} frustumCulled={false} renderOrder={2} />
      <mesh geometry={geoGlow} material={glowB} frustumCulled={false} renderOrder={3} />
      <mesh geometry={geoGlow} material={glowA} frustumCulled={false} renderOrder={4} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Lueur rouge au sol (anneau gaussien + léger bassin intérieur)       */
/* ------------------------------------------------------------------ */

const FLOOR_VERT = /* glsl */ `
uniform float uSize;
varying vec2 vP;
void main() {
  vP = position.xy * uSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const FLOOR_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uA1;
uniform float uA2;
uniform float uSigma;
uniform float uOpacity;
uniform float uPool;
varying vec2 vP;
void main() {
  float r = length(vec2(vP.x / uA1, vP.y / uA2));
  float d = (r - 1.0) * 0.5 * (uA1 + uA2);
  float ringA = exp(-(d * d) / (uSigma * uSigma));
  float pool = smoothstep(1.05, 0.0, r) * uPool;
  float a = (ringA * 0.9 + pool) * uOpacity;
  gl_FragColor = vec4(uColor, a);
}
`;

export const FloorGlow: React.FC<{ ring: RingState }> = ({ ring }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FLOOR_VERT,
        fragmentShader: FLOOR_FRAG,
        uniforms: {
          uColor: { value: hexToVec3(RING.base) },
          uA1: { value: 1 },
          uA2: { value: 1 },
          uSigma: { value: 0.4 },
          uOpacity: { value: 0.3 },
          uPool: { value: 0.12 },
          uSize: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  // axes de l'ellipse projetés au sol (le plan de l'anneau est presque horizontal)
  const q = new THREE.Quaternion(...ring.pose.quat);
  const e1 = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  const yaw = Math.atan2(-e1.z, e1.x);
  const r1 = ring.pose.a1 * Math.hypot(e1.x, e1.z);
  const e2 = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  const r2 = ring.pose.a2 * Math.hypot(e2.x, e2.z);
  const R = Math.max(r1, r2);
  const size = (R + 1.6) * 2;
  useLayoutEffect(() => {
    mat.uniforms.uA1.value = r1;
    mat.uniforms.uA2.value = r2;
    mat.uniforms.uSigma.value = ring.floorSigma;
    mat.uniforms.uOpacity.value = 0.34 * ring.floorGlow;
    mat.uniforms.uSize.value = size;
  });
  return (
    <group position={[ring.pose.center[0], 0.004, ring.pose.center[2]]} rotation={[0, yaw, 0]} visible={ring.floorGlow > 0.001}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[size, size, 1]} material={mat} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
};
