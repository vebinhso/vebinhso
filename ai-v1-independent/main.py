"""Independent AI V1 adapter. Does not import or change AI V2."""
import os
import json
import secrets
from fastapi import FastAPI, Request, HTTPException
import httpx

app = FastAPI(title="Ve Binh So AI V1 Independent")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-v1-independent", "provider_configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY"))}

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
    body = {"contents": contents, "generationConfig": {"temperature": 0.2}}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    async with httpx.AsyncClient(timeout=75) as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            headers={"x-goog-api-key": key}, json=body)
    if response.status_code != 200:
        raise HTTPException(429 if response.status_code == 429 else 502,
                            "Gemini provider unavailable")
    data = response.json()
    try:
        return "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
    except (KeyError, IndexError, TypeError):
        raise HTTPException(502, "Gemini returned no usable content")

@app.post("/v1/analyze")
async def analyze(request: Request):
    token = os.getenv("SCAM_API_TOKEN")
    if not token or not secrets.compare_digest(request.headers.get("authorization", ""), f"Bearer {token}"):
        raise HTTPException(401, "Unauthorized")
    if int(request.headers.get("content-length", "0")) > 9_000_000:
        raise HTTPException(413, "Payload too large")
    body = await request.json()
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages or len(messages) > 30:
        raise HTTPException(422, "Invalid messages")
    json_mode = body.get("response_format", {}).get("type") == "json_object"
    result = await call_gemini(messages, json_mode)
    if json_mode:
        try:
            json.loads(result)
        except ValueError:
            raise HTTPException(502, "Provider returned invalid JSON")
    return {"choices": [{"message": {"role": "assistant", "content": result}}]}
