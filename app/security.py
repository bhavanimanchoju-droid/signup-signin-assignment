import hashlib
import hmac
import os
import secrets
import time
import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "development-only-change-this-secret-before-deploying")
JWT_ALGORITHM = "HS256"
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", "3600"))

def hash_password(password: str) -> str:
    """Store a salted PBKDF2-HMAC-SHA256 password hash, never plaintext."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000)
    import base64
    return f"{base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        import base64
        salt_b64, digest_b64 = stored_hash.split("$", 1)
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(digest_b64.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False

def create_access_token(subject: str) -> str:
    now = int(time.time())
    payload = {"sub": subject, "iat": now, "exp": now + TOKEN_TTL_SECONDS}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"require": ["sub", "exp"]})
    except jwt.InvalidTokenError:
        return None
