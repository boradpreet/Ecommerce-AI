# reload trigger - reset
import os
import bcrypt as _bcrypt_mod

# Patch bcrypt to avoid version incompatibility issues with passlib 1.7.4
if not hasattr(_bcrypt_mod, '__about__'):
    class _BcryptAbout:
        __version__ = getattr(_bcrypt_mod, '__version__', '4.0.0')
    _bcrypt_mod.__about__ = _BcryptAbout()

_original_hashpw = _bcrypt_mod.hashpw
def _patched_hashpw(password, salt):
    if isinstance(password, str):
        password_bytes = password.encode('utf-8')
    else:
        password_bytes = password
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    return _original_hashpw(password_bytes, salt)
_bcrypt_mod.hashpw = _patched_hashpw

if not hasattr(_bcrypt_mod, '_bcrypt_hashpw'):
    _bcrypt_mod._bcrypt_hashpw = _bcrypt_mod.hashpw

# Load .env variables (STRIPE_SECRET_KEY etc.)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass  

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db.session import engine, Base, SessionLocal
from app.db import base  # Ensures all models are registered
from app.models.all_models import User
from app.controllers.auth import get_password_hash
from app.views.api_v1 import api_router

try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
    
    # Run dynamic migration for premium columns on agents if they do not exist
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        # 1. Agents table migrations
        agent_migrations = [
            ("is_active", "BOOLEAN DEFAULT TRUE"),
            ("lang", "VARCHAR DEFAULT 'ENGLISH (US)'"),
            ("last_active", "VARCHAR DEFAULT 'Last active: 2m ago'"),
            ("performance_score", "FLOAT DEFAULT 95.0"),
            ("performance_grade", "VARCHAR DEFAULT 'A'"),
            ("hubspot_connected", "BOOLEAN DEFAULT TRUE"),
            ("calendly_connected", "BOOLEAN DEFAULT FALSE"),
            ("first_message", "TEXT DEFAULT 'Hi, this is Rhea from NovaEdge Global. Thanks for calling in to apply for the Sales Lead.'"),
            ("llm_provider", "VARCHAR DEFAULT 'Groq'"),
            ("llm_model", "VARCHAR DEFAULT 'openai/gpt-oss-120b'"),
            ("transcriber", "VARCHAR DEFAULT 'Deepgram/Flux General Multi/English'"),
            ("kb_id", "INTEGER REFERENCES knowledge_bases(id) ON DELETE SET NULL"),
            ("capabilities", "VARCHAR DEFAULT 'Customer Support / General FAQ'"),
            ("wait_seconds", "FLOAT DEFAULT 2.1"),
            ("smart_endpointing", "VARCHAR DEFAULT 'LiveKit'"),
            ("silence_timeout", "INTEGER DEFAULT 30"),
            ("max_duration_seconds", "INTEGER DEFAULT 300"),
            ("stop_words", "INTEGER DEFAULT 5"),
            ("voice_seconds", "FLOAT DEFAULT 0.3"),
            ("backoff_seconds", "FLOAT DEFAULT 4.0"),
            ("idle_messages", "TEXT DEFAULT '[\"Are you there?\", \"Can you hear me?\", \"Should I continue?\"]'"),
            ("background_sound_enabled", "BOOLEAN DEFAULT FALSE"),
            ("forwarding_country_code", "VARCHAR DEFAULT '+1'"),
            ("forwarding_phone_number", "VARCHAR DEFAULT ''"),
            ("analysis_summary_prompt", "TEXT DEFAULT 'You are an expert call summarizer for an event invitation campaign. You will be given the transcript of a call. Create a summary and structured details based ONLY on the customer\'\'s responses. Ignore anything said by the assistant/agent unless the customer repeats, confirms, or explicitly reacts to it.\n\n### Summary\nDo exactly 2 lines (2 sentences)'"),
            ("analysis_summary_timeout", "INTEGER DEFAULT 30"),
            ("analysis_summary_trigger_messages", "INTEGER DEFAULT 3"),
            ("analysis_structured_prompt", "TEXT DEFAULT 'Prompt for extracting structured data'"),
            ("analysis_structured_timeout", "INTEGER DEFAULT 30"),
            ("category", "VARCHAR DEFAULT 'Ecommerce'"),
            ("subcategory", "VARCHAR DEFAULT 'Marketing Campaign'"),
            ("prompt_system_inbound", "TEXT NULL"),
        ]
        for col_name, col_def in agent_migrations:
            try:
                conn.execute(text(f"ALTER TABLE agents ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"Successfully migrated agents table: added column {col_name}.")
            except Exception:
                pass

        # 2. Organizations table migrations
        org_migrations = [
            ("website_url", "VARCHAR NULL"),
            ("industry", "VARCHAR NULL"),
            ("tax_id", "VARCHAR NULL"),
            ("business_type", "VARCHAR NULL"),
            ("company_size", "VARCHAR NULL"),
            ("street_address", "TEXT NULL"),
            ("country", "VARCHAR NULL"),
            ("state_province", "VARCHAR NULL"),
            ("compliance_hipaa", "BOOLEAN DEFAULT FALSE"),
            ("timezone", "VARCHAR DEFAULT 'Coordinated Universal Time (UTC)'"),
            ("log_retention_days", "INTEGER DEFAULT 90"),
            ("logo_url", "VARCHAR NULL"),
            ("concurrency_limit", "INTEGER DEFAULT 10"),
            ("webhook_url", "VARCHAR NULL"),
            ("recording_enabled", "BOOLEAN DEFAULT TRUE"),
            ("voicemail_detection", "BOOLEAN DEFAULT TRUE"),
            ("api_key", "VARCHAR DEFAULT 'vq_live_7a9c8d1b2e3f'"),
            ("notifications_slack", "BOOLEAN DEFAULT FALSE"),
            ("notifications_email", "BOOLEAN DEFAULT TRUE"),
            ("notifications_low_balance", "BOOLEAN DEFAULT TRUE"),
            ("notifications_weekly_report", "BOOLEAN DEFAULT TRUE"),
            ("prepaid_balance", "FLOAT DEFAULT 250.00"),
            ("is_suspended", "BOOLEAN DEFAULT FALSE"),
            ("plivo_number", "VARCHAR NULL"),
            ("twilio_number", "VARCHAR NULL"),
            ("telephony_provider", "VARCHAR DEFAULT 'plivo'"),
            ("call_minutes_limit", "INTEGER DEFAULT 100")
        ]
        for col_name, col_def in org_migrations:
            try:
                conn.execute(text(f"ALTER TABLE organizations ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"Successfully migrated organizations table: added column {col_name}.")
            except Exception:
                pass

        # 3. Users table migrations
        user_migrations = [
            ("secondary_emails", "TEXT DEFAULT '[]'"),
            ("google_email", "VARCHAR NULL"),
            ("mfa_enabled", "BOOLEAN DEFAULT FALSE"),
            ("is_superuser", "BOOLEAN DEFAULT FALSE")
        ]
        for col_name, col_def in user_migrations:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"Successfully migrated users table: added column {col_name}.")
            except Exception:
                pass

        # 4. Campaigns table migrations
        campaign_migrations = [
            ("launch_date", "VARCHAR NULL"),
            ("timezone", "VARCHAR DEFAULT 'America/Los_Angeles'"),
            ("active_days", "VARCHAR DEFAULT 'M,T,W,T,F'"),
            ("time_start", "VARCHAR DEFAULT '09:00 AM'"),
            ("time_end", "VARCHAR DEFAULT '05:00 PM'"),
            ("dnc_scrubbing", "BOOLEAN DEFAULT TRUE"),
            ("max_attempts", "INTEGER DEFAULT 3"),
            ("retry_delay_hours", "INTEGER DEFAULT 2"),
            ("agent_prompt_override", "TEXT NULL"),
            ("max_duration_seconds", "INTEGER DEFAULT 300"),
            ("source_list_name", "VARCHAR NULL"),
            ("direction", "VARCHAR DEFAULT 'OUTBOUND'"),
        ]
        for col_name, col_def in campaign_migrations:
            try:
                conn.execute(text(f"ALTER TABLE campaigns ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"Successfully migrated campaigns table: added column {col_name}.")
            except Exception:
                pass

        # 5. Phone numbers table migrations
        phone_migrations = [
            ("organization_id", "INTEGER NULL"),
            ("direction", "VARCHAR DEFAULT 'OUTBOUND'"),
            ("destination_region", "VARCHAR DEFAULT 'USA'"),
            ("termination_uri", "VARCHAR DEFAULT ''"),
            ("cps_limit", "INTEGER DEFAULT 2"),
            ("sip_username", "VARCHAR DEFAULT ''"),
            ("sip_password", "VARCHAR DEFAULT ''"),
            ("nickname", "VARCHAR DEFAULT ''"),
        ]
        for col_name, col_def in phone_migrations:
            try:
                conn.execute(text(f"ALTER TABLE phone_numbers ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"Successfully migrated phone_numbers table: added column {col_name}.")
            except Exception:
                pass

        # 6. Calls table migrations: add provider_call_uuid to track external provider call id
        try:
            conn.execute(text("ALTER TABLE calls ADD COLUMN provider_call_uuid VARCHAR NULL"))
            conn.commit()
            print("Successfully migrated calls table: added column provider_call_uuid.")
        except Exception:
            pass

        # Calls: soft-archive support for Remove All (archived_at set on archive, purged after 30 days)
        try:
            conn.execute(text("ALTER TABLE calls ADD COLUMN archived_at TIMESTAMP NULL"))
            conn.commit()
            print("Successfully migrated calls table: added column archived_at.")
        except Exception:
            pass

        # Calls: inbound/outbound direction
        try:
            conn.execute(text("ALTER TABLE calls ADD COLUMN direction VARCHAR DEFAULT 'OUTBOUND'"))
            conn.commit()
            print("Successfully migrated calls table: added column direction.")
        except Exception:
            pass

        # 7. Agent catalogs table migrations (org-scoped custom entries)
        catalog_migrations = [
            ("organization_id", "INTEGER NULL"),
            ("is_system", "BOOLEAN DEFAULT FALSE"),
            ("inbound_prompt", "TEXT NULL"),
        ]
        for col_name, col_def in catalog_migrations:
            try:
                conn.execute(text(f"ALTER TABLE agent_catalogs ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"Successfully migrated agent_catalogs table: added column {col_name}.")
            except Exception:
                pass

        # 8. Documents table — RAG indexing columns
        document_migrations = [
            ("index_status", "VARCHAR DEFAULT 'pending'"),
            ("chunk_count", "INTEGER DEFAULT 0"),
            ("char_count", "INTEGER DEFAULT 0"),
            ("index_error", "TEXT NULL"),
        ]
        for col_name, col_def in document_migrations:
            try:
                conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"Successfully migrated documents table: added column {col_name}.")
            except Exception:
                pass

        # 9. document_chunks table (vector RAG)
        try:
            # Drop legacy schema if present (old columns: content, embedding_json)
            legacy_cols = conn.execute(text("PRAGMA table_info(document_chunks)")).fetchall()
            if legacy_cols:
                col_names = {row[1] for row in legacy_cols}
                if "chunk_index" not in col_names:
                    conn.execute(text("DROP TABLE document_chunks"))
                    conn.commit()
                    print("Dropped legacy document_chunks table for RAG migration.")
        except Exception:
            pass

        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id SERIAL PRIMARY KEY,
                    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
                    chunk_index INTEGER DEFAULT 0,
                    text TEXT NOT NULL,
                    embedding JSON NULL,
                    token_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()
            print("Successfully ensured document_chunks table exists (PostgreSQL).")
        except Exception:
            try:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS document_chunks (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
                        chunk_index INTEGER DEFAULT 0,
                        text TEXT NOT NULL,
                        embedding JSON NULL,
                        token_count INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                conn.commit()
                print("Successfully ensured document_chunks table exists (SQLite).")
            except Exception:
                pass

        # 10. Transcripts table migrations
        try:
            conn.execute(text("ALTER TABLE transcripts ADD COLUMN interest_score INTEGER DEFAULT 0"))
            conn.commit()
            print("Successfully migrated transcripts table: added column interest_score.")
        except Exception:
            pass

        # 10b. Transcripts — auto follow-up tracking (details sent to caller on interest/request)
        transcript_followup_migrations = [
            ("wants_details", "BOOLEAN DEFAULT FALSE"),
            ("details_sent", "BOOLEAN DEFAULT FALSE"),
            ("details_sent_to", "VARCHAR NULL"),
        ]
        for col_name, col_def in transcript_followup_migrations:
            try:
                conn.execute(text(f"ALTER TABLE transcripts ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"Successfully migrated transcripts table: added column {col_name}.")
            except Exception:
                pass

        # 10c. Leads — email (for emailing company details on interest/request)
        try:
            conn.execute(text("ALTER TABLE leads ADD COLUMN email VARCHAR NULL"))
            conn.commit()
            print("Successfully migrated leads table: added column email.")
        except Exception:
            pass

        # 10d. Organizations — auto follow-up config (company details + threshold + toggle)
        org_followup_migrations = [
            ("company_details", "TEXT NULL"),
            ("auto_send_details", "BOOLEAN DEFAULT TRUE"),
            ("auto_send_threshold", "INTEGER DEFAULT 50"),
        ]
        for col_name, col_def in org_followup_migrations:
            try:
                conn.execute(text(f"ALTER TABLE organizations ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"Successfully migrated organizations table: added column {col_name}.")
            except Exception:
                pass

        # Retroactively analyze past call transcripts to compute interest scores on startup
        try:
            db = SessionLocal()
            from app.models.all_models import Transcript, Call
            from app.services.transcript_analysis import analyze_call_transcript_and_update
            
            past_transcripts = db.query(Transcript).join(Call).all()
            for t in past_transcripts:
                if t.interest_score is None or t.interest_score == 0 or (t.summary and t.summary.startswith("Call completed. Dialogue contains")):
                    if t.dialogue_json and len(t.dialogue_json) > 0:
                        print(f"[Retroactive Analysis] Analyzing call {t.call_id}...")
                        call_obj = db.query(Call).filter(Call.id == t.call_id).first()
                        if call_obj:
                            # send_followup=False: never fire WhatsApp/email for old backfilled calls
                            analyze_call_transcript_and_update(t.call_id, t.dialogue_json, db, call_obj.agent_id, send_followup=False)
            db.close()
        except Exception as retro_err:
            print(f"[Retroactive Analysis Error] {retro_err}")

        # Seed default Super Admin
        try:
            db = SessionLocal()
            existing_admin = db.query(User).filter(User.email == "admin@voqly.com").first()
            if not existing_admin:
                admin_user = User(
                    email="admin@voqly.com",
                    hashed_password=get_password_hash("admin123"),
                    full_name="Super Admin",
                    is_active=True,
                    is_superuser=True
                )
                db.add(admin_user)
                db.commit()
                print("Default Super Admin seeded: admin@voqly.com / admin123")
            else:
                # Ensure existing admin has is_superuser = True and correct password
                existing_admin.is_superuser = True
                existing_admin.full_name = existing_admin.full_name or "Super Admin"
                # Always re-hash password in case it was set to a mock value in a previous offline session
                existing_admin.hashed_password = get_password_hash("admin123")
                db.commit()
                print("Super Admin account verified and password refreshed.")

            # ── One-time cleanup: reset is_superuser=True incorrectly set on vendor accounts ──
            # Reset is_superuser = False for ALL users except the single super admin.
            vendors_fixed = (
                db.query(User)
                .filter(User.email != "admin@voqly.com", User.is_superuser == True)
                .all()
            )
            for v in vendors_fixed:
                v.is_superuser = False
            # Seed the full 12-industry AI agent catalog (global defaults).
            from app.models.all_models import AgentCatalog
            from app.services.industry_catalog import INDUSTRY_CATALOG, inbound_master_prompt

            valid_pairs = set()
            for cat, sub, campaign_type, prompt in INDUSTRY_CATALOG:
                valid_pairs.add((cat, sub))
                inbound = inbound_master_prompt(sub, campaign_type)
                existing = db.query(AgentCatalog).filter(
                    AgentCatalog.category == cat,
                    AgentCatalog.subcategory == sub,
                    AgentCatalog.organization_id.is_(None),
                ).first()
                if not existing:
                    db.add(AgentCatalog(
                        category=cat,
                        subcategory=sub,
                        system_prompt=prompt,
                        inbound_prompt=inbound,
                        organization_id=None,
                        is_system=True,
                    ))
                else:
                    existing.is_system = True
                    existing.organization_id = None
                    # Only overwrite auto-seeded prompts; never clobber an admin's edits.
                    if not existing.system_prompt:
                        existing.system_prompt = prompt
                    if not getattr(existing, "inbound_prompt", None):
                        existing.inbound_prompt = inbound

            # Remove the legacy 3-category defaults (Ecommerce/Finance old subcats etc.)
            # that are no longer part of the catalog. Never touch org-specific custom rows.
            stale = db.query(AgentCatalog).filter(
                AgentCatalog.organization_id.is_(None),
                AgentCatalog.is_system == True,  # noqa: E712
            ).all()
            for row in stale:
                if (row.category, row.subcategory) not in valid_pairs:
                    db.delete(row)

            db.commit()
            print("Seeded default Agent Catalog data.")

            db.close()
        except Exception as seed_err:
            print(f"Super Admin seed skipped: {seed_err}")
except Exception as e:
    print(f"Error initializing database tables: {e}")

# ── 5. FastAPI Application Setup ─────────────────────────────────────────────
# Trigger reload for JWT fix & Razorpay mock verification
app = FastAPI(
    title="Voqly AI Backend",
    description="Enterprise voice agent calling SaaS API foundation with MVC structure.",
    version="1.0.0"
)

# Enable CORS for the Next.js frontend.
# Origins are restricted (no wildcard): explicit production origins come from the
# CORS_ALLOW_ORIGINS env var (comma-separated), and a regex permits localhost / LAN
# for local development. Auth uses Bearer tokens, so credentials stay disabled.
import os as _os
_cors_origins = [o.strip() for o in _os.getenv("CORS_ALLOW_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Security middleware: per-IP rate limiting on brute-forceable auth endpoints
#     + standard security response headers on every response. ---
import time as _time_sec
from collections import defaultdict as _defaultdict
from fastapi.responses import JSONResponse as _JSONResponse

_auth_rl_hits = _defaultdict(list)
# path -> (max_requests, window_seconds)
_AUTH_RATE_LIMITS = {
    "/api/v1/auth/login": (12, 300),
    "/api/v1/auth/request-otp": (6, 300),
    "/api/v1/auth/verify-otp": (12, 300),
    "/api/v1/auth/firebase-login": (24, 300),
    "/api/v1/auth/signup": (8, 300),
}

@app.middleware("http")
async def security_middleware(request, call_next):
    if request.method == "POST":
        cfg = _AUTH_RATE_LIMITS.get(request.url.path)
        if cfg:
            max_req, window = cfg
            ip = request.client.host if request.client else "unknown"
            key = f"{ip}:{request.url.path}"
            now = _time_sec.time()
            recent = [t for t in _auth_rl_hits[key] if now - t < window]
            if len(recent) >= max_req:
                origin = request.headers.get("origin", "*")
                return _JSONResponse(
                    status_code=429,
                    content={"detail": "Too many attempts. Please wait a few minutes and try again."},
                    headers={"Access-Control-Allow-Origin": origin},
                )
            recent.append(now)
            _auth_rl_hits[key] = recent

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    return response

# Mount API Routers
app.include_router(api_router, prefix="/api/v1")

# Startup handler to initialize background dialer daemon
@app.on_event("startup")
def startup_event():
    from app.controllers.dialer import CampaignDialer
    dialer = CampaignDialer()
    dialer.start()

@app.on_event("shutdown")
def shutdown_event():
    from app.controllers.dialer import CampaignDialer
    dialer = CampaignDialer()
    dialer.stop()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Voqly AI Backend",
        "version": "1.0.0",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5011, reload=True)
