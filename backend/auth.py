import os
import re
import hmac
import json
import time
import base64
import hashlib
import secrets
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session

from .database import DATA_DIR, get_db
from . import models

try:
    import bcrypt
    HAS_BCRYPT = True
except ImportError:
    bcrypt = None
    HAS_BCRYPT = False

ACCESS_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24 * 7  # 7 days
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _load_or_create_jwt_secret() -> str:
    env_secret = os.environ.get("MYDOC_JWT_SECRET", "").strip()
    if env_secret:
        return env_secret

    secret_file = os.path.join(DATA_DIR, ".jwt_secret")
    if os.path.isfile(secret_file):
        try:
            with open(secret_file, "r", encoding="utf-8") as f:
                saved = f.read().strip()
                if len(saved) >= 32:
                    return saved
        except Exception:
            pass

    new_secret = secrets.token_urlsafe(48)
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(secret_file, "w", encoding="utf-8") as f:
            f.write(new_secret)
        try:
            os.chmod(secret_file, 0o600)
        except Exception:
            pass
    except Exception:
        pass
    return new_secret


JWT_SECRET = _load_or_create_jwt_secret()


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def validate_email(email: str) -> bool:
    return bool(EMAIL_REGEX.match(normalize_email(email)))


def hash_password(password: str) -> str:
    if HAS_BCRYPT and bcrypt is not None:
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
    # Fallback: PBKDF2-HMAC-SHA256
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return f"pbkdf2_sha256${salt}${dk.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    if not password or not password_hash:
        return False
    if password_hash.startswith("pbkdf2_sha256$"):
        try:
            _, salt, expected_hex = password_hash.split("$", 2)
            dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000)
            return hmac.compare_digest(dk.hex(), expected_hex)
        except Exception:
            return False
    if HAS_BCRYPT and bcrypt is not None:
        try:
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        except Exception:
            return False
    return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def create_access_token(user_id: int, email: str, expires_in: int = ACCESS_TOKEN_EXPIRE_SECONDS) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + expires_in,
    }
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def _resolve_user_from_token(token: Optional[str], db: Session) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Требуется авторизация",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id, models.User.is_active == True).first()
    if not user:
        raise credentials_exception
    return user


def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    token = _extract_bearer_token(authorization)
    return _resolve_user_from_token(token, db)


def get_current_user_or_query(
    authorization: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    """Allows auth via Bearer header OR ?token=... query param (for PDF/image previews & downloads)."""
    bearer = _extract_bearer_token(authorization)
    return _resolve_user_from_token(bearer or token, db)


def is_user_admin(user: models.User) -> bool:
    if getattr(user, "is_admin", False):
        return True
    admin_email = normalize_email(os.environ.get("MYDOC_ADMIN_EMAIL", ""))
    return bool(admin_email and normalize_email(user.email) == admin_email)


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not is_user_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ только для владельца (администратора)",
        )
    return current_user
