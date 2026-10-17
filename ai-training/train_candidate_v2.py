"""Experimental Vietnamese scam classifier. Requires private local CSV; never deploy directly."""
import json
from pathlib import Path
import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "private" / "dataset_lua_dao_vi.csv"
OUT = ROOT / "output"

def main():
    df = pd.read_csv(DATA)
    required = {"mau", "noi_dung", "nhan", "tap"}
    assert required.issubset(df.columns)
    assert not df[list(required)].isna().any().any()
    assert set(df.nhan) == {0, 1} and set(df.tap) == {"train", "test"}
    train, test = df[df.tap == "train"], df[df.tap == "test"]
    assert not set(train.mau) & set(test.mau), "Train/test group leakage"
    model = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 6), sublinear_tf=True)),
        ("classifier", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
    ])
    model.fit(train.noi_dung, train.nhan)
    predicted = model.predict(test.noi_dung)
    probabilities = model.predict_proba(test.noi_dung)[:, list(model.classes_).index(1)]
    result = {
        "model": "char_wb TF-IDF 2-6 + Logistic Regression",
        "train_count": len(train), "test_count": len(test),
        "accuracy": accuracy_score(test.nhan, predicted),
        "confusion_matrix": confusion_matrix(test.nhan, predicted, labels=[0, 1]).tolist(),
        "classification_report": classification_report(test.nhan, predicted, labels=[0, 1], output_dict=True, zero_division=0),
        "caution": "Exploratory comparison on previously examined test set. Requires a fresh independent validation set before release."
    }
    OUT.mkdir(exist_ok=True)
    (OUT / "metrics_candidate_v2.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    joblib.dump(model, OUT / "candidate_v2.joblib")
    errors = test.loc[test.nhan.to_numpy() != predicted, ["id", "mau", "danh_muc", "nhan"]].copy()
    errors["predicted"] = predicted[test.nhan.to_numpy() != predicted]
    errors.to_csv(OUT / "candidate_v2_errors.csv", index=False)
    print(json.dumps({"accuracy": result["accuracy"], "confusion_matrix": result["confusion_matrix"]}, ensure_ascii=False))

if __name__ == "__main__":
    main()
