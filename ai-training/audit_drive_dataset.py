"""Standalone safe dataset-audit helper. Never train or publish unreviewed personal data."""
import csv
import json
import re
import sys
from pathlib import Path

PHONE = re.compile(r"(?<!\d)(?:\+?84|0)(?:[ .-]?\d){9,10}(?!\d)")
EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
URL = re.compile(r"https?://\S+", re.I)
ACCOUNT = re.compile(r"(?<!\d)\d{11,19}(?!\d)")

def scrub(value):
    value = EMAIL.sub("[EMAIL]", str(value))
    value = URL.sub("[URL]", value)
    value = PHONE.sub("[PHONE]", value)
    return ACCOUNT.sub("[ACCOUNT]", value)

def audit(path):
    path = Path(path)
    if path.suffix.lower() == ".json":
        records = json.loads(path.read_text(encoding="utf-8-sig"))
    elif path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as stream:
            records = list(csv.DictReader(stream))
    else:
        raise ValueError("Only JSON/CSV supported")
    if not isinstance(records, list):
        raise ValueError("Expected an array of records")
    seen, clean, duplicates, skipped = set(), [], 0, 0
    for row in records:
        if not isinstance(row, dict):
            skipped += 1
            continue
        value = next((row.get(key) for key in ("message", "content", "text", "body") if isinstance(row.get(key), str)), None)
        if not value or len(value.strip()) < 10:
            skipped += 1
            continue
        normalized = " ".join(scrub(value).split())
        fingerprint = normalized.casefold()
        if fingerprint in seen:
            duplicates += 1
            continue
        seen.add(fingerprint)
        clean.append({"text": normalized, "label": str(row.get("label", "unverified")), "review_required": True})
    return {"source": path.name, "total": len(records), "unique": len(clean), "duplicates": duplicates, "skipped": skipped, "labels": sorted(set(x["label"] for x in clean)), "training_ready": False}

if __name__ == "__main__":
    for name in sys.argv[1:]:
        print(json.dumps(audit(name), ensure_ascii=False))
