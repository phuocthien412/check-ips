import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Optional, Dict, Any
from app.core.config import settings

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a unique random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, stored_password: str) -> bool:
    """
    Verify plain password against stored password.
    Supports:
    1. PBKDF2 hash (salt$hash)
    2. Plaintext (convenient for direct MongoDB manual inserts / compass)
    3. Direct SHA256 hex
    """
    if not stored_password:
        return False
    
    # 1. PBKDF2 format
    if "$" in stored_password:
        parts = stored_password.split("$", 1)
        if len(parts) == 2:
            salt, stored_hash = parts
            computed_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
            if hmac.compare_digest(computed_key.hex(), stored_hash):
                return True
    
    # 2. Plaintext match
    if plain_password == stored_password:
        return True
        
    # 3. Direct SHA256 match
    plain_sha256 = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
    if plain_sha256.lower() == stored_password.lower():
        return True

    return False

def create_session_token(username: str, expires_in_seconds: int) -> str:
    """Create a tamper-proof HMAC-SHA256 signed session token with expiration timestamp"""
    now = int(time.time())
    payload = {
        "sub": username,
        "iat": now,
        "exp": now + expires_in_seconds
    }
    payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip('=')
    
    sig = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        payload_b64.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return f"{payload_b64}.{sig}"

def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify HMAC signature and expiration. Returns payload dictionary if valid, None if invalid/expired."""
    if not token or "." not in token:
        return None
    try:
        parts = token.split(".", 1)
        if len(parts) != 2:
            return None
        payload_b64, sig = parts
        
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            payload_b64.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(sig, expected_sig):
            return None
        
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += '=' * (4 - rem)
        
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        now = int(time.time())
        if payload.get("exp", 0) < now:
            return None
            
        return payload
    except Exception:
        return None
