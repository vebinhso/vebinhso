"""Audit a locally supplied JSON dataset without publishing its contents.

Usage: python ai-training/audit_dataset.py private.json --text-field message
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path

def normalized(text):
    text = re.sub(r"https?://[^\s]+", "[URL]", text, flags=re.I)
    text = re.sub(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", "[EMAIL]", text)
    text = re.sub(r"(?<!\d)\d{8,19}(?!\d)", "[NUMBER]", text)
    return " ".join(text.lower().split())

def audit(records, text_field="message", label_field="label"):
    if not isinstance(records, list):
        raise ValueError("JSON root must be a list")
    labels = Counter()
    fingerprints = Counter()
    rejected = 0
    for row in records:
        if not isinstance(row, dict):
            rejected += 1
            continue
        message = row.get(text_field)
        label = row.get(label_field)
        if not isinstance(message, str) or not message.strip() or not isinstance(label, str) or not label.strip():
            rejected += 1
            continue
        labels[label.strip()] += 1
        fingerprints[normalized(message)] += 1
    return {
        "total": len(records),
        "invalid": rejected,
        "labels": dict(labels),
        "duplicates_after_normalization": sum(count - 1 for count in fingerprints.values()),
        "has_multiple_labels": len(labels) >= 2,
        "note": "Automated checks only; human review required for labels and personal data."
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=Path)
    parser.add_argument("--text-field", default="message")
    parser.add_argument("--label-field", default="label")
    args = parser.parse_args()
    records = json.loads(args.path.read_text(encoding="utf-8-sig"))
    print(json.dumps(audit(records, args.text_field, args.label_field), ensure_ascii=False, indent=2))
