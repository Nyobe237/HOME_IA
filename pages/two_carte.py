"""
pages/2_🗺️_Carte_Interactive.py
"""
import streamlit as st
import pandas as pd
import folium
from folium.plugins import HeatMap, MarkerCluster
from streamlit_folium import st_folium
import json
from utils.data import load_dataset, get_latest_data, get_regional_summary
from utils.theme import PALETTE


def ivcs_color(val):
    if val < 3:   return "#10B981"
    if val < 6:   return "#F59E0B"
    if val < 8:   return "#EF4444"
    return "#7C3AED"


def pm25_color(val):
    if val < 12:  return "#10B981"
    if val < 35:  return "#F59E0B"
    if val < 55:  return "#EF4444"
    return "#7C3AED"


def build_popup(row: pd.Series) -> str:
    color = ivcs_color(row["IVCS"])
    return f"""
    <div style="font-family:Inter,sans-serif;min-width:220px">
        <h4 style="margin:0 0 8px;color:#0F172A">🏙️ {row['ville']}</h4>
        <p style="margin:2px 0;color:#64748B;font-size:12px">{row['region']}</p>
        <hr style="border-color:#E2E8F0;margin:8px 0">
        <div style="background:{color};color:white;border-radius:20px;
             padding:4px 12px;display:inline-block;font-size:12px;font-weight:600;margin-bottom:8px">
            IVCS: {row['IVCS']:.2f} / 10
        </div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
            <tr><td style="color:#64748B">🌡️ Température</td>
                <td style="text-align:right;font-weight:600">{row['temperature']:.1f}°C</td></tr>
            <tr><td style="color:#64748B">🌧️ Précipitations</td>
                <td style="text-align:right;font-weight:600">{row['precipitation']:.1f} mm</td></tr>
            <tr><td style="color:#64748B">💨 PM2.5</td>
                <td style="text-align:right;font-weight:600">{row['pm25']:.1f} µg/m³</td></tr>
            <tr><td style="color:#64748B">🌬️ Vent</td>
                <td style="text-align:right;font-weight:600">{row['wind_speed']:.1f} km/h</td></tr>
            <tr><td style="color:#64748B">🦟 Risque Paludisme</td>
                <td style="text-align:right;font-weight:600">{row['risque_paludisme']:.2f}</td></tr>
            <tr><td style="color:#64748B">☀️ UV Index</td>
                <td style="text-align:right;font-weight:600">{row['uv_index']:.1f}</td></tr>
        </table>
        <p style="font-size:10px;color:#94A3B8;margin:8px 0 0">
            Mise à jour: {str(row.get('date',''))[:10]}
        </p>
    </div>
    """


