"""英語の4コマ漫画（Kanji Tee）を SVG/HTML で生成する。

python tools/comic_4koma.py  → comic/kanji_tee_4koma.html を出力
PNG化: node tools/render_comic.js
"""
import os

W, H = 820, 560          # 1コマのサイズ
X0, TOP, GAP = 40, 120, 30
TOTAL_H = TOP + 4 * (H + GAP) + 60

SKIN = "#f7d2b0"
INK = "#1d1d1f"
FONT = "'Comic Neue', 'DejaVu Sans', sans-serif"
JP = "'IPAGothic', 'Noto Sans JP', sans-serif"


# ---------- パーツ ----------
def face(cx, cy, mood):
    """顔のパーツ（目・口など）。cx, cy は頭の中心。"""
    e = f'<g stroke="{INK}" stroke-width="3" fill="none" stroke-linecap="round">'
    if mood == "happy":
        e += f'<path d="M{cx-26} {cy-4} q8 -10 16 0 M{cx+10} {cy-4} q8 -10 16 0"/>'
        e += f'<path d="M{cx-20} {cy+18} q20 22 40 0" fill="#fff"/>'
    elif mood == "proud":
        e += f'<path d="M{cx-26} {cy-4} q8 -10 16 0 M{cx+10} {cy-4} q8 -10 16 0"/>'
        e += f'<path d="M{cx-24} {cy+14} q24 30 48 0 z" fill="#fff"/>'
        e += f'<path d="M{cx-30} {cy-22} l14 -5 M{cx+16} {cy-27} l14 5"/>'
    elif mood == "smile":
        e += f'<circle cx="{cx-16}" cy="{cy-4}" r="4" fill="{INK}"/><circle cx="{cx+16}" cy="{cy-4}" r="4" fill="{INK}"/>'
        e += f'<path d="M{cx-14} {cy+18} q14 12 28 0"/>'
    elif mood == "curious":
        e += f'<circle cx="{cx-16}" cy="{cy-4}" r="4" fill="{INK}"/><circle cx="{cx+16}" cy="{cy-4}" r="4" fill="{INK}"/>'
        e += f'<path d="M{cx-26} {cy-18} l16 -4 M{cx+8} {cy-24} l16 2"/>'
        e += f'<circle cx="{cx+2}" cy="{cy+22}" r="6"/>'
    elif mood == "shock":
        e += f'<circle cx="{cx-16}" cy="{cy-4}" r="9" fill="#fff"/><circle cx="{cx+16}" cy="{cy-4}" r="9" fill="#fff"/>'
        e += f'<circle cx="{cx-16}" cy="{cy-4}" r="2.5" fill="{INK}"/><circle cx="{cx+16}" cy="{cy-4}" r="2.5" fill="{INK}"/>'
        e += f'<ellipse cx="{cx}" cy="{cy+24}" rx="9" ry="12" fill="{INK}"/>'
    elif mood == "awkward":
        e += f'<path d="M{cx-24} {cy-4} h14 M{cx+10} {cy-4} h14"/>'
        e += f'<path d="M{cx-14} {cy+20} q5 -5 10 0 q5 5 10 0 q5 -5 10 0"/>'
    e += "</g>"
    return e


