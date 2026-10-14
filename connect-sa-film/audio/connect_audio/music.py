"""Original instrumental bed for the CONNECT SA film (procedural synthesis, deterministic).

Grid: 98.63 BPM so that BOTH the studio entrance (11.4 s, drums in) and the logo (35.733 s,
final resolve) fall on bar downbeats (10 bars apart). Key: D major, I-V6-vi-IV loop,
then IV-V(sus4) -> I at the logo. Sections follow timeline.json scenes.
"""
from __future__ import annotations

import numpy as np

from . import dsp

SR = dsp.SR
DUR = 40.0
N = int(DUR * SR)

DRUMS_IN = 11.4
LOGO = 1072 / 30.0  # 35.733 s
BAR = (LOGO - DRUMS_IN) / 10.0  # 2.4333 s
BEAT = BAR / 4
BPM = 60.0 / BEAT
BAR0 = DRUMS_IN - 4 * BAR  # 1.667 s : first full bar

midi = lambda m: 440.0 * 2 ** ((m - 69) / 12)

# chord voicings (MIDI) and bass roots
CH = {
    "D": ([50, 57, 62, 66, 69], 38),
    "A6": ([49, 57, 61, 64, 69], 37),  # A/C#
    "Bm": ([47, 54, 59, 62, 66], 35),
    "G": ([43, 50, 55, 59, 62, 69], 31),
    "Asus": ([45, 52, 57, 62, 64], 33),
    "A": ([45, 52, 57, 61, 64], 33),
    "Dfin": ([50, 57, 62, 66, 69, 76], 38),
}
# bar index -> chord (bar k starts at BAR0 + k*BAR ; k=-1 is the pickup from 0 s)
PROG = {-1: "D", 0: "D", 1: "A6", 2: "Bm", 3: "G", 4: "D", 5: "A6", 6: "Bm", 7: "G",
        8: "D", 9: "A6", 10: "Bm", 11: "G", 12: "G", 13: "Asus"}


def bar_t(k: float) -> float:
    return BAR0 + k * BAR


def _t(n: int) -> np.ndarray:
    return np.arange(n) / SR


def saw_blep(freq: float, n: int, phase0: float = 0.0) -> np.ndarray:
    """Band-limited sawtooth (polyBLEP)."""
    dt = freq / SR
    ph = (phase0 + dt * np.arange(n)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt
    y[m] -= x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt
    y[m] -= x * x + x + x + 1
    return y


def adsr(n: int, a: float, d: float, s: float, r: float, hold: float) -> np.ndarray:
    t = _t(n)
    e = np.where(t < a, t / max(a, 1e-4), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-4), e)
    e = np.where((t >= a + d) & (t < hold), s, e)
    e = np.where(t >= hold, s * np.exp(-(t - hold) / max(r / 4.6, 1e-4)), e)
    return np.clip(e, 0, 1)


# ---------------------------------------------------------------- instruments
def pad_chord(notes, dur: float, rng, release=1.4) -> np.ndarray:
    n = int((dur + release) * SR)
    out = np.zeros((n, 2))
    env = adsr(n, 0.55, 0.6, 0.85, release, dur)
    for i, m in enumerate(notes):
        f = midi(m)
        for det, pan in ((-7, -0.7), (0, 0.0), (7, 0.7)):
            ff = f * 2 ** (det / 1200)
            v = saw_blep(ff, n, rng.uniform())
            out += dsp.stereo(v, pan) * (0.33 / len(notes)) * (0.8 if i == 0 else 1.0)
    return out * env[:, None]


def pluck(f: float, dur: float, bright: float) -> np.ndarray:
    n = int(dur * SR)
    t = _t(n)
    env = np.exp(-t / 0.18) * (1 - np.exp(-t / 0.002))
    y = (np.sin(2 * np.pi * f * t) + 0.45 * bright * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.08)
         + 0.2 * bright * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.05))
    return y * env


def bell(f: float, dur: float) -> np.ndarray:
    """FM bell (carrier f, modulator 3.5 f, decaying index)."""
    n = int(dur * SR)
    t = _t(n)
    idx = 2.2 * np.exp(-t / 0.6)
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * 3.5 * f * t))
    return y * np.exp(-t / 1.4) * (1 - np.exp(-t / 0.003))


def kick(gain=1.0) -> np.ndarray:
    n = int(0.45 * SR)
    t = _t(n)
    f = 46 + 90 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.2) + 0.25 * np.exp(-t / 0.004) * np.sin(2 * np.pi * 1800 * t)
    return np.tanh(1.4 * y) * gain


