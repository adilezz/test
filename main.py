"""
FastAPI Application for theses.ma - Moroccan Thesis Repository
A comprehensive thesis management and search platform
"""

# =============================================================================
# IMPORTS AND DEPENDENCIES
# =============================================================================

# FastAPI Core
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form,Query,Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Pydantic for data validation
from pydantic import BaseModel, EmailStr, Field, validator
from pydantic.types import UUID4

# Database - PostgreSQL
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

# Authentication & Security
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import hashlib

# File handling
from pathlib import Path
import mimetypes
import shutil

# Standard library
import os
import uuid
import re
import logging
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any, Union
import json
from enum import Enum

# =============================================================================
# CONFIGURATION
# =============================================================================
class Settings:
    """Application configuration settings"""
    
    # Database Configuration
    DATABASE_HOST: str = os.getenv("DATABASE_HOST", "localhost")
    DATABASE_PORT: int = int(os.getenv("DATABASE_PORT", "5432"))
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "thesis")
    DATABASE_USER: str = os.getenv("DATABASE_USER", "postgres")
    DATABASE_PASSWORD: str = os.getenv("DATABASE_PASSWORD", "admin")
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
    
    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7 days
    
    # File Upload Configuration
    UPLOAD_DIRECTORY: str = os.getenv("UPLOAD_DIRECTORY", "./uploads")
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "100"))  # 100 MB max
    ALLOWED_FILE_TYPES: List[str] = ["application/pdf"]  # Only PDF files for now
    
    # Application Settings
    APP_NAME: str = "theses.ma"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # React development server
        "http://localhost:8080",  # Vue development server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080"
    ]
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Pagination Defaults
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # Search Configuration
    SEARCH_MIN_QUERY_LENGTH: int = 2
    SEARCH_MAX_RESULTS: int = 1000

# Initialize settings
settings = Settings()

# Create upload directory if it doesn't exist
Path(settings.UPLOAD_DIRECTORY).mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# =============================================================================
# DATABASE CONNECTION POOL
# =============================================================================
# Database connection pool
class DatabasePool:
    """Simple database connection pool for PostgreSQL"""
    
    def __init__(self, database_url: str, min_conn: int = 1, max_conn: int = 10):
        self.database_url = database_url
        self.min_conn = min_conn
        self.max_conn = max_conn
        self._pool = []
        self._used_connections = set()
        
        # Initialize minimum connections
        for _ in range(min_conn):
            conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
            self._pool.append(conn)
    
    def get_connection(self):
        """Get a connection from the pool"""
        if self._pool:
            conn = self._pool.pop()
            self._used_connections.add(conn)
            return conn
        elif len(self._used_connections) < self.max_conn:
            conn = psycopg2.connect(self.database_url, cursor_factory=RealDictCursor)
            self._used_connections.add(conn)
            return conn
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection pool exhausted"
            )
    
    def return_connection(self, conn):
        """Return a connection to the pool"""
        if conn in self._used_connections:
            self._used_connections.remove(conn)
            if conn.closed == 0:  # Connection is still open
                self._pool.append(conn)
            else:
                conn.close()
    
    def close_all(self):
        """Close all connections"""
        for conn in self._pool:
            conn.close()
        for conn in self._used_connections:
            conn.close()
        self._pool.clear()
        self._used_connections.clear()

# Initialize database pool
db_pool = None

def init_database():
    """Initialize database connection pool"""
    global db_pool
    try:
        db_pool = DatabasePool(settings.DATABASE_URL)
        logger.info("Database connection pool initialized")
        
        # Test connection
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()
                logger.info(f"Connected to PostgreSQL: {version['version']}")
                
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = None
    try:
        conn = db_pool.get_connection()
        yield conn
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database operation failed"
        )
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Unexpected error: {e}")
        raise
    finally:
        if conn:
            db_pool.return_connection(conn)

def get_db():
    """Dependency for FastAPI endpoints"""
    with get_db_connection() as conn:
        yield conn

# Database helper functions
def execute_query(query: str, params=None, fetch_one=False, fetch_all=False):
    """Execute a database query"""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            
            if fetch_one:
                return cursor.fetchone()
            elif fetch_all:
                return cursor.fetchall()
            
            conn.commit()
            return cursor.rowcount

def execute_query_with_result(query: str, params=None):
    """Execute query and return results"""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.commit()
            return results

def check_database_health():
    """Check if database is accessible and get detailed health info"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Basic connectivity check
                cursor.execute("SELECT 1")
                
                # Get PostgreSQL version
                cursor.execute("SELECT version()")
                pg_version = cursor.fetchone()['version']
                
                # Check critical tables exist
                cursor.execute("""
                    SELECT tablename 
                    FROM pg_tables 
                    WHERE schemaname = 'public' 
                    AND tablename IN ('users', 'theses', 'universities', 'faculties', 
                                     'extraction_jobs', 'languages', 'degrees')
                    ORDER BY tablename
                """)
                tables = [row['tablename'] for row in cursor.fetchall()]
                
                # Count records in key tables
                cursor.execute("""
                    SELECT 
                        (SELECT COUNT(*) FROM users) as users_count,
                        (SELECT COUNT(*) FROM theses) as theses_count,
                        (SELECT COUNT(*) FROM universities) as universities_count,
                        (SELECT COUNT(*) FROM faculties) as faculties_count,
                        (SELECT COUNT(*) FROM languages) as languages_count
                """)
                counts = cursor.fetchone()
                
                return {
                    "healthy": True,
                    "connected": True,
                    "version": pg_version.split(',')[0] if pg_version else "Unknown",
                    "tables_verified": len(tables),
                    "critical_tables": tables,
                    "record_counts": dict(counts) if counts else {},
                    "connection_pool": {
                        "available": len(db_pool._pool) if db_pool else 0,
                        "in_use": len(db_pool._used_connections) if db_pool else 0,
                        "max_connections": db_pool.max_conn if db_pool else 0
                    }
                }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "healthy": False,
            "connected": False,
            "error": str(e)
        }

# =============================================================================
# SECURITY AND AUTHENTICATION
# =============================================================================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer security scheme
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        
        # Check token type
        if payload.get("type") != token_type:
            return None
            
        # Check expiration
        exp = payload.get("exp")
        if exp is None or datetime.utcnow() > datetime.fromtimestamp(exp):
            return None
            
        return payload
    except JWTError:
        return None

def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email from database"""
    query = """
        SELECT id, email, username, password_hash, first_name, last_name, 
               title, role, email_verified, is_active, university_id, 
               faculty_id, department_id, school_id, created_at, updated_at
        FROM users 
        WHERE email = %s AND deleted_at IS NULL
    """
    result = execute_query(query, (email,), fetch_one=True)
    return dict(result) if result else None

