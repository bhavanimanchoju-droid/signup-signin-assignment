from typing import Annotated
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.database import create_user, find_user_by_email, find_user_by_id
from app.security import create_access_token, decode_access_token, hash_password, verify_password

app = FastAPI(title="Sign Up & Sign In API",
              description="Authentication demo with password hashing, expiring bearer tokens, SQLite, and a simple UI.",
              version="1.0.0")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

class SignUpRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value):
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name cannot be blank")
        return cleaned

class SignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: str

class AuthResponse(BaseModel):
    message: str
    user: UserResponse
    access_token: str
    token_type: str = "bearer"

def current_user(authorization: Annotated[str | None, Header()] = None):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    payload = decode_access_token(authorization.split(" ", 1)[1].strip())
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid token subject")
    user = find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user

@app.get("/", include_in_schema=False)
def home():
    return FileResponse("app/static/index.html")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/auth/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignUpRequest):
    if find_user_by_email(str(body.email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    try:
        user = create_user(body.name, str(body.email), hash_password(body.password))
    except Exception as exc:
        # Protect against duplicate registration requests arriving concurrently.
        if find_user_by_email(str(body.email)):
            raise HTTPException(status_code=409, detail="An account with this email already exists") from exc
        raise
    return {"message": "Account created successfully", "user": user,
            "access_token": create_access_token(str(user["id"])), "token_type": "bearer"}

@app.post("/api/auth/signin", response_model=AuthResponse)
def signin(body: SignInRequest):
    user = find_user_by_email(str(body.email))
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    safe_user = {key: user[key] for key in ("id", "name", "email", "created_at")}
    return {"message": "Signed in successfully", "user": safe_user,
            "access_token": create_access_token(str(user["id"])), "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(user: dict = Depends(current_user)):
    return user
