"""Optional intelligibility check: transcribe WAV files with Whisper-small (sherpa-onnx, offline)
and print/return the word error rate against reference texts.

Not part of the build (heavy model, separate venv). Usage:
  python asr_check.py MODEL_DIR refs.json out.json
refs.json: {"path/to.wav": "texte de référence", ...}
Model: https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2
"""
import json, re, sys, unicodedata, wave
import numpy as np
import sherpa_onnx


def norm(t):
    t = unicodedata.normalize("NFKC", t.lower())
    t = t.replace("’", "'").replace("-", " ")
    t = re.sub(r"[^\w' ]+", " ", t)
    t = t.replace("'", "' ")
    return t.split()


def wer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    d = np.zeros((len(r) + 1, len(h) + 1), int)
    d[:, 0] = range(len(r) + 1)
    d[0, :] = range(len(h) + 1)
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (r[i - 1] != h[j - 1]))
    return d[-1, -1] / max(1, len(r))


def read_wav(p):
    with wave.open(p) as w:
        sr, n, ch, sw = w.getframerate(), w.getnframes(), w.getnchannels(), w.getsampwidth()
        b = w.readframes(n)
    if sw == 2:
        a = np.frombuffer(b, np.int16).astype(np.float32) / 32768
    elif sw == 3:
        u = np.frombuffer(b, np.uint8).reshape(-1, 3).astype(np.int32)
        a = ((u[:, 0] | (u[:, 1] << 8) | (u[:, 2] << 16)) << 8 >> 8).astype(np.float32) / 8388608
    else:
        a = np.frombuffer(b, np.int32).astype(np.float32) / 2147483648
    return a.reshape(-1, ch).mean(1), sr


if __name__ == "__main__":
    mdir, refs, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=f"{mdir}/small-encoder.int8.onnx", decoder=f"{mdir}/small-decoder.int8.onnx",
        tokens=f"{mdir}/small-tokens.txt", language="fr", task="transcribe", num_threads=2)
    res = {}
    for p, ref in refs.items():
        a, sr = read_wav(p)
        s = rec.create_stream()
        s.accept_waveform(sr, a)
        rec.decode_stream(s)
        hyp = s.result.text.strip()
        res[p] = {"ref": ref, "hyp": hyp, "wer": wer(ref, hyp)}
        print(f"{res[p]['wer']:.2f} | {hyp}")
    json.dump(res, open(out, "w"), ensure_ascii=False, indent=1)