def snap(rng, gain=1.0) -> np.ndarray:
    n = int(0.35 * SR)
    t = _t(n)
    nz = rng.standard_normal(n)
    env = np.zeros(n)
    for k, dt in enumerate((0.0, 0.009, 0.018)):
        env += (t >= dt) * np.exp(-np.maximum(t - dt, 0) / (0.006 if k < 2 else 0.11))
    y = dsp.bp(nz, 900, 4200, SR, 2) * env
    return y * gain


def hat(rng, open_=False, gain=1.0) -> np.ndarray:
    n = int((0.25 if open_ else 0.06) * SR)
    t = _t(n)
    y = dsp.hp(rng.standard_normal(n), 7500, SR, 2) * np.exp(-t / (0.08 if open_ else 0.018))
    return y * gain


def sub_note(f: float, dur: float) -> np.ndarray:
    n = int(dur * SR)
    t = _t(n)
    y = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)
    return np.tanh(1.2 * y) * adsr(n, 0.006, 0.08, 0.7, 0.06, dur * 0.85)


def noise_swell(rng, dur: float, f0: float, f1: float, peak_at: float = 1.0, gain=1.0) -> np.ndarray:
    """Filtered-noise riser/swell: band-pass centre sweeps f0 -> f1, amplitude peaks at peak_at (0..1)."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    fc = f0 * (f1 / f0) ** t
    nz = rng.standard_normal((n, 2))
    y = dsp.tv_filter(nz, fc, "bp", q=1.2)
    env = np.where(t < peak_at, (t / max(peak_at, 1e-3)) ** 2.2, np.exp(-(t - peak_at) / 0.12))
    return y * env[:, None] * gain


# ---------------------------------------------------------------- arrangement
def build(seed: int = 3) -> tuple[np.ndarray, dict]:
    rng = np.random.default_rng(seed)
    pad = np.zeros((N + SR * 3, 2))
    arp = np.zeros_like(pad)
    drums = np.zeros_like(pad)
    bass = np.zeros_like(pad)
    fx = np.zeros_like(pad)

    # --- pads (one chord per bar, final chord held from the logo)
    for k, name in PROG.items():
        t0 = 0.0 if k == -1 else bar_t(k)
        t1 = bar_t(k + 1)
        notes, _ = CH[name]
        if name == "Asus":  # sus4 then resolve to A on beat 3
            dsp.place(pad, pad_chord(notes, (t1 - t0) / 2 + 0.05, rng), t0)
            dsp.place(pad, pad_chord(CH["A"][0], (t1 - t0) / 2, rng), t0 + (t1 - t0) / 2)
        else:
            dsp.place(pad, pad_chord(notes, t1 - t0 + 0.05, rng), t0, gain=0.9 if k < 4 else 1.0)
    dsp.place(pad, pad_chord(CH["Dfin"][0], 2.9, rng, release=1.2), LOGO, gain=1.15)

    # pad brightness automation (cutoff per sample)
    tt = _t(len(pad))
    cut = np.interp(tt, [0, 3.2, 8.2, 11.0, 11.4, 19.4, 27.2, 31.6, 35.7, 37.5, 40],
                    [700, 800, 900, 1600, 2200, 2400, 3000, 3600, 4200, 2600, 1200])
    pad = dsp.tv_filter(pad, cut, "lp", q=0.6)

    # --- plucked arpeggio (8ths), sparse in the intro, fuller later
    pattern = [0, 2, 3, 1, 4, 2, 3, 1]
    e8 = BEAT / 2
    for k, name in PROG.items():
        if k < 0:
            continue
        notes = sorted(CH[name][0])
        tones = [m + 12 for m in notes[1:]]  # one octave up, skip lowest
        for i in range(8):
            t = bar_t(k) + i * e8
            if t >= LOGO - 0.01:
                break
            intro = t < DRUMS_IN
            if intro and i % 2 == 1:
                continue
            m = tones[pattern[i] % len(tones)]
            if t >= 31.6:
                m += 12 if i % 4 == 2 else 0
            g = (0.14 if intro else 0.2) * (1.0 if i % 2 == 0 else 0.75)
            dsp.place(arp, dsp.stereo(pluck(midi(m), 0.6, 0.7 if intro else 1.0), -0.45 if i % 2 else 0.45), t, gain=g)
    # dotted-8th echo for width
    d = int(0.75 * BEAT * SR)
    echo = np.zeros_like(arp)
    echo[d:] += 0.32 * arp[:-d, ::-1]
    echo[2 * d:] += 0.12 * arp[: -2 * d]
    arp = dsp.lp(arp + echo, 6500, SR, 2)

    # --- drums & bass from the studio entrance to the bar before the logo
    for k in range(4, 14):
        tb = bar_t(k)
        root = midi(CH[PROG[k]][1])
        for b in range(4):
            t = tb + b * BEAT
            if b in (0, 2):
                dsp.place(drums, kick(0.9), t)
            if b in (1, 3) and t >= 13.0:
                dsp.place(drums, dsp.stereo(snap(rng, 0.42), 0.1), t)
            for h in range(2):
                th = t + h * e8
                op = h == 1 and b == 3
                dsp.place(drums, dsp.stereo(hat(rng, op, 0.22 if h else 0.12), 0.35), th)
            # bass: 8ths on the root, pumping after each kick
            for h in range(2):
                tbass = t + h * e8
                if k == 13 and b >= 2:
                    continue
                dsp.place(bass, sub_note(root, e8 * 0.92), tbass, gain=0.55 if h == 0 else 0.42)
        if k in (7, 11):  # small fills before 19.4-ish / 29
            for j in range(4):
                dsp.place(drums, dsp.stereo(snap(rng, 0.18 + 0.06 * j), 0.0), tb + 3 * BEAT + j * BEAT / 4)

    # --- riser into the studio (10.0 -> 11.4) and impacts
    dsp.place(fx, noise_swell(rng, 1.4, 300, 7000, 1.0, 0.16), 10.0)
    dsp.place(fx, dsp.stereo(kick(0.8)), DRUMS_IN)
    crash = dsp.hp(rng.standard_normal((int(2.0 * SR), 2)), 3500, SR, 2) * np.exp(-_t(int(2.0 * SR)) / 0.45)[:, None]
    dsp.place(fx, crash, DRUMS_IN, gain=0.07)
    # lift into the light collection (27.2) and the services (31.6)
    dsp.place(fx, noise_swell(rng, 1.0, 600, 9000, 1.0, 0.06), 27.2 - 1.0)
    dsp.place(fx, noise_swell(rng, 0.9, 500, 8000, 1.0, 0.06), 31.6 - 0.9)
    # pre-logo riser + logo sting
    dsp.place(fx, noise_swell(rng, 1.6, 400, 9000, 1.0, 0.11), LOGO - 1.6)
    dsp.place(fx, dsp.stereo(kick(0.9)), LOGO)
    dsp.place(fx, crash, LOGO, gain=0.06)
    for m, pan, g in ((74, -0.3, 0.16), (81, 0.3, 0.12), (86, 0.0, 0.07)):
        dsp.place(fx, dsp.stereo(bell(midi(m), 3.8), pan), LOGO, gain=g)

    # --- buses
    ir = dsp.make_ir(rt60=2.4, predelay=0.02, seed=5, damp_hz=5500, width=1.0, lowcut=200)
    pad_w = dsp.convolve(pad, ir)[: len(pad)]
    arp_w = dsp.convolve(arp, ir)[: len(arp)]
    fx_w = dsp.convolve(fx, ir)[: len(fx)]
    snap_w = dsp.convolve(drums, dsp.make_ir(rt60=0.9, predelay=0.01, seed=9, damp_hz=7000, lowcut=300))[: len(drums)]
    # sidechain pump on pad from the kick pattern
    pump = np.ones(len(pad))
    for k in range(4, 14):
        for b in (0, 2):
            i = int(bar_t(k) * SR + b * BEAT * SR)
            L = int(0.32 * SR)
            if i + L < len(pump):
                pump[i: i + L] = np.minimum(pump[i: i + L], 1 - 0.32 * np.exp(-_t(L) / 0.12))
    mix = (0.55 * pad + 0.22 * pad_w) * pump[:, None] + 0.75 * arp + 0.3 * arp_w + 0.85 * drums + 0.12 * snap_w \
        + 0.9 * dsp.stereo(dsp.lp(bass[:, 0], 900, SR, 2)) / np.sqrt(2) + fx + 0.35 * fx_w
    mix = dsp.hp(mix, 30, SR, 2)
    mix = mix[:N]
    # clean musical exit: natural decay of the final chord, then fade to digital silence
    mix = dsp.fade(mix, 0.25, 0.9)
    mix[-int(0.02 * SR):] = 0.0
    info = dict(bpm=round(BPM, 3), bar_s=round(BAR, 4), first_bar_s=round(BAR0, 3), drums_in_s=DRUMS_IN,
                logo_s=round(LOGO, 3), key="D major", progression="D A/C# Bm G (x3) G Asus-A | D")
    return mix, info
