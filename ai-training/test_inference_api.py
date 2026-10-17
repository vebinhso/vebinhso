import unittest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
import inference_api

class FakeModel:
    classes_ = [0, 1]
    def __init__(self, p): self.p = p
    def predict_proba(self, texts): return [[1 - self.p, self.p]]

class TestApi(unittest.TestCase):
    def setUp(self):
        inference_api._requests.clear()
        self.old_model = inference_api._model
        inference_api._model = FakeModel(0.5)
        self.old_token = __import__("os").environ.get("SCAM_API_TOKEN")
        __import__("os").environ["SCAM_API_TOKEN"] = "test-only-token"

    def tearDown(self):
        inference_api._model = self.old_model
        import os
        if self.old_token is None: os.environ.pop("SCAM_API_TOKEN", None)
        else: os.environ["SCAM_API_TOKEN"] = self.old_token

    def request(self, text="Thông báo kiểm tra tin nhắn thử nghiệm"):
        # Use ASGI transport without running startup for mock model.
        import asyncio
        import httpx
        async def run():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=inference_api.app), base_url="http://test") as client:
                return await client.post("/classify", json={"text": text}, headers={"Authorization": "Bearer test-only-token"})
        return asyncio.run(run())

    def test_uncertain(self):
        self.assertEqual(self.request().json()["status"], "uncertain")

    def test_risk(self):
        inference_api._model = FakeModel(0.91)
        self.assertEqual(self.request().json()["status"], "risk_indicated")

    def test_no_clear_sign(self):
        inference_api._model = FakeModel(0.09)
        self.assertEqual(self.request().json()["status"], "no_clear_sign")

    def test_rate_limit(self):
        for _ in range(inference_api.RATE_LIMIT_PER_MINUTE):
            self.assertEqual(self.request().status_code, 200)
        response = self.request()
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers.get("retry-after"), "60")

    def test_invalid_token_does_not_use_quota(self):
        import asyncio
        import httpx
        async def run():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=inference_api.app), base_url="http://test") as client:
                return await client.post("/classify", json={"text": "Đây là tin nhắn kiểm thử đủ dài"}, headers={"Authorization": "Bearer wrong"})
        self.assertEqual(asyncio.run(run()).status_code, 401)
        self.assertEqual(len(inference_api._requests), 0)

    def test_reject_short_input(self):
        self.assertEqual(self.request("abc").status_code, 422)

if __name__ == "__main__":
    unittest.main()
