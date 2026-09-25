import hashlib
import logging
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings

logger = logging.getLogger("bhurakshak.mongo_auth")


def _hash_password(password: str) -> str:
    """SHA-256 hash — same algorithm used by SQLite store for compatibility."""
    return hashlib.sha256(password.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Default users seeded on startup
# ---------------------------------------------------------------------------
DEFAULT_USERS = [
    {
        "user_id":       "usr_admin",
        "username":      "admin",
        "password_hash": _hash_password("admin123"),
        "role":          "ADMIN",
        "full_name":     "Mine Control Center Admin",
        "email":         "admin@bhurakshak.in",
        "phone":         None,
        "created_at":    datetime.now(timezone.utc).isoformat(),
    },
    {
        "user_id":       "usr_field",
        "username":      "user",
        "password_hash": _hash_password("user123"),
        "role":          "USER",
        "full_name":     "Field Safety Supervisor",
        "email":         "supervisor@bhurakshak.in",
        "phone":         None,
        "created_at":    datetime.now(timezone.utc).isoformat(),
    },
]


class MongoUserStore:
    """
    Async MongoDB-backed user store for BhuRakshak authentication.

    Collection : bhurakshak.users
    Documents  : { user_id, username, password_hash, role, full_name,
                   email, phone, created_at }

    On startup it seeds the two default accounts if they don't already exist.
    All other application data (telemetry, nodes, alerts, etc.) stays in SQLite.

    Falls back gracefully if MongoDB is unreachable — auth API then uses
    the SQLite users table as a backup.
    """

    def __init__(self):
        self._client: Optional[AsyncIOMotorClient] = None
        self._db = None
        self._users = None
        self._ready = False

    # ------------------------------------------------------------------
    # Lifecycle — called from app lifespan (main.py)
    # ------------------------------------------------------------------

    async def connect(self):
        """Connect to MongoDB and seed default users."""
        try:
            self._client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=5000,
            )
            # Ping to verify the connection is alive
            await self._client.admin.command("ping")

            self._db    = self._client[settings.MONGODB_DATABASE]
            self._users = self._db["users"]

            # Ensure unique index on username
            await self._users.create_index("username", unique=True)

            await self._seed_default_users()
            self._ready = True
            logger.info(
                f"✅ MongoUserStore connected → {settings.MONGODB_URL}"
                f"  db={settings.MONGODB_DATABASE}  collection=users"
            )
        except Exception as exc:
            logger.warning(
                f"⚠️  MongoUserStore: could not connect to MongoDB ({exc}). "
                "Login will fall back to SQLite users table."
            )
            self._ready = False

    async def disconnect(self):
        """Close the MongoDB connection. Called from app lifespan shutdown."""
        if self._client:
            self._client.close()
            logger.info("MongoUserStore disconnected.")

    @property
    def is_ready(self) -> bool:
        """True when MongoDB is connected and the collection is accessible."""
        return self._ready

    # ------------------------------------------------------------------
    # Seeding
    # ------------------------------------------------------------------

    async def _seed_default_users(self):
        for user in DEFAULT_USERS:
            existing = await self._users.find_one({"username": user["username"]})
            if not existing:
                await self._users.insert_one(dict(user))
                logger.info(
                    f"MongoUserStore: seeded default user '{user['username']}' "
                    f"(role={user['role']})"
                )
            else:
                logger.debug(
                    f"MongoUserStore: '{user['username']}' already exists — skipped."
                )

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Return user document or None. Strips MongoDB's internal _id."""
        if not self._ready:
            return None
        doc = await self._users.find_one({"username": username})
        if not doc:
            return None
        doc.pop("_id", None)
        return doc

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Return user document by user_id or None."""
        if not self._ready:
            return None
        doc = await self._users.find_one({"user_id": user_id})
        if not doc:
            return None
        doc.pop("_id", None)
        return doc

    async def list_users(self) -> list:
        """Return all users without password_hash field."""
        if not self._ready:
            return []
        cursor = self._users.find({}, {"password_hash": 0, "_id": 0})
        return await cursor.to_list(length=None)

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    async def create_user(self, user_data: Dict[str, Any]) -> bool:
        """
        Insert a new user document.
        Returns True on success, False if the username is already taken.
        Caller must hash the password before passing user_data.
        """
        if not self._ready:
            return False
        try:
            await self._users.insert_one(user_data)
            return True
        except Exception as exc:
            logger.warning(f"MongoUserStore.create_user failed: {exc}")
            return False

    async def update_user(self, username: str, updates: Dict[str, Any]) -> bool:
        """Update specific fields on an existing user document."""
        if not self._ready:
            return False
        result = await self._users.update_one(
            {"username": username},
            {"$set": updates}
        )
        return result.modified_count > 0


# ---------------------------------------------------------------------------
# Module-level singleton — imported by auth API and app lifespan
# ---------------------------------------------------------------------------
mongo_user_store = MongoUserStore()
