"""Generate text embeddings via Google Gemini or keyword fallback."""
import json
import math
import os
import re
import urllib.error
import urllib.request
from typing import Dict, List, Optional


EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIM = 3072


def embed_texts(texts: List[str]) -> List[Optional[List[float]]]:
    """Return embedding vectors for each text. None entries use keyword fallback at retrieval time."""
    if not texts:
        return []

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if api_key:
        try:
            return _embed_via_gemini(texts, api_key)
        except Exception as exc:
            print(f"[Embedding] Gemini API failed, using keyword fallback: {exc}")

    return [None] * len(texts)


def _embed_via_gemini(texts: List[str], api_key: str) -> List[List[float]]:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{EMBEDDING_MODEL}:batchEmbedContents?key={api_key}"
    )
    requests = [
        {
            "model": f"models/{EMBEDDING_MODEL}",
            "content": {"parts": [{"text": (t or "")[:8000]}]},
        }
        for t in texts
    ]

    batch_size = 20
    all_vectors: List[List[float]] = []
    for i in range(0, len(requests), batch_size):
        batch = requests[i : i + batch_size]
        payload = json.dumps({"requests": batch}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        import ssl
        context = None
        try:
            context = ssl.create_default_context()
        except Exception:
            pass

        try:
            with urllib.request.urlopen(req, context=context, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.URLError as e:
            if "CERTIFICATE_VERIFY_FAILED" in str(e):
                try:
                    unverified_context = ssl._create_unverified_context()
                    with urllib.request.urlopen(req, context=unverified_context, timeout=60) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                except Exception as inner_e:
                    raise inner_e
            else:
                raise e

        for item in data.get("embeddings", []):
            values = item.get("values") or item.get("embedding", {}).get("values") or []
            all_vectors.append([float(v) for v in values])

    if len(all_vectors) != len(texts):
        raise RuntimeError(f"Expected {len(texts)} embeddings, got {len(all_vectors)}")
    return all_vectors


def embed_query(text: str) -> Optional[List[float]]:
    results = embed_texts([text])
    return results[0] if results else None


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def keyword_score(query: str, text: str) -> float:
    """BM25-inspired keyword overlap for fallback when embeddings are unavailable."""
    q_tokens = _tokenize(query)
    t_tokens = _tokenize(text)
    if not q_tokens or not t_tokens:
        return 0.0

    t_freq: Dict[str, int] = {}
    for tok in t_tokens:
        t_freq[tok] = t_freq.get(tok, 0) + 1

    score = 0.0
    for tok in q_tokens:
        if tok in t_freq:
            score += 1.0 + math.log1p(t_freq[tok])
    return score / len(q_tokens)


def _tokenize(text: str) -> List[str]:
    return [w for w in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(w) > 2]
