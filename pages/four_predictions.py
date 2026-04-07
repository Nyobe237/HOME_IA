"""
pages/4_🔮_Prédictions_IA.py
"""
import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from utils.data import load_dataset, predict_ivcs_local
from utils.theme import PALETTE, ivcs_badge


def show():
    df = load_dataset()

    st.markdown("## 🔮 Prédictions IA — IVCS Futur")
    st.caption("Simulez différents scénarios climatiques et obtenez une prédiction de l'Indice de Vulnérabilité Climatique Sanitaire")

    col_form, col_result = st.columns([1, 1])

    with col_form:
        st.markdown("### 🎛️ Paramètres du scénario")

        # Pre-fill from city
        city = st.selectbox("🏙️ Ville de référence", sorted(df["ville"].unique()),
                            index=0, key="pred_city")
        city_latest = df[df["ville"] == city].sort_values("date").iloc[-1]

        st.markdown("#### Ajustez les valeurs")
        temp = st.slider("🌡️ Température (°C)", 15.0, 45.0,
                         float(round(city_latest["temperature"], 1)), step=0.5)
        prec = st.slider("🌧️ Précipitations (mm/jour)", 0.0, 400.0,
                         float(round(city_latest["precipitation"], 0)), step=5.0)
        pm25 = st.slider("💨 PM2.5 (µg/m³)", 1.0, 150.0,
                         float(round(city_latest["pm25"], 0)), step=1.0)
        humidity = st.slider("💧 Humidité (%)", 20.0, 100.0,
                             float(round(city_latest["humidity"], 0)), step=1.0)
        wind = st.slider("🌬️ Vent (km/h)", 0.0, 60.0,
                         float(round(city_latest["wind_speed"], 0)), step=0.5)

        predict_btn = st.button("🚀 Lancer la Prédiction", use_container_width=True)

    with col_result:
        st.markdown("### 📊 Résultat")

        if predict_btn or True:  # always show initial prediction
            result = predict_ivcs_local(temp, prec, pm25, humidity, wind)
            ivcs = result["ivcs"]
            niveau = result["niveau_risque"]

            # IVCS gauge
            fig_gauge = go.Figure(go.Indicator(
                mode="gauge+number+delta",
                value=ivcs,
                number={"suffix": " / 10", "font": {"size": 36, "color": PALETTE["green"]}},
                gauge={
                    "axis": {"range": [0, 10], "tickcolor": "#64748B"},
                    "bar": {"color": PALETTE["green"]},
                    "steps": [
                        {"range": [0, 3],  "color": "rgba(16,185,129,0.2)"},
                        {"range": [3, 6],  "color": "rgba(245,158,11,0.2)"},
                        {"range": [6, 8],  "color": "rgba(239,68,68,0.2)"},
                        {"range": [8, 10], "color": "rgba(124,58,237,0.2)"},
                    ],
                    "threshold": {"line": {"color": PALETTE["red"], "width": 3}, "value": 6},
                },
                delta={"reference": city_latest["IVCS"], "valueformat": ".2f"},
                title={"text": f"IVCS Prédit — {niveau}", "font": {"size": 14, "color": "#94A3B8"}},
            ))
            fig_gauge.update_layout(
                paper_bgcolor="rgba(0,0,0,0)",
                height=240,
                margin=dict(l=20, r=20, t=40, b=10),
            )
            st.plotly_chart(fig_gauge, use_container_width=True)
            st.markdown(ivcs_badge(ivcs), unsafe_allow_html=True)

    # ── Forecast 30 jours ──────────────────────────────────────────────────
    st.divider()
    st.markdown("### 📅 Évolution Prévue (30 jours)")

    result = predict_ivcs_local(temp, prec, pm25, humidity, wind)
    forecast = result["forecast_30j"]
    dates_fc = pd.date_range(pd.Timestamp.today(), periods=30, freq="D")

    # Confidence band
    lower = [max(0, v - 0.4) for v in forecast]
    upper = [min(10, v + 0.4) for v in forecast]

    fig_fc = go.Figure()
    fig_fc.add_trace(go.Scatter(
        x=list(dates_fc) + list(reversed(dates_fc)),
        y=upper + list(reversed(lower)),
        fill="toself",
        fillcolor="rgba(16,185,129,0.12)",
        line=dict(color="rgba(0,0,0,0)"),
        name="Intervalle de confiance",
        showlegend=True,
    ))
    fig_fc.add_trace(go.Scatter(
        x=dates_fc, y=forecast,
        line=dict(color=PALETTE["green"], width=3),
        name="IVCS prédit",
        mode="lines",
    ))
    fig_fc.add_hline(y=6, line_dash="dash", line_color=PALETTE["red"],
                     annotation_text="Seuil d'alerte", annotation_position="right")
    fig_fc.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(showgrid=False),
        yaxis=dict(showgrid=True, gridcolor="#334155", range=[0, 10], title="IVCS"),
        height=300,
        margin=dict(l=0, r=0, t=10, b=0),
        legend=dict(bgcolor="rgba(0,0,0,0)"),
    )
    st.plotly_chart(fig_fc, use_container_width=True)

    # ── Feature Importance ────────────────────────────────────────────────
    st.divider()
    col_fi, col_shap = st.columns([1, 1])

    with col_fi:
        st.markdown("### 🔍 Importance des Variables")
        fi = result["feature_importance"]
        fi_df = pd.DataFrame(list(fi.items()), columns=["Variable", "Importance"])
        fi_df = fi_df.sort_values("Importance")

        fig_fi = go.Figure(go.Bar(
            x=fi_df["Importance"], y=fi_df["Variable"],
            orientation="h",
            marker=dict(
                color=fi_df["Importance"],
                colorscale=[[0, PALETTE["blue"]], [1, PALETTE["green"]]],
                showscale=False,
            ),
        ))
        fig_fi.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(showgrid=True, gridcolor="#334155", tickformat=".0%"),
            yaxis=dict(showgrid=False),
            height=260,
            margin=dict(l=0, r=0, t=10, b=0),
        )
        st.plotly_chart(fig_fi, use_container_width=True)

    with col_shap:
        st.markdown("### 🌡️ Sensibilité Paramétrique")
        temps_range = np.linspace(20, 45, 50)
        ivcs_temps = [predict_ivcs_local(t, prec, pm25, humidity, wind)["ivcs"] for t in temps_range]

        fig_sens = go.Figure()
        fig_sens.add_trace(go.Scatter(
            x=temps_range, y=ivcs_temps,
            line=dict(color=PALETTE["orange"], width=2.5),
            fill="tozeroy",
            fillcolor="rgba(245,158,11,0.1)",
            name="IVCS vs Température",
        ))
        fig_sens.add_vline(x=temp, line_dash="dash", line_color="#10B981",
                           annotation_text=f"Actuel: {temp}°C")
        fig_sens.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title="Température (°C)", showgrid=False),
            yaxis=dict(title="IVCS", showgrid=True, gridcolor="#334155", range=[0, 10]),
            height=260,
            margin=dict(l=0, r=0, t=10, b=0),
            showlegend=False,
        )
        st.plotly_chart(fig_sens, use_container_width=True)

    # ── Scénarios prédéfinis ──────────────────────────────────────────────
    st.divider()
    st.markdown("### 🌐 Scénarios Climatiques 2030–2050")
    scenarios = [
        {"Scénario": "Optimiste (RCP 2.6)", "temp_delta": +0.8, "prec_delta": +10, "pm25_delta": -5},
        {"Scénario": "Modéré (RCP 4.5)",    "temp_delta": +1.5, "prec_delta": -15, "pm25_delta": +3},
        {"Scénario": "Pessimiste (RCP 8.5)", "temp_delta": +3.2, "prec_delta": -40, "pm25_delta": +15},
    ]

    sc_results = []
    for sc in scenarios:
        r = predict_ivcs_local(
            temp + sc["temp_delta"],
            max(0, prec + sc["prec_delta"]),
            max(1, pm25 + sc["pm25_delta"]),
            humidity, wind
        )
        sc_results.append({
            "Scénario": sc["Scénario"],
            "IVCS Prédit": round(r["ivcs"], 2),
            "Niveau": r["niveau_risque"],
            "ΔTemp": f"+{sc['temp_delta']}°C",
        })

    sc_df = pd.DataFrame(sc_results)
    fig_sc = px.bar(sc_df, x="Scénario", y="IVCS Prédit", color="IVCS Prédit",
                    color_continuous_scale=[[0, "#10B981"], [0.5, "#F59E0B"], [1, "#EF4444"]],
                    range_color=[0, 10], text="IVCS Prédit")
    fig_sc.update_traces(textposition="outside")
    fig_sc.add_hline(y=6, line_dash="dash", line_color=PALETTE["red"])
    fig_sc.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        showlegend=False,
        coloraxis_showscale=False,
        xaxis=dict(showgrid=False),
        yaxis=dict(showgrid=True, gridcolor="#334155", range=[0, 10]),
        height=300,
        margin=dict(l=0, r=0, t=10, b=0),
    )
    st.plotly_chart(fig_sc, use_container_width=True)
