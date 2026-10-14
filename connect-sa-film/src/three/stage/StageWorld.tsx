/**
 * Contenu du canevas 3D du studio (S4–S6) et de la collection de fin (S8).
 */
import React from "react";
import { lerp } from "./math";
import { EndcardState, StageState, getFmt } from "./choreo";
import { FloorGlow, TrajectoryRing } from "./Ring";
import { DeviceActor, RigCamera, SceneFog, ShadowFloor, StudioEnvironment, StudioLights } from "./Studio";

const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, t));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
};

export const StageWorld: React.FC<{ st: StageState; isV: boolean; W: number; H: number }> = ({ st, isV, W, H }) => {
  const F = getFmt(isV);
  const L = st.light;
  return (
    <>
      <RigCamera rig={st.rig} W={W} H={H} />
      <StudioEnvironment intensity={lerp(lerp(0.55, 0.4, st.focus), 0.95, L)} rotationY={0.6} />
      <SceneFog color={mixHex("#23252A", "#F1F2F4", L)} near={st.fog.near} far={st.fog.far} />
      <StudioLights light={L} focus={st.focus} heroPos={st.heroPos} center={[st.floorCenter[0], 0.4, st.floorCenter[2]]} />
      <ShadowFloor opacity={lerp(0.55, 0.2, L)} center={st.floorCenter} />
      <FloorGlow ring={st.ring} />
      <TrajectoryRing ring={st.ring} camSeam={F.seamCam} dRef={F.dRef} />
      {st.devices.map((d) => (
        <DeviceActor key={d.kind} s={d} contact={lerp(0.55, 0.42, L)} />
      ))}
    </>
  );
};

export const EndcardWorld: React.FC<{ st: EndcardState; W: number; H: number }> = ({ st, W, H }) => (
  <>
    <RigCamera rig={st.rig} W={W} H={H} />
    <StudioEnvironment intensity={0.95} rotationY={0.6} />
    <StudioLights light={1} focus={0} heroPos={[0, 0, 0]} center={[0, 0.4, 0]} shadowExtent={3.4} />
    <ShadowFloor opacity={0.2} center={[0, 0, 0]} />
    {st.devices.map((d) => (
      <DeviceActor key={d.kind} s={d} contact={0.42} />
    ))}
  </>
);
