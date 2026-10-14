"""Voice-over: synthesis of every line, fitting inside its window, processing, placement."""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from . import analysis as an
from . import dsp
from . import tts

SR = dsp.SR
MARGIN = 0.08          # minimum margin kept inside each window (s)
LS_MIN, LS_MAX = 0.82, 1.08


@dataclass
class VoiceProfile:
    key: str                       # tts.VOICES key
    ls_pref: float = 1.0           # natural pace for this voice
    noise_scale: float = 0.667
    noise_w: float = 0.8
    seeds: tuple = (1, 2, 3, 4, 5, 6)
    hum_notches: tuple = ()        # (freq, q) list
    eq_lowmid_db: float = -2.0     # around 280 Hz
    eq_lowmid_hz: float = 280.0
    eq_warm_db: float = 1.0        # low shelf 150 Hz
    eq_presence_db: float = 2.5    # around 3.2 kHz
    eq_air_db: float = 2.5         # high shelf 9.5 kHz
    exciter_db: float = -60.0      # bandwidth-extension level (dB), only for 16 kHz-band models
    deess_thr_db: float = -32.0
    line_lufs: float = -19.0
    max_pause: float = 0.30        # longest internal pause kept (s)
    pitch_shift_st: float = 0.0


@dataclass
class Take:
    line_id: str
    text: str
    spoken: str
    seed: int
    ls: float
    audio22: np.ndarray = field(repr=False)
    sr: int
    duration: float
    metrics: dict
    score: float
    pauses_capped: float


# ---------------------------------------------------------------- editing helpers
def _env_db(x, sr, win=0.01):
    n = max(1, int(win * sr))
    k = np.ones(n) / n
    e = np.sqrt(np.convolve(x ** 2, k, mode="same") + 1e-14)
    return dsp.a2db(e)


def trim(x, sr, thr_db=-48.0, pre=0.012, post=0.045):
    e = _env_db(x, sr)
    ref = np.percentile(e, 99)
    idx = np.where(e > ref + thr_db)[0]
    if not len(idx):
        return x
    a = max(0, idx[0] - int(pre * sr))
    b = min(len(x), idx[-1] + int(post * sr))
    y = x[a:b].copy()
    return dsp.fade(y, 0.004, 0.025, sr)


def find_pauses(x, sr, thr_db=-42.0, min_len=0.09):
    e = _env_db(x, sr, 0.015)
    ref = np.percentile(e, 99)
    sil = e < ref + thr_db
    out = []
    i, n = 0, len(x)
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            if i > 0 and j < n and (j - i) / sr >= min_len:
                out.append((i, j))
            i = j
        else:
            i += 1
    return out


def cap_pauses(x, sr, max_pause):
    """Shorten internal pauses longer than max_pause (cut in the middle, 12 ms crossfade)."""
    pauses = find_pauses(x, sr)
    removed = 0.0
    y = x
    for (i, j) in reversed(pauses):
        L = j - i
        keep = int(max_pause * sr)
        if L <= keep:
            continue
        cut = L - keep
        c0 = i + (L - cut) // 2
        c1 = c0 + cut
        xf = int(0.012 * sr)
        a = y[:c0 + xf].copy()
        b = y[c1:].copy()
        r = np.linspace(0, 1, xf)
        a[-xf:] = a[-xf:] * (1 - r) + b[:xf] * r
        y = np.concatenate([a, b[xf:]])
        removed += cut / sr
    return y, removed


def _syllables(spoken):
    vowels = set("aeiouyøœəɛɔɑ")
    n = 0
    for sent in tts.phonemize(spoken):
        for _, ph in sent:
            n += sum(1 for p in ph if p and p[0] in vowels)
    return n


