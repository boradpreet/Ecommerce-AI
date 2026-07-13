from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
import datetime
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    secondary_emails = Column(JSON, default=list, nullable=True)
    google_email = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    audit_logs = relationship("AuditLog", back_populates="user")
    orgs = relationship("OrganizationUser", back_populates="user")

    @property
    def has_completed_onboarding(self) -> bool:
        return len(self.orgs) > 0


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Expanded Business details matching screens
    website_url = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)
    business_type = Column(String, nullable=True)
    company_size = Column(String, nullable=True)
    street_address = Column(Text, nullable=True)
    country = Column(String, nullable=True)
    state_province = Column(String, nullable=True)
    compliance_hipaa = Column(Boolean, default=False)
    
    # Timezone & data retention log settings
    timezone = Column(String, default="Coordinated Universal Time (UTC)")
    log_retention_days = Column(Integer, default=90)
    logo_url = Column(String, nullable=True)
    
    # Extended settings parameters persistent in SQLite
    concurrency_limit = Column(Integer, default=10)
    # Free call-minute allowance per vendor (admin-editable). Campaigns stop once used up.
    call_minutes_limit = Column(Integer, default=100)
    webhook_url = Column(String, nullable=True)
    recording_enabled = Column(Boolean, default=True)
    voicemail_detection = Column(Boolean, default=True)
    api_key = Column(String, default="vq_live_7a9c8d1b2e3f")
    notifications_slack = Column(Boolean, default=False)
    notifications_email = Column(Boolean, default=True)
    notifications_low_balance = Column(Boolean, default=True)
    notifications_weekly_report = Column(Boolean, default=True)
    prepaid_balance = Column(Float, default=250.00)
    is_suspended = Column(Boolean, default=False)
    plivo_number = Column(String, nullable=True)
    twilio_number = Column(String, nullable=True)
    telephony_provider = Column(String, default="plivo", nullable=True)

    # Auto follow-up: company details sent to the caller on WhatsApp + email when the
    # call shows interest (>= threshold %) or the caller asks for details.
    company_details = Column(Text, nullable=True)  # the brochure/company info package that gets sent
    auto_send_details = Column(Boolean, default=True)  # master on/off for the auto follow-up
    auto_send_threshold = Column(Integer, default=50)  # interest % at/above which details auto-send

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], lazy="joined")
    teams = relationship("Team", back_populates="organization")
    kb_instances = relationship("KnowledgeBase", back_populates="organization")
    subscriptions = relationship("Subscription", back_populates="organization")
    members = relationship("OrganizationUser", back_populates="organization")
    phone_numbers = relationship("PhoneNumber", back_populates="organization")

class OrganizationUser(Base):
    __tablename__ = "organization_users"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    email = Column(String, nullable=True)  # For invited members who haven't registered
    role = Column(String, default="member")  # owner, admin, developer, member, product_manager
    status = Column(String, default="active")  # active, pending, invited

    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="orgs")

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="teams")
    agents = relationship("Agent", back_populates="team")

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    voice_provider = Column(String, default="elevenlabs")
    voice_id = Column(String, nullable=False)
    prompt_system = Column(Text, nullable=True)
    prompt_system_inbound = Column(Text, nullable=True)  # snapshot of the inbound prompt (used when a call is INBOUND)
    temperature = Column(Float, default=0.7)
    is_active = Column(Boolean, default=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    
    # Category and subcategory fields matching user request
    category = Column(String, nullable=True, default="Ecommerce")
    subcategory = Column(String, nullable=True, default="Marketing Campaign")
    
    # Premium visual & integration features matching mockup exactly
    lang = Column(String, default="ENGLISH (US)")
    last_active = Column(String, default="Last active: 2m ago")
    performance_score = Column(Float, default=95.0)
    performance_grade = Column(String, default="A")
    hubspot_connected = Column(Boolean, default=True)
    calendly_connected = Column(Boolean, default=False)
    
    # Model/Transcriber & Knowledge Base columns matching mockup requirements
    first_message = Column(Text, nullable=True, default="Hi, this is Rhea from NovaEdge Global. Thanks for calling in to apply for the Sales Lead.")
    llm_provider = Column(String, default="Groq")
    llm_model = Column(String, default="openai/gpt-oss-120b")
    transcriber = Column(String, default="Deepgram/Flux General Multi/English")
    kb_id = Column(Integer, ForeignKey("knowledge_bases.id"), nullable=True)
    capabilities = Column(String, default="Customer Support / General FAQ")

    # Accordion Call Settings columns
    wait_seconds = Column(Float, default=2.1)
    smart_endpointing = Column(String, default="LiveKit")
    silence_timeout = Column(Integer, default=30)
    max_duration_seconds = Column(Integer, default=300)
    stop_words = Column(Integer, default=5)
    voice_seconds = Column(Float, default=0.3)
    backoff_seconds = Column(Float, default=4.0)
    idle_messages = Column(Text, default='["Are you there?", "Can you hear me?", "Should I continue?"]')
    background_sound_enabled = Column(Boolean, default=False)
    forwarding_country_code = Column(String, default="+1")
    forwarding_phone_number = Column(String, default="")

    # Analysis tab configuration columns
    analysis_summary_prompt = Column(Text, default="You are an expert call summarizer for an event invitation campaign.\nYou will be given the transcript of a call.\nCreate a summary and structured details based ONLY on the customer's responses.\nIgnore anything said by the assistant/agent unless the customer repeats, confirms, or explicitly reacts to it.\n\n### Summary\nDo exactly 2 lines (2 sentences)")
    analysis_summary_timeout = Column(Integer, default=30)
    analysis_summary_trigger_messages = Column(Integer, default=3)
    analysis_structured_prompt = Column(Text, default="Prompt for extracting structured data")
    analysis_structured_timeout = Column(Integer, default=30)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    team = relationship("Team", back_populates="agents")
    campaigns = relationship("Campaign", back_populates="agent")
    calls = relationship("Call", back_populates="agent")
    knowledge_base = relationship("KnowledgeBase")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="draft")
    agent_id = Column(Integer, ForeignKey("agents.id"))
    direction = Column(String, default="OUTBOUND")  # OUTBOUND (dialed) | INBOUND (answers incoming calls)

    # Advanced Campaign settings
    launch_date = Column(String, nullable=True)
    timezone = Column(String, default="America/Los_Angeles")
    active_days = Column(String, default="M,T,W,T,F")
    time_start = Column(String, default="09:00 AM")
    time_end = Column(String, default="05:00 PM")
    dnc_scrubbing = Column(Boolean, default=True)
    max_attempts = Column(Integer, default=3)
    retry_delay_hours = Column(Integer, default=2)
    agent_prompt_override = Column(Text, nullable=True)
    max_duration_seconds = Column(Integer, default=300)
    source_list_name = Column(String, nullable=True)  # name of the leads list this campaign was built from

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    agent = relationship("Agent", back_populates="campaigns")
    leads = relationship("Lead", back_populates="campaign")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    email = Column(String, nullable=True)  # used to email company details on interest / request
    status = Column(String, default="pending")
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    campaign = relationship("Campaign", back_populates="leads")
    calls = relationship("Call", back_populates="lead")

