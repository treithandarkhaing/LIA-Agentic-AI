from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models.auth import AuthSession, User


DEFAULT_AUTH_EMAIL = os.getenv("LIA_AUTH_EMAIL", "manager@demo.ai").strip().lower()
DEFAULT_AUTH_PASSWORD = os.getenv("LIA_AUTH_PASSWORD", "copilot")
DEFAULT_AUTH_NAME = os.getenv("LIA_AUTH_NAME", "LIA Demo Manager").strip()
SESSION_HOURS = int(os.getenv("LIA_AUTH_SESSION_HOURS", "12"))

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: str | None = None) -> str:
    salt_value = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_value.encode("utf-8"), 120000)
    return f"{salt_value}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, expected = stored_hash.split("$", 1)
    except ValueError:
        return False
    candidate = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(candidate, expected)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def ensure_default_auth_user() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == DEFAULT_AUTH_EMAIL).first()
        if user:
            if not user.password_hash:
                user.password_hash = hash_password(DEFAULT_AUTH_PASSWORD)
                db.commit()
            return

        db.add(
            User(
                email=DEFAULT_AUTH_EMAIL,
                full_name=DEFAULT_AUTH_NAME,
                password_hash=hash_password(DEFAULT_AUTH_PASSWORD),
                role="manager",
                is_active=True,
            )
        )
        db.commit()
    finally:
        db.close()


def authenticate_user(db: Session, email: str, password: str) -> User:
    normalized_email = email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is inactive.")
    return user


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.utcnow() + timedelta(hours=SESSION_HOURS),
        )
    )
    db.commit()
    return token


def revoke_session(db: Session, token: str) -> None:
    session = db.query(AuthSession).filter(AuthSession.token_hash == hash_token(token)).first()
    if not session or session.revoked_at:
        return
    session.revoked_at = datetime.utcnow()
    db.commit()


def _session_for_token(db: Session, token: str) -> AuthSession | None:
    if not token:
        return None
    session = (
        db.query(AuthSession)
        .filter(AuthSession.token_hash == hash_token(token))
        .first()
    )
    if not session or session.revoked_at or session.expires_at < datetime.utcnow():
        return None
    session.last_seen_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


def require_active_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    auth_token: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials else auth_token
    session = _session_for_token(db, token or "")
    if not session or not session.user or not session.user.is_active:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return session.user

