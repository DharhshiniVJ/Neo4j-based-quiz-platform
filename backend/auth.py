import os
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

SECRET_KEY = os.getenv("JWT_SECRET", "fallback-secret-change-me")
ALGORITHM  = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))

bearer_scheme = HTTPBearer()


def create_access_token(userid: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=EXPIRE_HOURS)
    payload = {"sub": userid, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    return decode_token(credentials.credentials)


# ── Role guards ────────────────────────────────────────────────────────────────

def require_student(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Students only")
    return current_user


def require_teacher(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    return current_user


# ── Ownership helpers ──────────────────────────────────────────────────────────

def assert_own_student(student_id: str, current_user: dict):
    """Student can only access their own records."""
    if current_user["sub"] != student_id:
        raise HTTPException(status_code=403, detail="Access denied: not your record")


def assert_own_teacher(teacher_id: str, current_user: dict):
    """Teacher can only access their own profile."""
    if current_user["sub"] != teacher_id:
        raise HTTPException(status_code=403, detail="Access denied: not your profile")
