"""DSP building blocks (numpy/scipy only, deterministic)."""
from __future__ import annotations

import wave
from pathlib import Path

import numpy as np
from scipy import signal

SR = 48000


# ---------------------------------------------------------------- I/O
def write_wav(path, x: np.ndarray, sr: int = SR, bits: int = 24):
    """Write float audio (n,) or (n, ch) to PCM WAV (16/24-bit), clipped to [-1, 1)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if x.ndim == 1:
        x = x[:, None]
    ch = x.shape[1]
    x = np.clip(x, -1.0, 1.0 - 2.0 ** -(bits - 1))
    if bits == 24:
        q = np.round(x * 8388608.0).astype(np.int32)
        b = np.empty((q.size, 3), np.uint8)
        f = q.reshape(-1)
        b[:, 0] = f & 0xFF
        b[:, 1] = (f >> 8) & 0xFF
        b[:, 2] = (f >> 16) & 0xFF
        data = b.tobytes()
    else:
        data = np.round(x * 32767.0).astype("<i2").tobytes()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(bits // 8)
        w.setframerate(sr)
        w.writeframes(data)
    return path


def read_wav(path):
    with wave.open(str(path)) as w:
        sr, n, ch, sw = w.getframerate(), w.getnframes(), w.getnchannels(), w.getsampwidth()
        b = w.readframes(n)
    if sw == 2:
        a = np.frombuffer(b, "<i2").astype(np.float64) / 32768.0
    elif sw == 3:
        u = np.frombuffer(b, np.uint8).reshape(-1, 3).astype(np.int32)
        a = (((u[:, 0] | (u[:, 1] << 8) | (u[:, 2] << 16)) << 8) >> 8).astype(np.float64) / 8388608.0
    else:
        a = np.frombuffer(b, "<i4").astype(np.float64) / 2147483648.0
    return a.reshape(-1, ch), sr


# ---------------------------------------------------------------- helpers
def db2a(d):
    return 10.0 ** (np.asarray(d) / 20.0)


def a2db(a, floor=1e-12):
    return 20.0 * np.log10(np.maximum(np.abs(a), floor))


def resample(x: np.ndarray, sr_in: int, sr_out: int = SR) -> np.ndarray:
    from math import gcd

    g = gcd(sr_in, sr_out)
    return signal.resample_poly(x, sr_out // g, sr_in // g, axis=0, window=("kaiser", 8.0))


def stereo(x: np.ndarray, pan: float = 0.0) -> np.ndarray:
    """Mono -> stereo with constant-power pan (-1 left .. +1 right)."""
    if x.ndim == 2:
        return x
    th = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], 1) * np.sqrt(2)


def place(dst: np.ndarray, src: np.ndarray, t: float, sr: int = SR, gain: float = 1.0):
    """Add src into dst at time t (seconds); sub-sample accurate start is not needed at 48 kHz."""
    i = int(round(t * sr))
    if src.ndim == 1 and dst.ndim == 2:
        src = stereo(src)
    j0, j1 = max(0, i), min(len(dst), i + len(src))
    if j1 > j0:
        dst[j0:j1] += gain * src[j0 - i: j1 - i]
    return dst


def fade(x: np.ndarray, fin: float = 0.0, fout: float = 0.0, sr: int = SR, shape="cos"):
    n = len(x)
    g = np.ones(n)
    a, b = int(fin * sr), int(fout * sr)
    if a:
        r = np.linspace(0, 1, a)
        g[:a] = np.sin(r * np.pi / 2) ** 2 if shape == "cos" else r
    if b:
        r = np.linspace(1, 0, b)
        g[n - b:] *= np.sin(r * np.pi / 2) ** 2 if shape == "cos" else r
    return x * (g[:, None] if x.ndim == 2 else g)


# ---------------------------------------------------------------- filters (RBJ biquads)
def biquad(kind: str, f0: float, sr: int = SR, q: float = 0.707, gain_db: float = 0.0):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / sr
    c, s = np.cos(w0), np.sin(w0)
    al = s / (2 * q)
    if kind == "lp":
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]; a = [1 + al, -2 * c, 1 - al]
    elif kind == "hp":
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]; a = [1 + al, -2 * c, 1 - al]
    elif kind == "bp":
        b = [al, 0, -al]; a = [1 + al, -2 * c, 1 - al]
    elif kind == "notch":
        b = [1, -2 * c, 1]; a = [1 + al, -2 * c, 1 - al]
    elif kind == "peak":
        b = [1 + al * A, -2 * c, 1 - al * A]; a = [1 + al / A, -2 * c, 1 - al / A]
    elif kind == "lowshelf":
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]
        a = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
    elif kind == "highshelf":
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
        a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    else:
        raise ValueError(kind)
    b, a = np.array(b) / a[0], np.array(a) / a[0]
    return np.concatenate([b, a])[None, :]


def filt(x, *sos_list):
    y = x
    for sos in sos_list:
        y = signal.sosfilt(sos, y, axis=0)
    return y


def hp(x, f, sr=SR, order=4):
    return signal.sosfilt(signal.butter(order, f, "hp", fs=sr, output="sos"), x, axis=0)


def lp(x, f, sr=SR, order=4):
    return signal.sosfilt(signal.butter(order, min(f, sr * 0.49), "lp", fs=sr, output="sos"), x, axis=0)


def bp(x, f1, f2, sr=SR, order=2):
    return signal.sosfilt(signal.butter(order, [f1, min(f2, sr * 0.49)], "bp", fs=sr, output="sos"), x, axis=0)


def tv_filter(x: np.ndarray, cutoff: np.ndarray, kind="lp", q=0.707, sr=SR, block=256):
    """Time-varying biquad (coefficients updated per block, state carried -> no zipper clicks
    for smooth cutoff curves). cutoff: per-sample array (Hz)."""
    mono = x.ndim == 1
    X = x[:, None] if mono else x
    y = np.zeros_like(X)
    zi = np.zeros((1, 2, X.shape[1]))
    for i in range(0, len(X), block):
        fc = float(np.clip(cutoff[min(i + block // 2, len(cutoff) - 1)], 20, sr * 0.45))
        sos = biquad(kind, fc, sr, q)
        seg, zi_new = signal.sosfilt(sos, X[i: i + block], axis=0, zi=zi.reshape(1, 2, -1))
        y[i: i + block] = seg
        zi = zi_new
    return y[:, 0] if mono else y


# ---------------------------------------------------------------- envelopes & dynamics
def env_follow(x: np.ndarray, attack: float, release: float, sr: int = SR, mode="peak") -> np.ndarray:
    """Asymmetric one-pole envelope follower on |x| (or x^2 for rms), vectorised via lfilter on
    a rectified signal for release and a max-trick for attack (good enough, deterministic)."""
    m = np.abs(x) if x.ndim == 1 else np.abs(x).max(1)
    if mode == "rms":
        m = m ** 2
    ga = np.exp(-1.0 / (attack * sr))
    gr = np.exp(-1.0 / (release * sr))
    # exact asymmetric follower in a compiled-free way: process in python on a decimated grid
    dec = 16
    md = m[: len(m) // dec * dec].reshape(-1, dec).max(1)
    if len(m) % dec:
        md = np.append(md, m[len(m) // dec * dec:].max())
    ga_d, gr_d = ga ** dec, gr ** dec
    e = np.empty_like(md)
    acc = 0.0
    for i, v in enumerate(md):
        acc = ga_d * acc + (1 - ga_d) * v if v > acc else gr_d * acc + (1 - gr_d) * v
        e[i] = acc
    env = np.repeat(e, dec)[: len(m)]
    # smooth the staircase
    env = signal.lfilter([1 - np.exp(-1 / (0.002 * sr))], [1, -np.exp(-1 / (0.002 * sr))], env)
    if mode == "rms":
        env = np.sqrt(np.maximum(env, 0))
    return env


def compress(x, threshold_db=-18.0, ratio=3.0, attack=0.005, release=0.08, knee_db=6.0, makeup_db=0.0,
             sr=SR, detector=None, mode="rms"):
    det = x if detector is None else detector
    env = env_follow(det, attack, release, sr, mode)
    lv = a2db(env)
    over = lv - threshold_db
    gr = np.where(over <= -knee_db / 2, 0.0,
                  np.where(over >= knee_db / 2, over * (1 - 1 / ratio),
                           (1 - 1 / ratio) * (over + knee_db / 2) ** 2 / (2 * knee_db)))
    g = db2a(-gr + makeup_db)
    return (x * (g[:, None] if x.ndim == 2 else g)), gr


def deess(x, sr=SR, f_lo=4800.0, f_hi=10000.0, threshold_db=-30.0, ratio=4.0, max_red_db=8.0):
    """Split-band de-esser: only the sibilance band is attenuated when it exceeds the threshold
    *and* dominates the broadband level."""
    sib = bp(x, f_lo, f_hi, sr, order=2)
    rest = x - sib
    e_s = env_follow(sib, 0.002, 0.06, sr, "rms")
    e_f = env_follow(x, 0.002, 0.06, sr, "rms")
    rel = a2db(e_s) - a2db(e_f)  # sibilance share (dB, <= 0)
    over = np.maximum(0.0, a2db(e_s) - threshold_db) * np.clip((rel + 9.0) / 6.0, 0, 1)
    red = np.minimum(over * (1 - 1 / ratio), max_red_db)
    g = db2a(-red)
    return rest + sib * (g[:, None] if x.ndim == 2 else g), red


def soft_clip(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


def true_peak_limiter(x: np.ndarray, ceiling_db=-1.2, sr=SR, lookahead=0.004, release=0.12, os=4):
    """Look-ahead brickwall limiter driven by a 4x oversampled peak estimate (true-peak aware).
    gain = boxcar_la( release( forward_min_la(required) ) )  -> smooth attack that is guaranteed to
    reach the required gain at each peak sample."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d

    ceil = db2a(ceiling_db)
    up = signal.resample_poly(x, os, 1, axis=0)
    pk = np.abs(up).max(1) if up.ndim == 2 else np.abs(up)
    pk = pk[: len(pk) // os * os].reshape(-1, os).max(1)
    pk = np.pad(pk, (0, max(0, len(x) - len(pk))))[: len(x)]
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-12))
    la = max(1, int(lookahead * sr))
    L = la + 1
    # forward window min over [n, n+la] (= reversed causal min)
    fmin = minimum_filter1d(need[::-1], size=L, origin=(L - 1) // 2, mode="nearest")[::-1]
    rel = np.exp(-1.0 / (release * sr))
    dec = 8
    n = len(fmin)
    gd = np.pad(fmin, (0, (-n) % dec), mode="edge").reshape(-1, dec).min(1)
    out = np.empty_like(gd)
    acc = 1.0
    rd = rel ** dec
    for i, v in enumerate(gd):
        acc = v if v < acc else rd * acc + (1 - rd) * v
        out[i] = acc
    g2 = np.minimum(np.repeat(out, dec)[:n], fmin)
    # causal boxcar over [n-la, n]
    g3 = uniform_filter1d(g2, size=L, origin=(L - 1) // 2, mode="nearest")
    return x * (g3[:, None] if x.ndim == 2 else g3), g3


# ---------------------------------------------------------------- reverb
def make_ir(rt60=1.8, sr=SR, predelay=0.012, length=None, seed=7, damp_hz=6000.0, er=True, width=1.0,
            lowcut=150.0):
    """Synthetic stereo impulse response: early reflections + exponentially decaying, frequency-
    dependent (darker as it decays) decorrelated noise tail."""
    rng = np.random.default_rng(seed)
    length = length or min(rt60 * 1.3, 4.0)
    n = int(length * sr)
    t = np.arange(n) / sr
    ir = np.zeros((n, 2))
    for ch in range(2):
        noise = rng.standard_normal(n)
        # two-band decay: highs die faster -> natural darkening
        lo = lp(noise, damp_hz, sr, 2)
        hi = noise - lo
        d_lo = np.exp(-6.91 * t / rt60)
        d_hi = np.exp(-6.91 * t / (rt60 * 0.45))
        tail = lo * d_lo + 0.35 * hi * d_hi
        # fade-in of the diffuse tail (build-up of density)
        tail *= 1 - np.exp(-t / 0.02)
        ir[:, ch] = tail
    if er:
        for k in range(10):
            dt = predelay + rng.uniform(0.003, 0.045)
            g = 0.55 * np.exp(-k * 0.18) * rng.choice([-1, 1])
            i = int(dt * sr)
            ch = k % 2
            ir[i, ch] += g
            ir[i + int(rng.uniform(0.0003, 0.0011) * sr), 1 - ch] += 0.7 * g
    pd = int(predelay * sr)
    ir = np.concatenate([np.zeros((pd, 2)), ir])[:n]
    ir = hp(ir, lowcut, sr, 2)
    # width control (mid/side)
    m, s = (ir[:, 0] + ir[:, 1]) / 2, (ir[:, 0] - ir[:, 1]) / 2
    ir = np.stack([m + width * s, m - width * s], 1)
    ir /= np.sqrt((ir ** 2).sum() / 2)
    ir = fade(ir, 0, min(0.3, length * 0.25), sr)
    return ir


def convolve(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    """Mono or stereo x convolved with stereo IR -> stereo, same length + tail kept by caller."""
    if x.ndim == 1:
        return np.stack([signal.fftconvolve(x, ir[:, 0]), signal.fftconvolve(x, ir[:, 1])], 1)
    return np.stack([signal.fftconvolve(x[:, 0], ir[:, 0]), signal.fftconvolve(x[:, 1], ir[:, 1])], 1)
