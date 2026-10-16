"""Pinterest pin images (1000x1500, 2:3) from Printify mockups.

Usage: python3 tools/pinterest_pins.py SRC_DIR OUT_DIR
SRC_DIR holds Printify mockup JPGs named <product-id-prefix>_<index>.jpg.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "kanji_name"))
from make import google_font_subset  # noqa: E402

CINZEL = os.path.join(HERE, "kanji_name", "Cinzel.ttf")
CORM = os.path.join(HERE, "kanji_name", "CormorantGaramond.ttf")
W, H = 1000, 1500
RED = (199, 16, 46)
INK = (24, 22, 20)
CREAM = (246, 240, 228)

PINS = [
    # (file, main photo, small photo or None, headline lines, subline, tag)
    ("pin_kanji_name_mug.jpg", "6ad03680_11", "6ad03680_9",
     ["YOUR NAME", "IN JAPANESE KANJI"], "Personalized calligraphy mug · A gift with meaning", "名"),
    ("pin_kanji_name_tee.jpg", "6ad0367b_9", "6ad0367b_8",
     ["YOUR NAME", "IN KANJI CALLIGRAPHY"], "Custom T-shirt · Preview sent before printing", "名"),
    ("pin_bonsai_tee.jpg", "6acec9_6", "6acec9_7",
     ["DAY & NIGHT", "BONSAI VINYL"], "Japanese art T-shirt for music & Japan lovers", "盆"),
    ("pin_bonsai_mug.jpg", "6aced8_7", None,
     ["BONSAI VINYL", "COFFEE MUG"], "Cozy Japan lover gift · 11oz ceramic", "盆"),
    ("pin_bonsai_tote.jpg", "6aced9_8", None,
     ["JAPANESE BONSAI", "TOTE BAG"], "Cotton canvas market bag with turntable art", "盆"),
]


def fit_text(draw, text, font_path, max_w, start):
    size = start
    while size > 20:
        f = ImageFont.truetype(font_path, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return ImageFont.truetype(font_path, size)


def seal(ch, font_path, size=110):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=14, fill=RED)
    d.rounded_rectangle([8, 8, size - 9, size - 9], radius=9, outline=(255, 255, 255), width=4)
    f = ImageFont.truetype(font_path, int(size * 0.62))
    b = f.getbbox(ch)
    d.text(((size - (b[2] - b[0])) / 2 - b[0], (size - (b[3] - b[1])) / 2 - b[1]), ch, font=f, fill=(255, 255, 255))
    return im


def make_pin(src, out, spec, seal_font):
    name, main, small, lines, sub, ch = spec
    pin = Image.new("RGB", (W, H), CREAM)
    photo = Image.open(os.path.join(src, main + ".jpg")).convert("RGB").resize((W, W), Image.LANCZOS)
    pin.paste(photo, (0, 0))
    d = ImageDraw.Draw(pin)
    if small:
        s = Image.open(os.path.join(src, small + ".jpg")).convert("RGB").resize((300, 300), Image.LANCZOS)
        frame = Image.new("RGB", (316, 316), (255, 255, 255))
        frame.paste(s, (8, 8))
        pin.paste(frame, (W - 316 - 36, W - 316 + 60))
    d.rectangle([0, W, W, W + 10], fill=RED)
    pin.paste(seal(ch, seal_font, 120), (55, W + 78), seal(ch, seal_font, 120))
    y = W + 70
    for i, line in enumerate(lines):
        f = fit_text(d, line, CINZEL, W - 200 - 50, 74)
        d.text((200, y), line, font=f, fill=INK)
        y += 88
    fs = fit_text(d, sub, CORM, W - 110, 50)
    d.text((55, y + 40), sub, font=fs, fill=INK)
    fb = ImageFont.truetype(CINZEL, 30)
    tag = "SHOP ON ETSY  ·  JAPANESE CALLIGRAPHY & ART"
    d.text(((W - d.textlength(tag, font=fb)) / 2, H - 80), tag, font=fb, fill=RED)
    pin.save(os.path.join(out, name), quality=90)


def main(src, out):
    os.makedirs(out, exist_ok=True)
    font_dir = os.path.join(out, ".fonts")
    os.makedirs(font_dir, exist_ok=True)
    seal_font = google_font_subset("Yuji Boku", "".join(p[5] for p in PINS), font_dir)
    for spec in PINS:
        make_pin(src, out, spec, seal_font)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
