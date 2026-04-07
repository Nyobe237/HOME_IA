"""
pages/7_ℹ️_Méthodologie.py
"""
import streamlit as st
import plotly.graph_objects as go
from utils.theme import PALETTE


def show():
    st.markdown("## ℹ️ Méthodologie & À propos")

    # ── Pipeline ──────────────────────────────────────────────────────────
    st.markdown("### 🔄 Pipeline de Données")

    col1, col2 = st.columns([2, 1])

    with col1:
        st.markdown("""
        <div class="climaresist-card">
        <h4 style="color:#10B981;margin-top:0">🌐 Sources de Données</h4>

        <b>1. Open-Meteo API (temps réel)</b><br>
        API gratuite et ouverte pour les données météo mondiales.<br>
        Variables : température, précipitations, humidité, vent, UV, etc.<br>
        Résolution : horaire / quotidienne / hebdomadaire.<br><br>

        <b>2. Dataset Hackathon IndabaX</b><br>
        87 240 lignes · 40 villes · 10 régions · 2020–2025<br>
        Features engineered : IVCS, risque paludisme, stress thermique,
        sécheresse agricole, pollution respiratoire, amplitude thermique.<br><br>

        <b>3. Fusion & Enrichissement</b><br>
        • Jointure temporelle sur (ville, date)<br>
        • Interpolation spatiale pour les données manquantes<br>
        • Moyennes mensuelles par région comme fallback<br>
        • Normalisation min-max par indicateur<br>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown("""
        <div class="climaresist-card">
        <h4 style="color:#3B82F6;margin-top:0">📐 Formule IVCS</h4>
        <p style="font-size:0.88em">
        Indice de Vulnérabilité Climatique Sanitaire [0–10]
        </p>
        <code style="font-size:0.8em;background:#0F172A;padding:8px;border-radius:6px;display:block">
        IVCS =<br>
        &nbsp;0.30 × (Temp/40) × 10<br>
        + 0.20 × (1 - Préc/300) × 10<br>
        + 0.20 × (PM2.5/80) × 10<br>
        + 0.15 × Stress_therm × 10<br>
        + 0.15 × (1 - Humidité) × 5
        </code>
        <br>
        <b>Niveaux :</b><br>
        🟢 0–3 : Faible<br>
        🟡 3–6 : Modéré<br>
        🔴 6–8 : Élevé<br>
        ⚠️ 8–10 : Critique
        </div>
        """, unsafe_allow_html=True)

    # ── Architecture ──────────────────────────────────────────────────────
    st.divider()
    st.markdown("### 🏗️ Architecture Technique")

    fig = go.Figure()
    fig.add_trace(go.Sankey(
        node=dict(
            label=["Open-Meteo API","Dataset CSV","FastAPI Backend",
                   "Streamlit Frontend","Cache Redis","Utilisateur"],
            color=[PALETTE["blue"], PALETTE["green"], PALETTE["orange"],
                   PALETTE["red"], PALETTE["gray"], "#7C3AED"],
            pad=20, thickness=20,
        ),
        link=dict(
            source=[0, 1, 2, 2, 4, 3],
            target=[2, 2, 3, 4, 3, 5],
            value=[30, 70, 40, 30, 30, 100],
            color=["rgba(59,130,246,0.3)","rgba(16,185,129,0.3)",
                   "rgba(245,158,11,0.3)","rgba(239,68,68,0.15)",
                   "rgba(100,116,139,0.2)","rgba(124,58,237,0.3)"],
        )
    ))
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        height=280,
        margin=dict(l=0, r=0, t=10, b=0),
        font_color="#94A3B8",
    )
    st.plotly_chart(fig, use_container_width=True)

    # ── Stack technique ────────────────────────────────────────────────────
    st.divider()
    st.markdown("### 🛠️ Stack Technique")

    techs = [
        ("Streamlit 1.42+", "Frontend interactif", "#EF4444"),
        ("FastAPI", "Backend REST API", "#10B981"),
        ("Folium + st_folium", "Cartographie interactive", "#3B82F6"),
        ("Plotly", "Graphiques avancés", "#F59E0B"),
        ("Altair", "Visualisations déclaratives", "#7C3AED"),
        ("Open-Meteo", "Données météo temps réel", "#06B6D4"),
        ("Pandas / NumPy", "Traitement de données", "#EC4899"),
        ("scikit-learn", "Modèles ML", "#84CC16"),
        ("Docker", "Containerisation", "#0EA5E9"),
    ]

    cols = st.columns(3)
    for i, (name, desc, color) in enumerate(techs):
        with cols[i % 3]:
            st.markdown(f"""
            <div class="climaresist-card" style="border-left:3px solid {color};padding:12px 14px;margin:6px 0">
                <span style="font-weight:600;color:{color}">{name}</span><br>
                <span style="font-size:0.83em;opacity:0.7">{desc}</span>
            </div>
            """, unsafe_allow_html=True)

    # ── Crédits ────────────────────────────────────────────────────────────
    st.divider()
    st.markdown("### 👥 Crédits & Équipe")

    st.markdown("""
    <div class="climaresist-card">
        <h4 style="color:#10B981;margin-top:0">🏆 Hackathon IndabaX Cameroun 2026</h4>
        <p>
            Ce dashboard a été développé pour le hackathon IndabaX Cameroun 2026
            sur le thème <em>"L'IA au service de la résilience sanitaire et climatique"</em>.
        </p>
        <hr style="border-color:#334155">
        <b>Données :</b>
        <ul>
            <li><a href="https://open-meteo.com" target="_blank" style="color:#3B82F6">Open-Meteo</a>
                — API météo open source</li>
            <li>Dataset fusionné IndabaX Cameroun (87 240 lignes, 2020–2025)</li>
            <li>OMS — Seuils de qualité de l'air</li>
        </ul>
        <b>Licence :</b> MIT — Code source libre pour usage éducatif et de recherche.<br>
        <b>GitHub :</b>
        <a href="https://github.com/indabax-cm/climaresist-ai" target="_blank" style="color:#3B82F6">
            github.com/indabax-cm/climaresist-ai
        </a>
    </div>
    """, unsafe_allow_html=True)

    # ── Avertissement ──────────────────────────────────────────────────────
    st.info("""
    ⚠️ **Avertissement** : Les prédictions IVCS sont basées sur un modèle simplifié à des fins
    de démonstration. Pour des décisions de politique de santé publique, consulter des épidémiologistes
    et climatologues qualifiés.
    """)
