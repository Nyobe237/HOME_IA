"""
pages/3_📈_Analyse_Temporelle.py
"""
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import io
from utils.data import load_dataset, get_city_timeseries
from utils.theme import PALETTE


def show():
    df = load_dataset()
    all_cities = sorted(df["ville"].unique())

    st.markdown("## 📈 Analyse Temporelle")
    st.caption("Évolution des indicateurs climatiques et sanitaires dans le temps")

    # Controls
    col1, col2, col3 = st.columns([2, 2, 1])
    with col1:
        city = st.selectbox("🏙️ Ville", all_cities, index=all_cities.index("Yaoundé") if "Yaoundé" in all_cities else 0)
    with col2:
        years = st.multiselect("📅 Années", list(range(2020, 2026)), default=[2023, 2024, 2025])
    with col3:
        agg = st.selectbox("📊 Agrégation", ["Hebdo.", "Mensuel", "Annuel"])

    if not years:
        st.warning("Sélectionnez au moins une année.")
        return

    city_df = get_city_timeseries(df, city, years)

    if city_df.empty:
        st.error("Aucune donnée pour cette sélection.")
        return

    # Resample
    freq = {"Hebdo.": "W", "Mensuel": "ME", "Annuel": "YE"}[agg]
    city_agg = city_df.set_index("date").resample(freq).mean(numeric_only=True).reset_index()

    # ── Multi-panel chart ─────────────────────────────────────────────────
    fig = make_subplots(
        rows=4, cols=1,
        shared_xaxes=True,
        subplot_titles=["🌡️ Température (°C)", "🌧️ Précipitations (mm)", "💨 PM2.5 (µg/m³)", "📊 IVCS"],
        vertical_spacing=0.06,
        row_heights=[0.28, 0.24, 0.24, 0.24],
    )

    def add_line(fig, col, row, color, name):
        if col not in city_agg.columns:
            return
        fig.add_trace(go.Scatter(
            x=city_agg["date"], y=city_agg[col],
            name=name, line=dict(color=color, width=2.5),
            fill="tozeroy", fillcolor=color.replace(")", ",0.10)").replace("rgb", "rgba") if color.startswith("rgb") else color + "1a",
            mode="lines",
        ), row=row, col=1)

    fig.add_trace(go.Scatter(
        x=city_agg["date"], y=city_agg.get("temperature"),
        name="Température", line=dict(color=PALETTE["orange"], width=2.5),
        fill="tozeroy", fillcolor="rgba(245,158,11,0.1)", mode="lines",
    ), row=1, col=1)

    fig.add_trace(go.Bar(
        x=city_agg["date"], y=city_agg.get("precipitation"),
        name="Précipitations", marker_color=PALETTE["blue"], opacity=0.7,
    ), row=2, col=1)

    fig.add_trace(go.Scatter(
        x=city_agg["date"], y=city_agg.get("pm25"),
        name="PM2.5", line=dict(color=PALETTE["gray"], width=2),
        fill="tozeroy", fillcolor="rgba(100,116,139,0.12)", mode="lines",
    ), row=3, col=1)

    fig.add_trace(go.Scatter(
        x=city_agg["date"], y=city_agg.get("IVCS"),
        name="IVCS", line=dict(color=PALETTE["green"], width=3),
        fill="tozeroy", fillcolor="rgba(16,185,129,0.15)", mode="lines",
    ), row=4, col=1)

    # Alert line
    fig.add_hline(y=6, line_dash="dash", line_color=PALETTE["red"], row=4, col=1,
                  annotation_text="Seuil 6", annotation_font_color=PALETTE["red"])

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        height=680,
        showlegend=False,
        margin=dict(l=0, r=0, t=30, b=0),
    )
    fig.update_xaxes(showgrid=False, gridcolor="#334155")
    fig.update_yaxes(showgrid=True, gridcolor="#1E293B", zeroline=False)

    st.plotly_chart(fig, use_container_width=True)

    # Export
    buf = io.StringIO()
    city_df.to_csv(buf, index=False)
    st.download_button("⬇️ Exporter CSV", buf.getvalue(), f"{city}_data.csv", "text/csv")

    st.divider()

    # ── Comparaison avant/après 2023 ──────────────────────────────────────
    st.markdown("### 🔄 Avant / Après 2023 — Signal Changement Climatique")

    before = df[(df["ville"] == city) & (df["date"].dt.year < 2023)]
    after  = df[(df["ville"] == city) & (df["date"].dt.year >= 2023)]

    compare_data = {
        "Indicateur": ["Température (°C)", "Précipitations (mm)", "PM2.5 (µg/m³)", "IVCS", "Risque Paludisme"],
        "Avant 2023": [
            before["temperature"].mean(), before["precipitation"].mean(),
            before["pm25"].mean(), before["IVCS"].mean(), before["risque_paludisme"].mean()
        ],
        "Après 2023": [
            after["temperature"].mean(), after["precipitation"].mean(),
            after["pm25"].mean(), after["IVCS"].mean(), after["risque_paludisme"].mean()
        ],
    }
    cdf = pd.DataFrame(compare_data)
    cdf["Δ"] = cdf["Après 2023"] - cdf["Avant 2023"]
    cdf["Δ%"] = (cdf["Δ"] / cdf["Avant 2023"].abs() * 100).round(1)

    fig2 = go.Figure()
    fig2.add_trace(go.Bar(name="Avant 2023", x=cdf["Indicateur"], y=cdf["Avant 2023"],
                          marker_color=PALETTE["blue"], opacity=0.85))
    fig2.add_trace(go.Bar(name="Après 2023", x=cdf["Indicateur"], y=cdf["Après 2023"],
                          marker_color=PALETTE["orange"], opacity=0.85))
    fig2.update_layout(
        barmode="group",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(showgrid=False),
        yaxis=dict(showgrid=True, gridcolor="#334155"),
        legend=dict(bgcolor="rgba(0,0,0,0)"),
        height=320,
        margin=dict(l=0, r=0, t=10, b=0),
    )
    st.plotly_chart(fig2, use_container_width=True)

    # Delta table
    cdf_display = cdf.copy()
    cdf_display["Avant 2023"] = cdf_display["Avant 2023"].round(2)
    cdf_display["Après 2023"] = cdf_display["Après 2023"].round(2)
    cdf_display["Δ"] = cdf_display["Δ"].round(3)
    st.dataframe(cdf_display, use_container_width=True, hide_index=True)

    st.divider()

    # ── Monthly seasonality ───────────────────────────────────────────────
    st.markdown("### 🗓️ Saisonnalité Mensuelle")
    city_full = df[df["ville"] == city].copy()
    city_full["mois"] = city_full["date"].dt.month
    monthly = city_full.groupby("mois").agg(
        temp=("temperature", "mean"),
        prec=("precipitation", "mean"),
        pm25=("pm25", "mean"),
        ivcs=("IVCS", "mean"),
    ).reset_index()
    month_names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    monthly["mois_nom"] = monthly["mois"].apply(lambda x: month_names[x-1])

    fig3 = px.line_polar(
        pd.DataFrame({
            "mois": month_names,
            "IVCS": monthly["ivcs"].values,
        }),
        r="IVCS", theta="mois", line_close=True,
        color_discrete_sequence=[PALETTE["green"]],
    )
    fig3.update_traces(fill="toself", fillcolor="rgba(16,185,129,0.2)")
    fig3.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        polar=dict(bgcolor="rgba(0,0,0,0)"),
        height=340,
        margin=dict(l=0, r=0, t=10, b=0),
    )
    st.plotly_chart(fig3, use_container_width=True)
