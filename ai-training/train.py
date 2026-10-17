"""Train a demo Vietnamese scam-message classifier (NOT production-ready)."""
import json
import os
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "data" / "messages_demo.csv"
OUTPUT = ROOT / "output"

def main():
    df = pd.read_csv(INPUT).dropna(subset=["text", "label"])
    df["text"] = df["text"].astype(str).str.strip()
    df = df[df["text"].str.len() > 0].drop_duplicates(subset=["text"])
    assert set(df["label"]) == {"scam", "not_scam"}, "Invalid labels"
    assert df["label"].value_counts().min() >= 5, "Not enough examples per class"

    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], df["label"], test_size=0.25,
        random_state=42, stratify=df["label"]
    )
    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), lowercase=True)),
        ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
    ])
    model.fit(X_train, y_train)
    predicted = model.predict(X_test)
    labels = ["not_scam", "scam"]
    report = classification_report(y_test, predicted, labels=labels, output_dict=True, zero_division=0)
    matrix = confusion_matrix(y_test, predicted, labels=labels).tolist()
    results = {
        "warning": "Synthetic small demo only. Do not claim real-world accuracy or deploy.",
        "train_count": len(X_train),
        "test_count": len(X_test),
        "labels_order": labels,
        "confusion_matrix": matrix,
        "classification_report": report,
    }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, OUTPUT / "scam_text_model.joblib")
    (OUTPUT / "metrics.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(results, ensure_ascii=False, indent=2))
    print("Saved model and metrics to", OUTPUT)

if __name__ == "__main__":
    main()
