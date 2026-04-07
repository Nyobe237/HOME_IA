"""
pages/1_🏠_Accueil.py
"""
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from utils.data import load_dataset, get_latest_data, get_regional_summary
from utils.theme import ivcs_badge, PALETTE


def show():
    df = load_dataset()
    latest = get_latest_data(df)
    regional = get_regional_summary(df)

    # ── Hero ──────────────────────────────────────────────────────────────
    st.markdown("""
    <div style="text-align:center;padding:30px 0 10px">
        <div class="hero-title">🌍 ClimaResist AI</div>
        <div class="hero-sub">
            Résilience Climatique & Sanitaire au Cameroun<br>
            <span style="font-size:0.9em;opacity:0.7">Hackathon IndabaX Cameroun 2026</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.divider()

    # ── KPIs nationaux ────────────────────────────────────────────────────
    st.markdown("### 📊 Indicateurs Nationaux")
    ivcs_moy = latest["IVCS"].mean()
    alerte = (latest["IVCS"] >= 6).sum()
    temp_moy = latest["temperature"].mean()
    pm25_moy = latest["pm25"].mean()

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric("🌡️ IVCS Moyen National", f"{ivcs_moy:.2f} / 10",
                  delta=f"+0.18 vs 2024", delta_color="inverse")
    with c2:
        st.metric("🚨 Villes en Alerte (IVCS ≥ 6)", f"{alerte} / {len(latest)}")
    with c3:
        st.metric("🌡️ Température Moyenne", f"{temp_moy:.1f}°C",
                  delta="+0.3°C vs 2023", delta_color="inverse")
    with c4:
        st.metric("💨 PM2.5 Moyen", f"{pm25_moy:.1f} µg/m³",
                  delta="-1.2 vs 2023", delta_color="normal")

    st.divider()

    # ── Carte simplifiée + Alertes ────────────────────────────────────────
    col_map, col_alert = st.columns([3, 2])

    with col_map:
        st.markdown("### 🗺️ IVCS par Région")
        fig = px.scatter_geo(
            latest,
            lat="lat", lon="lon",
            color="IVCS",
            size="IVCS",
            hover_name="ville",
            hover_data={"temperature": ":.1f", "pm25": ":.1f", "IVCS": ":.2f"},
            color_continuous_scale=["#10B981", "#F59E0B", "#EF4444", "#7C3AED"],
            range_color=[0, 10],
            scope="africa",
            center={"lat": 5.5, "lon": 12.0},
            size_max=25,
            projection="natural earth",
            title="",
        )
        fig.update_geos(
            fitbounds="locations",
            showcoastlines=True, coastlinecolor="#334155",
            showland=True, landcolor="#1E293B",
            showocean=True, oceancolor="#0F172A",
            bgcolor="rgba(0,0,0,0)",
        )
        fig.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            geo_bgcolor="rgba(0,0,0,0)",
            coloraxis_colorbar=dict(title="IVCS", thickness=12, len=0.6),
            margin=dict(l=0, r=0, t=0, b=0),
            height=360,
        )
        st.plotly_chart(fig, use_container_width=True)

    with col_alert:
        st.markdown("### 🚨 Alertes Climato-Sanitaires")
        top_risk = latest.nlargest(6, "IVCS")[["ville", "region", "IVCS", "pm25", "temperature"]]
        for _, row in top_risk.iterrows():
            badge = ivcs_badge(row["IVCS"])
            st.markdown(f"""
            <div class="climaresist-card" style="padding:12px 16px;margin:6px 0">
                <strong>🏙️ {row['ville']}</strong> — {row['region']}<br>
                {badge}<br>
                <span style="font-size:0.82em;opacity:0.7">
                🌡️ {row['temperature']:.1f}°C &nbsp;|&nbsp; 💨 PM2.5: {row['pm25']:.1f} µg/m³
                </span>
            </div>
            """, unsafe_allow_html=True)

    st.divider()

    # ── Évolution 2020-2025 ───────────────────────────────────────────────
    st.markdown("### 📈 Évolution IVCS National (2020–2025)")
    yearly = df.groupby(df["date"].dt.year)["IVCS"].mean().reset_index()
    yearly.columns = ["Année", "IVCS"]

    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(
        x=yearly["Année"], y=yearly["IVCS"],
        mode="lines+markers",
        fill="tozeroy",
        fillcolor="rgba(16,185,129,0.15)",
        line=dict(color=PALETTE["green"], width=3),
        marker=dict(size=8, color=PALETTE["green"]),
        name="IVCS moyen"
    ))
    fig2.add_hline(y=6, line_dash="dash", line_color=PALETTE["red"],
                   annotation_text="Seuil d'alerte (6)", annotation_position="right")
    fig2.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(showgrid=False, title=""),
        yaxis=dict(showgrid=True, gridcolor="#334155", title="IVCS", range=[0, 10]),
        height=260,
        margin=dict(l=0, r=0, t=10, b=0),
        showlegend=False,
    )
    st.plotly_chart(fig2, use_container_width=True)

    # ── Tableau top villes ────────────────────────────────────────────────
    st.divider()
    st.markdown("### 📋 Vue d'ensemble par Région")
    regional_disp = regional.copy()
    regional_disp["IVCS_moyen"] = regional_disp["IVCS_moyen"].round(2)
    regional_disp["temp_moyenne"] = regional_disp["temp_moyenne"].round(1)
    regional_disp["pm25_moyen"] = regional_disp["pm25_moyen"].round(1)
    regional_disp.columns = ["Région", "IVCS Moy.", "Temp. (°C)", "PM2.5", "Préc.", "Risq. Palu.", "Villes"]
    st.dataframe(
        regional_disp[["Région", "IVCS Moy.", "Temp. (°C)", "PM2.5", "Villes"]],
        use_container_width=True,
        hide_index=True,
    )
