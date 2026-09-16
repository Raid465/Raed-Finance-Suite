import sqlite3
import json
import time
import os
import threading

DB_PATH = os.path.join(os.path.dirname(__file__), "cache.db")
CACHE_TTL = 86400  # default: 24 hours
_SCHEMA_LOCK = threading.Lock()
_SCHEMA_READY = False
_MEM = {}
_MEM_LOCK = threading.RLock()


def get_connection():
    """Return a short-lived SQLite connection tuned for concurrent reads."""
    global _SCHEMA_READY
    conn = sqlite3.connect(DB_PATH, timeout=5)
    if not _SCHEMA_READY:
        with _SCHEMA_LOCK:
            if not _SCHEMA_READY:
                conn.execute("PRAGMA journal_mode=WAL")
                conn.execute("PRAGMA synchronous=NORMAL")
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS cache (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        created_at REAL NOT NULL
                    )
                """)
                conn.commit()
                _SCHEMA_READY = True
    return conn


def _fresh(created_at: float, max_age: int | float | None) -> bool:
    ttl = CACHE_TTL if max_age is None else max_age
    return ttl < 0 or time.time() - created_at <= ttl


def get(key: str, max_age: int | float | None = None):
    """Get a cached value; memory is checked before SQLite."""
    with _MEM_LOCK:
        item = _MEM.get(key)
    if item is not None:
        value, created_at = item
        if _fresh(created_at, max_age):
            return value
        with _MEM_LOCK:
            _MEM.pop(key, None)

    conn = get_connection()
    try:
        row = conn.execute("SELECT value, created_at FROM cache WHERE key = ?", (key,)).fetchone()
    finally:
        conn.close()
    if row is None:
        return None
    raw_value, created_at = row
    if not _fresh(created_at, max_age):
        delete(key)
        return None
    try:
        value = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        delete(key)
        return None
    with _MEM_LOCK:
        _MEM[key] = (value, created_at)
    return value


def set(key: str, data):
    created_at = time.time()
    with _MEM_LOCK:
        _MEM[key] = (data, created_at)
    conn = get_connection()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO cache (key, value, created_at) VALUES (?, ?, ?)",
            (key, json.dumps(data), created_at),
        )
        conn.commit()
    finally:
        conn.close()


def delete(key: str):
    with _MEM_LOCK:
        _MEM.pop(key, None)
    conn = get_connection()
    try:
        conn.execute("DELETE FROM cache WHERE key = ?", (key,))
        conn.commit()
    finally:
        conn.close()


def clear_memory():
    """Used by tests; persistent cache remains untouched."""
    with _MEM_LOCK:
        _MEM.clear()