def _final_f0_slope(x, sr):
    """Semitone change of F0 over the last voiced 350 ms (positive = rising)."""
    f0, _, _ = an.yin_f0(x, sr)
    v = np.where(~np.isnan(f0))[0]
    if len(v) < 8:
        return 0.0
    tail = v[v >= v[-1] - 35]
    if len(tail) < 6:
        return 0.0
    st = 12 * np.log2(f0[tail] / np.nanmedian(f0[v]))
    k = max(2, len(st) // 3)
    return float(np.median(st[-k:]) - np.median(st[:k]))


# ---------------------------------------------------------------- synthesis + fitting
def synth_take(spoken, prof: VoiceProfile, seed, ls):
    v = tts.VOICES[prof.key]
    x, sr = tts.synth(spoken, v, length_scale=ls, noise_scale=prof.noise_scale, noise_w=prof.noise_w, seed=seed)
    x = x.astype(np.float64)
    x = x - np.mean(x)
    return trim(x, sr), sr


def fit_line(line: dict, prof: VoiceProfile, log=print) -> Take:
    text = line["text"]
    spoken = tts.spoken_text(text)
    w0, w1 = line["window"]
    avail = (w1 - w0) - 2 * MARGIN
    nsyl = _syllables(spoken)
    takes = []
    for seed in prof.seeds:
        ls = prof.ls_pref
        best = None
        for it in range(6):
            x, sr = synth_take(spoken, prof, seed, ls)
            x, rem = cap_pauses(x, sr, prof.max_pause)
            d = len(x) / sr
            if d <= avail:
                best = (ls, x, sr, d, rem)
                # there is room: we keep the preferred pace (no artificial slowing beyond it)
                break
            # shrink proportionally (length_scale ~ linear in duration), tighter pauses if needed
            new_ls = max(LS_MIN, ls * avail / d * 0.995)
            if new_ls >= ls - 1e-4:
                # already at the minimum pace: tighten pauses progressively
                x2, rem2 = cap_pauses(x, sr, 0.14)
                d2 = len(x2) / sr
                if d2 <= avail:
                    best = (ls, x2, sr, d2, rem + rem2)
                break
            ls = new_ls
        if best is None:
            log(f"   seed {seed}: does not fit ({d:.2f}s > {avail:.2f}s at ls={ls:.3f})")
            continue
        ls, x, sr, d, rem = best
        m = an.voice_metrics(x, sr, nsyl)
        slope = _final_f0_slope(x, sr)
        # score: natural pace, clean signal, lively but not erratic prosody, punctuation-aware ending
        pace = -abs(np.log(ls / prof.ls_pref)) * 12
        clean = 0.35 * m["hnr_db"] - 0.25 * m["clicks"] - 60 * m["flatness_voiced"]
        lively = -abs(m["f0_std_st"] - 3.6) * 0.8
        q = text.rstrip().endswith("?")
        ending = (np.clip(slope, -2, 5) * 0.5) if q else (np.clip(-slope, -3, 4) * 0.3)
        score = pace + clean + lively + ending
        takes.append(Take(line["id"], text, spoken, seed, ls, x, sr, d, dict(m, final_slope_st=slope), score, rem))
        log(f"   seed {seed}: ls={ls:.3f} dur={d:.2f}/{avail:.2f}s pauses-{rem:.2f}s hnr={m['hnr_db']:.1f} "
            f"f0sd={m['f0_std_st']:.2f} clicks={m['clicks']} slope={slope:+.1f} -> score {score:.2f}")
    if not takes:
        raise RuntimeError(f"line {line['id']} cannot fit in its window with ls >= {LS_MIN}")
    return max(takes, key=lambda t: t.score)


# ---------------------------------------------------------------- processing chain (48 kHz)
def exciter(x, sr=SR, level_db=-18.0):
    """Bandwidth extension for 16 kHz-band models: rectified 3-7.5 kHz band -> 7.8-14 kHz air."""
    band = dsp.bp(x, 3000, 7500, sr, 2)
    h = np.abs(band) - np.mean(np.abs(band))
    h = dsp.hp(h, 7800, sr, 4)
    h = dsp.lp(h, 14000, sr, 2)
    return x + dsp.db2a(level_db) * h


def process_line(x22, sr_in, prof: VoiceProfile):
    x = dsp.resample(x22, sr_in, SR)
    if prof.pitch_shift_st:
        # tiny formant-preserving-ish pitch shift is not available; kept at 0 (documented knob)
        pass
    x = dsp.hp(x, 80, SR, 4)
    for (f, q) in prof.hum_notches:
        x = dsp.filt(x, dsp.biquad("notch", f, SR, q))
    lufs = an.integrated_lufs(x, SR)
    x = x * dsp.db2a(prof.line_lufs - lufs)
    x = dsp.filt(
        x,
        dsp.biquad("lowshelf", 150, SR, 0.7, prof.eq_warm_db),
        dsp.biquad("peak", prof.eq_lowmid_hz, SR, 1.0, prof.eq_lowmid_db),
        dsp.biquad("peak", 3200, SR, 0.9, prof.eq_presence_db),
        dsp.biquad("highshelf", 9500, SR, 0.7, prof.eq_air_db),
    )
    if prof.exciter_db > -59:
        x = exciter(x, SR, prof.exciter_db)
    x, _ = dsp.deess(x, SR, threshold_db=prof.deess_thr_db)
    # light compression: ~3-5 dB on syllable peaks
    x, gr = dsp.compress(x, threshold_db=prof.line_lufs + 1.0, ratio=2.8, attack=0.008, release=0.12,
                         knee_db=8, sr=SR)
    lufs = an.integrated_lufs(x, SR)
    x = x * dsp.db2a(prof.line_lufs - lufs)
    return dsp.fade(x, 0.003, 0.02), float(np.percentile(gr[gr > 0], 90)) if np.any(gr > 0) else 0.0


def build_voice_track(lines, prof: VoiceProfile, duration=40.0, log=print, reverb_wet_db=-19.0):
    n = int(round(duration * SR))
    dry = np.zeros(n)
    placed = []
    for ln in lines:
        log(f" {ln['id']}  « {ln['text']} »  window {ln['window']}")
        tk = fit_line(ln, prof, log)
        y, gr90 = process_line(tk.audio22, tk.sr, prof)
        t0 = ln["window"][0] + MARGIN
        dsp.place(dry, y, t0)
        placed.append(dict(id=ln["id"], text=ln["text"], spoken=tk.spoken, seed=tk.seed, length_scale=round(tk.ls, 3),
                           start=round(t0, 3), end=round(t0 + len(y) / SR, 3), window=ln["window"],
                           pauses_shortened_s=round(tk.pauses_capped, 3), comp_gr90_db=round(gr90, 1),
                           f0_median_hz=round(tk.metrics["f0_median_hz"], 1), f0_std_st=round(tk.metrics["f0_std_st"], 2),
                           hnr_db=round(tk.metrics["hnr_db"], 1), final_slope_st=round(tk.metrics["final_slope_st"], 2),
                           syll_per_s=round(tk.metrics.get("syll_per_s", 0), 2)))
        log(f"   -> seed {tk.seed} ls {tk.ls:.3f}  {t0:.3f}-{t0 + len(y) / SR:.3f}s")
    # short, subtle room (stereo), voice stays centred
    ir = dsp.make_ir(rt60=0.42, predelay=0.011, length=0.7, seed=11, damp_hz=4500, width=0.8, lowcut=220)
    wet = dsp.convolve(dry, ir)[:n]
    wet = dsp.lp(wet, 7000, SR, 2)
    out = dsp.stereo(dry) / np.sqrt(2) + dsp.db2a(reverb_wet_db) * wet
    return out, placed
