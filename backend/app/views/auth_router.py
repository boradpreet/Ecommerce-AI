from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user_schema import (
    UserCreate, UserResponse, Token, OtpRequest, OtpVerify,
    UserProfileUpdateSchema, SecondaryEmailAddSchema, GoogleConnectSchema,
    PasswordChangeSchema, PasswordResetSchema, MfaToggleSchema, FirebaseLoginSchema
)
from app.controllers.auth import AuthController, create_access_token, verify_firebase_id_token
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Any
import random
import os
import secrets
import logging

logger = logging.getLogger(__name__)
from app.views.deps import get_current_user, get_current_superuser
from app.models.all_models import User

router = APIRouter(prefix="/auth", tags=["auth"])

# Global in-memory storage for active verification codes
otp_store = {}

@router.get("/db-status")
def db_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)) -> Any:
    """Diagnostic endpoint (super-admin only) — shows DB record counts. Locked down: it exposes
    every user's email and superadmin flag, so it must never be public."""
    from app.models.all_models import Organization, User, OrganizationUser, Agent, Team
    orgs = db.query(Organization).all()
    users = db.query(User).all()
    agents = db.query(Agent).count()
    teams = db.query(Team).count()
    return {
        "status": "connected",
        "organizations_count": len(orgs),
        "organizations": [{"id": o.id, "name": o.name, "slug": o.slug, "owner_id": o.owner_id} for o in orgs],
        "users_count": len(users),
        "users": [{"id": u.id, "email": u.email, "is_superuser": u.is_superuser, "has_orgs": len(u.orgs) > 0} for u in users],
        "agents_count": agents,
        "teams_count": teams,
    }

@router.post("/fix-roles")
def fix_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)) -> Any:
    """One-shot fix (super-admin only): reset is_superuser=False for all users except admin@voqly.com."""
    from app.models.all_models import User
    vendors = db.query(User).filter(User.email != "admin@voqly.com", User.is_superuser == True).all()
    count = len(vendors)
    for v in vendors:
        v.is_superuser = False
    if count > 0:
        db.commit()
    # Ensure admin has correct flag
    admin = db.query(User).filter(User.email == "admin@voqly.com").first()
    if admin:
        admin.is_superuser = True
        db.commit()
    return {"fixed": count, "message": f"Reset is_superuser=False for {count} vendor accounts. Admin verified."}


@router.post("/request-otp")
def request_otp(payload: OtpRequest) -> Any:
    # Generate 6-digit random code
    code = str(random.randint(100000, 999999))
    otp_store[payload.email] = code
    
    # Print to console log
    print(f"\n[OTP-SERVICE] Verification code for {payload.email} is: {code}\n")
    
    return {
        "status": "success",
        "message": f"Verification code sent to {payload.email}.",
        "otp_code": code  # Expose in response for easy frontend simulation
    }

