import os
import time
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Default loopback Docker postgres URL (used only when DATABASE_URL is unset).
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
SQLITE_FALLBACK_URL = "sqlite:///./voqly_local.db"

# If DATABASE_URL is explicitly set in the environment (production / docker-compose),
# a real Postgres is REQUIRED. We must never silently fall back to an empty local
# SQLite there — that hides the real data and loses anything written while fallen
# back, which looks exactly like "my data disappeared after a deploy". In that case
# we retry, and if Postgres is genuinely unreachable we fail loudly so the deploy
# health-check rolls back to the previous good release instead of serving empty data.
POSTGRES_REQUIRED = bool(os.getenv("DATABASE_URL")) and DATABASE_URL.startswith("postgresql")

engine = None
SessionLocal = sessionmaker(autocommit=False, autoflush=False)


def _connect_postgres(attempts: int, delay: float):
    """Try to connect to Postgres, retrying to ride out a slow-starting db container."""
    last_err = None
    for i in range(1, attempts + 1):
        try:
            print(f"Attempting connection to PostgreSQL ({i}/{attempts}) at: {DATABASE_URL}")
            eng = create_engine(
                DATABASE_URL,
                connect_args={"connect_timeout": 5},
                pool_pre_ping=True,  # recycle dead connections instead of erroring mid-request
            )
            conn = eng.connect()
            conn.close()
            print("Successfully connected to PostgreSQL database!")
            return eng
        except Exception as e:  # noqa: BLE001
            last_err = e
            print(f"Warning: PostgreSQL connection attempt {i}/{attempts} failed: {e}")
            if i < attempts:
                time.sleep(delay)
    raise last_err


if POSTGRES_REQUIRED:
    # Production: retry hard (~30s) to survive the db container's startup, then FAIL
    # rather than silently dropping to an empty SQLite.
    engine = _connect_postgres(attempts=10, delay=3)
else:
    # Local dev with no DATABASE_URL configured: one quick attempt, then fall back to
    # SQLite for convenience (no Postgres needed to hack locally).
    try:
        engine = _connect_postgres(attempts=1, delay=0)
    except Exception as e:  # noqa: BLE001
        print(f"Warning: PostgreSQL connection failed: {e}")
        print(f"Self-healing (dev only): falling back to local SQLite at: {SQLITE_FALLBACK_URL}")
        engine = create_engine(SQLITE_FALLBACK_URL, connect_args={"check_same_thread": False})

SessionLocal.configure(bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