def show():
    df = load_dataset()
    latest = get_latest_data(df)

    st.markdown("## 🗺️ Carte Interactive — Cameroun")
    st.caption("Visualisation géospatiale des indicateurs climato-sanitaires pour les 40 villes")

    # Controls
    col1, col2, col3 = st.columns(3)
    with col1:
        layer = st.selectbox("📍 Couche principale", [
            "IVCS (Vulnérabilité)", "Qualité de l'air (PM2.5)",
            "Risque Paludisme", "Stress Thermique", "Précipitations"
        ])
    with col2:
        map_style = st.selectbox("🗾 Fond de carte", [
            "CartoDB dark_matter", "CartoDB positron",
            "OpenStreetMap", "Stamen Toner"
        ])
    with col3:
        show_heat = st.checkbox("🔥 Heatmap", value=False)

    # Build map
    m = folium.Map(
        location=[5.5, 12.0],
        zoom_start=6,
        tiles=map_style.replace(" ", "_").lower() if "CartoDB" not in map_style else map_style,
        control_scale=True,
    )

    # ── Layers ────────────────────────────────────────────────────────────
    layer_ivcs    = folium.FeatureGroup(name="🟢 IVCS")
    layer_air     = folium.FeatureGroup(name="💨 Qualité Air (PM2.5)")
    layer_palu    = folium.FeatureGroup(name="🦟 Risque Paludisme")
    layer_stress  = folium.FeatureGroup(name="🌡️ Stress Thermique")
    layer_prec    = folium.FeatureGroup(name="🌧️ Précipitations")

    for _, row in latest.iterrows():
        popup_html = build_popup(row)
        popup = folium.Popup(folium.IFrame(popup_html, width=260, height=280), max_width=280)

        # IVCS layer
        folium.CircleMarker(
            location=[row["lat"], row["lon"]],
            radius=max(6, row["IVCS"] * 2.2),
            color=ivcs_color(row["IVCS"]),
            fill=True,
            fill_color=ivcs_color(row["IVCS"]),
            fill_opacity=0.75,
            popup=popup,
            tooltip=f"{row['ville']} — IVCS: {row['IVCS']:.2f}",
        ).add_to(layer_ivcs)

        # PM2.5 layer
        folium.CircleMarker(
            location=[row["lat"], row["lon"]],
            radius=max(5, row["pm25"] * 0.4),
            color=pm25_color(row["pm25"]),
            fill=True,
            fill_color=pm25_color(row["pm25"]),
            fill_opacity=0.7,
            popup=popup,
            tooltip=f"{row['ville']} — PM2.5: {row['pm25']:.1f} µg/m³",
        ).add_to(layer_air)

        # Paludisme layer
        palu_color = "#10B981" if row["risque_paludisme"] < 0.3 else ("#F59E0B" if row["risque_paludisme"] < 0.6 else "#EF4444")
        folium.CircleMarker(
            location=[row["lat"], row["lon"]],
            radius=max(5, row["risque_paludisme"] * 20),
            color=palu_color,
            fill=True, fill_color=palu_color, fill_opacity=0.7,
            popup=popup,
            tooltip=f"{row['ville']} — Risque: {row['risque_paludisme']:.2f}",
        ).add_to(layer_palu)

        # Stress thermique layer
        st_val = row["stress_thermique"]
        st_color = "#10B981" if st_val < 0.2 else ("#F59E0B" if st_val < 0.5 else "#EF4444")
        folium.CircleMarker(
            location=[row["lat"], row["lon"]],
            radius=max(5, st_val * 15 + 5),
            color=st_color,
            fill=True, fill_color=st_color, fill_opacity=0.7,
            popup=popup,
            tooltip=f"{row['ville']} — Stress: {st_val:.2f}",
        ).add_to(layer_stress)

        # Précipitations layer
        prec_color = "#3B82F6" if row["precipitation"] > 100 else ("#F59E0B" if row["precipitation"] > 50 else "#EF4444")
        folium.CircleMarker(
            location=[row["lat"], row["lon"]],
            radius=max(4, row["precipitation"] * 0.08),
            color=prec_color,
            fill=True, fill_color=prec_color, fill_opacity=0.65,
            popup=popup,
            tooltip=f"{row['ville']} — Préc.: {row['precipitation']:.1f} mm",
        ).add_to(layer_prec)

    # Add active layer + all others
    layer_ivcs.add_to(m)
    layer_air.add_to(m)
    layer_palu.add_to(m)
    layer_stress.add_to(m)
    layer_prec.add_to(m)

    # Heatmap
    if show_heat:
        heat_data = [[row["lat"], row["lon"], row["IVCS"]] for _, row in latest.iterrows()]
        HeatMap(heat_data, radius=30, blur=20, min_opacity=0.3,
                gradient={0.4: "#10B981", 0.65: "#F59E0B", 0.85: "#EF4444", 1: "#7C3AED"}
               ).add_to(m)

    # Legend
    legend_html = """
    <div style="position:fixed;bottom:30px;left:30px;z-index:1000;
         background:rgba(15,23,42,0.92);padding:14px;border-radius:10px;
         color:white;font-family:Inter,sans-serif;font-size:12px;border:1px solid #334155">
        <b>IVCS — Niveau de risque</b><br>
        <span style="color:#10B981">●</span> Faible (&lt;3) &nbsp;
        <span style="color:#F59E0B">●</span> Modéré (3–6)<br>
        <span style="color:#EF4444">●</span> Élevé (6–8) &nbsp;
        <span style="color:#7C3AED">●</span> Critique (&gt;8)
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

    folium.LayerControl(collapsed=False).add_to(m)

    # Render
    out = st_folium(m, width="100%", height=580, returned_objects=["last_object_clicked"])

    # City click detail
    if out.get("last_object_clicked"):
        click = out["last_object_clicked"]
        # Find closest city
        from math import sqrt
        dists = latest.apply(
            lambda r: sqrt((r["lat"] - click["lat"])**2 + (r["lon"] - click["lng"])**2), axis=1
        )
        city_row = latest.loc[dists.idxmin()]
        st.divider()
        st.markdown(f"### 📍 Détail — {city_row['ville']} ({city_row['region']})")
        cc1, cc2, cc3, cc4 = st.columns(4)
        cc1.metric("IVCS", f"{city_row['IVCS']:.2f}")
        cc2.metric("Température", f"{city_row['temperature']:.1f}°C")
        cc3.metric("PM2.5", f"{city_row['pm25']:.1f} µg/m³")
        cc4.metric("Risque Paludisme", f"{city_row['risque_paludisme']:.2f}")
