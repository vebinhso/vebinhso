#!/usr/bin/env python3
"""Read-only, conservative RSS knowledge collector for experimental AI Centre.
Never writes to Supabase, production, or the training dataset.
"""
import datetime as dt
import hashlib
import html
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "sources.json").read_text(encoding="utf-8"))
OUT = ROOT / "output"
MAX_BYTES = 1_000_000
MAX_ITEMS = 40
MAX_AGE_DAYS = 30
TERMS = ("lừa đảo", "giả mạo", "chiếm đoạt", "phishing", "mạo danh", "đánh cắp tài khoản")
EXCLUDE = ("tử vong", "tự tử", "xâm hại tình dục")
PHONE = re.compile(r"(?<!\d)(?:\+?84|0)(?:[ .-]?\d){9,10}(?!\d)")
EMAIL = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
ACCOUNT = re.compile(r"\b\d{9,19}\b")
URL = re.compile(r"https?://\S+")
TAGS = re.compile(r"<[^>]*>")
SPACES = re.compile(r"\s+")

def sanitize(raw):
    s = html.unescape(TAGS.sub(" ", str(raw or "")))
    s = URL.sub("[đường dẫn]", s)
    s = EMAIL.sub("[email]", s)
    s = PHONE.sub("[số điện thoại]", s)
    s = ACCOUNT.sub("[dãy số]", s)
    return SPACES.sub(" ", s).strip()[:350]

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, hostname):
        self.hostname = hostname
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        u = urllib.parse.urlsplit(newurl)
        if u.scheme != "https" or u.hostname != self.hostname:
            raise ValueError("Redirect to untrusted host blocked")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def fetch(url):
    u = urllib.parse.urlsplit(url)
    if u.scheme != "https" or not u.hostname or u.username or u.password:
        raise ValueError("Only HTTPS feed URLs are accepted")
    opener = urllib.request.build_opener(SafeRedirect(u.hostname))
    request = urllib.request.Request(url, headers={"User-Agent": "VeBinhSoResearchBot/0.1 (read-only RSS)"})
    with opener.open(request, timeout=12) as response:
        if urllib.parse.urlsplit(response.url).hostname != u.hostname:
            raise ValueError("Untrusted redirect")
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError("Feed too large")
        return ET.fromstring(data)

def local_name(tag):
    return tag.rsplit("}", 1)[-1]

def child_text(item, name):
    for el in item:
        if local_name(el.tag) == name:
            return "".join(el.itertext()).strip()
    return ""

def collect():
    now = dt.datetime.now(dt.timezone.utc)
    accepted, rejected, errors, seen = [], [], [], set()
    for source in CONFIG["feeds"]:
        url = source["url"]
        try:
            root = fetch(url)
            entries = [el for el in root.iter() if local_name(el.tag) in ("item", "entry")][:MAX_ITEMS]
            for item in entries:
                title = sanitize(child_text(item, "title"))
                summary = sanitize(child_text(item, "description") or child_text(item, "summary"))
                link = child_text(item, "link")
                if not link:
                    for el in item:
                        if local_name(el.tag) == "link":
                            link = el.attrib.get("href", "")
                            if link:
                                break
                target = urllib.parse.urlsplit(link)
                if target.scheme != "https" or not target.hostname or not (target.hostname == source["domain"] or target.hostname.endswith("." + source["domain"])):
                    rejected.append({"source": source["name"], "reason": "invalid_article_url"})
                    continue
                joined = (title + " " + summary).lower()
                if not title or not any(word in joined for word in TERMS) or any(word in joined for word in EXCLUDE):
                    continue
                # Only a headline-level signal: never a verified scam example or a training label.
                key = hashlib.sha256((source["name"] + "|" + title.lower()).encode()).hexdigest()[:16]
                if key in seen:
                    continue
                seen.add(key)
                accepted.append({"id": key, "source": source["name"], "title": title,
                                 "summary": summary, "article_url": link,
                                 "status": "candidate_unverified", "collected_at": now.isoformat()})
        except Exception as exc:
            errors.append({"source": source["name"], "error": type(exc).__name__ + ": " + str(exc)[:140]})
    OUT.mkdir(parents=True, exist_ok=True)
    payload = {"generated_at": now.isoformat(), "status": "experimental_not_for_production",
               "items": accepted[:100], "rejected_count": len(rejected), "errors": errors}
    (OUT / "candidates.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Candidate headlines: {len(payload['items'])}; feed errors: {len(errors)}")
    if errors:
        print(json.dumps(errors, ensure_ascii=False))
    # Feed failures must be visible as a failing workflow when no source succeeds.
    if len(errors) == len(CONFIG["feeds"]):
        raise SystemExit("All feeds failed; no trusted update available")

if __name__ == "__main__":
    collect()