@router.post("/verify-otp", response_model=Token)
def verify_otp(payload: OtpVerify, db: Session = Depends(get_db)) -> Any:
    email = payload.email
    otp_code = payload.otp_code
    
    # Verification checks (with "123456" as master bypass)
    stored_code = otp_store.get(email)
    if otp_code != "123456" and otp_code != stored_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect verification code. Please check your email or try again."
        )
        
    # Check if user already exists
    user = AuthController.get_user_by_email(db, email)
    if not user:
        # Create a new user record
        user_in = UserCreate(
            email=email,
            password=f"otp_secure_{random.randint(100000, 999999)}",
            full_name=f"{payload.first_name} {payload.last_name}".strip() if f"{payload.first_name} {payload.last_name}".strip() else "Super Admin" if email.lower() == "admin@voqly.com" else "Enterprise User"
        )
        user = AuthController.create_user(db, user_in)

    if email.lower() == "admin@voqly.com":
        user.is_superuser = True
        if not user.full_name or user.full_name == "Enterprise User" or user.full_name == "Super Admin":
            user.full_name = "Super Admin"
        db.commit()
        db.refresh(user)
    else:
        user.is_superuser = False
        # Update name if the user provided one (allows re-login with updated name)
        provided_name = f"{payload.first_name} {payload.last_name}".strip()
        if provided_name and provided_name != user.full_name:
            user.full_name = provided_name
        db.commit()
        db.refresh(user)
        
    # Create audit log record of the successful OTP login in database
    from app.models.all_models import AuditLog
    db_log = AuditLog(
        user_id=user.id,
        action="USER_LOGIN_OTP",
        resource_type="USER",
        resource_id=user.id,
        payload={"email": email, "auth_method": "OTP"}
    )
    db.add(db_log)
    db.commit()

    # Clean up OTP store
    if email in otp_store:
        del otp_store[email]
        
    # Create bearer JWT token
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/reset-password")
def reset_password(payload: PasswordResetSchema, db: Session = Depends(get_db)) -> Any:
    """Forgot-password reset: verify the emailed OTP, then set a new password.
    Reuses the same OTP store as login (send the code via /auth/request-otp).
    '123456' works as the master bypass code in dev, matching verify-otp."""
    from app.controllers.auth import pwd_context

    email = payload.email
    stored_code = otp_store.get(email)
    if payload.otp_code != "123456" and payload.otp_code != stored_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect verification code. Please check your email or request a new code.",
        )

    user = AuthController.get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for that email address.",
        )

    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters.",
        )

    user.hashed_password = pwd_context.hash(payload.new_password)
    db.commit()

    # Consume the OTP so it can't be reused
    if email in otp_store:
        del otp_store[email]

    return {"status": "success", "message": "Password reset successfully. You can now sign in with your new password."}


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    # Check if user already exists
    existing_user = AuthController.get_user_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    # Create new user
    user = AuthController.create_user(db, user_in)
    
    # Auto-generate access token
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Any:
    email = form_data.username.strip().lower()
    password = form_data.password

    # ── Try standard password authentication first ────────────────────────────
    user = AuthController.authenticate_user(db, email, password)

    # ── Fallback: OTP-onboarded vendors have non-bcrypt hashed_password ───────
    # Users created via /auth/verify-otp get a random `otp_secure_XXXXXX` password
    # that cannot be verified via bcrypt.  Allow them to log in if:
    #   a) their email exists in the DB, AND
    #   b) their stored password is clearly an OTP/mock placeholder
    if not user:
        candidate = db.query(User).filter(User.email == email).first()
        if candidate:
            pw = candidate.hashed_password or ""
            is_mock_pw = (
                pw.startswith("otp_secure_")
                or pw == "mock_secure_offline"
                or pw.startswith("mock_")
            )
            # Accept any non-empty password for OTP users (Firebase handles real auth)
            # OR accept the universal dev password "voqly123"
            if is_mock_pw and (password or password == "voqly123"):
                user = candidate

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Audit log ─────────────────────────────────────────────────────────────
    from app.models.all_models import AuditLog
    db_log = AuditLog(
        user_id=user.id,
        action="USER_LOGIN_PASSWORD",
        resource_type="USER",
        resource_id=user.id,
        payload={"email": email, "auth_method": "PASSWORD"}
    )
    db.add(db_log)
    db.commit()

    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/firebase-login", response_model=Token)
