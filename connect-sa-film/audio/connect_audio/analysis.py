"""Objective analysis helpers (we cannot listen): pitch, noise floor, flatness, HNR, clicks, rate,
loudness (BS.1770 K-weighting, own implementation cross-checked with ffmpeg ebur128) and
spectrogram PNG rendering."""
from __future__ import annotations

import numpy as np
from scipy import signal


def frames(x: np.ndarray, n: int, hop: int) -> np.ndarray:
    if len(x) < n:
        x = np.pad(x, (0, n - len(x)))
    cnt = 1 + (len(x) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(cnt)[:, None]
    return x[idx]


def db(x, floor=1e-12):
    return 10 * np.log10(np.maximum(x, floor))


# ---------------------------------------------------------------- pitch (YIN)
def yin_f0(x: np.ndarray, sr: int, fmin=60.0, fmax=420.0, win=0.04, hop=0.01, thr=0.15):
    n = int(win * sr)
    h = int(hop * sr)
    fr = frames(x.astype(np.float64), n, h)
    tmin, tmax = int(sr / fmax), int(sr / fmin)
    w = n - tmax
    f0 = np.full(len(fr), np.nan)
    aper = np.ones(len(fr))
    rms = np.sqrt((fr ** 2).mean(1))
    for i, f in enumerate(fr):
        if rms[i] < 1e-4:
            continue
        # difference function via FFT autocorrelation
        x0 = f[:w]
        d = np.zeros(tmax + 1)
        cs = np.concatenate([[0], np.cumsum(f ** 2)])
        e0 = cs[w] - cs[0]
        acf = np.fft.irfft(np.fft.rfft(f, 2 * n) * np.conj(np.fft.rfft(x0, 2 * n)))[: tmax + 1]
        taus = np.arange(tmax + 1)
        et = cs[taus + w] - cs[taus]
        d = e0 + et - 2 * acf
        d[0] = 0
        cmnd = np.ones_like(d)
        cmnd[1:] = d[1:] * np.arange(1, tmax + 1) / np.maximum(np.cumsum(d[1:]), 1e-12)
        seg = cmnd[tmin:tmax]
        below = np.where(seg < thr)[0]
        if len(below):
            k = below[0]
            while k + 1 < len(seg) and seg[k + 1] < seg[k]:
                k += 1
        else:
            k = int(np.argmin(seg))
        tau = k + tmin
        aper[i] = cmnd[tau]
        if aper[i] < 0.35:
            # parabolic interpolation
            if 1 <= tau < tmax:
                a, b, c = cmnd[tau - 1], cmnd[tau], cmnd[tau + 1]
                den = a - 2 * b + c
                tau = tau + (0.5 * (a - c) / den if abs(den) > 1e-12 else 0)
            f0[i] = sr / tau
    return f0, aper, rms


def speech_mask(x, sr, hop=0.01, rel_db=-35.0):
    n = int(0.03 * sr)
    h = int(hop * sr)
    e = db((frames(x, n, h) ** 2).mean(1))
    return e > (np.percentile(e, 95) + rel_db), e


def voice_metrics(x: np.ndarray, sr: int, n_syllables: int | None = None) -> dict:
    x = x.astype(np.float64)
    x = x - x.mean()
    act, e = speech_mask(x, sr)
    # level-normalise: active speech RMS -> -20 dBFS
    act_rms = np.sqrt(np.mean((frames(x, int(0.03 * sr), int(0.01 * sr))[act] ** 2)))
    x = x * (10 ** (-20 / 20) / max(act_rms, 1e-9))
    f0, aper, rms = yin_f0(x, sr)
    voiced = ~np.isnan(f0)
    st = 12 * np.log2(f0[voiced] / np.nanmedian(f0)) if voiced.any() else np.array([0.0])
    # pauses: frames >25 dB below speech level *inside* the utterance (between first/last active)
    n = int(0.03 * sr)
    h = int(0.01 * sr)
    fr = frames(x, n, h)
    fe = db((fr ** 2).mean(1))
    ia = np.where(act)[0]
    inner = np.zeros_like(act)
    if len(ia):
        inner[ia[0]: ia[-1] + 1] = True
    pause = inner & (fe < np.percentile(fe[act], 50) - 30)
    noise_floor = float(np.percentile(fe[pause], 50)) if pause.sum() > 3 else float(np.percentile(fe, 5))
    # spectral flatness on voiced frames 100..5000 Hz
    nf = 1024
    F = np.abs(np.fft.rfft(frames(x, nf, h) * np.hanning(nf), axis=1)) ** 2 + 1e-12
    freqs = np.fft.rfftfreq(nf, 1 / sr)
    band = (freqs > 100) & (freqs < 5000)
    m = min(len(F), len(voiced))
    vF = F[:m][voiced[:m]][:, band]
    flat = np.exp(np.mean(np.log(vF), 1)) / np.mean(vF, 1)
    # HNR from YIN aperiodicity (cmnd at tau ~ 1 - r)
    ap = np.clip(aper[voiced], 1e-4, 0.999)
    hnr = 10 * np.log10((1 - ap) / ap)
    # brightness / tilt
    allF = F[:m][act[:m]]
    p_lo = allF[:, (freqs > 100) & (freqs < 1000)].sum()
    p_hi = allF[:, (freqs > 2000) & (freqs < 6000)].sum()
    centroid = float((allF * freqs).sum() / allF.sum())
    # clicks: 64-sample frames of high-passed (>5.5 kHz) energy that jump >18 dB above local median
    sos = signal.butter(4, 5500, "hp", fs=sr, output="sos")
    hp = signal.sosfilt(sos, x)
    fe2 = db((frames(hp, 64, 32) ** 2).mean(1))
    med = signal.medfilt(fe2, 61)
    clicks = int(np.sum((fe2 - med > 18) & (fe2 > -60)))
    dur_active = (ia[-1] - ia[0] + 1) * 0.01 if len(ia) else 0.0
    out = {
        "f0_median_hz": float(np.nanmedian(f0)) if voiced.any() else float("nan"),
        "f0_range_st": float(np.percentile(st, 95) - np.percentile(st, 5)),
        "f0_std_st": float(np.std(st)),
        "voiced_ratio": float(voiced[act[: len(voiced)]].mean()) if act.any() else 0.0,
        "noise_floor_db": noise_floor,
        "flatness_voiced": float(np.median(flat)) if len(flat) else float("nan"),
        "hnr_db": float(np.median(hnr)) if len(hnr) else float("nan"),
        "tilt_db": float(10 * np.log10(p_hi / p_lo)),
        "centroid_hz": centroid,
        "clicks": clicks,
        "dur_active_s": dur_active,
    }
    if n_syllables:
        out["syll_per_s"] = n_syllables / max(dur_active, 1e-3)
    return out


# ---------------------------------------------------------------- loudness (BS.1770-4)
def k_weight(x: np.ndarray, sr: int) -> np.ndarray:
    # pre-filter (high shelf) + RLB high-pass, coefficients via bilinear design at any sr
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / sr)
    Vh = 10 ** (G / 20)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b1 = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a1 = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / sr)
    a0 = 1 + K / Q + K * K
    b2 = [1, -2, 1]
    a2 = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    y = signal.lfilter(b1, a1, x, axis=0)
    return signal.lfilter(b2, a2, y, axis=0)


