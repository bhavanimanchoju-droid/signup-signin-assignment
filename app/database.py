import os, sqlite3
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parent / "auth.db"
def get_db_path():
    return os.getenv("DATABASE_PATH", str(DEFAULT_DB))

def connect():
    conn = sqlite3.connect(get_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )""")
    conn.commit()
    return conn

def create_user(name, email, password_hash):
    conn = connect()
    try:
        cur = conn.execute("INSERT INTO users (name,email,password_hash) VALUES (?,?,?)",
                           (name, email.lower(), password_hash))
        conn.commit()
        row = conn.execute("SELECT id,name,email,created_at FROM users WHERE id=?", (cur.lastrowid,)).fetchone()
        return dict(row)
    finally:
        conn.close()

def find_user_by_email(email):
    conn = connect()
    try:
        row = conn.execute("SELECT id,name,email,password_hash,created_at FROM users WHERE email=? COLLATE NOCASE",
                           (email.lower(),)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def find_user_by_id(user_id):
    conn = connect()
    try:
        row = conn.execute("SELECT id,name,email,created_at FROM users WHERE id=?", (user_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
