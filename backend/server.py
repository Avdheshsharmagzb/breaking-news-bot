import hashlib
import hmac
import html as html_lib
import json
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import feedparser
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, FastAPI, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import feeds as feeds_mod  # noqa: E402
import storage as store  # noqa: E402

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
WEBHOOK_CRON_SECRET = os.environ.get("WEBHOOK_CRON_SECRET", "")
FETCH_WINDOW_HOURS = 8
AI_MODEL = ("gemini", "gemini-3-flash-preview")

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("gzb-times")


# ---------------------------------------------------------------- Models
class NewsItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    summary: str = ""
    content: str = ""
    source: str = ""
    source_url: str = ""
    image_url: Optional[str] = None
    category: str = "rashtriya"
    category_hi: str = "राष्ट्रीय"
    region: str = ""
    published_at: str = ""
    status: str = "Pending_Review"
    is_manual: bool = False
    ai_enhanced: bool = False
    dedup_key: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EnhanceRequest(BaseModel):
    title: str = ""
    content: str = ""


class ManualNews(BaseModel):
    title: str
    summary: str = ""
    content: str
    category: str = "ghaziabad"
    region: str = "गाजियाबाद"
    image_url: Optional[str] = None
    ai_enhanced: bool = False


class EditNews(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


# ---------------------------------------------------------------- Helpers
def strip_html(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw)
    text = html_lib.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def extract_image(entry) -> Optional[str]:
    for key in ("media_content", "media_thumbnail"):
        media = entry.get(key)
        if media and isinstance(media, list) and media[0].get("url"):
            return media[0]["url"]
    for link in entry.get("links", []):
        if link.get("type", "").startswith("image") and link.get("href"):
            return link["href"]
    m = re.search(r'<img[^>]+src="([^"]+)"', entry.get("summary", ""))
    if m:
        return m.group(1)
    return None


def parse_published(entry):
    for attr in ("published_parsed", "updated_parsed"):
        tp = entry.get(attr)
        if tp:
            return datetime(*tp[:6], tzinfo=timezone.utc)
    return None


def source_from_entry(entry, title):
    src = entry.get("source", {})
    if isinstance(src, dict) and src.get("title"):
        return src["title"]
    # Google News titles are "Headline - Publisher"
    if " - " in title:
        return title.rsplit(" - ", 1)[1].strip()
    return "समाचार स्रोत"


def clean_title(title):
    if " - " in title:
        return title.rsplit(" - ", 1)[0].strip()
    return title.strip()


def fetch_single_feed(url: str):
    try:
        resp = requests.get(url, timeout=12, headers={"User-Agent": "Mozilla/5.0 (GhaziabadTimes)"})
        return feedparser.parse(resp.content)
    except Exception as e:
        logger.warning(f"feed fetch failed {url}: {e}")
        return None


async def run_fetch() -> dict:
    """Pull all feeds, keep only items < 8h old, dedupe, insert as Pending_Review."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=FETCH_WINDOW_HOURS)
    inserted, skipped_old, skipped_dup = 0, 0, 0

    for category, category_hi, region, url in feeds_mod.FEEDS:
        parsed = fetch_single_feed(url)
        if not parsed:
            continue
        for entry in parsed.entries[:20]:
            published = parse_published(entry)
            if not published or published < cutoff:
                skipped_old += 1
                continue
            link = entry.get("link", "")
            raw_title = entry.get("title", "").strip()
            if not raw_title or not link:
                continue
            dedup_key = hashlib.sha256(link.encode("utf-8")).hexdigest()
            if await db.news.find_one({"dedup_key": dedup_key}, {"_id": 1}):
                skipped_dup += 1
                continue
            title = clean_title(raw_title)
            summary = strip_html(entry.get("summary", ""))[:600]
            item = NewsItem(
                title=title,
                summary=summary or title,
                content=summary or title,
                source=source_from_entry(entry, raw_title),
                source_url=link,
                image_url=extract_image(entry),
                category=category,
                category_hi=category_hi,
                region=region,
                published_at=published.isoformat(),
                status="Pending_Review",
                dedup_key=dedup_key,
            )
            await db.news.insert_one(item.model_dump())
            inserted += 1

    logger.info(f"fetch done: inserted={inserted} dup={skipped_dup} old={skipped_old}")
    return {"inserted": inserted, "skipped_duplicate": skipped_dup, "skipped_old": skipped_old}


async def ai_rewrite(title: str, content: str) -> dict:
    """Rewrite headline + body to high-standard Hindi journalism. Returns dict."""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"rewrite-{uuid.uuid4()}",
        system_message=(
            "आप 'गाजियाबाद टाइम्स' के वरिष्ठ समाचार संपादक हैं। दिए गए कच्चे समाचार को "
            "उच्च स्तरीय, निष्पक्ष, शुद्ध और पेशेवर हिंदी पत्रकारिता की शैली में पुनर्लेखित करें। "
            "तथ्य न बदलें, न बढ़ाएँ। सनसनीखेज भाषा से बचें। "
            "केवल एक वैध JSON ऑब्जेक्ट लौटाएँ जिसमें ये कुंजियाँ हों: "
            "title (आकर्षक शीर्षक), summary (1-2 वाक्य का सार), content (2-4 सुव्यवस्थित अनुच्छेद)।"
        ),
    ).with_model(*AI_MODEL)
    msg = UserMessage(text=f"शीर्षक: {title}\n\nसामग्री: {content}")
    reply = await chat.send_message(msg)
    text = reply.strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(0))
            return {
                "title": (data.get("title") or title).strip(),
                "summary": (data.get("summary") or "").strip(),
                "content": (data.get("content") or content).strip(),
            }
        except Exception:
            pass
    return {"title": title, "summary": "", "content": text or content}


def to_public(doc: dict) -> dict:
    doc.pop("_id", None)
    doc.pop("dedup_key", None)
    return doc


# ---------------------------------------------------------------- Public routes
@api_router.get("/")
async def root():
    return {"message": "गाजियाबाद टाइम्स API"}


@api_router.get("/categories")
async def get_categories():
    return feeds_mod.CATEGORIES


@api_router.get("/news")
async def public_news(category: Optional[str] = None, limit: int = 60):
    query = {"status": "Approved"}
    if category and category != "all":
        query["category"] = category
    docs = await db.news.find(query, {"dedup_key": 0}).sort("published_at", -1).to_list(limit)
    return [to_public(d) for d in docs]


@api_router.get("/news/breaking")
async def breaking(limit: int = 10):
    docs = await db.news.find({"status": "Approved"}, {"title": 1, "id": 1}).sort("published_at", -1).to_list(limit)
    return [{"id": d["id"], "title": d["title"]} for d in docs]


@api_router.get("/news/{item_id}")
async def news_detail(item_id: str):
    doc = await db.news.find_one({"id": item_id, "status": "Approved"}, {"dedup_key": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="News not found")
    return to_public(doc)


# ---------------------------------------------------------------- Admin routes
@api_router.get("/admin/stats")
async def admin_stats():
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    agg = {row["_id"]: row["count"] async for row in db.news.aggregate(pipeline)}
    return {
        "pending": agg.get("Pending_Review", 0),
        "approved": agg.get("Approved", 0),
        "rejected": agg.get("Rejected", 0),
        "total": sum(agg.values()),
    }


@api_router.get("/admin/news")
async def admin_news(status: str = "Pending_Review", source: Optional[str] = None, limit: int = 200):
    query = {"status": status}
    if source and source != "all":
        query["source"] = source
    docs = await db.news.find(query, {"dedup_key": 0}).sort("published_at", -1).to_list(limit)
    return [to_public(d) for d in docs]


@api_router.get("/admin/sources")
async def admin_sources():
    return sorted([s for s in await db.news.distinct("source") if s])


@api_router.post("/admin/fetch")
async def admin_fetch():
    result = await run_fetch()
    return result


@api_router.patch("/admin/news/{item_id}/status")
async def set_status(item_id: str, status: str = Query(...)):
    if status not in ("Pending_Review", "Approved", "Rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.news.update_one(
        {"id": item_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    return {"ok": True, "status": status}


@api_router.patch("/admin/news/{item_id}")
async def edit_news(item_id: str, payload: EditNews):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "category" in updates:
        lbl = feeds_mod.CATEGORY_LABELS.get(updates["category"])
        if lbl:
            updates["category_hi"] = lbl["hi"]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.news.update_one({"id": item_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    doc = await db.news.find_one({"id": item_id}, {"dedup_key": 0})
    return to_public(doc)


@api_router.delete("/admin/news/{item_id}")
async def delete_news(item_id: str):
    res = await db.news.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    return {"ok": True}


@api_router.post("/admin/enhance")
async def enhance(req: EnhanceRequest):
    if not req.title and not req.content:
        raise HTTPException(status_code=400, detail="Provide title or content")
    result = await ai_rewrite(req.title, req.content)
    return result


@api_router.post("/admin/upload")
async def upload_image(file: UploadFile = File(...)):
    data = await file.read()
    try:
        watermarked = store.add_watermark(data)
    except Exception as e:
        logger.error(f"watermark failed: {e}")
        raise HTTPException(status_code=400, detail="अमान्य छवि फ़ाइल")
    path = f"{store.APP_NAME}/news/{uuid.uuid4()}.jpg"
    result = store.put_object(path, watermarked, "image/jpeg")
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": "image/jpeg",
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"image_url": f"/api/files/{result['path']}"}


@api_router.post("/admin/news/manual")
async def create_manual(payload: ManualNews):
    lbl = feeds_mod.CATEGORY_LABELS.get(payload.category, {"hi": payload.region})
    item = NewsItem(
        title=payload.title,
        summary=payload.summary or payload.content[:200],
        content=payload.content,
        source="गाजियाबाद टाइम्स",
        source_url="",
        image_url=payload.image_url,
        category=payload.category,
        category_hi=lbl.get("hi", ""),
        region=payload.region,
        published_at=datetime.now(timezone.utc).isoformat(),
        status="Pending_Review",
        is_manual=True,
        ai_enhanced=payload.ai_enhanced,
        dedup_key=hashlib.sha256(f"manual-{uuid.uuid4()}".encode()).hexdigest(),
    )
    await db.news.insert_one(item.model_dump())
    return to_public(item.model_dump())


# ---------------------------------------------------------------- File serving (public site is open)
@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = store.get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))


# ---------------------------------------------------------------- Cron
@api_router.post("/cron/fetch-news")
async def cron_fetch(background_tasks: BackgroundTasks, authorization: str = Header(None)):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    expected = f"Bearer {WEBHOOK_CRON_SECRET}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")
    background_tasks.add_task(run_fetch)
    return {"accepted": True}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.news.create_index("dedup_key", unique=True)
        await db.news.create_index([("status", 1), ("published_at", -1)])
    except Exception as e:
        logger.warning(f"index setup: {e}")
    try:
        store.init_storage()
        logger.info("storage initialized")
    except Exception as e:
        logger.error(f"storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