def firebase_login(payload: FirebaseLoginSchema, db: Session = Depends(get_db)) -> Any:
    """Exchange a verified Firebase ID token for a Voqly session JWT.

    The frontend signs in with Firebase, then sends the signed ID token here. We
    verify it against Google's public keys (so the email can be trusted) and then
    find/provision the user and issue our own backend token.
    """
    project_id = (
        os.getenv("FIREBASE_PROJECT_ID")
        or os.getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
        or "voqly-ai"
    )

    try:
        claims = verify_firebase_id_token(payload.id_token, project_id)
    except Exception as exc:
        logger.error("[firebase-login] Token verification failed (project_id=%r): %s", project_id, exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired sign-in session. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = (claims.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign-in token did not include an email.")

    user = AuthController.get_user_by_email(db, email)
    if not user:
        display_name = (claims.get("name") or payload.full_name or email.split("@")[0]).strip()
        user_in = UserCreate(
            email=email,
            password=f"firebase_{secrets.token_urlsafe(24)}",
            full_name=display_name or "Enterprise User",
        )
        user = AuthController.create_user(db, user_in)
    else:
        provided = (payload.full_name or claims.get("name") or "").strip()
        if provided and provided != user.full_name and email != "admin@voqly.com":
            user.full_name = provided
            db.commit()
            db.refresh(user)

    if email == "admin@voqly.com" and not user.is_superuser:
        user.is_superuser = True
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> Any:
    import json
    if isinstance(current_user.secondary_emails, str):
        try:
            current_user.secondary_emails = json.loads(current_user.secondary_emails)
        except Exception:
            current_user.secondary_emails = []
    return current_user

@router.put("/me/profile", response_model=UserResponse)
def update_me_profile(payload: UserProfileUpdateSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    current_user.full_name = payload.full_name
    db.commit()
    db.refresh(current_user)
    
    import json
    if isinstance(current_user.secondary_emails, str):
        try:
            current_user.secondary_emails = json.loads(current_user.secondary_emails)
        except Exception:
            current_user.secondary_emails = []
            
    return current_user

@router.post("/me/secondary-emails", response_model=UserResponse)
def add_secondary_email(payload: SecondaryEmailAddSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    primary = current_user.email
    if payload.email.lower() == primary.lower():
        raise HTTPException(status_code=400, detail="Cannot add primary email as secondary email.")
        
    import json
    emails = []
    if current_user.secondary_emails:
        if isinstance(current_user.secondary_emails, str):
            try:
                emails = json.loads(current_user.secondary_emails)
            except Exception:
                emails = []
        elif isinstance(current_user.secondary_emails, list):
            emails = current_user.secondary_emails
            
    if payload.email.lower() in [e.lower() for e in emails]:
        raise HTTPException(status_code=400, detail="Email is already added as secondary email.")
        
    emails.append(payload.email)
    current_user.secondary_emails = emails
    db.commit()
    db.refresh(current_user)
    
    current_user.secondary_emails = emails
    return current_user

@router.delete("/me/secondary-emails/{email}", response_model=UserResponse)
def remove_secondary_email(email: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    import json
    emails = []
    if current_user.secondary_emails:
        if isinstance(current_user.secondary_emails, str):
            try:
                emails = json.loads(current_user.secondary_emails)
            except Exception:
                emails = []
        elif isinstance(current_user.secondary_emails, list):
            emails = current_user.secondary_emails
            
    normalized = [e.lower() for e in emails]
    if email.lower() not in normalized:
        raise HTTPException(status_code=404, detail="Email not found in secondary emails.")
        
    idx = normalized.index(email.lower())
    emails.pop(idx)
    current_user.secondary_emails = emails
    db.commit()
    db.refresh(current_user)
    
    current_user.secondary_emails = emails
    return current_user

@router.post("/me/google-connect", response_model=UserResponse)
def connect_google(payload: GoogleConnectSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    current_user.google_email = payload.email
    db.commit()
    db.refresh(current_user)
    
    import json
    if isinstance(current_user.secondary_emails, str):
        try:
            current_user.secondary_emails = json.loads(current_user.secondary_emails)
        except Exception:
            current_user.secondary_emails = []
            
    return current_user

@router.post("/me/google-disconnect", response_model=UserResponse)
def disconnect_google(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    current_user.google_email = None
    db.commit()
    db.refresh(current_user)
    
    import json
    if isinstance(current_user.secondary_emails, str):
        try:
            current_user.secondary_emails = json.loads(current_user.secondary_emails)
        except Exception:
            current_user.secondary_emails = []
            
    return current_user

@router.put("/me/security/password")
def change_password(payload: PasswordChangeSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    from app.controllers.auth import pwd_context
    if not pwd_context.verify(payload.current_password, current_user.hashed_password):
        if payload.current_password != current_user.hashed_password:
            raise HTTPException(status_code=400, detail="Incorrect current password.")
            
    current_user.hashed_password = pwd_context.hash(payload.new_password)
    db.commit()
    return {
        "status": "success",
        "message": "Password updated successfully."
    }

@router.put("/me/security/mfa", response_model=UserResponse)
def toggle_mfa(payload: MfaToggleSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    current_user.mfa_enabled = payload.enabled
    db.commit()
    db.refresh(current_user)
    
    import json
    if isinstance(current_user.secondary_emails, str):
        try:
            current_user.secondary_emails = json.loads(current_user.secondary_emails)
        except Exception:
            current_user.secondary_emails = []
            
    return current_user


@router.post("/reset-db")
def reset_database(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)) -> Any:
    """Wipes all users, organizations, and associated records from the database to start fresh.
    SUPER-ADMIN ONLY (this is destructive — it must never be callable anonymously).
    Always preserves or seeds the default super admin: admin@voqly.com / admin123.
    """
    from app.models.all_models import (
        User, Organization, OrganizationUser, Team, Agent, Campaign, Lead,
        Call, Transcript, KnowledgeBase, Document, Subscription, Invoice, AuditLog, PhoneNumber
    )
    from app.controllers.auth import get_password_hash

    try:
        # Delete all secondary records first due to foreign keys
        db.query(AuditLog).delete()
        db.query(Transcript).delete()
        db.query(Call).delete()
        db.query(Lead).delete()
        db.query(Campaign).delete()
        db.query(Agent).delete()
        db.query(Team).delete()
        db.query(Document).delete()
        db.query(KnowledgeBase).delete()
        db.query(Invoice).delete()
        db.query(Subscription).delete()
        db.query(OrganizationUser).delete()
        db.query(PhoneNumber).delete()
        db.query(Organization).delete()
        
        # Delete all users EXCEPT the admin@voqly.com
        db.query(User).filter(User.email != "admin@voqly.com").delete()
        
        # Seed or refresh super admin user
        admin = db.query(User).filter(User.email == "admin@voqly.com").first()
        if not admin:
            admin = User(
                email="admin@voqly.com",
                hashed_password=get_password_hash("admin123"),
                full_name="Super Admin",
                is_active=True,
                is_superuser=True
            )
            db.add(admin)
        else:
            admin.hashed_password = get_password_hash("admin123")
            admin.is_superuser = True
            admin.is_active = True
            admin.full_name = "Super Admin"

        db.commit()
        return {
            "status": "success",
            "message": "Database successfully reset to a clean slate. Super Admin account initialized: admin@voqly.com / admin123"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset database: {str(e)}"
        )
