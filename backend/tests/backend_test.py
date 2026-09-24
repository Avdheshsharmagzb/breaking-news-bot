"""Backend API tests for गाजियाबाद टाइम्स news app."""
import io
import os
import time

import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://breaking-news-bot-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
CRON_SECRET = "gzbtimes_cron_4f9a2c7e18b64d0aa3e5c9f71b2d8k6q"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# ---------- Public: categories, news, breaking ----------
def test_categories(s):
    r = s.get(f"{API}/categories", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 12
    for c in data:
        assert set(c.keys()) >= {"key", "hi", "en"}


def test_public_news_only_approved(s):
    r = s.get(f"{API}/news?category=all&limit=100", timeout=30)
    assert r.status_code == 200
    for item in r.json():
        assert item["status"] == "Approved"
        assert "_id" not in item
        assert "dedup_key" not in item


def test_breaking(s):
    r = s.get(f"{API}/news/breaking?limit=5", timeout=30)
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list)
    for it in lst:
        assert "id" in it and "title" in it


def test_news_detail_not_approved_returns_404(s):
    # get a pending item
    r = s.get(f"{API}/admin/news?status=Pending_Review&limit=1", timeout=30)
    assert r.status_code == 200
    items = r.json()
    if items:
        pid = items[0]["id"]
        r2 = s.get(f"{API}/news/{pid}", timeout=30)
        assert r2.status_code == 404


# ---------- Admin: stats, list, sources ----------
def test_admin_stats(s):
    r = s.get(f"{API}/admin/stats", timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ("pending", "approved", "rejected", "total"):
        assert k in d
        assert isinstance(d[k], int)


def test_admin_news_sorted(s):
    r = s.get(f"{API}/admin/news?status=Pending_Review&source=all", timeout=30)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    # newest first
    pub = [i["published_at"] for i in items if i.get("published_at")]
    assert pub == sorted(pub, reverse=True)


def test_admin_sources(s):
    r = s.get(f"{API}/admin/sources", timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Admin: fetch (may take up to 60s) ----------
def test_admin_fetch(s):
    r = s.post(f"{API}/admin/fetch", timeout=120)
    assert r.status_code == 200
    d = r.json()
    for k in ("inserted", "skipped_duplicate", "skipped_old"):
        assert k in d and isinstance(d[k], int)


# ---------- Admin: status transitions + edit + delete ----------
@pytest.fixture(scope="module")
def test_item_id():
    """Create a manual item to use across mutation tests."""
    r = requests.post(
        f"{API}/admin/news/manual",
        json={
            "title": "TEST_headline",
            "summary": "TEST_summary",
            "content": "TEST_content body",
            "category": "ghaziabad",
            "region": "गाजियाबाद",
        },
        timeout=30,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "Pending_Review"
    assert d["is_manual"] is True
    return d["id"]


def test_status_invalid(s, test_item_id):
    r = s.patch(f"{API}/admin/news/{test_item_id}/status?status=Bogus", timeout=30)
    assert r.status_code == 400


def test_status_approve_then_reject(s, test_item_id):
    r = s.patch(f"{API}/admin/news/{test_item_id}/status?status=Approved", timeout=30)
    assert r.status_code == 200
    # Public detail must now return 200
    r2 = s.get(f"{API}/news/{test_item_id}", timeout=30)
    assert r2.status_code == 200
    # Now reject
    r3 = s.patch(f"{API}/admin/news/{test_item_id}/status?status=Rejected", timeout=30)
    assert r3.status_code == 200
    r4 = s.get(f"{API}/news/{test_item_id}", timeout=30)
    assert r4.status_code == 404


def test_edit_news(s, test_item_id):
    r = s.patch(
        f"{API}/admin/news/{test_item_id}",
        json={"title": "TEST_edited_title", "category": "noida"},
        timeout=30,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["title"] == "TEST_edited_title"
    assert d["category"] == "noida"
    assert d.get("category_hi") == "नोएडा"


def test_delete_news(s, test_item_id):
    r = s.delete(f"{API}/admin/news/{test_item_id}", timeout=30)
    assert r.status_code == 200
    r2 = s.patch(f"{API}/admin/news/{test_item_id}/status?status=Approved", timeout=30)
    assert r2.status_code == 404


# ---------- AI enhance ----------
def test_enhance_validation(s):
    r = s.post(f"{API}/admin/enhance", json={"title": "", "content": ""}, timeout=30)
    assert r.status_code == 400


def test_enhance_ai(s):
    r = s.post(
        f"{API}/admin/enhance",
        json={
            "title": "गाजियाबाद में सड़क हादसा",
            "content": "गाजियाबाद के इंदिरापुरम में आज सुबह एक तेज रफ्तार कार ने बाइक सवार को टक्कर मार दी।",
        },
        timeout=90,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("title", "summary", "content"):
        assert k in d and isinstance(d[k], str)
    assert len(d["content"]) > 0


# ---------- Image upload with watermark ----------
def test_upload_watermark(s):
    img = Image.new("RGB", (600, 400), (200, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    r = s.post(
        f"{API}/admin/upload",
        files={"file": ("test.jpg", buf, "image/jpeg")},
        timeout=60,
    )
    assert r.status_code == 200, r.text
    url = r.json()["image_url"]
    assert url.startswith("/api/files/")
    # Fetch back
    r2 = s.get(f"{BASE_URL}{url}", timeout=30)
    assert r2.status_code == 200
    assert r2.headers.get("content-type", "").startswith("image/")
    # Verify body is a valid image (watermarked)
    im = Image.open(io.BytesIO(r2.content))
    assert im.size == (600, 400)


# ---------- Cron endpoint auth ----------
def test_cron_no_auth(s):
    r = s.post(f"{API}/cron/fetch-news", timeout=30)
    assert r.status_code == 401


def test_cron_wrong_auth(s):
    r = s.post(f"{API}/cron/fetch-news", headers={"Authorization": "Bearer wrong"}, timeout=30)
    assert r.status_code == 401


def test_cron_correct_auth(s):
    r = s.post(
        f"{API}/cron/fetch-news",
        headers={"Authorization": f"Bearer {CRON_SECRET}"},
        timeout=30,
    )
    assert r.status_code == 200
    assert r.json().get("accepted") is True
