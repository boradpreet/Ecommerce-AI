import os
import time
import random
from celery import Celery
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.all_models import Call, Transcript, Lead
from app.services.call_logger import save_call_to_json

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "voqly_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="tasks.trigger_outbound_call")
def trigger_outbound_call(call_id: int, lead_id: int):
    """
    Simulates triggering an outbound call using an AI Voice Agent
    and generates an automated transcript and summary in the background.
    """
    db: Session = SessionLocal()
    try:
        # Fetch call and lead details
        call = db.query(Call).filter(Call.id == call_id).first()
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        
        if not call or not lead:
            return {"status": "error", "message": "Call or Lead record not found."}
        
        # Update Call status to active
        call.status = "connected"
        lead.status = "called"
        db.commit()
        
        # Simulate active call duration
        duration = random.randint(15, 75)
        time.sleep(1)  # Brief mock execution delay
        
        # Create dialog JSON log representing the transcription
        dialogue = [
            {"speaker": "agent", "text": "Hello, thank you for contacting Voqly AI. Am I speaking with the representative?"},
            {"speaker": "customer", "text": "Yes, this is they. How can I help you?"},
            {"speaker": "agent", "text": "I noticed you were setting up your AI voice agents and wanted to verify if you preferred synthetic voices or cloning options?"},
            {"speaker": "customer", "text": "Synthetic voices work best for our outbound support campaign. Thanks for checking in!"},
            {"speaker": "agent", "text": "Excellent! I have configured the default settings for you. Have a great day!"}
        ]
        
        summary = "Successful onboarding call. Customer verified preference for synthetic voice options. Configured defaults."
        
        # Update Call details
        call.status = "completed"
        call.duration_seconds = duration
        
        # Write Transcript
        transcript = Transcript(
            call_id=call.id,
            dialogue_json=dialogue,
            summary=summary,
            sentiment="positive"
        )
        db.add(transcript)
        db.commit()
        
        # Save stats to local JSON folder
        save_call_to_json(call.id, db, prompt_tokens=1000, candidates_tokens=500)
        
        return {
            "status": "success",
            "call_id": call_id,
            "duration": duration,
            "sentiment": "positive"
        }
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
