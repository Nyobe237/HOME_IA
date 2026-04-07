"""
utils/data_generator.py
Génère le dataset synthétique indabax_cameroun_gold_dataset.csv
si le fichier réel n'est pas présent.
"""
import pandas as pd
import numpy as np
from pathlib import Path

CITIES = [
    {"ville": "Yaoundé",        "region": "Centre",       "lat": 3.848, "lon": 11.502, "pop": 3500000},
    {"ville": "Douala",          "region": "Littoral",     "lat": 4.051, "lon": 9.767,  "pop": 3800000},
    {"ville": "Garoua",          "region": "Nord",         "lat": 9.300, "lon": 13.397, "pop": 436000},
    {"ville": "Bamenda",         "region": "Nord-Ouest",   "lat": 5.959, "lon": 10.146, "pop": 400000},
    {"ville": "Bafoussam",       "region": "Ouest",        "lat": 5.478, "lon": 10.418, "pop": 350000},
    {"ville": "Ngaoundéré",      "region": "Adamaoua",     "lat": 7.321, "lon": 13.584, "pop": 300000},
    {"ville": "Bertoua",         "region": "Est",          "lat": 4.578, "lon": 13.686, "pop": 250000},
    {"ville": "Ebolowa",         "region": "Sud",          "lat": 2.900, "lon": 11.150, "pop": 180000},
    {"ville": "Buea",            "region": "Sud-Ouest",    "lat": 4.154, "lon": 9.241,  "pop": 200000},
    {"ville": "Maroua",          "region": "Extrême-Nord", "lat": 10.591,"lon": 14.316, "pop": 370000},
    {"ville": "Kumba",           "region": "Sud-Ouest",    "lat": 4.636, "lon": 9.446,  "pop": 180000},
    {"ville": "Nkongsamba",      "region": "Littoral",     "lat": 4.955, "lon": 9.936,  "pop": 130000},
    {"ville": "Loum",            "region": "Littoral",     "lat": 4.717, "lon": 9.736,  "pop": 80000},
    {"ville": "Mbouda",          "region": "Ouest",        "lat": 5.630, "lon": 10.254, "pop": 90000},
    {"ville": "Dschang",         "region": "Ouest",        "lat": 5.440, "lon": 10.052, "pop": 100000},
    {"ville": "Foumban",         "region": "Ouest",        "lat": 5.725, "lon": 10.904, "pop": 110000},
    {"ville": "Kribi",           "region": "Sud",          "lat": 2.940, "lon": 9.908,  "pop": 90000},
    {"ville": "Sangmélima",      "region": "Sud",          "lat": 2.939, "lon": 11.981, "pop": 80000},
    {"ville": "Mbalmayo",        "region": "Centre",       "lat": 3.516, "lon": 11.500, "pop": 120000},
    {"ville": "Obala",           "region": "Centre",       "lat": 4.167, "lon": 11.533, "pop": 70000},
    {"ville": "Bafang",          "region": "Ouest",        "lat": 5.154, "lon": 10.178, "pop": 70000},
    {"ville": "Wum",             "region": "Nord-Ouest",   "lat": 6.386, "lon": 10.070, "pop": 50000},
    {"ville": "Kumbo",           "region": "Nord-Ouest",   "lat": 6.202, "lon": 10.677, "pop": 100000},
    {"ville": "Fundong",         "region": "Nord-Ouest",   "lat": 6.260, "lon": 10.247, "pop": 40000},
    {"ville": "Tibati",          "region": "Adamaoua",     "lat": 6.469, "lon": 12.629, "pop": 45000},
    {"ville": "Meiganga",        "region": "Adamaoua",     "lat": 6.520, "lon": 14.294, "pop": 55000},
    {"ville": "Tignère",         "region": "Adamaoua",     "lat": 7.370, "lon": 12.657, "pop": 40000},
    {"ville": "Guider",          "region": "Nord",         "lat": 9.934, "lon": 13.944, "pop": 60000},
    {"ville": "Poli",            "region": "Nord",         "lat": 8.480, "lon": 13.240, "pop": 30000},
    {"ville": "Figuil",          "region": "Nord",         "lat": 9.757, "lon": 13.961, "pop": 40000},
    {"ville": "Mora",            "region": "Extrême-Nord", "lat": 11.045,"lon": 14.143, "pop": 50000},
    {"ville": "Kousseri",        "region": "Extrême-Nord", "lat": 12.077,"lon": 15.030, "pop": 110000},
    {"ville": "Makary",          "region": "Extrême-Nord", "lat": 12.570,"lon": 14.467, "pop": 30000},
    {"ville": "Batouri",         "region": "Est",          "lat": 4.433, "lon": 14.367, "pop": 75000},
    {"ville": "Abong-Mbang",     "region": "Est",          "lat": 3.984, "lon": 13.182, "pop": 50000},
    {"ville": "Yokadouma",       "region": "Est",          "lat": 3.516, "lon": 15.050, "pop": 40000},
    {"ville": "Ambam",           "region": "Sud",          "lat": 2.380, "lon": 11.280, "pop": 35000},
    {"ville": "Limbe",           "region": "Sud-Ouest",    "lat": 4.017, "lon": 9.200,  "pop": 130000},
    {"ville": "Mundemba",        "region": "Sud-Ouest",    "lat": 4.984, "lon": 8.880,  "pop": 25000},
    {"ville": "Mbengwi",         "region": "Nord-Ouest",   "lat": 6.016, "lon": 10.003, "pop": 35000},
]

