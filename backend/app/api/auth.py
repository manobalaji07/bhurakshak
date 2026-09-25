import logging
from fastapi import APIRouter, HTTPException, Depends, status

from app.schemas.auth import LoginRequest, LoginResponse, UserProfileResponse
from app.db.store import db_store                         # SQLite (fallback)
from app.db.mongo_user_store import mongo_user_store      # MongoDB (primary)
from app.auth.jwt import verify_password, create_access_token, get_current_user

logger = logging.getLogger("bhurakshak.auth")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


async def _get_user(username: str) -> dict | None:
    """
    Fetch a user by username.
    Primary source : MongoDB (mongo_user_store)
    Fallback       : SQLite (db_store) — used if MongoDB is unavailable
    """
    if mongo_user_store.is_ready:
        user = await mongo_user_store.get_user_by_username(username)
        if user:
            return user
        # Not found in Mongo — could be a legacy SQLite-only account; fall through
    # SQLite fallback (synchronous)
    return db_store.get_user_by_username(username)


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    """
    Authenticate with username + password.
    Looks up the user in MongoDB first; falls back to SQLite if MongoDB is down.
    Returns a signed JWT on success.
    """
    user = await _get_user(body.username)

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password credentials."
        )

    source = "MongoDB" if mongo_user_store.is_ready else "SQLite (fallback)"
    logger.info(f"Login success: '{body.username}' (role={user['role']}, source={source})")

    token = create_access_token({
        "sub":     user["username"],
        "role":    user["role"],
        "user_id": user["user_id"]
    })

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        role=user["role"],
        username=user["username"],
        full_name=user["full_name"]
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    user = await _get_user(current_user["username"])

    if not user:
        # Graceful degraded response when token is valid but user not in DB
        return UserProfileResponse(
            user_id=current_user.get("user_id", "usr_guest"),
            username=current_user.get("username", "admin"),
            role=current_user.get("role", "ADMIN"),
            full_name="Operator",
            email="admin@bhurakshak.in"
        )

    return UserProfileResponse(
        user_id=user["user_id"],
        username=user["username"],
        role=user["role"],
        full_name=user["full_name"],
        email=user.get("email")
    )
