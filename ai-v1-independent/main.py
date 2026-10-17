"""Independent AI V1 adapter. Does not import or change AI V2."""
import os
import json
import secrets
import logging
import time
import uuid
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
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    if model.startswith("gemini-2.5-"):
        body["generationConfig"]["thinkingConfig"] = {"thinkingBudget": 0}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(35.0, connect=6.0)) as client:
            response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            headers={"x-goog-api-key": key}, json=body)
    except httpx.TimeoutException:
        raise HTTPException(504, "Gemini timed out; please try again")
    except httpx.RequestError:
        raise HTTPException(502, "Cannot connect to Gemini")
    if response.status_code != 200:
        code = response.status_code
        # Log only Google's error classification and a short sanitized message.
        # Never log request bodies, API keys, tokens, or arbitrary upstream payloads.
        try:
            upstream_error = response.json().get("error", {})
            upstream_reason = str(upstream_error.get("status", "unknown"))[:60]
            upstream_message = str(upstream_error.get("message", ""))
            import re
            upstream_message = re.sub(r"AIza[0-9A-Za-z_-]+", "[REDACTED_KEY]", upstream_message)
            upstream_message = re.sub(r"https?://\\S+", "[REDACTED_URL]", upstream_message)
            upstream_message = upstream_message.replace("\\n", " ")[:280]
        except (ValueError, TypeError, AttributeError):
            upstream_reason, upstream_message = "unknown", "non-json upstream error"
        logger.warning("Gemini request rejected: upstream_status=%s model=%s reason=%s detail=%s", code, model, upstream_reason, upstream_message)
        detail = {400: "Gemini rejected the request or model configuration", 401: "Gemini API key rejected", 403: "Gemini API key lacks permission", 404: "Gemini model not found", 429: "Gemini free quota or rate limit reached"}.get(code, "Gemini provider unavailable")
        raise HTTPException(429 if code == 429 else 503 if code in (401, 403, 404) else 502, detail)
    data = response.json()
    try:
        return "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
    except (KeyError, IndexError, TypeError):
        raise HTTPException(502, "Gemini returned no usable content")

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
