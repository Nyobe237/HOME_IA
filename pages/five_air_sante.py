"""
pages/5_🌬️_Qualité_Air_Santé.py
"""
import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
import altair as alt
from utils.data import load_dataset, get_latest_data
from utils.theme import PALETTE


WHO_PM25 = 15   # WHO annual guideline µg/m³
WHO_PM10 = 45


def aqi_label(pm25):
    if pm25 <= 12:   return "Bon",        "#10B981"
    if pm25 <= 35:   return "Modéré",     "#F59E0B"
    if pm25 <= 55:   return "Mauvais",    "#EF4444"
    if pm25 <= 150:  return "Très mauvais","#7C3AED"
    return "Dangereux", "#991B1B"


def show():
    df = load_dataset()
    latest = get_latest_data(df)

    st.markdown("## 🌬️ Qualité de l'Air & Santé Environnementale")
    st.caption("Surveillance des polluants atmosphériques et indices de santé liés au climat")

    # ── Top KPIs ──────────────────────────────────────────────────────────
    k1, k2, k3, k4, k5 = st.columns(5)
    pm25_nat  = latest["pm25"].mean()
    pm10_nat  = latest["pm10"].mean()
    uv_nat    = latest["uv_index"].mean()
    palu_nat  = latest["risque_paludisme"].mean()
    stress_nat= latest["stress_thermique"].mean()

    lbl, col = aqi_label(pm25_nat)
    k1.metric("💨 PM2.5 National", f"{pm25_nat:.1f} µg/m³",
              delta=f"OMS: {WHO_PM25}", delta_color="inverse")
    k2.metric("🌫️ PM10 National", f"{pm10_nat:.1f} µg/m³")
    k3.metric("☀️ UV Index", f"{uv_nat:.1f}")
    k4.metric("🦟 Risque Paludisme", f"{palu_nat:.2f}")
    k5.metric("🌡️ Stress Thermique", f"{stress_nat:.2f}")

    st.divider()

    # ── PM2.5 Map by city ─────────────────────────────────────────────────
    col_map, col_bar = st.columns([3, 2])

    with col_map:
        st.markdown("### 🗺️ PM2.5 par ville")
        latest_sorted = latest.sort_values("pm25", ascending=False)
        fig_map = px.scatter_geo(
            latest_sorted, lat="lat", lon="lon",
            color="pm25", size="pm25",
            hover_name="ville",
            hover_data={"pm25": ":.1f", "pm10": ":.1f"},
            color_continuous_scale=[[0,"#10B981"],[0.4,"#F59E0B"],[0.7,"#EF4444"],[1,"#7C3AED"]],
            range_color=[0, 80],
            scope="africa", size_max=22,
            projection="natural earth",
        )
        fig_map.update_geos(fitbounds="locations", showland=True, landcolor="#1E293B",
                            showocean=True, oceancolor="#0F172A", bgcolor="rgba(0,0,0,0)")
        fig_map.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", height=350,
            coloraxis_colorbar=dict(title="PM2.5<br>(µg/m³)", thickness=12),
            margin=dict(l=0, r=0, t=0, b=0),
        )
        st.plotly_chart(fig_map, use_container_width=True)

    with col_bar:
        st.markdown("### 🏆 Top 10 villes polluées")
        top10 = latest_sorted.head(10)
        colors = [aqi_label(v)[1] for v in top10["pm25"]]
        fig_bar = go.Figure(go.Bar(
            x=top10["pm25"], y=top10["ville"],
            orientation="h",
            marker_color=colors,
            text=top10["pm25"].round(1),
            textposition="outside",
        ))
        fig_bar.add_vline(x=WHO_PM25, line_dash="dash", line_color=PALETTE["red"],
                          annotation_text=f"OMS {WHO_PM25}", annotation_position="top right")
        fig_bar.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(showgrid=True, gridcolor="#334155", title="PM2.5 (µg/m³)"),
            yaxis=dict(showgrid=False, autorange="reversed"),
            height=350,
            margin=dict(l=0, r=0, t=10, b=0),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    st.divider()

    # ── Calendar heatmap (Altair) ─────────────────────────────────────────
    st.markdown("### 📅 Heatmap Calendrier PM2.5 — 2024")
    city_cal = st.selectbox("🏙️ Ville", sorted(df["ville"].unique()), key="cal_city",
                            index=0)
    cal_df = df[(df["ville"] == city_cal) & (df["date"].dt.year == 2024)].copy()

    if not cal_df.empty:
        cal_df["week"] = cal_df["date"].dt.isocalendar().week.astype(int)
        cal_df["weekday"] = cal_df["date"].dt.weekday
        cal_df["day_name"] = cal_df["date"].dt.strftime("%a")
        cal_df["month"] = cal_df["date"].dt.strftime("%b")

        chart = alt.Chart(cal_df).mark_rect(cornerRadius=2).encode(
            x=alt.X("week:O", title="Semaine", axis=alt.Axis(labelAngle=0)),
            y=alt.Y("weekday:O", title="",
                    axis=alt.Axis(labelExpr="['Lu','Ma','Me','Je','Ve','Sa','Di'][datum.value]")),
            color=alt.Color("pm25:Q",
                            scale=alt.Scale(
                                domain=[0, 15, 35, 55, 80],
                                range=["#10B981","#F59E0B","#EF4444","#7C3AED","#991B1B"]
                            ),
                            legend=alt.Legend(title="PM2.5 (µg/m³)")),
            tooltip=["date:T","pm25:Q","month:N"],
        ).properties(height=160, width="container").configure_view(
            strokeWidth=0
        ).configure_axis(
            labelColor="#94A3B8", titleColor="#94A3B8", gridColor="#334155"
        )
        st.altair_chart(chart, use_container_width=True)

    st.divider()

    # ── Multi-indicator by region ─────────────────────────────────────────
    st.markdown("### 🗂️ Indicateurs de Santé par Région")
    reg_df = latest.groupby("region").agg(
        pm25=("pm25", "mean"),
        pm10=("pm10", "mean"),
        uv_index=("uv_index", "mean"),
        risque_paludisme=("risque_paludisme", "mean"),
        stress_thermique=("stress_thermique", "mean"),
        indice_pollution_respiratoire=("indice_pollution_respiratoire", "mean"),
    ).reset_index()

    # Normalize 0-1 for heatmap
    norm_cols = ["pm25","pm10","uv_index","risque_paludisme","stress_thermique","indice_pollution_respiratoire"]
    heat_data = reg_df[["region"] + norm_cols].copy()
    for c in norm_cols:
        mn, mx = heat_data[c].min(), heat_data[c].max()
        heat_data[c] = ((heat_data[c] - mn) / (mx - mn + 1e-9)).round(3)

    heat_melt = heat_data.melt(id_vars="region", var_name="Indicateur", value_name="Score")
    label_map = {
        "pm25": "PM2.5",
        "pm10": "PM10",
        "uv_index": "UV Index",
        "risque_paludisme": "Risque Paludisme",
        "stress_thermique": "Stress Thermique",
        "indice_pollution_respiratoire": "Pollution Resp.",
    }
    heat_melt["Indicateur"] = heat_melt["Indicateur"].map(label_map)

    fig_heat = px.imshow(
        heat_data.set_index("region")[norm_cols].rename(columns=label_map),
        color_continuous_scale=[[0,"#10B981"],[0.5,"#F59E0B"],[1,"#EF4444"]],
        aspect="auto",
        labels=dict(color="Score normalisé"),
        text_auto=".2f",
    )
    fig_heat.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        height=380,
        margin=dict(l=0, r=0, t=10, b=0),
        coloraxis_showscale=True,
        xaxis=dict(side="top"),
    )
    st.plotly_chart(fig_heat, use_container_width=True)

    # ── Time trend PM2.5 ──────────────────────────────────────────────────
    st.divider()
    st.markdown("### 📈 Tendance PM2.5 — Toutes Régions (2020–2025)")
    pm25_time = df.copy()
    pm25_time["année"] = pm25_time["date"].dt.year
    pm25_reg = pm25_time.groupby(["année","region"])["pm25"].mean().reset_index()

    fig_trend = px.line(pm25_reg, x="année", y="pm25", color="region",
                        color_discrete_sequence=px.colors.qualitative.Pastel,
                        markers=True)
    fig_trend.add_hline(y=WHO_PM25, line_dash="dot", line_color=PALETTE["red"],
                        annotation_text=f"Seuil OMS ({WHO_PM25} µg/m³)")
    fig_trend.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(showgrid=False, title=""),
        yaxis=dict(showgrid=True, gridcolor="#334155", title="PM2.5 (µg/m³)"),
        legend=dict(bgcolor="rgba(0,0,0,0)", title="Région"),
        height=360,
        margin=dict(l=0, r=0, t=10, b=0),
    )
    st.plotly_chart(fig_trend, use_container_width=True)
