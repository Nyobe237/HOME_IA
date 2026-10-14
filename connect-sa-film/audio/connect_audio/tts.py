"""Deterministic offline French TTS (Mimic 3 VITS ONNX voices).

Differences with the minimal ``audio/mimic_fr.py``:
  * the two ``RandomNormalLike`` nodes of the VITS graph (stochastic duration predictor noise and
    prior noise) are replaced, in memory, by slices of two extra graph inputs fed with numpy noise
    from a seeded generator -> every take is bit-reproducible and the seed is a creative parameter;
  * pronunciation substitutions (CONNECT -> Connecte, SA -> ...) are applied on the *spoken* text only;
  * one cached ONNX session per voice.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

AUDIO_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = AUDIO_DIR / "models" / "fr_FR"

# Max sizes of the injected noise tensors (text tokens / acoustic frames). A 10 s line at
# 22.05 kHz with hop 256 is ~860 frames; generous margins.
MAX_TOKENS = 1024
MAX_FRAMES = 6000
LATENT_CHANNELS = 192

# Spoken-form substitutions (the written script keeps the normal spelling).
# gruut (fr_FR): "CONNECT" -> /kɔnɛk/ (final t dropped) ; "Connecte" -> /kɔnɛkt/.
# "SA" -> /sa/ (read as a word) ; "S A" -> /ɛs/ /a/ (two letter names) ; "èssa" -> /ɛsa/.
PRONUNCIATION = [
    (r"\bCONNECT\b", "Connecte"),
    (r"\bSA\b", "S A"),
]


def spoken_text(text: str, subs=PRONUNCIATION) -> str:
    out = text
    for pat, rep in subs:
        out = re.sub(pat, rep, out)
    # typographic narrow no-break spaces / apostrophes -> plain characters for the phonemizer
    out = out.replace(" ", " ").replace(" ", " ").replace("’", "'")
    return out


@dataclass
class Voice:
    model: str  # directory name in audio/models/fr_FR
    speaker: str | None = None
    label: str = ""
    gender: str = ""
    cfg: dict = field(default_factory=dict, repr=False)

    @property
    def key(self) -> str:
        return f"{self.model}:{self.speaker}" if self.speaker else self.model


VOICES = {
    "tom": Voice("tom_low", None, "Tom (tom_low)", "M"),
    "bernard": Voice("m-ailabs_low", "bernard", "Bernard (m-ailabs_low)", "M"),
    "zeckou": Voice("m-ailabs_low", "zeckou", "Zeckou (m-ailabs_low)", "M"),
    "gilles": Voice("m-ailabs_low", "gilles_g_le_blanc", "Gilles G. Le Blanc (m-ailabs_low)", "M"),
    "siwis": Voice("siwis_low", None, "Siwis (siwis_low)", "F"),
    "ezwa": Voice("m-ailabs_low", "ezwa", "Ezwa (m-ailabs_low)", "F"),
    "nadine": Voice("m-ailabs_low", "nadine_eckert_boulet", "Nadine Eckert-Boulet (m-ailabs_low)", "F"),
}

_SESSIONS: dict[str, tuple] = {}


def _patched_model_bytes(path: Path) -> bytes:
    """Replace RandomNormalLike(x) by Slice(noise_k, 0, Shape(x)) with noise_k a new graph input."""
    import onnx
    from onnx import TensorProto, helper

    m = onnx.load(str(path))
    g = m.graph
    rnd = [n for n in g.node if n.op_type == "RandomNormalLike"]
    assert len(rnd) == 2, f"unexpected graph ({len(rnd)} RandomNormalLike nodes)"
    names = ["noise_dp", "noise_z"]
    shapes = [[1, 2, MAX_TOKENS], [1, LATENT_CHANNELS, MAX_FRAMES]]
    zeros = helper.make_tensor("nz_starts", TensorProto.INT64, [3], [0, 0, 0])
    axes = helper.make_tensor("nz_axes", TensorProto.INT64, [3], [0, 1, 2])
    g.initializer.extend([zeros, axes])
    new_nodes = []
    for n in g.node:
        if n.op_type != "RandomNormalLike":
            new_nodes.append(n)
            continue
        k = rnd.index(n)
        g.input.append(helper.make_tensor_value_info(names[k], TensorProto.FLOAT, shapes[k]))
        shp = f"{names[k]}_shape"
        new_nodes.append(helper.make_node("Shape", [n.input[0]], [shp], name=f"{names[k]}_Shape"))
        new_nodes.append(
            helper.make_node("Slice", [names[k], "nz_starts", shp, "nz_axes"], [n.output[0]], name=f"{names[k]}_Slice")
        )
    del g.node[:]
    g.node.extend(new_nodes)
    return m.SerializeToString()


def load(voice: Voice):
    import onnxruntime as ort
    import phonemes2ids

    if voice.model in _SESSIONS:
        return _SESSIONS[voice.model]
    vdir = MODELS_DIR / voice.model
    cfg = json.loads((vdir / "config.json").read_text())
    p2id = phonemes2ids.load_phoneme_ids(open(vdir / "phonemes.txt", encoding="utf-8"))
    pmap = None
    if (vdir / "phoneme_map.txt").exists():
        pmap = phonemes2ids.utils.load_phoneme_map(open(vdir / "phoneme_map.txt", encoding="utf-8"))
    speakers = {}
    if (vdir / "speakers.txt").exists():
        for i, name in enumerate((vdir / "speakers.txt").read_text().split()):
            speakers[name] = i
    so = ort.SessionOptions()
    so.intra_op_num_threads = 2
    so.inter_op_num_threads = 1
    sess = ort.InferenceSession(_patched_model_bytes(vdir / "generator.onnx"), so, providers=["CPUExecutionProvider"])
    _SESSIONS[voice.model] = (cfg, p2id, pmap, speakers, sess)
    return _SESSIONS[voice.model]


def phonemize(text: str):
    """Return the list of sentences, each a list of (word, [phonemes])."""
    import gruut

    out = []
    for sentence in gruut.sentences(text, lang="fr_FR"):
        out.append([(w.text, list(w.phonemes or [])) for w in sentence if w.phonemes])
    return out


def text_to_ids(text: str, cfg, p2id, pmap):
    import phonemes2ids

    ph = cfg["phonemes"]
    seqs = []
    for sent in phonemize(text):
        word_ph = [p for _, p in sent]
        if not word_ph:
            continue
        ids = phonemes2ids.phonemes2ids(
            word_phonemes=word_ph, phoneme_to_id=p2id, pad=ph["pad"], bos=ph["bos"], eos=ph["eos"],
            auto_bos_eos=ph["auto_bos_eos"], blank=ph["blank"], blank_word=ph["blank_word"],
            blank_between=ph["blank_between"], blank_at_start=ph["blank_at_start"], blank_at_end=ph["blank_at_end"],
            simple_punctuation=ph["simple_punctuation"], punctuation_map=ph["punctuation_map"],
            separate=ph["separate"], separate_graphemes=ph["separate_graphemes"], separate_tones=ph["separate_tones"],
            tone_before=ph["tone_before"], phoneme_map=pmap or ph["phoneme_map"], fail_on_missing=False)
        seqs.append(ids)
    return seqs


def synth(text: str, voice: Voice, length_scale: float = 1.0, noise_scale: float = 0.667,
          noise_w: float = 0.8, seed: int = 0, sentence_gap: float = 0.18):
    """Synthesize *spoken* text (substitutions already applied). Returns (float32 mono, sr)."""
    cfg, p2id, pmap, speakers, sess = load(voice)
    sr = cfg["audio"]["sample_rate"]
    rng = np.random.default_rng(seed)
    chunks = []
    for i, ids in enumerate(text_to_ids(text, cfg, p2id, pmap)):
        assert len(ids) <= MAX_TOKENS
        inputs = {
            "input": np.array([ids], dtype=np.int64),
            "input_lengths": np.array([len(ids)], dtype=np.int64),
            "scales": np.array([noise_scale, length_scale, noise_w], dtype=np.float32),
            "noise_dp": rng.standard_normal((1, 2, MAX_TOKENS)).astype(np.float32),
            "noise_z": rng.standard_normal((1, LATENT_CHANNELS, MAX_FRAMES)).astype(np.float32),
        }
        if cfg["model"].get("n_speakers", 1) > 1:
            inputs["sid"] = np.array([speakers.get(voice.speaker, 0)], dtype=np.int64)
        a = sess.run(None, inputs)[0].squeeze().astype(np.float32)
        if i:
            chunks.append(np.zeros(int(sr * sentence_gap), np.float32))
        chunks.append(a)
    return np.concatenate(chunks) if chunks else np.zeros(1, np.float32), sr
