# Import all models so that SQLAlchemy can register them before engine creation
from app.db.session import Base
from app.models.all_models import (
    User,
    Organization,
    OrganizationUser,
    Team,
    Agent,
    Campaign,
    Lead,
    Call,
    Transcript,
    KnowledgeBase,
    Document,
    DocumentChunk,
    Subscription,
    Invoice,
    AuditLog,
    PhoneNumber
)
