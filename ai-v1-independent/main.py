"""Independent AI V1 adapter. Does not import or change AI V2."""
import os
import json
import secrets
import logging
import time
import uuid
import asyncio
import random
from fastapi import FastAPI, Request, HTTPException
import httpx

app = FastAPI(title="Ve Binh So AI V1 Independent")
logger = logging.getLogger("uvicorn.error")

@app.on_event("startup")
async def log_gemini_model_availability():
    """One-time, privacy-safe discovery at startup; never log API keys."""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        logger.warning("Gemini startup check: API key not configured")
        return
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0)) as client:
            response = await client.get(
                "https://generativelanguage.googleapis.com/v1beta/models",
                headers={"x-goog-api-key": key},
                params={"pageSize": 100},
            )
        if response.status_code != 200:
            logger.warning("Gemini startup check: upstream_status=%s", response.status_code)
            return
        data = response.json()
        supported = [
            item.get("name", "")
            for item in data.get("models", [])
            if "generateContent" in item.get("supportedGenerationMethods", [])
        ]
        logger.info("Gemini startup check: upstream_status=200 generate_content_models=%s", json.dumps(supported[:30]))
        if data.get("nextPageToken"):
            logger.info("Gemini startup check: more models available on next page")
    except (httpx.RequestError, ValueError, TypeError):
        logger.warning("Gemini startup check: network or response error")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-v1-independent", "provider_configured": bool(os.getenv("GEMINI_API_KEY"))}

def to_gemini_parts(content):
    if isinstance(content, str):
        return [{"text": content}]
    parts = []
    for item in content if isinstance(content, list) else []:
        if item.get("type") == "text":
            parts.append({"text": str(item.get("text", ""))})
        elif item.get("type") == "image_url":
            url = item.get("image_url", {}).get("url", "")
            if url.startswith("data:image/") and ";base64," in url:
                header, data = url.split(",", 1)
                mime = header.split(";")[0][5:]
                parts.append({"inline_data": {"mime_type": mime, "data": data}})
            else:
                raise HTTPException(422, "Only base64 image data URLs are supported")
    return parts or [{"text": ""}]

async def call_gemini(messages, json_mode):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "No independent AI provider configured")
    system = "\n".join(str(m.get("content", "")) for m in messages if m.get("role") == "system")
    contents = [{"role": "model" if m.get("role") == "assistant" else "user",
                 "parts": to_gemini_parts(m.get("content", ""))}
                for m in messages if m.get("role") != "system"]
    body = {"contents": contents, "generationConfig": {"temperature": 0.2, "maxOutputTokens": 3072}}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"
    configured = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
    # Only use models explicitly selected for this project. Fallbacks must be
    # separately validated for availability and free-tier eligibility.
    fallbacks = [m.strip() for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-3.6-flash").split(",") if m.strip()]
    models = list(dict.fromkeys([configured] + fallbacks))[:3]
    last_error = None
    async with httpx.AsyncClient(timeout=httpx.Timeout(35.0, connect=6.0)) as client:
        for model_index, model in enumerate(models):
            model_body = json.loads(json.dumps(body))
            if model.startswith("gemini-2.5-"):
                model_body["generationConfig"]["thinkingConfig"] = {"thinkingBudget": 0}
            for attempt in range(3):
                try:
                    response = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                        headers={"x-goog-api-key": key}, json=model_body,
                    )
                except httpx.TimeoutException:
                    last_error = HTTPException(504, "Gemini timed out; please try again")
                    if attempt < 2:
                        await asyncio.sleep(1.0 + attempt * 1.5)
                        continue
                    break
                except httpx.RequestError:
                    last_error = HTTPException(502, "Cannot connect to Gemini")
                    if attempt < 2:
                        await asyncio.sleep(1.0 + attempt * 1.5)
                        continue
                    break
                if response.status_code == 200:
                    data = response.json()
                    try:
                        result = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
                    except (KeyError, IndexError, TypeError):
                        raise HTTPException(502, "Gemini returned no usable content")
                    if not result.strip():
                        raise HTTPException(502, "Gemini returned empty content")
                    return result
                code = response.status_code
                try:
                    upstream_error = response.json().get("error", {})
                    reason = str(upstream_error.get("status", "unknown"))[:60]
                except (ValueError, TypeError, AttributeError):
                    reason = "unknown"
                logger.warning(
                    "Gemini upstream error: status=%s model=%s reason=%s attempt=%s",
                    code, model, reason, attempt + 1,
                )
                if code == 429:
                    # Do not retry the exhausted model. A different, explicitly
                    # configured model may have its own remaining free quota.
                    last_error = HTTPException(429, "Gemini free quota or rate limit reached")
                    break
                if code in (401, 403):
                    raise HTTPException(503, "Gemini API access denied; check project permissions")
                if code == 400:
                    raise HTTPException(502, "Gemini rejected request or model configuration")
                if code == 404:
                    last_error = HTTPException(503, "Gemini model not available")
                    break
                if code in (500, 502, 503, 504):
                    last_error = HTTPException(503, "Gemini is temporarily busy; please try again")
                    if attempt < 2:
                        await asyncio.sleep((1.0 + attempt * 1.5) + random.uniform(0, 0.3))
                        continue
                    break
                raise HTTPException(502, "Gemini provider returned an unexpected error")
            if model_index + 1 < len(models) and last_error and last_error.status_code in (429, 503, 504, 502):
                logger.warning("Gemini fallback: trying next configured model")
            else:
                break
    raise last_error or HTTPException(503, "Gemini provider unavailable")

