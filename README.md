# 🌍 ClimaResist AI — Résilience Climatique & Sanitaire au Cameroun

Dashboard interactif développé pour le **Hackathon IndabaX Cameroun 2026**  
Thème : *"L'IA au service de la résilience sanitaire et climatique"*

---

## 🚀 Démarrage Rapide

### 1. Cloner & Installer

```bash
git clone https://github.com/indabax-cm/climaresist-ai.git
cd climaresist-ai
pip install -r requirements.txt
```

### 2. Générer le dataset (si absent)

```bash
python utils/data_generator.py
# → data/indabax_cameroun_gold_dataset.csv (87 240 lignes)
```

Si vous avez le vrai dataset hackathon, placez-le directement dans `data/` :
```
data/indabax_cameroun_gold_dataset.csv
```

### 3. Lancer le backend FastAPI

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
# → http://localhost:8000/docs
```

### 4. Lancer le dashboard Streamlit

```bash
streamlit run app.py
# → http://localhost:8501
```

---

## 🐳 Docker (recommandé)

```bash
docker build -t climaresist-ai .
docker run -p 8501:8501 -p 8000:8000 climaresist-ai
```

Accéder à :
- Dashboard : http://localhost:8501
- API Docs  : http://localhost:8000/docs

---

## ☁️ Déploiement Streamlit Community Cloud

1. Forker ce repo sur GitHub
2. Aller sur [share.streamlit.io](https://share.streamlit.io)
3. Sélectionner `app.py` comme point d'entrée
4. Déployer ✅

> **Note** : Sur Streamlit Cloud, le backend FastAPI ne sera pas disponible.  
> Le dashboard fonctionne en mode dégradé (prédictions locales + dataset CSV).

---

## 📁 Structure du Projet

```
climaresist-ai/
├── app.py                          # Point d'entrée Streamlit
├── api.py                          # Backend FastAPI
├── requirements.txt
├── Dockerfile
├── README.md
├── .streamlit/
│   └── config.toml                 # Thème sombre personnalisé
├── data/
│   └── indabax_cameroun_gold_dataset.csv
├── utils/
│   ├── __init__.py
│   ├── theme.py                    # Palette + CSS + helpers
│   ├── data.py                     # Chargement + cache données
│   └── data_generator.py           # Génération dataset synthétique
└── pages/
    ├── __init__.py
    ├── one_accueil.py              # 🏠 Accueil + KPIs
    ├── two_carte.py                # 🗺️ Carte Folium interactive
    ├── three_temporel.py           # 📈 Analyse temporelle
    ├── four_predictions.py         # 🔮 Prédictions IA / IVCS
    ├── five_air_sante.py           # 🌬️ Qualité Air & Santé
    ├── six_regions.py              # 📊 Comparaisons régionales
    └── seven_methodo.py            # ℹ️ Méthodologie & À propos
```

---

## 📊 Pages du Dashboard

| Page | Description |
|------|-------------|
| 🏠 Accueil | Hero, KPIs nationaux, carte Plotly, alertes |
| 🗺️ Carte Interactive | Folium multicouche : IVCS, PM2.5, Paludisme, Précipitations |
| 📈 Analyse Temporelle | Time series multi-variables, comparaison avant/après 2023 |
| 🔮 Prédictions IA | Simulateur what-if, gauge IVCS, forecast 30j, scénarios RCP |
| 🌬️ Qualité Air & Santé | PM2.5/PM10, heatmap calendrier Altair, comparaison OMS |
| 📊 Comparaisons Régionales | Barres groupées, radar, coordonnées parallèles |
| ℹ️ Méthodologie | Pipeline Sankey, formule IVCS, stack technique, crédits |

---

## 🧮 Indice IVCS

**Indice de Vulnérabilité Climatique Sanitaire** [0–10]

```
IVCS = 0.30 × (Temp/40) × 10
     + 0.20 × (1 - Préc/300) × 10
     + 0.20 × (PM2.5/80) × 10
     + 0.15 × Stress_thermique × 10
     + 0.15 × (1 - Humidité) × 5
```

| Score | Niveau | Action |
|-------|--------|--------|
| 0–3   | 🟢 Faible   | Surveillance normale |
| 3–6   | 🟡 Modéré   | Vigilance renforcée |
| 6–8   | 🔴 Élevé    | Alerte sanitaire |
| 8–10  | ⚠️ Critique | Urgence climatique |

---

## 🌐 API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/current?city=Yaoundé` | GET | Données météo temps réel (Open-Meteo) |
| `/api/historical?city=Douala&year=2024` | GET | Données historiques du dataset |
| `/api/predict` | POST | Prédiction IVCS (body JSON) |
| `/health` | GET | Santé de l'API |

---

## 🛠️ Stack Technique

- **Frontend** : Streamlit 1.42+
- **Backend** : FastAPI + Uvicorn
- **Cartographie** : Folium + streamlit-folium
- **Graphiques** : Plotly + Altair
- **Données météo** : Open-Meteo API (gratuit, sans clé)
- **ML** : scikit-learn (modèle IVCS)
- **Déploiement** : Docker + Streamlit Community Cloud

---

## 📄 Licence

MIT — Libre pour usage éducatif et de recherche.

---

*Propulsé par [Open-Meteo](https://open-meteo.com) + IA locale · IndabaX Cameroun 2026*
