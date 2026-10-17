"""Train on a privately supplied labeled Vietnamese dataset (not committed).

Place dataset_lua_dao_vi.csv in ai-training/private/ (gitignored).
Required columns: mau, noi_dung, nhan (0/1), tap (train/test).
"""
import json
from pathlib import Path
import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "private" / "dataset_lua_dao_vi.csv"
OUT = ROOT / "output"
def main():
    df = pd.read_csv(DATA)
    required = {"mau", "noi_dung", "nhan", "tap"}
    assert required.issubset(df.columns), "Missing required columns"
    assert not df[list(required)].isna().any().any(), "Missing required values"
    assert set(df.nhan) == {0, 1}, "Expected binary labels 0 and 1"
    assert set(df.tap) == {"train", "test"}
    train = df[df.tap == "train"].copy()
    test = df[df.tap == "test"].copy()
    assert not set(train.mau) & set(test.mau), "Group leakage"
    normalize = lambda s: " ".join(str(s).casefold().split())
    assert not set(train.noi_dung.map(normalize)) & set(test.noi_dung.map(normalize)), "Text leakage"
    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), lowercase=True, sublinear_tf=True)),
        ("classifier", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
    ])
    model.fit(train.noi_dung, train.nhan)
    pred = model.predict(test.noi_dung)
    probs = model.predict_proba(test.noi_dung)[:, list(model.classes_).index(1)]
    result = {
        "train_count": len(train), "test_count": len(test),
        "accuracy": accuracy_score(test.nhan, pred),
        "labels_order": [0, 1],
        "confusion_matrix": confusion_matrix(test.nhan, pred, labels=[0, 1]).tolist(),
        "classification_report": classification_report(test.nhan, pred, labels=[0, 1], output_dict=True, zero_division=0),
        "warning": "Dataset provenance and generalization not independently verified. Not for deployment.",
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "metrics_real_dataset.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    errors = test.loc[test.nhan.to_numpy() != pred, ["mau", "nhan"]].copy()
    errors["predicted"] = pred[test.nhan.to_numpy() != pred]
    errors["scam_probability"] = probs[test.nhan.to_numpy() != pred].round(4)
    errors.to_csv(OUT / "errors_real_dataset.csv", index=False)
    joblib.dump(model, OUT / "scam_text_model_real_dataset.joblib")
    print(json.dumps({"accuracy": result["accuracy"], "confusion_matrix": result["confusion_matrix"]}))
if __name__ == "__main__":
    main()
