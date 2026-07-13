"""Split document text into overlapping chunks for vector indexing."""
from typing import List


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> List[str]:
    """Split text into overlapping chunks, preferring paragraph boundaries."""
    cleaned = (text or "").strip()
    if not cleaned:
        return []

    if len(cleaned) <= chunk_size:
        return [cleaned]

    paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [cleaned]

    chunks: List[str] = []
    current = ""

    for para in paragraphs:
        if len(para) > chunk_size:
            if current:
                chunks.append(current.strip())
                current = ""
            chunks.extend(_split_long_block(para, chunk_size, overlap))
            continue

        candidate = f"{current}\n\n{para}".strip() if current else para
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                chunks.append(current.strip())
            current = para

    if current:
        chunks.append(current.strip())

    return _apply_overlap(chunks, overlap)


def _split_long_block(text: str, chunk_size: int, overlap: int) -> List[str]:
    """Hard-split a long block by sentences or fixed windows."""
    sentences = _split_sentences(text)
    if len(sentences) <= 1:
        return _fixed_windows(text, chunk_size, overlap)

    parts: List[str] = []
    current = ""
    for sentence in sentences:
        candidate = f"{current} {sentence}".strip() if current else sentence
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                parts.append(current.strip())
            if len(sentence) > chunk_size:
                parts.extend(_fixed_windows(sentence, chunk_size, overlap))
                current = ""
            else:
                current = sentence
    if current:
        parts.append(current.strip())
    return parts


def _split_sentences(text: str) -> List[str]:
    import re
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def _fixed_windows(text: str, chunk_size: int, overlap: int) -> List[str]:
    if len(text) <= chunk_size:
        return [text]
    step = max(chunk_size - overlap, 1)
    return [text[i : i + chunk_size] for i in range(0, len(text), step)]


def _apply_overlap(chunks: List[str], overlap: int) -> List[str]:
    if overlap <= 0 or len(chunks) <= 1:
        return chunks

    result = [chunks[0]]
    for i in range(1, len(chunks)):
        prev_tail = chunks[i - 1][-overlap:] if len(chunks[i - 1]) > overlap else chunks[i - 1]
        merged = f"{prev_tail}\n{chunks[i]}".strip()
        if len(merged) <= 1200:
            result.append(merged)
        else:
            result.append(chunks[i])
    return result
