"""
utils/data.py — Chargement et cache des données
"""
import streamlit as st
import pandas as pd
import numpy as np
from pathlib import Path
import requests

DATASET_PATH = "data/indabax_cameroun_gold_dataset.csv"
API_BASE = "http://localhost:8000"


@st.cache_data(ttl=3600, show_spinner=False)
def load_dataset() -> pd.DataFrame:
    """Charge le dataset principal. Génère si absent."""
    if not Path(DATASET_PATH).exists():
        from utils.data_generator import generate_dataset
        return generate_dataset(DATASET_PATH)
    df = pd.read_csv(DATASET_PATH, parse_dates=["date"])
    return df


@st.cache_data(ttl=300, show_spinner=False)
def get_latest_data(df: pd.DataFrame) -> pd.DataFrame:
    """Dernières données disponibles par ville."""
    return df.sort_values("date").groupby("ville").last().reset_index()


@st.cache_data(ttl=600, show_spinner=False)
def get_city_timeseries(df: pd.DataFrame, city: str, years: list = None) -> pd.DataFrame:
    filtered = df[df["ville"] == city].copy()
    if years:
        filtered = filtered[filtered["date"].dt.year.isin(years)]
    return filtered.sort_values("date")


@st.cache_data(ttl=600, show_spinner=False)
def get_regional_summary(df: pd.DataFrame) -> pd.DataFrame:
    latest = get_latest_data(df)
    summary = latest.groupby("region").agg(
        IVCS_moyen=("IVCS", "mean"),
        temp_moyenne=("temperature", "mean"),
        pm25_moyen=("pm25", "mean"),
        prec_moyenne=("precipitation", "mean"),
        risque_paludisme=("risque_paludisme", "mean"),
        nb_villes=("ville", "count"),
    ).reset_index()
    return summary


def fetch_openmeteo(lat: float, lon: float) -> dict:
    """Appel direct Open-Meteo (fallback si API locale down)."""
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index"
        f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max"
        f"&forecast_days=7&timezone=Africa%2FDouala"
    )
    try:
        r = requests.get(url, timeout=8)
        return r.json()
    except Exception:
        return {}


def predict_ivcs_local(temp: float, prec: float, pm25: float, humidity: float, wind: float) -> dict:
    """Prédiction IVCS locale (sans serveur FastAPI)."""
    ivcs = (
        0.3 * (temp / 40) * 10 +
        0.2 * (1 - prec / 300) * 10 +
        0.2 * (pm25 / 80) * 10 +
        0.15 * max(0, (temp - 28) / 10) * 10 +
        0.15 * (1 - humidity / 100) * 5
    )
    ivcs = round(min(10, max(0, ivcs)), 3)

    if ivcs < 3:
        niveau = "Faible"
    elif ivcs < 6:
        niveau = "Modéré"
    elif ivcs < 8:
        niveau = "Élevé"
    else:
        niveau = "Critique"

    forecast = [min(10, max(0, round(ivcs + np.random.normal(0, 0.15) * (i + 1) * 0.05, 3))) for i in range(30)]

    return {
        "ivcs": ivcs,
        "niveau_risque": niveau,
        "forecast_30j": forecast,
        "feature_importance": {
            "Température": 0.30,
            "Précipitations": 0.20,
            "PM2.5": 0.20,
            "Stress thermique": 0.15,
            "Humidité": 0.15,
        }
    }