@app.get("/admin/gemini-models")
async def diagnostic_models(request: Request):
    """Protected model discovery. Never returns or logs credentials."""
    token = os.getenv("SCAM_API_TOKEN")
    if not token or not secrets.compare_digest(request.headers.get("authorization", ""), f"Bearer {token}"):
        raise HTTPException(401, "Unauthorized")
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "GEMINI_API_KEY is not configured")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
            response = await client.get(
                "https://generativelanguage.googleapis.com/v1beta/models",
                headers={"x-goog-api-key": key},
                params={"pageSize": 100},
            )
    except httpx.RequestError:
        logger.warning("Gemini model discovery network error")
        raise HTTPException(502, "Cannot reach Gemini model listing")
    if response.status_code != 200:
        logger.warning("Gemini model discovery rejected: upstream_status=%s", response.status_code)
        return {"upstream_status": response.status_code, "models": [], "note": "Check Gemini API project access and quota"}
    payload = response.json()
    models = [
        {"name": item.get("name"), "methods": item.get("supportedGenerationMethods", [])}
        for item in payload.get("models", [])
        if "generateContent" in item.get("supportedGenerationMethods", [])
    ]
    logger.info("Gemini model discovery succeeded: generate_content_models=%d", len(models))
    return {"upstream_status": 200, "models": models, "has_more": bool(payload.get("nextPageToken"))}

@app.post("/v1/analyze")
async def analyze(request: Request):
    token = os.getenv("SCAM_API_TOKEN")
    if not token or not secrets.compare_digest(request.headers.get("authorization", ""), f"Bearer {token}"):
        raise HTTPException(401, "Unauthorized")
    if int(request.headers.get("content-length", "0")) > 9_000_000:
        raise HTTPException(413, "Payload too large")
    started = time.monotonic()
    request_id = uuid.uuid4().hex[:12]
    try:
        body = await request.json()
    except (ValueError, TypeError):
        raise HTTPException(400, "Invalid JSON request")
    if not isinstance(body, dict):
        raise HTTPException(422, "Request must be an object")
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages or len(messages) > 30:
        raise HTTPException(422, "Invalid messages")
    json_mode = body.get("response_format", {}).get("type") == "json_object"
    try:
        result = await call_gemini(messages, json_mode)
    except HTTPException as exc:
        logger.warning("V1 request failed: request_id=%s status=%s duration_ms=%d", request_id, exc.status_code, int((time.monotonic()-started)*1000))
        raise
    if json_mode:
        try:
            json.loads(result)
        except ValueError:
            raise HTTPException(502, "Provider returned invalid JSON")
    logger.info("V1 request completed: request_id=%s duration_ms=%d", request_id, int((time.monotonic()-started)*1000))
    return {"choices": [{"message": {"role": "assistant", "content": result}}]}
