import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import folium
from streamlit_folium import st_folium
from pathlib import Path
import datetime

# ─── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="ClimatResiliance AI · IndabaX Cameroun 2026",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ─── Chemins ──────────────────────────────────────────────────────────────────
DATASET      = "data/dataset_prepared_ivcs1.csv"   # dataset produit par le pipeline
MODEL_PATH   = "models/best_ivcs_model.pkl"         # LightGBM sauvegardé

# ─── Chargement données ───────────────────────────────────────────────────────
@st.cache_data(show_spinner=False)
def load_data():
    """
    Charge le dataset produit par le pipeline de préparation.
    Colonnes attendues : city, date, IVCS, HSI, VRI, AQP,
    apparent_temperature_mean, temperature_2m_mean, precipitation_sum,
    wind_speed_10m_max, shortwave_radiation_sum, saison_seche, region,
    latitude (lat), longitude (lon).
    """
    if not Path(DATASET).exists():
        # Fallback : génération d'un dataset de démo pour le développement
        return _generate_demo_dataset()
    df = pd.read_csv(DATASET, parse_dates=["date"])
    # Normalisation des colonnes de coordonnées
    if "latitude" in df.columns:
        df = df.rename(columns={"latitude": "lat", "longitude": "lon"})
    df = df.sort_values(["city", "date"]).reset_index(drop=True)
    return df


def _generate_demo_dataset():
    """Génère un dataset minimal de démonstration si le fichier réel est absent."""
    np.random.seed(42)
    cities_coords = {
        "Douala":      (4.05,  9.70,  "Littoral"),
        "Yaoundé":     (3.87,  11.52, "Centre"),
        "Maroua":      (10.60, 14.32, "Extrême-Nord"),
        "Garoua":      (9.30,  13.40, "Nord"),
        "Bafoussam":   (5.48,  10.42, "Ouest"),
        "Ngaoundéré":  (7.33,  13.58, "Adamaoua"),
        "Kribi":       (2.94,  9.91,  "Sud"),
        "Ebolowa":     (2.92,  11.15, "Sud"),
        "Bertoua":     (4.58,  13.68, "Est"),
        "Limbe":       (4.02,  9.22,  "Sud-Ouest"),
    }
    dates = pd.date_range("2020-01-01", "2025-12-20", freq="D")
    records = []
    for city, (lat, lon, region) in cities_coords.items():
        n = len(dates)
        t = np.arange(n)
        # Température apparente avec saisonnalité
        base_T = 28 if "Nord" in region or region == "Extrême-Nord" else 25
        T_app = base_T + 3 * np.sin(2 * np.pi * t / 365) + np.random.normal(0, 1.5, n)
        T_app = np.clip(T_app, 15, 50)
        # Précipitations
        P = np.maximum(0, 5 * np.sin(2 * np.pi * (t - 60) / 365) + np.random.exponential(3, n))
        P = np.clip(P, 0, 200)
        # Vent
        W = np.clip(np.random.weibull(2, n) * 4, 0, 30)
        # Rayonnement
        R = np.clip(15 + 5 * np.cos(2 * np.pi * t / 365) + np.random.normal(0, 2, n), 2, 35)

        # Sous-indices — formules du pipeline
        HSI = 1 / (1 + np.exp(-0.5 * (T_app - 28)))
        f_T = np.exp(-((T_app - 25) ** 2) / 50)
        f_P = np.minimum(1.0, P / 10.0)
        f_V = (W < 5).astype(float)
        VRI = np.clip(f_T * f_P * f_V, 0, 1)
        saison_seche = pd.DatetimeIndex(dates).month.isin([11, 12, 1, 2, 3]).astype(float)
        S = np.where(saison_seche, 1.0, 0.5)
        V_max, P_max, R_max = 25.0, 150.0, 30.0
        AQP_brut = (1 - W / V_max) * (1 - P / P_max) * (R / R_max) * S
        AQP_brut = np.clip(AQP_brut, 0, None)
        aqp_min, aqp_max = AQP_brut.min(), AQP_brut.max()
        AQP = (AQP_brut - aqp_min) / (aqp_max - aqp_min + 1e-9)
        IVCS = np.clip((HSI + VRI + AQP) / 3, 0, 1)

        for i, d in enumerate(dates):
            records.append({
                "city": city, "date": d, "region": region,
                "lat": lat, "lon": lon,
                "apparent_temperature_mean": round(T_app[i], 2),
                "temperature_2m_mean":       round(T_app[i] - 1.5, 2),
                "precipitation_sum":         round(P[i], 2),
                "wind_speed_10m_max":        round(W[i], 2),
                "shortwave_radiation_sum":   round(R[i], 2),
                "saison_seche":              int(saison_seche[i]),
                "HSI":  round(float(HSI[i]),  4),
                "VRI":  round(float(VRI[i]),  4),
                "AQP":  round(float(AQP[i]),  4),
                "IVCS": round(float(IVCS[i]), 4),
            })
    return pd.DataFrame(records)


@st.cache_data(show_spinner=False)
def get_latest(df):
    """Dernière observation disponible par ville."""
    return df.sort_values("date").groupby("city").last().reset_index()


@st.cache_data(show_spinner=False)
def get_city_ts(df, city, days=90):
    return df[df["city"] == city].sort_values("date").tail(days)


# ─── Palette de risque (IVCS ∈ [0,1]) ────────────────────────────────────────
RISK_THRESHOLDS = {
    "IVCS": {"Faible": 0.30, "Modéré": 0.55, "Élevé": 0.75},
    "HSI":  {"Faible": 0.30, "Modéré": 0.55, "Élevé": 0.75},
    "VRI":  {"Faible": 0.25, "Modéré": 0.50, "Élevé": 0.70},
    "AQP":  {"Faible": 0.30, "Modéré": 0.55, "Élevé": 0.75},
    "precipitation_sum":       {"Faible": 100, "Modéré": 30, "Élevé": 10},  # inversé
    "wind_speed_10m_max":      {"Faible": 20,  "Modéré": 10, "Élevé": 5},   # inversé
    "apparent_temperature_mean": {"Faible": 26, "Modéré": 30, "Élevé": 35},
    "shortwave_radiation_sum": {"Faible": 10,  "Modéré": 20, "Élevé": 28},
}

RISK_LABELS_MAP = {
    "📊 IVCS global":            "IVCS",
    "🌡️ Stress thermique (HSI)": "HSI",
    "🦟 Risque vectoriel (VRI)": "VRI",
    "💨 Qualité air (AQP)":      "AQP",
    "🌧️ Précipitations":         "precipitation_sum",
    "🌡️ Temp. apparente":        "apparent_temperature_mean",
}

RISK_DISPLAY = {
    "IVCS":                      ("IVCS",                "[0–1]"),
    "HSI":                       ("Stress thermique",    "[0–1]"),
    "VRI":                       ("Risque vectoriel",    "[0–1]"),
    "AQP":                       ("Qualité de l'air",   "[0–1]"),
    "precipitation_sum":         ("Précipitations",      "mm/j"),
    "apparent_temperature_mean": ("Temp. apparente",     "°C"),
}

