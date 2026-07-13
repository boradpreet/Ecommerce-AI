"""Public, unauthenticated endpoints used by the marketing/landing site.

These expose only aggregate, non-sensitive counts across the whole platform —
no per-organization or per-user data — so they are safe to serve without auth.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Any
from app.db.session import get_db
from app.models.all_models import Call, Campaign, Organization, Agent, Lead, Transcript

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/stats")
def public_stats(db: Session = Depends(get_db)) -> Any:
    """Platform-wide aggregate stats for the landing page counters.

    Returns real counts (total calls, campaigns, vendors/agents) plus a simple
    call-outcome breakdown. All values are global aggregates, never scoped data.
    """
    total_calls = db.query(func.count(Call.id)).scalar() or 0
    total_campaigns = db.query(func.count(Campaign.id)).scalar() or 0
    total_vendors = db.query(func.count(Organization.id)).scalar() or 0
    total_agents = db.query(func.count(Agent.id)).scalar() or 0

    # Outcome breakdown
    # "Picked" = calls that actually connected (had talk time or completed)
    picked = db.query(func.count(Call.id)).filter(
        (Call.duration_seconds > 0) | (Call.status == "completed")
    ).scalar() or 0
    # "Interested" = transcripts whose analysed interest score is meaningful
    interested = db.query(func.count(Transcript.id)).filter(
        Transcript.interest_score >= 50
    ).scalar() or 0
    # "Call back" = leads explicitly marked for a follow-up call
    callback = db.query(func.count(Lead.id)).filter(
        func.lower(Lead.status).in_(["callback", "call_back", "call back"])
    ).scalar() or 0

    return {
        "total_calls": int(total_calls),
        "total_campaigns": int(total_campaigns),
        "total_vendors": int(total_vendors),
        "total_agents": int(total_agents),
        "picked": int(picked),
        "interested": int(interested),
        "callback": int(callback),
    }
