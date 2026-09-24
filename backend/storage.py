"""Emergent object storage + Pillow watermark helpers for गाजियाबाद टाइम्स."""

import io
import os
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = Path(__file__).parent
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "ghaziabad-times"
WATERMARK_TEXT = "गाजियाबाद टाइम्स"

FONT_REG = str(ROOT_DIR / "assets" / "NotoSansDevanagari.ttf")
FONT_BOLD = str(ROOT_DIR / "assets" / "NotoSansDevanagari-Bold.ttf")

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
}

storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def add_watermark(image_bytes: bytes) -> bytes:
    """Draw 'गाजियाबाद टाइम्स' at the bottom-right on a translucent band. Returns JPEG bytes."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    w, h = img.size
    # normalize very large uploads
    max_w = 1600
    if w > max_w:
        h = int(h * max_w / w)
        w = max_w
        img = img.resize((w, h), Image.LANCZOS)

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    font_size = max(18, int(w * 0.045))
    try:
        font = ImageFont.truetype(FONT_BOLD, font_size)
    except Exception:
        font = ImageFont.load_default()

    text = WATERMARK_TEXT
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = int(font_size * 0.5)
    band_h = th + pad * 2

    # translucent gradient band at the bottom
    band = Image.new("RGBA", (w, band_h), (185, 28, 28, 205))
    overlay.paste(band, (0, h - band_h))

    x = w - tw - pad
    y = h - band_h + (band_h - th) // 2 - bbox[1]
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    # small accent dot label on left
    draw.text((pad, y), text, font=ImageFont.truetype(FONT_REG, max(14, int(font_size * 0.7))) if _safe_font(FONT_REG) else font, fill=(255, 255, 255, 230))

    out = Image.alpha_composite(img, overlay).convert("RGB")
    buf = io.BytesIO()
    out.save(buf, format="JPEG", quality=88)
    return buf.getvalue()


def _safe_font(path):
    try:
        ImageFont.truetype(path, 14)
        return True
    except Exception:
        return False
