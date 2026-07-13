from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.org_schema import OrganizationCreate, OrganizationResponse, TeamCreate, TeamResponse, TeamMemberCreate, TeamMemberResponse, OnboardingCompleteSchema
from app.controllers.organization import OrganizationController
from app.views.deps import get_current_user
from app.models.all_models import User
from typing import List, Any

router = APIRouter(prefix="/organizations", tags=["organizations"])

@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    org_in: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    existing_org = OrganizationController.get_organization_by_slug(db, org_in.slug)
    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An organization with this slug already exists."
        )
    return OrganizationController.create_organization(db, org_in, current_user.id)

@router.get("/", response_model=List[OrganizationResponse])
def list_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return OrganizationController.get_user_organizations(db, current_user.id)

@router.post("/{org_id}/teams", response_model=TeamResponse)
def create_team(
    org_id: int,
    team_in: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    orgs = OrganizationController.get_user_organizations(db, current_user.id)
    if not any(o.id == org_id for o in orgs):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this organization."
        )
    return OrganizationController.create_team(db, team_in, org_id)

@router.post("/{org_id}/members", response_model=TeamMemberResponse)
def invite_member(
    org_id: int,
    member_in: TeamMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    orgs = OrganizationController.get_user_organizations(db, current_user.id)
    if not any(o.id == org_id for o in orgs):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this organization."
        )
    member = OrganizationController.invite_team_member(db, org_id, member_in)
    return {
        "id": member.id,
        "email": member.email,
        "role": member.role,
        "status": member.status
    }

@router.get("/{org_id}/members", response_model=List[TeamMemberResponse])
def list_members(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    orgs = OrganizationController.get_user_organizations(db, current_user.id)
    if not any(o.id == org_id for o in orgs):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this organization."
        )
    members = OrganizationController.get_team_members(db, org_id)
    result = []
    for m in members:
        # Check if mapped to a registered user
        email = m.email if m.email else (m.user.email if m.user else "unknown@voqly.ai")
        result.append({
            "id": m.id,
            "email": email,
            "role": m.role,
            "status": m.status
        })
    return result

