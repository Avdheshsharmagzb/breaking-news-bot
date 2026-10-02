"""Tests for new features: video upload, transcribe, manual w/video, approve-rewrite regression."""
import io
import os
import struct
import wave

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# Smallest valid MP4 (ftyp + mdat) ~ few bytes. Use a tiny webm-ish fallback.
def _tiny_mp4_bytes() -> bytes:
    # ftyp box: size(4)+type(4)+major_brand(4)+minor_version(4)+compat_brand(4)
    ftyp = struct.pack(">I", 20) + b"ftyp" + b"isom" + struct.pack(">I", 512) + b"isom"
    mdat = struct.pack(">I", 8) + b"mdat"
    return ftyp + mdat


# ------------- Video upload -------------
def test_upload_video_small_ok(s):
    data = _tiny_mp4_bytes()
    r = s.post(f"{API}/admin/upload-video",
               files={"file": ("tiny.mp4", io.BytesIO(data), "video/mp4")}, timeout=60)
    assert r.status_code == 200, r.text
    url = r.json()["video_url"]
    assert url.startswith("/api/files/")
    # Fetch back
    r2 = s.get(f"{BASE_URL}{url}", timeout=30)
    assert r2.status_code == 200
    assert r2.headers.get("content-type", "").startswith("video/")


def test_upload_video_too_large_rejected(s, monkeypatch=None):
    # Simulate >60MB by sending a chunk >60MB? Instructions say DO NOT actually upload 60MB.
    # Verify endpoint responds reasonably with a tiny file (positive case already covered).
    # Skip the physical over-size test to avoid network cost. Mark xfail-informational.
    pytest.skip("Not sending 60MB payload in CI (per test instructions). Positive case covered.")


# ------------- Transcribe endpoint exists & handles small audio -------------
def _tiny_wav_bytes() -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 1600)  # 0.1s silence
    return buf.getvalue()


def test_transcribe_endpoint_exists(s):
    audio = _tiny_wav_bytes()
    r = s.post(f"{API}/admin/transcribe",
               files={"file": ("speech.wav", io.BytesIO(audio), "audio/wav")}, timeout=90)
    # Either succeeds with text or returns clean 400 (not 404/500/import error)
    assert r.status_code in (200, 400), f"Unexpected status {r.status_code}: {r.text}"
    if r.status_code == 200:
        assert "text" in r.json()
    else:
        assert "ट्रांसक्रिप्शन" in r.json().get("detail", "") or "विफल" in r.json().get("detail", "")


# ------------- Manual w/ video_url persists & approve returns video_url -------------
@pytest.fixture(scope="module")
def manual_video_item(s):
    # upload tiny video first
    data = _tiny_mp4_bytes()
    up = s.post(f"{API}/admin/upload-video",
                files={"file": ("mv.mp4", io.BytesIO(data), "video/mp4")}, timeout=60)
    assert up.status_code == 200
    video_url = up.json()["video_url"]
    r = s.post(f"{API}/admin/news/manual", json={
        "title": "TEST_video_item",
        "summary": "TEST video summary",
        "content": "TEST video content body paragraph.",
        "category": "ghaziabad",
        "region": "गाजियाबाद",
        "video_url": video_url,
        "ai_enhanced": True,  # skip approve rewrite to keep test fast
    }, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["is_manual"] is True
    assert d["status"] == "Pending_Review"
    assert d["video_url"] == video_url
    return d


def test_manual_persists_video_url(s, manual_video_item):
    # Verify via admin list
    r = s.get(f"{API}/admin/news?status=Pending_Review&limit=200", timeout=30)
    assert r.status_code == 200
    found = next((x for x in r.json() if x["id"] == manual_video_item["id"]), None)
    assert found is not None
    assert found["video_url"] == manual_video_item["video_url"]


def test_approve_manual_video_returns_video_url(s, manual_video_item):
    iid = manual_video_item["id"]
    r = s.patch(f"{API}/admin/news/{iid}/status?status=Approved", timeout=120)
    assert r.status_code == 200
    r2 = s.get(f"{API}/news/{iid}", timeout=30)
    assert r2.status_code == 200
    d = r2.json()
    assert d.get("video_url") == manual_video_item["video_url"]
    assert d["source"] == "गाजियाबाद टाइम्स"
    # cleanup
    s.delete(f"{API}/admin/news/{iid}", timeout=30)


# ------------- Regression: approve triggers rewrite + brand -------------
def test_approve_rewrites_and_brands(s):
    # create a non-ai_enhanced manual item
    r = s.post(f"{API}/admin/news/manual", json={
        "title": "TEST_regr_original",
        "summary": "रॉ सामग्री",
        "content": "गाजियाबाद में एक छोटी सी घटना घटी जिसमें कोई हताहत नहीं हुआ।",
        "category": "ghaziabad",
        "region": "गाजियाबाद",
        "ai_enhanced": False,
    }, timeout=30)
    assert r.status_code == 200
    iid = r.json()["id"]
    try:
        ap = s.patch(f"{API}/admin/news/{iid}/status?status=Approved", timeout=120)
        assert ap.status_code == 200
        pub = s.get(f"{API}/news/{iid}", timeout=30)
        assert pub.status_code == 200
        d = pub.json()
        assert d["source"] == "गाजियाबाद टाइम्स"
        assert d["ai_enhanced"] is True
    finally:
        s.delete(f"{API}/admin/news/{iid}", timeout=30)


def test_public_only_approved_hides_origin_from_detail(s):
    # Public endpoints should include source but not expose dedup_key / _id
    r = s.get(f"{API}/news?limit=5", timeout=30)
    assert r.status_code == 200
    for it in r.json():
        assert it["status"] == "Approved"
        assert "_id" not in it
        assert "dedup_key" not in it