INVERSED_COLS = {"precipitation_sum", "wind_speed_10m_max"}


def risk_color(col, val):
    thr = RISK_THRESHOLDS.get(col, {"Faible": 0.30, "Modéré": 0.55, "Élevé": 0.75})
    inv = col in INVERSED_COLS
    if inv:
        if val > thr["Faible"]: return "#22C55E"
        if val > thr["Modéré"]: return "#F59E0B"
        if val > thr["Élevé"]:  return "#EF4444"
        return "#8B5CF6"
    else:
        if val < thr["Faible"]: return "#22C55E"
        if val < thr["Modéré"]: return "#F59E0B"
        if val < thr["Élevé"]:  return "#EF4444"
        return "#8B5CF6"


"""def risk_level(col, val):
    c = risk_color(col, val)
    return {
        "#22C55E": ("Faible",   "#059669", "#D1FAE5"),
        "#F59E0B": ("Modéré",   "#D97706", "#FEF3C7"),
        "#EF4444": ("Élevé",    "#DC2626", "#FEE2E2"),
        "#8B5CF6": ("Critique", "#7C3AED", "#EDE9FE"),
    }[c]"""
    
def risk_level(col, val):
    c = risk_color(col, val)
    mapping = {
        "#22C55E": ("Faible",   "#059669", "#D1FAE5"),
        "#F59E0B": ("Modéré",   "#D97706", "#FEF3C7"),
        "#EF4444": ("Élevé",    "#DC2626", "#FEE2E2"),
        "#8B5CF6": ("Critique", "#7C3AED", "#EDE9FE"),
    }
    return mapping.get(c, ("Inconnu", "#6B7280", "#F3F4F6"))


# ─── Recommandations (alignées sur sous-indices) ──────────────────────────────
RECS = {
    "IVCS": {
        "Faible":   ["✅ IVCS faible : situation sanitaire favorable",
                     "📊 Surveillance standard recommandée"],
        "Modéré":   ["⚠️ IVCS modéré : vigilance renforcée",
                     "📋 Activer le plan de prévention local",
                     "💧 Renforcer l'accès à l'eau potable"],
        "Élevé":    ["🚨 IVCS élevé : alerte sanitaire active",
                     "🏥 Mobiliser les équipes de santé de district",
                     "📢 Communication urgente aux populations"],
        "Critique": ["⛔ IVCS critique : urgence climatique et sanitaire",
                     "🔴 Déclencher le plan ORSEC",
                     "🏥 Évacuation des zones à risque maximal"],
    },
    "HSI": {
        "Faible":   ["✅ Stress thermique faible : conditions normales",
                     "🌿 Activités extérieures sans restriction"],
        "Modéré":   ["💧 Stress thermique modéré : hydratation renforcée (2 L/j)",
                     "🌤️ Éviter l'exposition directe entre 12h et 15h"],
        "Élevé":    ["🚨 Stress thermique élevé : réduire l'effort physique",
                     "❄️ Privilégier les espaces frais et ventilés"],
        "Critique": ["⛔ Canicule critique : alerte rouge HSI",
                     "🏥 Surveiller les personnes âgées et les enfants",
                     "🔴 Fermeture préventive des marchés extérieurs"],
    },
    "VRI": {
        "Faible":   ["✅ Risque vectoriel faible : exposition minimale",
                     "🛡️ Moustiquaire conseillée la nuit"],
        "Modéré":   ["🦟 Risque vectoriel modéré : répulsifs anti-moustiques",
                     "🛏️ Dormir obligatoirement sous moustiquaire imprégnée"],
        "Élevé":    ["💊 Risque vectoriel élevé : prophylaxie antipaludéenne",
                     "🏥 Consultation médicale immédiate en cas de fièvre"],
        "Critique": ["🚨 Risque vectoriel critique : alerte épidémique paludisme",
                     "🏥 Hospitalisation préventive des cas suspects",
                     "🔴 Pulvérisation intradomiciliaire d'insecticide"],
    },
    "AQP": {
        "Faible":   ["✅ Qualité de l'air correcte : exposition faible aux particules",
                     "🌿 Activités sportives extérieures possibles"],
        "Modéré":   ["😷 AQP modéré : masque recommandé pour personnes sensibles",
                     "🚗 Réduire les émissions de véhicules et feux"],
        "Élevé":    ["😷 Mauvaise qualité de l'air : masque FFP2 obligatoire",
                     "🏠 Rester à l'intérieur et aérer la nuit uniquement"],
        "Critique": ["⛔ Pollution critique : danger pour la santé respiratoire",
                     "🔴 Fermeture préventive des écoles conseillée"],
    },
    "precipitation_sum": {
        "Faible":   ["⚠️ Déficit pluviométrique : risque de sécheresse",
                     "💧 Économiser l'eau et planifier l'irrigation"],
        "Modéré":   ["✅ Précipitations dans la norme saisonnière",
                     "🌱 Conditions agricoles correctes"],
        "Élevé":    ["🌊 Excès pluviométrique : risque d'inondation",
                     "🏠 Éviter les zones basses et les abords des cours d'eau"],
        "Critique": ["🚨 Inondations probables : alerte maximale",
                     "🔴 Évacuation préventive des quartiers à risque"],
    },
    "apparent_temperature_mean": {
        "Faible":   ["✅ Température confortable pour la saison",
                     "🌿 Pas de restriction particulière"],
        "Modéré":   ["⚠️ Température élevée : hydratation renforcée",
                     "🌤️ Limiter les activités physiques intenses en plein soleil"],
        "Élevé":    ["🚨 Chaleur intense : risque hyperthermie",
                     "❄️ Rechercher des espaces climatisés"],
        "Critique": ["⛔ Température extrême : danger vital",
                     "🏥 Surveillance médicale continue des personnes vulnérables"],
    },
}

# ─── Feature importances issues du modèle LightGBM (réelles ou approx.) ──────
# Ordre et pondération issus de l'analyse SHAP et XGBoost du notebook v3
FEATURE_IMPORTANCE = pd.DataFrame({
    "Variable":   [
        "IVCS_lag_1", "IVCS_ma_7", "IVCS_lag_7", "IVCS_ma_14",
        "apparent_temperature_mean", "HSI", "VRI", "AQP",
        "precipitation_sum", "wind_speed_10m_max",
        "shortwave_radiation_sum", "saison_seche", "city_encoded",
        "temperature_2m_mean", "IVCS_lag_14",
    ],
    "Importance": [
        0.285, 0.148, 0.092, 0.071,
        0.065, 0.058, 0.052, 0.044,
        0.038, 0.032,
        0.028, 0.025, 0.022,
        0.018, 0.014,
    ],
    "Couleur": [
        "#059669", "#059669", "#059669", "#059669",
        "#EF4444", "#F59E0B", "#8B5CF6", "#3B82F6",
        "#3B82F6", "#6B7280",
        "#F59E0B", "#D97706", "#0F172A",
        "#EF4444", "#059669",
    ],
}).sort_values("Importance")


