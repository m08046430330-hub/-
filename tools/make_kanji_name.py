"""Kanji name design: brush kanji (vertical) + red katakana seal + romanized name + meaning."""
import random
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = "/tmp/claude-0/-home-user--/72f12934-7d92-5f6c-b1ce-321021527fc3/scratchpad"
BRUSH = f"{S}/kanji_name/YujiSyuku.ttf"
SEALF = f"{S}/kanji_name/YujiBoku.ttf"
CINZEL = f"{S}/fonts/Cinzel.ttf"
CORM = f"{S}/fonts/CormorantGaramond.ttf"
RED = (199, 16, 46, 255)

W, H = 3000, 3600


def text_size(font, t):
    b = font.getbbox(t)
    return b[2] - b[0], b[3] - b[1], b


def seal(kana, ink):
    n = len(kana)
    fs = 170
    w, h = 300, 90 + n * (fs + 30)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=36, fill=RED)
    d.rounded_rectangle([22, 22, w - 23, h - 23], radius=22, outline=ink, width=10)
    f = ImageFont.truetype(SEALF, fs)
    y = 55
    for ch in kana:
        tw, th, b = text_size(f, ch)
        d.text(((w - tw) / 2 - b[0], y - b[1] + (fs - th) / 2), ch, font=f, fill=ink)
        y += fs + 30
    # ink speckle like the shop's 420 hanko
    rnd = random.Random(kana)
    for _ in range(int(w * h / 900)):
        x, yy = rnd.randrange(w), rnd.randrange(h)
        if im.getpixel((x, yy))[3]:
            r = rnd.choice([1, 2, 2, 3])
            d.ellipse([x - r, yy - r, x + r, yy + r], fill=ink)
    return im


def design(kanji, kana, roman, meaning, ink):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    n = len(kanji)
    fs = min(820, int(2350 / n))
    f = ImageFont.truetype(BRUSH, fs)
    top = 120
    cx = W // 2 - 120
    y = top
    for ch in kanji:
        tw, th, b = text_size(f, ch)
        d.text((cx - tw / 2 - b[0], y - b[1] + (fs - th) / 2), ch, font=f, fill=ink)
        y += int(fs * 0.98)
    s = seal(kana, ink if ink[0] > 128 else (255, 255, 255, 255))
    im.alpha_composite(s, (cx + fs // 2 + 90, y - s.height - 20))

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


SAMPLES = [
    ("恵満", "エマ", "Emma", "Blessing · Abundance"),
    ("理愛夢", "リアム", "Liam", "Wisdom · Love · Dream"),
    ("美愛", "ミア", "Mia", "Beauty · Love"),
]

if __name__ == "__main__":
    out = sys.argv[1]
    BLACK, WHITE = (22, 22, 22, 255), (250, 250, 250, 255)
    tiles = []
    for k, ka, r, m in SAMPLES:
        for ink, bg in ((BLACK, (255, 255, 255)), (WHITE, (20, 20, 20))):
            dsg = design(k, ka, r, m, ink)
            tag = "black" if ink == BLACK else "white"
            dsg.save(f"{out}/kanji_name_{r.lower()}_{tag}ink.png")
            tile = Image.new("RGB", (1000, 1300), bg)
            t = dsg.copy()
            t.thumbnail((760, 1080))
            tile.paste(t, ((1000 - t.width) // 2, (1300 - t.height) // 2), t)
            tiles.append(tile)
    sheet = Image.new("RGB", (3000, 2600), (235, 235, 235))
    for i, t in enumerate(tiles):
        col, row = i // 2, i % 2
        sheet.paste(t, (col * 1000, row * 1300))
    sheet.save(f"{out}/kanji_name_preview.jpg", quality=88)
