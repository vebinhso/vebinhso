"""Privacy-conscious inference API prototype. Deploy only after security review.

Install: pip install fastapi uvicorn joblib scikit-learn pydantic
Start: SCAM_MODEL_PATH=/secure/candidate_v2.joblib SCAM_API_TOKEN=... uvicorn inference_api:app
"""
import os
import time
from collections import deque
from threading import Lock
from contextlib import asynccontextmanager
from pathlib import Path
import joblib
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

_model = None
# Per-process safety cap (shared across all callers of this private API).
# Also configure rate limiting at the reverse proxy for multi-worker deployments.
_requests = deque()
_requests_lock = Lock()
RATE_LIMIT_PER_MINUTE = 30

@asynccontextmanager
async def lifespan(app):
    global _model
    path = os.getenv("SCAM_MODEL_PATH")
    if not path or not Path(path).is_file():
        raise RuntimeError("SCAM_MODEL_PATH must point to a trusted local model artifact")
    if not os.getenv("SCAM_API_TOKEN"):
        raise RuntimeError("SCAM_API_TOKEN is required")
    _model = joblib.load(path)  # Only load artifacts built by our trusted pipeline.
    yield
    _model = None

app = FastAPI(title="Vệ Binh Số scam classification prototype", docs_url=None, redoc_url=None, lifespan=lifespan)

class Request(BaseModel):
    text: str = Field(min_length=10, max_length=3000)

@app.post("/classify")
def classify(body: Request, authorization: str | None = Header(default=None)):
    import hmac
    token = os.environ["SCAM_API_TOKEN"]
    if not authorization or not hmac.compare_digest(authorization, "Bearer " + token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    # Fixed-window global cap, independent of spoofable X-Forwarded-For headers.
    # Check only after authentication so anonymous requests cannot exhaust the quota.
    now = time.monotonic()
    with _requests_lock:
        while _requests and now - _requests[0] >= 60:
            _requests.popleft()
        if len(_requests) >= RATE_LIMIT_PER_MINUTE:
            raise HTTPException(status_code=429, detail="Rate limit exceeded", headers={"Retry-After": "60"})
        _requests.append(now)
    probability = float(_model.predict_proba([body.text])[0][list(_model.classes_).index(1)])
    # Deliberately conservative and not calibrated; do not show probability as certainty.
    if probability >= 0.8:
        status = "risk_indicated"
    elif probability <= 0.2:
        status = "no_clear_sign"
    else:
        status = "uncertain"
    return {
        "status": status,
        "model_version": "candidate-v2-experimental",
        "review_required": True,
        "note": "This automated classification is not proof that a message is safe or fraudulent."
    }
