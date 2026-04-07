"""
utils/theme.py — Palette ClimaResist AI + helpers CSS
"""
import streamlit as st

PALETTE = {
    "navy":    "#0F172A",
    "green":   "#10B981",
    "blue":    "#3B82F6",
    "orange":  "#F59E0B",
    "red":     "#EF4444",
    "gray":    "#64748B",
    "light_bg":"#F8FAFC",
    "card_dark":"#1E293B",
    "card_light":"#FFFFFF",
}

REGIONS = [
    "Centre", "Littoral", "Nord", "Nord-Ouest", "Ouest",
    "Adamaoua", "Est", "Sud", "Sud-Ouest", "Extrême-Nord"
]

IVCS_COLORS = {
    "Faible":    "#10B981",
    "Modéré":   "#F59E0B",
    "Élevé":    "#EF4444",
    "Critique":  "#7C3AED",
}


def ivcs_badge(val: float) -> str:
    if val < 3:
        return f'<span style="background:#10B981;color:white;padding:3px 10px;border-radius:20px;font-size:12px">🟢 Faible ({val:.1f})</span>'
    elif val < 6:
        return f'<span style="background:#F59E0B;color:white;padding:3px 10px;border-radius:20px;font-size:12px">🟡 Modéré ({val:.1f})</span>'
    elif val < 8:
        return f'<span style="background:#EF4444;color:white;padding:3px 10px;border-radius:20px;font-size:12px">🔴 Élevé ({val:.1f})</span>'
    else:
        return f'<span style="background:#7C3AED;color:white;padding:3px 10px;border-radius:20px;font-size:12px">⚠️ Critique ({val:.1f})</span>'


def load_css(dark_mode: bool = True):
    bg = PALETTE["navy"] if dark_mode else PALETTE["light_bg"]
    card = PALETTE["card_dark"] if dark_mode else PALETTE["card_light"]
    text = "#F1F5F9" if dark_mode else "#0F172A"
    muted = "#94A3B8" if dark_mode else PALETTE["gray"]

    st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    html, body, [class*="css"] {{
        font-family: 'Inter', sans-serif;
    }}

    .main {{
        background-color: {bg};
        color: {text};
    }}

    section[data-testid="stSidebar"] {{
        background-color: {'#1E293B' if dark_mode else '#F1F5F9'};
    }}

    .stMetric {{
        background: {card};
        border-radius: 12px;
        padding: 16px;
        border: 1px solid {'#334155' if dark_mode else '#E2E8F0'};
    }}

    .climaresist-card {{
        background: {card};
        border-radius: 12px;
        padding: 20px;
        margin: 8px 0;
        border: 1px solid {'#334155' if dark_mode else '#E2E8F0'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }}

    .kpi-value {{
        font-size: 2.2em;
        font-weight: 700;
        color: {PALETTE['green']};
    }}

    .kpi-label {{
        font-size: 0.85em;
        color: {muted};
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }}

    .alert-banner {{
        background: linear-gradient(135deg, #7C3AED22, #EF444422);
        border-left: 4px solid {PALETTE['red']};
        border-radius: 8px;
        padding: 12px 16px;
        margin: 8px 0;
    }}

    .hero-title {{
        font-size: 2.8em;
        font-weight: 800;
        background: linear-gradient(135deg, {PALETTE['green']}, {PALETTE['blue']});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        line-height: 1.2;
    }}

    .hero-sub {{
        font-size: 1.1em;
        color: {muted};
        margin-top: 8px;
    }}

    div[data-testid="stMetricValue"] {{
        font-weight: 700 !important;
        font-size: 1.8em !important;
    }}

    .stButton > button {{
        background: linear-gradient(135deg, {PALETTE['green']}, {PALETTE['blue']});
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.2s;
    }}

    .stButton > button:hover {{
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16,185,129,0.4);
    }}

    footer {{
        background: {card};
        border-top: 1px solid {'#334155' if dark_mode else '#E2E8F0'};
        padding: 12px;
        text-align: center;
        color: {muted};
        font-size: 0.82em;
        margin-top: 40px;
        border-radius: 8px;
    }}
    </style>
    """, unsafe_allow_html=True)


def footer():
    st.markdown("""
    <footer>
        🌍 <strong>ClimaResist AI</strong> — Hackathon IndabaX Cameroun 2026 &nbsp;|&nbsp;
        Propulsé par <a href="https://open-meteo.com" target="_blank" style="color:#10B981">Open-Meteo</a>
        + IA locale &nbsp;|&nbsp;
        <a href="https://github.com" target="_blank" style="color:#3B82F6">GitHub</a>
    </footer>
    """, unsafe_allow_html=True)
