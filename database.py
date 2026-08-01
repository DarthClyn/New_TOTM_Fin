"""
Database Engine & Session Setup (database.py)
Manages the SQLite database connection URL, creates the SQLAlchemy engine,
sessionmaker, Declarative Base class, and get_db dependency helper.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. SQLite Connection String (stores DB in local file 'local_sql_accounting.db')
# Configurable via DATABASE_URL environment variable for production PostgreSQL / MSSQL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local_sql_accounting.db")

# 2. Create Engine (connect_args={"check_same_thread": False} required for SQLite multi-threading)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

# 3. Create SessionLocal factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Declarative Base class for ORM models
Base = declarative_base()

# 5. Dependency helper (for FastAPI routes / request context)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
