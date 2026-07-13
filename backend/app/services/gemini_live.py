"""Gemini Live API WebSocket helpers."""
import os
import ssl
from typing import Optional

try:
    import certifi
except ImportError:
    certifi = None

# Verified working with Google AI API (v1beta BidiGenerateContent)
DEFAULT_GEMINI_LIVE_MODEL = "models/gemini-3.1-flash-live-preview"
FALLBACK_GEMINI_LIVE_MODEL = "models/gemini-3.1-flash-live-preview"

GEMINI_LIVE_WS_BASE = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)


def gemini_ssl_context() -> ssl.SSLContext:
    if certifi is not None:
        try:
            return ssl.create_default_context(cafile=certifi.where())
        except Exception:
            pass
    return ssl.create_default_context()


def resolve_gemini_live_model() -> str:
    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_LIVE_MODEL).strip()
    if not model.startswith("models/"):
        model = f"models/{model}"
    return model


def build_gemini_live_ws_url(api_key: str) -> str:
    return f"{GEMINI_LIVE_WS_BASE}?key={api_key}"
