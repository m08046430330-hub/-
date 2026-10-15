"""Turn font kanji into a more calligraphic brush look: tilt, size rhythm, ragged ink edges,
dry-brush (kasure) streaks and ink spatter. Returns an 'L' mask (255 = ink)."""
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter


def char_mask(font_path, ch, size):
    f = ImageFont.truetype(font_path, size)
    pad = size // 3
    im = Image.new("L", (size + 2 * pad, size + 2 * pad), 0)
    d = ImageDraw.Draw(im)
    b = f.getbbox(ch)
    d.text((pad + (size - (b[2] - b[0])) / 2 - b[0], pad + (size - (b[3] - b[1])) / 2 - b[1]), ch, font=f, fill=255)
    return im


def ragged(mask, rnd, amount):
    """Ink-bleed edges: blur, add noise, re-threshold."""
    a = np.asarray(mask.filter(ImageFilter.GaussianBlur(amount)), dtype=np.float32)
    n = np.random.default_rng(rnd.randrange(1 << 30)).normal(0, 38, a.shape)
    n = Image.fromarray(np.clip(n + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    n = np.asarray(n, dtype=np.float32) - 128
    return Image.fromarray(((a + n) > 128).astype(np.uint8) * 255)


def kasure(mask, rnd, angle, strength):
    """Dry-brush streaks running along the stroke direction, stronger toward stroke ends."""
    w, h = mask.size
    g = np.random.default_rng(rnd.randrange(1 << 30))
    small = g.random((max(4, h // 4), max(4, w // 220))).astype(np.float32)
    streak = Image.fromarray((small * 255).astype(np.uint8)).resize((w * 2, h * 2), Image.BILINEAR)
    streak = streak.rotate(angle, resample=Image.BILINEAR).crop((w // 2, h // 2, w // 2 + w, h // 2 + h))
    s = np.asarray(streak, dtype=np.float32) / 255
    # streaks appear only near stroke edges (thin ink) -> distance proxy via blur
    m = np.asarray(mask, dtype=np.float32) / 255
    inner = np.asarray(mask.filter(ImageFilter.GaussianBlur(w / 70)), dtype=np.float32) / 255
    edge = np.clip(1.15 - inner, 0, 1)
    # only a couple of brush-lift zones per character, not everywhere
    zone = Image.new("L", (w, h), 0)
    zd = ImageDraw.Draw(zone)
    box = mask.getbbox() or (0, 0, w, h)
    for _ in range(2):
        cx, cy = rnd.uniform(box[0], box[2]), rnd.uniform(box[1], box[3])
        rx, ry = w * rnd.uniform(0.12, 0.2), h * rnd.uniform(0.08, 0.14)
        zd.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    zone = np.asarray(zone.filter(ImageFilter.GaussianBlur(w / 25)), dtype=np.float32) / 255
    edge = edge * zone
    gaps = (s > 1 - strength * edge) & (m > 0)
    out = m.copy()
    out[gaps] = 0
    return Image.fromarray((out * 255).astype(np.uint8))


def spatter(mask, rnd, n):
    d = ImageDraw.Draw(mask)
    w, h = mask.size
    box = mask.getbbox()
    if not box:
        return mask
    for _ in range(n):
        x = rnd.uniform(box[0] - 60, box[2] + 60)
        y = rnd.uniform(box[1] - 60, box[3] + 60)
        r = rnd.choice([3, 4, 6, 9, 14])
        d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    return mask


def brush_column(font_path, text, height, seed):
    """Vertical calligraphy column with rhythm: sizes, tilt and x-offset vary per character."""
    rnd = random.Random(seed)
    n = len(text)
    base = int(height / (n * 0.92))
    pieces = []
    for i, ch in enumerate(text):
        scale = 1.08 if i == 0 else rnd.uniform(0.88, 1.0)
        size = int(base * scale)
        m = char_mask(font_path, ch, size)
        m = m.rotate(rnd.uniform(-5, 5), resample=Image.BICUBIC, expand=False)
        m = ragged(m, rnd, max(2, size / 220))
        m = kasure(m, rnd, angle=rnd.uniform(25, 40), strength=0.9)
        pieces.append((m, int(rnd.uniform(-0.05, 0.05) * size)))
    W = max(p.width for p, _ in pieces) + int(base * 0.2)
    H = sum(int(p.height * 0.70) for p, _ in pieces) + base
    col = Image.new("L", (W, H), 0)
    y = 0
    for p, dx in pieces:
        col.paste(Image.new("L", p.size, 255), ((W - p.width) // 2 + dx, y), p)
        y += int(p.height * 0.66)
    col = spatter(col, rnd, 14)
    return col.crop(col.getbbox())
