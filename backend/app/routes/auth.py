from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import AuthResponse, LoginRequest, LogoutResponse, UserResponse
from app.security import authenticate_user, bearer_scheme, create_session, require_active_user, revoke_session


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = authenticate_user(db, payload.email, payload.password)
    token = create_session(db, user)
    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name or "", role=user.role or "manager"),
    )


@router.get("/me", response_model=UserResponse)
def me(user=Depends(require_active_user)) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, full_name=user.full_name or "", role=user.role or "manager")


@router.post("/logout", response_model=LogoutResponse)
def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> LogoutResponse:
    if credentials and credentials.credentials:
        revoke_session(db, credentials.credentials)
    return LogoutResponse(success=True)
