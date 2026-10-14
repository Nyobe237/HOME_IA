/**
 * Prévisualisation du domaine « Appareils 3D » (n'importe que src/three/devices/** et les utilitaires partagés).
 * npx remotion still src/preview/devices.tsx DevicesSheetDark out/preview/devices/sheet_dark.png --frame=0
 */
import React, { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, Composition, registerRoot, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BG, COLORS, FONTS } from "../theme";
import { Window, useAbsFrame } from "../time";
import { loadFonts } from "../fonts";
import { DEVICE_DIMS, DEVICE_KINDS, DEVICE_LABELS, Device, DeviceKind, getDeviceBuild } from "../three/devices";

const deg = (d: number) => (d * Math.PI) / 180;

/* ------------------------------------------------------------------ studio */

const Environment: React.FC<{ intensity: number }> = ({ intensity }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = rt.texture;
    pm.dispose();
    return () => {
      scene.environment = null;
      rt.dispose();
    };
  }, [gl, scene]);
  useLayoutEffect(() => {
    scene.environmentIntensity = intensity;
  }, [scene, intensity]);
  return null;
};

const CameraRig: React.FC<{ pos: [number, number, number]; target: [number, number, number]; fov: number }> = ({ pos, target, fov }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.fov = fov;
    camera.near = 0.05;
    camera.far = 100;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, pos, target, fov]);
  return null;
};

type Look = "dark" | "light";

const Lights: React.FC<{ look: Look; span: number }> = ({ look, span }) => {
  const dark = look === "dark";
  const s = span;
  return (
    <>
      <hemisphereLight args={["#ffffff", dark ? "#1a1b1e" : "#d9dce0", dark ? 0.25 : 0.35]} />
      {/* clé : avant gauche, haute */}
      <directionalLight
        position={[-3.2 * s, 5 * s, 4.2 * s]}
        intensity={dark ? 2.3 : 2.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.015}
        shadow-radius={4}
        shadow-camera-left={-4 * s}
        shadow-camera-right={4 * s}
        shadow-camera-top={3 * s}
        shadow-camera-bottom={-3 * s}
        shadow-camera-near={0.1}
        shadow-camera-far={20 * s}
      />
      {/* débouchage : droite, bas */}
      <directionalLight position={[4 * s, 1.6 * s, 3 * s]} intensity={dark ? 0.55 : 0.6} />
      {/* contre-jour : arrière, découpe les silhouettes sombres sur graphite */}
      <directionalLight position={[1.2 * s, 3.5 * s, -5 * s]} intensity={dark ? 2.6 : 1.2} />
      <directionalLight position={[-4 * s, 2 * s, -3 * s]} intensity={dark ? 1.2 : 0.5} />
    </>
  );
};

const Ground: React.FC<{ y?: number; w?: number; d?: number; opacity: number }> = ({ y = 0, w = 40, d = 40, opacity }) => (
  <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]} receiveShadow>
    <planeGeometry args={[w, d]} />
    <shadowMaterial transparent opacity={opacity} />
  </mesh>
);

const Studio: React.FC<{
  look: Look;
  cam: { pos: [number, number, number]; target: [number, number, number]; fov: number };
  span?: number;
  children: React.ReactNode;
}> = ({ look, cam, span = 1, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.0 }}
      camera={{ fov: cam.fov, position: cam.pos, near: 0.05, far: 100 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <CameraRig {...cam} />
      <Environment intensity={look === "dark" ? 0.75 : 0.9} />
      <Lights look={look} span={span} />
      {children}
    </ThreeCanvas>
  );
};

/* ------------------------------------------------------------------ mise en page des grilles */

/** Échelle pour qu'un appareil tienne dans une cellule (vue 3/4 ou rotation complète). */
const fitScale = (k: DeviceKind, cellW: number, cellH: number, spin: boolean, yaw: number) => {
  const d = DEVICE_DIMS[k];
  const projW = spin ? Math.hypot(d.w, d.d) : Math.abs(d.w * Math.cos(yaw)) + Math.abs(d.d * Math.sin(yaw));
  return Math.min(cellW / projW, cellH / d.h);
};

type GridProps = {
  look: Look;
  cols: number;
  rows: number;
  /** rotation (radians) d'une cellule à l'image f */
  yaw: (f: number, i: number) => number;
  spin: boolean;
  labels?: boolean;
  fov?: number;
  elev?: number;
};

const ROW_GAP = 1.35;

