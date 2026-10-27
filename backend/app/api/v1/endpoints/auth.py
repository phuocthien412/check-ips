import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Request, Response, UploadFile, File
from pydantic import BaseModel
from app.core.database import get_database
from app.core.config import settings
from app.core.security import (
    hash_password, 
    verify_password,
    create_session_token,
    verify_session_token
)
from app.schemas.user import (
    UserLogin,
    UserCreate,
    UserUpdate,
    UserResponse,
    LoginResponse
)

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

SESSION_COOKIE_NAME = "sabibeco_session"
# Remember Me duration: 14 days in seconds
REMEMBER_ME_DURATION = 14 * 24 * 3600
# Non-Remember Me session max lifetime: 24 hours in seconds
SESSION_MAX_DURATION = 24 * 3600

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
UPLOAD_DIR = settings.UPLOAD_DIR

class UploadAvatarResponse(BaseModel):
    avatarUrl: str
    filename: str
    message: str

class ChangePasswordRequest(BaseModel):
    username: str
    current_password: str
    new_password: str

@router.post("/login", response_model=LoginResponse)
async def login(credentials: UserLogin, response: Response):
    """
    Authenticate user against MongoDB.
    Issues a secure, HttpOnly cookie with:
    - Long expiration (e.g. 14 days) if remember_me is TRUE
    - Session cookie (discarded when browser closes) if remember_me is FALSE
    Tamper-proof HMAC token prevents XSS token theft from localStorage.
    """
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )

    username = credentials.username.strip()
    password = credentials.password

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required"
        )

    # Lookup user in db.users collection (case-insensitive)
    user_doc = await db.users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
    
    if not user_doc:
        logger.warning("Failed login attempt: User '%s' not found in database", username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    stored_password = user_doc.get("password", "")
    if not verify_password(password, stored_password):
        logger.warning("Failed login attempt: Incorrect password for user '%s'", username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    # Update last_login timestamp
    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"_id": user_doc["_id"]},
        {"$set": {"last_login": now}}
    )

    # Generate session token with proper expiration
    is_remember = bool(credentials.remember_me)
    expires_in = REMEMBER_ME_DURATION if is_remember else SESSION_MAX_DURATION
    session_token = create_session_token(user_doc.get("username", username), expires_in)

    is_production = settings.ENVIRONMENT == "production"

    # Set HttpOnly, Secure, SameSite Cookie
    if is_remember:
        # Long-term persistent cookie
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            max_age=REMEMBER_ME_DURATION,
            httponly=True,
            secure=is_production,
            samesite="lax",
            path="/"
        )
    else:
        # Session-only cookie: max_age=None causes browser to discard on close
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            max_age=None,
            httponly=True,
            secure=is_production,
            samesite="lax",
            path="/"
        )

    logger.info("User '%s' authenticated successfully (remember_me=%s)", user_doc.get("username"), is_remember)

    return LoginResponse(
        username=user_doc.get("username", username),
        displayName=user_doc.get("displayName") or user_doc.get("username", username),
        role=user_doc.get("role", "Administrator"),
        avatarUrl=user_doc.get("avatarUrl") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
        isLoggedIn=True,
        token=None, # Keep secret in HttpOnly cookie, do not expose to JS
        message="Login successful"
    )

@router.get("/me", response_model=LoginResponse)
async def get_current_user_session(request: Request):
    """
    Verify HttpOnly session cookie and return active authenticated user session.
    Protects against expired or forged session tokens.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    payload = verify_session_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )

    username = payload["sub"]
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    user_doc = await db.users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
    if not user_doc or not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated"
        )

    return LoginResponse(
        username=user_doc.get("username", username),
        displayName=user_doc.get("displayName") or user_doc.get("username", username),
        role=user_doc.get("role", "Administrator"),
        avatarUrl=user_doc.get("avatarUrl") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
        isLoggedIn=True,
        token=None,
        message="Session active"
    )

@router.post("/logout")
async def logout(response: Response):
    """Revoke session and clear the HttpOnly cookie"""
    is_production = settings.ENVIRONMENT == "production"
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=is_production,
        samesite="lax"
    )
    return {"message": "Logged out successfully"}

@router.get("/users", response_model=List[UserResponse])
async def list_users():
    """List all accounts registered in database (excluding passwords)"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    users_cursor = db.users.find({})
    results = []
    async for doc in users_cursor:
        doc["_id"] = str(doc["_id"])
        doc.pop("password", None)
        results.append(UserResponse.model_validate(doc))
    return results

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: UserCreate):
    """Create a new user account in MongoDB (CRUD: Create)"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    existing = await db.users.find_one({"username": user_in.username.strip()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User '{user_in.username}' already exists"
        )

    now = datetime.now(timezone.utc)
    user_dict = user_in.model_dump()
    user_dict["username"] = user_dict["username"].strip()
    user_dict["password"] = hash_password(user_dict["password"])
    user_dict["created_at"] = now
    user_dict["updated_at"] = now

    res = await db.users.insert_one(user_dict)
    user_dict["_id"] = str(res.inserted_id)
    user_dict.pop("password", None)
    return UserResponse.model_validate(user_dict)

@router.get("/users/{username}", response_model=UserResponse)
async def get_user(username: str):
    """Get single user by username (CRUD: Read)"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    doc = await db.users.find_one({"username": username.strip()})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    doc["_id"] = str(doc["_id"])
    doc.pop("password", None)
    return UserResponse.model_validate(doc)

