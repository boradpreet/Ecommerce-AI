import os
import json
import datetime
from sqlalchemy.orm import Session
from app.models.all_models import Call, Lead, Agent, Transcript

def save_call_to_json(call_id: int, db: Session, prompt_tokens: int = 0, candidates_tokens: int = 0):
    """
    Deprecated: Individual call logging to JSON is disabled.
    """
    pass
