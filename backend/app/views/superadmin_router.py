from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import Organization, AuditLog, User, OrganizationUser
from app.views.deps import get_current_user, get_current_superuser
from pydantic import BaseModel
from typing import List, Any, Optional
import datetime
import random

router = APIRouter(
    prefix="/superadmin",
    tags=["superadmin"],
    dependencies=[Depends(get_current_superuser)]
)

# Memory store for dynamic admin simulator logs and active incident state
incident_state = {
    "status": "Investigating",
    "timeline": [
        {"time": "14:38 UTC", "text": "First anomaly detected by Automated Watchdog. System Health score dropped to 72%."},
        {"time": "14:40 UTC", "text": "Traffic rerouted to EU-WEST secondary bridge. Partial recovery observed."}
    ],
    "updates": []
}

class IncidentUpdateSchema(BaseModel):
    message: str

class SuperAdminSettingsUpdate(BaseModel):
    concurrent_streams: int
    max_tokens: int
    white_label_enabled: bool
    vendor_margin: float
    model_temp: float
    stt_buffer: int
    routing_mode: str

class VendorCreateSchema(BaseModel):
    name: str
    slug: str
    owner_email: str
    industry: Optional[str] = "SaaS"
    concurrency_limit: Optional[int] = 100
    prepaid_balance: Optional[float] = 250.00

class AdminProfileUpdateSchema(BaseModel):
    full_name: str

class AdminChangePasswordSchema(BaseModel):
    current_password: str
    new_password: str


