from pydantic import BaseModel
from typing import Optional, List
import datetime

class TeamBase(BaseModel):
    name: str

class TeamCreate(TeamBase):
    pass

class TeamResponse(TeamBase):
    id: int
    organization_id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class OrganizationBase(BaseModel):
    name: str
    slug: str
    website_url: Optional[str] = None
    industry: Optional[str] = None
    tax_id: Optional[str] = None
    business_type: Optional[str] = None
    company_size: Optional[str] = None
    street_address: Optional[str] = None
    country: Optional[str] = None
    state_province: Optional[str] = None
    compliance_hipaa: Optional[bool] = False
    
    # Timezone & data retention log settings
    timezone: Optional[str] = "Coordinated Universal Time (UTC)"
    log_retention_days: Optional[int] = 90
    logo_url: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationResponse(OrganizationBase):
    id: int
    owner_id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class TeamMemberCreate(BaseModel):
    email: str
    role: str

class TeamMemberResponse(BaseModel):
    id: int
    email: str
    role: str
    status: str

    class Config:
        from_attributes = True

class OnboardingCompleteSchema(BaseModel):
    user_email: str
    business_name: str
    website_url: Optional[str] = ""
    industry: Optional[str] = ""
    tax_id: Optional[str] = ""
    business_type: Optional[str] = ""
    company_size: Optional[str] = ""
    street_address: Optional[str] = ""
    country: Optional[str] = ""
    state_province: Optional[str] = ""
    
    agent_name: str
    selected_voice: str
    voice_speaking_rate: float
    voice_pitch_variance: float
    voice_output_volume: float
    voice_test_script: str
    
    agent_system_prompt: str
    selected_industry: str
    compliance_hipaa: bool
    
    selected_workflows: List[str]
    team_members: List[TeamMemberCreate]
    
    selected_plan: str
    billing_cycle: str
    voice_minutes: int
    
    kb_files: List[str]
    kb_urls: List[str]
    kb_faqs: Optional[str] = ""
    
    campaign_name: str
    call_direction: Optional[str] = "OUTBOUND"
    logo_url: Optional[str] = None

class OrganizationSettingsUpdate(BaseModel):
    name: str
    timezone: str
    log_retention_days: int
    logo_url: Optional[str] = None
    # Auto follow-up config (company details sent to caller on interest / request)
    company_details: Optional[str] = None
    auto_send_details: Optional[bool] = None
    auto_send_threshold: Optional[int] = None

class PhoneProvisionSchema(BaseModel):
    phone_number: str
    label: str
    country: Optional[str] = "USA"
    type: Optional[str] = "LOCAL" # LOCAL or TOLL-FREE
    assigned_agent: Optional[str] = "Unassigned"
    monthly_cost: Optional[float] = 2.00
    direction: Optional[str] = "OUTBOUND"
    destination_region: Optional[str] = "USA"
    termination_uri: Optional[str] = ""
    cps_limit: Optional[int] = 2
    sip_username: Optional[str] = ""
    sip_password: Optional[str] = ""
    nickname: Optional[str] = ""

class GeneralSettingsUpdate(BaseModel):
    concurrency_limit: int
    webhook_url: Optional[str] = None
    recording_enabled: bool
    voicemail_detection: bool

class NotificationSettingsUpdate(BaseModel):
    notifications_slack: bool
    notifications_email: bool
    notifications_low_balance: bool
    notifications_weekly_report: bool

class TeamInviteSchema(BaseModel):
    email: str
    role: str

class BillingRechargeSchema(BaseModel):
    amount: float
