"""
api.py — FastAPI backend ClimaResist AI
Endpoints : /api/current, /api/historical, /api/predict
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import httpx
import os
from pathlib import Path

app = FastAPI(title="ClimaResist AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATASET_PATH = "data/indabax_cameroun_gold_dataset.csv"

CITIES_META = {
    "Yaoundé":  {"lat": 3.848,  "lon": 11.502},
    "Douala":   {"lat": 4.051,  "lon": 9.767},
    "Garoua":   {"lat": 9.300,  "lon": 13.397},
    "Maroua":   {"lat": 10.591, "lon": 14.316},
    "Ngaoundéré":{"lat": 7.321, "lon": 13.584},
    "Bertoua":  {"lat": 4.578,  "lon": 13.686},
    "Bamenda":  {"lat": 5.959,  "lon": 10.146},
    "Bafoussam":{"lat": 5.478,  "lon": 10.418},
    "Buea":     {"lat": 4.154,  "lon": 9.241},
    "Ebolowa":  {"lat": 2.900,  "lon": 11.150},
}


def load_df() -> pd.DataFrame:
    if Path(DATASET_PATH).exists():
        return pd.read_csv(DATASET_PATH, parse_dates=["date"])
    raise FileNotFoundError("Dataset not found. Run utils/data_generator.py first.")


@app.get("/api/current")
async def get_current(city: str = "Yaoundé"):
    meta = CITIES_META.get(city)
    if not meta:
        raise HTTPException(404, f"Ville inconnue: {city}")
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={meta['lat']}&longitude={meta['lon']}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index"
        f"&forecast_days=7&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max"
        f"&timezone=Africa%2FDouala"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        raise HTTPException(503, f"Open-Meteo error: {e}")
    return {"city": city, "meta": meta, "data": data}


@app.get("/api/historical")
async def get_historical(city: str = "Yaoundé", year: int = None):
    df = load_df()
    filtered = df[df["ville"] == city]
    if year:
        filtered = filtered[filtered["date"].dt.year == year]
    if filtered.empty:
        raise HTTPException(404, "Aucune donnée trouvée")
    return filtered.tail(365).to_dict(orient="records")


class PredictInput(BaseModel):
    temperature: float = 28.0
    precipitation: float = 100.0
    pm25: float = 25.0
    humidity: float = 65.0
    wind_speed: float = 10.0


@app.post("/api/predict")
async def predict_ivcs(data: PredictInput):
    ivcs = (
        0.3 * (data.temperature / 40) * 10 +
        0.2 * (1 - data.precipitation / 300) * 10 +
        0.2 * (data.pm25 / 80) * 10 +
        0.15 * max(0, (data.temperature - 28) / 10) * 10 +
        0.15 * (1 - data.humidity / 100) * 5
    )
    ivcs = round(min(10, max(0, ivcs)), 3)

    if ivcs < 3:
        niveau = "Faible"
        color = "green"
    elif ivcs < 6:
        niveau = "Modéré"
        color = "orange"
    elif ivcs < 8:
        niveau = "Élevé"
        color = "red"
    else:
        niveau = "Critique"
        color = "darkred"

    forecast = [round(ivcs + np.random.normal(0, 0.2) * i * 0.05, 3) for i in range(30)]
    forecast = [min(10, max(0, v)) for v in forecast]

    feature_importance = {
        "Température": 0.30,
        "Précipitations": 0.20,
        "PM2.5": 0.20,
        "Stress thermique": 0.15,
        "Humidité": 0.15,
    }

    return {
        "ivcs": ivcs,
        "niveau_risque": niveau,
        "color": color,
        "forecast_30j": forecast,
        "feature_importance": feature_importance,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
