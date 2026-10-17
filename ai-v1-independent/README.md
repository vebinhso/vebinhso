# AI Centre V1 independent — staging only

This is a standalone adapter for the existing V1 server-side contract `POST /v1/analyze`. It does **not** modify V2, the live website, or authentication.

## Render
Create a **new** Render Python web service (do not reuse either V2 service):
- Repository: `vebinhso/vebinhso`
- Branch: `experiment/ai-v1-independent`
- Root directory: `ai-v1-independent`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Auto deploy: off for staging
- Environment: `GEMINI_API_KEY`, `SCAM_API_TOKEN`, optionally `GEMINI_MODEL`
- Never commit or paste secret keys.

## Website staging configuration
The existing TanStack server-side V1 code expects:
- `SCAM_API_URL=https://<new-v1-service>.onrender.com`
- `SCAM_API_TOKEN=<same-secret-as-render>`

Do not point production to the new endpoint before testing all V1 functions. Keep V2 configuration unchanged. Note: this initial adapter uses Gemini only; Groq fallback, robust rate limiting, URL image fetch safety, and full functional parity are **not yet implemented**.

## Tests before release
Check /health; verify 401 with missing token; test valid JSON for text and base64 images; test both languages and each V1 checker; confirm no requests to Lovable AI Gateway; regression-test V2 and login. Free tiers have quotas and may change.
