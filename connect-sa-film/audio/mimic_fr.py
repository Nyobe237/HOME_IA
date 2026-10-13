"""Minimal Mimic3 (VITS/ONNX) French synthesis: text -> gruut phonemes -> ids -> wav."""
import json, sys, wave, argparse
from pathlib import Path
import numpy as np, onnxruntime as ort, gruut, phonemes2ids

def load_voice(vdir):
    vdir = Path(vdir)
    cfg = json.loads((vdir / "config.json").read_text())
    p2id = phonemes2ids.load_phoneme_ids(open(vdir / "phonemes.txt", encoding="utf-8"))
    pmap = None
    if (vdir / "phoneme_map.txt").exists():
        pmap = phonemes2ids.utils.load_phoneme_map(open(vdir / "phoneme_map.txt", encoding="utf-8"))
    speakers = {}
    if (vdir / "speakers.txt").exists():
        for i, l in enumerate((vdir / "speakers.txt").read_text().split()):
            speakers[l] = i
    sess = ort.InferenceSession(str(vdir / "generator.onnx"), providers=["CPUExecutionProvider"])
    return cfg, p2id, pmap, speakers, sess

def text_to_ids(text, cfg, p2id, pmap):
    ph = cfg["phonemes"]
    out = []
    for sentence in gruut.sentences(text, lang="fr_FR"):
        word_ph = [w.phonemes for w in sentence if w.phonemes]
        if not word_ph:
            continue
        ids = phonemes2ids.phonemes2ids(
            word_phonemes=word_ph, phoneme_to_id=p2id, pad=ph["pad"], bos=ph["bos"], eos=ph["eos"],
            auto_bos_eos=ph["auto_bos_eos"], blank=ph["blank"], blank_word=ph["blank_word"],
            blank_between=ph["blank_between"], blank_at_start=ph["blank_at_start"], blank_at_end=ph["blank_at_end"],
            simple_punctuation=ph["simple_punctuation"], punctuation_map=ph["punctuation_map"],
            separate=ph["separate"], separate_graphemes=ph["separate_graphemes"], separate_tones=ph["separate_tones"],
            tone_before=ph["tone_before"], phoneme_map=pmap or ph["phoneme_map"], fail_on_missing=False)
        out.append((ids, word_ph))
    return out

def synth(text, vdir, speaker=None, length_scale=None, noise_scale=None, noise_w=None):
    cfg, p2id, pmap, speakers, sess = load_voice(vdir)
    inf = cfg.get("inference", {})
    ls = length_scale if length_scale is not None else inf.get("length_scale", 1.0)
    ns = noise_scale if noise_scale is not None else inf.get("noise_scale", 0.667)
    nw = noise_w if noise_w is not None else inf.get("noise_w", 0.8)
    sr = cfg["audio"]["sample_rate"]
    chunks = []
    for ids, _ in text_to_ids(text, cfg, p2id, pmap):
        inputs = {"input": np.array([ids], dtype=np.int64), "input_lengths": np.array([len(ids)], dtype=np.int64),
                  "scales": np.array([ns, ls, nw], dtype=np.float32)}
        if cfg["model"].get("n_speakers", 1) > 1:
            sid = speakers.get(speaker, 0) if isinstance(speaker, str) else int(speaker or 0)
            inputs["sid"] = np.array([sid], dtype=np.int64)
        a = sess.run(None, inputs)[0].squeeze().astype(np.float32)
        chunks.append(a)
    return chunks, sr

def write_wav(path, audio, sr):
    a = np.clip(audio, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((a * 32767).astype(np.int16).tobytes())

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("voice"); ap.add_argument("text"); ap.add_argument("out")
    ap.add_argument("--speaker"); ap.add_argument("--length", type=float); ap.add_argument("--noise", type=float); ap.add_argument("--noisew", type=float)
    a = ap.parse_args()
    chunks, sr = synth(a.text, a.voice, a.speaker, a.length, a.noise, a.noisew)
    gap = np.zeros(int(sr * 0.25), dtype=np.float32)
    audio = np.concatenate([np.concatenate([c, gap]) for c in chunks])
    peak = np.abs(audio).max() or 1
    write_wav(a.out, audio / peak * 0.9, sr)
    print(a.out, len(audio) / sr, "s")