class Call(Base):
    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    agent_id = Column(Integer, ForeignKey("agents.id"))
    status = Column(String, default="initiated")
    direction = Column(String, default="OUTBOUND")  # OUTBOUND (we dialed) | INBOUND (caller dialed us)
    duration_seconds = Column(Integer, default=0)
    recording_url = Column(String, nullable=True)
    provider_call_uuid = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    archived_at = Column(DateTime, nullable=True)  # set when soft-archived via Remove All; purged after 30 days

    # Relationships
    lead = relationship("Lead", back_populates="calls")
    agent = relationship("Agent", back_populates="calls")
    transcript = relationship("Transcript", uselist=False, back_populates="call")

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), unique=True)
    dialogue_json = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)
    sentiment = Column(String, nullable=True)
    interest_score = Column(Integer, nullable=True, default=0)
    wants_details = Column(Boolean, default=False)  # caller explicitly asked for details/info
    details_sent = Column(Boolean, default=False)  # company details already delivered (dedupe guard)
    details_sent_to = Column(String, nullable=True)  # audit: channels + destinations, e.g. "whatsapp:+91…, email:a@b.com"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    call = relationship("Call", back_populates="transcript")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="kb_instances")
    documents = relationship("Document", back_populates="knowledge_base")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    kb_id = Column(Integer, ForeignKey("knowledge_bases.id"))
    file_name = Column(String, nullable=False)
    file_url = Column(String, nullable=True)
    content_text = Column(Text, nullable=True)
    index_status = Column(String, default="pending")  # pending | processing | ready | failed
    chunk_count = Column(Integer, default=0)
    char_count = Column(Integer, default=0)
    index_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    knowledge_base = relationship("KnowledgeBase", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    chunk_index = Column(Integer, default=0)
    text = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="chunks")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    plan_tier = Column(String, default="free")
    status = Column(String, default="trial")
    current_period_end = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="subscriptions")
    invoices = relationship("Invoice", back_populates="subscription")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    amount_due = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    status = Column(String, default="unpaid")
    pdf_url = Column(String, nullable=True)
    payment_gateway = Column(String, default="stripe")  # stripe | razorpay
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    subscription = relationship("Subscription", back_populates="invoices")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    resource_type = Column(String, nullable=True)
    resource_id = Column(Integer, nullable=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

class PhoneNumber(Base):
    __tablename__ = "phone_numbers"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True, nullable=False)
    country = Column(String, default="USA")
    type = Column(String, default="LOCAL") # LOCAL or TOLL-FREE
    assigned_agent = Column(String, nullable=True)
    calls_today = Column(Integer, default=0)
    monthly_cost = Column(Float, default=2.00)
    status = Column(String, default="Active")
    provision_type = Column(String, default="Twilio SIP")
    direction = Column(String, default="OUTBOUND")
    destination_region = Column(String, default="USA")
    termination_uri = Column(String, default="")
    cps_limit = Column(Integer, default=2)
    sip_username = Column(String, default="")
    sip_password = Column(String, default="")
    nickname = Column(String, default="")
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="phone_numbers")

class AgentCatalog(Base):
    __tablename__ = "agent_catalogs"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False)  # 'Ecommerce', 'Healthcare'
    subcategory = Column(String, nullable=False)  # 'Marketing Campaign', 'Project Overview'
    system_prompt = Column(Text, nullable=True)  # OUTBOUND master prompt
    inbound_prompt = Column(Text, nullable=True)  # INBOUND master prompt (used when the agent answers incoming calls)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)  # NULL = global (all users)
    is_system = Column(Boolean, default=False)  # True for seeded Ecommerce/Healthcare/Finance defaults
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    organization = relationship("Organization", backref="agent_catalogs")


class CatalogRequest(Base):
    __tablename__ = "catalog_requests"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    category = Column(String, nullable=False)
    subcategory = Column(String, nullable=False)
    status = Column(String, default="pending")  # 'pending', 'approved', 'rejected'
    system_prompt = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)

    organization = relationship("Organization")
