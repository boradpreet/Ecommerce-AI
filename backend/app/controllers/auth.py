from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
import logging

logger = logging.getLogger(__name__)

# ── Bcrypt 4.x compatibility patch ──────────────────────────────────────────
# passlib 1.7.4 references bcrypt.__about__.__version__ and internal helpers
# that were removed in bcrypt 4.0. Patch them back so passlib doesn't crash.
import bcrypt as _bcrypt_module
if not hasattr(_bcrypt_module, '__about__'):
    class _FakeAbout:
        __version__ = getattr(_bcrypt_module, '__version__', '4.0.0')
    _bcrypt_module.__about__ = _FakeAbout()

# Patch hashpw to avoid ValueError: password cannot be longer than 72 bytes
# introduced in bcrypt 5.0.0 when passlib does its check.
_original_hashpw = _bcrypt_module.hashpw
def _patched_hashpw(password, salt):
    if isinstance(password, str):
        password_bytes = password.encode('utf-8')
    else:
        password_bytes = password
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    return _original_hashpw(password_bytes, salt)
_bcrypt_module.hashpw = _patched_hashpw

if not hasattr(_bcrypt_module, '_bcrypt_hashpw'):
    _bcrypt_module._bcrypt_hashpw = _bcrypt_module.hashpw
# ────────────────────────────────────────────────────────────────────────────

from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models.all_models import User, Organization, OrganizationUser
from app.schemas.user_schema import UserCreate

# Configuration
SECRET_KEY = "VOQLY_SUPER_SECRET_KEY_JWT_AUTHENTICATION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days expiration

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# -- Firebase ID-token verification (ported so the frontend /firebase-login works) --
import time as _time
import urllib.request as _urlreq
import ssl as _ssl
import json as _json

try:
    import certifi as _certifi
    _FIREBASE_CA = _certifi.where()
except Exception:
    _FIREBASE_CA = None

_FIREBASE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)
_firebase_certs_cache = {"keys": {}, "exp": 0.0}


def _fetch_firebase_certs() -> dict:
    now = _time.time()
    if _firebase_certs_cache["exp"] > now and _firebase_certs_cache["keys"]:
        return _firebase_certs_cache["keys"]
    ctx = _ssl.create_default_context(cafile=_FIREBASE_CA) if _FIREBASE_CA else _ssl.create_default_context()
    with _urlreq.urlopen(_FIREBASE_CERTS_URL, timeout=8, context=ctx) as resp:
        data = _json.loads(resp.read().decode("utf-8"))
    _firebase_certs_cache["keys"] = data
    _firebase_certs_cache["exp"] = now + 3600  # Google rotates these ~daily; 1h cache is safe.
    return data


def verify_firebase_id_token(id_token: str, project_id: str) -> dict:
    """Verify a Firebase ID token (RS256, signed by Google) and return its claims.
    Uses PyJWT directly (not python-jose) because python-jose requires a key object
    whereas PyJWT accepts the raw PEM string for RS256 verification.
    Raises on any failure (bad signature, wrong audience/issuer, expired)."""
    import jwt as _pyjwt  # PyJWT — installed as a transitive dep of firebase-admin / python-jose[cryptography]
    from cryptography.x509 import load_pem_x509_certificate
    from cryptography.hazmat.primitives import serialization

    # python-jose and PyJWT share the same get_unverified_header API
    try:
        header = _pyjwt.get_unverified_header(id_token)
    except Exception:
        header = jwt.get_unverified_header(id_token)  # fallback to jose

    kid = header.get("kid")
    if not kid:
        raise ValueError("Token missing key id (kid).")

    certs = _fetch_firebase_certs()
    cert_pem = certs.get(kid)
    if not cert_pem:
        _firebase_certs_cache["exp"] = 0.0
        cert_pem = _fetch_firebase_certs().get(kid)
    if not cert_pem:
        raise ValueError(f"Token signed with an unknown key (kid={kid!r}). Available kids: {list(certs.keys())}")

    public_key = load_pem_x509_certificate(cert_pem.encode("utf-8")).public_key()
    public_pem = public_key.public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    logger.info("[firebase] Verifying token for project_id=%r kid=%r", project_id, kid)

    return _pyjwt.decode(
        id_token,
        public_pem,
        algorithms=["RS256"],
        audience=project_id,
        issuer=f"https://securetoken.google.com/{project_id}",
    )


# Business Logic Controller operations
class AuthController:
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def create_user(db: Session, user_in: UserCreate) -> User:
        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            is_active=True,
            is_superuser=False
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        user = AuthController.get_user_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
