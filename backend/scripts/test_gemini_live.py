#!/usr/bin/env python3
"""Quick internal test: Gemini Live WebSocket connects and returns setupComplete."""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
import websockets

from app.services.gemini_live import (
    build_gemini_live_ws_url,
    gemini_ssl_context,
    resolve_gemini_live_model,
)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


async def main() -> int:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("FAIL: Set GEMINI_API_KEY in backend/.env")
        return 1

    model = resolve_gemini_live_model()
    url = build_gemini_live_ws_url(api_key)
    setup = {
        "setup": {
            "model": model,
            "generationConfig": {"responseModalities": ["AUDIO"]},
        }
    }

    print(f"Testing Gemini Live: {model}")
    try:
        async with websockets.connect(url, ssl=gemini_ssl_context(), open_timeout=15) as ws:
            await ws.send(json.dumps(setup))
            msg = await asyncio.wait_for(ws.recv(), timeout=15)
            print(f"OK: {msg.decode() if isinstance(msg, bytes) else msg}")
            return 0
    except Exception as exc:
        print(f"FAIL: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