def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID from database"""
    query = """
        SELECT id, email, username, password_hash, first_name, last_name, 
               title, role, email_verified, is_active, university_id, 
               faculty_id, department_id, school_id, created_at, updated_at
        FROM users 
        WHERE id = %s AND deleted_at IS NULL
    """
    result = execute_query(query, (user_id,), fetch_one=True)
    return dict(result) if result else None

def authenticate_user(email: str, password: str) -> Optional[dict]:
    """Authenticate user with email and password"""
    user = get_user_by_email(email)
    if not user:
        return None
    
    if not verify_password(password, user["password_hash"]):
        return None
        
    if not user["is_active"]:
        return None
        
    return user

def create_user(user_data: dict) -> dict:
    """Create a new user in the database"""
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data["password"])
    
    query = """
        INSERT INTO users (
            id, email, username, password_hash, first_name, last_name, 
            title, role, university_id, faculty_id, department_id, school_id,
            phone, alternative_email, language, timezone, email_verified, is_active
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id, email, username, first_name, last_name, title, role, 
                   email_verified, is_active, created_at
    """
    
    params = (
        user_id,
        user_data["email"],
        user_data["username"],
        hashed_password,
        user_data["first_name"],
        user_data["last_name"],
        user_data["title"],
        user_data.get("role", "admin"),
        user_data.get("university_id"),
        user_data.get("faculty_id"),
        user_data.get("department_id"),
        user_data.get("school_id"),
        user_data.get("phone"),
        user_data.get("alternative_email"),
        user_data.get("language", "fr"),
        user_data.get("timezone", "Africa/Casablanca"),
        user_data.get("email_verified", False),
        user_data.get("is_active", True)
    )
    
    result = execute_query(query, params, fetch_one=True)
    return dict(result)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    
    # Verify token
    payload = verify_token(token, "access")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Require admin role"""
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def generate_username(first_name: str, last_name: str) -> str:
    """Generate a unique username from first and last name"""
    base_username = f"{first_name.lower()}.{last_name.lower()}"
    base_username = re.sub(r'[^a-z0-9._]', '', base_username)
    
    # Check if username exists
    query = "SELECT COUNT(*) as count FROM users WHERE username = %s"
    result = execute_query(query, (base_username,), fetch_one=True)
    
    if result["count"] == 0:
        return base_username
    
    # If exists, add number suffix
    counter = 1
    while True:
        username = f"{base_username}{counter}"
        result = execute_query(query, (username,), fetch_one=True)
        if result["count"] == 0:
            return username
        counter += 1

# =============================================================================
# FILE HANDLING
# =============================================================================

# File storage directories
TEMP_UPLOAD_DIR = Path(settings.UPLOAD_DIRECTORY) / "temp"
PUBLISHED_DIR = Path(settings.UPLOAD_DIRECTORY) / "published"
BULK_UPLOAD_DIR = Path(settings.UPLOAD_DIRECTORY) / "bulk"

# Create directories if they don't exist
for directory in [TEMP_UPLOAD_DIR, PUBLISHED_DIR, BULK_UPLOAD_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

def validate_file_type(file: UploadFile) -> bool:
    """Validate file type is PDF"""
    if file.content_type not in settings.ALLOWED_FILE_TYPES:
        return False
    
    # Additional check using file extension
    if not file.filename.lower().endswith('.pdf'):
        return False
        
    return True

def validate_file_size(file: UploadFile) -> bool:
    """Validate file size is within limits"""
    # Note: This is a basic check. For accurate size, we need to read the file
    return True  # Will be checked during file writing

def generate_file_id() -> str:
    """Generate unique file identifier"""
    return str(uuid.uuid4())

def get_file_hash(file_path: Path) -> str:
    """Calculate MD5 hash of file"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

async def save_temp_file(file: UploadFile, submitted_by:str) -> dict:
    """Save uploaded file to temporary directory"""
    # Validate file
    if not validate_file_type(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )
    
    # Generate unique filename
    file_id = generate_file_id()
    temp_filename = f"{file_id}.pdf"
    temp_path = TEMP_UPLOAD_DIR / temp_filename
    
    try:
        # Write file to temporary location
        file_size = 0
        with open(temp_path, "wb") as buffer:
            while chunk := await file.read(8192):  # Read in 8KB chunks
                file_size += len(chunk)
                
                # Check file size limit
                if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                    buffer.close()
                    temp_path.unlink()  # Delete partial file
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit"
                    )
                
                buffer.write(chunk)
        
        # Calculate file hash
        file_hash = get_file_hash(temp_path)
        
        # Check for duplicates
        existing_file = check_file_duplicate(file_hash)
        if existing_file:
            temp_path.unlink()  # Delete duplicate
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"File already exists: {existing_file['original_filename']}"
            )
        
        # Create manual extraction job record
        extraction_job_id = create_manual_extraction_job(file_id, file.filename, file_size, file_hash, submitted_by)
        
        return {
            "file_id": file_id,
            "original_filename": file.filename,
            "temp_filename": temp_filename,
            "temp_path": str(temp_path),
            "file_size": file_size,
            "file_hash": file_hash,
            "extraction_job_id": extraction_job_id,
            "submitted_by": submitted_by
        }
        
    except Exception as e:
        # Clean up on error
        if temp_path.exists():
            temp_path.unlink()
        logger.error(f"File upload error: {e}")
        raise

def create_manual_extraction_job(file_id: str, original_filename: str, file_size: int, file_hash: str, submitted_by: str) -> str:
    """Create extraction job record for manual entry"""
    job_id = str(uuid.uuid4())
    
    # Get current admin user (we'll pass this in the actual endpoint)
    # For now, use a default admin user ID - this will be updated in the actual implementation
    
    query = """
        INSERT INTO extraction_jobs (
            id, original_filename, file_url, file_size, file_hash, 
            submitted_by, processing_status, processing_stage,
            extraction_language, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id
    """
    
    # Temporary file URL in temp directory
    temp_file_url = f"/temp/{file_id}.pdf"
    
    params = (
        job_id,
        original_filename,
        temp_file_url,
        file_size,
        file_hash,
        submitted_by, 
        "completed",  # Manual entry is immediately "completed"
        "manual_entry",
        "fr",  # Default to French
        datetime.utcnow(),
        datetime.utcnow()
    )
    
    result = execute_query(query, params, fetch_one=True)
    return result["id"]

def move_file_to_published(file_id: str) -> str:
    """Move file from temp to published directory"""
    temp_path = TEMP_UPLOAD_DIR / f"{file_id}.pdf"
    published_path = PUBLISHED_DIR / f"{file_id}.pdf"
    
    if not temp_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temporary file not found"
        )
    
    try:
        # Move file
        shutil.move(str(temp_path), str(published_path))
        
        # Update file URL in extraction job
        update_query = """
            UPDATE extraction_jobs 
            SET file_url = %s, updated_at = %s 
            WHERE file_url = %s
        """
        execute_query(update_query, (f"/published/{file_id}.pdf", datetime.utcnow(), f"/temp/{file_id}.pdf"))
        
        return f"/published/{file_id}.pdf"
        
    except Exception as e:
        logger.error(f"Error moving file to published: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to publish file"
        )

def delete_temp_file(file_id: str):
    """Delete temporary file"""
    temp_path = TEMP_UPLOAD_DIR / f"{file_id}.pdf"
    if temp_path.exists():
        temp_path.unlink()

def check_file_duplicate(file_hash: str) -> Optional[dict]:
    """Check if file with same hash already exists"""
    query = """
        SELECT original_filename, file_url 
        FROM extraction_jobs 
        WHERE file_hash = %s
    """
    return execute_query(query, (file_hash,), fetch_one=True)

async def save_bulk_files(files: List[UploadFile], metadata_csv: UploadFile = None) -> dict:
    """Save multiple files for bulk processing"""
    bulk_batch_id = str(uuid.uuid4())
    bulk_dir = BULK_UPLOAD_DIR / bulk_batch_id
    bulk_dir.mkdir(exist_ok=True)
    
    uploaded_files = []
    
    try:
        # Process each PDF file
        for file in files:
            if not validate_file_type(file):
                continue  # Skip non-PDF files
            
            file_id = generate_file_id()
            file_path = bulk_dir / f"{file_id}.pdf"
            
            # Save file
            with open(file_path, "wb") as buffer:
                while chunk := await file.read(8192):
                    buffer.write(chunk)
            
            uploaded_files.append({
                "file_id": file_id,
                "original_filename": file.filename,
                "file_path": str(file_path),
                "file_size": file_path.stat().st_size,
                "file_hash": get_file_hash(file_path)
            })
        
        # Process metadata CSV if provided
        metadata = []
        if metadata_csv:
            csv_path = bulk_dir / "metadata.csv"
            with open(csv_path, "wb") as buffer:
                while chunk := await metadata_csv.read(8192):
                    buffer.write(chunk)
            
            # TODO: Parse CSV metadata
            # This will be implemented when we create the bulk processing endpoints
        
        return {
            "batch_id": bulk_batch_id,
            "uploaded_files": uploaded_files,
            "metadata_file": str(csv_path) if metadata_csv else None,
            "total_files": len(uploaded_files)
        }
        
    except Exception as e:
        # Clean up on error
        shutil.rmtree(bulk_dir, ignore_errors=True)
        logger.error(f"Bulk upload error: {e}")
        raise

def serve_file(file_path: str, filename: str = None) -> FileResponse:
    """Serve file with proper headers"""
    full_path = Path(settings.UPLOAD_DIRECTORY) / file_path.lstrip("/")
    
    if not full_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Determine filename for download
    if not filename:
        filename = full_path.name
    
    return FileResponse(
        path=str(full_path),
        filename=filename,
        media_type="application/pdf"
    )

# =============================================================================
# ENUMS
# =============================================================================


class ThesisStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    REJECTED = "rejected"

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    MODERATOR = "moderator"
    REVIEWER = "reviewer"

class ExtractionStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"
    RETRY = "retry"

class ProcessingStage(str, Enum):
    VALIDATION = "validation"
    UPLOAD = "upload"
    EXTRACTION = "extraction"
    MATCHING = "matching"
    REVIEW = "review"
    APPROVAL = "approval"
    PUBLISHING = "publishing"

class AcademicRole(str, Enum):
    AUTHOR = "author"
    DIRECTOR = "director"
    CO_DIRECTOR = "co_director"
    JURY_PRESIDENT = "jury_president"
    JURY_EXAMINER = "jury_examiner"
    JURY_REPORTER = "jury_reporter"
    EXTERNAL_EXAMINER = "external_examiner"

class MatchingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    MANUAL_REVIEW = "manual_review"

class ConfidenceLevel(str, Enum):
    VERY_HIGH = "very_high"  # 90-100%
    HIGH = "high"           # 70-89%
    MEDIUM = "medium"       # 50-69%
    LOW = "low"            # 30-49%
    VERY_LOW = "very_low"  # 0-29%

class FileType(str, Enum):
    PDF = "pdf"
    DOC = "doc"
    DOCX = "docx"
    TXT = "txt"
    RTF = "rtf"

class BatchStatus(str, Enum):
    CREATED = "created"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PARTIAL = "partial"

class AuditAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    SOFT_DELETE = "soft_delete"
    RESTORE = "restore"
    APPROVE = "approve"
    REJECT = "reject"
    PUBLISH = "publish"
    UNPUBLISH = "unpublish"
    LOGIN = "login"
    LOGOUT = "logout"
    UPLOAD = "upload"
    DOWNLOAD = "download"
    VIEW = "view"
    SEARCH = "search"
    EXPORT = "export"
    IMPORT = "import"
    BULK_UPDATE = "bulk_update"
    BULK_DELETE = "bulk_delete"

class NotificationType(str, Enum):
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    THESIS_APPROVED = "thesis_approved"
    THESIS_REJECTED = "thesis_rejected"
    EXTRACTION_COMPLETED = "extraction_completed"
    EXTRACTION_FAILED = "extraction_failed"
    USER_CREATED = "user_created"
    ACCOUNT_ACTIVATED = "account_activated"
    ACCOUNT_DEACTIVATED = "account_deactivated"

class ReportReason(str, Enum):
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    COPYRIGHT_VIOLATION = "copyright_violation"
    SPAM = "spam"
    INCORRECT_METADATA = "incorrect_metadata"
    DUPLICATE_CONTENT = "duplicate_content"
    PRIVACY_VIOLATION = "privacy_violation"
    OTHER = "other"

class SearchOperator(str, Enum):
    AND = "and"
    OR = "or"
    NOT = "not"
    EXACT = "exact"
    FUZZY = "fuzzy"
    WILDCARD = "wildcard"

class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"

class SortField(str, Enum):
    # Thesis sorting
    TITLE = "title"
    AUTHOR = "author"
    DEFENSE_DATE = "defense_date"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    RELEVANCE = "relevance"
    DOWNLOAD_COUNT = "download_count"
    VIEW_COUNT = "view_count"
    UNIVERSITY = "university"
    FACULTY = "faculty"
    
    # User sorting
    FIRST_NAME = "first_name"
    LAST_NAME = "last_name"
    EMAIL = "email"
    ROLE = "role"
    LAST_LOGIN = "last_login"

class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"
    PDF = "pdf"
    RIS = "ris"
    BIBTEX = "bibtex"
    XML = "xml"

class LanguageCode(str, Enum):
    FRENCH = "fr"
    ARABIC = "ar"
    ENGLISH = "en"
    SPANISH = "es"
    TAMAZIGHT = "zgh"

class DegreeType(str, Enum):
    DOCTORATE = "doctorate"
    MEDICAL_DOCTORATE = "medical doctorate"
    MASTER = "master"

class DegreeCategory(str, Enum):
    RESEARCH = "research"
    PROFESSIONAL = "professional"
    HONORARY = "honorary"
    JOINT = "joint"
    INTERNATIONAL = "international"

class InstitutionType(str, Enum):
    UNIVERSITY = "university"
    GRANDE_ECOLE = "grande_ecole"
    INSTITUTE = "institute"
    RESEARCH_CENTER = "research_center"
    PRIVATE_SCHOOL = "private_school"
    INTERNATIONAL = "international"

class GeographicLevel(str, Enum):
    COUNTRY = "country"
    REGION = "region"
    PROVINCE = "province"
    CITY = "city"

class CategoryLevel(str, Enum):
    DOMAIN = "domain"         # Level 0: Sciences, Humanities, etc.
    DISCIPLINE = "discipline"  # Level 1: Physics, Mathematics, etc.
    SPECIALTY = "specialty"    # Level 2: Quantum Physics, Algebra, etc.
    SUBDISCIPLINE = "subdiscipline"  # Level 3: More specific areas

class KeywordType(str, Enum):
    GENERAL = "general"
    TECHNICAL = "technical"
    METHODOLOGICAL = "methodological"
    GEOGRAPHIC = "geographic"
    TEMPORAL = "temporal"

class AccessLevel(str, Enum):
    PUBLIC = "public"
    RESTRICTED = "restricted"
    PRIVATE = "private"
    EMBARGO = "embargo"

class ThesisType(str, Enum):
    INDIVIDUAL = "individual"
    COTUTELLE = "cotutelle"  # Joint supervision
    COLLABORATIVE = "collaborative"
    INDUSTRIAL = "industrial"

class ValidationStatus(str, Enum):
    VALID = "valid"
    INVALID = "invalid"
    WARNING = "warning"
    PENDING = "pending"

class ErrorSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class CacheStrategy(str, Enum):
    NO_CACHE = "no_cache"
    SHORT_TERM = "short_term"   # 5 minutes
    MEDIUM_TERM = "medium_term" # 1 hour
    LONG_TERM = "long_term"     # 24 hours
    PERMANENT = "permanent"     # Until manual invalidation

# =============================================================================
# PYDANTIC MODELS
# =============================================================================
# Base Models
class BaseResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    pages: int

class PaginatedResponse(BaseResponse):
    data: List[Any]
    meta: PaginationMeta

class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str
    code: Optional[str] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Authentication Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseResponse):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

# User Models
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    language: LanguageCode = LanguageCode.FRENCH
    timezone: str = Field("Africa/Casablanca", max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    university_id: Optional[UUID4] = None
    faculty_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None
    school_id: Optional[UUID4] = None
    role: UserRole = UserRole.USER

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    title: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    language: Optional[LanguageCode] = None
    timezone: Optional[str] = Field(None, max_length=50)
    university_id: Optional[UUID4] = None
    faculty_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None
    school_id: Optional[UUID4] = None

class UserResponse(UserBase):
    id: UUID4
    role: UserRole
    email_verified: bool
    is_active: bool
    university_id: Optional[UUID4] = None
    faculty_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None
    school_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime

# Geographic Entity Models
class GeographicEntityBase(BaseModel):
    name_fr: str = Field(..., min_length=1, max_length=100)
    name_en: Optional[str] = Field(None, max_length=100)
    name_ar: Optional[str] = Field(None, max_length=100)
    parent_id: Optional[UUID4] = None
    level: GeographicLevel
    code: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

class GeographicEntityCreate(GeographicEntityBase):
    pass

class GeographicEntityUpdate(BaseModel):
    name_fr: Optional[str] = Field(None, min_length=1, max_length=100)
    name_en: Optional[str] = Field(None, max_length=100)
    name_ar: Optional[str] = Field(None, max_length=100)
    parent_id: Optional[UUID4] = None
    level: Optional[GeographicLevel] = None
    code: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

class GeographicEntityResponse(GeographicEntityBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# University Models
class UniversityBase(BaseModel):
    name_fr: str = Field(..., min_length=1, max_length=255)
    name_en: Optional[str] = Field(None, max_length=255)
    name_ar: Optional[str] = Field(None, max_length=255)
    acronym: Optional[str] = Field(None, max_length=20)
    geographic_entities_id: Optional[UUID4] = None

class UniversityCreate(UniversityBase):
    pass

class UniversityUpdate(BaseModel):
    name_fr: Optional[str] = Field(None, min_length=1, max_length=255)
    name_en: Optional[str] = Field(None, max_length=255)
    name_ar: Optional[str] = Field(None, max_length=255)
    acronym: Optional[str] = Field(None, max_length=20)
    geographic_entities_id: Optional[UUID4] = None

class UniversityResponse(UniversityBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# Faculty Models
class FacultyBase(BaseModel):
    university_id: UUID4
    name_fr: str = Field(..., min_length=1, max_length=255)
    name_en: Optional[str] = Field(None, max_length=255)
    name_ar: Optional[str] = Field(None, max_length=255)
    acronym: Optional[str] = Field(None, max_length=50)

class FacultyCreate(FacultyBase):
    pass

class FacultyUpdate(BaseModel):
    university_id: Optional[UUID4] = None
    name_fr: Optional[str] = Field(None, min_length=1, max_length=255)
    name_en: Optional[str] = Field(None, max_length=255)
    name_ar: Optional[str] = Field(None, max_length=255)
    acronym: Optional[str] = Field(None, max_length=50)

class FacultyResponse(FacultyBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# School Models
class SchoolBase(BaseModel):
    name_fr: str = Field(..., min_length=1, max_length=500)
    name_en: Optional[str] = Field(None, max_length=500)
    name_ar: Optional[str] = Field(None, max_length=500)
    acronym: Optional[str] = Field(None, max_length=20)
    parent_university_id: Optional[UUID4] = None
    parent_school_id: Optional[UUID4] = None

class SchoolCreate(SchoolBase):
    pass

class SchoolUpdate(BaseModel):
    name_fr: Optional[str] = Field(None, min_length=1, max_length=500)
    name_en: Optional[str] = Field(None, max_length=500)
    name_ar: Optional[str] = Field(None, max_length=500)
    acronym: Optional[str] = Field(None, max_length=20)
    parent_university_id: Optional[UUID4] = None
    parent_school_id: Optional[UUID4] = None

class SchoolResponse(SchoolBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# Department Models
class DepartmentBase(BaseModel):
    faculty_id: Optional[UUID4] = None
    school_id: Optional[UUID4] = None
    name_fr: str = Field(..., min_length=1, max_length=255)
    name_en: Optional[str] = Field(None, max_length=255)
    name_ar: Optional[str] = Field(None, max_length=255)
    acronym: Optional[str] = Field(None, max_length=20)

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    faculty_id: Optional[UUID4] = None
    school_id: Optional[UUID4] = None
    name_fr: Optional[str] = Field(None, min_length=1, max_length=255)
    name_en: Optional[str] = Field(None, max_length=255)
    name_ar: Optional[str] = Field(None, max_length=255)
    acronym: Optional[str] = Field(None, max_length=20)

class DepartmentResponse(DepartmentBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# Degree Models
class DegreeBase(BaseModel):
    name_en: str = Field(..., min_length=1, max_length=255)
    name_fr: str = Field(..., min_length=1, max_length=255)
    name_ar: str = Field(..., min_length=1, max_length=255)
    abbreviation: str = Field(..., min_length=1, max_length=20)
    type: DegreeType
    category: Optional[DegreeCategory] = None

class DegreeCreate(DegreeBase):
    pass

class DegreeUpdate(BaseModel):
    name_en: Optional[str] = Field(None, min_length=1, max_length=255)
    name_fr: Optional[str] = Field(None, min_length=1, max_length=255)
    name_ar: Optional[str] = Field(None, min_length=1, max_length=255)
    abbreviation: Optional[str] = Field(None, min_length=1, max_length=20)
    type: Optional[DegreeType] = None
    category: Optional[DegreeCategory] = None

class DegreeResponse(DegreeBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# Language Models
class LanguageBase(BaseModel):
    code: LanguageCode
    name: str = Field(..., min_length=1, max_length=100)
    native_name: str = Field(..., min_length=1, max_length=100)
    rtl: bool = False
    is_active: bool = True
    display_order: int = Field(0, ge=0)

class LanguageCreate(LanguageBase):
    pass

class LanguageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    native_name: Optional[str] = Field(None, min_length=1, max_length=100)
    rtl: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = Field(None, ge=0)

class LanguageResponse(LanguageBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# Category Models
class CategoryBase(BaseModel):
    parent_id: Optional[UUID4] = None
    level: int = Field(0, ge=0, le=10)
    code: str = Field(..., min_length=1, max_length=50)
    name_fr: str = Field(..., min_length=1, max_length=255)
    name_en: Optional[str] = Field(None, max_length=255)
    name_ar: Optional[str] = Field(None, max_length=255)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    parent_id: Optional[UUID4] = None
    level: Optional[int] = Field(None, ge=0, le=10)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name_fr: Optional[str] = Field(None, min_length=1, max_length=255)
    name_en: Optional[str] = Field(None, max_length=255)
    name_ar: Optional[str] = Field(None, max_length=255)

class CategoryResponse(CategoryBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# Keyword Models
class KeywordBase(BaseModel):
    parent_keyword_id: Optional[UUID4] = None
    keyword_fr: str = Field(..., min_length=1, max_length=200)
    keyword_en: Optional[str] = Field(None, max_length=200)
    keyword_ar: Optional[str] = Field(None, max_length=200)
    category_id: Optional[UUID4] = None

class KeywordCreate(KeywordBase):
    pass

class KeywordUpdate(BaseModel):
    parent_keyword_id: Optional[UUID4] = None
    keyword_fr: Optional[str] = Field(None, min_length=1, max_length=200)
    keyword_en: Optional[str] = Field(None, max_length=200)
    keyword_ar: Optional[str] = Field(None, max_length=200)
    category_id: Optional[UUID4] = None

class KeywordResponse(KeywordBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# Academic Person Models
class AcademicPersonBase(BaseModel):
    complete_name_fr: Optional[str] = Field(None, max_length=100)
    complete_name_ar: Optional[str] = Field(None, max_length=100)
    first_name_fr: Optional[str] = Field(None, max_length=100)
    last_name_fr: Optional[str] = Field(None, max_length=100)
    first_name_ar: Optional[str] = Field(None, max_length=100)
    last_name_ar: Optional[str] = Field(None, max_length=100)
    title: Optional[str] = Field(None, max_length=10)
    university_id: Optional[UUID4] = None
    faculty_id: Optional[UUID4] = None
    school_id: Optional[UUID4] = None
    external_institution_name: Optional[str] = Field(None, max_length=255)
    external_institution_country: Optional[str] = Field(None, max_length=100)
    external_institution_type: Optional[str] = Field(None, max_length=50)
    user_id: Optional[UUID4] = None

class AcademicPersonCreate(AcademicPersonBase):
    pass

class AcademicPersonUpdate(BaseModel):
    complete_name_fr: Optional[str] = Field(None, max_length=100)
    complete_name_ar: Optional[str] = Field(None, max_length=100)
    first_name_fr: Optional[str] = Field(None, max_length=100)
    last_name_fr: Optional[str] = Field(None, max_length=100)
    first_name_ar: Optional[str] = Field(None, max_length=100)
    last_name_ar: Optional[str] = Field(None, max_length=100)
    title: Optional[str] = Field(None, max_length=10)
    university_id: Optional[UUID4] = None
    faculty_id: Optional[UUID4] = None
    school_id: Optional[UUID4] = None
    external_institution_name: Optional[str] = Field(None, max_length=255)
    external_institution_country: Optional[str] = Field(None, max_length=100)
    external_institution_type: Optional[str] = Field(None, max_length=50)
    user_id: Optional[UUID4] = None

class AcademicPersonResponse(AcademicPersonBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# Thesis Models
class ThesisBase(BaseModel):
    title_fr: str = Field(..., min_length=1, max_length=500)
    title_en: Optional[str] = Field(None, max_length=500)
    title_ar: Optional[str] = Field(None, max_length=500)
    abstract_fr: str = Field(..., min_length=1)
    abstract_en: Optional[str] = None
    abstract_ar: Optional[str] = None
    university_id: Optional[UUID4] = None
    faculty_id: Optional[UUID4] = None
    school_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None
    degree_id: Optional[UUID4] = None
    thesis_number: Optional[str] = Field(None, max_length=100)
    study_location_id: Optional[UUID4] = None
    defense_date: date
    language_id: UUID4
    secondary_language_ids: Optional[List[UUID4]] = Field(default_factory=list)
    page_count: Optional[int] = Field(None, ge=1)
    status: ThesisStatus = ThesisStatus.DRAFT

class ThesisCreate(ThesisBase):
    file_id: str  # From file upload response

class ThesisUpdate(BaseModel):
    title_fr: Optional[str] = Field(None, min_length=1, max_length=500)
    title_en: Optional[str] = Field(None, max_length=500)
    title_ar: Optional[str] = Field(None, max_length=500)
    abstract_fr: Optional[str] = Field(None, min_length=1)
    abstract_en: Optional[str] = None
    abstract_ar: Optional[str] = None
    university_id: Optional[UUID4] = None
    faculty_id: Optional[UUID4] = None
    school_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None
    degree_id: Optional[UUID4] = None
    thesis_number: Optional[str] = Field(None, max_length=100)
    study_location_id: Optional[UUID4] = None
    defense_date: Optional[date] = None
    language_id: Optional[UUID4] = None
    secondary_language_ids: Optional[List[UUID4]] = None
    page_count: Optional[int] = Field(None, ge=1)
    status: Optional[ThesisStatus] = None

class ThesisResponse(ThesisBase):
    id: UUID4
    file_url: str
    file_name: str
    submitted_by: Optional[UUID4] = None
    extraction_job_id: UUID4
    created_at: datetime
    updated_at: datetime

# Thesis Relationship Models
class ThesisAcademicPersonBase(BaseModel):
    thesis_id: UUID4
    person_id: UUID4
    role: AcademicRole
    faculty_id: Optional[UUID4] = None
    is_external: bool = False
    external_institution_name: Optional[str] = Field(None, max_length=255)

class ThesisAcademicPersonCreate(ThesisAcademicPersonBase):
    pass

class ThesisAcademicPersonResponse(ThesisAcademicPersonBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

class ThesisCategoryBase(BaseModel):
    thesis_id: UUID4
    category_id: UUID4
    is_primary: bool = False

class ThesisCategoryCreate(ThesisCategoryBase):
    pass

class ThesisCategoryResponse(ThesisCategoryBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

class ThesisKeywordBase(BaseModel):
    thesis_id: UUID4
    keyword_id: UUID4
    keyword_position: Optional[int] = Field(None, ge=1)

class ThesisKeywordCreate(ThesisKeywordBase):
    pass

class ThesisKeywordResponse(ThesisKeywordBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

# Search and Filter Models
class SearchRequest(BaseModel):
    q: Optional[str] = Field(None, max_length=500)
    title: Optional[str] = Field(None, max_length=500)
    author: Optional[str] = Field(None, max_length=200)
    abstract: Optional[str] = Field(None, max_length=1000)
    keywords: Optional[str] = Field(None, max_length=500)
    university_id: Optional[UUID4] = None
    faculty_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None
    category_id: Optional[UUID4] = None
    degree_id: Optional[UUID4] = None
    language_id: Optional[UUID4] = None
    year_from: Optional[int] = Field(None, ge=1900, le=2050)
    year_to: Optional[int] = Field(None, ge=1900, le=2050)
    defense_date_from: Optional[date] = None
    defense_date_to: Optional[date] = None
    page_count_min: Optional[int] = Field(None, ge=1)
    page_count_max: Optional[int] = Field(None, ge=1)
    sort_field: SortField = SortField.CREATED_AT
    sort_order: SortOrder = SortOrder.DESC
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)

# File Models
class FileUploadResponse(BaseResponse):
    file_id: str
    original_filename: str
    temp_filename: str
    file_size: int
    file_hash: str
    extraction_job_id: UUID4

class StatisticsResponse(BaseModel):
    total_theses: int = 0
    total_universities: int = 0
    total_faculties: int = 0
    total_authors: int = 0
    recent_theses: List[Dict[str, Any]] = Field(default_factory=list)
    popular_categories: List[Dict[str, Any]] = Field(default_factory=list)
    top_universities: List[Dict[str, Any]] = Field(default_factory=list)

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def generate_request_id() -> str:
    """Generate unique request ID for tracking"""
    return str(uuid.uuid4())[:8]

def format_validation_error(exc: RequestValidationError) -> dict:
    """Format Pydantic validation errors"""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(x) for x in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "code": error["type"]
        })
    return {
        "code": "VALIDATION_ERROR",
        "message": "Request validation failed",
        "details": errors
    }

def create_error_response(
    code: str, 
    message: str, 
    details: dict = None, 
    request_id: str = None
) -> dict:
    """Create standardized error response"""
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or {}
        },
        "request_id": request_id,
        "timestamp": datetime.utcnow().isoformat()
    }

def create_success_response(
    data: Any = None, 
    message: str = None, 
    request_id: str = None
) -> dict:
    """Create standardized success response"""
    response = {
        "success": True,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if data is not None:
        response["data"] = data
    if message:
        response["message"] = message
    if request_id:
        response["request_id"] = request_id
        
    return response

def create_paginated_response(
    data: List[Any],
    total: int,
    page: int,
    limit: int,
    request_id: str = None
) -> dict:
    """Create paginated response"""
    pages = (total + limit - 1) // limit  # Ceiling division
    
    return {
        "success": True,
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages
        },
        "request_id": request_id,
        "timestamp": datetime.utcnow().isoformat()
    }

# Application start time for uptime calculation
APP_START_TIME = datetime.utcnow()

def check_storage_health():
    """Check file storage directories health"""
    storage_dirs = {
        "temp": TEMP_UPLOAD_DIR,
        "published": PUBLISHED_DIR,
        "bulk": BULK_UPLOAD_DIR
    }
    
    storage_status = {}
    all_healthy = True
    
    for name, path in storage_dirs.items():
        try:
            exists = path.exists()
            is_dir = path.is_dir() if exists else False
            is_writable = os.access(path, os.W_OK) if exists else False
            
            # Count PDF files
            file_count = len(list(path.glob("*.pdf"))) if exists and is_dir else 0
            
            storage_status[name] = {
                "path": str(path),
                "exists": exists,
                "is_directory": is_dir,
                "is_writable": is_writable,
                "file_count": file_count,
                "healthy": exists and is_dir and is_writable
            }
            
            if not (exists and is_dir and is_writable):
                all_healthy = False
                
        except Exception as e:
            storage_status[name] = {
                "path": str(path),
                "healthy": False,
                "error": str(e)
            }
            all_healthy = False
    
    return {
        "healthy": all_healthy,
        "directories": storage_status
    }

def calculate_uptime():
    """Calculate application uptime"""
    uptime = datetime.utcnow() - APP_START_TIME
    total_seconds = int(uptime.total_seconds())
    
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    
    return {
        "start_time": APP_START_TIME.isoformat() + "Z",
        "total_seconds": total_seconds,
        "formatted": f"{days}d {hours}h {minutes}m {seconds}s"
    }

# =============================================================================
# FASTAPI APPLICATION
# =============================================================================

def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="A comprehensive thesis management and search platform for Moroccan universities",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    
    # Add request ID middleware
    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        request_id = generate_request_id()
        request.state.request_id = request_id
        
        # Add request ID to response headers
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        # Log request details
        logger.info(
            f"Request {request_id}: {request.method} {request.url.path} - "
            f"Status: {response.status_code}"
        )
        
        return response
    
    return app

# Create FastAPI application instance
app = create_app()

# =============================================================================
# ERROR HANDLING
# =============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    request_id = getattr(request.state, "request_id", None)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            code=f"HTTP_{exc.status_code}",
            message=exc.detail,
            request_id=request_id
        )
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    request_id = getattr(request.state, "request_id", None)
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=create_error_response(
            code="VALIDATION_ERROR",
            message="Request validation failed",
            details=format_validation_error(exc),
            request_id=request_id
        )
    )

@app.exception_handler(StarletteHTTPException)
async def starlette_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle Starlette HTTP exceptions"""
    request_id = getattr(request.state, "request_id", None)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
            request_id=request_id
        )
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    request_id = getattr(request.state, "request_id", None)
    
    # Log the full exception for debugging
    logger.error(f"Unexpected error in request {request_id}: {str(exc)}", exc_info=True)
    
    # Don't expose internal errors in production
    error_message = str(exc) if settings.DEBUG else "Internal server error"
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=create_error_response(
            code="INTERNAL_ERROR",
            message=error_message,
            request_id=request_id
        )
    )

# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/health", tags=["Health"])
async def health_check(request: Request):
    """
    Basic health check endpoint
    
    Returns overall system health including:
    - API status
    - Database connectivity  
    - File storage status
    - Version and uptime info
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Check components
    db_health = check_database_health()
    storage_health = check_storage_health()
    uptime_info = calculate_uptime()
    
    # Determine overall status
    overall_healthy = db_health["healthy"] and storage_health["healthy"]
    overall_status = "healthy" if overall_healthy else "unhealthy"
    
    # Set HTTP status code
    status_code = status.HTTP_200_OK if overall_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    
    response_data = {
        "status": overall_status,
        "version": settings.APP_VERSION,
        "environment": "development" if settings.DEBUG else "production",
        "uptime": uptime_info["formatted"],
        "uptime_seconds": uptime_info["total_seconds"],
        "database": {
            "connected": db_health.get("connected", False),
            "healthy": db_health["healthy"]
        },
        "file_storage": {
            "healthy": storage_health["healthy"],
            "temp_dir": storage_health["directories"].get("temp", {}).get("healthy", False),
            "published_dir": storage_health["directories"].get("published", {}).get("healthy", False),
            "bulk_dir": storage_health["directories"].get("bulk", {}).get("healthy", False)
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    return JSONResponse(
        status_code=status_code,
        content=create_success_response(
            data=response_data,
            message=f"Service is {overall_status}",
            request_id=request_id
        )
    )

@app.get("/health/db", tags=["Health"])
async def database_health_check(request: Request):
    """
    Detailed database health check
    
    Returns:
    - Connection status
    - PostgreSQL version
    - Table verification
    - Record counts
    - Connection pool stats
    """
    request_id = getattr(request.state, "request_id", None)
    
    db_health = check_database_health()
    
    status_code = status.HTTP_200_OK if db_health["healthy"] else status.HTTP_503_SERVICE_UNAVAILABLE
    
    # Remove the 'healthy' key for cleaner response
    response_data = {k: v for k, v in db_health.items() if k != "healthy"}
    
    return JSONResponse(
        status_code=status_code,
        content=create_success_response(
            data=response_data,
            message=f"Database is {'healthy' if db_health['healthy'] else 'unhealthy'}",
            request_id=request_id
        )
    )

@app.get("/health/ready", tags=["Health"])
async def readiness_check(request: Request):
    """
    Application readiness check
    
    Verifies the application is ready to handle requests:
    - Database connection established
    - Storage directories accessible
    - Minimum uptime reached (5 seconds)
    
    Used for deployment orchestration (k8s, docker-compose, etc.)
    """
    request_id = getattr(request.state, "request_id", None)
    
    checks = {
        "database": False,
        "storage": False,
        "minimum_uptime": False
    }
    
    issues = []
    
    # Check database
    db_health = check_database_health()
    checks["database"] = db_health.get("connected", False)
    if not checks["database"]:
        issues.append("Database not connected")
    
    # Check storage
    storage_health = check_storage_health()
    checks["storage"] = storage_health["healthy"]
    if not checks["storage"]:
        issues.append("Storage directories not ready")
    
    # Check minimum uptime (5 seconds)
    uptime_info = calculate_uptime()
    checks["minimum_uptime"] = uptime_info["total_seconds"] >= 5
    if not checks["minimum_uptime"]:
        issues.append(f"Insufficient uptime: {uptime_info['total_seconds']}s < 5s")
    
    # Overall readiness
    is_ready = all(checks.values())
    
    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    
    response_data = {
        "ready": is_ready,
        "checks": checks,
        "issues": issues if not is_ready else [],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    return JSONResponse(
        status_code=status_code,
        content=create_success_response(
            data=response_data,
            message="Application is ready" if is_ready else "Application not ready",
            request_id=request_id
        )
    )

# =============================================================================
# AUTHENTICATION & AUTHORIZATION
# =============================================================================

@app.post("/auth/login", response_model=LoginResponse, tags=["Authentication"])
async def login(request: Request, login_data: LoginRequest):
    """
    User login endpoint
    
    Authenticates user with email and password.
    Supports both existing database users and newly created users.
    Returns JWT access and refresh tokens.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Authenticate user
    user = authenticate_user(login_data.email, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user["id"]), "email": user["email"], "role": user["role"]}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user["id"]), "email": user["email"]}
    )
    
    # Create session record
    try:
        session_id = str(uuid.uuid4())
        session_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        
        query = """
            INSERT INTO user_sessions (
                id, user_id, token_hash, ip_address, user_agent, 
                expires_at, created_at, last_used_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s
            )
        """
        
        # Get client info
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "Unknown")
        expires_at = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        
        execute_query(
            query,
            (
                session_id,
                user["id"],
                session_token_hash,
                client_ip,
                user_agent,
                expires_at,
                datetime.utcnow(),
                datetime.utcnow()
            )
        )
        
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        # Continue anyway - tokens are valid
    
    # Prepare user data for response (exclude sensitive fields)
    user_data = {
        "id": str(user["id"]),
        "email": user["email"],
        "username": user["username"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "title": user["title"],
        "role": user["role"],
        "email_verified": user.get("email_verified", False),
        "university_id": str(user["university_id"]) if user.get("university_id") else None,
        "faculty_id": str(user["faculty_id"]) if user.get("faculty_id") else None,
        "department_id": str(user["department_id"]) if user.get("department_id") else None,
        "school_id": str(user["school_id"]) if user.get("school_id") else None
    }
    
    return LoginResponse(
        success=True,
        message="Login successful",
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_data
    )

@app.post("/auth/logout", response_model=BaseResponse, tags=["Authentication"])
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    """
    User logout endpoint
    
    Invalidates the current session.
    Requires valid access token.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Get token from request header
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
            # Hash the token to match stored session (if using refresh token for session tracking)
            # For now, we'll invalidate all user sessions for security
            query = """
                DELETE FROM user_sessions 
                WHERE user_id = %s
            """
            
            execute_query(query, (current_user["id"],))
            
            logger.info(f"User {current_user['email']} logged out successfully")
        
        return BaseResponse(
            success=True,
            message="Logged out successfully"
        )
        
    except Exception as e:
        logger.error(f"Logout error for user {current_user.get('email', 'unknown')}: {e}")
        # Still return success - client should discard tokens
        return BaseResponse(
            success=True,
            message="Logged out successfully"
        )

@app.post("/auth/refresh", response_model=LoginResponse, tags=["Authentication"])
async def refresh_token(request: Request, refresh_data: TokenRefreshRequest):
    """
    Refresh access token
    
    Uses refresh token to generate new access token.
    Refresh token must be valid and not expired.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Verify refresh token
    payload = verify_token(refresh_data.refresh_token, token_type="refresh")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    # Get user from database to ensure still active
    user_id = payload.get("sub")
    user = get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Check if session exists and is valid
    session_token_hash = hashlib.sha256(refresh_data.refresh_token.encode()).hexdigest()
    
    query = """
        SELECT id, expires_at 
        FROM user_sessions 
        WHERE user_id = %s AND token_hash = %s
    """
    
    session = execute_query(query, (user["id"], session_token_hash), fetch_one=True)
    
    if not session:
        # Session doesn't exist - might have been logged out
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found. Please login again."
        )
    
    # Update last used time
    update_query = """
        UPDATE user_sessions 
        SET last_used_at = %s 
        WHERE id = %s
    """
    execute_query(update_query, (datetime.utcnow(), session["id"]))
    
    # Create new tokens
    new_access_token = create_access_token(
        data={"sub": str(user["id"]), "email": user["email"], "role": user["role"]}
    )
    
    # Optionally create new refresh token (rotating refresh tokens for better security)
    new_refresh_token = create_refresh_token(
        data={"sub": str(user["id"]), "email": user["email"]}
    )
    
    # Update session with new refresh token hash
    new_token_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()
    update_token_query = """
        UPDATE user_sessions 
        SET token_hash = %s, last_used_at = %s 
        WHERE id = %s
    """
    execute_query(update_token_query, (new_token_hash, datetime.utcnow(), session["id"]))
    
    # Prepare user data
    user_data = {
        "id": str(user["id"]),
        "email": user["email"],
        "username": user["username"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "title": user["title"],
        "role": user["role"],
        "email_verified": user.get("email_verified", False),
        "university_id": str(user["university_id"]) if user.get("university_id") else None,
        "faculty_id": str(user["faculty_id"]) if user.get("faculty_id") else None,
        "department_id": str(user["department_id"]) if user.get("department_id") else None,
        "school_id": str(user["school_id"]) if user.get("school_id") else None
    }
    
    return LoginResponse(
        success=True,
        message="Token refreshed successfully",
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_data
    )

@app.get("/auth/profile", response_model=UserResponse, tags=["Authentication"])
async def get_profile(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Get current user profile
    
    Returns authenticated user's profile information.
    Requires valid access token.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Get fresh user data from database
    user = get_user_by_id(current_user["id"])
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Convert to UserResponse format
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        title=user["title"],
        phone=user.get("phone"),
        language=user.get("language", "fr"),
        timezone=user.get("timezone", "Africa/Casablanca"),
        role=user["role"],
        email_verified=user.get("email_verified", False),
        is_active=user.get("is_active", True),
        university_id=user.get("university_id"),
        faculty_id=user.get("faculty_id"),
        department_id=user.get("department_id"),
        school_id=user.get("school_id"),
        created_at=user["created_at"],
        updated_at=user["updated_at"]
    )

@app.put("/auth/profile", response_model=UserResponse, tags=["Authentication"])
async def update_profile(
    request: Request,
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current user profile
    
    Allows users to update their own profile information.
    Email and role cannot be changed through this endpoint.
    Requires valid access token.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Build update query dynamically based on provided fields
    update_fields = []
    params = []
    
    if update_data.first_name is not None:
        update_fields.append("first_name = %s")
        params.append(update_data.first_name)
    
    if update_data.last_name is not None:
        update_fields.append("last_name = %s")
        params.append(update_data.last_name)
    
    if update_data.title is not None:
        update_fields.append("title = %s")
        params.append(update_data.title)
    
    if update_data.phone is not None:
        update_fields.append("phone = %s")
        params.append(update_data.phone)
    
    if update_data.language is not None:
        update_fields.append("language = %s")
        params.append(update_data.language.value)
    
    if update_data.timezone is not None:
        update_fields.append("timezone = %s")
        params.append(update_data.timezone)
    
    if update_data.university_id is not None:
        update_fields.append("university_id = %s")
        params.append(str(update_data.university_id) if update_data.university_id else None)
    
    if update_data.faculty_id is not None:
        update_fields.append("faculty_id = %s")
        params.append(str(update_data.faculty_id) if update_data.faculty_id else None)
    
    if update_data.department_id is not None:
        update_fields.append("department_id = %s")
        params.append(str(update_data.department_id) if update_data.department_id else None)
    
    if update_data.school_id is not None:
        update_fields.append("school_id = %s")
        params.append(str(update_data.school_id) if update_data.school_id else None)
    
    if not update_fields:
        # No fields to update
        return await get_profile(request, current_user)
    
    # Add updated_at and user_id to params
    update_fields.append("updated_at = %s")
    params.extend([datetime.utcnow(), current_user["id"]])
    
    # Execute update
    query = f"""
        UPDATE users 
        SET {', '.join(update_fields)}
        WHERE id = %s AND deleted_at IS NULL
        RETURNING id, email, username, first_name, last_name, title, phone,
                  language, timezone, role, email_verified, is_active,
                  university_id, faculty_id, department_id, school_id,
                  created_at, updated_at
    """
    
    updated_user = execute_query(query, params, fetch_one=True)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or update failed"
        )
    
    logger.info(f"User {current_user['email']} updated profile")
    
    # Return updated user data
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        username=updated_user["username"],
        first_name=updated_user["first_name"],
        last_name=updated_user["last_name"],
        title=updated_user["title"],
        phone=updated_user.get("phone"),
        language=updated_user.get("language", "fr"),
        timezone=updated_user.get("timezone", "Africa/Casablanca"),
        role=updated_user["role"],
        email_verified=updated_user.get("email_verified", False),
        is_active=updated_user.get("is_active", True),
        university_id=updated_user.get("university_id"),
        faculty_id=updated_user.get("faculty_id"),
        department_id=updated_user.get("department_id"),
        school_id=updated_user.get("school_id"),
        created_at=updated_user["created_at"],
        updated_at=updated_user["updated_at"]
    )

