"""Vector RAG: index documents into chunks and retrieve relevant context for agents."""
import os
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.all_models import Agent, Document, DocumentChunk, KnowledgeBase, Lead
from app.services.embedding_service import cosine_similarity, embed_query, embed_texts, keyword_score
from app.services.text_chunker import chunk_text

MAX_RETRIEVAL_CHUNKS = 18
HYBRID_VECTOR_WEIGHT = 0.75
HYBRID_KEYWORD_WEIGHT = 0.25


def index_document(db: Session, document_id: int) -> dict:
    """Chunk, embed, and store vectors for a single document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return {"status": "error", "message": "Document not found"}

    content = (doc.content_text or "").strip()
    doc.index_status = "processing"
    doc.index_error = None
    db.commit()

    try:
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
        db.commit()

        if not content or content.startswith("["):
            doc.index_status = "failed"
            doc.index_error = "No extractable text content"
            doc.chunk_count = 0
            doc.char_count = 0
            db.commit()
            return {"status": "failed", "message": doc.index_error}

        chunks = chunk_text(content)
        if not chunks:
            doc.index_status = "failed"
            doc.index_error = "Chunking produced no segments"
            db.commit()
            return {"status": "failed", "message": doc.index_error}

        embeddings = embed_texts(chunks)
        stored = 0
        for idx, (chunk_text_val, embedding) in enumerate(zip(chunks, embeddings)):
            row = DocumentChunk(
                document_id=doc.id,
                chunk_index=idx,
                text=chunk_text_val,
                embedding=embedding,
                token_count=max(1, len(chunk_text_val) // 4),
            )
            db.add(row)
            stored += 1

        doc.index_status = "ready"
        doc.chunk_count = stored
        doc.char_count = len(content)
        doc.index_error = None
        db.commit()
        return {"status": "ready", "chunk_count": stored, "document_id": doc.id}

    except Exception as exc:
        doc.index_status = "failed"
        doc.index_error = str(exc)[:500]
        db.commit()
        return {"status": "failed", "message": doc.index_error}


def index_kb_documents(db: Session, kb_id: int) -> dict:
    docs = db.query(Document).filter(Document.kb_id == kb_id).all()
    results = [index_document(db, d.id) for d in docs]
    ready = sum(1 for r in results if r.get("status") == "ready")
    return {"indexed": ready, "total": len(docs), "results": results}


def retrieve_chunks(
    db: Session,
    kb_id: int,
    query: str,
    top_k: int = MAX_RETRIEVAL_CHUNKS,
) -> List[Tuple[DocumentChunk, float, str]]:
    """Return top-k chunks with scores. Each tuple: (chunk, score, file_name)."""
    chunks = (
        db.query(DocumentChunk, Document)
        .join(Document, DocumentChunk.document_id == Document.id)
        .filter(Document.kb_id == kb_id, Document.index_status == "ready")
        .all()
    )
    if not chunks:
        return []

    query_vec = embed_query(query)
    scored: List[Tuple[DocumentChunk, float, str]] = []

    for chunk_row, doc_row in chunks:
        vec_score = 0.0
        if query_vec and chunk_row.embedding:
            vec_score = cosine_similarity(query_vec, chunk_row.embedding)

        kw_score = keyword_score(query, chunk_row.text)
        kw_norm = min(kw_score / 5.0, 1.0)

        if query_vec and chunk_row.embedding:
            final = HYBRID_VECTOR_WEIGHT * vec_score + HYBRID_KEYWORD_WEIGHT * kw_norm
        else:
            final = kw_norm

        scored.append((chunk_row, final, doc_row.file_name or f"doc_{doc_row.id}"))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_k]


def build_retrieval_query(agent: Agent, lead: Optional[Lead] = None) -> str:
    """Build a semantic query from agent config for call-start retrieval."""
    parts = [
        agent.capabilities or "",
        agent.category or "",
        agent.subcategory or "",
        (agent.prompt_system or "")[:600],
    ]
    if lead:
        parts.extend([lead.name or "", getattr(lead, "notes", "") or ""])
    return " ".join(p.strip() for p in parts if p and p.strip())


def load_kb_content_rag(
    db: Session,
    agent: Agent,
    lead: Optional[Lead] = None,
    max_chars: int = 48000,
    query_override: Optional[str] = None,
    org_id: Optional[int] = None,
) -> Tuple[str, List[str]]:
    """Retrieve the most relevant KB chunks for an agent call."""
    effective_kb_id = resolve_agent_kb_id(db, agent, org_id)
    if not effective_kb_id:
        return "", []

    query = (query_override or build_retrieval_query(agent, lead)).strip()
    if not query:
        query = "product information policies pricing support FAQ details property listing address zipcode"

    retrieved = retrieve_chunks(db, effective_kb_id, query, top_k=MAX_RETRIEVAL_CHUNKS)

    if retrieved:
        parts: List[str] = []
        doc_names: List[str] = []
        seen_names: set = set()
        total_chars = 0

        for chunk_row, score, file_name in retrieved:
            if file_name not in seen_names:
                doc_names.append(file_name)
                seen_names.add(file_name)
            block = f"### Source: {file_name} (relevance: {score:.2f})\n{chunk_row.text}"
            if total_chars + len(block) > max_chars:
                remaining = max_chars - total_chars
                if remaining > 200:
                    parts.append(block[:remaining] + "\n...[truncated]")
                break
            parts.append(block)
            total_chars += len(block)

        if parts:
            header = (
                "The following excerpts were retrieved from your knowledge base using semantic search. "
                "Answer ONLY using these facts.\n\n"
            )
            return header + "\n\n---\n\n".join(parts), doc_names

    return _load_kb_content_fallback(db, effective_kb_id, max_chars)


def _load_kb_content_fallback(db: Session, kb_id: int, max_chars: int) -> Tuple[str, List[str]]:
    """Full-document fallback when vector index is not ready."""
    docs = db.query(Document).filter(Document.kb_id == kb_id).order_by(Document.id).all()
    if not docs:
        return "", []

    parts: List[str] = []
    doc_names: List[str] = []
    total_chars = 0

    for doc in docs:
        content = (doc.content_text or "").strip()
        if not content:
            continue
        name = doc.file_name or f"doc_{doc.id}"
        doc_names.append(name)
        block = f"### Document: {name}\n{content}"
        if total_chars + len(block) > max_chars:
            remaining = max_chars - total_chars
            if remaining > 200:
                parts.append(block[:remaining] + "\n...[truncated]")
            break
        parts.append(block)
        total_chars += len(block)

        if doc.index_status in ("pending", "failed"):
            try:
                index_document(db, doc.id)
            except Exception:
                pass

    return "\n\n---\n\n".join(parts), doc_names


def search_kb(db: Session, kb_id: int, query: str, top_k: int = 10) -> List[dict]:
    """Search a knowledge base (for dashboard testing)."""
    results = retrieve_chunks(db, kb_id, query, top_k=top_k)
    return [
        {
            "chunk_id": c.id,
            "document_id": c.document_id,
            "file_name": fname,
            "score": round(score, 4),
            "text_preview": (c.text or "")[:300],
        }
        for c, score, fname in results
    ]


def resolve_agent_kb_id(db: Session, agent: Agent, org_id: Optional[int]) -> Optional[int]:
    """Return linked kb_id or auto-synced database KB for agent category."""
    if agent and agent.kb_id:
        return agent.kb_id
    if not org_id or not agent:
        return None
    category = (agent.category or "").strip()
    subcategory = (agent.subcategory or "").strip()
    if not category or not subcategory:
        return None
    kb_name = f"{category} / {subcategory} Database"
    kb = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.organization_id == org_id, KnowledgeBase.name == kb_name)
        .first()
    )
    return kb.id if kb else None


def sync_sqlite_db_to_kb(
    db: Session,
    org_id: int,
    category: str,
    subcategory: str,
    db_path: str,
) -> dict:
    """Index uploaded SQLite database content into vector KB for semantic retrieval."""
    from app.models.all_models import KnowledgeBase, Document
    from app.services.document_parser import extract_text_from_bytes

    if not db_path or not os.path.exists(db_path):
        return {"status": "skipped", "message": "Database file not found"}

    with open(db_path, "rb") as f:
        raw = f.read()
    content_text = extract_text_from_bytes(os.path.basename(db_path), raw)
    if not content_text or content_text.startswith("["):
        return {"status": "failed", "message": "Could not extract text from database"}

    kb_name = f"{category} / {subcategory} Database"
    kb = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.organization_id == org_id, KnowledgeBase.name == kb_name)
        .first()
    )
    if not kb:
        kb = KnowledgeBase(
            name=kb_name,
            description=f"Auto-indexed from uploaded {category} › {subcategory} database",
            organization_id=org_id,
        )
        db.add(kb)
        db.commit()
        db.refresh(kb)

    doc_name = f"{category}_{subcategory}_database.txt"
    existing = (
        db.query(Document)
        .filter(Document.kb_id == kb.id, Document.file_name == doc_name)
        .first()
    )
    if existing:
        existing.content_text = content_text
        existing.index_status = "pending"
        existing.char_count = len(content_text)
        db.commit()
        doc = existing
    else:
        doc = Document(
            kb_id=kb.id,
            file_name=doc_name,
            content_text=content_text,
            index_status="pending",
            char_count=len(content_text),
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

    index_result = index_document(db, doc.id)
    row_count = content_text.count("Record ") + content_text.count("- id:")
    return {
        "status": index_result.get("status", "unknown"),
        "kb_id": kb.id,
        "document_id": doc.id,
        "chunk_count": index_result.get("chunk_count", 0),
        "char_count": len(content_text),
        "row_count": row_count,
    }