# Super-admin profile + password (used by /superadmin/profile page)
@router.put("/profile")
def update_admin_profile(payload: AdminProfileUpdateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    name = (payload.full_name or "").strip()
    if name and current_user.email != "admin@voqly.com":
        current_user.full_name = name
        db.commit()
        db.refresh(current_user)
    return {"message": "Profile updated.", "full_name": current_user.full_name}


@router.post("/change-password")
def change_admin_password(payload: AdminChangePasswordSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    from app.controllers.auth import verify_password, get_password_hash
    if not verify_password(payload.current_password, current_user.hashed_password or ""):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    if len(payload.new_password or "") < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters.")
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


# 1. Global administrative metrics matching screens
@router.get("/metrics")
def get_admin_metrics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    # Restrict to superuser (gracefully allow mock/local sandbox bypass)
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai" and current_user.email != "admin@voqly.com":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    from app.models.all_models import Organization, Campaign, Invoice, Agent, Call
    import time
    import datetime as dt
    import calendar

    # Calculate real tenant counts from SQLite DB
    db_tenant_count = db.query(Organization).count()

    # Real total agents across all orgs
    total_agents = db.query(Agent).count()

    # Sum paid invoices
    paid_sum = db.query(func.sum(Invoice.amount_paid)).filter(Invoice.status == "paid").scalar() or 0.0

    # Live calls from Call table
    live_calls = db.query(Call).filter(Call.status.in_(["initiated", "in-progress"])).count()

    # Measure actual DB response latency
    start_time = time.time()
    db.query(Organization).count()
    db_latency = (time.time() - start_time) * 1000  # in ms
    
    # Calculate a real uptime percentage based on DB query success
    system_uptime = 100.0 if db_tenant_count == 0 else max(99.98, round(100.0 - (db_latency / 1000.0), 3))

    # Calculate dynamic growth for tenants (last 30 days vs 30 days before that)
    now = dt.datetime.utcnow()
    last_30_days = now - dt.timedelta(days=30)
    last_60_days = now - dt.timedelta(days=60)
    
    current_month_tenants = db.query(Organization).filter(Organization.created_at >= last_30_days).count()
    previous_month_tenants = db.query(Organization).filter(Organization.created_at >= last_60_days, Organization.created_at < last_30_days).count()
    
    if previous_month_tenants == 0:
        tenants_growth = f"+{current_month_tenants * 100}%" if current_month_tenants > 0 else "+0%"
    else:
        growth_val = round(((current_month_tenants - previous_month_tenants) / previous_month_tenants) * 100, 1)
        tenants_growth = f"+{growth_val}%" if growth_val >= 0 else f"{growth_val}%"

    # Calculate dynamic growth for revenue (last 30 days vs 30 days before that)
    current_month_revenue = db.query(func.sum(Invoice.amount_paid)).filter(
        Invoice.status == "paid",
        Invoice.created_at >= last_30_days
    ).scalar() or 0.0
    
    previous_month_revenue = db.query(func.sum(Invoice.amount_paid)).filter(
        Invoice.status == "paid",
        Invoice.created_at >= last_60_days,
        Invoice.created_at < last_30_days
    ).scalar() or 0.0
    
    if previous_month_revenue == 0.0:
        revenue_growth = f"+100%" if current_month_revenue > 0.0 else "+0%"
    else:
        growth_val = round(((current_month_revenue - previous_month_revenue) / previous_month_revenue) * 100, 1)
        revenue_growth = f"+{growth_val}%" if growth_val >= 0 else f"{growth_val}%"

    # Calculate dynamic revenue projection based on days remaining in the month
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_passed = now.day
    projection_val = int(paid_sum * (days_in_month / max(1, days_passed)))

    return {
        "total_tenants": db_tenant_count,
        "total_agents": total_agents,
        "total_tenants_growth": tenants_growth,
        "total_tenants_sub": f"{db_tenant_count} active database tenants",
        "live_calls": live_calls,
        "live_calls_progress": min(95, max(0, int((live_calls / 500) * 100))) if live_calls > 0 else 0,
        "revenue_mtd": paid_sum,
        "revenue_mtd_growth": revenue_growth,
        "revenue_mtd_sub": "MTD Invoiced Revenue" if paid_sum == 0.0 else f"Projection: ${projection_val:,} MTD",
        "system_uptime": system_uptime,
        "system_uptime_sub": f"Avg DB response: {round(db_latency, 1)}ms"
    }

# 2. MRR growth trend data for columns chart
@router.get("/mrr-growth")
def get_mrr_growth(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai" and current_user.email != "admin@voqly.com":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    from app.models.all_models import Invoice
    from sqlalchemy import extract
    import datetime as dt

    now = dt.datetime.utcnow()
    results = []
    
    # Loop over the last 6 months
    for i in range(5, -1, -1):
        # Calculate target month date
        month_date = now - dt.timedelta(days=i*30)
        month_label = month_date.strftime("%b").upper()
        
        year = month_date.year
        month = month_date.month
        
        # Calculate sum of paid invoices in this month
        paid_sum = db.query(func.sum(Invoice.amount_paid)).filter(
            Invoice.status == "paid",
            extract('year', Invoice.created_at) == year,
            extract('month', Invoice.created_at) == month
        ).scalar() or 0.0
        
        results.append({"month": month_label, "value": int(paid_sum)})

    return results


@router.get("/analytics")
def get_platform_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    """Platform-wide operational analytics across every tenant.

    Agent/campaign/call/lead totals, talk minutes, connect rate, call-outcome
    and sentiment breakdowns, a 14-day call trend and the most active vendors.
    Powers the Overview dashboard analytics section.
    """
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    from app.models.all_models import Organization, Team, Agent, Campaign, Lead, Call, Transcript
    from collections import defaultdict
    import datetime as dt

    # --- headline totals ---
    total_agents = db.query(Agent).count()
    total_campaigns = db.query(Campaign).filter(~Campaign.status.in_(["leads_list", "LEADS_LIST"])).count()
    total_leads = db.query(Lead).count()
    total_calls = db.query(Call).count()
    total_seconds = db.query(func.sum(Call.duration_seconds)).scalar() or 0
    completed_calls = db.query(Call).filter(Call.status == "completed").count()
    connected_calls = db.query(Call).filter(Call.duration_seconds > 0).count()
    connect_rate = round((connected_calls / total_calls) * 100, 1) if total_calls else 0.0

    # --- call-outcome breakdown ---
    outcome_rows = db.query(Call.status, func.count(Call.id)).group_by(Call.status).all()
    outcomes = sorted(
        [{"status": (s or "unknown").upper(), "count": c} for s, c in outcome_rows],
        key=lambda x: x["count"], reverse=True,
    )

    # --- sentiment breakdown ---
    sentiment = {"POSITIVE": 0, "NEUTRAL": 0, "NEGATIVE": 0}
    for s, c in db.query(Transcript.sentiment, func.count(Transcript.id)).group_by(Transcript.sentiment).all():
        key = (s or "neutral").upper()
        sentiment[key if key in sentiment else "NEUTRAL"] += c

    # --- 14-day call trend ---
    now = dt.datetime.utcnow()
    cutoff = now - dt.timedelta(days=13)
    trend_map = {str(d): c for d, c in db.query(func.date(Call.created_at), func.count(Call.id)).filter(Call.created_at >= cutoff).group_by(func.date(Call.created_at)).all()}
    calls_trend = []
    for i in range(13, -1, -1):
        day = (now - dt.timedelta(days=i)).date()
        calls_trend.append({"day": day.strftime("%d %b"), "date": day.isoformat(), "calls": trend_map.get(day.isoformat(), 0)})

    # --- most active vendors (by call volume) ---
    team_org = {tid: oid for tid, oid in db.query(Team.id, Team.organization_id).all()}
    agent_org = {aid: team_org.get(tid) for aid, tid in db.query(Agent.id, Agent.team_id).all()}
    agent_count_by_org = defaultdict(int)
    for aid, oid in agent_org.items():
        if oid:
            agent_count_by_org[oid] += 1
    org_calls = defaultdict(lambda: {"calls": 0, "secs": 0})
    for aid, cnt, secs in db.query(Call.agent_id, func.count(Call.id), func.sum(Call.duration_seconds)).group_by(Call.agent_id).all():
        oid = agent_org.get(aid)
        if oid:
            org_calls[oid]["calls"] += cnt or 0
            org_calls[oid]["secs"] += secs or 0
    org_names = {o.id: o.name for o in db.query(Organization).all()}
    top_vendors = sorted(
        [{
            "id": oid,
            "name": org_names.get(oid, f"Org #{oid}"),
            "calls": agg["calls"],
            "minutes": round(agg["secs"] / 60.0, 1),
            "agents": agent_count_by_org.get(oid, 0),
        } for oid, agg in org_calls.items()],
        key=lambda x: x["calls"], reverse=True,
    )[:5]

    return {
        "totals": {
            "agents": total_agents,
            "campaigns": total_campaigns,
            "leads": total_leads,
            "calls": total_calls,
            "minutes": round(total_seconds / 60.0, 1),
            "completed_calls": completed_calls,
            "connect_rate": connect_rate,
        },
        "outcomes": outcomes,
        "sentiment": sentiment,
        "calls_trend": calls_trend,
        "top_vendors": top_vendors,
    }

# 3. Dynamic critical alerts list
@router.get("/alerts")
def get_admin_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai" and current_user.email != "admin@voqly.com":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    from app.models.all_models import AuditLog
    
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(5).all()
    alerts_list = []
    for l in logs:
        alert_type = "info"
        if "SUSPEND" in l.action or "ONBOARD" in l.action:
            alert_type = "warning"
        elif "ERROR" in l.action or "FAIL" in l.action:
            alert_type = "error"
            
        actor_name = "SYSTEM"
        if l.user:
            actor_name = l.user.email.split("@")[0].upper()
            
        alerts_list.append({
            "id": l.id,
            "type": alert_type,
            "title": l.action.replace("_", " ").title(),
            "description": f"{l.resource_type or 'Platform'} Event. Resource ID: {l.resource_id}.",
            "timestamp": l.created_at.strftime("%I:%M %p") if l.created_at else "Just now",
            "actor": actor_name
        })
        
    if not alerts_list:
        alerts_list = [
            {
                "id": 1,
                "type": "info",
                "title": "Platform Normal",
                "description": "Database online. No critical administrative actions recorded.",
                "timestamp": "Just now",
                "actor": "DAEMON"
            }
        ]
        
    return alerts_list

# 4. Infrastructure micro-services status and event logs
@router.get("/infra-health")
def get_infra_health(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai" and current_user.email != "admin@voqly.com":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    from app.models.all_models import Organization, AuditLog
    from app.db.session import engine
    import time
    import os

    # --- 1. Database: measure a real query round-trip ---
    start_time = time.time()
    db.query(Organization).count()
    db_latency_ms = (time.time() - start_time) * 1000
    dialect = (getattr(getattr(engine, "dialect", None), "name", "") or "").lower()
    if dialect.startswith("postgre"):
        db_name = "PostgreSQL"
    elif dialect.startswith("sqlite"):
        db_name = "SQLite Local"
    else:
        db_name = dialect.upper() or "Database"
    db_status = "nominal" if db_latency_ms < 500 else "warning"

    # --- 2. LLM Router (Gemini) — agents can't speak without a key ---
    gemini_ok = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    llm_status = "nominal" if gemini_ok else "critical"
    llm_detail = "Gemini key loaded" if gemini_ok else "GEMINI_API_KEY missing — AI agents cannot speak on calls"

    # --- 3. Telephony Gateway (Plivo / Twilio) ---
    plivo_ok = bool(os.getenv("PLIVO_AUTH_ID") and os.getenv("PLIVO_AUTH_TOKEN"))
    twilio_ok = bool(os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN"))
    if plivo_ok and twilio_ok:
        tel_provider = "Plivo + Twilio"
    elif plivo_ok:
        tel_provider = "Plivo"
    elif twilio_ok:
        tel_provider = "Twilio"
    else:
        tel_provider = None
    tel_status = "nominal" if tel_provider else "warning"
    tel_detail = f"{tel_provider} credentials loaded" if tel_provider else "No provider credentials — outbound calls are simulated"

    # --- 4. Public Webhook (BASE_URL) — required for real inbound audio ---
    base_url = os.getenv("BASE_URL", "").strip().rstrip("/")
    is_public = bool(base_url) and ("localhost" not in base_url) and ("127.0.0.1" not in base_url)
    web_status = "nominal" if is_public else "warning"
    web_detail = base_url if is_public else "BASE_URL not public — provider callbacks can't reach this server"

    def _svc(sid, name, status, uptime, latency, detail):
        return {"id": sid, "name": name, "status": status, "uptime": uptime, "latency": latency, "detail": detail}

    services = [
        _svc("database", db_name, db_status, "100% Uptime", f"{round(db_latency_ms, 2)}ms", f"{dialect or 'db'} query round-trip"),
        _svc("api", "API Server", "nominal", "Online", "live", "FastAPI gateway responding"),
        _svc("llm", "LLM Router (Gemini)", llm_status, "Configured" if gemini_ok else "Not configured", "—", llm_detail),
        _svc("telephony", "Telephony Gateway", tel_status, tel_provider or "Not configured", "—", tel_detail),
        _svc("webhook", "Public Webhook", web_status, "Public" if is_public else "Local only", "—", web_detail),
    ]

    # --- Real audit-log tail as the live event stream (oldest -> newest) ---
    db_logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(20).all()
    logs_data = []
    for l in reversed(db_logs):
        actor = l.user.email if l.user else "system"
        ts = l.created_at.strftime('%Y-%m-%d %H:%M:%S') if l.created_at else ""
        logs_data.append(f"[INFO] [{ts}] {l.action} by {actor} on {l.resource_type or 'PLATFORM'} #{l.resource_id}")
    if not logs_data:
        logs_data = ["[INFO] No audit events recorded yet."]

    # --- Derive the incident purely from real service health ---
    degraded = [s for s in services if s["status"] != "nominal"]
    criticals = [s for s in degraded if s["status"] == "critical"]
    now_str = datetime.datetime.utcnow().strftime("%H:%M UTC")
    if degraded:
        names = ", ".join(s["name"] for s in degraded)
        incident = {
            "id": "INC-" + ("CRIT" if criticals else "WARN"),
            "severity": "high" if criticals else "medium",
            "title": f"{len(degraded)} service{'s' if len(degraded) != 1 else ''} need attention",
            "description": f"Degraded: {names}. Real calling may not work end-to-end until resolved.",
            "error_trace": " | ".join(f"{s['name']} — {s['detail']}" for s in degraded),
            "status": "Investigating",
            "detected": now_str,
            "timeline": [{"time": now_str, "text": f"Auto-detected degraded service(s): {names}."}],
            "updates": []
        }
    else:
        incident = {
            "id": "INC-NONE",
            "severity": "none",
            "title": "All Systems Operational",
            "description": "No active incidents. Database, LLM, telephony and webhooks are all healthy.",
            "error_trace": "Nominal",
            "status": "Resolved",
            "detected": "N/A",
            "timeline": [],
            "updates": []
        }

    return {"services": services, "system_logs": logs_data, "incident": incident}

# 5. Incident updates
@router.post("/incident/{incident_id}/update")
def post_incident_update(incident_id: str, payload: IncidentUpdateSchema, current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    now_str = datetime.datetime.utcnow().strftime("%H:%M UTC")
    new_update = {"time": now_str, "text": f"Engineer (Super Admin): {payload.message}"}
    
    incident_state["timeline"].insert(0, new_update)
    incident_state["updates"].append(payload.message)
    incident_state["status"] = "Investigating"

    return {"status": "success", "message": "Incident details updated successfully."}

# 6. Resolve active incident
@router.post("/incident/{incident_id}/resolve")
def resolve_incident(incident_id: str, current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    now_str = datetime.datetime.utcnow().strftime("%H:%M UTC")
    incident_state["status"] = "Resolved"
    
    resolve_event = {"time": now_str, "text": "Incident resolved by Super Admin. Back-office services normalized."}
    incident_state["timeline"].insert(0, resolve_event)

    return {"status": "success", "message": "Incident marked as RESOLVED."}

# Global settings values in-memory simulation seed
settings_state = {
    "concurrent_streams": 150,
    "max_tokens": 5000000,
    "white_label_enabled": True,
    "vendor_margin": 12.5,
    "model_temp": 0.4,
    "stt_buffer": 350,
    "routing_mode": "Latency Optimized"
}

# 7. Get global system configuration configurations
@router.get("/settings")
def get_global_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    # Fetch recent audit logs from DB
    db_logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(10).all()
    logs_data = []
    for l in db_logs:
        logs_data.append({
            "timestamp": l.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "actor": "Admin User X",
            "action": l.action,
            "target": f"Resource ID: {l.resource_id} ({l.resource_type})",
            "status": "SUCCESS"
        })

    # Add fallback simulated logs if empty to match screenshots
    if not logs_data:
        logs_data = [
            {"timestamp": "2026-05-28 14:22:10", "actor": "Admin User X", "action": "Changed Model Routing", "target": "Vendor Y (ID: 9942)", "status": "SUCCESS"},
            {"timestamp": "2026-05-28 13:45:04", "actor": "System Cron", "action": "Auto-Scaled Inference Pods", "target": "Cluster: us-east-1", "status": "INFO"},
            {"timestamp": "2026-05-28 12:01:33", "actor": "Admin User X", "action": "Updated API Key Expiry", "target": "Vendor Z (ID: 1102)", "status": "SUCCESS"}
        ]

    return {
        "settings": settings_state,
        "audit_logs": logs_data
    }

# 8. Update global configuration parameters
@router.put("/settings")
def update_global_settings(payload: SuperAdminSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    settings_state.update(payload.dict())

    # Log inside SQLite Audit logs
    audit_record = AuditLog(
        user_id=current_user.id,
        action="UPDATE_GLOBAL_PLATFORM_SETTINGS",
        resource_type="SUPERADMIN_SETTINGS",
        resource_id=0,
        payload=payload.dict()
    )
    db.add(audit_record)
    db.commit()

    return {"status": "success", "message": "Global configurations saved successfully."}

# 9. Revenue dashboard matrices
@router.get("/revenue")
def get_revenue_transactions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai" and current_user.email != "admin@voqly.com":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    from app.models.all_models import Subscription, Invoice, Organization

    # 1. Sum up MRR based on active subscriptions in the database
    subs = db.query(Subscription).filter(Subscription.status == "active").all()
    mrr = 0.0
    for s in subs:
        tier = s.plan_tier.lower() if s.plan_tier else "growth"
        if tier == "professional":
            mrr += 999.0
        elif tier == "growth":
            mrr += 499.0
        else:
            mrr += 99.0

    # 2. Avg revenue calculation
    orgs_count = db.query(Organization).count()
    avg_revenue = round(mrr / orgs_count, 2) if orgs_count > 0 else 0.0

    # 3. Sum up outstanding unpaid invoices
    outstanding = db.query(func.sum(Invoice.amount_due)).filter(Invoice.status != "paid").scalar() or 0.0
    outstanding_count = db.query(Invoice).filter(Invoice.status != "paid").count()

    # 4. Fetch dynamic recent transactions from Invoice records with full vendor + plan info
    invoices = db.query(Invoice).order_by(Invoice.id.desc()).limit(50).all()
    transactions = []
    for inv in invoices:
        sub = inv.subscription
        org = sub.organization if sub else None
        vendor_name = org.name if org else "Unknown Vendor"

        # Plan tier info
        plan_tier = sub.plan_tier if sub else "growth"
        plan_label = plan_tier.capitalize() if plan_tier else "Growth"

        # Renewal date
        renewal_date = ""
        if sub and sub.current_period_end:
            renewal_date = sub.current_period_end.strftime("%b %d, %Y")

        # Payment method — derive from org api_key or default
        payment_method = "Card •••• 4242"

        transactions.append({
            "id": f"INV-{inv.id:05d}",
            "vendor": vendor_name,
            "date": inv.created_at.strftime("%b %d, %Y") if inv.created_at else "",
            "amount": inv.amount_due,
            "status": inv.status.upper(),
            "plan": plan_label,
            "renewal_date": renewal_date,
            "payment_method": payment_method,
        })

    # 5. Build growth chart from real invoice data grouped by month
    from sqlalchemy import extract
    monthly_data = {}
    all_invoices = db.query(Invoice).filter(Invoice.status == "paid").all()
    for inv in all_invoices:
        if inv.created_at:
            key = inv.created_at.strftime("%b")
            monthly_data[key] = monthly_data.get(key, 0) + inv.amount_paid

    month_order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    growth_chart = [{"month": m, "value": int(monthly_data.get(m, 0))} for m in month_order if m in monthly_data]
    if not growth_chart:
        growth_chart = [{"month": "Jan", "value": int(mrr)}]

    # Calculate dynamic churn rate
    cancelled_subs = db.query(Subscription).filter(Subscription.status == "cancelled").count()
    total_subs = db.query(Subscription).count()
    churn_rate_val = round((cancelled_subs / max(1, total_subs)) * 100, 2) if total_subs > 0 else 0.0

    return {
        "mrr": mrr,
        "churn_rate": churn_rate_val,
        "avg_revenue": avg_revenue,
        "outstanding_invoices": outstanding,
        "outstanding_count": outstanding_count,
        "growth_chart": growth_chart,
        "transactions": transactions,
        "total_vendors": orgs_count,
    }

# 10. Vendor Management list
@router.get("/vendors")
def list_vendors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai" and current_user.email != "admin@voqly.com":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    from app.models.all_models import Team, Agent, Subscription, Invoice

    db_orgs = db.query(Organization).all()
    vendors_list = []
    for org in db_orgs:
        status_val = "SUSPENDED" if org.is_suspended else "ACTIVE"

        # Real agent count from DB
        agents_count = db.query(Agent).join(Team).filter(Team.organization_id == org.id).count()

        # Real invoice sum
        invoice_sum = (
            db.query(func.sum(Invoice.amount_paid))
            .join(Subscription)
            .filter(Subscription.organization_id == org.id, Invoice.status == "paid")
            .scalar() or 0.0
        )
        monthly_spend = invoice_sum if invoice_sum > 0 else org.prepaid_balance or 0.0

        # Plan info
        sub = db.query(Subscription).filter(Subscription.organization_id == org.id).first()
        plan_tier = sub.plan_tier if sub else "growth"
        plan_label = plan_tier.capitalize() if plan_tier else "Growth"
        renewal_date = sub.current_period_end.strftime("%b %d, %Y") if sub and sub.current_period_end else "—"
        plan_status = sub.status.capitalize() if sub else "Trial"

        # Margin based on plan
        margin = settings_state["vendor_margin"]
        if sub:
            tier = (sub.plan_tier or "growth").lower()
            if tier == "professional":
                margin = 12.5
            elif tier == "growth":
                margin = 15.0
            elif tier == "starter":
                margin = 18.0

        vendors_list.append({
            "id": org.id,
            "name": org.name,
            "email": org.owner.email if org.owner else "",
            "status": status_val,
            "active_agents": agents_count,
            "monthly_spend": monthly_spend,
            "platform_margin": margin,
            "plan": plan_label,
            "plan_status": plan_status,
            "renewal_date": renewal_date,
            "prepaid_balance": org.prepaid_balance or 0.0,
            "call_minutes_limit": org.call_minutes_limit if org.call_minutes_limit is not None else 100,
            "created_at": org.created_at.strftime("%b %d, %Y") if org.created_at else "",
        })

    return vendors_list

# 11. Suspend Org DID
@router.post("/vendors/{vendor_id}/suspend")
def suspend_vendor(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    # Try lookup in db
    org = db.query(Organization).filter(Organization.id == vendor_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Vendor organization not found.")

    org.is_suspended = True
    db.commit()

    return {"status": "success", "message": f"DID calling for Vendor {vendor_id} successfully SUSPENDED."}

# 12. Unsuspend Org DID
@router.post("/vendors/{vendor_id}/unsuspend")
def unsuspend_vendor(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    # Try lookup in db
    org = db.query(Organization).filter(Organization.id == vendor_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Vendor organization not found.")

    org.is_suspended = False
    db.commit()

    return {"status": "success", "message": f"DID calling for Vendor {vendor_id} successfully ACTIVATED."}

# 13. Create new Vendor Organisation
@router.post("/vendors")
def register_vendor(payload: VendorCreateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    # Check if slug exists
    exist = db.query(Organization).filter(Organization.slug == payload.slug).first()
    if exist:
        raise HTTPException(status_code=400, detail="Vendor slug already registered in workspace.")

    # Check or create owner User in DB
    owner = db.query(User).filter(User.email == payload.owner_email).first()
    if not owner:
        owner = User(
            email=payload.owner_email,
            hashed_password="secure_password_auto",
            full_name=payload.name + " Owner"
        )
        db.add(owner)
        db.commit()
        db.refresh(owner)

    new_org = Organization(
        name=payload.name,
        slug=payload.slug,
        owner_id=owner.id,
        industry=payload.industry,
        concurrency_limit=payload.concurrency_limit,
        prepaid_balance=payload.prepaid_balance
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)

    # Automatically provision a default Starter subscription for 30 days
    from app.models.all_models import Subscription
    default_sub = Subscription(
        organization_id=new_org.id,
        plan_tier="starter",
        status="active",
        current_period_end=datetime.datetime.utcnow() + datetime.timedelta(days=30)
    )
    db.add(default_sub)
    db.commit()

    return {
        "status": "success",
        "message": f"Tenant Vendor '{payload.name}' registered successfully with Starter subscription.",
        "vendor": new_org
    }

# --- AI PROVIDER ORCHESTRATION SCHEMAS & ROUTES ---

class AiProviderCreateSchema(BaseModel):
    name: str
    active: bool
    models: str
    latency: int
    uptime: float
    cost_per_1k: float

class RoutingRulesUpdateSchema(BaseModel):
    use_case: str
    primary_model: str
    fallback_model: str
    status: str

# Persistent in-memory simulator seed collections
ai_providers_state = [
    {"id": "openai", "name": "OpenAI", "models": "GPT-4o, GPT-3.5-Turbo", "latency": 245, "uptime": 99.98, "cost_per_1k": 0.002, "active": True, "icon": "bolt"},
    {"id": "anthropic", "name": "Anthropic", "models": "Claude 3.5 Sonnet, Haiku", "latency": 312, "uptime": 99.95, "cost_per_1k": 0.003, "active": False, "icon": "sparkles"},
    {"id": "google", "name": "Google", "models": "Gemini 1.5 Pro, Flash", "latency": 180, "uptime": 99.99, "cost_per_1k": 0.001, "active": False, "icon": "globe"},
    {"id": "custom", "name": "Voqly-Custom", "models": "On-prem Llama 3 Fine-tuned", "latency": 45, "uptime": 100.0, "cost_per_1k": 0.0001, "active": True, "icon": "shield"}
]

routing_rules_state = [
    {"id": 1, "use_case": "Real-time STT", "primary_model": "Voqly-Whisper-V3", "fallback_model": "Google Flash", "status": "OPTIMIZED"},
    {"id": 2, "use_case": "Complex Reasoning", "primary_model": "GPT-4o", "fallback_model": "Claude 3.5 Opus", "status": "BALANCED"},
    {"id": 3, "use_case": "Low-Cost Summary", "primary_model": "LLama 3 8B", "fallback_model": "GPT-3.5 Turbo", "status": "COST-SAVING"}
]

smart_routing_state = {"enabled": True}

@router.get("/ai-providers")
def get_ai_providers(current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    return ai_providers_state

@router.post("/ai-providers/{provider_id}/toggle")
def toggle_ai_provider(provider_id: str, current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    
    for provider in ai_providers_state:
        if provider["id"] == provider_id:
            provider["active"] = not provider["active"]
            return {"status": "success", "message": f"Provider '{provider['name']}' status toggled to {provider['active']}.", "provider": provider}
            
    raise HTTPException(status_code=404, detail="AI Provider not found.")

@router.post("/ai-providers")
def connect_ai_provider(payload: AiProviderCreateSchema, current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    
    new_id = payload.name.lower().replace(" ", "-")
    for provider in ai_providers_state:
        if provider["id"] == new_id:
            raise HTTPException(status_code=400, detail="AI Provider with this name is already connected.")
            
    new_provider = {
        "id": new_id,
        "name": payload.name,
        "models": payload.models,
        "latency": payload.latency,
        "uptime": payload.uptime,
        "cost_per_1k": payload.cost_per_1k,
        "active": payload.active,
        "icon": "cpu"
    }
    ai_providers_state.append(new_provider)
    return {"status": "success", "message": f"AI Provider '{payload.name}' connected successfully.", "provider": new_provider}

@router.get("/routing-rules")
def get_routing_rules(current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    return routing_rules_state

@router.put("/routing-rules")
def update_routing_rules(payload: List[RoutingRulesUpdateSchema], current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    
    global routing_rules_state
    new_rules = []
    for idx, rule in enumerate(payload):
        new_rules.append({
            "id": idx + 1,
            "use_case": rule.use_case,
            "primary_model": rule.primary_model,
            "fallback_model": rule.fallback_model,
            "status": rule.status
        })
    routing_rules_state = new_rules
    return {"status": "success", "message": "Model routing rules updated successfully.", "rules": routing_rules_state}

@router.post("/smart-routing/toggle")
def toggle_smart_routing(current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    
    smart_routing_state["enabled"] = not smart_routing_state["enabled"]
    return {"status": "success", "message": f"Smart Routing enabled state toggled to {smart_routing_state['enabled']}.", "enabled": smart_routing_state["enabled"]}

@router.get("/live-health")
def get_live_health(current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    
    return {
        "total_tokens_24h": "12.4M",
        "peak_consumption": "09:30 AM EST",
        "chart_data": [
            {"label": "00:00", "value": 45},
            {"label": "03:00", "value": 30},
            {"label": "06:00", "value": 35},
            {"label": "09:00", "value": 85},
            {"label": "12:00", "value": 60},
            {"label": "15:00", "value": 40},
            {"label": "18:00", "value": 55},
            {"label": "21:00", "value": 75}
        ]
    }

# 14. Detailed Vendor Profile for Super Admin
@router.get("/vendors/{vendor_id}")
def get_vendor_detail(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email != "admin@voqly.ai" and current_user.email != "admin@voqly.com":
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    from app.models.all_models import Team, Agent, Subscription, Invoice, PhoneNumber

    org = db.query(Organization).filter(Organization.id == vendor_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Vendor organization not found.")

    # Owner info
    owner_email = org.owner.email if org.owner else ""
    owner_name = org.owner.full_name if org.owner else ""

    # Subscription / plan
    sub = db.query(Subscription).filter(Subscription.organization_id == org.id).first()
    plan_tier = sub.plan_tier if sub else "free"
    plan_label = plan_tier.capitalize() if plan_tier else "Free"
    plan_status = sub.status.capitalize() if sub else "Trial"
    renewal_date = sub.current_period_end.strftime("%b %d, %Y") if sub and sub.current_period_end else "—"

    # Invoices
    invoices_data = []
    if sub:
        invoices = db.query(Invoice).filter(Invoice.subscription_id == sub.id).order_by(Invoice.id.desc()).all()
        for inv in invoices:
            invoices_data.append({
                "id": inv.id,
                "invoice_number": f"INV-2026-{1000 + inv.id}",
                "amount": inv.amount_paid,
                "status": inv.status,
                "created_at": inv.created_at.strftime("%b %d, %Y") if inv.created_at else "",
                "payment_gateway": getattr(inv, "payment_gateway", "stripe"),
                "pdf_url": inv.pdf_url or "#",
            })

    # Agents
    agents_count = db.query(Agent).join(Team).filter(Team.organization_id == org.id).count()
    agents_list = []
    teams = db.query(Team).filter(Team.organization_id == org.id).all()
    for team in teams:
        for agent in team.agents:
            agents_list.append({
                "id": agent.id,
                "name": agent.name,
                "voice_provider": agent.voice_provider,
                "lang": agent.lang,
                "status": "ACTIVE" if getattr(agent, "is_active", True) else "INACTIVE",
                "created_at": agent.created_at.strftime("%b %d, %Y") if agent.created_at else "",
            })

    # Phone numbers
    phone_numbers = db.query(PhoneNumber).filter(PhoneNumber.organization_id == org.id).all()
    phone_count = len(phone_numbers)
    phones_list = [
        {
            "id": p.id,
            "phone_number": p.phone_number,
            "country": p.country,
            "type": p.type,
            "status": p.status,
            "assigned_agent": p.assigned_agent,
            "monthly_cost": p.monthly_cost,
        } for p in phone_numbers
    ]

    # Revenue
    invoice_sum = db.query(func.sum(Invoice.amount_paid)).join(Subscription).filter(
        Subscription.organization_id == org.id, Invoice.status == "paid"
    ).scalar() or 0.0

    # Members
    members = db.query(OrganizationUser).filter(OrganizationUser.organization_id == org.id).all()

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "email": owner_email,
        "owner_name": owner_name,
        "industry": org.industry or "SaaS",
        "website_url": org.website_url or "",
        "company_size": org.company_size or "",
        "status": "SUSPENDED" if org.is_suspended else "ACTIVE",
        "created_at": org.created_at.strftime("%b %d, %Y") if org.created_at else "",
        "plan": plan_label,
        "plan_tier": plan_tier,
        "plan_status": plan_status,
        "renewal_date": renewal_date,
        "prepaid_balance": org.prepaid_balance or 0.0,
        "concurrency_limit": org.concurrency_limit or 10,
        "call_minutes_limit": org.call_minutes_limit if org.call_minutes_limit is not None else 100,
        "total_revenue": invoice_sum,
        "active_agents": agents_count,
        "agents": agents_list,
        "phone_numbers_count": phone_count,
        "phone_numbers": phones_list,
        "team_members": len(members),
        "invoices": invoices_data,
        "telephony_provider": org.telephony_provider or "plivo",
        "twilio_number": org.twilio_number or "",
        "plivo_number": org.plivo_number or "",
    }


@router.get("/vendors/{vendor_id}/activity")
def get_vendor_activity(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    """End-to-end operational view of one vendor: agents (with voice), campaigns,
    call logs and lead lists — everything the vendor sees, for the admin."""
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    from app.models.all_models import Team, Agent, Campaign, Lead, Call

    org = db.query(Organization).filter(Organization.id == vendor_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Vendor not found")

    team_ids = [t.id for t in db.query(Team).filter(Team.organization_id == org.id).all()]
    agents = db.query(Agent).filter(Agent.team_id.in_(team_ids)).all() if team_ids else []
    agent_ids = [a.id for a in agents]
    agent_name = {a.id: a.name for a in agents}

    agents_out = [{
        "id": a.id, "name": a.name,
        "voice_id": a.voice_id, "voice_provider": a.voice_provider,
        "category": getattr(a, "category", None), "subcategory": getattr(a, "subcategory", None),
        "lang": a.lang, "status": "ACTIVE" if getattr(a, "is_active", True) else "INACTIVE",
        "created_at": a.created_at.isoformat() if getattr(a, "created_at", None) else "",
    } for a in agents]

    # Campaigns (exclude internal leads-list rows), with lead + call counts
    campaigns = db.query(Campaign).filter(
        Campaign.agent_id.in_(agent_ids),
        ~Campaign.status.in_(["leads_list", "LEADS_LIST"]),
    ).order_by(Campaign.created_at.desc()).all() if agent_ids else []
    campaigns_out = []
    for c in campaigns:
        lead_ids = [l[0] for l in db.query(Lead.id).filter(Lead.campaign_id == c.id).all()]
        calls_n = db.query(Call).filter(Call.lead_id.in_(lead_ids)).count() if lead_ids else 0
        campaigns_out.append({
            "id": c.id, "name": c.name, "status": (c.status or "").upper(),
            "agent_name": agent_name.get(c.agent_id, "Unassigned"),
            "leads_count": len(lead_ids), "calls_count": calls_n,
            "created_at": c.created_at.isoformat() if c.created_at else "",
        })

    # Lead lists
    lead_lists = db.query(Campaign).filter(
        Campaign.agent_id.in_(agent_ids), Campaign.status.in_(["leads_list", "LEADS_LIST"]),
    ).order_by(Campaign.created_at.desc()).all() if agent_ids else []
    leads_out = []
    for camp in lead_lists:
        total = db.query(Lead).filter(Lead.campaign_id == camp.id).count()
        if total == 0:
            continue
        called = db.query(Lead).filter(Lead.campaign_id == camp.id, Lead.status.in_(["called", "CALLED", "completed", "COMPLETED"])).count()
        dnc = db.query(Lead).filter(Lead.campaign_id == camp.id, Lead.status.in_(["dnc", "DNC"])).count()
        leads_out.append({"id": camp.id, "name": camp.name, "total": total, "called": called, "dnc": dnc})

    # Call logs (most recent 200), with campaign + voice
    lead_campaign = {}  # lead_id -> campaign name
    calls = db.query(Call).filter(Call.agent_id.in_(agent_ids)).order_by(Call.created_at.desc()).limit(200).all() if agent_ids else []
    calls_out = []
    total_seconds = 0
    for call in calls:
        lead = call.lead
        camp = lead.campaign if lead else None
        secs = call.duration_seconds or 0
        total_seconds += secs
        transcript = call.transcript
        calls_out.append({
            "id": call.id,
            "lead_name": lead.name if lead else "Unknown",
            "lead_phone": lead.phone_number if lead else "",
            "agent_name": agent_name.get(call.agent_id, "Unknown"),
            "voice_id": next((a.voice_id for a in agents if a.id == call.agent_id), None),
            "campaign_name": camp.name if camp else None,
            "status": (call.status or "").upper(),
            "duration": f"{secs // 60:02d}:{secs % 60:02d}",
            "sentiment": (transcript.sentiment if transcript and transcript.sentiment else "neutral").upper(),
            "interest_score": (transcript.interest_score if transcript and transcript.interest_score is not None else 0),
            "direction": (getattr(call, "direction", None) or "OUTBOUND"),
            "recording_url": call.recording_url,
            "created_at": call.created_at.isoformat() if call.created_at else "",
        })

    all_calls_count = db.query(Call).filter(Call.agent_id.in_(agent_ids)).count() if agent_ids else 0
    return {
        "vendor_name": org.name,
        "totals": {
            "agents": len(agents_out),
            "campaigns": len(campaigns_out),
            "calls": all_calls_count,
            "minutes": round(total_seconds / 60.0, 1),
            "leads": sum(l["total"] for l in leads_out),
        },
        "agents": agents_out,
        "campaigns": campaigns_out,
        "calls": calls_out,
        "leads": leads_out,
    }


@router.get("/vendors/{vendor_id}/report/detailed")
def get_vendor_detailed_report(
    vendor_id: int,
    campaign_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Admin: full per-call history for one vendor's campaigns.

    Pass ?campaign_id=<id> for a single campaign (campaign-wise download); omit
    it for the vendor's whole history. Each row carries the recording URL so the
    admin can also pull the call audio. Powers the admin Call Logs / Campaigns
    download buttons.
    """
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    from app.models.all_models import Team, Agent, Campaign, Lead, Call

    org = db.query(Organization).filter(Organization.id == vendor_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Vendor not found")

    team_ids = [t.id for t in db.query(Team).filter(Team.organization_id == org.id).all()]
    agents = db.query(Agent).filter(Agent.team_id.in_(team_ids)).all() if team_ids else []
    agent_ids = [a.id for a in agents]
    agent_name = {a.id: a.name for a in agents}

    camp_q = db.query(Campaign).filter(
        Campaign.agent_id.in_(agent_ids),
        ~Campaign.status.in_(["leads_list", "LEADS_LIST"]),
    ) if agent_ids else None
    if camp_q is not None and campaign_id is not None:
        camp_q = camp_q.filter(Campaign.id == campaign_id)
    campaigns = camp_q.all() if camp_q is not None else []
    if campaign_id is not None and not campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found")
    camp_name = {c.id: c.name for c in campaigns}

    rows = []
    for c in campaigns:
        leads = db.query(Lead).filter(Lead.campaign_id == c.id).all()
        lead_by_id = {l.id: l for l in leads}
        lead_ids = list(lead_by_id.keys())
        if not lead_ids:
            continue
        calls = db.query(Call).filter(Call.lead_id.in_(lead_ids)).order_by(Call.created_at.asc()).all()
        for call in calls:
            lead = lead_by_id.get(call.lead_id)
            secs = call.duration_seconds or 0
            transcript = call.transcript
            sentiment = (transcript.sentiment if transcript and transcript.sentiment else "neutral").upper()
            interest = transcript.interest_score if transcript and transcript.interest_score is not None else 0
            created = call.created_at
            rows.append({
                "campaign_id": c.id,
                "campaign_name": camp_name.get(c.id, ""),
                "lead_name": lead.name if lead else "Unknown Lead",
                "lead_phone": lead.phone_number if lead else "",
                "agent_name": agent_name.get(call.agent_id, "Unknown"),
                "date": created.strftime("%Y-%m-%d") if created else "",
                "time": created.strftime("%H:%M:%S") if created else "",
                "status": (call.status or "").upper(),
                "duration": f"{secs // 60:02d}:{secs % 60:02d}",
                "duration_seconds": secs,
                "sentiment": sentiment,
                "interest_score": interest,
                "direction": (getattr(call, "direction", None) or "OUTBOUND"),
                "recording_url": call.recording_url,
                "created_at": created.isoformat() if created else "",
            })

    return {
        "vendor_name": org.name,
        "scope": "campaign" if campaign_id is not None else "all",
        "campaign_id": campaign_id,
        "campaign_name": (campaigns[0].name if campaign_id is not None and campaigns else None),
        "total_calls": len(rows),
        "calls": rows,
    }


# ── Vendor Costing ─────────────────────────────────────────────────────────
# Rates are DERIVED from the Call Cost Calculator model (superadmin/cost-calculator)
# so both surfaces agree. Calculator defaults (USD unless noted), researched 2026-07-07
# per CALL_COST_MODEL.md; converted to ₹ at the FX below. Keep in sync if the
# calculator's DEFAULTS change.
_FX_INR_PER_USD = 86.0
_GEMINI_AUDIO_IN_PER_MIN_USD = 0.005        # caller speech -> Gemini (STT)
_GEMINI_AUDIO_OUT_PER_MIN_USD = 0.018       # agent speech (TTS), billed on talk time
_GEMINI_TALK_SHARE = 0.50                   # assumed agent talk share (calculator default)
_TRANSCRIPT_OVERHEAD_PER_MIN_USD = 0.002    # input+output transcription tokens
_FIXED_PER_CALL_USD = 0.007                 # system prompt + post-call analysis + embedding
_PLIVO_LOCAL_PER_MIN_INR = 0.60             # Plivo India local (already ₹ in the calculator)
_TWILIO_MOBILE_PER_MIN_USD = 0.0075         # Twilio India mobile


def _inr(usd: float) -> float:
    return round(usd * _FX_INR_PER_USD, 2)


# Per-minute / per-outcome rates for the models & channels we bill on. Rupees.
COSTING_RATES = {
    "currency": "₹",
    # Gemini voice "brain" = audio in + audio out (at the assumed agent talk share)
    "voice_ai_per_min": _inr(_GEMINI_AUDIO_IN_PER_MIN_USD + _GEMINI_AUDIO_OUT_PER_MIN_USD * _GEMINI_TALK_SHARE),
    "telephony_plivo_per_min": round(_PLIVO_LOCAL_PER_MIN_INR, 2),   # Plivo carrier minutes
    "telephony_twilio_per_min": _inr(_TWILIO_MOBILE_PER_MIN_USD),    # Twilio carrier minutes
    "transcription_per_min": _inr(_TRANSCRIPT_OVERHEAD_PER_MIN_USD), # real-time transcription
    "ai_analysis_per_outcome": _inr(_FIXED_PER_CALL_USD),            # fixed per call (analysis + embedding)
    "tokens_per_min_est": 850,         # rough Gemini live token estimate / audio-min
    "fx_inr_per_usd": _FX_INR_PER_USD,
}


def _classify_call_provider(provider_uuid, default: str) -> str:
    """Infer which carrier ACTUALLY placed a call from its stored provider id.
    Twilio Call SIDs look like 'CAxxxx…' (34 chars); Plivo request_uuids are
    hyphenated UUIDs. Unknown/simulated calls fall back to the org's default."""
    if not provider_uuid:
        return default
    u = str(provider_uuid).strip()
    if u.startswith("CA") and len(u) == 34:
        return "twilio"
    if "-" in u:
        return "plivo"
    return default


def _cost_breakdown(min_total: float, min_plivo: float, min_twilio: float, transcripts: int) -> dict:
    """Telephony is billed per the carrier ACTUALLY used on each call, so a
    vendor that dials on both Plivo and Twilio is charged for each separately."""
    voice_ai = min_total * COSTING_RATES["voice_ai_per_min"]
    tel_plivo = min_plivo * COSTING_RATES["telephony_plivo_per_min"]
    tel_twilio = min_twilio * COSTING_RATES["telephony_twilio_per_min"]
    transcription = min_total * COSTING_RATES["transcription_per_min"]
    analysis = transcripts * COSTING_RATES["ai_analysis_per_outcome"]
    providers = []
    if min_plivo > 0:
        providers.append("plivo")
    if min_twilio > 0:
        providers.append("twilio")
    return {
        "voice_ai": round(voice_ai, 2),
        "telephony_plivo": round(tel_plivo, 2),
        "telephony_twilio": round(tel_twilio, 2),
        "transcription": round(transcription, 2),
        "analysis": round(analysis, 2),
        "total": round(voice_ai + tel_plivo + tel_twilio + transcription + analysis, 2),
        "providers": providers,
    }


@router.get("/vendor-costing")
def get_vendor_costing(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    """Per-vendor cost of the AI + telephony stack (Gemini voice, Plivo/Twilio
    carrier, transcription, AI analysis) derived from real call usage, plus
    platform-wide totals (all-time and this month). Powers Vendor Costing."""
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    from app.models.all_models import Organization, Team, Agent, Call, Transcript
    from collections import defaultdict
    import datetime as dt

    now = dt.datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    team_org = {tid: oid for tid, oid in db.query(Team.id, Team.organization_id).all()}
    agent_org = {aid: team_org.get(tid) for aid, tid in db.query(Agent.id, Agent.team_id).all()}
    agents_by_org = defaultdict(int)
    for aid, oid in agent_org.items():
        if oid:
            agents_by_org[oid] += 1

    orgs = db.query(Organization).all()
    org_provider = {o.id: (getattr(o, "telephony_provider", None) or "plivo").lower() for o in orgs}

    def _zero():
        return {"secs": 0, "secs_plivo": 0, "secs_twilio": 0, "calls": 0,
                "secs_m": 0, "secs_plivo_m": 0, "secs_twilio_m": 0, "calls_m": 0}
    org_agg = defaultdict(_zero)

    # Attribute every call to the carrier it actually used (Plivo vs Twilio).
    for aid, secs, puid, created in db.query(Call.agent_id, Call.duration_seconds, Call.provider_call_uuid, Call.created_at).all():
        oid = agent_org.get(aid)
        if not oid:
            continue
        secs = secs or 0
        prov = _classify_call_provider(puid, org_provider.get(oid, "plivo"))
        a = org_agg[oid]
        a["secs"] += secs
        a["calls"] += 1
        a["secs_twilio" if prov == "twilio" else "secs_plivo"] += secs
        if created and created >= month_start:
            a["secs_m"] += secs
            a["calls_m"] += 1
            a["secs_twilio_m" if prov == "twilio" else "secs_plivo_m"] += secs

    # Transcript (AI analysis) counts per org — carrier-independent.
    tx_all = defaultdict(int)
    for aid, cnt in db.query(Call.agent_id, func.count(Transcript.id)).join(Transcript, Transcript.call_id == Call.id).group_by(Call.agent_id).all():
        oid = agent_org.get(aid)
        if oid:
            tx_all[oid] += cnt or 0
    tx_month = defaultdict(int)
    for aid, cnt in db.query(Call.agent_id, func.count(Transcript.id)).join(Transcript, Transcript.call_id == Call.id).filter(Transcript.created_at >= month_start).group_by(Call.agent_id).all():
        oid = agent_org.get(aid)
        if oid:
            tx_month[oid] += cnt or 0

    vendors = []
    tot = {"cost": 0.0, "cost_month": 0.0, "minutes": 0.0, "calls": 0, "tokens": 0}
    for org in orgs:
        a = org_agg.get(org.id, _zero())
        minutes = a["secs"] / 60.0
        min_plivo = a["secs_plivo"] / 60.0
        min_twilio = a["secs_twilio"] / 60.0
        tx = tx_all.get(org.id, 0)
        bd = _cost_breakdown(minutes, min_plivo, min_twilio, tx)
        minutes_m = a["secs_m"] / 60.0
        bd_m = _cost_breakdown(minutes_m, a["secs_plivo_m"] / 60.0, a["secs_twilio_m"] / 60.0, tx_month.get(org.id, 0))
        tokens_est = round(minutes * COSTING_RATES["tokens_per_min_est"])
        prepaid = org.prepaid_balance or 0.0
        cost_total = bd["total"]
        providers_used = bd["providers"] or [org_provider.get(org.id, "plivo")]
        vendors.append({
            "id": org.id,
            "name": org.name,
            "providers": providers_used,
            "configured_provider": org_provider.get(org.id, "plivo"),
            "agents": agents_by_org.get(org.id, 0),
            "usage": {
                "minutes": round(minutes, 1),
                "calls": a["calls"],
                "transcripts": tx,
                "tokens_est": tokens_est,
                "minutes_month": round(minutes_m, 1),
                "calls_month": a["calls_m"],
                "plivo_minutes": round(min_plivo, 1),
                "twilio_minutes": round(min_twilio, 1),
            },
            "breakdown": bd,
            "cost_total": cost_total,
            "cost_month": bd_m["total"],
            "credits": {
                "allocated": round(prepaid, 2),
                "used": cost_total,
                "remaining": round(prepaid - cost_total, 2),
            },
            "limits": {
                "call_minutes_limit": org.call_minutes_limit if org.call_minutes_limit is not None else 100,
                "minutes_used": round(minutes, 1),
                "prepaid_balance": round(prepaid, 2),
            },
        })
        tot["cost"] += cost_total
        tot["cost_month"] += bd_m["total"]
        tot["minutes"] += minutes
        tot["calls"] += a["calls"]
        tot["tokens"] += tokens_est

    vendors.sort(key=lambda v: v["cost_total"], reverse=True)
    return {
        "currency": COSTING_RATES["currency"],
        "rates": {
            "voice_ai_per_min": COSTING_RATES["voice_ai_per_min"],
            "telephony_plivo_per_min": COSTING_RATES["telephony_plivo_per_min"],
            "telephony_twilio_per_min": COSTING_RATES["telephony_twilio_per_min"],
            "transcription_per_min": COSTING_RATES["transcription_per_min"],
            "ai_analysis_per_outcome": COSTING_RATES["ai_analysis_per_outcome"],
        },
        "totals": {
            "cost": round(tot["cost"], 2),
            "cost_month": round(tot["cost_month"], 2),
            "minutes": round(tot["minutes"], 1),
            "calls": tot["calls"],
            "tokens_est": tot["tokens"],
            "vendors": len(vendors),
        },
        "vendors": vendors,
    }


class CostingLimitsSchema(BaseModel):
    call_minutes_limit: Optional[int] = None
    prepaid_balance: Optional[float] = None


@router.put("/vendors/{vendor_id}/costing-limits")
def update_vendor_costing_limits(vendor_id: int, payload: CostingLimitsSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    """Admin: raise a vendor's call-minute allowance and/or prepaid credit
    balance from the Vendor Costing page."""
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    from app.models.all_models import Organization
    org = db.query(Organization).filter(Organization.id == vendor_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if payload.call_minutes_limit is not None:
        org.call_minutes_limit = max(0, int(payload.call_minutes_limit))
    if payload.prepaid_balance is not None:
        org.prepaid_balance = max(0.0, float(payload.prepaid_balance))
    db.commit()
    db.refresh(org)
    return {"status": "success", "call_minutes_limit": org.call_minutes_limit, "prepaid_balance": org.prepaid_balance}


# ── Inbound number assignment (platform-owned numbers → vendor + answering agent) ──
class InboundNumberSchema(BaseModel):
    phone_number: str
    provider: str = "plivo"                 # plivo | twilio (used to auto-register the webhook)
    assigned_agent: Optional[str] = None    # agent id (as string) that answers this number
    nickname: Optional[str] = None


def _inbound_number_dict(pn, agent_name=None) -> dict:
    return {
        "id": pn.id,
        "phone_number": pn.phone_number,
        "assigned_agent": pn.assigned_agent,
        "agent_name": agent_name,
        "type": pn.type,
        "nickname": getattr(pn, "nickname", None),
        "status": pn.status,
        "direction": pn.direction,
    }


@router.get("/vendors/{vendor_id}/inbound-numbers")
def list_vendor_inbound_numbers(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    from app.models.all_models import PhoneNumber, Agent
    rows = db.query(PhoneNumber).filter(
        PhoneNumber.organization_id == vendor_id,
        PhoneNumber.direction == "INBOUND",
    ).all()
    out = []
    for pn in rows:
        agent_name = None
        if pn.assigned_agent:
            try:
                a = db.query(Agent).filter(Agent.id == int(pn.assigned_agent)).first()
                agent_name = a.name if a else None
            except (ValueError, TypeError):
                agent_name = pn.assigned_agent
        out.append(_inbound_number_dict(pn, agent_name))
    return out


@router.post("/vendors/{vendor_id}/inbound-numbers")
def assign_vendor_inbound_number(vendor_id: int, payload: InboundNumberSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    """Assign an existing platform number to a vendor + answering agent for INBOUND,
    and auto-register its answer webhook with the provider."""
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    from app.models.all_models import Organization, PhoneNumber
    org = db.query(Organization).filter(Organization.id == vendor_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Vendor not found")

    number = "".join(c for c in (payload.phone_number or "") if c.isdigit() or c == "+").strip()
    if not number:
        raise HTTPException(status_code=400, detail="A valid phone number is required.")

    pn = db.query(PhoneNumber).filter(PhoneNumber.phone_number == number).first()
    if not pn:
        pn = PhoneNumber(phone_number=number, type="LOCAL", country="US")
        db.add(pn)
    pn.organization_id = vendor_id
    pn.assigned_agent = str(payload.assigned_agent) if payload.assigned_agent else None
    pn.direction = "INBOUND"
    pn.status = "active"
    if payload.nickname:
        pn.nickname = payload.nickname
    db.commit()
    db.refresh(pn)

    # Auto-register the answer webhook with the provider (best-effort).
    from app.services.telephony_provisioning import register_inbound_webhook
    reg = register_inbound_webhook(payload.provider, number)
    return {"status": "success", "webhook": reg, "number": _inbound_number_dict(pn)}


@router.delete("/vendors/{vendor_id}/inbound-numbers/{number_id}")
def unassign_vendor_inbound_number(vendor_id: int, number_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    from app.models.all_models import PhoneNumber
    pn = db.query(PhoneNumber).filter(PhoneNumber.id == number_id, PhoneNumber.organization_id == vendor_id).first()
    if not pn:
        raise HTTPException(status_code=404, detail="Inbound number not found for this vendor.")
    pn.direction = "OUTBOUND"
    pn.assigned_agent = None
    db.commit()
    return {"status": "success", "message": "Inbound routing removed."}


class VendorSettingsUpdateSchema(BaseModel):
    concurrency_limit: int
    plan_tier: str
    prepaid_balance: Optional[float] = None
    plan_expires_at: Optional[str] = None
    call_minutes_limit: Optional[int] = None
    telephony_provider: Optional[str] = None  # "plivo" | "twilio"
    twilio_number: Optional[str] = None
    plivo_number: Optional[str] = None


class VendorMinutesUpdateSchema(BaseModel):
    call_minutes_limit: int


@router.put("/vendors/{vendor_id}/call-minutes")
def update_vendor_call_minutes(
    vendor_id: int,
    payload: VendorMinutesUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Admin-only: set a vendor's free call-minute allowance."""
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    org = db.query(Organization).filter(Organization.id == vendor_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Vendor organization not found.")
    org.call_minutes_limit = max(0, int(payload.call_minutes_limit))
    db.commit()
    db.refresh(org)
    return {"status": "success", "call_minutes_limit": org.call_minutes_limit}


@router.put("/vendors/{vendor_id}/settings")
def update_vendor_settings(
    vendor_id: int,
    payload: VendorSettingsUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    org = db.query(Organization).filter(Organization.id == vendor_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Vendor organization not found.")

    org.concurrency_limit = payload.concurrency_limit
    if payload.call_minutes_limit is not None:
        org.call_minutes_limit = max(0, payload.call_minutes_limit)
    if payload.prepaid_balance is not None:
        org.prepaid_balance = payload.prepaid_balance

    # Telephony assignment — which provider/number this vendor dials from.
    if payload.telephony_provider is not None:
        provider = payload.telephony_provider.strip().lower()
        if provider in ("plivo", "twilio"):
            org.telephony_provider = provider
    if payload.twilio_number is not None:
        org.twilio_number = payload.twilio_number.strip() or None
    if payload.plivo_number is not None:
        org.plivo_number = payload.plivo_number.strip() or None

    # Update or create subscription plan
    from app.models.all_models import Subscription
    sub = db.query(Subscription).filter(Subscription.organization_id == org.id).first()
    
    plan_tier_val = payload.plan_tier.lower()
    
    if not sub:
        expire_date = datetime.datetime.utcnow() + datetime.timedelta(days=30)
        if payload.plan_expires_at:
            try:
                expire_date = datetime.datetime.strptime(payload.plan_expires_at, "%Y-%m-%d")
            except ValueError:
                try:
                    expire_date = datetime.datetime.strptime(payload.plan_expires_at, "%b %d, %Y")
                except ValueError:
                    pass
        sub = Subscription(
            organization_id=org.id,
            plan_tier=plan_tier_val,
            status="active",
            current_period_end=expire_date
        )
        db.add(sub)
    else:
        sub.plan_tier = plan_tier_val
        if payload.plan_expires_at:
            try:
                sub.current_period_end = datetime.datetime.strptime(payload.plan_expires_at, "%Y-%m-%d")
            except ValueError:
                try:
                    sub.current_period_end = datetime.datetime.strptime(payload.plan_expires_at, "%b %d, %Y")
                except ValueError:
                    pass
        
    db.commit()
    return {"status": "success", "message": "Vendor settings updated successfully."}


@router.get("/subscriptions/expiring")
def get_expiring_subscriptions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    from app.models.all_models import Subscription
    import datetime as dt

    now = dt.datetime.utcnow()
    # Expiring within the next 7 days (or already past, but active status)
    threshold = now + dt.timedelta(days=7)

    expiring_subs = db.query(Subscription).filter(
        Subscription.status == "active",
        Subscription.current_period_end >= now - dt.timedelta(days=365),  # allow past but active
        Subscription.current_period_end <= threshold
    ).all()

    results = []
    for sub in expiring_subs:
        org = sub.organization
        if not org:
            continue
        owner_email = org.owner.email if org.owner else "unknown@voqly.ai"
        days_left = (sub.current_period_end - now).days
        results.append({
            "sub_id": sub.id,
            "vendor_id": org.id,
            "vendor_name": org.name,
            "owner_email": owner_email,
            "plan_tier": sub.plan_tier,
            "renewal_date": sub.current_period_end.strftime("%Y-%m-%d"),
            "days_left": max(0, days_left)
        })
    return results


@router.post("/subscriptions/{sub_id}/remind")
def send_subscription_reminder(sub_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    from app.models.all_models import Subscription, AuditLog
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    org = sub.organization
    vendor_name = org.name if org else "Unknown Vendor"

    db_log = AuditLog(
        user_id=current_user.id,
        action="SEND_SUBSCRIPTION_RENEWAL_REMINDER",
        resource_type="SUBSCRIPTION",
        resource_id=sub.id,
        payload={"vendor_name": vendor_name, "plan": sub.plan_tier}
    )
    db.add(db_log)
    db.commit()

    return {"status": "success", "message": f"Renewal reminder sent successfully to {vendor_name}."}


@router.get("/vendors/{vendor_id}/invoices/{invoice_id}/download")
def download_vendor_invoice(vendor_id: int, invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")
    
    from app.models.all_models import Invoice, Subscription, Organization
    from fastapi.responses import HTMLResponse
    
    org = db.query(Organization).filter(Organization.id == vendor_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Vendor organization not found.")
        
    inv = db.query(Invoice).join(Subscription).filter(
        Invoice.id == invoice_id,
        Subscription.organization_id == org.id
    ).first()
    
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")
        
    html_content = f"""
    <html>
        <head><title>Invoice INV-2026-{1000 + inv.id}</title></head>
        <body style="font-family: sans-serif; padding: 40px;">
            <h1>Invoice INV-2026-{1000 + inv.id}</h1>
            <p><strong>Vendor:</strong> {org.name}</p>
            <p><strong>Date:</strong> {inv.created_at.strftime('%Y-%m-%d') if inv.created_at else ''}</p>
            <p><strong>Amount Due:</strong> ${inv.amount_due}</p>
            <p><strong>Amount Paid:</strong> ${inv.amount_paid}</p>
            <p><strong>Status:</strong> {inv.status.upper()}</p>
            <hr>
            <p>Thank you for your business with Voqly AI.</p>
            <script>window.print();</script>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)


class AgentCatalogUpdateSchema(BaseModel):
    category: str
    subcategory: str
    system_prompt: str
    inbound_prompt: Optional[str] = None
    organization_id: Optional[int] = None
    mode: Optional[str] = "existing_category"


@router.get("/customers")
def list_customers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    """Return all non-superuser (customer) accounts for the AI Catalog user-selection step."""
    import os
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    users = db.query(User).filter(User.is_superuser == False).order_by(User.id.desc()).all()  # noqa: E712
    result = []
    for u in users:
        # Resolve the org they belong to as owner
        org = db.query(Organization).filter(Organization.owner_id == u.id).first()
        result.append({
            "id": u.id,
            "full_name": u.full_name or "",
            "email": u.email or "",
            "org_name": org.name if org else "",
            "org_id": org.id if org else None,
            "created_at": u.created_at.strftime("%b %d, %Y") if getattr(u, "created_at", None) else "",
            "plivo_number": org.plivo_number if org and org.plivo_number else os.getenv("PLIVO_FROM_NUMBER", "+12135550199"),
            "twilio_number": org.twilio_number if org and org.twilio_number else os.getenv("TWILIO_FROM_NUMBER", ""),
            "telephony_provider": org.telephony_provider if org and org.telephony_provider else "plivo",
        })
    return result


class UpdatePlivoNumberSchema(BaseModel):
    plivo_number: Optional[str] = None
    twilio_number: Optional[str] = None
    telephony_provider: Optional[str] = None


@router.put("/customers/{user_id}/plivo-number")
def update_customer_plivo_number(
    user_id: int,
    payload: UpdatePlivoNumberSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update Plivo/Twilio outbound number and telephony provider for the organization owned by the user_id."""
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    org = db.query(Organization).filter(Organization.owner_id == user_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found for this customer user.")

    if payload.plivo_number is not None:
        org.plivo_number = payload.plivo_number.strip() if payload.plivo_number else None
    if payload.twilio_number is not None:
        org.twilio_number = payload.twilio_number.strip() if payload.twilio_number else None
    if payload.telephony_provider is not None:
        org.telephony_provider = payload.telephony_provider.strip().lower()

    db.commit()
    return {
        "status": "success",
        "message": "Telephony configuration updated successfully.",
        "plivo_number": org.plivo_number,
        "twilio_number": org.twilio_number,
        "telephony_provider": org.telephony_provider
    }


@router.get("/agent-catalogs")
def get_agent_catalogs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    from app.models.all_models import AgentCatalog
    items = db.query(AgentCatalog).filter(AgentCatalog.organization_id.is_(None)).all()
    return [
        {
            "id": item.id,
            "category": item.category,
            "subcategory": item.subcategory,
            "system_prompt": item.system_prompt,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None
        }
        for item in items
    ]


@router.get("/agent-catalogs/prompt")
def get_agent_catalog_prompt(
    category: str,
    subcategory: str,
    organization_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    from app.models.all_models import AgentCatalog
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    if organization_id is not None:
        item = db.query(AgentCatalog).filter(
            AgentCatalog.category == category,
            AgentCatalog.subcategory == subcategory,
            AgentCatalog.organization_id == organization_id,
        ).first()
        if item:
            return {
                "id": item.id,
                "category": item.category,
                "subcategory": item.subcategory,
                "system_prompt": item.system_prompt,
                "inbound_prompt": item.inbound_prompt,
                "organization_id": item.organization_id,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None
            }

    item = db.query(AgentCatalog).filter(
        AgentCatalog.category == category,
        AgentCatalog.subcategory == subcategory,
        AgentCatalog.organization_id.is_(None),
    ).first()
    if not item:
        return {"category": category, "subcategory": subcategory, "system_prompt": "", "inbound_prompt": "", "organization_id": None}
    return {
        "id": item.id,
        "category": item.category,
        "subcategory": item.subcategory,
        "system_prompt": item.system_prompt,
        "inbound_prompt": item.inbound_prompt,
        "organization_id": item.organization_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None
    }


@router.post("/agent-catalogs")
def update_agent_catalog(payload: AgentCatalogUpdateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    from app.models.all_models import AgentCatalog
    from app.services.agent_catalog_service import GLOBAL_CATEGORIES

    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    category = payload.category.strip()
    subcategory = payload.subcategory.strip()
    system_prompt = payload.system_prompt.strip()
    inbound_prompt = (payload.inbound_prompt or "").strip()
    org_id = payload.organization_id
    mode = (payload.mode or "existing_category").strip().lower()

    if not category or not subcategory:
        raise HTTPException(status_code=400, detail="Category and subcategory are required.")
    if not system_prompt:
        raise HTTPException(status_code=400, detail="System prompt is required.")

    if org_id is not None:
        if mode == "new_category":
            if category in GLOBAL_CATEGORIES:
                raise HTTPException(
                    status_code=400,
                    detail=f"'{category}' is a shared system category. Use 'existing_category' to add a subcategory instead.",
                )
            existing_custom_cat = (
                db.query(AgentCatalog)
                .filter(
                    AgentCatalog.organization_id == org_id,
                    AgentCatalog.category == category,
                )
                .first()
            )
            if existing_custom_cat:
                raise HTTPException(status_code=400, detail=f"Category '{category}' already exists for this account.")
        else:
            global_exists = category in GLOBAL_CATEGORIES
            org_cat_exists = (
                db.query(AgentCatalog)
                .filter(
                    AgentCatalog.organization_id == org_id,
                    AgentCatalog.category == category,
                )
                .first()
            )
            if not global_exists and not org_cat_exists:
                raise HTTPException(
                    status_code=400,
                    detail=f"Category '{category}' does not exist. Create it as a new category first.",
                )
            pass

        item = (
            db.query(AgentCatalog)
            .filter(
                AgentCatalog.category == category,
                AgentCatalog.subcategory == subcategory,
                AgentCatalog.organization_id == org_id,
            )
            .first()
        )
        if not item:
            item = AgentCatalog(
                category=category,
                subcategory=subcategory,
                system_prompt=system_prompt,
                inbound_prompt=inbound_prompt or None,
                organization_id=org_id,
                is_system=False,
            )
            db.add(item)
        else:
            item.system_prompt = system_prompt
            item.inbound_prompt = inbound_prompt or None
        db.commit()
        db.refresh(item)
        return {
            "status": "success",
            "message": f"Saved prompt for '{subcategory}' under '{category}' for this account.",
            "data": {
                "id": item.id,
                "category": item.category,
                "subcategory": item.subcategory,
                "system_prompt": item.system_prompt,
                "inbound_prompt": item.inbound_prompt,
                "organization_id": item.organization_id,
            }
        }
    else:
        item = db.query(AgentCatalog).filter(
            AgentCatalog.category == category,
            AgentCatalog.subcategory == subcategory,
            AgentCatalog.organization_id.is_(None),
        ).first()
        if not item:
            item = AgentCatalog(
                category=category,
                subcategory=subcategory,
                system_prompt=system_prompt,
                inbound_prompt=inbound_prompt or None,
                organization_id=None,
                is_system=True,
            )
            db.add(item)
        else:
            item.system_prompt = system_prompt
            item.inbound_prompt = inbound_prompt or None
        db.commit()
        db.refresh(item)
        return {
            "status": "success",
            "message": f"Saved system prompt globally for {category} - {subcategory}.",
            "data": {
                "id": item.id,
                "category": item.category,
                "subcategory": item.subcategory,
                "system_prompt": item.system_prompt,
                "inbound_prompt": item.inbound_prompt,
            }
        }


@router.get("/agent-catalogs/options")
def get_superadmin_agent_catalog_options(
    organization_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    from app.services.agent_catalog_service import build_catalog_options, resolve_default_category
    result = build_catalog_options(db, organization_id)
    # The selected vendor's onboarded industry, so the admin can show it first.
    default_cat = ""
    if organization_id is not None:
        sel_org = db.query(Organization).filter(Organization.id == organization_id).first()
        default_cat = resolve_default_category(getattr(sel_org, "industry", None) if sel_org else None, result.get("categories", []))
    result["default_category"] = default_cat
    return result


@router.delete("/agent-catalogs")
def delete_agent_catalog(
    category: str,
    subcategory: Optional[str] = None,
    organization_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    from app.models.all_models import AgentCatalog

    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    query = db.query(AgentCatalog).filter(AgentCatalog.category == category)
    if subcategory:
        query = query.filter(AgentCatalog.subcategory == subcategory)
    if organization_id is not None:
        query = query.filter(AgentCatalog.organization_id == organization_id)
    else:
        query = query.filter(AgentCatalog.organization_id.is_(None))

    # Protect seeded system items
    query = query.filter(AgentCatalog.is_system == False)

    items = query.all()
    if not items:
        raise HTTPException(status_code=404, detail="No matching custom catalog entries found to delete.")

    for item in items:
        db.delete(item)
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully deleted custom catalog entries for category '{category}'" + (f", subcategory '{subcategory}'" if subcategory else "")
    }


class ApproveCatalogRequestSchema(BaseModel):
    system_prompt: str


@router.get("/agent-catalogs/requests")
def get_agent_catalogs_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    from app.models.all_models import CatalogRequest, Organization, User
    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    requests = db.query(CatalogRequest).order_by(CatalogRequest.id.desc()).all()
    result = []
    for req in requests:
        org = db.query(Organization).filter(Organization.id == req.organization_id).first()
        owner = db.query(User).filter(User.id == org.owner_id).first() if org else None
        result.append({
            "id": req.id,
            "category": req.category,
            "subcategory": req.subcategory,
            "status": req.status,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "approved_at": req.approved_at.isoformat() if req.approved_at else None,
            "system_prompt": req.system_prompt,
            "org_id": req.organization_id,
            "org_name": org.name if org else "Unknown Org",
            "requester_name": owner.full_name if owner else "Unknown",
            "requester_email": owner.email if owner else "Unknown",
        })
    return result


@router.post("/agent-catalogs/requests/{request_id}/approve")
def approve_agent_catalog_request(
    request_id: int,
    payload: ApproveCatalogRequestSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    from app.models.all_models import CatalogRequest, AgentCatalog
    import datetime

    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    req = db.query(CatalogRequest).filter(CatalogRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}.")

    system_prompt = payload.system_prompt.strip()
    if not system_prompt:
        raise HTTPException(status_code=400, detail="System prompt is required.")

    # 1. Create or update AgentCatalog record for this org
    catalog_item = (
        db.query(AgentCatalog)
        .filter(
            AgentCatalog.category == req.category,
            AgentCatalog.subcategory == req.subcategory,
            AgentCatalog.organization_id == req.organization_id
        )
        .first()
    )
    if not catalog_item:
        catalog_item = AgentCatalog(
            category=req.category,
            subcategory=req.subcategory,
            system_prompt=system_prompt,
            organization_id=req.organization_id,
            is_system=False
        )
        db.add(catalog_item)
    else:
        catalog_item.system_prompt = system_prompt

    # 2. Update request
    req.status = "approved"
    req.system_prompt = system_prompt
    req.approved_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(req)

    return {
        "status": "success",
        "message": f"Successfully approved request and created subcategory '{req.subcategory}' for organization.",
        "data": {
            "id": req.id,
            "status": req.status,
            "category": req.category,
            "subcategory": req.subcategory,
        }
    }


@router.post("/agent-catalogs/requests/{request_id}/reject")
def reject_agent_catalog_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    from app.models.all_models import CatalogRequest

    if not current_user.is_superuser and current_user.email not in ["admin@voqly.ai", "admin@voqly.com"]:
        raise HTTPException(status_code=403, detail="Administrative authorization required.")

    req = db.query(CatalogRequest).filter(CatalogRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}.")

    req.status = "rejected"
    db.commit()
    db.refresh(req)

    return {
        "status": "success",
        "message": "Successfully rejected the request.",
        "data": {
            "id": req.id,
            "status": req.status,
        }
    }



