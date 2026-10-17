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
    # Text/vision API can run independently of the optional local scam classifier.
    if path and not Path(path).is_file():
        raise RuntimeError("Configured SCAM_MODEL_PATH does not exist")
    # Keep health checks available during configuration; authenticated routes fail closed.
    if path:
        _model = joblib.load(path)  # Only load artifacts built by our trusted pipeline.
    yield
    _model = None

app = FastAPI(title="Vệ Binh Số scam classification prototype", docs_url=None, redoc_url=None, lifespan=lifespan)

@app.get("/health")
def health():
    provider_ready = bool(os.getenv("AI_PROVIDER_API_KEY") and os.getenv("AI_PROVIDER_MODEL"))
    return {"status": "ready" if (_model is not None or provider_ready) else "unavailable", "model_loaded": _model is not None, "provider_configured": provider_ready}


class Request(BaseModel):
    text: str = Field(min_length=10, max_length=3000)

@app.post("/classify")
def classify(body: Request, authorization: str | None = Header(default=None)):
    import hmac
    token = os.getenv("SCAM_API_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="API authentication is not configured")
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
    if _model is None:
        raise HTTPException(status_code=503, detail="Local classifier is not configured")
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

# Optional general-purpose vision/text provider for all nine AI Centre checks.
# Credentials remain on Render; the website calls this endpoint only server-side.
class AnalyzeRequest(BaseModel):
    messages: list[dict] = Field(min_length=1, max_length=12)
    response_format: dict | None = None

@app.post("/v1/analyze")
async def analyze(body: AnalyzeRequest, authorization: str | None = Header(default=None)):
    import hmac
    import httpx
    from urllib.parse import urlparse
    token = os.getenv("SCAM_API_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="API authentication is not configured")
    if not authorization or not hmac.compare_digest(authorization, "Bearer " + token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    key = os.getenv("AI_PROVIDER_API_KEY")
    endpoint = os.getenv("AI_PROVIDER_URL", "https://api.openai.com/v1/chat/completions")
    model = os.getenv("AI_PROVIDER_MODEL")
    if not key or not model:
        raise HTTPException(status_code=503, detail="Independent AI provider is not configured")
    parsed = urlparse(endpoint)
    if parsed.scheme != "https" or not parsed.hostname or parsed.hostname.endswith("lovable.dev"):
        raise HTTPException(status_code=503, detail="Invalid AI provider endpoint")
    # Do not let the caller choose a different upstream host or model.
    # Bound inputs, especially embedded image/video frames.
    payload = body.model_dump(exclude_none=True)
    if len(__import__("json").dumps(payload)) > 15_000_000:
        raise HTTPException(status_code=413, detail="Input too large")
    payload["model"] = model
    try:
        async with httpx.AsyncClient(timeout=90, follow_redirects=False) as client:
            response = await client.post(endpoint, json=payload, headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"
            })
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="AI provider unavailable")
    if response.status_code != 200:
        # Log only the upstream status and safe, allowlisted error category.
        # Never log the response body, request content, credentials or student data.
        import logging
        upstream_status = response.status_code
        category = {
            400: "invalid_request",
            401: "provider_authentication",
            403: "provider_permission",
            404: "model_or_endpoint_not_found",
            408: "provider_timeout",
            429: "provider_rate_limit",
            500: "provider_internal_error",
            502: "provider_gateway_error",
            503: "provider_unavailable",
            504: "provider_timeout",
        }.get(upstream_status, "other_provider_error")
        logging.getLogger("uvicorn.error").warning(
            "Gemini upstream rejected request: status=%d category=%s", upstream_status, category
        )
        raise HTTPException(status_code=502, detail="AI provider rejected the request")
    try:
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        if not isinstance(content, str):
            raise ValueError("Missing text response")
        return {"choices": [{"message": {"content": content}}]}
    except (ValueError, KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="Invalid AI provider response")
