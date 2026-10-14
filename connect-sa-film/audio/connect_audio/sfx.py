"""Sound design synced to the picture (times = frame / 30, from timeline.json events)."""
from __future__ import annotations

import numpy as np

from . import dsp
from .music import noise_swell

SR = dsp.SR
FPS = 30.0


def _t(n):
    return np.arange(n) / SR


def key_click(rng, space=False) -> np.ndarray:
    n = int(0.06 * SR)
    t = _t(n)
    f_body = rng.uniform(170, 240) * (0.75 if space else 1.0)
    body = np.sin(2 * np.pi * f_body * t) * np.exp(-t / (0.016 if space else 0.011))
    nz = rng.standard_normal(n)
    tick = dsp.bp(nz, rng.uniform(2200, 3200), rng.uniform(5500, 7500), SR, 2) * np.exp(-t / 0.0045)
    y = 0.55 * body + 0.9 * tick
    return y * dsp.db2a(rng.uniform(-2.5, 1.0))


def mouse_click(rng, up=False) -> np.ndarray:
    n = int(0.05 * SR)
    t = _t(n)
    tick = dsp.bp(rng.standard_normal(n), 2500, 9000, SR, 2) * np.exp(-t / 0.0025)
    body = np.sin(2 * np.pi * (1500 if up else 1100) * t) * np.exp(-t / 0.006)
    return (tick + 0.4 * body) * (0.55 if up else 1.0)


def whoosh(rng, dur: float, f0=350, f1=4500, gain=1.0, pan=(-0.6, 0.6)) -> np.ndarray:
    n = int(dur * SR)
    tt = np.linspace(0, 1, n)
    fc = f0 * (f1 / f0) ** np.sin(np.pi * tt / 2)
    nz = rng.standard_normal(n)
    y = dsp.tv_filter(nz, fc, "bp", q=0.9)
    env = np.sin(np.pi * tt) ** 1.6
    y = y * env
    # pan sweep
    p = pan[0] + (pan[1] - pan[0]) * tt
    th = (p + 1) * np.pi / 4
    return np.stack([y * np.cos(th), y * np.sin(th)], 1) * np.sqrt(2) * gain


def pop(rng, gain=1.0) -> np.ndarray:
    n = int(0.09 * SR)
    t = _t(n)
    f = 620 + 380 * np.exp(-t / 0.012)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.03) * (1 - np.exp(-t / 0.0015))
    return y * gain


def shimmer(rng, dur=1.6, gain=1.0) -> np.ndarray:
    n = int(dur * SR)
    t = _t(n)
    nz = rng.standard_normal((n, 2))
    y = dsp.bp(nz, 6000, 14000, SR, 2)
    # sparkle: amplitude-modulated grains
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 23 * t + 3 * np.sin(2 * np.pi * 1.7 * t))
    return y * (am * np.exp(-t / 0.5) * (1 - np.exp(-t / 0.01)))[:, None] * gain


def build(tl: dict, seed: int = 21) -> tuple[np.ndarray, list]:
    rng = np.random.default_rng(seed)
    ev = tl["events"]
    n = int(tl["durationSeconds"] * SR)
    out = np.zeros((n + SR, 2))
    cues = []

    def at(frame):
        return frame / FPS

    def put(name, x, t, gain=1.0):
        dsp.place(out, x, t, gain=gain)
        cues.append({"cue": name, "t": round(t, 3)})

    # typing: one click per typed character (exact frames used by the picture)
    text = ev["typingText"]
    for ch, fr in zip(text, ev["typingCharFrames"]):
        x = key_click(rng, space=ch == " ")
        dsp.place(out, dsp.stereo(x, rng.uniform(-0.15, 0.15)), at(fr), gain=0.42)
    cues.append({"cue": f"typing x{len(text)}", "t": round(at(ev['typingCharFrames'][0]), 3)})
    # mouse
    put("mouse down", dsp.stereo(mouse_click(rng), 0.25), at(ev["clickDown"]), 0.6)
    put("mouse up", dsp.stereo(mouse_click(rng, up=True), 0.25), at(ev["clickUp"]), 0.6)
    # text pops (very discreet)
    for name in ("line1In", "line2In", "orbitTitleIn", "collectionTitleIn", "servicesTitleIn"):
        put(f"pop {name}", dsp.stereo(pop(rng), 0.0), at(ev[name]), 0.12)
    for i, fr in enumerate(ev["serviceIcons"]):
        put(f"pop service {i + 1}", dsp.stereo(pop(rng), (-0.4, 0.0, 0.4)[i]), at(fr), 0.16)
    # whooshes / air
    put("whoosh card lift", whoosh(rng, 0.7, 300, 3800, 0.12), at(ev["cardLift"][0]) - 0.1)
    put("riser curve sweep", noise_swell(rng, 1.4, 250, 6000, 0.97, 0.1), at(ev["curveSweep"][0]))
    for i in range(5):  # devices landing on the orbit
        put(f"swish device {i + 1}", whoosh(rng, 0.5, 500, 5000, 0.05, (0.5, -0.5) if i % 2 else (-0.5, 0.5)),
            at(ev["devicesFlyIn"][0] + i * 4) + 0.1)
    for fr in ev["heroSwitch"]:
        put(f"whoosh hero {fr}", whoosh(rng, 0.65, 300, 4200, 0.12), at(fr) - 0.4)
    put("air to light", noise_swell(rng, 1.2, 800, 9000, 0.6, 0.05), at(ev["toLight"][0]))
    put("whoosh services", whoosh(rng, 0.6, 350, 4500, 0.1), at(ev["servicesIn"]) - 0.35)
    put("whoosh end card", whoosh(rng, 0.6, 300, 4000, 0.1), at(ev["servicesExit"][0]))
    put("logo shimmer", shimmer(rng, 1.8, 0.05), at(ev["logoHit"]))
    return out[:n], cues