@router.put("/users/{username}", response_model=UserResponse)
async def update_user(username: str, update_in: UserUpdate):
    """Update user information or password (CRUD: Update)"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    existing = await db.users.find_one({"username": username.strip()})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {k: v for k, v in update_in.model_dump().items() if v is not None}
    if "password" in update_data:
        update_data["password"] = hash_password(update_data["password"])
    
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.users.update_one(
        {"username": username.strip()},
        {"$set": update_data}
    )

    updated_doc = await db.users.find_one({"username": username.strip()})
    updated_doc["_id"] = str(updated_doc["_id"])
    updated_doc.pop("password", None)
    return UserResponse.model_validate(updated_doc)

@router.delete("/users/{username}")
async def delete_user(username: str):
    """Delete a user account from MongoDB (CRUD: Delete)"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    res = await db.users.delete_one({"username": username.strip()})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": f"User '{username}' deleted successfully"}

@router.post("/change-password")
async def change_password(req: ChangePasswordRequest):
    """Change account password by verifying current password and saving new hashed password"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_doc = await db.users.find_one({"username": req.username.strip()})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(req.current_password, user_doc.get("password", "")):
        raise HTTPException(status_code=400, detail="Current password incorrect")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    new_hash = hash_password(req.new_password)
    await db.users.update_one(
        {"username": req.username.strip()},
        {"$set": {"password": new_hash, "updated_at": datetime.now(timezone.utc)}}
    )

    return {"message": "Password updated successfully"}

@router.post("/upload-avatar", response_model=UploadAvatarResponse)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...)
):
    """
    Standard Avatar File Upload:
    - Validates file extension (.jpg, .jpeg, .png, .webp)
    - Validates file size (max 5MB)
    - Saves uniquely named file in backend/uploads/avatars/ (never in frontend code directories!)
    - Updates MongoDB user avatarUrl with relative static URL path (/uploads/avatars/...)
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Please upload a valid image (JPEG, PNG, WEBP)."
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds maximum allowed limit (5MB)."
        )

    # Detect username from session cookie if authenticated
    username = None
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        payload = verify_session_token(token)
        if payload:
            username = payload.get("sub")

    safe_username = re.sub(r'[^a-zA-Z0-9_-]', '', username) if username else "user"
    unique_id = uuid.uuid4().hex[:8]
    timestamp = int(time.time())
    new_filename = f"avatar_{safe_username}_{timestamp}_{unique_id}{ext}"

    avatars_folder = os.path.join(UPLOAD_DIR, "avatars")
    os.makedirs(avatars_folder, exist_ok=True)
    destination_path = os.path.join(avatars_folder, new_filename)

    with open(destination_path, "wb") as f:
        f.write(contents)

    relative_url = f"/uploads/avatars/{new_filename}"

    # Update MongoDB user avatarUrl
    if username:
        db = get_database()
        if db is not None:
            await db.users.update_one(
                {"username": username},
                {"$set": {"avatarUrl": relative_url, "updated_at": datetime.now(timezone.utc)}}
            )

    logger.info("Avatar uploaded successfully for user '%s': %s", username, relative_url)

    return UploadAvatarResponse(
        avatarUrl=relative_url,
        filename=new_filename,
        message="Avatar uploaded successfully"
    )