def integrated_lufs(x: np.ndarray, sr: int) -> float:
    if x.ndim == 1:
        x = x[:, None]
    y = k_weight(x, sr)
    n, h = int(0.4 * sr), int(0.1 * sr)
    if len(y) < n:
        return -70.0
    cnt = 1 + (len(y) - n) // h
    ms = np.array([(y[i * h: i * h + n] ** 2).mean(0).sum() for i in range(cnt)])
    l = -0.691 + 10 * np.log10(np.maximum(ms, 1e-15))
    g = ms[l > -70]
    if not len(g):
        return -70.0
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = ms[(l > -70) & (l > rel)]
    return float(-0.691 + 10 * np.log10(g2.mean()))


def true_peak_db(x: np.ndarray, os=4) -> float:
    if x.ndim == 1:
        x = x[:, None]
    up = signal.resample_poly(x, os, 1, axis=0)
    return float(20 * np.log10(np.max(np.abs(up)) + 1e-12))


# ---------------------------------------------------------------- spectrogram PNG
def _cmap(v):
    """v in 0..1 -> RGB uint8 (dark navy -> red -> amber -> white), readable and monotonic."""
    stops = np.array([
        [0.00, 8, 8, 20], [0.25, 40, 20, 90], [0.50, 170, 30, 60],
        [0.72, 235, 110, 30], [0.90, 250, 210, 90], [1.00, 255, 255, 235]])
    out = np.zeros(v.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(v, stops[:, 0], stops[:, c + 1])
    return out.astype(np.uint8)


def spectrogram_png(x: np.ndarray, sr: int, path, title="", width=1600, height=420, fmax=None,
                    dyn=80.0, markers=None, t0=0.0, log_freq=True):
    """Render a log-frequency spectrogram with time/frequency grid. markers: list of (t, label)."""
    from PIL import Image, ImageDraw, ImageFont

    if x.ndim > 1:
        x = x.mean(1)
    fmax = fmax or sr / 2
    nfft = 2048 if sr > 30000 else 1024
    hop = max(1, int(len(x) / width))
    f, t, S = signal.stft(x, sr, nperseg=nfft, noverlap=max(0, nfft - hop), boundary=None, padded=False)
    P = db(np.abs(S) ** 2)
    top = np.percentile(P, 99.9)
    V = np.clip((P - (top - dyn)) / dyn, 0, 1)
    # map rows to log-frequency axis 40 Hz..fmax
    fmin = 40.0
    rows = np.geomspace(fmin, fmax, height) if log_freq else np.linspace(0, fmax, height)
    img = np.zeros((height, V.shape[1]))
    for c in range(V.shape[1]):
        img[:, c] = np.interp(rows, f, V[:, c])
    img = img[::-1]
    rgb = _cmap(img)
    im = Image.fromarray(rgb).resize((width, height), Image.BILINEAR)
    ml, mt, mb = 70, 30, 40
    canvas = Image.new("RGB", (width + ml + 10, height + mt + mb), (250, 250, 250))
    canvas.paste(im, (ml, mt))
    d = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
    except Exception:
        font = ImageFont.load_default()
    d.text((ml, 8), title, fill=(20, 20, 20), font=font)
    dur = len(x) / sr
    step = 1.0 if dur <= 12 else (2.0 if dur <= 45 else 5.0)
    tt = 0.0
    while tt <= dur + 1e-6:
        px = ml + int(tt / dur * width)
        d.line([(px, mt + height), (px, mt + height + 5)], fill=(60, 60, 60))
        d.text((px - 8, mt + height + 8), f"{tt + t0:g}", fill=(40, 40, 40), font=font)
        tt += step
    for fr in [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]:
        if fr > fmax or fr < fmin:
            continue
        py = mt + int((1 - (np.log(fr / fmin) / np.log(fmax / fmin) if log_freq else fr / fmax)) * (height - 1))
        d.line([(ml - 5, py), (ml, py)], fill=(60, 60, 60))
        d.text((4, py - 7), f"{fr if fr < 1000 else str(fr // 1000) + 'k'}", fill=(40, 40, 40), font=font)
    for (tm, lab) in (markers or []):
        px = ml + int((tm - t0) / dur * width)
        d.line([(px, mt), (px, mt + height)], fill=(120, 255, 120), width=1)
        d.text((px + 3, mt + 2), lab, fill=(150, 255, 150), font=font)
    canvas.save(path)
    return path


def waveform_png(tracks, sr, path, title="", width=1600, h_each=110, markers=None, spans=None):
    """Envelope overview of several mono/stereo tracks: list of (name, array)."""
    from PIL import Image, ImageDraw, ImageFont

    ml = 110
    H = h_each * len(tracks) + 50
    canvas = Image.new("RGB", (width + ml + 10, H), (250, 250, 250))
    d = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
    except Exception:
        font = ImageFont.load_default()
    d.text((ml, 6), title, fill=(20, 20, 20), font=font)
    n = max(len(a) for _, a in tracks)
    dur = n / sr
    for (t0, t1, lab, col) in (spans or []):
        d.rectangle([ml + t0 / dur * width, 26, ml + t1 / dur * width, H - 24], fill=col)
    for k, (name, a) in enumerate(tracks):
        m = a if a.ndim == 1 else np.abs(a).max(1)
        y0 = 26 + k * h_each
        cols = np.array_split(np.abs(m), width)
        mid = y0 + h_each // 2
        for i, c in enumerate(cols):
            pk = c.max() if len(c) else 0
            r = np.sqrt((c ** 2).mean()) if len(c) else 0
            # dB scale display: -48 dB .. 0
            hp = max(0.0, (20 * np.log10(pk + 1e-9) + 48) / 48) * (h_each / 2 - 4)
            hr = max(0.0, (20 * np.log10(r + 1e-9) + 48) / 48) * (h_each / 2 - 4)
            d.line([(ml + i, mid - hp), (ml + i, mid + hp)], fill=(150, 160, 190))
            d.line([(ml + i, mid - hr), (ml + i, mid + hr)], fill=(40, 50, 110))
        d.text((6, mid - 7), name, fill=(20, 20, 20), font=font)
        d.line([(ml, y0 + h_each), (ml + width, y0 + h_each)], fill=(210, 210, 210))
    t = 0
    while t <= dur + 1e-6:
        px = ml + int(t / dur * width)
        d.line([(px, H - 24), (px, H - 18)], fill=(60, 60, 60))
        d.text((px - 6, H - 17), f"{t:g}", fill=(40, 40, 40), font=font)
        t += 2
    for (tm, lab) in (markers or []):
        px = ml + int(tm / dur * width)
        d.line([(px, 26), (px, H - 24)], fill=(212, 1, 2), width=1)
        d.text((px + 2, 26), lab, fill=(212, 1, 2), font=font)
    canvas.save(path)
    return path