const Grid: React.FC<GridProps> = ({ look, cols, rows, yaw, spin, labels = true, fov = 20, elev = 9 }) => {
  const f = useAbsFrame();
  const { width, height } = useVideoConfig();
  const aspect = width / height;
  const cellW = 1;
  const needW = cols * cellW + 0.25;
  const needH = rows * ROW_GAP + 0.1;
  const t = Math.tan(deg(fov / 2));
  const dist = Math.max(needH / (2 * t), needW / (2 * t * aspect));
  const cy = -((rows - 1) * ROW_GAP) / 2 + 0.38;
  const cam = useMemo(
    () => ({
      pos: [0, cy + Math.sin(deg(elev)) * dist, Math.cos(deg(elev)) * dist] as [number, number, number],
      target: [0, cy, 0] as [number, number, number],
      fov,
    }),
    [cy, dist, fov, elev],
  );
  const cells = DEVICE_KINDS.map((k, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = (c - (cols - 1) / 2) * cellW;
    const y = -r * ROW_GAP;
    const a = yaw(f, i);
    const s = fitScale(k, 0.82 * cellW, 0.78, spin, a);
    return { k, x, y, a, s };
  });
  // projection des étiquettes
  const camObj = useMemo(() => {
    const c = new THREE.PerspectiveCamera(fov, aspect, 0.05, 100);
    c.position.set(...cam.pos);
    c.lookAt(...cam.target);
    c.updateMatrixWorld();
    return c;
  }, [cam, fov, aspect]);
  const dark = look === "dark";
  return (
    <AbsoluteFill style={{ background: dark ? BG.graphite : BG.light }}>
      <Studio look={look} cam={cam} span={Math.max(cols, rows) / 6 + 0.5}>
        {Array.from({ length: rows }, (_, r) => (
          <Ground key={r} y={-r * ROW_GAP} w={cols * cellW + 1} d={1.1} opacity={dark ? 0.5 : 0.22} />
        ))}
        {cells.map(({ k, x, y, a, s }) => (
          <group key={k} position={[x, y, 0]} rotation-y={a} scale={s}>
            <Device kind={k} contactShadow={dark ? 0.55 : 0.32} />
          </group>
        ))}
      </Studio>
      {labels
        ? cells.map(({ k, x, y }) => {
            const p = new THREE.Vector3(x, y - 0.02, 0.45).project(camObj);
            return (
              <div
                key={k}
                style={{
                  position: "absolute",
                  left: ((p.x + 1) / 2) * width - 150,
                  top: ((1 - p.y) / 2) * height + 8,
                  width: 300,
                  textAlign: "center",
                  fontFamily: FONTS.text,
                  fontWeight: 600,
                  fontSize: 22,
                  color: dark ? "rgba(255,255,255,0.72)" : COLORS.textMuted,
                }}
              >
                {DEVICE_LABELS[k]}
              </div>
            );
          })
        : null}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ gros plan */

const Closeup: React.FC<{ kind: DeviceKind; look: Look }> = ({ kind, look }) => {
  const f = useAbsFrame();
  const { width, height } = useVideoConfig();
  const d = DEVICE_DIMS[kind];
  const yaw = deg(-32) + f * deg(3);
  const fov = 22;
  // l'appareil occupe ~65 % de la hauteur (ou ~70 % de la largeur)
  const aspect = width / height;
  const t = Math.tan(deg(fov / 2));
  const projW = Math.hypot(d.w, d.d);
  const dist = Math.max(d.h / (0.68 * 2 * t), projW / (0.72 * 2 * t * aspect)) + Math.max(d.d, d.w) / 2;
  const elev = deg(14);
  const cam = {
    pos: [0, d.h * 0.48 + Math.sin(elev) * dist, Math.cos(elev) * dist] as [number, number, number],
    target: [0, d.h * 0.48, 0] as [number, number, number],
    fov,
  };
  const dark = look === "dark";
  return (
    <AbsoluteFill style={{ background: dark ? BG.graphite : BG.light }}>
      <Studio look={look} cam={cam} span={Math.max(d.w, d.h, d.d) * 1.2}>
        <Ground opacity={dark ? 0.5 : 0.22} />
        <group rotation-y={yaw}>
          <Device kind={kind} contactShadow={dark ? 0.55 : 0.32} />
        </group>
      </Studio>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ statistiques */

const Stats: React.FC = () => {
  const rows = DEVICE_KINDS.map((k) => {
    const b = getDeviceBuild(k);
    const size = b.bbox.getSize(new THREE.Vector3());
    const d = DEVICE_DIMS[k];
    const draws = b.parts.length + b.keys.reduce((n, f) => n + new Set(f.keys.map((q) => `${q.w.toFixed(5)}|${q.d.toFixed(5)}`)).size, 0);
    return { k, tri: b.triangles, draws, size, d, keys: b.keys.reduce((n, f) => n + f.keys.length, 0) };
  });
  const cell: React.CSSProperties = { padding: "10px 18px", borderBottom: "1px solid #ddd", textAlign: "right" };
  return (
    <AbsoluteFill style={{ background: "#fff", fontFamily: FONTS.text, fontSize: 26, padding: 60, color: COLORS.text }}>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["appareil", "triangles", "appels", "touches", "bbox mesurée (w×h×d)", "DEVICE_DIMS"].map((h) => (
              <th key={h} style={{ ...cell, textAlign: "left" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k}>
              <td style={{ ...cell, textAlign: "left" }}>{r.k}</td>
              <td style={cell}>{Math.round(r.tri).toLocaleString("fr-FR")}</td>
              <td style={cell}>{r.draws}</td>
              <td style={cell}>{r.keys}</td>
              <td style={cell}>
                {r.size.x.toFixed(3)} × {r.size.y.toFixed(3)} × {r.size.z.toFixed(3)}
              </td>
              <td style={cell}>
                {r.d.w} × {r.d.h} × {r.d.d}
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cell, textAlign: "left", fontWeight: 700 }}>total</td>
            <td style={{ ...cell, fontWeight: 700 }}>{Math.round(rows.reduce((n, r) => n + r.tri, 0)).toLocaleString("fr-FR")}</td>
            <td style={cell}>{rows.reduce((n, r) => n + r.draws, 0)}</td>
            <td style={cell} />
            <td style={cell} />
            <td style={cell} />
          </tr>
        </tbody>
      </table>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ compositions */

const SheetYaw = () => deg(-24);
const TurnYaw = (f: number) => deg(30) + f * deg(3); // 0 : 3/4 · 20 : profil · 40 : 3/4 arrière · 60 : arrière/profil

const W = (c: React.ReactNode) => {
  loadFonts();
  return (
    <Window from={0} to={1200} premount={0}>
      {c}
    </Window>
  );
};

const SheetDark: React.FC = () => W(<Grid look="dark" cols={6} rows={1} yaw={SheetYaw} spin={false} />);
const SheetLight: React.FC = () => W(<Grid look="light" cols={6} rows={1} yaw={SheetYaw} spin={false} />);
const SheetV: React.FC = () => W(<Grid look="dark" cols={2} rows={3} yaw={SheetYaw} spin={false} />);
const Turntable: React.FC = () => W(<Grid look="dark" cols={3} rows={2} yaw={TurnYaw} spin labels={false} />);
const TurntableLight: React.FC = () => W(<Grid look="light" cols={3} rows={2} yaw={TurnYaw} spin labels={false} />);
const CloseupC: React.FC<{ kind: DeviceKind; look: Look }> = (p) => W(<Closeup {...p} />);
const StatsC: React.FC = () => W(<Stats />);

const common = { durationInFrames: 1200, fps: 30 };

const Root: React.FC = () => (
  <>
    <Composition id="DevicesSheetDark" component={SheetDark} width={1920} height={1080} {...common} />
    <Composition id="DevicesSheetLight" component={SheetLight} width={1920} height={1080} {...common} />
    <Composition id="DevicesSheetVertical" component={SheetV} width={1080} height={1920} {...common} />
    <Composition id="DevicesTurntable" component={Turntable} width={1920} height={1080} {...common} />
    <Composition id="DevicesTurntableLight" component={TurntableLight} width={1920} height={1080} {...common} />
    <Composition id="DevicesStats" component={StatsC} width={1920} height={1080} {...common} />
    {DEVICE_KINDS.map((k) => (
      <React.Fragment key={k}>
        <Composition id={`Closeup-${k}`} component={CloseupC} width={1920} height={1080} defaultProps={{ kind: k, look: "dark" as Look }} {...common} />
        <Composition
          id={`CloseupLight-${k}`}
          component={CloseupC}
          width={1920}
          height={1080}
          defaultProps={{ kind: k, look: "light" as Look }}
          {...common}
        />
      </React.Fragment>
    ))}
  </>
);

registerRoot(Root);
