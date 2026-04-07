"""
pages/6_📊_Comparaisons_Régionales.py
"""
import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from utils.data import load_dataset, get_latest_data, get_regional_summary
from utils.theme import PALETTE


def show():
    df = load_dataset()
    latest = get_latest_data(df)
    regional = get_regional_summary(df)

    st.markdown("## 📊 Comparaisons Régionales")
    st.caption("Analyse comparative des 10 régions du Cameroun sur tous les indicateurs climato-sanitaires")

    # ── Sélecteur de régions ──────────────────────────────────────────────
    all_regions = sorted(df["region"].unique())
    selected = st.multiselect("📍 Régions à comparer", all_regions, default=all_regions)
    reg_data = regional[regional["region"].isin(selected)]

    if reg_data.empty:
        st.warning("Sélectionnez au moins une région.")
        return

    # ── Barres groupées ───────────────────────────────────────────────────
    st.markdown("### 📊 Indicateurs Clés par Région")
    tab1, tab2, tab3 = st.tabs(["IVCS & Température", "Qualité de l'Air", "Santé"])

    with tab1:
        fig = go.Figure()
        fig.add_trace(go.Bar(name="IVCS Moyen", x=reg_data["region"], y=reg_data["IVCS_moyen"].round(2),
                             marker_color=PALETTE["green"], yaxis="y"))
        fig.add_trace(go.Scatter(name="Temp. Moy. (°C)", x=reg_data["region"], y=reg_data["temp_moyenne"].round(1),
                                 mode="lines+markers", line=dict(color=PALETTE["orange"], width=2.5),
                                 marker=dict(size=8), yaxis="y2"))
        fig.update_layout(
            barmode="group",
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            yaxis=dict(title="IVCS", showgrid=True, gridcolor="#334155"),
            yaxis2=dict(title="Température (°C)", overlaying="y", side="right", showgrid=False),
            legend=dict(bgcolor="rgba(0,0,0,0)"),
            xaxis=dict(showgrid=False),
            height=360,
            margin=dict(l=0, r=0, t=10, b=0),
        )
        st.plotly_chart(fig, use_container_width=True)

    with tab2:
        reg_air = latest[latest["region"].isin(selected)].groupby("region").agg(
            pm25=("pm25","mean"), pm10=("pm10","mean"), uv=("uv_index","mean")
        ).reset_index()
        fig2 = go.Figure()
        fig2.add_trace(go.Bar(name="PM2.5", x=reg_air["region"], y=reg_air["pm25"].round(1),
                              marker_color=PALETTE["red"]))
        fig2.add_trace(go.Bar(name="PM10", x=reg_air["region"], y=reg_air["pm10"].round(1),
                              marker_color=PALETTE["gray"]))
        fig2.add_hline(y=15, line_dash="dot", line_color=PALETTE["orange"],
                       annotation_text="OMS PM2.5")
        fig2.update_layout(
            barmode="group",
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(showgrid=False),
            yaxis=dict(showgrid=True, gridcolor="#334155", title="µg/m³"),
            legend=dict(bgcolor="rgba(0,0,0,0)"),
            height=340,
            margin=dict(l=0, r=0, t=10, b=0),
        )
        st.plotly_chart(fig2, use_container_width=True)

    with tab3:
        reg_health = latest[latest["region"].isin(selected)].groupby("region").agg(
            palu=("risque_paludisme","mean"),
            stress=("stress_thermique","mean"),
            secheresse=("secheresse_agricole","mean"),
        ).reset_index()
        fig3 = px.bar(reg_health, x="region",
                      y=["palu","stress","secheresse"],
                      barmode="group",
                      labels={"value":"Score","variable":"Indicateur","region":"Région"},
                      color_discrete_map={"palu":PALETTE["blue"],"stress":PALETTE["orange"],"secheresse":PALETTE["red"]},
                      )
        fig3.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(showgrid=False),
            yaxis=dict(showgrid=True, gridcolor="#334155"),
            legend=dict(bgcolor="rgba(0,0,0,0)",
                        title="",
                        itemsizing="constant"),
            height=340,
            margin=dict(l=0, r=0, t=10, b=0),
        )
        st.plotly_chart(fig3, use_container_width=True)

    st.divider()

    # ── Radar chart ───────────────────────────────────────────────────────
    st.markdown("### 🕸️ Radar — Profil Multi-Indicateurs")
    categories = ["IVCS", "PM2.5", "Temp.", "Préc.", "Risq. Palu.", "Stress"]
    colors = [PALETTE["green"], PALETTE["blue"], PALETTE["orange"], PALETTE["red"],
              PALETTE["gray"], "#7C3AED", "#EC4899", "#14B8A6", "#8B5CF6", "#F97316"]

    radar_data = latest[latest["region"].isin(selected)].groupby("region").agg(
        IVCS=("IVCS","mean"),
        pm25=("pm25","mean"),
        temp=("temperature","mean"),
        prec=("precipitation","mean"),
        palu=("risque_paludisme","mean"),
        stress=("stress_thermique","mean"),
    ).reset_index()

    # Normalize each column 0-1
    for col in ["IVCS","pm25","temp","prec","palu","stress"]:
        mn, mx = radar_data[col].min(), radar_data[col].max()
        radar_data[col+"_n"] = (radar_data[col] - mn) / (mx - mn + 1e-9)

    norm_cols = ["IVCS_n","pm25_n","temp_n","prec_n","palu_n","stress_n"]

    fig_radar = go.Figure()
    for i, (_, row) in enumerate(radar_data.iterrows()):
        vals = [row[c] for c in norm_cols]
        vals += [vals[0]]  # close polygon
        fig_radar.add_trace(go.Scatterpolar(
            r=vals,
            theta=categories + [categories[0]],
            fill="toself",
            name=row["region"],
            line=dict(color=colors[i % len(colors)], width=2),
            fillcolor=colors[i % len(colors)].replace("#","") ,
            opacity=0.15,
        ))

    fig_radar.update_layout(
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 1], gridcolor="#334155"),
            angularaxis=dict(gridcolor="#334155"),
            bgcolor="rgba(0,0,0,0)",
        ),
        paper_bgcolor="rgba(0,0,0,0)",
        showlegend=True,
        legend=dict(bgcolor="rgba(0,0,0,0)"),
        height=440,
        margin=dict(l=30, r=30, t=10, b=30),
    )
    st.plotly_chart(fig_radar, use_container_width=True)

    st.divider()

    # ── Coordonnées parallèles ────────────────────────────────────────────
    st.markdown("### ↔️ Coordonnées Parallèles")
    latest_sel = latest[latest["region"].isin(selected)].copy()
    region_codes = {r: i for i, r in enumerate(latest_sel["region"].unique())}
    latest_sel["region_code"] = latest_sel["region"].map(region_codes)

    fig_par = px.parallel_coordinates(
        latest_sel.sample(min(500, len(latest_sel)), random_state=42),
        dimensions=["temperature","precipitation","pm25","IVCS","risque_paludisme","stress_thermique"],
        color="IVCS",
        color_continuous_scale=[[0,"#10B981"],[0.5,"#F59E0B"],[1,"#EF4444"]],
        range_color=[0, 10],
        labels={
            "temperature":"Temp.", "precipitation":"Préc.",
            "pm25":"PM2.5","IVCS":"IVCS",
            "risque_paludisme":"Paludisme","stress_thermique":"Stress",
        },
    )
    fig_par.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        height=380,
        margin=dict(l=20, r=20, t=30, b=20),
        coloraxis_colorbar=dict(title="IVCS", thickness=12),
    )
    st.plotly_chart(fig_par, use_container_width=True)

    st.divider()

    # ── Ranking table ─────────────────────────────────────────────────────
    st.markdown("### 🏆 Classement des Régions")
    rank = regional[regional["region"].isin(selected)].sort_values("IVCS_moyen", ascending=False).copy()
    rank["Rang"] = range(1, len(rank)+1)
    rank = rank[["Rang","region","IVCS_moyen","temp_moyenne","pm25_moyen","risque_paludisme","nb_villes"]]
    rank.columns = ["Rang","Région","IVCS","Temp.(°C)","PM2.5","Risq.Palu.","Villes"]
    rank = rank.round(2)
    st.dataframe(rank, use_container_width=True, hide_index=True)

    # Download
    import io
    buf = io.StringIO()
    rank.to_csv(buf, index=False)
    st.download_button("⬇️ Exporter classement CSV", buf.getvalue(), "classement_regions.csv", "text/csv")