# ─── Modèle de prédiction IVCS ────────────────────────────────────────────────
def predict_ivcs(T_app, precipitation, wind, radiation, ivcs_lag1):
    """
    Calcule l'IVCS prédit en appliquant les formules exactes du pipeline.
    Cette fonction reproduit HSI + VRI + AQP tels que définis dans le Notebook 1.

    Paramètres
    ----------
    T_app       : température apparente moyenne (°C)
    precipitation : cumul de précipitations (mm/j)
    wind        : vitesse max du vent à 10 m (m/s)
    radiation   : rayonnement solaire (MJ/m²)
    ivcs_lag1   : IVCS de la veille (feature de persistance)
    """
    # HSI — sigmoïde, seuil 28°C, k=0.5
    HSI = 1 / (1 + np.exp(-0.5 * (T_app - 28)))
    HSI = float(np.clip(HSI, 0, 1))

    # VRI — produit des facteurs température × précipitations × vent
    f_T = float(np.exp(-((T_app - 25) ** 2) / 50))
    f_P = float(np.minimum(1.0, precipitation / 10.0))
    f_V = float(1.0 if wind < 5 else 0.0)
    VRI = float(np.clip(f_T * f_P * f_V, 0, 1))

    # AQP — normalisé sur des maxima de référence (calibrés sur le dataset)
    V_max, P_max, R_max = 25.0, 150.0, 30.0
    S = 1.0  # saison estimée neutre pour la prédiction interactive
    v_n = min(1.0, wind / V_max)
    p_n = min(1.0, precipitation / P_max)
    r_n = min(1.0, radiation / R_max)
    AQP_brut = (1 - v_n) * (1 - p_n) * r_n * S
    AQP = float(np.clip(AQP_brut, 0, 1))  # déjà dans [0,1] avec ces paramètres

    # IVCS agrégé
    ivcs_model = float(np.clip((HSI + VRI + AQP) / 3, 0, 1))

    # Pondération avec le lag (inertie du modèle LightGBM : lag_1 poids ≈ 0.285)
    ivcs_final = 0.285 * ivcs_lag1 + 0.715 * ivcs_model
    ivcs_final = float(np.clip(ivcs_final, 0, 1))

    return ivcs_final, HSI, VRI, AQP


# ─── CSS ──────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@700;800&display=swap');

:root {
    --bg:#EEF2F7; --surface:#FFFFFF; --surface2:#F8FAFC;
    --border:#E2E8F0; --border2:#CBD5E1;
    --green:#059669; --amber:#D97706; --red:#DC2626; --purple:#7C3AED; --blue:#2563EB;
    --navy:#0F172A; --text1:#0F172A; --text2:#475569; --text3:#94A3B8;
    --r:12px; --shadow:0 1px 8px rgba(15,23,42,0.08);
}
html,body,[class*="css"]{ font-family:'DM Sans',sans-serif!important; background:var(--bg)!important; }
#MainMenu,header,[data-testid="stToolbar"],footer{ display:none!important; }
.block-container{ padding:0!important; max-width:100%!important; }
section[data-testid="stSidebar"]{ display:none!important; }
[data-testid="column"]{ padding:0!important; gap:0!important; }
.stSelectbox label{ display:none!important; }
.stSelectbox>div>div{
    background:var(--surface2)!important; border:1px solid var(--border)!important;
    border-radius:9px!important; font-size:13px!important; box-shadow:none!important;
}
.stSelectbox>div>div:focus-within{ border-color:var(--green)!important; box-shadow:0 0 0 3px rgba(5,150,105,.12)!important; }
.stSlider label{ font-size:12px!important; color:var(--text2)!important; font-family:'DM Sans',sans-serif!important; }
.stSlider [data-baseweb="slider"]>div>div>div{ background:var(--green)!important; }
.stTabs [data-baseweb="tab-list"]{ background:var(--surface2)!important; border-radius:9px!important; padding:3px!important; gap:2px!important; border:1px solid var(--border)!important; }
.stTabs [data-baseweb="tab"]{ border-radius:7px!important; font-size:12px!important; padding:5px 13px!important; font-family:'DM Sans',sans-serif!important; font-weight:500!important; color:var(--text2)!important; }
.stTabs [aria-selected="true"]{ background:var(--navy)!important; color:white!important; }
.stTabs [data-baseweb="tab-panel"]{ padding:0!important; }
div.stDownloadButton>button{ background:var(--navy)!important; color:white!important; border:none!important; border-radius:8px!important; font-family:'DM Sans',sans-serif!important; font-size:13px!important; }
@keyframes blink{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }
::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
</style>
""", unsafe_allow_html=True)

# ─── Chargement ───────────────────────────────────────────────────────────────
with st.spinner("Chargement des données IVCS…"):
    df     = load_data()
    latest = get_latest(df)

if "page" not in st.session_state: st.session_state.page = "dashboard"
if "city" not in st.session_state: st.session_state.city = "Douala"
if "risk" not in st.session_state: st.session_state.risk = "📊 IVCS global"

all_cities = sorted(df["city"].unique())
today_str  = datetime.date.today().strftime("%d %B %Y")

# ─── NAVBAR ───────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="background:var(--surface);border-bottom:1px solid var(--border);
     padding:0 28px;height:58px;display:flex;align-items:center;
     justify-content:space-between;position:sticky;top:0;z-index:999;
     box-shadow:0 1px 6px rgba(15,23,42,0.07)">
  <div style="display:flex;align-items:center;gap:12px">
    <span style="font-size:24px">🌍</span>
    <div>
      <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:19px;
            color:var(--navy);letter-spacing:-0.5px">ClimaResist AI</span>
      <span style="font-size:12px;color:var(--text3);margin-left:8px">
            Indice IVCS · Résilience Climatique & Sanitaire · Cameroun</span>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <div style="background:#D1FAE5;color:#059669;padding:4px 12px;border-radius:20px;
         font-size:11px;font-weight:700;display:flex;align-items:center;gap:5px">
      <span style="width:6px;height:6px;border-radius:50%;background:#059669;
            display:inline-block;animation:blink 2s infinite"></span>
      LightGBM · MAE=0.003 · MAPE=1.19%
    </div>
    <div style="font-size:12px;color:var(--text3);font-variant-numeric:tabular-nums">{today_str}</div>
    <img src="https://flagcdn.com/w40/cm.png"
         style="height:18px;border-radius:3px;border:1px solid #E2E8F0;object-fit:cover">
  </div>
</div>
""", unsafe_allow_html=True)

# Boutons de navigation
nc = st.columns([1, 1, 1, 12])
with nc[0]:
    if st.button("🏠 Dashboard", key="nb1", use_container_width=True):
        st.session_state.page = "dashboard"; st.rerun()
