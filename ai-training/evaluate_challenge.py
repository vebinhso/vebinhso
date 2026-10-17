"""Independent challenge-set evaluation; never train on these examples."""
import json
from pathlib import Path
import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "news_inspired_v1.csv"
MODEL = ROOT / "output" / "scam_text_model.joblib"
OUT = ROOT / "output" / "challenge_metrics.json"

def main():
    df = pd.read_csv(DATA).dropna(subset=["text", "label"])
    assert set(df["label"]) == {"scam", "not_scam"}
    assert not df["text"].duplicated().any()
    model = joblib.load(MODEL)  # Load only our own artifact created in this workflow.
    predicted = model.predict(df["text"])
    labels = ["not_scam", "scam"]
    result = {
        "dataset": "news_inspired_v1.csv",
        "test_count": len(df),
        "label_counts": df["label"].value_counts().to_dict(),
        "labels_order": labels,
        "confusion_matrix": confusion_matrix(df["label"], predicted, labels=labels).tolist(),
        "classification_report": classification_report(
            df["label"], predicted, labels=labels, output_dict=True, zero_division=0
        ),
        "warning": "Small synthetic challenge set. This is not real-world accuracy; do not deploy."
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
