"""Personalized kanji name design for the shop.

Usage:
  python3 tools/kanji_name/make.py OUT_DIR KANJI KATAKANA ROMAN "MEANING"
  e.g. python3 tools/kanji_name/make.py out 恵満 エマ Emma "Blessing · Abundance"

Writes:
  <roman>_design_{black,white}ink.png   design only (transparent)
  <roman>_tee_front_{black,white}ink.png  4500x5400 Printify T-shirt front (Bella 3001 / blueprint 12)
  <roman>_mug_blackink.png               2475x1155 Printify 11oz mug wrap (blueprint 478), design on both sides

Brush kanji: Google Fonts "Yuji Boku" (OFL), fetched as a subset for just the needed characters.
"""
import os
import random
import sys
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from brush import brush_column  # noqa: E402

CINZEL = os.path.join(HERE, "Cinzel.ttf")
CORM = os.path.join(HERE, "CormorantGaramond.ttf")
RED = (199, 16, 46, 255)
BLACK = (22, 22, 22, 255)
WHITE = (250, 250, 250, 255)
W, H = 3000, 4200


def google_font_subset(family, text, out_dir):
    """Download a TTF subset of a Google Font containing only `text`."""
    path = os.path.join(out_dir, f"{family.replace(' ', '')}_{abs(hash(text))}.ttf")
    if os.path.exists(path):
        return path
    q = urllib.parse.urlencode({"family": family, "text": text})
    req = urllib.request.Request(f"https://fonts.googleapis.com/css2?{q}", headers={"User-Agent": "Wget/1.0"})
    css = urllib.request.urlopen(req).read().decode()
    url = css.split("url(")[1].split(")")[0]
    with open(path, "wb") as f:
        f.write(urllib.request.urlopen(url).read())
    return path


def text_size(font, t):
    b = font.getbbox(t)
    return b[2] - b[0], b[3] - b[1], b


def seal(kana, ink, font_path):
    fs = 170
    w, h = 300, 90 + len(kana) * (fs + 30)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=36, fill=RED)
    d.rounded_rectangle([22, 22, w - 23, h - 23], radius=22, outline=ink, width=10)
    f = ImageFont.truetype(font_path, fs)
    y = 55
    for ch in kana:
        tw, th, b = text_size(f, ch)
        d.text(((w - tw) / 2 - b[0], y - b[1] + (fs - th) / 2), ch, font=f, fill=ink)
        y += fs + 30
    rnd = random.Random(kana)
    for _ in range(int(w * h / 900)):
        x, yy = rnd.randrange(w), rnd.randrange(h)
        if im.getpixel((x, yy))[3]:
            r = rnd.choice([1, 2, 2, 3])
            d.ellipse([x - r, yy - r, x + r, yy + r], fill=ink)
    return im


def design(kanji, kana, roman, meaning, ink, brush_font):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    col = brush_column(brush_font, kanji, 2450, seed=kanji)
    cx, top = W // 2 - 120, 120
    im.paste(Image.new("RGBA", col.size, ink), (cx - col.width // 2, top), col)
    y = top + col.height
    s = seal(kana, WHITE, brush_font)
    im.alpha_composite(s, (cx + col.width // 2 + 40, y - s.height - 40))
    y += 90
    fr = ImageFont.truetype(CINZEL, 230)
    spaced = " ".join(roman.upper())
    tw, th, b = text_size(fr, spaced)
    d.text((W / 2 - tw / 2 - b[0], y - b[1]), spaced, font=fr, fill=ink)
    y += th + 90
    d.rectangle([W / 2 - 520, y, W / 2 + 520, y + 14], fill=RED)
    y += 70
    fm = ImageFont.truetype(CORM, 150)
    tw, th, b = text_size(fm, meaning)
    d.text((W / 2 - tw / 2 - b[0], y - b[1]), meaning, font=fm, fill=ink)
    return im.crop(im.getbbox())


def fit(img, box_w, box_h):
    r = min(box_w / img.width, box_h / img.height)
    return img.resize((round(img.width * r), round(img.height * r)), Image.LANCZOS)


def main(out, kanji, kana, roman, meaning):
    os.makedirs(out, exist_ok=True)
    font_dir = os.path.join(out, ".fonts")
    os.makedirs(font_dir, exist_ok=True)
    brush_font = google_font_subset("Yuji Boku", kanji + kana, font_dir)
    key = roman.lower()
    for ink, tag in ((BLACK, "blackink"), (WHITE, "whiteink")):
        dsg = design(kanji, kana, roman, meaning, ink, brush_font)
        dsg.save(os.path.join(out, f"{key}_design_{tag}.png"))
        tee = Image.new("RGBA", (4500, 5400), (0, 0, 0, 0))
        t = fit(dsg, 2700, 4300)
        tee.alpha_composite(t, ((4500 - t.width) // 2, 350))
        tee.save(os.path.join(out, f"{key}_tee_front_{tag}.png"))
        if ink == BLACK:
            mug = Image.new("RGBA", (2475, 1155), (0, 0, 0, 0))
            m = fit(dsg, 900, 1040)
            for cx in (2475 // 4, 2475 * 3 // 4):
                mug.alpha_composite(m, (cx - m.width // 2, (1155 - m.height) // 2))
            mug.save(os.path.join(out, f"{key}_mug_{tag}.png"))


if __name__ == "__main__":
    main(*sys.argv[1:6])