def tourist(x, y, s=1.0, mood="happy", arms="down"):
    """観光客マイク（大麻愛Tシャツ）。x, y は足元の中心。"""
    g = f'<g transform="translate({x} {y}) scale({s})">'
    # 腕（後ろ側）
    arm = {
        "down": [(-70, -250, -88, -150), (70, -250, 88, -150)],
        "up": [(-70, -250, -120, -380), (70, -250, 120, -380)],
        "point": [(-70, -250, -88, -150), (70, -250, 20, -215)],
        "thumb": [(-70, -250, -88, -150), (70, -250, 130, -330)],
        "wave": [(-70, -250, -88, -150), (70, -250, 125, -360)],
    }[arms]
    for x1, y1, x2, y2 in arm:
        g += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="22" stroke-linecap="round"/>'
        g += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{SKIN}" stroke-width="16" stroke-linecap="round"/>'
    if arms == "thumb":
        g += f'<rect x="118" y="-352" width="10" height="24" rx="5" fill="{SKIN}" stroke="{INK}" stroke-width="3"/>'
    # 脚・靴
    g += f'<rect x="-40" y="-150" width="36" height="146" fill="#3d5f93" stroke="{INK}" stroke-width="3"/>'
    g += f'<rect x="4" y="-150" width="36" height="146" fill="#3d5f93" stroke="{INK}" stroke-width="3"/>'
    g += f'<ellipse cx="-26" cy="-4" rx="28" ry="11" fill="#c0392b" stroke="{INK}" stroke-width="3"/>'
    g += f'<ellipse cx="26" cy="-4" rx="28" ry="11" fill="#c0392b" stroke="{INK}" stroke-width="3"/>'
    # Tシャツ
    g += (f'<path d="M-62 -285 Q0 -298 62 -285 L100 -232 L76 -214 L66 -236 L70 -140 L-70 -140 '
          f'L-66 -236 L-76 -214 L-100 -232 Z" fill="#111" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    g += f'<text x="0" y="-192" font-family="{JP}" font-size="38" font-weight="bold" fill="#fff" text-anchor="middle">大麻愛</text>'
    # 首・頭・髪
    g += f'<rect x="-13" y="-305" width="26" height="24" fill="{SKIN}" stroke="{INK}" stroke-width="3"/>'
    g += f'<circle cx="0" cy="-355" r="56" fill="{SKIN}" stroke="{INK}" stroke-width="3"/>'
    g += (f'<path d="M-57 -362 Q-56 -424 0 -420 Q58 -424 58 -360 Q44 -392 14 -386 Q20 -398 6 -400 '
          f'Q-4 -386 -26 -390 Q-46 -390 -57 -362 Z" fill="#f2c94c" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    # 頬
    g += '<circle cx="-34" cy="-334" r="8" fill="#f5a3a3" opacity=".6"/><circle cx="34" cy="-334" r="8" fill="#f5a3a3" opacity=".6"/>'
    g += face(0, -355, mood)
    g += "</g>"
    return g


def grandma(x, y, s=1.0, mood="shock"):
    """おばあちゃん。"""
    g = f'<g transform="translate({x} {y}) scale({s})">'
    g += f'<line x1="-60" y1="-120" x2="-74" y2="-2" stroke="#7a4b2a" stroke-width="7" stroke-linecap="round"/>'
    g += f'<path d="M-60 -250 Q0 -262 60 -250 L74 -20 L-74 -20 Z" fill="#8e6bbf" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
    g += f'<path d="M-6 -250 L-6 -20 M6 -250 L6 -20" stroke="#6d4f99" stroke-width="3"/>'
    g += f'<ellipse cx="-24" cy="-8" rx="22" ry="9" fill="#555" stroke="{INK}" stroke-width="3"/>'
    g += f'<ellipse cx="24" cy="-8" rx="22" ry="9" fill="#555" stroke="{INK}" stroke-width="3"/>'
    g += f'<line x1="-58" y1="-235" x2="-64" y2="-125" stroke="{INK}" stroke-width="20" stroke-linecap="round"/>'
    g += f'<line x1="-58" y1="-235" x2="-64" y2="-125" stroke="#8e6bbf" stroke-width="14" stroke-linecap="round"/>'
    g += f'<line x1="58" y1="-235" x2="44" y2="-300" stroke="{INK}" stroke-width="20" stroke-linecap="round"/>'
    g += f'<line x1="58" y1="-235" x2="44" y2="-300" stroke="#8e6bbf" stroke-width="14" stroke-linecap="round"/>'
    g += f'<circle cx="44" cy="-304" r="10" fill="{SKIN}" stroke="{INK}" stroke-width="3"/>'
    g += f'<circle cx="0" cy="-354" r="34" fill="#c8c8c8" stroke="{INK}" stroke-width="3"/>'
    g += f'<circle cx="0" cy="-300" r="50" fill="{SKIN}" stroke="{INK}" stroke-width="3"/>'
    g += f'<path d="M-50 -306 Q-46 -352 0 -350 Q46 -352 50 -306 Q30 -332 0 -330 Q-30 -332 -50 -306 Z" fill="#c8c8c8" stroke="{INK}" stroke-width="3"/>'
    g += face(0, -296, mood)
    g += f'<g fill="none" stroke="{INK}" stroke-width="2.5"><circle cx="-16" cy="-300" r="13"/><circle cx="16" cy="-300" r="13"/><path d="M-3 -300 h6"/></g>'
    g += "</g>"
    return g


def clerk(x, y, s=1.0, mood="smile"):
    """コンビニ店員（カウンターの後ろ、上半身のみ）。"""
    g = f'<g transform="translate({x} {y}) scale({s})">'
    g += f'<path d="M-64 -280 Q0 -294 64 -280 L72 0 L-72 0 Z" fill="#fff" stroke="{INK}" stroke-width="3"/>'
    g += f'<path d="M-50 -270 L50 -270 L58 0 L-58 0 Z" fill="#2e9e6a" stroke="{INK}" stroke-width="3"/>'
    g += f'<rect x="-30" y="-230" width="60" height="22" rx="4" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    g += f'<text x="0" y="-214" font-family="{FONT}" font-size="14" font-weight="bold" text-anchor="middle" fill="{INK}">YUKI</text>'
    g += f'<rect x="-13" y="-302" width="26" height="24" fill="{SKIN}" stroke="{INK}" stroke-width="3"/>'
    g += f'<circle cx="0" cy="-352" r="54" fill="{SKIN}" stroke="{INK}" stroke-width="3"/>'
    g += (f'<path d="M-56 -340 Q-62 -414 0 -412 Q62 -414 56 -340 L50 -300 Q46 -360 20 -382 '
          f'Q-10 -360 -48 -364 L-50 -300 Z" fill="#222" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    g += face(0, -348, mood)
    g += "</g>"
    return g


def bubble(x, y, w, h, lines, tail, size=26, jp=False):
    """吹き出し。tail は尻尾の先の座標 (tx, ty)。"""
    tx, ty = tail
    bx = min(max(tx, x + 30), x + w - 30)
    by = y + h if ty > y + h else y
    d = 1 if by == y + h else -1
    s = f'<path d="M{bx-16} {by-2*d} L{tx} {ty} L{bx+16} {by-2*d}" fill="#fff" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
    s += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="28" fill="#fff" stroke="{INK}" stroke-width="3"/>'
    s += f'<path d="M{bx-14} {by} L{bx+14} {by}" stroke="#fff" stroke-width="5"/>'
    lh = size * 1.18
    start = y + h / 2 - (len(lines) - 1) * lh / 2 + size * 0.35
    fam = JP if jp else FONT
    s += f'<text font-family="{fam}" font-size="{size}" font-weight="bold" text-anchor="middle" fill="{INK}">'
    for i, line in enumerate(lines):
        s += f'<tspan x="{x + w / 2}" y="{start + i * lh:.1f}">{line}</tspan>'
    s += "</text>"
    return s


def caption(x, y, text):
    w = len(text) * 13 + 30
    return (f'<rect x="{x}" y="{y}" width="{w}" height="40" fill="#ffe14d" stroke="{INK}" stroke-width="3"/>'
            f'<text x="{x + w / 2}" y="{y + 27}" font-family="{FONT}" font-size="22" font-weight="bold" text-anchor="middle" fill="{INK}">{text}</text>')


# ---------- 背景 ----------
def bg_street():
    s = '<rect width="820" height="560" fill="#bfe3f7"/>'
    s += '<circle cx="700" cy="90" r="40" fill="#fff6b0"/>'
    for bx, bw, bh, c in [(0, 110, 300, "#9fb7c9"), (100, 90, 360, "#8aa4b8"), (520, 120, 330, "#9fb7c9"),
                          (630, 90, 390, "#8aa4b8"), (710, 120, 280, "#9fb7c9")]:
        s += f'<rect x="{bx}" y="{470 - bh}" width="{bw}" height="{bh}" fill="{c}"/>'
        for wy in range(470 - bh + 20, 450, 40):
            for wx in range(bx + 14, bx + bw - 20, 30):
                s += f'<rect x="{wx}" y="{wy}" width="14" height="18" fill="#dcebf5"/>'
    # 東京タワー
    s += '<g fill="none" stroke="#e8553d" stroke-width="6"><path d="M250 470 L300 160 L350 470 M268 360 L332 360 M282 270 L318 270"/></g>'
    s += '<path d="M300 160 L300 120" stroke="#e8553d" stroke-width="4"/>'
    # 縦看板
    s += f'<rect x="440" y="200" width="46" height="170" fill="#fff" stroke="{INK}" stroke-width="3"/>'
    s += f'<text font-family="{JP}" font-size="30" font-weight="bold" fill="#d62f2f" text-anchor="middle"><tspan x="463" y="240">ら</tspan><tspan x="463" y="280">ー</tspan><tspan x="463" y="320">め</tspan><tspan x="463" y="358">ん</tspan></text>'
    s += '<rect y="470" width="820" height="90" fill="#cfcfcf"/>'
    s += '<g stroke="#fff" stroke-width="8">' + "".join(f'<line x1="{i}" y1="520" x2="{i + 50}" y2="520"/>' for i in range(20, 820, 100)) + "</g>"
    return s


def bg_konbini():
    s = '<rect width="820" height="560" fill="#f4f1e8"/>'
    # 棚
    for sy in (90, 190, 290):
        s += f'<rect x="0" y="{sy}" width="300" height="10" fill="#b9a98d"/>'
        for i, c in enumerate(["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#9b59b6", "#e67e22", "#1abc9c"]):
            s += f'<rect x="{12 + i * 40}" y="{sy - 50 + (i % 2) * 10}" width="30" height="{50 - (i % 2) * 10}" rx="3" fill="{c}" stroke="{INK}" stroke-width="2"/>'
    s += f'<rect x="300" y="0" width="520" height="60" fill="#2e9e6a"/>'
    s += f'<text x="560" y="42" font-family="{FONT}" font-size="30" font-weight="bold" fill="#fff" text-anchor="middle">24H MART</text>'
    s += '<rect y="470" width="820" height="90" fill="#e0dccf"/>'
    return s


def counter():
    return (f'<rect x="440" y="380" width="380" height="180" fill="#c98b4f" stroke="{INK}" stroke-width="3"/>'
            f'<rect x="430" y="370" width="390" height="20" fill="#a86e3a" stroke="{INK}" stroke-width="3"/>'
            f'<rect x="470" y="320" width="80" height="50" rx="4" fill="#555" stroke="{INK}" stroke-width="3"/>')


# ---------- コマ ----------
def panel1():
    s = bg_street()
    s += tourist(260, 540, 0.95, "happy", "up")
    s += caption(16, 16, "Day 1 in Japan")
    s += bubble(420, 40, 380, 150, ["Just landed in Tokyo!", "And I'm wearing my", "cool new kanji tee!"], (330, 230))
    return s


def panel2():
    s = bg_street()
    s += tourist(240, 540, 0.95, "smile", "wave")
    s += grandma(650, 540, 0.95, "shock")
    s += f'<text x="700" y="170" font-family="{FONT}" font-size="54" font-weight="bold" fill="#d62f2f">!?</text>'
    s += bubble(20, 20, 400, 110, ["Wow, everyone here", "LOVES my shirt!"], (230, 160))
    s += bubble(500, 30, 200, 80, ["あらまぁ…"], (620, 180), size=30, jp=True)
    s += f'<g stroke="{INK}" stroke-width="3" stroke-dasharray="8 8"><line x1="590" y1="250" x2="300" y2="330"/></g>'
    return s


def panel3():
    s = bg_konbini()
    s += clerk(710, 470, 0.95, "smile")
    s += counter()
    s += tourist(250, 540, 0.95, "curious", "point")
    s += bubble(20, 20, 380, 120, ["Excuse me...", "What does my shirt say?"], (230, 175))
    s += bubble(440, 130, 180, 70, ["Um..."], (655, 160))
    return s


def panel4():
    s = bg_konbini()
    s += clerk(710, 470, 0.95, "awkward")
    s += f'<path d="M770 100 q10 18 0 26 q-10 -8 0 -26 z" fill="#7cc4ef" stroke="{INK}" stroke-width="2"/>'
    s += counter()
    s += tourist(250, 540, 0.95, "proud", "thumb")
    s += bubble(395, 225, 260, 100, ["It says...", "“I LOVE CANNABIS.”"], (660, 170), size=22)
    s += bubble(20, 20, 380, 110, ["PERFECT! That's exactly", "what I ordered!"], (230, 170))
    return s


def build():
    parts = [panel1(), panel2(), panel3(), panel4()]
    body = ""
    for i, p in enumerate(parts):
        py = TOP + i * (H + GAP)
        body += (f'<clipPath id="c{i}"><rect width="{W}" height="{H}"/></clipPath>'
                 f'<g transform="translate({X0} {py})"><g clip-path="url(#c{i})">{p}</g>'
                 f'<rect width="{W}" height="{H}" fill="none" stroke="{INK}" stroke-width="6"/>'
                 f'<circle cx="{W - 28}" cy="{H - 28}" r="18" fill="{INK}"/>'
                 f'<text x="{W - 28}" y="{H - 21}" font-family="{FONT}" font-size="20" font-weight="bold" fill="#fff" text-anchor="middle">{i + 1}</text></g>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="{TOTAL_H}" viewBox="0 0 900 {TOTAL_H}">'
           f'<rect width="900" height="{TOTAL_H}" fill="#fffdf6"/>'
           f'<text x="450" y="80" font-family="Bangers, {FONT}" font-size="64" font-weight="bold" letter-spacing="3" text-anchor="middle" fill="{INK}">LOST IN KANJI</text>'
           f'{body}'
           f'<text x="450" y="{TOTAL_H - 22}" font-family="{FONT}" font-size="24" font-weight="bold" text-anchor="middle" fill="{INK}">Say it in Kanji. — 大麻愛 (I LOVE CANNABIS) Tee</text>'
           '</svg>')
    html = ('<!doctype html><html><head><meta charset="utf-8"><title>Lost in Kanji</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@700&display=block" rel="stylesheet">'
            '<style>html,body{margin:0;background:#fffdf6}svg{display:block;max-width:100%;height:auto;margin:0 auto}</style>'
            f'</head><body>{svg}</body></html>')
    out = os.path.join(os.path.dirname(__file__), "..", "comic")
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "kanji_tee_4koma.html"), "w", encoding="utf-8") as f:
        f.write(html)


if __name__ == "__main__":
    build()