REGIONS = [
    "Centre", "Littoral", "Nord", "Nord-Ouest", "Ouest",
    "Adamaoua", "Est", "Sud", "Sud-Ouest", "Extrême-Nord"
]

REGION_CLIMATE = {
    "Centre":       {"temp_base": 24, "prec_base": 140, "pm25_base": 22},
    "Littoral":     {"temp_base": 27, "prec_base": 180, "pm25_base": 35},
    "Nord":         {"temp_base": 32, "prec_base": 60,  "pm25_base": 45},
    "Nord-Ouest":   {"temp_base": 20, "prec_base": 200, "pm25_base": 18},
    "Ouest":        {"temp_base": 21, "prec_base": 190, "pm25_base": 20},
    "Adamaoua":     {"temp_base": 22, "prec_base": 120, "pm25_base": 25},
    "Est":          {"temp_base": 25, "prec_base": 160, "pm25_base": 15},
    "Sud":          {"temp_base": 26, "prec_base": 175, "pm25_base": 18},
    "Sud-Ouest":    {"temp_base": 26, "prec_base": 220, "pm25_base": 28},
    "Extrême-Nord": {"temp_base": 36, "prec_base": 30,  "pm25_base": 60},
}

def generate_dataset(path: str = "data/indabax_cameroun_gold_dataset.csv") -> pd.DataFrame:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    np.random.seed(42)
    dates = pd.date_range("2020-01-01", "2025-12-31", freq="D")
    records = []

    for city in CITIES:
        clim = REGION_CLIMATE[city["region"]]
        for date in dates:
            month = date.month
            year = date.year
            # Seasonal cycle
            season = np.sin(2 * np.pi * (month - 3) / 12)
            cc_trend = (year - 2020) * 0.08  # climate change signal

            temp = clim["temp_base"] + 4 * season + cc_trend + np.random.normal(0, 1.5)
            prec = max(0, clim["prec_base"] * (1 + 0.6 * season) + np.random.normal(0, 20))
            pm25 = max(2, clim["pm25_base"] * (1 + 0.3 * np.cos(2*np.pi*month/12)) + np.random.normal(0, 5))
            pm10 = pm25 * np.random.uniform(1.5, 2.2)
            uv = max(1, 7 + 3 * season + np.random.normal(0, 1))
            wind = max(0, 10 + np.random.normal(0, 4))
            humidity = max(20, min(100, 65 + 20 * season + np.random.normal(0, 8)))

            # Health indices
            risque_paludisme = min(1, max(0, 0.1 + 0.5*(prec/200) + 0.2*(humidity/100) + np.random.uniform(0, 0.1)))
            stress_thermique = max(0, (temp - 28) / 10 + pm25/100 + np.random.uniform(0, 0.1))
            secheresse = max(0, 1 - prec/200 + cc_trend/5)
            pollution_resp = pm25/50 + pm10/100
            amplitude = abs(temp - clim["temp_base"]) + cc_trend

            # IVCS — Indice de Vulnérabilité Climatique Sanitaire [0–10]
            ivcs = (
                0.3 * (temp / 40) * 10 +
                0.2 * (1 - prec / 300) * 10 +
                0.2 * (pm25 / 80) * 10 +
                0.15 * risque_paludisme * 10 +
                0.15 * stress_thermique * 10
            )
            ivcs = min(10, max(0, ivcs + np.random.normal(0, 0.3)))
            ivcs_enrichi = ivcs * (1 + 0.05 * cc_trend)

            records.append({
                "date": date,
                "ville": city["ville"],
                "region": city["region"],
                "lat": city["lat"],
                "lon": city["lon"],
                "population": city["pop"],
                "temperature": round(temp, 2),
                "precipitation": round(prec, 2),
                "humidity": round(humidity, 2),
                "wind_speed": round(wind, 2),
                "pm25": round(pm25, 2),
                "pm10": round(pm10, 2),
                "uv_index": round(uv, 2),
                "risque_paludisme": round(risque_paludisme, 4),
                "stress_thermique": round(stress_thermique, 4),
                "secheresse_agricole": round(secheresse, 4),
                "indice_pollution_respiratoire": round(pollution_resp, 4),
                "amplitude_thermique": round(amplitude, 2),
                "IVCS": round(ivcs, 3),
                "IVCS_enrichi": round(ivcs_enrichi, 3),
            })

    df = pd.DataFrame(records)
    df.to_csv(path, index=False)
    print(f"✅ Dataset généré : {len(df)} lignes → {path}")
    return df


if __name__ == "__main__":
    generate_dataset()
