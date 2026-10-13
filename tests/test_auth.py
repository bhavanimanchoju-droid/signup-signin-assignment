import os
import tempfile
from fastapi.testclient import TestClient
from app.main import app

def test_signup_signin_and_me():
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["DATABASE_PATH"] = os.path.join(tmp, "test_auth.db")
        with TestClient(app) as client:
            signup = client.post("/api/auth/signup", json={
                "name": "Bhavani Test", "email": "bhavani@example.com", "password": "securePass123"
            })
            assert signup.status_code == 201
            data = signup.json()
            assert data["user"]["email"] == "bhavani@example.com"
            assert "password" not in data["user"]
            assert data["access_token"]

            duplicate = client.post("/api/auth/signup", json={
                "name": "Bhavani Test", "email": "BHAVANI@example.com", "password": "securePass123"
            })
            assert duplicate.status_code == 409

            signin = client.post("/api/auth/signin", json={
                "email": "bhavani@example.com", "password": "securePass123"
            })
            assert signin.status_code == 200
            token = signin.json()["access_token"]

            wrong = client.post("/api/auth/signin", json={
                "email": "bhavani@example.com", "password": "wrongPassword"
            })
            assert wrong.status_code == 401

            me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert me.status_code == 200
            assert me.json()["email"] == "bhavani@example.com"
            assert client.get("/api/auth/me").status_code == 401
        os.environ.pop("DATABASE_PATH", None)