@app.post("/auth/change-password", response_model=BaseResponse, tags=["Authentication"])
async def change_password(
    request: Request,
    password_data: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Change user password
    
    Allows authenticated users to change their password.
    Requires current password for verification.
    """
    request_id = getattr(request.state, "request_id", None)
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    new_password_hash = hash_password(password_data.new_password)
    
    # Update password
    query = """
        UPDATE users 
        SET password_hash = %s, updated_at = %s 
        WHERE id = %s
    """
    
    execute_query(query, (new_password_hash, datetime.utcnow(), current_user["id"]))
    
    # Invalidate all existing sessions for security
    session_query = """
        DELETE FROM user_sessions 
        WHERE user_id = %s
    """
    execute_query(session_query, (current_user["id"],))
    
    logger.info(f"User {current_user['email']} changed password")
    
    return BaseResponse(
        success=True,
        message="Password changed successfully. Please login again with your new password."
    )

# =============================================================================
# ADMIN - REFERENCE DATA MANAGEMENT
# =============================================================================

# Universities (including retreiving tree of universities/faculties)
# =============================================================================

@app.get("/admin/universities", response_model=PaginatedResponse, tags=["Admin - Universities"])
async def get_admin_universities(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in name fields"),
    order_by: str = Query("name_fr", description="Field to order by"),
    order_dir: str = Query("asc", regex="^(asc|desc)$", description="Order direction"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    List all universities with pagination
    
    Admin endpoint to retrieve paginated list of universities.
    Supports search and sorting.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Build base query
        base_query = """
            SELECT u.*, g.name_fr as location_name 
            FROM universities u
            LEFT JOIN geographic_entities g ON u.geographic_entities_id = g.id
            WHERE 1=1
        """
        count_query = "SELECT COUNT(*) as total FROM universities u WHERE 1=1"
        
        params = []
        count_params = []
        param_index = 1
        
        # Add search filter if provided
        if search:
            search_condition = f"""
                AND (
                    LOWER(u.name_fr) LIKE LOWER(%s) OR
                    LOWER(u.name_ar) LIKE LOWER(%s) OR
                    LOWER(u.name_en) LIKE LOWER(%s) OR
                    LOWER(u.acronym) LIKE LOWER(%s)
                )
            """
            base_query += search_condition
            count_query += search_condition
            
            search_pattern = f"%{search}%"
            params.extend([search_pattern] * 4)
            count_params.extend([search_pattern] * 4)
            param_index += 4
        
        # Validate order_by field
        allowed_order_fields = ["name_fr", "name_ar", "name_en", "acronym", "created_at", "updated_at"]
        if order_by not in allowed_order_fields:
            order_by = "name_fr"
        
        # Add ordering
        base_query += f" ORDER BY u.{order_by} {order_dir.upper()}"
        
        # Add pagination
        offset = (page - 1) * limit
        base_query += f" LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        # Get total count
        total = execute_query(count_query, count_params, fetch_one=True)["total"]
        
        # Get paginated results
        results = execute_query_with_result(base_query, params)
        
        # Format results
        universities = []
        for row in results:
            universities.append({
                "id": str(row["id"]),
                "name_fr": row["name_fr"],
                "name_ar": row["name_ar"],
                "name_en": row["name_en"],
                "acronym": row["acronym"],
                "geographic_entities_id": str(row["geographic_entities_id"]) if row["geographic_entities_id"] else None,
                "location_name": row["location_name"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
            })
        
        # Calculate pagination meta
        pages = (total + limit - 1) // limit
        
        return PaginatedResponse(
            success=True,
            data=universities,
            meta=PaginationMeta(
                total=total,
                page=page,
                limit=limit,
                pages=pages
            )
        )
        
    except Exception as e:
        logger.error(f"Error fetching universities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch universities"
        )

@app.post("/admin/universities", response_model=UniversityResponse, tags=["Admin - Universities"])
async def create_university(
    request: Request,
    university_data: UniversityCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Create a new university
    
    Admin endpoint to create a new university in the system.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Generate new ID
        university_id = str(uuid.uuid4())
        
        # Insert new university
        query = """
            INSERT INTO universities (
                id, name_fr, name_ar, name_en, acronym, 
                geographic_entities_id, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING *
        """
        
        params = (
            university_id,
            university_data.name_fr,
            university_data.name_ar,
            university_data.name_en,
            university_data.acronym,
            str(university_data.geographic_entities_id) if university_data.geographic_entities_id else None,
            datetime.utcnow(),
            datetime.utcnow()
        )
        
        result = execute_query(query, params, fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create university"
            )
        
        logger.info(f"University created: {result['name_fr']} (ID: {university_id}) by {admin_user['email']}")
        
        return UniversityResponse(
            id=result["id"],
            name_fr=result["name_fr"],
            name_ar=result["name_ar"],
            name_en=result["name_en"],
            acronym=result["acronym"],
            geographic_entities_id=result["geographic_entities_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except Exception as e:
        logger.error(f"Error creating university: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create university: {str(e)}"
        )

@app.get("/admin/universities/{university_id}", response_model=UniversityResponse, tags=["Admin - Universities"])
async def get_university_by_id(
    request: Request,
    university_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get university by ID
    
    Admin endpoint to retrieve a specific university's details.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        query = """
            SELECT * FROM universities 
            WHERE id = %s
        """
        
        result = execute_query(query, (university_id,), fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="University not found"
            )
        
        return UniversityResponse(
            id=result["id"],
            name_fr=result["name_fr"],
            name_ar=result["name_ar"],
            name_en=result["name_en"],
            acronym=result["acronym"],
            geographic_entities_id=result["geographic_entities_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching university {university_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch university"
        )

@app.put("/admin/universities/{university_id}", response_model=UniversityResponse, tags=["Admin - Universities"])
async def update_university(
    request: Request,
    university_id: str,
    update_data: UniversityUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Update university
    
    Admin endpoint to update an existing university's information.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if university exists
        check_query = "SELECT id FROM universities WHERE id = %s"
        exists = execute_query(check_query, (university_id,), fetch_one=True)
        
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="University not found"
            )
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        if update_data.name_fr is not None:
            update_fields.append("name_fr = %s")
            params.append(update_data.name_fr)
        
        if update_data.name_ar is not None:
            update_fields.append("name_ar = %s")
            params.append(update_data.name_ar)
        
        if update_data.name_en is not None:
            update_fields.append("name_en = %s")
            params.append(update_data.name_en)
        
        if update_data.acronym is not None:
            update_fields.append("acronym = %s")
            params.append(update_data.acronym)
        
        if update_data.geographic_entities_id is not None:
            update_fields.append("geographic_entities_id = %s")
            params.append(str(update_data.geographic_entities_id) if update_data.geographic_entities_id else None)
        
        if not update_fields:
            # No fields to update, return existing
            return await get_university_by_id(request, university_id, admin_user)
        
        # Add updated_at
        update_fields.append("updated_at = %s")
        params.append(datetime.utcnow())
        
        # Add university_id to params
        params.append(university_id)
        
        # Execute update
        query = f"""
            UPDATE universities 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING *
        """
        
        result = execute_query(query, params, fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update university"
            )
        
        logger.info(f"University updated: {university_id} by {admin_user['email']}")
        
        return UniversityResponse(
            id=result["id"],
            name_fr=result["name_fr"],
            name_ar=result["name_ar"],
            name_en=result["name_en"],
            acronym=result["acronym"],
            geographic_entities_id=result["geographic_entities_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating university {university_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update university: {str(e)}"
        )

@app.delete("/admin/universities/{university_id}", response_model=BaseResponse, tags=["Admin - Universities"])
async def delete_university(
    request: Request,
    university_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Delete university
    
    Admin endpoint to delete a university.
    This will fail if the university has associated faculties or theses.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if university exists
        check_query = "SELECT name_fr FROM universities WHERE id = %s"
        university = execute_query(check_query, (university_id,), fetch_one=True)
        
        if not university:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="University not found"
            )
        
        # Check for dependencies - faculties
        faculty_check = "SELECT COUNT(*) as count FROM faculties WHERE university_id = %s"
        faculties = execute_query(faculty_check, (university_id,), fetch_one=True)
        
        if faculties["count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete university: {faculties['count']} faculties are associated with it"
            )
        
        # Check for dependencies - theses
        thesis_check = "SELECT COUNT(*) as count FROM theses WHERE university_id = %s"
        theses = execute_query(thesis_check, (university_id,), fetch_one=True)
        
        if theses["count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete university: {theses['count']} theses are associated with it"
            )
        
        # Delete university
        delete_query = "DELETE FROM universities WHERE id = %s"
        rows_affected = execute_query(delete_query, (university_id,))
        
        if rows_affected == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete university"
            )
        
        logger.info(f"University deleted: {university['name_fr']} (ID: {university_id}) by {admin_user['email']}")
        
        return BaseResponse(
            success=True,
            message=f"University '{university['name_fr']}' deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting university {university_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete university: {str(e)}"
        )

@app.get("/admin/universities/{university_id}/faculties", response_model=List[FacultyResponse], tags=["Admin - Universities"])
async def get_university_faculties(
    request: Request,
    university_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get all faculties of a university
    
    Admin endpoint to retrieve all faculties belonging to a specific university.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if university exists
        check_query = "SELECT id FROM universities WHERE id = %s"
        exists = execute_query(check_query, (university_id,), fetch_one=True)
        
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="University not found"
            )
        
        # Get faculties
        query = """
            SELECT * FROM faculties 
            WHERE university_id = %s
            ORDER BY name_fr ASC
        """
        
        results = execute_query_with_result(query, (university_id,))
        
        faculties = []
        for row in results:
            faculties.append(FacultyResponse(
                id=row["id"],
                university_id=row["university_id"],
                name_fr=row["name_fr"],
                name_ar=row["name_ar"],
                name_en=row["name_en"],
                acronym=row["acronym"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            ))
        
        return faculties
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching faculties for university {university_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch faculties"
        )
    

# Faculties (including retreiving tree of faculties/departments)
# =============================================================================

@app.get("/admin/faculties", response_model=PaginatedResponse, tags=["Admin - Faculties"])
async def get_admin_faculties(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in name fields"),
    university_id: Optional[str] = Query(None, description="Filter by university"),
    order_by: str = Query("name_fr", description="Field to order by"),
    order_dir: str = Query("asc", regex="^(asc|desc)$", description="Order direction"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    List all faculties with pagination
    
    Admin endpoint to retrieve paginated list of faculties.
    Supports search, filtering by university, and sorting.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Build base query
        base_query = """
            SELECT f.*, u.name_fr as university_name, u.acronym as university_acronym
            FROM faculties f
            INNER JOIN universities u ON f.university_id = u.id
            WHERE 1=1
        """
        count_query = "SELECT COUNT(*) as total FROM faculties f WHERE 1=1"
        
        params = []
        count_params = []
        
        # Add university filter if provided
        if university_id:
            university_condition = " AND f.university_id = %s"
            base_query += university_condition
            count_query += university_condition
            params.append(university_id)
            count_params.append(university_id)
        
        # Add search filter if provided
        if search:
            search_condition = """
                AND (
                    LOWER(f.name_fr) LIKE LOWER(%s) OR
                    LOWER(f.name_ar) LIKE LOWER(%s) OR
                    LOWER(f.name_en) LIKE LOWER(%s) OR
                    LOWER(f.acronym) LIKE LOWER(%s)
                )
            """
            base_query += search_condition
            count_query += search_condition
            
            search_pattern = f"%{search}%"
            params.extend([search_pattern] * 4)
            count_params.extend([search_pattern] * 4)
        
        # Validate order_by field
        allowed_order_fields = ["name_fr", "name_ar", "name_en", "acronym", "created_at", "updated_at"]
        if order_by not in allowed_order_fields:
            order_by = "name_fr"
        
        # Add ordering
        base_query += f" ORDER BY f.{order_by} {order_dir.upper()}"
        
        # Add pagination
        offset = (page - 1) * limit
        base_query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        # Get total count
        total = execute_query(count_query, count_params, fetch_one=True)["total"]
        
        # Get paginated results
        results = execute_query_with_result(base_query, params)
        
        # Format results
        faculties = []
        for row in results:
            faculties.append({
                "id": str(row["id"]),
                "university_id": str(row["university_id"]),
                "university_name": row["university_name"],
                "university_acronym": row["university_acronym"],
                "name_fr": row["name_fr"],
                "name_ar": row["name_ar"],
                "name_en": row["name_en"],
                "acronym": row["acronym"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
            })
        
        # Calculate pagination meta
        pages = (total + limit - 1) // limit
        
        return PaginatedResponse(
            success=True,
            data=faculties,
            meta=PaginationMeta(
                total=total,
                page=page,
                limit=limit,
                pages=pages
            )
        )
        
    except Exception as e:
        logger.error(f"Error fetching faculties: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch faculties"
        )

@app.post("/admin/faculties", response_model=FacultyResponse, tags=["Admin - Faculties"])
async def create_faculty(
    request: Request,
    faculty_data: FacultyCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Create a new faculty
    
    Admin endpoint to create a new faculty within a university.
    The specified university must exist.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Verify university exists
        check_query = "SELECT id, name_fr FROM universities WHERE id = %s"
        university = execute_query(check_query, (str(faculty_data.university_id),), fetch_one=True)
        
        if not university:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"University with ID {faculty_data.university_id} does not exist"
            )
        
        # Generate new ID
        faculty_id = str(uuid.uuid4())
        
        # Insert new faculty
        query = """
            INSERT INTO faculties (
                id, university_id, name_fr, name_ar, name_en, 
                acronym, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING *
        """
        
        params = (
            faculty_id,
            str(faculty_data.university_id),
            faculty_data.name_fr,
            faculty_data.name_ar,
            faculty_data.name_en,
            faculty_data.acronym,
            datetime.utcnow(),
            datetime.utcnow()
        )
        
        result = execute_query(query, params, fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create faculty"
            )
        
        logger.info(f"Faculty created: {result['name_fr']} (ID: {faculty_id}) in {university['name_fr']} by {admin_user['email']}")
        
        return FacultyResponse(
            id=result["id"],
            university_id=result["university_id"],
            name_fr=result["name_fr"],
            name_ar=result["name_ar"],
            name_en=result["name_en"],
            acronym=result["acronym"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create faculty: {str(e)}"
        )

@app.get("/admin/faculties/{faculty_id}", response_model=FacultyResponse, tags=["Admin - Faculties"])
async def get_faculty_by_id(
    request: Request,
    faculty_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get faculty by ID
    
    Admin endpoint to retrieve a specific faculty's details.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        query = """
            SELECT f.*, u.name_fr as university_name
            FROM faculties f
            INNER JOIN universities u ON f.university_id = u.id
            WHERE f.id = %s
        """
        
        result = execute_query(query, (faculty_id,), fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found"
            )
        
        return FacultyResponse(
            id=result["id"],
            university_id=result["university_id"],
            name_fr=result["name_fr"],
            name_ar=result["name_ar"],
            name_en=result["name_en"],
            acronym=result["acronym"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching faculty {faculty_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch faculty"
        )

@app.put("/admin/faculties/{faculty_id}", response_model=FacultyResponse, tags=["Admin - Faculties"])
async def update_faculty(
    request: Request,
    faculty_id: str,
    update_data: FacultyUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Update faculty
    
    Admin endpoint to update an existing faculty's information.
    Can also move faculty to a different university.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if faculty exists
        check_query = "SELECT id FROM faculties WHERE id = %s"
        exists = execute_query(check_query, (faculty_id,), fetch_one=True)
        
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found"
            )
        
        # If changing university, verify new university exists
        if update_data.university_id is not None:
            uni_check = "SELECT id FROM universities WHERE id = %s"
            uni_exists = execute_query(uni_check, (str(update_data.university_id),), fetch_one=True)
            
            if not uni_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"University with ID {update_data.university_id} does not exist"
                )
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        if update_data.university_id is not None:
            update_fields.append("university_id = %s")
            params.append(str(update_data.university_id))
        
        if update_data.name_fr is not None:
            update_fields.append("name_fr = %s")
            params.append(update_data.name_fr)
        
        if update_data.name_ar is not None:
            update_fields.append("name_ar = %s")
            params.append(update_data.name_ar)
        
        if update_data.name_en is not None:
            update_fields.append("name_en = %s")
            params.append(update_data.name_en)
        
        if update_data.acronym is not None:
            update_fields.append("acronym = %s")
            params.append(update_data.acronym)
        
        if not update_fields:
            # No fields to update, return existing
            return await get_faculty_by_id(request, faculty_id, admin_user)
        
        # Add updated_at
        update_fields.append("updated_at = %s")
        params.append(datetime.utcnow())
        
        # Add faculty_id to params
        params.append(faculty_id)
        
        # Execute update
        query = f"""
            UPDATE faculties 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING *
        """
        
        result = execute_query(query, params, fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update faculty"
            )
        
        logger.info(f"Faculty updated: {faculty_id} by {admin_user['email']}")
        
        return FacultyResponse(
            id=result["id"],
            university_id=result["university_id"],
            name_fr=result["name_fr"],
            name_ar=result["name_ar"],
            name_en=result["name_en"],
            acronym=result["acronym"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating faculty {faculty_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update faculty: {str(e)}"
        )

@app.delete("/admin/faculties/{faculty_id}", response_model=BaseResponse, tags=["Admin - Faculties"])
async def delete_faculty(
    request: Request,
    faculty_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Delete faculty
    
    Admin endpoint to delete a faculty.
    This will fail if the faculty has associated departments or theses.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if faculty exists
        check_query = "SELECT name_fr FROM faculties WHERE id = %s"
        faculty = execute_query(check_query, (faculty_id,), fetch_one=True)
        
        if not faculty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found"
            )
        
        # Check for dependencies - departments
        dept_check = "SELECT COUNT(*) as count FROM departments WHERE faculty_id = %s"
        departments = execute_query(dept_check, (faculty_id,), fetch_one=True)
        
        if departments["count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete faculty: {departments['count']} departments are associated with it"
            )
        
        # Check for dependencies - theses
        thesis_check = "SELECT COUNT(*) as count FROM theses WHERE faculty_id = %s"
        theses = execute_query(thesis_check, (faculty_id,), fetch_one=True)
        
        if theses["count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete faculty: {theses['count']} theses are associated with it"
            )
        
        # Check for dependencies - academic persons
        person_check = "SELECT COUNT(*) as count FROM academic_persons WHERE faculty_id = %s"
        persons = execute_query(person_check, (faculty_id,), fetch_one=True)
        
        if persons["count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete faculty: {persons['count']} academic persons are associated with it"
            )
        
        # Delete faculty
        delete_query = "DELETE FROM faculties WHERE id = %s"
        rows_affected = execute_query(delete_query, (faculty_id,))
        
        if rows_affected == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete faculty"
            )
        
        logger.info(f"Faculty deleted: {faculty['name_fr']} (ID: {faculty_id}) by {admin_user['email']}")
        
        return BaseResponse(
            success=True,
            message=f"Faculty '{faculty['name_fr']}' deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting faculty {faculty_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete faculty: {str(e)}"
        )

@app.get("/admin/faculties/{faculty_id}/departments", response_model=List[DepartmentResponse], tags=["Admin - Faculties"])
async def get_faculty_departments(
    request: Request,
    faculty_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get all departments of a faculty
    
    Admin endpoint to retrieve all departments belonging to a specific faculty.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if faculty exists
        check_query = "SELECT id FROM faculties WHERE id = %s"
        exists = execute_query(check_query, (faculty_id,), fetch_one=True)
        
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found"
            )
        
        # Get departments
        query = """
            SELECT * FROM departments 
            WHERE faculty_id = %s
            ORDER BY name_fr ASC
        """
        
        results = execute_query_with_result(query, (faculty_id,))
        
        departments = []
        for row in results:
            departments.append(DepartmentResponse(
                id=row["id"],
                faculty_id=row["faculty_id"],
                school_id=row["school_id"],
                name_fr=row["name_fr"],
                name_ar=row["name_ar"],
                name_en=row["name_en"],
                acronym=row["acronym"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            ))
        
        return departments
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching departments for faculty {faculty_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch departments"
        )

# Schools
# =============================================================================

@app.get("/admin/schools", response_model=PaginatedResponse, tags=["Admin - Schools"])
async def get_admin_schools(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in name fields"),
    parent_university_id: Optional[str] = Query(None, description="Filter by parent university"),
    parent_school_id: Optional[str] = Query(None, description="Filter by parent school"),
    order_by: str = Query("name_fr", description="Field to order by"),
    order_dir: str = Query("asc", regex="^(asc|desc)$", description="Order direction"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    List all schools with pagination
    
    Admin endpoint to retrieve paginated list of schools.
    Supports search, filtering by parent (university or school), and sorting.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Build base query with parent information
        base_query = """
            SELECT 
                s.*,
                u.name_fr as university_name,
                u.acronym as university_acronym,
                ps.name_fr as parent_school_name,
                ps.acronym as parent_school_acronym
            FROM schools s
            LEFT JOIN universities u ON s.parent_university_id = u.id
            LEFT JOIN schools ps ON s.parent_school_id = ps.id
            WHERE 1=1
        """
        count_query = "SELECT COUNT(*) as total FROM schools s WHERE 1=1"
        
        params = []
        count_params = []
        
        # Add parent filters
        if parent_university_id:
            parent_uni_condition = " AND s.parent_university_id = %s"
            base_query += parent_uni_condition
            count_query += parent_uni_condition
            params.append(parent_university_id)
            count_params.append(parent_university_id)
        
        if parent_school_id:
            parent_school_condition = " AND s.parent_school_id = %s"
            base_query += parent_school_condition
            count_query += parent_school_condition
            params.append(parent_school_id)
            count_params.append(parent_school_id)
        
        # Add search filter if provided
        if search:
            search_condition = """
                AND (
                    LOWER(s.name_fr) LIKE LOWER(%s) OR
                    LOWER(s.name_ar) LIKE LOWER(%s) OR
                    LOWER(s.name_en) LIKE LOWER(%s) OR
                    LOWER(s.acronym) LIKE LOWER(%s)
                )
            """
            base_query += search_condition
            count_query += search_condition
            
            search_pattern = f"%{search}%"
            params.extend([search_pattern] * 4)
            count_params.extend([search_pattern] * 4)
        
        # Validate order_by field
        allowed_order_fields = ["name_fr", "name_ar", "name_en", "acronym", "created_at", "updated_at"]
        if order_by not in allowed_order_fields:
            order_by = "name_fr"
        
        # Add ordering
        base_query += f" ORDER BY s.{order_by} {order_dir.upper()}"
        
        # Add pagination
        offset = (page - 1) * limit
        base_query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        # Get total count
        total = execute_query(count_query, count_params, fetch_one=True)["total"]
        
        # Get paginated results
        results = execute_query_with_result(base_query, params)
        
        # Format results
        schools = []
        for row in results:
            school_data = {
                "id": str(row["id"]),
                "name_fr": row["name_fr"],
                "name_ar": row["name_ar"],
                "name_en": row["name_en"],
                "acronym": row["acronym"],
                "parent_university_id": str(row["parent_university_id"]) if row["parent_university_id"] else None,
                "parent_school_id": str(row["parent_school_id"]) if row["parent_school_id"] else None,
                "parent_type": "university" if row["parent_university_id"] else "school" if row["parent_school_id"] else None,
                "parent_name": row["university_name"] or row["parent_school_name"],
                "parent_acronym": row["university_acronym"] or row["parent_school_acronym"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
            }
            schools.append(school_data)
        
        # Calculate pagination meta
        pages = (total + limit - 1) // limit
        
        return PaginatedResponse(
            success=True,
            data=schools,
            meta=PaginationMeta(
                total=total,
                page=page,
                limit=limit,
                pages=pages
            )
        )
        
    except Exception as e:
        logger.error(f"Error fetching schools: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch schools"
        )

@app.post("/admin/schools", response_model=SchoolResponse, tags=["Admin - Schools"])
async def create_school(
    request: Request,
    school_data: SchoolCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Create a new school
    
    Admin endpoint to create a new school.
    A school must have either parent_university_id OR parent_school_id (not both).
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validate parent relationship (must have exactly one parent)
        if school_data.parent_university_id and school_data.parent_school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School cannot have both a parent university and a parent school"
            )
        
        if not school_data.parent_university_id and not school_data.parent_school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School must have either a parent university or a parent school"
            )
        
        # Verify parent exists
        if school_data.parent_university_id:
            check_query = "SELECT id, name_fr FROM universities WHERE id = %s"
            parent = execute_query(check_query, (str(school_data.parent_university_id),), fetch_one=True)
            
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"University with ID {school_data.parent_university_id} does not exist"
                )
            parent_type = "university"
            parent_name = parent["name_fr"]
        
        if school_data.parent_school_id:
            check_query = "SELECT id, name_fr FROM schools WHERE id = %s"
            parent = execute_query(check_query, (str(school_data.parent_school_id),), fetch_one=True)
            
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"School with ID {school_data.parent_school_id} does not exist"
                )
            parent_type = "school"
            parent_name = parent["name_fr"]
        
        # Generate new ID
        school_id = str(uuid.uuid4())
        
        # Insert new school
        query = """
            INSERT INTO schools (
                id, name_fr, name_ar, name_en, acronym,
                parent_university_id, parent_school_id, 
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING *
        """
        
        params = (
            school_id,
            school_data.name_fr,
            school_data.name_ar,
            school_data.name_en,
            school_data.acronym,
            str(school_data.parent_university_id) if school_data.parent_university_id else None,
            str(school_data.parent_school_id) if school_data.parent_school_id else None,
            datetime.utcnow(),
            datetime.utcnow()
        )
        
        result = execute_query(query, params, fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create school"
            )
        
        logger.info(f"School created: {result['name_fr']} (ID: {school_id}) under {parent_type} '{parent_name}' by {admin_user['email']}")
        
        return SchoolResponse(
            id=result["id"],
            name_fr=result["name_fr"],
            name_ar=result["name_ar"],
            name_en=result["name_en"],
            acronym=result["acronym"],
            parent_university_id=result["parent_university_id"],
            parent_school_id=result["parent_school_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating school: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create school: {str(e)}"
        )

@app.get("/admin/schools/{school_id}", response_model=SchoolResponse, tags=["Admin - Schools"])
async def get_school_by_id(
    request: Request,
    school_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get school by ID
    
    Admin endpoint to retrieve a specific school's details.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        query = """
            SELECT 
                s.*,
                u.name_fr as university_name,
                ps.name_fr as parent_school_name
            FROM schools s
            LEFT JOIN universities u ON s.parent_university_id = u.id
            LEFT JOIN schools ps ON s.parent_school_id = ps.id
            WHERE s.id = %s
        """
        
        result = execute_query(query, (school_id,), fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        return SchoolResponse(
            id=result["id"],
            name_fr=result["name_fr"],
            name_ar=result["name_ar"],
            name_en=result["name_en"],
            acronym=result["acronym"],
            parent_university_id=result["parent_university_id"],
            parent_school_id=result["parent_school_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching school {school_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch school"
        )

@app.put("/admin/schools/{school_id}", response_model=SchoolResponse, tags=["Admin - Schools"])
async def update_school(
    request: Request,
    school_id: str,
    update_data: SchoolUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Update school
    
    Admin endpoint to update an existing school's information.
    Can change parent relationship but must maintain exactly one parent.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if school exists
        check_query = "SELECT * FROM schools WHERE id = %s"
        existing = execute_query(check_query, (school_id,), fetch_one=True)
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        # Validate parent relationship changes
        new_parent_university = update_data.parent_university_id if update_data.parent_university_id is not None else existing["parent_university_id"]
        new_parent_school = update_data.parent_school_id if update_data.parent_school_id is not None else existing["parent_school_id"]
        
        if new_parent_university and new_parent_school:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School cannot have both a parent university and a parent school"
            )
        
        if not new_parent_university and not new_parent_school:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School must have either a parent university or a parent school"
            )
        
        # Verify new parents exist if changing
        if update_data.parent_university_id is not None and update_data.parent_university_id:
            uni_check = "SELECT id FROM universities WHERE id = %s"
            uni_exists = execute_query(uni_check, (str(update_data.parent_university_id),), fetch_one=True)
            
            if not uni_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"University with ID {update_data.parent_university_id} does not exist"
                )
        
        if update_data.parent_school_id is not None and update_data.parent_school_id:
            # Check for circular reference (can't be parent of itself)
            if str(update_data.parent_school_id) == school_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="School cannot be its own parent"
                )
            
            school_check = "SELECT id FROM schools WHERE id = %s"
            school_exists = execute_query(school_check, (str(update_data.parent_school_id),), fetch_one=True)
            
            if not school_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"School with ID {update_data.parent_school_id} does not exist"
                )
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        if update_data.name_fr is not None:
            update_fields.append("name_fr = %s")
            params.append(update_data.name_fr)
        
        if update_data.name_ar is not None:
            update_fields.append("name_ar = %s")
            params.append(update_data.name_ar)
        
        if update_data.name_en is not None:
            update_fields.append("name_en = %s")
            params.append(update_data.name_en)
        
        if update_data.acronym is not None:
            update_fields.append("acronym = %s")
            params.append(update_data.acronym)
        
        if update_data.parent_university_id is not None:
            update_fields.append("parent_university_id = %s")
            params.append(str(update_data.parent_university_id) if update_data.parent_university_id else None)
        
        if update_data.parent_school_id is not None:
            update_fields.append("parent_school_id = %s")
            params.append(str(update_data.parent_school_id) if update_data.parent_school_id else None)
        
        if not update_fields:
            # No fields to update, return existing
            return await get_school_by_id(request, school_id, admin_user)
        
        # Add updated_at
        update_fields.append("updated_at = %s")
        params.append(datetime.utcnow())
        
        # Add school_id to params
        params.append(school_id)
        
        # Execute update
        query = f"""
            UPDATE schools 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING *
        """
        
        result = execute_query(query, params, fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update school"
            )
        
        logger.info(f"School updated: {school_id} by {admin_user['email']}")
        
        return SchoolResponse(
            id=result["id"],
            name_fr=result["name_fr"],
            name_ar=result["name_ar"],
            name_en=result["name_en"],
            acronym=result["acronym"],
            parent_university_id=result["parent_university_id"],
            parent_school_id=result["parent_school_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating school {school_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update school: {str(e)}"
        )

@app.delete("/admin/schools/{school_id}", response_model=BaseResponse, tags=["Admin - Schools"])
async def delete_school(
    request: Request,
    school_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Delete school
    
    Admin endpoint to delete a school.
    This will fail if the school has child schools, departments, or theses.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if school exists
        check_query = "SELECT name_fr FROM schools WHERE id = %s"
        school = execute_query(check_query, (school_id,), fetch_one=True)
        
        if not school:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        # Check for dependencies - child schools
        child_check = "SELECT COUNT(*) as count FROM schools WHERE parent_school_id = %s"
        children = execute_query(child_check, (school_id,), fetch_one=True)
        
        if children["count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete school: {children['count']} child schools depend on it"
            )
        
        # Check for dependencies - departments
        dept_check = "SELECT COUNT(*) as count FROM departments WHERE school_id = %s"
        departments = execute_query(dept_check, (school_id,), fetch_one=True)
        
        if departments["count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete school: {departments['count']} departments are associated with it"
            )
        
        # Check for dependencies - theses
        thesis_check = "SELECT COUNT(*) as count FROM theses WHERE school_id = %s"
        theses = execute_query(thesis_check, (school_id,), fetch_one=True)
        
        if theses["count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete school: {theses['count']} theses are associated with it"
            )
        
        # Check for dependencies - academic persons
        person_check = "SELECT COUNT(*) as count FROM academic_persons WHERE school_id = %s"
        persons = execute_query(person_check, (school_id,), fetch_one=True)
        
        if persons["count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete school: {persons['count']} academic persons are associated with it"
            )
        
        # Delete school
        delete_query = "DELETE FROM schools WHERE id = %s"
        rows_affected = execute_query(delete_query, (school_id,))
        
        if rows_affected == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete school"
            )
        
        logger.info(f"School deleted: {school['name_fr']} (ID: {school_id}) by {admin_user['email']}")
        
        return BaseResponse(
            success=True,
            message=f"School '{school['name_fr']}' deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting school {school_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete school: {str(e)}"
        )

@app.get("/admin/schools/tree", response_model=List[Dict], tags=["Admin - Schools"])
async def get_schools_tree(
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get schools hierarchy tree
    
    Returns schools organized in a tree structure showing parent-child relationships.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Get all schools with parent info
        query = """
            SELECT 
                s.*,
                u.name_fr as university_name,
                ps.name_fr as parent_school_name
            FROM schools s
            LEFT JOIN universities u ON s.parent_university_id = u.id
            LEFT JOIN schools ps ON s.parent_school_id = ps.id
            ORDER BY s.name_fr
        """
        
        schools = execute_query_with_result(query)
        
        # Build tree structure
        def build_school_node(school):
            return {
                "id": str(school["id"]),
                "name_fr": school["name_fr"],
                "name_ar": school["name_ar"],
                "name_en": school["name_en"],
                "acronym": school["acronym"],
                "parent_type": "university" if school["parent_university_id"] else "school",
                "parent_id": str(school["parent_university_id"] or school["parent_school_id"]),
                "children": []
            }
        
        # Group schools by parent
        university_schools = {}
        school_children = {}
        
        for school in schools:
            node = build_school_node(school)
            
            if school["parent_university_id"]:
                parent_id = str(school["parent_university_id"])
                if parent_id not in university_schools:
                    university_schools[parent_id] = []
                university_schools[parent_id].append(node)
            elif school["parent_school_id"]:
                parent_id = str(school["parent_school_id"])
                if parent_id not in school_children:
                    school_children[parent_id] = []
                school_children[parent_id].append(node)
        
        # Build hierarchical structure
        def add_children(node):
            school_id = node["id"]
            if school_id in school_children:
                node["children"] = school_children[school_id]
                for child in node["children"]:
                    add_children(child)
        
        # Build final tree
        tree = []
        
        # Get universities that have schools
        uni_query = "SELECT id, name_fr, acronym FROM universities ORDER BY name_fr"
        universities = execute_query_with_result(uni_query)
        
        for uni in universities:
            uni_id = str(uni["id"])
            if uni_id in university_schools:
                uni_node = {
                    "id": uni_id,
                    "name_fr": uni["name_fr"],
                    "acronym": uni["acronym"],
                    "type": "university",
                    "schools": university_schools[uni_id]
                }
                
                # Add children to each school
                for school in uni_node["schools"]:
                    add_children(school)
                
                tree.append(uni_node)
        
        return tree
        
    except Exception as e:
        logger.error(f"Error building schools tree: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to build schools tree"
        )

@app.get("/admin/schools/{school_id}/children", response_model=List[SchoolResponse], tags=["Admin - Schools"])
async def get_school_children(
    request: Request,
    school_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get child schools of a school
    
    Returns all schools that have this school as their parent.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if school exists
        check_query = "SELECT id FROM schools WHERE id = %s"
        exists = execute_query(check_query, (school_id,), fetch_one=True)
        
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        # Get child schools
        query = """
            SELECT * FROM schools 
            WHERE parent_school_id = %s
            ORDER BY name_fr ASC
        """
        
        results = execute_query_with_result(query, (school_id,))
        
        schools = []
        for row in results:
            schools.append(SchoolResponse(
                id=row["id"],
                name_fr=row["name_fr"],
                name_ar=row["name_ar"],
                name_en=row["name_en"],
                acronym=row["acronym"],
                parent_university_id=row["parent_university_id"],
                parent_school_id=row["parent_school_id"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            ))
        
        return schools
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching child schools for {school_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch child schools"
        )

@app.get("/admin/schools/{school_id}/departments", response_model=List[DepartmentResponse], tags=["Admin - Schools"])
async def get_school_departments(
    request: Request,
    school_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get all departments of a school
    
    Returns all departments belonging to this school.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if school exists
        check_query = "SELECT id FROM schools WHERE id = %s"
        exists = execute_query(check_query, (school_id,), fetch_one=True)
        
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        # Get departments
        query = """
            SELECT * FROM departments 
            WHERE school_id = %s
            ORDER BY name_fr ASC
        """
        
        results = execute_query_with_result(query, (school_id,))
        
        departments = []
        for row in results:
            departments.append(DepartmentResponse(
                id=row["id"],
                faculty_id=row["faculty_id"],
                school_id=row["school_id"],
                name_fr=row["name_fr"],
                name_ar=row["name_ar"],
                name_en=row["name_en"],
                acronym=row["acronym"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            ))
        
        return departments
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching departments for school {school_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch departments"
        )

# Departments
# =============================================================================

@app.get("/admin/departments", response_model=PaginatedResponse, tags=["Admin - Departments"])
@app.post("/admin/departments", response_model=DepartmentResponse, tags=["Admin - Departments"])
@app.get("/admin/departments/{department_id}", response_model=DepartmentResponse, tags=["Admin - Departments"])
@app.put("/admin/departments/{department_id}", response_model=DepartmentResponse, tags=["Admin - Departments"])
@app.delete("/admin/departments/{department_id}", response_model=BaseResponse, tags=["Admin - Departments"])

# Categories
# =============================================================================

@app.get("/admin/categories", response_model=PaginatedResponse, tags=["Admin - Categories"])
@app.post("/admin/categories", response_model=CategoryResponse, tags=["Admin - Categories"])
@app.get("/admin/categories/{category_id}", response_model=CategoryResponse, tags=["Admin - Categories"])
@app.put("/admin/categories/{category_id}", response_model=CategoryResponse, tags=["Admin - Categories"])
@app.delete("/admin/categories/{category_id}", response_model=BaseResponse, tags=["Admin - Categories"])
@app.get("/admin/categories/tree", response_model=List[Dict], tags=["Admin - Categories"])
@app.get("/admin/categories/{category_id}/subcategories", response_model=List[CategoryResponse], tags=["Admin - Categories"])

# Keywords
# =============================================================================

@app.get("/admin/keywords", response_model=PaginatedResponse, tags=["Admin - Keywords"])
@app.post("/admin/keywords", response_model=KeywordResponse, tags=["Admin - Keywords"])
@app.get("/admin/keywords/{keyword_id}", response_model=KeywordResponse, tags=["Admin - Keywords"])
@app.put("/admin/keywords/{keyword_id}", response_model=KeywordResponse, tags=["Admin - Keywords"])
@app.delete("/admin/keywords/{keyword_id}", response_model=BaseResponse, tags=["Admin - Keywords"])

# Academic persons
# =============================================================================

@app.get("/admin/academic-persons", response_model=PaginatedResponse, tags=["Admin - Academic Persons"])
async def get_admin_academic_persons(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in name fields"),
    university_id: Optional[str] = Query(None, description="Filter by university"),
    faculty_id: Optional[str] = Query(None, description="Filter by faculty"),
    school_id: Optional[str] = Query(None, description="Filter by school"),
    is_external: Optional[bool] = Query(None, description="Filter by external status"),
    order_by: str = Query("complete_name_fr", description="Field to order by"),
    order_dir: str = Query("asc", regex="^(asc|desc)$", description="Order direction"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    List all academic persons with pagination
    
    Admin endpoint to retrieve paginated list of academic persons.
    Supports search and filtering by institution.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Build base query with joins for institution names
        base_query = """
            SELECT 
                ap.id, ap.complete_name_fr, ap.complete_name_ar,
                ap.first_name_fr, ap.last_name_fr, ap.first_name_ar, ap.last_name_ar,
                ap.title, ap.university_id, ap.faculty_id, ap.school_id,
                ap.external_institution_name, ap.external_institution_country,
                ap.external_institution_type, ap.user_id,
                ap.created_at, ap.updated_at,
                u.name_fr as university_name,
                f.name_fr as faculty_name,
                s.name_fr as school_name
            FROM academic_persons ap
            LEFT JOIN universities u ON ap.university_id = u.id
            LEFT JOIN faculties f ON ap.faculty_id = f.id
            LEFT JOIN schools s ON ap.school_id = s.id
        """
        
        # Build WHERE conditions
        where_conditions = []
        params = []
        
        if search:
            where_conditions.append("""(
                LOWER(ap.complete_name_fr) LIKE LOWER(%s) OR
                LOWER(ap.complete_name_ar) LIKE LOWER(%s) OR
                LOWER(CONCAT(ap.first_name_fr, ' ', ap.last_name_fr)) LIKE LOWER(%s) OR
                LOWER(CONCAT(ap.first_name_ar, ' ', ap.last_name_ar)) LIKE LOWER(%s)
            )""")
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
        
        if university_id:
            where_conditions.append("ap.university_id = %s")
            params.append(university_id)
        
        if faculty_id:
            where_conditions.append("ap.faculty_id = %s")
            params.append(faculty_id)
            
        if school_id:
            where_conditions.append("ap.school_id = %s")
            params.append(school_id)
        
        if is_external is not None:
            if is_external:
                where_conditions.append("ap.external_institution_name IS NOT NULL")
            else:
                where_conditions.append("ap.external_institution_name IS NULL")
        
        # Add WHERE clause if conditions exist
        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM ({base_query}) as subquery"
        total = execute_query(count_query, params, fetch_one=True)["total"]
        
        # Add ordering and pagination
        valid_order_fields = [
            "complete_name_fr", "complete_name_ar", "title", 
            "university_name", "faculty_name", "school_name",
            "external_institution_name", "created_at", "updated_at"
        ]
        
        if order_by not in valid_order_fields:
            order_by = "complete_name_fr"
        
        offset = (page - 1) * limit
        data_query = f"{base_query} ORDER BY {order_by} {order_dir} LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        results = execute_query_with_result(data_query, params)
        
        # Format response data
        persons = []
        for row in results:
            institution_info = None
            if row["external_institution_name"]:
                institution_info = {
                    "type": "external",
                    "name": row["external_institution_name"],
                    "country": row["external_institution_country"],
                    "institution_type": row["external_institution_type"]
                }
            else:
                institution_info = {
                    "type": "internal",
                    "university": {"id": str(row["university_id"]) if row["university_id"] else None, "name": row["university_name"]},
                    "faculty": {"id": str(row["faculty_id"]) if row["faculty_id"] else None, "name": row["faculty_name"]},
                    "school": {"id": str(row["school_id"]) if row["school_id"] else None, "name": row["school_name"]}
                }
            
            person_data = {
                "id": str(row["id"]),
                "complete_name_fr": row["complete_name_fr"],
                "complete_name_ar": row["complete_name_ar"],
                "first_name_fr": row["first_name_fr"],
                "last_name_fr": row["last_name_fr"],
                "first_name_ar": row["first_name_ar"],
                "last_name_ar": row["last_name_ar"],
                "title": row["title"],
                "institution": institution_info,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            }
            persons.append(person_data)
        
        # Calculate pagination metadata
        pages = (total + limit - 1) // limit
        
        return PaginatedResponse(
            success=True,
            data=persons,
            meta=PaginationMeta(
                total=total,
                page=page,
                limit=limit,
                pages=pages
            )
        )
        
    except Exception as e:
        logger.error(f"Error fetching academic persons: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch academic persons"
        )

@app.post("/admin/academic-persons", response_model=AcademicPersonResponse, tags=["Admin - Academic Persons"])
async def create_academic_person(
    request: Request,
    person_data: AcademicPersonCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Create a new academic person
    
    Creates a new academic person with institutional affiliations.
    Can be internal (affiliated with institutions in the system) or external.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validate foreign key references if provided
        if person_data.university_id:
            check_query = "SELECT id FROM universities WHERE id = %s"
            if not execute_query(check_query, (str(person_data.university_id),), fetch_one=True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="University not found"
                )
        
        if person_data.faculty_id:
            check_query = "SELECT id FROM faculties WHERE id = %s"
            if not execute_query(check_query, (str(person_data.faculty_id),), fetch_one=True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Faculty not found"
                )
        
        if person_data.school_id:
            check_query = "SELECT id FROM schools WHERE id = %s"
            if not execute_query(check_query, (str(person_data.school_id),), fetch_one=True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="School not found"
                )
        
        if person_data.user_id:
            check_query = "SELECT id FROM users WHERE id = %s"
            if not execute_query(check_query, (str(person_data.user_id),), fetch_one=True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User not found"
                )
        
        # Generate new ID
        person_id = str(uuid.uuid4())
        
        # Insert new academic person
        query = """
            INSERT INTO academic_persons (
                id, complete_name_fr, complete_name_ar,
                first_name_fr, last_name_fr, first_name_ar, last_name_ar,
                title, university_id, faculty_id, school_id,
                external_institution_name, external_institution_country,
                external_institution_type, user_id,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING *
        """
        
        params = (
            person_id,
            person_data.complete_name_fr,
            person_data.complete_name_ar,
            person_data.first_name_fr,
            person_data.last_name_fr,
            person_data.first_name_ar,
            person_data.last_name_ar,
            person_data.title,
            str(person_data.university_id) if person_data.university_id else None,
            str(person_data.faculty_id) if person_data.faculty_id else None,
            str(person_data.school_id) if person_data.school_id else None,
            person_data.external_institution_name,
            person_data.external_institution_country,
            person_data.external_institution_type,
            str(person_data.user_id) if person_data.user_id else None,
            datetime.utcnow(),
            datetime.utcnow()
        )
        
        result = execute_query(query, params, fetch_one=True)
        
        logger.info(f"Academic person created: {result['complete_name_fr']} by {admin_user['email']}")
        
        return AcademicPersonResponse(
            id=result["id"],
            complete_name_fr=result["complete_name_fr"],
            complete_name_ar=result["complete_name_ar"],
            first_name_fr=result["first_name_fr"],
            last_name_fr=result["last_name_fr"],
            first_name_ar=result["first_name_ar"],
            last_name_ar=result["last_name_ar"],
            title=result["title"],
            university_id=result["university_id"],
            faculty_id=result["faculty_id"],
            school_id=result["school_id"],
            external_institution_name=result["external_institution_name"],
            external_institution_country=result["external_institution_country"],
            external_institution_type=result["external_institution_type"],
            user_id=result["user_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating academic person: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create academic person"
        )

@app.get("/admin/academic-persons/{person_id}", response_model=AcademicPersonResponse, tags=["Admin - Academic Persons"])
async def get_academic_person(
    request: Request,
    person_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get a single academic person by ID
    
    Returns complete information about an academic person including
    institutional affiliations and thesis associations.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Get academic person with institution details
        query = """
            SELECT 
                ap.*,
                u.name_fr as university_name,
                f.name_fr as faculty_name,
                s.name_fr as school_name,
                usr.first_name, usr.last_name, usr.email
            FROM academic_persons ap
            LEFT JOIN universities u ON ap.university_id = u.id
            LEFT JOIN faculties f ON ap.faculty_id = f.id
            LEFT JOIN schools s ON ap.school_id = s.id
            LEFT JOIN users usr ON ap.user_id = usr.id
            WHERE ap.id = %s
        """
        
        result = execute_query(query, (person_id,), fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic person not found"
            )
        
        # Get thesis associations
        thesis_query = """
            SELECT 
                tap.role,
                t.id as thesis_id,
                t.title_fr,
                t.defense_date,
                t.status
            FROM thesis_academic_persons tap
            JOIN theses t ON tap.thesis_id = t.id
            WHERE tap.person_id = %s
            ORDER BY t.defense_date DESC
        """
        
        thesis_associations = execute_query_with_result(thesis_query, (person_id,))
        
        # Build response
        response_data = AcademicPersonResponse(
            id=result["id"],
            complete_name_fr=result["complete_name_fr"],
            complete_name_ar=result["complete_name_ar"],
            first_name_fr=result["first_name_fr"],
            last_name_fr=result["last_name_fr"],
            first_name_ar=result["first_name_ar"],
            last_name_ar=result["last_name_ar"],
            title=result["title"],
            university_id=result["university_id"],
            faculty_id=result["faculty_id"],
            school_id=result["school_id"],
            external_institution_name=result["external_institution_name"],
            external_institution_country=result["external_institution_country"],
            external_institution_type=result["external_institution_type"],
            user_id=result["user_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching academic person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch academic person"
        )

@app.put("/admin/academic-persons/{person_id}", response_model=AcademicPersonResponse, tags=["Admin - Academic Persons"])
async def update_academic_person(
    request: Request,
    person_id: str,
    update_data: AcademicPersonUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Update an academic person
    
    Updates academic person information. Can modify names, titles,
    and institutional affiliations.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if person exists
        check_query = "SELECT id FROM academic_persons WHERE id = %s"
        exists = execute_query(check_query, (person_id,), fetch_one=True)
        
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic person not found"
            )
        
        # Validate foreign key references if provided
        if update_data.university_id:
            check_query = "SELECT id FROM universities WHERE id = %s"
            if not execute_query(check_query, (str(update_data.university_id),), fetch_one=True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="University not found"
                )
        
        if update_data.faculty_id:
            check_query = "SELECT id FROM faculties WHERE id = %s"
            if not execute_query(check_query, (str(update_data.faculty_id),), fetch_one=True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Faculty not found"
                )
        
        if update_data.school_id:
            check_query = "SELECT id FROM schools WHERE id = %s"
            if not execute_query(check_query, (str(update_data.school_id),), fetch_one=True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="School not found"
                )
        
        if update_data.user_id:
            check_query = "SELECT id FROM users WHERE id = %s"
            if not execute_query(check_query, (str(update_data.user_id),), fetch_one=True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User not found"
                )
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        field_mapping = {
            "complete_name_fr": update_data.complete_name_fr,
            "complete_name_ar": update_data.complete_name_ar,
            "first_name_fr": update_data.first_name_fr,
            "last_name_fr": update_data.last_name_fr,
            "first_name_ar": update_data.first_name_ar,
            "last_name_ar": update_data.last_name_ar,
            "title": update_data.title,
            "university_id": str(update_data.university_id) if update_data.university_id else None,
            "faculty_id": str(update_data.faculty_id) if update_data.faculty_id else None,
            "school_id": str(update_data.school_id) if update_data.school_id else None,
            "external_institution_name": update_data.external_institution_name,
            "external_institution_country": update_data.external_institution_country,
            "external_institution_type": update_data.external_institution_type,
            "user_id": str(update_data.user_id) if update_data.user_id else None
        }
        
        for field, value in field_mapping.items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                params.append(value)
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields provided for update"
            )
        
        # Add updated_at and person_id to params
        update_fields.append("updated_at = %s")
        params.append(datetime.utcnow())
        params.append(person_id)
        
        # Execute update
        query = f"""
            UPDATE academic_persons 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING *
        """
        
        result = execute_query(query, params, fetch_one=True)
        
        logger.info(f"Academic person updated: {result['complete_name_fr']} by {admin_user['email']}")
        
        return AcademicPersonResponse(
            id=result["id"],
            complete_name_fr=result["complete_name_fr"],
            complete_name_ar=result["complete_name_ar"],
            first_name_fr=result["first_name_fr"],
            last_name_fr=result["last_name_fr"],
            first_name_ar=result["first_name_ar"],
            last_name_ar=result["last_name_ar"],
            title=result["title"],
            university_id=result["university_id"],
            faculty_id=result["faculty_id"],
            school_id=result["school_id"],
            external_institution_name=result["external_institution_name"],
            external_institution_country=result["external_institution_country"],
            external_institution_type=result["external_institution_type"],
            user_id=result["user_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating academic person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update academic person"
        )

@app.delete("/admin/academic-persons/{person_id}", response_model=BaseResponse, tags=["Admin - Academic Persons"])
async def delete_academic_person(
    request: Request,
    person_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Delete an academic person
    
    Deletes an academic person from the system. This will fail if the person
    is associated with any theses due to foreign key constraints.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Check if person exists
        check_query = "SELECT complete_name_fr FROM academic_persons WHERE id = %s"
        person = execute_query(check_query, (person_id,), fetch_one=True)
        
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic person not found"
            )
        
        # Check for thesis associations
        thesis_check = """
            SELECT COUNT(*) as count 
            FROM thesis_academic_persons 
            WHERE person_id = %s
        """
        thesis_count = execute_query(thesis_check, (person_id,), fetch_one=True)["count"]
        
        if thesis_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete academic person: associated with {thesis_count} thesis/theses. Remove associations first."
            )
        
        # Delete the person
        delete_query = "DELETE FROM academic_persons WHERE id = %s"
        execute_query(delete_query, (person_id,))
        
        logger.info(f"Academic person deleted: {person['complete_name_fr']} by {admin_user['email']}")
        
        return BaseResponse(
            success=True,
            message="Academic person deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting academic person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete academic person"
        )

@app.get("/admin/academic-persons/search", response_model=List[Dict], tags=["Admin - Academic Persons"])
async def search_academic_persons(
    request: Request,
    q: str = Query(..., min_length=2, description="Search query"),
    role: Optional[str] = Query(None, description="Filter by role"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    Search academic persons for autocomplete
    
    Used for quick search during thesis entry and other operations.
    Returns basic person information for selection.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Build search query
        query = """
            SELECT 
                ap.id,
                ap.complete_name_fr,
                ap.complete_name_ar,
                ap.first_name_fr,
                ap.last_name_fr,
                ap.title,
                ap.external_institution_name,
                u.name_fr as university_name,
                f.name_fr as faculty_name,
                s.name_fr as school_name
            FROM academic_persons ap
            LEFT JOIN universities u ON ap.university_id = u.id
            LEFT JOIN faculties f ON ap.faculty_id = f.id
            LEFT JOIN schools s ON ap.school_id = s.id
            WHERE (
                LOWER(ap.complete_name_fr) LIKE LOWER(%s) OR
                LOWER(ap.complete_name_ar) LIKE LOWER(%s) OR
                LOWER(CONCAT(COALESCE(ap.first_name_fr, ''), ' ', COALESCE(ap.last_name_fr, ''))) LIKE LOWER(%s) OR
                LOWER(CONCAT(COALESCE(ap.first_name_ar, ''), ' ', COALESCE(ap.last_name_ar, ''))) LIKE LOWER(%s)
            )
        """
        
        search_pattern = f"%{q}%"
        params = [search_pattern, search_pattern, search_pattern, search_pattern]
        
        # Filter by role if specified
        if role:
            query += """
                AND EXISTS (
                    SELECT 1 FROM thesis_academic_persons tap 
                    WHERE tap.person_id = ap.id AND tap.role = %s
                )
            """
            params.append(role)
        
        # Add ordering and limit
        query += " ORDER BY ap.complete_name_fr LIMIT %s"
        params.append(limit)
        
        results = execute_query_with_result(query, params)
        
        # Format results for autocomplete
        persons = []
        for row in results:
            # Determine institution name
            institution_name = None
            if row["external_institution_name"]:
                institution_name = row["external_institution_name"]
            else:
                institution_parts = [row["university_name"], row["faculty_name"], row["school_name"]]
                institution_name = " - ".join([part for part in institution_parts if part])
            
            # Determine display name
            display_name = row["complete_name_fr"]
            if not display_name and row["first_name_fr"] and row["last_name_fr"]:
                display_name = f"{row['first_name_fr']} {row['last_name_fr']}"
            
            person_data = {
                "id": str(row["id"]),
                "display_name": display_name,
                "complete_name_fr": row["complete_name_fr"],
                "complete_name_ar": row["complete_name_ar"],
                "title": row["title"],
                "institution": institution_name,
                "is_external": bool(row["external_institution_name"])
            }
            persons.append(person_data)
        
        return persons
        
    except Exception as e:
        logger.error(f"Error searching academic persons: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed"
        )

@app.post("/admin/academic-persons/{person_id}/merge/{target_id}", response_model=BaseResponse, tags=["Admin - Academic Persons"])
async def merge_academic_persons(
    request: Request,
    person_id: str,
    target_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Merge two academic persons
    
    Merges person_id into target_id, transferring all thesis associations
    and then deleting the source person. Used for handling duplicates.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Validate both persons exist
        source_query = "SELECT complete_name_fr FROM academic_persons WHERE id = %s"
        source_person = execute_query(source_query, (person_id,), fetch_one=True)
        
        if not source_person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source academic person not found"
            )
        
        target_query = "SELECT complete_name_fr FROM academic_persons WHERE id = %s"
        target_person = execute_query(target_query, (target_id,), fetch_one=True)
        
        if not target_person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target academic person not found"
            )
        
        if person_id == target_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot merge person with themselves"
            )
        
        # Start transaction for merge operation
        try:
            # Update all thesis associations to point to target person
            # Handle potential conflicts by updating only where no conflict exists
            update_associations_query = """
                UPDATE thesis_academic_persons 
                SET person_id = %s 
                WHERE person_id = %s 
                AND NOT EXISTS (
                    SELECT 1 FROM thesis_academic_persons tap2 
                    WHERE tap2.thesis_id = thesis_academic_persons.thesis_id 
                    AND tap2.person_id = %s 
                    AND tap2.role = thesis_academic_persons.role
                )
            """
            execute_query(update_associations_query, (target_id, person_id, target_id))
            
            # Delete remaining conflicting associations from source person
            delete_conflicts_query = """
                DELETE FROM thesis_academic_persons 
                WHERE person_id = %s
            """
            execute_query(delete_conflicts_query, (person_id,))
            
            # Delete the source person
            delete_person_query = "DELETE FROM academic_persons WHERE id = %s"
            execute_query(delete_person_query, (person_id,))
            
            logger.info(
                f"Academic persons merged: {source_person['complete_name_fr']} → "
                f"{target_person['complete_name_fr']} by {admin_user['email']}"
            )
            
            return BaseResponse(
                success=True,
                message=f"Successfully merged '{source_person['complete_name_fr']}' into '{target_person['complete_name_fr']}'"
            )
            
        except Exception as e:
            # Transaction will be rolled back automatically
            raise e
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error merging academic persons {person_id} → {target_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to merge academic persons"
        )

# Degrees
# =============================================================================

@app.get("/admin/degrees", response_model=PaginatedResponse, tags=["Admin - Degrees"])
@app.post("/admin/degrees", response_model=DegreeResponse, tags=["Admin - Degrees"])
@app.get("/admin/degrees/{degree_id}", response_model=DegreeResponse, tags=["Admin - Degrees"])
@app.put("/admin/degrees/{degree_id}", response_model=DegreeResponse, tags=["Admin - Degrees"])
@app.delete("/admin/degrees/{degree_id}", response_model=BaseResponse, tags=["Admin - Degrees"])

# Languages
# =============================================================================

@app.get("/admin/languages", response_model=PaginatedResponse, tags=["Admin - Languages"])
@app.post("/admin/languages", response_model=LanguageResponse, tags=["Admin - Languages"])
@app.get("/admin/languages/{language_id}", response_model=LanguageResponse, tags=["Admin - Languages"])
@app.put("/admin/languages/{language_id}", response_model=LanguageResponse, tags=["Admin - Languages"])
@app.delete("/admin/languages/{language_id}", response_model=BaseResponse, tags=["Admin - Languages"])

# Geographic entities
# =============================================================================

@app.get("/admin/geographic-entities", response_model=PaginatedResponse, tags=["Admin - Geographic Entities"])
@app.post("/admin/geographic-entities", response_model=GeographicEntityResponse, tags=["Admin - Geographic Entities"])
@app.get("/admin/geographic-entities/{entity_id}", response_model=GeographicEntityResponse, tags=["Admin - Geographic Entities"])
@app.put("/admin/geographic-entities/{entity_id}", response_model=GeographicEntityResponse, tags=["Admin - Geographic Entities"])
@app.delete("/admin/geographic-entities/{entity_id}", response_model=BaseResponse, tags=["Admin - Geographic Entities"])
@app.get("/admin/geographic-entities/tree", response_model=List[Dict], tags=["Admin - Geographic Entities"])

# =============================================================================
# ADMIN - THESIS CONTENT MANAGEMENT
# =============================================================================

# =============================================================================
# File Upload Endpoints
# =============================================================================

@app.post("/admin/thesis-content/upload-file", response_model=FileUploadResponse, tags=["Admin - Thesis Content"])
async def upload_thesis_file(
    request: Request,
    file: UploadFile = File(...),
    admin_user: dict = Depends(get_admin_user)
):
    """
    Upload a thesis PDF file to temporary storage
    
    First step in manual thesis entry. File is stored temporarily
    until metadata is complete and thesis is confirmed.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Save file to temp directory
        file_info = await save_temp_file(file, submitted_by=admin_user["id"])
        
        # Update extraction job with the admin user who uploaded
        update_query = """
            UPDATE extraction_jobs 
            SET submitted_by = %s, updated_at = %s 
            WHERE id = %s
        """
        execute_query(update_query, (admin_user["id"], datetime.utcnow(), file_info["extraction_job_id"]))
        
        logger.info(f"File uploaded: {file_info['original_filename']} by {admin_user['email']}")
        
        return FileUploadResponse(
            success=True,
            message="File uploaded successfully",
            file_id=file_info["file_id"],
            submitted_by=admin_user["id"],
            original_filename=file_info["original_filename"],
            temp_filename=file_info["temp_filename"],
            file_size=file_info["file_size"],
            file_hash=file_info["file_hash"],
            extraction_job_id=file_info["extraction_job_id"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )

# =============================================================================
# Metadata Form Structure
# =============================================================================

@app.get("/admin/thesis-content/manual/form", response_model=Dict, tags=["Admin - Thesis Content"])
async def get_thesis_form_structure(
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get thesis metadata form structure
    
    Returns the structure and options for the thesis entry form,
    including lists of universities, faculties, degrees, languages, etc.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Get reference data for dropdowns
        universities = execute_query_with_result(
            "SELECT id, name_fr, name_ar, name_en, acronym FROM universities ORDER BY name_fr"
        )
        
        faculties = execute_query_with_result(
            "SELECT id, university_id, name_fr, name_ar, name_en, acronym FROM faculties ORDER BY name_fr"
        )
        
        schools = execute_query_with_result(
            "SELECT id, parent_university_id, parent_school_id, name_fr, name_ar, name_en, acronym FROM schools ORDER BY name_fr"
        )
        
        departments = execute_query_with_result(
            "SELECT id, faculty_id, school_id, name_fr, name_ar, name_en, acronym FROM departments ORDER BY name_fr"
        )
        
        degrees = execute_query_with_result(
            "SELECT id, name_fr, name_ar, name_en, abbreviation, type, category FROM degrees ORDER BY name_fr"
        )
        
        languages = execute_query_with_result(
            "SELECT id, code, name, native_name, rtl FROM languages WHERE is_active = true ORDER BY display_order, name"
        )
        
        categories = execute_query_with_result(
            "SELECT id, parent_id, level, code, name_fr, name_ar, name_en FROM categories ORDER BY level, name_fr"
        )
        
        # Build hierarchical category tree
        def build_category_tree(categories, parent_id=None):
            tree = []
            for cat in categories:
                if cat["parent_id"] == parent_id:
                    node = {
                        "id": str(cat["id"]),
                        "code": cat["code"],
                        "name_fr": cat["name_fr"],
                        "name_ar": cat["name_ar"],
                        "name_en": cat["name_en"],
                        "level": cat["level"],
                        "children": build_category_tree(categories, cat["id"])
                    }
                    tree.append(node)
            return tree
        
        form_structure = {
            "thesis_fields": {
                "basic_info": {
                    "title_fr": {"type": "text", "required": True, "max_length": 500},
                    "title_ar": {"type": "text", "required": False, "max_length": 500},
                    "title_en": {"type": "text", "required": False, "max_length": 500},
                    "abstract_fr": {"type": "textarea", "required": True},
                    "abstract_ar": {"type": "textarea", "required": False},
                    "abstract_en": {"type": "textarea", "required": False},
                    "thesis_number": {"type": "text", "required": False, "max_length": 100},
                    "defense_date": {"type": "date", "required": True},
                    "page_count": {"type": "number", "required": False, "min": 1}
                },
                "institution": {
                    "university_id": {"type": "select", "required": False},
                    "faculty_id": {"type": "select", "required": False, "depends_on": "university_id"},
                    "school_id": {"type": "select", "required": False},
                    "department_id": {"type": "select", "required": False, "depends_on": ["faculty_id", "school_id"]}
                },
                "academic": {
                    "degree_id": {"type": "select", "required": False},
                    "language_id": {"type": "select", "required": True},
                    "secondary_language_ids": {"type": "multiselect", "required": False}
                }
            },
            "related_entities": {
                "academic_persons": {
                    "author": {"required": True, "max": 1},
                    "director": {"required": True, "max": 1},
                    "co_director": {"required": False, "max": 1},
                    "jury_members": {"required": False, "max": 10}
                },
                "categories": {
                    "primary": {"required": True, "max": 1},
                    "secondary": {"required": False, "max": 5}
                },
                "keywords": {
                    "required": False,
                    "max": 20,
                    "allow_new": True
                }
            },
            "reference_data": {
                "universities": [{"id": str(u["id"]), "name_fr": u["name_fr"], "acronym": u["acronym"]} for u in universities],
                "faculties": [{"id": str(f["id"]), "university_id": str(f["university_id"]), "name_fr": f["name_fr"]} for f in faculties],
                "schools": [{"id": str(s["id"]), "parent_university_id": str(s["parent_university_id"]) if s["parent_university_id"] else None, 
                           "parent_school_id": str(s["parent_school_id"]) if s["parent_school_id"] else None, "name_fr": s["name_fr"]} for s in schools],
                "departments": [{"id": str(d["id"]), "faculty_id": str(d["faculty_id"]) if d["faculty_id"] else None,
                               "school_id": str(d["school_id"]) if d["school_id"] else None, "name_fr": d["name_fr"]} for d in departments],
                "degrees": [{"id": str(d["id"]), "name_fr": d["name_fr"], "abbreviation": d["abbreviation"], "type": d["type"]} for d in degrees],
                "languages": [{"id": str(l["id"]), "code": l["code"], "name": l["name"]} for l in languages],
                "categories_tree": build_category_tree(categories),
                "academic_roles": [
                    {"value": "author", "label": "Author"},
                    {"value": "director", "label": "Director"},
                    {"value": "co_director", "label": "Co-Director"},
                    {"value": "jury_president", "label": "Jury President"},
                    {"value": "jury_examiner", "label": "Jury Examiner"},
                    {"value": "jury_reporter", "label": "Jury Reporter"},
                    {"value": "external_examiner", "label": "External Examiner"}
                ]
            }
        }
        
        return form_structure
        
    except Exception as e:
        logger.error(f"Error getting form structure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get form structure"
        )

# =============================================================================
# Create Thesis with Metadata
# =============================================================================

@app.post("/admin/thesis-content/manual/create", response_model=ThesisResponse, tags=["Admin - Thesis Content"])
async def create_thesis_manual(
    request: Request,
    thesis_data: ThesisCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Create thesis with complete metadata
    
    Main endpoint for manual thesis entry. Creates thesis record
    and all related entities, then moves file to published storage.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Verify file exists in temp storage
        temp_file_path = TEMP_UPLOAD_DIR / f"{thesis_data.file_id}.pdf"
        if not temp_file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File not found in temporary storage. Please upload the file first."
            )
        
        # Get extraction job ID from file
        job_query = """
            SELECT id FROM extraction_jobs 
            WHERE file_url = %s
        """
        job_result = execute_query(job_query, (f"/temp/{thesis_data.file_id}.pdf",), fetch_one=True)
        
        if not job_result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Extraction job not found for this file"
            )
        
        extraction_job_id = job_result["id"]
        
        # Begin transaction-like operation
        thesis_id = str(uuid.uuid4())
        
        # Move file to published directory first
        published_file_url = move_file_to_published(thesis_data.file_id)
        
        # Create thesis record
        thesis_query = """
            INSERT INTO theses (
                id, title_fr, title_ar, title_en,
                abstract_fr, abstract_ar, abstract_en,
                university_id, faculty_id, school_id, department_id,
                degree_id, thesis_number, study_location_id,
                defense_date, language_id, secondary_language_ids,
                page_count, file_url, file_name,
                extraction_job_id, status,
                submitted_by, submitted_at,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                %s, %s, %s, %s
            ) RETURNING *
        """
        
        thesis_params = (
            thesis_id,
            thesis_data.title_fr,
            thesis_data.title_ar,
            thesis_data.title_en,
            thesis_data.abstract_fr,
            thesis_data.abstract_ar,
            thesis_data.abstract_en,
            str(thesis_data.university_id) if thesis_data.university_id else None,
            str(thesis_data.faculty_id) if thesis_data.faculty_id else None,
            str(thesis_data.school_id) if thesis_data.school_id else None,
            str(thesis_data.department_id) if thesis_data.department_id else None,
            str(thesis_data.degree_id) if thesis_data.degree_id else None,
            thesis_data.thesis_number,
            str(thesis_data.study_location_id) if thesis_data.study_location_id else None,
            thesis_data.defense_date,
            str(thesis_data.language_id),
            [str(lid) for lid in thesis_data.secondary_language_ids] if thesis_data.secondary_language_ids else [],
            thesis_data.page_count,
            published_file_url,
            f"{thesis_data.file_id}.pdf",
            extraction_job_id,
            thesis_data.status.value,
            admin_user["id"],
            datetime.utcnow(),
            datetime.utcnow(),
            datetime.utcnow()
        )
        
        thesis_result = execute_query(thesis_query, thesis_params, fetch_one=True)
        
        if not thesis_result:
            # Rollback file move
            # Move file back to temp if thesis creation failed
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create thesis record"
            )
        
        logger.info(f"Thesis created: {thesis_data.title_fr} (ID: {thesis_id}) by {admin_user['email']}")
        
        return ThesisResponse(
            id=thesis_result["id"],
            title_fr=thesis_result["title_fr"],
            title_ar=thesis_result["title_ar"],
            title_en=thesis_result["title_en"],
            abstract_fr=thesis_result["abstract_fr"],
            abstract_ar=thesis_result["abstract_ar"],
            abstract_en=thesis_result["abstract_en"],
            university_id=thesis_result["university_id"],
            faculty_id=thesis_result["faculty_id"],
            school_id=thesis_result["school_id"],
            department_id=thesis_result["department_id"],
            degree_id=thesis_result["degree_id"],
            thesis_number=thesis_result["thesis_number"],
            study_location_id=thesis_result["study_location_id"],
            defense_date=thesis_result["defense_date"],
            language_id=thesis_result["language_id"],
            secondary_language_ids=thesis_result["secondary_language_ids"] or [],
            page_count=thesis_result["page_count"],
            file_url=thesis_result["file_url"],
            file_name=thesis_result["file_name"],
            status=thesis_result["status"],
            submitted_by=thesis_result["submitted_by"],
            submitted_at=thesis_result["submitted_at"],
            extraction_job_id=thesis_result["extraction_job_id"],
            created_at=thesis_result["created_at"],
            updated_at=thesis_result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating thesis: {e}")
        # Try to clean up file if it was moved
        try:
            if 'published_file_url' in locals():
                # Move file back to temp
                published_path = PUBLISHED_DIR / f"{thesis_data.file_id}.pdf"
                temp_path = TEMP_UPLOAD_DIR / f"{thesis_data.file_id}.pdf"
                if published_path.exists() and not temp_path.exists():
                    shutil.move(str(published_path), str(temp_path))
        except:
            pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create thesis: {str(e)}"
        )

# =============================================================================
# Managing Thesis Relations (Academic Persons, Categories, Keywords)
# =============================================================================

@app.post("/admin/theses/{thesis_id}/academic-persons", response_model=ThesisAcademicPersonResponse, tags=["Admin - Thesis Content"])
async def add_thesis_academic_person(
    request: Request,
    thesis_id: str,
    person_data: ThesisAcademicPersonCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Add academic person to thesis
    
    Associates an academic person (author, director, jury member) with a thesis.
    """
    try:
        # Verify thesis exists
        thesis_check = "SELECT id FROM theses WHERE id = %s"
        thesis_exists = execute_query(thesis_check, (thesis_id,), fetch_one=True)
        
        if not thesis_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thesis not found"
            )
        
        # Verify person exists
        person_check = "SELECT id FROM academic_persons WHERE id = %s"
        person_exists = execute_query(person_check, (str(person_data.person_id),), fetch_one=True)
        
        if not person_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic person not found"
            )
        
        # Check if relation already exists
        existing_check = """
            SELECT id FROM thesis_academic_persons 
            WHERE thesis_id = %s AND person_id = %s AND role = %s
        """
        existing = execute_query(existing_check, (thesis_id, str(person_data.person_id), person_data.role.value), fetch_one=True)
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This person is already associated with the thesis in this role"
            )
        
        # Create relation
        relation_id = str(uuid.uuid4())
        
        query = """
            INSERT INTO thesis_academic_persons (
                id, thesis_id, person_id, role, faculty_id,
                is_external, external_institution_name,
                approved_by, approved_at, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING *
        """
        
        params = (
            relation_id,
            thesis_id,
            str(person_data.person_id),
            person_data.role.value,
            str(person_data.faculty_id) if person_data.faculty_id else None,
            person_data.is_external,
            person_data.external_institution_name,
            admin_user["id"],
            datetime.utcnow(),
            datetime.utcnow(),
            datetime.utcnow()
        )
        
        result = execute_query(query, params, fetch_one=True)
        
        logger.info(f"Academic person added to thesis {thesis_id}: role={person_data.role.value}")
        
        return ThesisAcademicPersonResponse(
            id=result["id"],
            thesis_id=result["thesis_id"],
            person_id=result["person_id"],
            role=result["role"],
            faculty_id=result["faculty_id"],
            is_external=result["is_external"],
            external_institution_name=result["external_institution_name"],
            approved_by=result["approved_by"],
            approved_at=result["approved_at"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding academic person to thesis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add academic person"
        )

@app.post("/admin/theses/{thesis_id}/categories", response_model=ThesisCategoryResponse, tags=["Admin - Thesis Content"])
async def add_thesis_category(
    request: Request,
    thesis_id: str,
    category_data: ThesisCategoryCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Add category to thesis
    
    Associates a category with a thesis. One can be marked as primary.
    """
    try:
        # Verify thesis and category exist
        thesis_check = "SELECT id FROM theses WHERE id = %s"
        thesis_exists = execute_query(thesis_check, (thesis_id,), fetch_one=True)
        
        if not thesis_exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")
        
        category_check = "SELECT id FROM categories WHERE id = %s"
        category_exists = execute_query(category_check, (str(category_data.category_id),), fetch_one=True)
        
        if not category_exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        
        # If marking as primary, unmark existing primary
        if category_data.is_primary:
            update_primary = """
                UPDATE thesis_categories 
                SET is_primary = false, updated_at = %s 
                WHERE thesis_id = %s AND is_primary = true
            """
            execute_query(update_primary, (datetime.utcnow(), thesis_id))
        
        # Create relation
        relation_id = str(uuid.uuid4())
        
        query = """
            INSERT INTO thesis_categories (
                id, thesis_id, category_id, is_primary,
                reviewed_by, reviewed_at, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING *
        """
        
        params = (
            relation_id,
            thesis_id,
            str(category_data.category_id),
            category_data.is_primary,
            admin_user["id"],
            datetime.utcnow(),
            datetime.utcnow(),
            datetime.utcnow()
        )
        
        result = execute_query(query, params, fetch_one=True)
        
        return ThesisCategoryResponse(
            id=result["id"],
            thesis_id=result["thesis_id"],
            category_id=result["category_id"],
            is_primary=result["is_primary"],
            reviewed_by=result["reviewed_by"],
            reviewed_at=result["reviewed_at"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding category to thesis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add category"
        )

@app.post("/admin/theses/{thesis_id}/keywords", response_model=ThesisKeywordResponse, tags=["Admin - Thesis Content"])
async def add_thesis_keyword(
    request: Request,
    thesis_id: str,
    keyword_data: ThesisKeywordCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Add keyword to thesis
    
    Associates a keyword with a thesis. Can specify position for ordering.
    """
    try:
        # Verify thesis and keyword exist
        thesis_check = "SELECT id FROM theses WHERE id = %s"
        thesis_exists = execute_query(thesis_check, (thesis_id,), fetch_one=True)
        
        if not thesis_exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")
        
        keyword_check = "SELECT id FROM keywords WHERE id = %s"
        keyword_exists = execute_query(keyword_check, (str(keyword_data.keyword_id),), fetch_one=True)
        
        if not keyword_exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found")
        
        # Create relation
        relation_id = str(uuid.uuid4())
        
        query = """
            INSERT INTO thesis_keywords (
                id, thesis_id, keyword_id, keyword_position,
                reviewed_by, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s
            ) RETURNING *
        """
        
        params = (
            relation_id,
            thesis_id,
            str(keyword_data.keyword_id),
            keyword_data.keyword_position,
            admin_user["id"],
            datetime.utcnow(),
            datetime.utcnow()
        )
        
        result = execute_query(query, params, fetch_one=True)
        
        return ThesisKeywordResponse(
            id=result["id"],
            thesis_id=result["thesis_id"],
            keyword_id=result["keyword_id"],
            keyword_position=result["keyword_position"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding keyword to thesis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add keyword"
        )

# =============================================================================
# View and Edit Thesis
# =============================================================================

@app.get("/admin/theses", response_model=PaginatedResponse, tags=["Admin - Thesis Content"])
async def get_admin_theses(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    university_id: Optional[str] = Query(None),
    faculty_id: Optional[str] = Query(None),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc", regex="^(asc|desc)$"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    List all theses with pagination and filters
    
    Admin view of all theses in the system.
    """
    try:
        # Build query with joins for related data
        base_query = """
            SELECT 
                t.*,
                u.name_fr as university_name,
                f.name_fr as faculty_name,
                d.name_fr as degree_name,
                l.name as language_name
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN faculties f ON t.faculty_id = f.id
            LEFT JOIN degrees d ON t.degree_id = d.id
            LEFT JOIN languages l ON t.language_id = l.id
            WHERE 1=1
        """
        count_query = "SELECT COUNT(*) as total FROM theses t WHERE 1=1"
        
        params = []
        count_params = []
        
        # Add filters
        if search:
            search_condition = """
                AND (
                    LOWER(t.title_fr) LIKE LOWER(%s) OR
                    LOWER(t.title_ar) LIKE LOWER(%s) OR
                    LOWER(t.title_en) LIKE LOWER(%s) OR
                    LOWER(t.thesis_number) LIKE LOWER(%s)
                )
            """
            base_query += search_condition
            count_query += search_condition
            
            search_pattern = f"%{search}%"
            params.extend([search_pattern] * 4)
            count_params.extend([search_pattern] * 4)
        
        if status:
            status_condition = " AND t.status = %s"
            base_query += status_condition
            count_query += status_condition
            params.append(status)
            count_params.append(status)
        
        if university_id:
            uni_condition = " AND t.university_id = %s"
            base_query += uni_condition
            count_query += uni_condition
            params.append(university_id)
            count_params.append(university_id)
        
        if faculty_id:
            fac_condition = " AND t.faculty_id = %s"
            base_query += fac_condition
            count_query += fac_condition
            params.append(faculty_id)
            count_params.append(faculty_id)
        
        # Validate order_by
        allowed_order_fields = ["title_fr", "defense_date", "status", "created_at", "updated_at"]
        if order_by not in allowed_order_fields:
            order_by = "created_at"
        
        # Add ordering and pagination
        base_query += f" ORDER BY t.{order_by} {order_dir.upper()}"
        offset = (page - 1) * limit
        base_query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        # Get total count
        total = execute_query(count_query, count_params, fetch_one=True)["total"]
        
        # Get results
        results = execute_query_with_result(base_query, params)
        
        theses = []
        for row in results:
            # Get author info
            author_query = """
                SELECT ap.complete_name_fr 
                FROM thesis_academic_persons tap
                JOIN academic_persons ap ON tap.person_id = ap.id
                WHERE tap.thesis_id = %s AND tap.role = 'author'
                LIMIT 1
            """
            author_result = execute_query(author_query, (row["id"],), fetch_one=True)
            
            theses.append({
                "id": str(row["id"]),
                "title_fr": row["title_fr"],
                "title_ar": row["title_ar"],
                "title_en": row["title_en"],
                "author_name": author_result["complete_name_fr"] if author_result else "Unknown",
                "university_name": row["university_name"],
                "faculty_name": row["faculty_name"],
                "degree_name": row["degree_name"],
                "defense_date": row["defense_date"].isoformat() if row["defense_date"] else None,
                "language_name": row["language_name"],
                "status": row["status"],
                "file_url": row["file_url"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
            })
        
        pages = (total + limit - 1) // limit
        
        return PaginatedResponse(
            success=True,
            data=theses,
            meta=PaginationMeta(
                total=total,
                page=page,
                limit=limit,
                pages=pages
            )
        )
        
    except Exception as e:
        logger.error(f"Error fetching theses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch theses"
        )

@app.get("/admin/theses/{thesis_id}", tags=["Admin - Thesis Content"])
async def get_thesis_details(
    request: Request,
    thesis_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get complete thesis details including all relations
    """
    try:
        # Get thesis with related data
        thesis_query = """
            SELECT 
                t.*,
                u.name_fr as university_name,
                f.name_fr as faculty_name,
                s.name_fr as school_name,
                dept.name_fr as department_name,
                d.name_fr as degree_name,
                l.name as language_name
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN faculties f ON t.faculty_id = f.id
            LEFT JOIN schools s ON t.school_id = s.id
            LEFT JOIN departments dept ON t.department_id = dept.id
            LEFT JOIN degrees d ON t.degree_id = d.id
            LEFT JOIN languages l ON t.language_id = l.id
            WHERE t.id = %s
        """
        
        thesis = execute_query(thesis_query, (thesis_id,), fetch_one=True)
        
        if not thesis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thesis not found"
            )
        
        # Get academic persons
        persons_query = """
            SELECT 
                tap.*,
                ap.complete_name_fr,
                ap.complete_name_ar,
                ap.title,
                ap.external_institution_name
            FROM thesis_academic_persons tap
            JOIN academic_persons ap ON tap.person_id = ap.id
            WHERE tap.thesis_id = %s
            ORDER BY tap.role, ap.complete_name_fr
        """
        persons = execute_query_with_result(persons_query, (thesis_id,))
        
        # Get categories
        categories_query = """
            SELECT 
                tc.*,
                c.name_fr,
                c.name_ar,
                c.name_en,
                c.code
            FROM thesis_categories tc
            JOIN categories c ON tc.category_id = c.id
            WHERE tc.thesis_id = %s
            ORDER BY tc.is_primary DESC, c.name_fr
        """
        categories = execute_query_with_result(categories_query, (thesis_id,))
        
        # Get keywords
        keywords_query = """
            SELECT 
                tk.*,
                k.keyword_fr,
                k.keyword_ar,
                k.keyword_en
            FROM thesis_keywords tk
            JOIN keywords k ON tk.keyword_id = k.id
            WHERE tk.thesis_id = %s
            ORDER BY tk.keyword_position, k.keyword_fr
        """
        keywords = execute_query_with_result(keywords_query, (thesis_id,))
        
        # Format response
        response = {
            "thesis": {
                "id": str(thesis["id"]),
                "title_fr": thesis["title_fr"],
                "title_ar": thesis["title_ar"],
                "title_en": thesis["title_en"],
                "abstract_fr": thesis["abstract_fr"],
                "abstract_ar": thesis["abstract_ar"],
                "abstract_en": thesis["abstract_en"],
                "thesis_number": thesis["thesis_number"],
                "defense_date": thesis["defense_date"].isoformat() if thesis["defense_date"] else None,
                "page_count": thesis["page_count"],
                "status": thesis["status"],
                "file_url": thesis["file_url"],
                "file_name": thesis["file_name"]
            },
            "institution": {
                "university": {"id": str(thesis["university_id"]) if thesis["university_id"] else None, 
                             "name": thesis["university_name"]},
                "faculty": {"id": str(thesis["faculty_id"]) if thesis["faculty_id"] else None,
                           "name": thesis["faculty_name"]},
                "school": {"id": str(thesis["school_id"]) if thesis["school_id"] else None,
                          "name": thesis["school_name"]},
                "department": {"id": str(thesis["department_id"]) if thesis["department_id"] else None,
                              "name": thesis["department_name"]}
            },
            "academic": {
                "degree": {"id": str(thesis["degree_id"]) if thesis["degree_id"] else None,
                          "name": thesis["degree_name"]},
                "language": {"id": str(thesis["language_id"]), "name": thesis["language_name"]}
            },
            "persons": [
                {
                    "id": str(p["id"]),
                    "person_id": str(p["person_id"]),
                    "role": p["role"],
                    "name": p["complete_name_fr"],
                    "title": p["title"],
                    "is_external": p["is_external"],
                    "institution": p["external_institution_name"]
                } for p in persons
            ],
            "categories": [
                {
                    "id": str(c["id"]),
                    "category_id": str(c["category_id"]),
                    "code": c["code"],
                    "name_fr": c["name_fr"],
                    "is_primary": c["is_primary"]
                } for c in categories
            ],
            "keywords": [
                {
                    "id": str(k["id"]),
                    "keyword_id": str(k["keyword_id"]),
                    "keyword_fr": k["keyword_fr"],
                    "position": k["keyword_position"]
                } for k in keywords
            ],
            "metadata": {
                "created_at": thesis["created_at"].isoformat() if thesis["created_at"] else None,
                "updated_at": thesis["updated_at"].isoformat() if thesis["updated_at"] else None,
                "submitted_by": str(thesis["submitted_by"]) if thesis["submitted_by"] else None,
                "submitted_at": thesis["submitted_at"].isoformat() if thesis["submitted_at"] else None
            }
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching thesis details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch thesis details"
        )

@app.put("/admin/theses/{thesis_id}", response_model=ThesisResponse, tags=["Admin - Thesis Content"])
async def update_thesis(
    request: Request,
    thesis_id: str,
    update_data: ThesisUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Update thesis metadata
    
    Updates the basic thesis information. Relations (persons, categories, keywords)
    are managed through their specific endpoints.
    """
    try:
        # Check thesis exists
        check_query = "SELECT id FROM theses WHERE id = %s"
        exists = execute_query(check_query, (thesis_id,), fetch_one=True)
        
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thesis not found"
            )
        
        # Build update query
        update_fields = []
        params = []
        
        # Update all provided fields
        field_mapping = {
            "title_fr": update_data.title_fr,
            "title_ar": update_data.title_ar,
            "title_en": update_data.title_en,
            "abstract_fr": update_data.abstract_fr,
            "abstract_ar": update_data.abstract_ar,
            "abstract_en": update_data.abstract_en,
            "university_id": str(update_data.university_id) if update_data.university_id else None,
            "faculty_id": str(update_data.faculty_id) if update_data.faculty_id else None,
            "school_id": str(update_data.school_id) if update_data.school_id else None,
            "department_id": str(update_data.department_id) if update_data.department_id else None,
            "degree_id": str(update_data.degree_id) if update_data.degree_id else None,
            "thesis_number": update_data.thesis_number,
            "study_location_id": str(update_data.study_location_id) if update_data.study_location_id else None,
            "defense_date": update_data.defense_date,
            "language_id": str(update_data.language_id) if update_data.language_id else None,
            "page_count": update_data.page_count,
            "status": update_data.status.value if update_data.status else None,
            "rejection_reason": update_data.rejection_reason
        }
        
        for field, value in field_mapping.items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                params.append(value)
        
        # Handle secondary languages array
        if update_data.secondary_language_ids is not None:
            update_fields.append("secondary_language_ids = %s")
            params.append([str(lid) for lid in update_data.secondary_language_ids])
        
        if not update_fields:
            # Nothing to update
            return await get_thesis_details(thesis_id, admin_user)
        
        # Add metadata fields
        update_fields.append("updated_at = %s")
        params.append(datetime.utcnow())
        
        # Add status-specific fields
        if update_data.status == ThesisStatus.APPROVED:
            update_fields.append("approved_by = %s")
            update_fields.append("approved_at = %s")
            params.extend([admin_user["id"], datetime.utcnow()])
        elif update_data.status == ThesisStatus.UNDER_REVIEW:
            update_fields.append("reviewed_by = %s")
            update_fields.append("reviewed_at = %s")
            params.extend([admin_user["id"], datetime.utcnow()])
        
        params.append(thesis_id)
        
        # Execute update
        query = f"""
            UPDATE theses 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING *
        """
        
        result = execute_query(query, params, fetch_one=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update thesis"
            )
        
        logger.info(f"Thesis updated: {thesis_id} by {admin_user['email']}")
        
        return ThesisResponse(
            id=result["id"],
            title_fr=result["title_fr"],
            title_ar=result["title_ar"],
            title_en=result["title_en"],
            abstract_fr=result["abstract_fr"],
            abstract_ar=result["abstract_ar"],
            abstract_en=result["abstract_en"],
            university_id=result["university_id"],
            faculty_id=result["faculty_id"],
            school_id=result["school_id"],
            department_id=result["department_id"],
            degree_id=result["degree_id"],
            thesis_number=result["thesis_number"],
            study_location_id=result["study_location_id"],
            defense_date=result["defense_date"],
            language_id=result["language_id"],
            secondary_language_ids=result["secondary_language_ids"] or [],
            page_count=result["page_count"],
            file_url=result["file_url"],
            file_name=result["file_name"],
            status=result["status"],
            submitted_by=result["submitted_by"],
            extraction_job_id=result["extraction_job_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating thesis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update thesis: {str(e)}"
        )

@app.delete("/admin/theses/{thesis_id}", response_model=BaseResponse, tags=["Admin - Thesis Content"])
async def delete_thesis(
    request: Request,
    thesis_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Delete thesis and associated file
    
    Completely removes thesis and all related data.
    """
    try:
        # Get thesis info before deletion
        thesis_query = "SELECT title_fr, file_url, file_name FROM theses WHERE id = %s"
        thesis = execute_query(thesis_query, (thesis_id,), fetch_one=True)
        
        if not thesis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thesis not found"
            )
        
        # Delete thesis (cascades to related tables due to FK constraints)
        delete_query = "DELETE FROM theses WHERE id = %s"
        rows_affected = execute_query(delete_query, (thesis_id,))
        
        if rows_affected == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete thesis"
            )
        
        # Delete associated file
        if thesis["file_url"]:
            file_path = Path(settings.UPLOAD_DIRECTORY) / thesis["file_url"].lstrip("/")
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted file: {file_path}")
        
        logger.info(f"Thesis deleted: {thesis['title_fr']} (ID: {thesis_id}) by {admin_user['email']}")
        
        return BaseResponse(
            success=True,
            message=f"Thesis '{thesis['title_fr']}' deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting thesis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete thesis: {str(e)}"
        )
# =============================================================================
# PUBLIC API - SEARCH & DISCOVERY: enables searching, or navigating through references
# =============================================================================

# Universities
# =============================================================================
@app.get("/universities", response_model=List[UniversityResponse], tags=["Public - Reference Data"])
@app.get("/universities/{university_id}", response_model=UniversityResponse, tags=["Public - Reference Data"])
@app.get("/universities/{university_id}/theses", response_model=List[ThesisResponse], tags=["Public - Reference Data"])

# Faculties
# =============================================================================
@app.get("/faculties", response_model=List[FacultyResponse], tags=["Public - Reference Data"])
@app.get("/faculties/{faculty_id}", response_model=FacultyResponse, tags=["Public - Reference Data"])
@app.get("/faculties/{faculty_id}/theses", response_model=List[ThesisResponse], tags=["Public - Reference Data"])

# Schools
# =============================================================================
@app.get("/schools", response_model=List[SchoolResponse], tags=["Public - Reference Data"])
@app.get("/schools/{school_id}", response_model=SchoolResponse, tags=["Public - Reference Data"])
@app.get("/schools/{school_id}/theses", response_model=List[ThesisResponse], tags=["Public - Reference Data"])

# Departments
# =============================================================================
@app.get("/departments", response_model=List[DepartmentResponse], tags=["Public - Reference Data"])
@app.get("/departments/{department_id}/theses", response_model=List[ThesisResponse], tags=["Public - Reference Data"])

# Categories
# =============================================================================
@app.get("/categories", response_model=List[CategoryResponse], tags=["Public - Reference Data"])
@app.get("/categories/{category_id}", response_model=CategoryResponse, tags=["Public - Reference Data"])
@app.get("/categories/{category_id}/theses", response_model=List[ThesisResponse], tags=["Public - Reference Data"])

# Academic persons
# =============================================================================
@app.get("/academic_persons", response_model=List[AcademicPersonResponse], tags=["Public - Reference Data"])
@app.get("/academic_persons/{acedemic_person_id}/theses", response_model=AcademicPersonResponse, tags=["Public - Reference Data"])

# Degrees
# =============================================================================
@app.get("/degrees", response_model=List[DegreeResponse], tags=["Public - Reference Data"])
@app.get("/degrees/{degree_id}/theses", response_model=list[ThesisResponse], tags=["Public - Reference Data"])

# Languages
# =============================================================================
@app.get("/languages", response_model=List[LanguageResponse], tags=["Public - Reference Data"])
@app.get("/languages/{language_id}/theses", response_model=LanguageResponse, tags=["Public - Reference Data"])

# Main Search (search variables: term(s); filters (university/faculty/departments, disciplines/subdisciplines/specialities, date from-to or years, degrees, languages, academic persons (limited to author and director); sort options: relevance, popularity (sum of downloads and cites), date, alphabetical university, alphabetical title; sort order: ascending/descending; display options (number of results per page (10, 20, 50, 100)))
# =============================================================================
@app.get("/theses", response_model=List[ThesisResponse], tags=["Public - Thesis search"]) # liste all theses with no filters applied,default settings to (sort options to date, descending order, 10 results per page)
async def get_theses(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    sort_by: str = Query("date_desc", description="Sort by: relevance, date_desc, date_asc, title, downloads, views"),
    university_id: Optional[str] = Query(None, description="Filter by university ID"),
    faculty_id: Optional[str] = Query(None, description="Filter by faculty ID"),
    department_id: Optional[str] = Query(None, description="Filter by department ID"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    discipline: Optional[str] = Query(None, description="Filter by discipline"),
    language: Optional[str] = Query(None, description="Filter by language"),
    year_from: Optional[int] = Query(None, ge=1900, le=2030, description="Filter from year"),
    year_to: Optional[int] = Query(None, ge=1900, le=2030, description="Filter to year"),
    availability: Optional[str] = Query(None, description="Filter by availability: available, preparing, unavailable")
):
    """
    Get paginated list of theses with optional filtering and sorting.

    Parameters:
    - page: Page number (default: 1)
    - page_size: Results per page (default: 20, max: 100)
    - sort_by: Sort criteria (default: date_desc)
    - university_id: Filter by university
    - faculty_id: Filter by faculty
    - department_id: Filter by department
    - category_id: Filter by category
    - discipline: Filter by discipline
    - language: Filter by language
    - year_from: Filter from year
    - year_to: Filter to year
    - availability: Filter by availability status
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Build base query
        query = """
            SELECT
                t.id, t.title_fr, t.title_en, t.title_ar,
                t.abstract_fr, t.abstract_en, t.abstract_ar,
                t.defense_date, t.page_count, t.status,
                t.created_at, t.updated_at,
                u.name_fr as university_name,
                l.name_fr as language_name,
                d.name_fr as degree_name,
                COALESCE(tv.view_count, 0) as view_count,
                COALESCE(td.download_count, 0) as download_count
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN languages l ON t.language_id = l.id
            LEFT JOIN degrees d ON t.degree_id = d.id
            LEFT JOIN (
                SELECT thesis_id, COUNT(*) as view_count
                FROM thesis_views
                GROUP BY thesis_id
            ) tv ON t.id = tv.thesis_id
            LEFT JOIN (
                SELECT thesis_id, COUNT(*) as download_count
                FROM thesis_downloads
                GROUP BY thesis_id
            ) td ON t.id = td.thesis_id
            WHERE t.status = 'published'
        """

        params = []

        # Apply filters
        if university_id:
            query += " AND t.university_id = %s"
            params.append(university_id)

        if faculty_id:
            query += " AND t.faculty_id = %s"
            params.append(faculty_id)

        if department_id:
            query += " AND t.department_id = %s"
            params.append(department_id)

        if category_id:
            query += """
                AND EXISTS (
                    SELECT 1 FROM thesis_categories tc
                    WHERE tc.thesis_id = t.id AND tc.category_id = %s
                )
            """
            params.append(category_id)

        if discipline:
            query += " AND t.discipline = %s"
            params.append(discipline)

        if language:
            query += " AND t.language_id = %s"
            params.append(language)

        if year_from:
            query += " AND EXTRACT(YEAR FROM t.defense_date) >= %s"
            params.append(year_from)

        if year_to:
            query += " AND EXTRACT(YEAR FROM t.defense_date) <= %s"
            params.append(year_to)

        if availability:
            if availability == "available":
                query += " AND t.status = 'published' AND t.file_url IS NOT NULL"
            elif availability == "preparing":
                query += " AND t.status IN ('submitted', 'under_review')"
            elif availability == "unavailable":
                query += " AND (t.status = 'rejected' OR t.file_url IS NULL)"

        # Apply sorting
        sort_mapping = {
            "relevance": "t.created_at DESC",  # Most recent first as proxy for relevance
            "date_desc": "t.defense_date DESC",
            "date_asc": "t.defense_date ASC",
            "title": "t.title_fr ASC",
            "downloads": "COALESCE(td.download_count, 0) DESC",
            "views": "COALESCE(tv.view_count, 0) DESC"
        }

        sort_clause = sort_mapping.get(sort_by, "t.defense_date DESC")
        query += f" ORDER BY {sort_clause}"

        # Apply pagination
        offset = (page - 1) * page_size
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, offset])

        cursor.execute(query, params)
        results = cursor.fetchall()

        # Transform results to match response model
        theses = []
        for row in results:
            thesis = {
                "id": str(row["id"]),
                "title_fr": row["title_fr"],
                "title_en": row["title_en"],
                "title_ar": row["title_ar"],
                "abstract_fr": row["abstract_fr"],
                "abstract_en": row["abstract_en"],
                "abstract_ar": row["abstract_ar"],
                "university_name": row["university_name"],
                "language_name": row["language_name"],
                "degree_name": row["degree_name"],
                "defense_date": row["defense_date"].isoformat() if row["defense_date"] else None,
                "page_count": row["page_count"],
                "status": row["status"],
                "view_count": row["view_count"] or 0,
                "download_count": row["download_count"] or 0,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
            }
            theses.append(thesis)

        cursor.close()
        conn.close()

        return create_success_response(
            data=theses,
            message="Theses retrieved successfully",
            request_id=request_id
        )

    except Exception as e:
        logger.error(f"Error retrieving theses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.get("/theses/search", response_model=List[ThesisResponse], tags=["Public - Thesis search"]) # Search results when filters applied and/or terms searched for
async def search_theses(
    request: Request,
    q: str = Query(..., description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    sort_by: str = Query("relevance", description="Sort by: relevance, date_desc, date_asc, title, downloads, views"),
    university_id: Optional[str] = Query(None, description="Filter by university ID"),
    faculty_id: Optional[str] = Query(None, description="Filter by faculty ID"),
    department_id: Optional[str] = Query(None, description="Filter by department ID"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    discipline: Optional[str] = Query(None, description="Filter by discipline"),
    language: Optional[str] = Query(None, description="Filter by language"),
    year_from: Optional[int] = Query(None, ge=1900, le=2030, description="Filter from year"),
    year_to: Optional[int] = Query(None, ge=1900, le=2030, description="Filter to year"),
    availability: Optional[str] = Query(None, description="Filter by availability: available, preparing, unavailable")
):
    """
    Search theses by query term with optional filtering and sorting.

    Parameters:
    - q: Search query (title, abstract, author, keywords)
    - page: Page number (default: 1)
    - page_size: Results per page (default: 20, max: 100)
    - sort_by: Sort criteria (default: relevance)
    - university_id: Filter by university
    - faculty_id: Filter by faculty
    - department_id: Filter by department
    - category_id: Filter by category
    - discipline: Filter by discipline
    - language: Filter by language
    - year_from: Filter from year
    - year_to: Filter to year
    - availability: Filter by availability status
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Build search query with full-text search
        query = """
            SELECT
                t.id, t.title_fr, t.title_en, t.title_ar,
                t.abstract_fr, t.abstract_en, t.abstract_ar,
                t.defense_date, t.page_count, t.status,
                t.created_at, t.updated_at,
                u.name_fr as university_name,
                l.name_fr as language_name,
                d.name_fr as degree_name,
                COALESCE(tv.view_count, 0) as view_count,
                COALESCE(td.download_count, 0) as download_count,
                ts_rank_cd(to_tsvector('french', COALESCE(t.title_fr, '') || ' ' || COALESCE(t.abstract_fr, '')), plainto_tsquery('french', %s)) as rank_fr,
                ts_rank_cd(to_tsvector('arabic', COALESCE(t.title_ar, '') || ' ' || COALESCE(t.abstract_ar, '')), plainto_tsquery('arabic', %s)) as rank_ar,
                ts_rank_cd(to_tsvector('english', COALESCE(t.title_en, '') || ' ' || COALESCE(t.abstract_en, '')), plainto_tsquery('english', %s)) as rank_en
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN languages l ON t.language_id = l.id
            LEFT JOIN degrees d ON t.degree_id = d.id
            LEFT JOIN (
                SELECT thesis_id, COUNT(*) as view_count
                FROM thesis_views
                GROUP BY thesis_id
            ) tv ON t.id = tv.thesis_id
            LEFT JOIN (
                SELECT thesis_id, COUNT(*) as download_count
                FROM thesis_downloads
                GROUP BY thesis_id
            ) td ON t.id = td.thesis_id
            WHERE t.status = 'published'
            AND (
                to_tsvector('french', COALESCE(t.title_fr, '') || ' ' || COALESCE(t.abstract_fr, '')) @@ plainto_tsquery('french', %s)
                OR to_tsvector('arabic', COALESCE(t.title_ar, '') || ' ' || COALESCE(t.abstract_ar, '')) @@ plainto_tsquery('arabic', %s)
                OR to_tsvector('english', COALESCE(t.title_en, '') || ' ' || COALESCE(t.abstract_en, '')) @@ plainto_tsquery('english', %s)
            )
        """

        params = [q, q, q, q, q, q]

        # Apply additional filters
        if university_id:
            query += " AND t.university_id = %s"
            params.append(university_id)

        if faculty_id:
            query += " AND t.faculty_id = %s"
            params.append(faculty_id)

        if department_id:
            query += " AND t.department_id = %s"
            params.append(department_id)

        if category_id:
            query += """
                AND EXISTS (
                    SELECT 1 FROM thesis_categories tc
                    WHERE tc.thesis_id = t.id AND tc.category_id = %s
                )
            """
            params.append(category_id)

        if discipline:
            query += " AND t.discipline = %s"
            params.append(discipline)

        if language:
            query += " AND t.language_id = %s"
            params.append(language)

        if year_from:
            query += " AND EXTRACT(YEAR FROM t.defense_date) >= %s"
            params.append(year_from)

        if year_to:
            query += " AND EXTRACT(YEAR FROM t.defense_date) <= %s"
            params.append(year_to)

        if availability:
            if availability == "available":
                query += " AND t.status = 'published' AND t.file_url IS NOT NULL"
            elif availability == "preparing":
                query += " AND t.status IN ('submitted', 'under_review')"
            elif availability == "unavailable":
                query += " AND (t.status = 'rejected' OR t.file_url IS NULL)"

        # Apply sorting with relevance score
        if sort_by == "relevance":
            query += " ORDER BY (rank_fr + rank_ar + rank_en) DESC, t.defense_date DESC"
        elif sort_by == "date_desc":
            query += " ORDER BY t.defense_date DESC"
        elif sort_by == "date_asc":
            query += " ORDER BY t.defense_date ASC"
        elif sort_by == "title":
            query += " ORDER BY t.title_fr ASC"
        elif sort_by == "downloads":
            query += " ORDER BY COALESCE(td.download_count, 0) DESC"
        elif sort_by == "views":
            query += " ORDER BY COALESCE(tv.view_count, 0) DESC"

        # Apply pagination
        offset = (page - 1) * page_size
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, offset])

        cursor.execute(query, params)
        results = cursor.fetchall()

        # Transform results to match response model
        theses = []
        for row in results:
            thesis = {
                "id": str(row["id"]),
                "title_fr": row["title_fr"],
                "title_en": row["title_en"],
                "title_ar": row["title_ar"],
                "abstract_fr": row["abstract_fr"],
                "abstract_en": row["abstract_en"],
                "abstract_ar": row["abstract_ar"],
                "university_name": row["university_name"],
                "language_name": row["language_name"],
                "degree_name": row["degree_name"],
                "defense_date": row["defense_date"].isoformat() if row["defense_date"] else None,
                "page_count": row["page_count"],
                "status": row["status"],
                "view_count": row["view_count"] or 0,
                "download_count": row["download_count"] or 0,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
            }
            theses.append(thesis)

        cursor.close()
        conn.close()

        return create_success_response(
            data=theses,
            message=f"Found {len(theses)} theses matching '{q}'",
            request_id=request_id
        )

    except Exception as e:
        logger.error(f"Error searching theses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.get("/theses/recent", response_model=List[ThesisResponse], tags=["Public - Thesis search"]) # Recently published
async def get_recent_theses(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    days: int = Query(30, ge=1, le=365, description="Number of days to look back")
):
    """
    Get recently published theses.

    Parameters:
    - page: Page number (default: 1)
    - page_size: Results per page (default: 20, max: 100)
    - days: Number of days to look back (default: 30, max: 365)
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT
                t.id, t.title_fr, t.title_en, t.title_ar,
                t.abstract_fr, t.abstract_en, t.abstract_ar,
                t.defense_date, t.page_count, t.status,
                t.created_at, t.updated_at,
                u.name_fr as university_name,
                l.name_fr as language_name,
                d.name_fr as degree_name,
                COALESCE(tv.view_count, 0) as view_count,
                COALESCE(td.download_count, 0) as download_count
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN languages l ON t.language_id = l.id
            LEFT JOIN degrees d ON t.degree_id = d.id
            LEFT JOIN (
                SELECT thesis_id, COUNT(*) as view_count
                FROM thesis_views
                GROUP BY thesis_id
            ) tv ON t.id = tv.thesis_id
            LEFT JOIN (
                SELECT thesis_id, COUNT(*) as download_count
                FROM thesis_downloads
                GROUP BY thesis_id
            ) td ON t.id = td.thesis_id
            WHERE t.status = 'published'
            AND t.created_at >= NOW() - INTERVAL '%s days'
            ORDER BY t.created_at DESC
            LIMIT %s OFFSET %s
        """

        offset = (page - 1) * page_size
        cursor.execute(query, (days, page_size, offset))
        results = cursor.fetchall()

        # Transform results to match response model
        theses = []
        for row in results:
            thesis = {
                "id": str(row["id"]),
                "title_fr": row["title_fr"],
                "title_en": row["title_en"],
                "title_ar": row["title_ar"],
                "abstract_fr": row["abstract_fr"],
                "abstract_en": row["abstract_en"],
                "abstract_ar": row["abstract_ar"],
                "university_name": row["university_name"],
                "language_name": row["language_name"],
                "degree_name": row["degree_name"],
                "defense_date": row["defense_date"].isoformat() if row["defense_date"] else None,
                "page_count": row["page_count"],
                "status": row["status"],
                "view_count": row["view_count"] or 0,
                "download_count": row["download_count"] or 0,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
            }
            theses.append(thesis)

        cursor.close()
        conn.close()

        return create_success_response(
            data=theses,
            message=f"Found {len(theses)} recently published theses",
            request_id=request_id
        )

    except Exception as e:
        logger.error(f"Error retrieving recent theses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.get("/theses/popular", response_model=List[ThesisResponse], tags=["Public - Thesis search"]) # Most downloaded/viewed
async def get_popular_theses(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    period: str = Query("month", description="Time period: day, week, month, year, all")
):
    """
    Get most popular theses based on downloads and views.

    Parameters:
    - page: Page number (default: 1)
    - page_size: Results per page (default: 20, max: 100)
    - period: Time period to consider (default: month)
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Calculate date filter based on period
        date_filter = ""
        if period == "day":
            date_filter = "AND date_trunc('day', COALESCE(tv.created_at, td.created_at)) = date_trunc('day', CURRENT_DATE)"
        elif period == "week":
            date_filter = "AND date_trunc('week', COALESCE(tv.created_at, td.created_at)) = date_trunc('week', CURRENT_DATE)"
        elif period == "month":
            date_filter = "AND date_trunc('month', COALESCE(tv.created_at, td.created_at)) = date_trunc('month', CURRENT_DATE)"
        elif period == "year":
            date_filter = "AND date_trunc('year', COALESCE(tv.created_at, td.created_at)) = date_trunc('year', CURRENT_DATE)"

        query = f"""
            SELECT
                t.id, t.title_fr, t.title_en, t.title_ar,
                t.abstract_fr, t.abstract_en, t.abstract_ar,
                t.defense_date, t.page_count, t.status,
                t.created_at, t.updated_at,
                u.name_fr as university_name,
                l.name_fr as language_name,
                d.name_fr as degree_name,
                COALESCE(tv.view_count, 0) as view_count,
                COALESCE(td.download_count, 0) as download_count,
                (COALESCE(tv.view_count, 0) + COALESCE(td.download_count, 0) * 2) as popularity_score
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN languages l ON t.language_id = l.id
            LEFT JOIN degrees d ON t.degree_id = d.id
            LEFT JOIN (
                SELECT thesis_id, COUNT(*) as view_count
                FROM thesis_views tv
                {date_filter if date_filter else ""}
                GROUP BY thesis_id
            ) tv ON t.id = tv.thesis_id
            LEFT JOIN (
                SELECT thesis_id, COUNT(*) as download_count
                FROM thesis_downloads td
                {date_filter if date_filter else ""}
                GROUP BY thesis_id
            ) td ON t.id = td.thesis_id
            WHERE t.status = 'published'
            ORDER BY popularity_score DESC, t.created_at DESC
            LIMIT %s OFFSET %s
        """

        offset = (page - 1) * page_size
        cursor.execute(query, (page_size, offset))
        results = cursor.fetchall()

        # Transform results to match response model
        theses = []
        for row in results:
            thesis = {
                "id": str(row["id"]),
                "title_fr": row["title_fr"],
                "title_en": row["title_en"],
                "title_ar": row["title_ar"],
                "abstract_fr": row["abstract_fr"],
                "abstract_en": row["abstract_en"],
                "abstract_ar": row["abstract_ar"],
                "university_name": row["university_name"],
                "language_name": row["language_name"],
                "degree_name": row["degree_name"],
                "defense_date": row["defense_date"].isoformat() if row["defense_date"] else None,
                "page_count": row["page_count"],
                "status": row["status"],
                "view_count": row["view_count"] or 0,
                "download_count": row["download_count"] or 0,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
            }
            theses.append(thesis)

        cursor.close()
        conn.close()

        return create_success_response(
            data=theses,
            message=f"Found {len(theses)} popular theses",
            request_id=request_id
        )

    except Exception as e:
        logger.error(f"Error retrieving popular theses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.get("/theses/{thesis_id}", response_model=ThesisResponse, tags=["Public - Thesis search"]) # Get thesis details
async def get_thesis_details(
    request: Request,
    thesis_id: str
):
    """
    Get detailed information about a specific thesis.

    Parameters:
    - thesis_id: UUID of the thesis
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Main thesis query with all related data
        query = """
            SELECT
                t.id, t.title_fr, t.title_en, t.title_ar,
                t.abstract_fr, t.abstract_en, t.abstract_ar,
                t.defense_date, t.page_count, t.status, t.file_url,
                t.created_at, t.updated_at,
                u.name_fr as university_name, u.name_ar as university_name_ar,
                f.name_fr as faculty_name, f.name_ar as faculty_name_ar,
                s.name_fr as school_name, s.name_ar as school_name_ar,
                d.name_fr as department_name, d.name_ar as department_name_ar,
                deg.name_fr as degree_name, deg.name_ar as degree_name_ar,
                l.name_fr as language_name, l.name_ar as language_name_ar,
                t.thesis_number, t.study_location_id,
                COALESCE(tv.view_count, 0) as view_count,
                COALESCE(td.download_count, 0) as download_count
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN faculties f ON t.faculty_id = f.id
            LEFT JOIN schools s ON t.school_id = s.id
            LEFT JOIN departments d ON t.department_id = d.id
            LEFT JOIN degrees deg ON t.degree_id = deg.id
            LEFT JOIN languages l ON t.language_id = l.id
            LEFT JOIN (
                SELECT thesis_id, COUNT(*) as view_count
                FROM thesis_views
                GROUP BY thesis_id
            ) tv ON t.id = tv.thesis_id
            LEFT JOIN (
                SELECT thesis_id, COUNT(*) as download_count
                FROM thesis_downloads
                GROUP BY thesis_id
            ) td ON t.id = td.thesis_id
            WHERE t.id = %s AND t.status = 'published'
        """

        cursor.execute(query, (thesis_id,))
        thesis_row = cursor.fetchone()

        if not thesis_row:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thesis not found"
            )

        # Get academic persons (authors, directors, jury members)
        query = """
            SELECT
                ap.id, ap.complete_name_fr, ap.complete_name_ar,
                ap.first_name_fr, ap.last_name_fr,
                ap.first_name_ar, ap.last_name_ar,
                tap.role, tap.is_external
            FROM thesis_academic_persons tap
            JOIN academic_persons ap ON tap.person_id = ap.id
            WHERE tap.thesis_id = %s
            ORDER BY
                CASE
                    WHEN tap.role = 'author' THEN 1
                    WHEN tap.role = 'director' THEN 2
                    WHEN tap.role = 'co-director' THEN 3
                    ELSE 4
                END,
                tap.role
        """

        cursor.execute(query, (thesis_id,))
        academic_persons = cursor.fetchall()

        # Get categories
        query = """
            SELECT
                c.id, c.name_fr, c.name_en, c.name_ar,
                tc.is_primary
            FROM thesis_categories tc
            JOIN categories c ON tc.category_id = c.id
            WHERE tc.thesis_id = %s
            ORDER BY tc.is_primary DESC, c.name_fr
        """

        cursor.execute(query, (thesis_id,))
        categories = cursor.fetchall()

        # Get keywords
        query = """
            SELECT
                k.id, k.name_fr, k.name_en, k.name_ar
            FROM thesis_keywords tk
            JOIN keywords k ON tk.keyword_id = k.id
            WHERE tk.thesis_id = %s
            ORDER BY k.name_fr
        """

        cursor.execute(query, (thesis_id,))
        keywords = cursor.fetchall()

        # Get geographic entities
        query = """
            SELECT
                ge.id, ge.name_fr, ge.name_en, ge.name_ar,
                ge.entity_type
            FROM thesis_geographic_entities tge
            JOIN geographic_entities ge ON tge.geographic_entity_id = ge.id
            WHERE tge.thesis_id = %s
            ORDER BY ge.name_fr
        """

        cursor.execute(query, (thesis_id,))
        geographic_entities = cursor.fetchall()

        cursor.close()
        conn.close()

        # Structure the response
        thesis_data = {
            "id": str(thesis_row["id"]),
            "title_fr": thesis_row["title_fr"],
            "title_en": thesis_row["title_en"],
            "title_ar": thesis_row["title_ar"],
            "abstract_fr": thesis_row["abstract_fr"],
            "abstract_en": thesis_row["abstract_en"],
            "abstract_ar": thesis_row["abstract_ar"],
            "defense_date": thesis_row["defense_date"].isoformat() if thesis_row["defense_date"] else None,
            "page_count": thesis_row["page_count"],
            "status": thesis_row["status"],
            "file_url": thesis_row["file_url"],
            "thesis_number": thesis_row["thesis_number"],
            "created_at": thesis_row["created_at"].isoformat() if thesis_row["created_at"] else None,
            "updated_at": thesis_row["updated_at"].isoformat() if thesis_row["updated_at"] else None,
            "view_count": thesis_row["view_count"] or 0,
            "download_count": thesis_row["download_count"] or 0,
            "university": {
                "id": thesis_row["university_name"] and str(thesis_row["university_id"]) or None,
                "name_fr": thesis_row["university_name"],
                "name_ar": thesis_row["university_name_ar"]
            },
            "faculty": {
                "id": thesis_row["faculty_name"] and str(thesis_row["faculty_id"]) or None,
                "name_fr": thesis_row["faculty_name"],
                "name_ar": thesis_row["faculty_name_ar"]
            },
            "school": {
                "id": thesis_row["school_name"] and str(thesis_row["school_id"]) or None,
                "name_fr": thesis_row["school_name"],
                "name_ar": thesis_row["school_name_ar"]
            },
            "department": {
                "id": thesis_row["department_name"] and str(thesis_row["department_id"]) or None,
                "name_fr": thesis_row["department_name"],
                "name_ar": thesis_row["department_name_ar"]
            },
            "degree": {
                "id": thesis_row["degree_name"] and str(thesis_row["degree_id"]) or None,
                "name_fr": thesis_row["degree_name"],
                "name_ar": thesis_row["degree_name_ar"]
            },
            "language": {
                "id": thesis_row["language_name"] and str(thesis_row["language_id"]) or None,
                "name_fr": thesis_row["language_name"],
                "name_ar": thesis_row["language_name_ar"]
            },
            "academic_persons": [
                {
                    "id": str(person["id"]),
                    "name_fr": person["complete_name_fr"],
                    "name_ar": person["complete_name_ar"],
                    "first_name_fr": person["first_name_fr"],
                    "last_name_fr": person["last_name_fr"],
                    "first_name_ar": person["first_name_ar"],
                    "last_name_ar": person["last_name_ar"],
                    "role": person["role"],
                    "is_external": person["is_external"]
                }
                for person in academic_persons
            ],
            "categories": [
                {
                    "id": str(category["id"]),
                    "name_fr": category["name_fr"],
                    "name_en": category["name_en"],
                    "name_ar": category["name_ar"],
                    "is_primary": category["is_primary"]
                }
                for category in categories
            ],
            "keywords": [
                {
                    "id": str(keyword["id"]),
                    "name_fr": keyword["name_fr"],
                    "name_en": keyword["name_en"],
                    "name_ar": keyword["name_ar"]
                }
                for keyword in keywords
            ],
            "geographic_entities": [
                {
                    "id": str(entity["id"]),
                    "name_fr": entity["name_fr"],
                    "name_en": entity["name_en"],
                    "name_ar": entity["name_ar"],
                    "entity_type": entity["entity_type"]
                }
                for entity in geographic_entities
            ]
        }

        return create_success_response(
            data=thesis_data,
            message="Thesis details retrieved successfully",
            request_id=request_id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving thesis details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.get("/theses/{thesis_id}/download", tags=["Public - Thesis search"])
async def download_thesis(
    request: Request,
    thesis_id: str,
    token: Optional[str] = Query(None, description="Download token for access control")
):
    """
    Download a thesis PDF file.

    Parameters:
    - thesis_id: UUID of the thesis
    - token: Optional download token for access control
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Check if thesis exists and is available for download
        query = """
            SELECT
                t.id, t.title_fr, t.file_url, t.file_name, t.status,
                u.name_fr as university_name
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            WHERE t.id = %s AND t.status = 'published' AND t.file_url IS NOT NULL
        """

        cursor.execute(query, (thesis_id,))
        thesis_row = cursor.fetchone()

        if not thesis_row:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thesis not found or not available for download"
            )

        # Record the download event (if user is authenticated)
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            try:
                download_query = """
                    INSERT INTO thesis_downloads (thesis_id, user_id, downloaded_at)
                    VALUES (%s, %s, NOW())
                """
                cursor.execute(download_query, (thesis_id, user_id))
                conn.commit()
            except Exception as e:
                logger.warning(f"Failed to record download event: {e}")
                # Don't fail the download if recording fails

        cursor.close()
        conn.close()

        # Get file path
        file_url = thesis_row["file_url"]
        file_name = thesis_row["file_name"] or f"{thesis_row['title_fr']}.pdf"

        # Check if file exists
        if not os.path.exists(file_url):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thesis file not found on server"
            )

        # Return file response
        return FileResponse(
            path=file_url,
            filename=file_name,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{file_name}\"",
                "X-Request-ID": request_id or ""
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading thesis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.post("/theses/{thesis_id}/view", tags=["Public - Thesis search"])
async def record_thesis_view(
    request: Request,
    thesis_id: str
):
    """
    Record a thesis view event.

    Parameters:
    - thesis_id: UUID of the thesis
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        # Check if thesis exists and is published
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT id, status
            FROM theses
            WHERE id = %s AND status = 'published'
        """

        cursor.execute(query, (thesis_id,))
        thesis_row = cursor.fetchone()

        if not thesis_row:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thesis not found or not published"
            )

        # Record the view event (if user is authenticated)
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            try:
                view_query = """
                    INSERT INTO thesis_views (thesis_id, user_id, viewed_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (thesis_id, user_id, DATE(viewed_at))
                    DO UPDATE SET viewed_at = NOW()
                """
                cursor.execute(view_query, (thesis_id, user_id))
                conn.commit()
            except Exception as e:
                logger.warning(f"Failed to record view event: {e}")
                # Don't fail if recording fails

        cursor.close()
        conn.close()

        return create_success_response(
            data={"thesis_id": thesis_id, "viewed": True},
            message="Thesis view recorded successfully",
            request_id=request_id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording thesis view: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# =============================================================================
# USER MANAGEMENT ENDPOINTS (Admin)
# =============================================================================

@app.get("/admin/users", response_model=PaginatedResponse, tags=["Admin - User Management"])
async def get_users(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    search: Optional[str] = Query(None, description="Search by username, email, or name"),
    role_filter: Optional[str] = Query(None, description="Filter by role"),
    status_filter: Optional[str] = Query(None, description="Filter by status: active, inactive, pending"),
    sort_by: str = Query("created_at", description="Sort by: created_at, username, email, role_level"),
    sort_order: str = Query("desc", description="Sort order: asc, desc")
):
    """
    Get paginated list of users with optional filtering and sorting.

    Parameters:
    - page: Page number (default: 1)
    - page_size: Results per page (default: 20, max: 100)
    - search: Search query for username, email, or name
    - role_filter: Filter by user role
    - status_filter: Filter by user status
    - sort_by: Sort criteria
    - sort_order: Sort order (asc/desc)
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        # Check admin permissions
        user_role = getattr(request.state, "user_role", None)
        if not user_role or user_role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Build base query
        query = """
            SELECT
                u.id, u.username, u.email, u.first_name, u.last_name,
                u.is_active, u.is_verified, u.created_at, u.updated_at, u.last_login,
                ur.role_name, ur.role_code, ur.role_level,
                COALESCE(stats.thesis_count, 0) as thesis_count,
                COALESCE(stats.download_count, 0) as download_count,
                COALESCE(stats.view_count, 0) as view_count
            FROM users u
            LEFT JOIN user_roles ur ON u.role_id = ur.id
            LEFT JOIN (
                SELECT
                    submitted_by as user_id,
                    COUNT(*) as thesis_count,
                    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count
                FROM theses
                GROUP BY submitted_by
            ) stats ON u.id = stats.user_id
        """

        params = []

        # Apply filters
        if search:
            query += " WHERE (u.username ILIKE %s OR u.email ILIKE %s OR u.first_name ILIKE %s OR u.last_name ILIKE %s)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

        if role_filter:
            if "WHERE" in query:
                query += " AND ur.role_code = %s"
            else:
                query += " WHERE ur.role_code = %s"
            params.append(role_filter)

        if status_filter:
            if "WHERE" in query:
                query += " AND u.is_active = %s"
            else:
                query += " WHERE u.is_active = %s"
            params.append(status_filter == "active")

        # Apply sorting
        valid_sort_fields = {
            "created_at": "u.created_at",
            "username": "u.username",
            "email": "u.email",
            "role_level": "ur.role_level"
        }

        sort_field = valid_sort_fields.get(sort_by, "u.created_at")
        order_clause = "DESC" if sort_order.lower() == "desc" else "ASC"
        query += f" ORDER BY {sort_field} {order_clause}"

        # Get total count
        count_query = query.replace("SELECT", "SELECT COUNT(*)", 1).split("ORDER BY")[0]
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()["count"]

        # Apply pagination
        offset = (page - 1) * page_size
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, offset])

        cursor.execute(query, params)
        results = cursor.fetchall()

        # Transform results
        users = []
        for row in results:
            user = {
                "id": str(row["id"]),
                "username": row["username"],
                "email": row["email"],
                "first_name": row["first_name"],
                "last_name": row["last_name"],
                "is_active": row["is_active"],
                "is_verified": row["is_verified"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                "last_login": row["last_login"].isoformat() if row["last_login"] else None,
                "role": {
                    "name": row["role_name"],
                    "code": row["role_code"],
                    "level": row["role_level"]
                },
                "stats": {
                    "thesis_count": row["thesis_count"] or 0,
                    "download_count": row["download_count"] or 0,
                    "view_count": row["view_count"] or 0
                }
            }
            users.append(user)

        cursor.close()
        conn.close()

        return create_success_response(
            data={
                "items": users,
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size
            },
            message=f"Found {total_count} users",
            request_id=request_id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.get("/admin/users/{user_id}", response_model=UserResponse, tags=["Admin - User Management"])
async def get_user_details(
    request: Request,
    user_id: str
):
    """
    Get detailed information about a specific user.

    Parameters:
    - user_id: UUID of the user
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        # Check admin permissions
        user_role = getattr(request.state, "user_role", None)
        if not user_role or user_role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT
                u.id, u.username, u.email, u.first_name, u.last_name,
                u.is_active, u.is_verified, u.created_at, u.updated_at, u.last_login,
                ur.role_name, ur.role_code, ur.role_level, ur.description as role_description
            FROM users u
            LEFT JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = %s
        """

        cursor.execute(query, (user_id,))
        user_row = cursor.fetchone()

        if not user_row:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        cursor.close()
        conn.close()

        user_data = {
            "id": str(user_row["id"]),
            "username": user_row["username"],
            "email": user_row["email"],
            "first_name": user_row["first_name"],
            "last_name": user_row["last_name"],
            "is_active": user_row["is_active"],
            "is_verified": user_row["is_verified"],
            "created_at": user_row["created_at"].isoformat() if user_row["created_at"] else None,
            "updated_at": user_row["updated_at"].isoformat() if user_row["updated_at"] else None,
            "last_login": user_row["last_login"].isoformat() if user_row["last_login"] else None,
            "role": {
                "name": user_row["role_name"],
                "code": user_row["role_code"],
                "level": user_row["role_level"],
                "description": user_row["role_description"]
            }
        }

        return create_success_response(
            data=user_data,
            message="User details retrieved successfully",
            request_id=request_id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.put("/admin/users/{user_id}", response_model=UserResponse, tags=["Admin - User Management"])
async def update_user(
    request: Request,
    user_id: str,
    user_update: UserUpdate
):
    """
    Update user information and permissions.

    Parameters:
    - user_id: UUID of the user
    - user_update: Updated user data
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        # Check admin permissions
        user_role = getattr(request.state, "user_role", None)
        if not user_role or user_role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        # Prevent self-modification of critical fields
        current_user_id = getattr(request.state, "user_id", None)
        if str(current_user_id) == user_id:
            # Users can update some fields themselves, but not role or status
            if hasattr(user_update, 'role_id') or hasattr(user_update, 'is_active'):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot modify own role or status"
                )

        conn = get_db_connection()
        cursor = conn.cursor()

        # Build update query
        update_fields = []
        params = []

        if hasattr(user_update, 'first_name') and user_update.first_name is not None:
            update_fields.append("first_name = %s")
            params.append(user_update.first_name)

        if hasattr(user_update, 'last_name') and user_update.last_name is not None:
            update_fields.append("last_name = %s")
            params.append(user_update.last_name)

        if hasattr(user_update, 'email') and user_update.email is not None:
            # Check if email already exists
            cursor.execute("SELECT id FROM users WHERE email = %s AND id != %s", (user_update.email, user_id))
            if cursor.fetchone():
                cursor.close()
                conn.close()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
            update_fields.append("email = %s")
            params.append(user_update.email)

        if hasattr(user_update, 'is_active') and user_update.is_active is not None:
            update_fields.append("is_active = %s")
            params.append(user_update.is_active)

        if hasattr(user_update, 'role_id') and user_update.role_id is not None:
            # Validate role exists
            cursor.execute("SELECT id FROM user_roles WHERE id = %s", (user_update.role_id,))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid role ID"
                )
            update_fields.append("role_id = %s")
            params.append(user_update.role_id)

        if not update_fields:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )

        update_fields.append("updated_at = NOW()")
        params.append(user_id)

        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
        cursor.execute(query, params)

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        conn.commit()

        # Log the action
        log_query = """
            INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        cursor.execute(log_query, (
            current_user_id,
            "UPDATE_USER",
            "users",
            user_id,
            "User updated by admin",
            "User updated by admin",
        ))
        conn.commit()

        cursor.close()
        conn.close()

        return create_success_response(
            data={"user_id": user_id, "updated": True},
            message="User updated successfully",
            request_id=request_id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.delete("/admin/users/{user_id}", response_model=BaseResponse, tags=["Admin - User Management"])
async def delete_user(
    request: Request,
    user_id: str
):
    """
    Delete a user account (soft delete or anonymize).

    Parameters:
    - user_id: UUID of the user
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        # Check super admin permissions
        user_role = getattr(request.state, "user_role", None)
        if user_role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions - super admin required"
            )

        # Prevent self-deletion
        current_user_id = getattr(request.state, "user_id", None)
        if str(current_user_id) == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete own account"
            )

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if user exists
        cursor.execute("SELECT id, username, email FROM users WHERE id = %s", (user_id,))
        user_row = cursor.fetchone()

        if not user_row:
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Soft delete - set inactive and anonymize
        query = """
            UPDATE users
            SET
                username = %s,
                email = %s,
                first_name = 'Deleted',
                last_name = 'User',
                is_active = false,
                updated_at = NOW()
            WHERE id = %s
        """
        anonymized_username = f"deleted_{user_id[:8]}"
        anonymized_email = f"deleted_{user_id[:8]}@deleted.local"

        cursor.execute(query, (anonymized_username, anonymized_email, user_id))

        # Log the action
        log_query = """
            INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        cursor.execute(log_query, (
            current_user_id,
            "DELETE_USER",
            "users",
            user_id,
            f"Deleted user {user_row[1]} ({user_row[2]})",
            "User account anonymized and deactivated",
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return create_success_response(
            data={"user_id": user_id, "deleted": True},
            message="User deleted successfully",
            request_id=request_id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.get("/admin/users/{user_id}/activity", response_model=PaginatedResponse, tags=["Admin - User Management"])
async def get_user_activity(
    request: Request,
    user_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    activity_type: Optional[str] = Query(None, description="Filter by activity type")
):
    """
    Get user activity log (downloads, views, uploads, etc.).

    Parameters:
    - user_id: UUID of the user
    - page: Page number (default: 1)
    - page_size: Results per page (default: 20, max: 100)
    - activity_type: Filter by activity type
    """
    request_id = getattr(request.state, "request_id", None)

    try:
        # Check admin permissions
        user_role = getattr(request.state, "user_role", None)
        if not user_role or user_role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Build activity query
        query = """
            SELECT
                'download' as activity_type,
                td.thesis_id as record_id,
                t.title_fr as record_title,
                td.downloaded_at as created_at,
                'Downloaded thesis' as description
            FROM thesis_downloads td
            LEFT JOIN theses t ON td.thesis_id = t.id
            WHERE td.user_id = %s

            UNION ALL

            SELECT
                'view' as activity_type,
                tv.thesis_id as record_id,
                t.title_fr as record_title,
                tv.viewed_at as created_at,
                'Viewed thesis' as description
            FROM thesis_views tv
            LEFT JOIN theses t ON tv.thesis_id = t.id
            WHERE tv.user_id = %s

            UNION ALL

            SELECT
                'upload' as activity_type,
                t.id as record_id,
                t.title_fr as record_title,
                t.created_at as created_at,
                'Uploaded thesis' as description
            FROM theses t
            WHERE t.submitted_by = %s
        """

        params = [user_id, user_id, user_id]

        if activity_type:
            query += " WHERE activity_type = %s"
            params.append(activity_type)

        # Get total count
        count_query = f"SELECT COUNT(*) as count FROM ({query}) as activities"
        cursor.execute(count_query, params[:-1] if activity_type else params)
        total_count = cursor.fetchone()["count"]

        # Apply sorting and pagination
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        offset = (page - 1) * page_size
        params.extend([page_size, offset])

        cursor.execute(query, params)
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        return create_success_response(
            data={
                "items": results,
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size
            },
            message=f"Found {total_count} activities for user",
            request_id=request_id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user activity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# =============================================================================
# APPLICATION LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    try:
        # Initialize database connection
        init_database()
        logger.info("Database connection initialized successfully")

        # Create upload directories
        for directory in [TEMP_UPLOAD_DIR, PUBLISHED_DIR, BULK_UPLOAD_DIR]:
            directory.mkdir(parents=True, exist_ok=True)
        logger.info("Upload directories created/verified")

        # Clean up old temporary files on startup
        #cleaned_count = cleanup_old_temp_files(days_old=7)
        #logger.info(f"Cleaned up {cleaned_count} old temporary files")

        logger.info("Application startup completed successfully")

    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down application...")

    try:
        # Close database connections
        if db_pool:
            db_pool.close_all()
            logger.info("Database connections closed")

        logger.info("Application shutdown completed")

    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Basic health check endpoint for testing
@app.get("/health", tags=["Health"])
async def health_check(request: Request):
    """Basic health check endpoint"""
    request_id = getattr(request.state, "request_id", None)
    
    # Check database connectivity
    db_healthy = check_database_health()
    
    # Check upload directories
    dirs_healthy = all(
        directory.exists() and directory.is_dir() 
        for directory in [TEMP_UPLOAD_DIR, PUBLISHED_DIR, BULK_UPLOAD_DIR]
    )
    
    status = "healthy" if db_healthy and dirs_healthy else "unhealthy"
    status_code = status.HTTP_200_OK if status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return JSONResponse(
        status_code=status_code,
        content=create_success_response(
            data={
                "status": status,
                "database": "connected" if db_healthy else "disconnected",
                "file_storage": "accessible" if dirs_healthy else "inaccessible",
                "version": settings.APP_VERSION,
                "environment": "development" if settings.DEBUG else "production"
            },
            message=f"Application is {status}",
            request_id=request_id
        )
    )

# Root endpoint
@app.get("/", tags=["Root"])
async def root(request: Request):
    """Root endpoint with API information"""
    request_id = getattr(request.state, "request_id", None)
    
    return create_success_response(
        data={
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "description": "Moroccan Thesis Repository API",
            "docs_url": "/docs" if settings.DEBUG else None,
            "health_url": "/health"
        },
        message="Welcome to Theses.ma API",
        request_id=request_id
    )

# =============================================================================
# MAIN APPLICATION RUNNER
# =============================================================================

if __name__ == "__main__":
    import uvicorn
        
    logger.info("Starting Theses.ma API server...")
    
    uvicorn.run(
        "main:app",  # Update this to match your actual filename
        host="127.0.0.1",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )