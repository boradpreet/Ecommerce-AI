from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.controllers.auth import SECRET_KEY, ALGORITHM
from app.models.all_models import User
from app.schemas.user_schema import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = None
    log_msg = f"--- AUTH ATTEMPT ---\nToken: {token[:30]}... (len={len(token) if token else 0})\n"

    try:
        # ── Branch 1: Email-embedded offline tokens ──────────────────────────────
        if token and token.startswith("mock_token_for_"):
            email_from_token = token[len("mock_token_for_"):].strip().lower()
            log_msg += f"Branch 1: email={email_from_token}\n"
            if email_from_token:
                user = db.query(User).filter(User.email == email_from_token).first()
                if not user:
                    is_super = email_from_token == "admin@voqly.com"
                    user = User(
                        email=email_from_token,
                        hashed_password="mock_secure_offline",
                        full_name="Super Admin" if is_super else email_from_token.split("@")[0].capitalize(),
                        is_superuser=is_super
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                    log_msg += f"Created mock offline user id={user.id}\n"

        # ── Branch 2: Real JWT tokens ────────────────────────────────────────────
        elif token and len(token) > 20 and "." in token:
            log_msg += f"Branch 2: decoding JWT...\n"
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                sub = payload.get("sub")
                log_msg += f"Decoded payload: {payload}, sub={sub}\n"

                if sub is not None:
                    # Sub as integer user ID (primary format from current auth system)
                    try:
                        user_id = int(sub)
                        user = db.query(User).filter(User.id == user_id).first()
                        log_msg += f"Lookup by user_id={user_id}: found={user is not None}\n"
                    except (ValueError, TypeError) as e:
                        log_msg += f"Integer conversion of sub failed: {e}\n"

                    # Sub as email string (fallback — legacy tokens)
                    if not user and isinstance(sub, str) and "@" in sub:
                        user = db.query(User).filter(User.email == sub.lower()).first()
                        log_msg += f"Lookup by email={sub.lower()}: found={user is not None}\n"

            except JWTError as e:
                log_msg += f"JWTError: {str(e)}\n"
                with open("auth_debug.log", "a") as f:
                    f.write(log_msg + f"Result: JWTError\n\n")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Could not validate credentials: JWTError: {str(e)}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # ── Branch 3: Stale / unrecognised tokens ────────────────────────────────
        else:
            log_msg += f"Branch 3: unrecognized token format\n"
            with open("auth_debug.log", "a") as f:
                f.write(log_msg + f"Result: Format unrecognized\n\n")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Could not validate credentials: token format unrecognized or missing. prefix={str(token)[:15]}... len={len(token) if token else 0}",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user:
            log_msg += f"Result: User not found in database\n"
            with open("auth_debug.log", "a") as f:
                f.write(log_msg + "\n")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Could not validate credentials: user not found in database for sub={sub if 'sub' in locals() else 'None'}",
                headers={"WWW-Authenticate": "Bearer"},
            )

        log_msg += f"Result: SUCCESS user_id={user.id} email={user.email}\n"
        with open("auth_debug.log", "a") as f:
            f.write(log_msg + "\n")

    except Exception as outer_err:
        if not isinstance(outer_err, HTTPException):
            log_msg += f"Outer exception: {outer_err}\n"
            with open("auth_debug.log", "a") as f:
                f.write(log_msg + "\n")
        raise outer_err

    # ── Runtime superuser enforcement ────────────────────────────────────────
    # Always derive is_superuser from email at runtime — never trust the DB value.
    if user.email and user.email.lower() == "admin@voqly.com":
        user.is_superuser = True
    else:
        user.is_superuser = False

    return user


def get_current_superuser(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser or current_user.email.lower() != "admin@voqly.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative authorization required. Please log in as admin@voqly.com."
        )
    return current_user