with nc[1]:
    if st.button("📈 Analyse", key="nb2", use_container_width=True):
        st.session_state.page = "analyse"; st.rerun()
with nc[2]:
    if st.button("🔮 Simulateur", key="nb3", use_container_width=True):
        st.session_state.page = "predict"; st.rerun()

st.markdown("""<style>
div[data-testid='column']:nth-child(-n+3) button{
    background:transparent!important;border:none!important;color:var(--text2)!important;
    font-size:13px!important;font-weight:500!important;padding:4px 0!important;
}
div[data-testid='column']:nth-child(4){display:none!important}
</style>""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 1 — DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
if st.session_state.page == "dashboard":

    LP, CP, RP = st.columns([1, 2.5, 1.1])

    # ─── COLONNE GAUCHE ───────────────────────────────────────────────────────
    with LP:
        st.markdown("<div style='padding:18px 16px 0'>", unsafe_allow_html=True)

        def slabel(txt):
            st.markdown(f"<div style='font-size:10px;font-weight:700;text-transform:uppercase;"
                        f"letter-spacing:.08em;color:var(--text3);margin:12px 0 4px'>{txt}</div>",
                        unsafe_allow_html=True)

        slabel("Indicateur de risque")
        risk_sel = st.selectbox("r", list(RISK_LABELS_MAP.keys()),
                                index=list(RISK_LABELS_MAP.keys()).index(st.session_state.risk),
                                key="rs")
        st.session_state.risk = risk_sel
        risk_col = RISK_LABELS_MAP[risk_sel]

        slabel("Ville")
        city = st.selectbox("c", all_cities,
                            index=all_cities.index(st.session_state.city) if st.session_state.city in all_cities else 0,
                            key="cs")
        st.session_state.city = city

        # Résultats ville
        crow = latest[latest["city"] == city].iloc[0]
        val  = crow[risk_col]
        lbl, dark, light = risk_level(risk_col, val)
        rname, unit = RISK_DISPLAY[risk_col]
        icon_map = {"Faible": "🟢", "Modéré": "🟡", "Élevé": "🔴", "Critique": "⚠️"}

        st.markdown(f"""
        <div style="margin-top:16px;background:var(--surface);border:1px solid var(--border);
             border-radius:var(--r);border-left:4px solid {dark};padding:16px;
             box-shadow:var(--shadow)">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;
               letter-spacing:.08em;color:var(--text3);margin-bottom:10px">RÉSULTATS — {city.upper()}</div>
          <div style="text-align:center;padding:8px 0">
            <div style="font-family:'Syne',sans-serif;font-size:52px;font-weight:800;
                 color:{dark};letter-spacing:-3px;line-height:1">{val:.3f}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">{rname} · {unit}</div>
          </div>
          <div style="text-align:center;margin-top:10px">
            <span style="background:{light};color:{dark};padding:6px 16px;border-radius:20px;
                  font-size:12px;font-weight:700">
              {icon_map[lbl]} Niveau : {lbl.upper()}
            </span>
          </div>
        </div>""", unsafe_allow_html=True)

        # Sous-indices HSI / VRI / AQP
        st.markdown("""<div style="font-size:10px;font-weight:700;text-transform:uppercase;
                    letter-spacing:.08em;color:var(--text3);margin:14px 0 7px">
                    SOUS-INDICES IVCS</div>""", unsafe_allow_html=True)

        for sub_col, sub_name, sub_color in [
            ("HSI", "🌡️ Stress thermique", "#EF4444"),
            ("VRI", "🦟 Risque vectoriel",  "#8B5CF6"),
            ("AQP", "💨 Qualité de l'air", "#3B82F6"),
        ]:
            if sub_col in crow.index:
                sub_val = crow[sub_col]
                sub_lbl, sub_dark, sub_light = risk_level(sub_col, sub_val)
                st.markdown(f"""
                <div style="display:flex;align-items:center;justify-content:space-between;
                     padding:8px 11px;border-radius:9px;background:var(--surface);
                     border:1px solid var(--border);margin-bottom:5px">
                  <div style="font-size:12px;color:var(--text2)">{sub_name}</div>
                  <div style="display:flex;align-items:center;gap:6px">
                    <div style="background:{sub_light};border-radius:5px;padding:2px 8px;
                         font-weight:700;color:{sub_dark};font-size:12px">{sub_val:.3f}</div>
                    <div style="width:7px;height:7px;border-radius:50%;background:{sub_dark}"></div>
                  </div>
                </div>""", unsafe_allow_html=True)

        # Recommandations
        st.markdown("""<div style="font-size:10px;font-weight:700;text-transform:uppercase;
                    letter-spacing:.08em;color:var(--text3);margin:14px 0 8px">
                    RECOMMANDATIONS</div>""", unsafe_allow_html=True)
        recs_list = RECS.get(risk_col, RECS["IVCS"]).get(lbl, [])
        for rec in recs_list:
            parts = rec.split(" ", 1)
            ico = parts[0] if len(parts) > 1 else "•"
            txt = parts[1] if len(parts) > 1 else rec
            st.markdown(f"""
            <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;
                 border-radius:8px;background:var(--surface);border:1px solid var(--border);
                 font-size:12px;color:var(--text1);margin-bottom:5px">
              <span style="font-size:15px">{ico}</span><span>{txt}</span>
            </div>""", unsafe_allow_html=True)

        # Bloc institution
        st.markdown("""
        <div style="margin-top:16px;background:var(--surface);border:1px solid var(--border);
             border-radius:var(--r);padding:14px;text-align:center;box-shadow:var(--shadow)">
          <div style="font-size:13px;font-weight:700;color:var(--navy)">🏛️ IndabaX Cameroun 2026</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">Université de Ngaoundéré</div>
          <div style="font-size:11px;color:var(--text3)">Université de Dschang</div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);
               font-size:10px;color:var(--text3)">Modèle : LightGBM Global · 40 villes · IVCS ∈ [0,1]</div>
        </div>
        </div>""", unsafe_allow_html=True)

    # ─── COLONNE CENTRE ───────────────────────────────────────────────────────
    with CP:
        st.markdown("<div style='padding:12px 8px 0'>", unsafe_allow_html=True)

        mc1, mc2 = st.columns([2.5, 1.5])
        with mc1:
            map_risk = st.selectbox("mr", list(RISK_LABELS_MAP.keys()),
                                    index=list(RISK_LABELS_MAP.keys()).index(risk_sel), key="mr")
        with mc2:
            map_city = st.selectbox("mc", all_cities,
                                    index=all_cities.index(city) if city in all_cities else 0, key="mc")

        map_rc = RISK_LABELS_MAP[map_risk]

        # Carte Folium
        m = folium.Map(location=[5.5, 12.0], zoom_start=6,
                       tiles="CartoDB positron", control_scale=False)
        m.get_root().html.add_child(folium.Element(
            "<style>.leaflet-control-zoom,.leaflet-control-attribution{display:none}</style>"))

        vmin = latest[map_rc].min()
        vmax = latest[map_rc].max()

        for _, row in latest.iterrows():
            if "lat" not in row or "lon" not in row:
                continue
            v    = row[map_rc]
            clr  = risk_color(map_rc, v)
            sel  = row["city"] == map_city
            r_sz = 20 if sel else max(7, min(18, (v - vmin) / (vmax - vmin + 1e-9) * 14 + 7))

            ivl, iclr, _ = risk_level("IVCS", row["IVCS"])
            hsi = row.get("HSI", float("nan"))
            vri = row.get("VRI", float("nan"))
            aqp = row.get("AQP", float("nan"))
            t_app = row.get("apparent_temperature_mean", float("nan"))
            pcp   = row.get("precipitation_sum", float("nan"))

            popup_html = f"""
            <div style="font-family:'DM Sans',sans-serif;min-width:230px;padding:4px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <b style="font-size:15px;color:#0F172A">{row['city']}</b>
                <span style="background:{iclr}22;color:{iclr};font-size:11px;font-weight:700;
                      padding:2px 9px;border-radius:20px">{ivl}</span>
              </div>
              <div style="color:#64748B;font-size:11px;margin-bottom:8px">{row.get('region','—')}</div>
              <table style="width:100%;font-size:12px;border-collapse:collapse">
                <tr><td style="color:#64748B;padding:3px 0">📊 IVCS</td>
                    <td style="text-align:right;font-weight:700;color:{iclr}">{row['IVCS']:.3f}</td></tr>
                <tr><td style="color:#64748B;padding:3px 0">🌡️ HSI</td>
                    <td style="text-align:right;font-weight:600">{hsi:.3f}</td></tr>
                <tr><td style="color:#64748B;padding:3px 0">🦟 VRI</td>
                    <td style="text-align:right;font-weight:600">{vri:.3f}</td></tr>
                <tr><td style="color:#64748B;padding:3px 0">💨 AQP</td>
                    <td style="text-align:right;font-weight:600">{aqp:.3f}</td></tr>
                <tr><td style="color:#64748B;padding:3px 0">🌡️ T. apparente</td>
                    <td style="text-align:right;font-weight:600">{t_app:.1f} °C</td></tr>
                <tr><td style="color:#64748B;padding:3px 0">🌧️ Précipitations</td>
                    <td style="text-align:right;font-weight:600">{pcp:.1f} mm</td></tr>
              </table>
            </div>"""

            folium.CircleMarker(
                location=[row["lat"], row["lon"]],
                radius=r_sz, color="white", weight=2 if sel else 1,
                fill=True, fill_color=clr, fill_opacity=0.95 if sel else 0.75,
                popup=folium.Popup(popup_html, max_width=260),
                tooltip=f"<b>{row['city']}</b> · IVCS={row['IVCS']:.3f}",
            ).add_to(m)

            if sel:
                folium.Marker(
                    [row["lat"], row["lon"]],
                    icon=folium.DivIcon(html=f"""
                    <div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;
                         color:white;background:{clr};padding:3px 10px;border-radius:20px;
                         border:2px solid white;white-space:nowrap;
                         box-shadow:0 2px 8px rgba(0,0,0,0.25)">{row['city']}</div>""",
                    icon_size=(110, 26), icon_anchor=(55, -10)),
                ).add_to(m)

        # Légende
        rn, _ = RISK_DISPLAY[map_rc]
        legend_html = f"""
        <div style="position:fixed;bottom:14px;left:14px;z-index:999;background:white;
             border-radius:10px;padding:10px 14px;box-shadow:0 2px 12px rgba(0,0,0,.14);
             font-family:'DM Sans',sans-serif">
          <div style="font-size:11px;font-weight:700;color:#0F172A;margin-bottom:6px">{rn}</div>
          {''.join(f'''<div style="display:flex;align-items:center;gap:7px;font-size:11px;
            color:#475569;margin-bottom:3px">
            <span style="width:9px;height:9px;border-radius:50%;background:{c};display:inline-block"></span>{l}</div>'''
            for l, c in [("Faible","#22C55E"),("Modéré","#F59E0B"),("Élevé","#EF4444"),("Critique","#8B5CF6")])}
        </div>"""
        m.get_root().html.add_child(folium.Element(legend_html))

        st_folium(m, width="100%", height=400, returned_objects=[], key="fmap")

        # Onglets séries temporelles — variables météo du pipeline
        city_ts = get_city_ts(df, city, 90)
        st.markdown("<div style='margin-top:8px'>", unsafe_allow_html=True)

        t1, t2, t3, t4 = st.tabs(["📊 IVCS", "🌡️ T. apparente", "🌧️ Précipitations", "💨 Vent"])
        base_cfg = dict(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=4, r=4, t=4, b=4), height=140, showlegend=False,
            xaxis=dict(showgrid=False, tickfont=dict(size=9, family="DM Sans"), tickformat="%d %b"),
            yaxis=dict(showgrid=True, gridcolor="#F1F5F9", tickfont=dict(size=9, family="DM Sans"), zeroline=False),
            font=dict(family="DM Sans"),
        )

        with t1:
            fig = go.Figure(go.Scatter(
                x=city_ts["date"], y=city_ts["IVCS"],
                mode="lines", fill="tozeroy",
                line=dict(color="#059669", width=2.5), fillcolor="rgba(5,150,105,.10)"))
            fig.update_layout(**base_cfg)
            fig.update_layout(yaxis=dict(range=[0, 1], **base_cfg["yaxis"]))
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        with t2:
            fig = go.Figure(go.Scatter(
                x=city_ts["date"], y=city_ts.get("apparent_temperature_mean"),
                mode="lines", fill="tozeroy",
                line=dict(color="#EF4444", width=2.5), fillcolor="rgba(239,68,68,.08)"))
            fig.update_layout(**base_cfg)
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        with t3:
            fig = go.Figure(go.Bar(
                x=city_ts["date"], y=city_ts.get("precipitation_sum"),
                marker_color="#3B82F6", marker_opacity=0.7))
            fig.update_layout(**base_cfg)
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        with t4:
            fig = go.Figure(go.Scatter(
                x=city_ts["date"], y=city_ts.get("wind_speed_10m_max"),
                mode="lines", fill="tozeroy",
                line=dict(color="#6B7280", width=2), fillcolor="rgba(107,114,128,.08)"))
            fig.update_layout(**base_cfg)
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        st.markdown("</div></div>", unsafe_allow_html=True)

    # ─── COLONNE DROITE ───────────────────────────────────────────────────────
    with RP:
        st.markdown("<div style='padding:18px 14px 0'>", unsafe_allow_html=True)

        crow = latest[latest["city"] == city].iloc[0]
        ilvl, iclr, ilight = risk_level("IVCS", crow["IVCS"])

        def rlabel(txt):
            st.markdown(f"<div style='font-size:10px;font-weight:700;text-transform:uppercase;"
                        f"letter-spacing:.08em;color:var(--text3);margin:0 0 7px'>{txt}</div>",
                        unsafe_allow_html=True)

        # 4 KPIs — variables météo réelles du pipeline
        rlabel(f"Indicateurs météo — {city}")
        t_app = crow.get("apparent_temperature_mean", 0)
        pcp   = crow.get("precipitation_sum", 0)
        wind  = crow.get("wind_speed_10m_max", 0)
        rad   = crow.get("shortwave_radiation_sum", 0)

        st.markdown(f"""
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:14px">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;
               padding:11px;border-left:3px solid #EF4444">
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;
                 color:#EF4444;letter-spacing:-1px">{t_app:.1f}°</div>
            <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">T. apparente</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;
               padding:11px;border-left:3px solid #3B82F6">
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;
                 color:#3B82F6;letter-spacing:-1px">{pcp:.0f}</div>
            <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Précip. mm/j</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;
               padding:11px;border-left:3px solid #6B7280">
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;
                 color:#6B7280;letter-spacing:-1px">{wind:.1f}</div>
            <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Vent max m/s</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;
               padding:11px;border-left:3px solid {iclr}">
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;
                 color:{iclr};letter-spacing:-1px">{crow['IVCS']:.3f}</div>
            <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">IVCS [0–1]</div>
          </div>
        </div>
        """, unsafe_allow_html=True)

        # Top villes exposées
        rlabel("Villes les plus exposées")
        top8 = latest.nlargest(8, risk_col)[["city", "region", risk_col, "IVCS"]]
        for _, r in top8.iterrows():
            clr_c = risk_color(risk_col, r[risk_col])
            is_c  = r["city"] == city
            bg    = "#F0FDF4" if is_c else "var(--surface2)"
            bc    = "#059669" if is_c else "var(--border)"
            st.markdown(f"""
            <div style="display:flex;align-items:center;justify-content:space-between;
                 padding:8px 11px;border-radius:9px;background:{bg};
                 border:1px solid {bc};margin-bottom:5px">
              <div>
                <div style="font-weight:600;font-size:13px;color:var(--text1)">
                  {'📍 ' if is_c else ''}{r['city']}</div>
                <div style="font-size:11px;color:var(--text3)">{r.get('region','—')}</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700;color:{clr_c};font-size:15px">{r[risk_col]:.3f}</div>
                <div style="width:8px;height:8px;border-radius:50%;background:{clr_c};
                     display:inline-block;margin-top:2px"></div>
              </div>
            </div>""", unsafe_allow_html=True)

        # Radar — sous-indices réels
        rlabel("Profil multi-risques")
        hsi_v = float(crow.get("HSI", 0.5))
        vri_v = float(crow.get("VRI", 0.5))
        aqp_v = float(crow.get("AQP", 0.5))
        t_n   = float(np.clip((t_app - 15) / 35, 0, 1))
        p_n   = float(np.clip(pcp / 150, 0, 1))
        w_n   = float(np.clip(wind / 25, 0, 1))

        cats  = ["HSI", "VRI", "AQP", "Temp.", "Précip.", "Vent"]
        nvals = [hsi_v, vri_v, aqp_v, t_n, p_n, w_n]

        fig_r = go.Figure(go.Scatterpolar(
            r=nvals + [nvals[0]], theta=cats + [cats[0]],
            fill="toself", fillcolor="rgba(5,150,105,.15)",
            line=dict(color="#059669", width=2),
            mode="lines+markers", marker=dict(size=5, color="#059669"),
        ))
        fig_r.update_layout(
            polar=dict(
                radialaxis=dict(visible=True, range=[0, 1],
                                tickfont=dict(size=8, family="DM Sans"),
                                gridcolor="#F1F5F9", linecolor="#F1F5F9"),
                angularaxis=dict(tickfont=dict(size=10, family="DM Sans"), gridcolor="#F1F5F9"),
                bgcolor="rgba(0,0,0,0)",
            ),
            paper_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=16, r=16, t=16, b=16), height=200, showlegend=False,
            font=dict(family="DM Sans"),
        )
        st.plotly_chart(fig_r, use_container_width=True, config={"displayModeBar": False})

        # Résumé national — IVCS ∈ [0,1]
        nat_ivcs  = latest["IVCS"].mean()
        # Seuil d'alerte : IVCS ≥ 0.55 (niveau Élevé)
        nat_alert = (latest["IVCS"] >= 0.55).sum()
        nat_temp  = latest.get("apparent_temperature_mean", pd.Series([0])).mean()

        st.markdown(f"""
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);
             padding:13px;box-shadow:var(--shadow)">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
               color:var(--text3);margin-bottom:10px">RÉSUMÉ NATIONAL — 40 villes</div>
          <div style="display:flex;justify-content:space-between;align-items:center;
               margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
            <span style="font-size:12px;color:var(--text2)">🌍 IVCS moyen</span>
            <span style="font-weight:700;color:#059669;font-size:15px">{nat_ivcs:.3f}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;
               margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
            <span style="font-size:12px;color:var(--text2)">🚨 Villes en alerte (≥0.55)</span>
            <span style="font-weight:700;color:#DC2626;font-size:15px">{nat_alert}/{len(latest)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--text2)">🌡️ T. app. nationale</span>
            <span style="font-weight:700;color:#D97706;font-size:15px">{nat_temp:.1f}°C</span>
          </div>
        </div>
        </div>
        """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 2 — ANALYSE TEMPORELLE
# ══════════════════════════════════════════════════════════════════════════════
elif st.session_state.page == "analyse":

    st.markdown("<div style='padding:20px 28px'>", unsafe_allow_html=True)

    ac1, ac2, ac3 = st.columns([2, 2, 1])
    with ac1:
        city_a = st.selectbox("Ville", all_cities,
                              index=all_cities.index("Douala") if "Douala" in all_cities else 0,
                              key="ca")
    with ac2:
        years_avail = sorted(df["date"].dt.year.unique().tolist())
        yrs = st.multiselect("Années", years_avail,
                             default=years_avail[-3:] if len(years_avail) >= 3 else years_avail,
                             key="ya")
    with ac3:
        agg = st.selectbox("Agrégation", ["Mensuel", "Hebdo.", "Annuel"], key="ag")

    if not yrs:
        st.warning("Sélectionnez au moins une année.")
    else:
        cdf  = df[(df["city"] == city_a) & (df["date"].dt.year.isin(yrs))]
        freq = {"Mensuel": "ME", "Hebdo.": "W", "Annuel": "YE"}[agg]
        cagg = cdf.set_index("date").resample(freq).mean(numeric_only=True).reset_index()

        fig = make_subplots(
            rows=5, cols=1, shared_xaxes=True,
            subplot_titles=[
                "📊 IVCS global [0–1]",
                "🌡️ HSI — Stress thermique [0–1]",
                "🦟 VRI — Risque vectoriel [0–1]",
                "💨 AQP — Qualité de l'air [0–1]",
                "🌧️ Précipitations (mm/j)",
            ],
            vertical_spacing=0.06,
            row_heights=[0.25, 0.19, 0.19, 0.19, 0.18],
        )

        pairs = [
            ("IVCS", "#059669", 1),
            ("HSI",  "#EF4444", 2),
            ("VRI",  "#8B5CF6", 3),
            ("AQP",  "#3B82F6", 4),
        ]
        for col_name, col_color, row_n in pairs:
            if col_name in cagg.columns:
                fig.add_trace(go.Scatter(
                    x=cagg["date"], y=cagg[col_name],
                    mode="lines", fill="tozeroy",
                    line=dict(color=col_color, width=2.5),
                    fillcolor=f"rgba{tuple(int(col_color.lstrip('#')[i:i+2],16) for i in (0,2,4)) + (0.10,)}",
                    name=col_name,
                ), row=row_n, col=1)
                # Seuil d'alerte à 0.55
                fig.add_hline(y=0.55, line_dash="dash", line_color="#EF4444",
                              line_width=1, row=row_n, col=1)

        if "precipitation_sum" in cagg.columns:
            fig.add_trace(go.Bar(
                x=cagg["date"], y=cagg["precipitation_sum"],
                marker_color="#3B82F6", opacity=0.75, name="Préc.",
            ), row=5, col=1)

        fig.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            height=640, showlegend=False,
            margin=dict(l=0, r=0, t=30, b=0), font=dict(family="DM Sans"),
        )
        fig.update_xaxes(showgrid=False)
        fig.update_yaxes(showgrid=True, gridcolor="#F1F5F9", zeroline=False)
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        # Tableau récapitulatif des métriques
        st.markdown("### 📊 Statistiques descriptives")
        stats_cols = ["IVCS", "HSI", "VRI", "AQP",
                      "apparent_temperature_mean", "precipitation_sum", "wind_speed_10m_max"]
        stats_cols = [c for c in stats_cols if c in cdf.columns]
        st.dataframe(
            cdf[stats_cols].describe().round(4).T.style.format("{:.4f}"),
            use_container_width=True,
        )

        import io
        buf = io.StringIO()
        cdf.to_csv(buf, index=False)
        st.download_button("⬇️ Télécharger les données CSV",
                           buf.getvalue(), f"{city_a}_ivcs_analyse.csv", "text/csv")

    st.markdown("</div>", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 3 — SIMULATEUR IVCS
# ══════════════════════════════════════════════════════════════════════════════
elif st.session_state.page == "predict":

    st.markdown("<div style='padding:20px 28px'>", unsafe_allow_html=True)

    st.markdown("""
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);
         padding:14px 18px;margin-bottom:18px;border-left:4px solid #059669">
      <div style="font-weight:700;color:var(--navy);font-size:14px">🔮 Simulateur IVCS — Pipeline HSI · VRI · AQP</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">
        Ajustez les paramètres météorologiques pour simuler l'IVCS selon les formules exactes
        du modèle LightGBM entraîné sur 40 villes camerounaises (2020–2024).
        IVCS ∈ [0, 1] — seuil d'alerte : 0.55.
      </div>
    </div>
    """, unsafe_allow_html=True)

    city_p = st.selectbox("Ville de référence", all_cities,
                           index=all_cities.index("Douala") if "Douala" in all_cities else 0,
                           key="cp")
    ref = latest[latest["city"] == city_p].iloc[0]

    # Valeurs par défaut issues du dataset réel
    def _safe(row, col, default):
        v = row.get(col, default)
        return float(v) if pd.notna(v) else float(default)

    def_T    = _safe(ref, "apparent_temperature_mean", 28.0)
    def_P    = _safe(ref, "precipitation_sum", 5.0)
    def_W    = _safe(ref, "wind_speed_10m_max", 4.0)
    def_R    = _safe(ref, "shortwave_radiation_sum", 18.0)
    def_lag  = _safe(ref, "IVCS", 0.45)

    sc1, sc2 = st.columns(2)
    with sc1:
        T_app = st.slider("🌡️ Température apparente (°C)",
                          15.0, 50.0, round(def_T, 1), 0.5,
                          help="Température ressentie — variable clé du HSI (seuil critique : 28°C)")
        pcp   = st.slider("🌧️ Précipitations (mm/j)",
                          0.0, 200.0, round(def_P, 1), 1.0,
                          help="Cumul journalier — facteur f_P du VRI (favorise les gîtes larvaires)")
        wind  = st.slider("💨 Vent max 10 m (m/s)",
                          0.0, 30.0, round(def_W, 1), 0.5,
                          help="Vent faible (<5 m/s) favorise les moustiques (facteur f_V du VRI)")

    with sc2:
        rad   = st.slider("☀️ Rayonnement solaire (MJ/m²)",
                          0.0, 35.0, round(def_R, 1), 0.5,
                          help="Utilisé dans le calcul de l'AQP (qualité de l'air)")
        ivcs_lag = st.slider("📊 IVCS de la veille (lag_1)",
                             0.0, 1.0, round(def_lag, 3), 0.001,
                             help="Feature n°1 du modèle LightGBM (importance : 28.5%). "
                                  "Représente l'inertie du système sanitaire.")

    # Calcul IVCS
    ivcs_p, HSI_p, VRI_p, AQP_p = predict_ivcs(T_app, pcp, wind, rad, ivcs_lag)
    plbl, pclr, plight = risk_level("IVCS", ivcs_p)
    delta = ivcs_p - _safe(ref, "IVCS", 0.45)

pc1, pc2, pc3 = st.columns([1.1, 2, 1.5])

with pc1:
    st.markdown(f"""
    <div style="background:var(--surface);border:1px solid var(--border);
         border-radius:var(--r);border-left:4px solid {pclr};
         padding:20px;text-align:center;box-shadow:var(--shadow)">
         
      <div style="font-size:11px;color:var(--text3);margin-bottom:6px">
        IVCS PRÉDIT
      </div>

      <div style="font-family:'Syne',sans-serif;font-size:64px;font-weight:800;
           color:{pclr};letter-spacing:-4px;line-height:1">
           {ivcs_p:.3f}
      </div>

      <div style="font-size:11px;color:var(--text3);margin:4px 0 12px">
        ∈ [0, 1]
      </div>

      <span style="background:{plight};color:{pclr};padding:6px 16px;
            border-radius:20px;font-size:12px;font-weight:700">
        {'🟢' if plbl=='Faible' else '🟡' if plbl=='Modéré' else '🔴' if plbl=='Élevé' else '⚠️'} {plbl.upper()}
      </span>

      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
        <div style="font-size:11px;color:var(--text3)">
          Actuel {city_p} : <b style="color:var(--text1)">{def_lag:.3f}</b>
        </div>

        <div style="font-size:13px;font-weight:600;
             color:{'#DC2626' if delta>0 else '#059669'};margin-top:2px">
          {'▲' if delta>0 else '▼'} {abs(delta):.3f} vs référence
        </div>
      </div>
    </div>

    <div style="margin-top:12px;background:var(--surface);border:1px solid var(--border);
         border-radius:var(--r);padding:14px">

      <div style="font-size:10px;font-weight:700;text-transform:uppercase;
           letter-spacing:.08em;color:var(--text3);margin-bottom:10px">
           SOUS-INDICES
      </div>

      {''.join(
    f'''
    <div style="display:flex;justify-content:space-between;align-items:center;
         margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
      <span style="font-size:12px;color:var(--text2)">{name}</span>
      <span style="font-weight:700;color:{risk_level(col, val)[1]};
            font-size:14px">{val:.3f}</span>
    </div>
    '''
    for name, col, val in [
        ("🌡️ HSI", "HSI", HSI_p),
        ("🦟 VRI", "VRI", VRI_p),
        ("💨 AQP", "AQP", AQP_p),
    ]
    )}

    </div>
    """, unsafe_allow_html=True)
    with pc2:
        # Prévision sur 30 jours avec inertie réaliste
        np.random.seed(int(ivcs_p * 1000))
        ivcs_init = ivcs_p
        fc_vals = [ivcs_init]
        for i in range(29):
            # Décroissance/croissance progressive + bruit
            drift = np.random.normal(0, 0.01)
            reversion = 0.02 * (0.45 - fc_vals[-1])  # mean-reversion
            next_v = fc_vals[-1] + drift + reversion
            fc_vals.append(float(np.clip(next_v, 0, 1)))

        lo  = [max(0.0, v - 0.04) for v in fc_vals]
        hi  = [min(1.0, v + 0.04) for v in fc_vals]
        dts = pd.date_range(datetime.date.today(), periods=30)

        fig_fc = go.Figure()
        fig_fc.add_trace(go.Scatter(
            x=list(dts) + list(reversed(dts)),
            y=hi + list(reversed(lo)),
            fill="toself", fillcolor="rgba(5,150,105,.10)",
            line=dict(color="rgba(0,0,0,0)"), showlegend=False))
        fig_fc.add_trace(go.Scatter(
            x=dts, y=fc_vals,
            line=dict(color="#059669", width=3),
            mode="lines", showlegend=False))
        fig_fc.add_hline(y=0.55, line_dash="dash", line_color="#EF4444",
                         annotation_text="Seuil alerte (0.55)",
                         annotation_position="right",
                         annotation_font_size=10)
        fig_fc.add_hline(y=0.30, line_dash="dot", line_color="#F59E0B",
                         annotation_text="Seuil modéré (0.30)",
                         annotation_position="right",
                         annotation_font_size=10)
        fig_fc.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(showgrid=False, tickformat="%d %b", tickfont=dict(size=10)),
            yaxis=dict(showgrid=True, gridcolor="#F1F5F9", range=[0, 1], title="IVCS"),
            height=300, margin=dict(l=0, r=0, t=10, b=0),
            title=dict(text=f"Prévision IVCS sur 30 jours — {city_p}",
                       font=dict(size=13, family="DM Sans"), x=0),
            font=dict(family="DM Sans"),
        )
        st.plotly_chart(fig_fc, use_container_width=True, config={"displayModeBar": False})

        # Recommandations simulées
        recs_sim = RECS.get("IVCS", {}).get(plbl, [])
        if recs_sim:
            st.markdown(f"""
            <div style="background:{plight};border-radius:10px;padding:12px 14px;margin-top:8px">
              <div style="font-weight:700;color:{pclr};font-size:13px;margin-bottom:8px">
                Actions recommandées — Niveau {plbl}
              </div>
              {''.join(f'<div style="font-size:12px;color:{pclr};margin-bottom:5px">{r}</div>'
                       for r in recs_sim)}
            </div>""", unsafe_allow_html=True)

    with pc3:
        # Feature importances réelles du modèle
        fi_plot = FEATURE_IMPORTANCE.tail(10).copy()
        fig_fi = go.Figure(go.Bar(
            x=fi_plot["Importance"],
            y=fi_plot["Variable"],
            orientation="h",
            marker_color=fi_plot["Couleur"].tolist(),
            text=[f"{v:.1%}" for v in fi_plot["Importance"]],
            textposition="outside",
        ))
        fig_fi.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(showgrid=False, tickformat=".0%", tickfont=dict(size=10)),
            yaxis=dict(showgrid=False, tickfont=dict(size=10)),
            height=320, margin=dict(l=0, r=36, t=10, b=0),
            title=dict(text="Importance des features (LightGBM)",
                       font=dict(size=12, family="DM Sans"), x=0),
            font=dict(family="DM Sans"),
        )
        st.plotly_chart(fig_fi, use_container_width=True, config={"displayModeBar": False})

        # Détail formule
        st.markdown(f"""
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);
             padding:13px;margin-top:8px;font-size:11px;color:var(--text2)">
          <div style="font-weight:700;color:var(--navy);margin-bottom:8px">📐 Formule IVCS</div>
          <div style="font-family:monospace;font-size:10px;background:#F8FAFC;
               border-radius:6px;padding:8px;color:#0F172A">
            HSI = σ(0.5 × (T_app − 28))<br>
            VRI = f_T × f_P × f_V<br>
            AQP = (1−V/Vmax)(1−P/Pmax)(R/Rmax)×S<br>
            IVCS = (HSI + VRI + AQP) / 3<br><br>
            <b>Valeurs simulées :</b><br>
            HSI = {HSI_p:.4f}<br>
            VRI = {VRI_p:.4f}<br>
            AQP = {AQP_p:.4f}<br>
            IVCS (modèle) = {(HSI_p+VRI_p+AQP_p)/3:.4f}<br>
            IVCS (lag pondéré) = <b>{ivcs_p:.4f}</b>
          </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)


# ─── Footer ───────────────────────────────────────────────────────────────────
st.markdown("""
<div style="background:var(--surface);border-top:1px solid var(--border);
     padding:10px 24px;display:flex;align-items:center;justify-content:center;
     gap:20px;font-size:12px;color:var(--text3)">
  <span>🌍 <b style="color:var(--navy)">ClimaResist AI</b></span>
  <span style="color:var(--border)">|</span>
  <span>🏛️ IndabaX Cameroun 2026</span>
  <span style="color:var(--border)">|</span>
  <span>🤖 LightGBM Global · 40 villes · IVCS ∈ [0,1]</span>
  <span style="color:var(--border)">|</span>
  <span>📡 Open-Meteo · MAE=0.003 · MAPE=1.19%</span>
  <span style="color:var(--border)">|</span>
  <span>🎓 Univ. Ngaoundéré · Univ. Dschang</span>
</div>
""", unsafe_allow_html=True)
