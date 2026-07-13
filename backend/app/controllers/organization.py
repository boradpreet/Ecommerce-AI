from sqlalchemy.orm import Session
from app.models.all_models import Organization, Team, OrganizationUser
from app.schemas.org_schema import OrganizationCreate, TeamCreate, TeamMemberCreate
from typing import List

class OrganizationController:
    @staticmethod
    def create_organization(db: Session, org_in: OrganizationCreate, owner_id: int) -> Organization:
        # Create Organization with expanded fields
        db_org = Organization(
            name=org_in.name,
            slug=org_in.slug,
            website_url=org_in.website_url,
            industry=org_in.industry,
            tax_id=org_in.tax_id,
            business_type=org_in.business_type,
            company_size=org_in.company_size,
            street_address=org_in.street_address,
            country=org_in.country,
            state_province=org_in.state_province,
            compliance_hipaa=org_in.compliance_hipaa,
            owner_id=owner_id
        )
        db.add(db_org)
        db.commit()
        db.refresh(db_org)

        # Automatically add owner to OrganizationUser mapping
        db_member = OrganizationUser(
            organization_id=db_org.id,
            user_id=owner_id,
            role="owner",
            status="active"
        )
        db.add(db_member)

        # Create a default team
        default_team = Team(
            name="Default Voice Team",
            organization_id=db_org.id
        )
        db.add(default_team)
        
        db.commit()
        db.refresh(db_org)
        return db_org

    @staticmethod
    def get_organization_by_slug(db: Session, slug: str) -> Organization:
        return db.query(Organization).filter(Organization.slug == slug).first()

    @staticmethod
    def get_user_organizations(db: Session, user_id: int) -> List[Organization]:
        memberships = db.query(OrganizationUser).filter(OrganizationUser.user_id == user_id).all()
        org_ids = [m.organization_id for m in memberships]
        return db.query(Organization).filter(Organization.id.in_(org_ids)).all()

    @staticmethod
    def create_team(db: Session, team_in: TeamCreate, org_id: int) -> Team:
        db_team = Team(
            name=team_in.name,
            organization_id=org_id
        )
        db.add(db_team)
        db.commit()
        db.refresh(db_team)
        return db_team

    @staticmethod
    def invite_team_member(db: Session, org_id: int, member_in: TeamMemberCreate) -> OrganizationUser:
        db_member = OrganizationUser(
            organization_id=org_id,
            email=member_in.email,
            role=member_in.role,
            status="invited"
        )
        db.add(db_member)
        db.commit()
        db.refresh(db_member)
        return db_member

    @staticmethod
    def get_team_members(db: Session, org_id: int) -> List[OrganizationUser]:
        return db.query(OrganizationUser).filter(OrganizationUser.organization_id == org_id).all()