@router.post("/onboarding-complete")
def onboarding_complete(
    payload: OnboardingCompleteSchema,
    db: Session = Depends(get_db)
) -> Any:
    # 1. Fetch current User by email
    user = db.query(User).filter(User.email == payload.user_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    # 2. Create the Organization record
    from app.models.all_models import Organization, Team, OrganizationUser, Agent, KnowledgeBase, Document, Subscription, Invoice, Campaign, AuditLog
    import random
    import datetime
    
    slug = payload.business_name.lower().replace(" ", "-").replace(".", "")
    existing_org = db.query(Organization).filter(Organization.slug == slug).first()
    if existing_org:
        slug = f"{slug}-{random.randint(1000, 9999)}"
        
    db_org = Organization(
        name=payload.business_name,
        slug=slug,
        website_url=payload.website_url,
        industry=payload.industry,
        tax_id=payload.tax_id,
        business_type=payload.business_type,
        company_size=payload.company_size,
        street_address=payload.street_address,
        country=payload.country,
        state_province=payload.state_province,
        compliance_hipaa=payload.compliance_hipaa,
        logo_url=payload.logo_url,
        owner_id=user.id
    )
    db.add(db_org)
    db.commit()
    db.refresh(db_org)

    # 3. Create the Owner Membership
    db_owner_member = OrganizationUser(
        organization_id=db_org.id,
        user_id=user.id,
        role="owner",
        status="active"
    )
    db.add(db_owner_member)

    # 4. Create Invited Team Memberships
    for member in payload.team_members:
        db_member = OrganizationUser(
            organization_id=db_org.id,
            email=member.email,
            role=member.role,
            status="invited"
        )
        db.add(db_member)

    # 5. Create default Team record
    db_team = Team(
        name="Primary Operations Team",
        organization_id=db_org.id
    )
    db.add(db_team)
    db.commit()
    db.refresh(db_team)

    # 6. Create Neural Agent record
    db_agent = Agent(
        name=payload.agent_name,
        voice_provider="elevenlabs",
        voice_id=payload.selected_voice,
        prompt_system=payload.agent_system_prompt,
        temperature=0.7,
        team_id=db_team.id
    )
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)

    # 7. Create Knowledge Base and Document uploads (linked to agent below)
    db_kb = KnowledgeBase(
        name=f"{payload.business_name} Core Index",
        description="Onboarding vectors and context files.",
        organization_id=db_org.id
    )
    db.add(db_kb)
    db.commit()
    db.refresh(db_kb)

    # Documents from file uploads
    docs_created = 0
    for doc_name in payload.kb_files:
        db_doc = Document(
            kb_id=db_kb.id,
            file_name=doc_name,
            content_text=f"Uploaded document {doc_name}."
        )
        db.add(db_doc)
        docs_created += 1

    # Documents from URLs
    for doc_url in payload.kb_urls:
        db_doc = Document(
            kb_id=db_kb.id,
            file_name=doc_url.split("//")[-1].replace("/", "_"),
            file_url=doc_url,
            content_text=f"Indexed web crawling for {doc_url}."
        )
        db.add(db_doc)
        docs_created += 1
        
    # Document for FAQS
    if payload.kb_faqs:
        db_doc = Document(
            kb_id=db_kb.id,
            file_name="faq_questions_answers.txt",
            content_text=payload.kb_faqs
        )
        db.add(db_doc)
        docs_created += 1

    # Link knowledge base to the agent so calls use uploaded documents
    db_agent.kb_id = db_kb.id
    db.commit()

    # 8. Create Subscription & Invoice
    # Only activate a paid plan if payment was actually confirmed (plan != free)
    is_paid_plan = payload.selected_plan not in (None, "free", "")
    renew_end = datetime.datetime.utcnow() + datetime.timedelta(days=30 if not is_paid_plan else 365)

    db_sub = Subscription(
        organization_id=db_org.id,
        plan_tier=payload.selected_plan if is_paid_plan else "free",
        status="active",
        current_period_end=renew_end
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)

    # Invoice rates mapping — only charge for non-free plans
    if not is_paid_plan:
        amount = 0.0
    elif payload.selected_plan == "growth":
        amount = 499.0
    elif payload.selected_plan == "professional":
        amount = 999.0
    else:  # starter
        amount = 99.0

    if payload.billing_cycle == "annual" and is_paid_plan:
        amount = amount * 12 * 0.8  # 20% discount for annual

    # Mark invoice as paid ONLY if plan is paid and payment was done
    invoice_status = "paid" if (is_paid_plan and amount > 0) else "unpaid"
    db_invoice = Invoice(
        subscription_id=db_sub.id,
        amount_due=amount,
        amount_paid=amount if invoice_status == "paid" else 0.0,
        status=invoice_status
    )
    db.add(db_invoice)

    # 9. Create Campaign record
    db_campaign = Campaign(
        name=payload.campaign_name,
        status="active",
        direction="INBOUND" if str(getattr(payload, "call_direction", "") or "").upper() == "INBOUND" else "OUTBOUND",
        agent_id=db_agent.id
    )
    db.add(db_campaign)

    # 10. Audit Log record
    db_log = AuditLog(
        user_id=user.id,
        action="ONBOARDING_WIZARD_COMPLETE",
        resource_type="ORGANIZATION",
        resource_id=db_org.id,
        payload={"plan": payload.selected_plan, "agent_name": payload.agent_name}
    )
    db.add(db_log)

    db.commit()

    return {
        "status": "success",
        "organization_id": db_org.id,
        "organization_name": db_org.name,
        "agent_id": db_agent.id,
        "agent_name": db_agent.name,
        "team_members_count": len(payload.team_members) + 1,
        "knowledge_base_documents_count": docs_created,
        "subscription_tier": payload.selected_plan,
        "campaign_name": payload.campaign_name,
        "invoice_amount": amount
    }
