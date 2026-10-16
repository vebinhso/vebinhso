"""Check challenge dataset quality and prevent overlap with demo training data."""
import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def canonical(text):
    text = re.sub(r"https?://\S+", "[URL]", text, flags=re.I)
    text = re.sub(r"\b\d{8,19}\b", "[NUMBER]", text)
    return " ".join(text.casefold().split())

def read_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))

def main():
    train = read_rows(ROOT / "data" / "messages_demo.csv")
    challenge = read_rows(ROOT / "data" / "news_inspired_v1.csv")
    assert len(train) == 40, "Unexpected demo dataset size"
    assert len(challenge) >= 10, "Challenge dataset too small"
    assert all(r.get("label") in ("scam", "not_scam") for r in challenge)
    assert all(r.get("text", "").strip() for r in challenge)
    assert {"scam", "not_scam"} == {r["label"] for r in challenge}
    assert all(r.get("source_type") in ("news_inspired", "synthetic_control") for r in challenge)
    assert all(r.get("source_url", "").startswith("https://") for r in challenge if r["source_type"] == "news_inspired")
    train_keys = {canonical(r["text"]) for r in train}
    challenge_keys = [canonical(r["text"]) for r in challenge]
    assert len(set(challenge_keys)) == len(challenge_keys), "Duplicate challenge text"
    assert not train_keys.intersection(challenge_keys), "Train/test leakage detected"
    print(f"PASS: {len(train)} demo records; {len(challenge)} independent challenge records; no exact normalized overlap.")

if __name__ == "__main__":
    main()
