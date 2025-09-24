"""
FastAPI Application for theses.ma - Moroccan Thesis Repository
A comprehensive thesis management and search platform
"""

# =============================================================================
# IMPORTS AND DEPENDENCIES
# =============================================================================

# FastAPI Core
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form,Query,Request
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
        "http://127.0.0.1:8080",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:5173"
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

class ReferenceTree(str, Enum):
    UNIVERSITIES = "universities"
    SCHOOLS = "schools"
    CATEGORIES = "categories"
    GEOGRAPHIC = "geographic"

class InstitutionLevel(str, Enum):
    UNIVERSITY = "university"
    FACULTY = "faculty"
    DEPARTMENT = "department"
    SCHOOL = "school"

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
    rejection_reason: Optional[str] = None

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
    total_schools: int = 0
    total_categories: int = 0
    total_keywords: int = 0
    total_degrees: int = 0
    total_languages: int = 0
    total_geographic_entities: int = 0
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
    )
    
    # Add CORS middleware
    # In development, allow any origin to simplify local testing (including file:// and custom ports)
    cors_common_kwargs = {
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
    if settings.DEBUG:
        app.add_middleware(
            CORSMiddleware,
            allow_origin_regex=".*",
            **cors_common_kwargs,
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.ALLOWED_ORIGINS,
            **cors_common_kwargs,
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
    limit: int = Query(20, ge=1, le=10000, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in name fields"),
    order_by: str = Query("name_fr", description="Field to order by"),
    order_dir: str = Query("asc", regex="^(asc|desc)$", description="Order direction"),
    load_all: bool = Query(False, description="Load all entities without pagination"),
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
        
        # Get total count
        total = execute_query(count_query, count_params, fetch_one=True)["total"]
        
        if load_all:
            # Load all entities without pagination
            results = execute_query_with_result(base_query, params)
            # Set pagination meta to reflect all data
            page = 1
            limit = total
        else:
            # Add pagination
            offset = (page - 1) * limit
            base_query += f" LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            # Get paginated results
            results = execute_query_with_result(base_query, params)
        
        # Precompute roll-up counts for dashboard cards
        uni_ids = [str(r["id"]) for r in results]
        faculty_counts: Dict[str, int] = {}
        department_counts: Dict[str, int] = {}
        thesis_counts: Dict[str, int] = {}
        if uni_ids:
            placeholders = ",".join(["%s"] * len(uni_ids))
            # Faculties per university
            fac_q = f"SELECT university_id, COUNT(*) AS c FROM faculties WHERE university_id IN ({placeholders}) GROUP BY university_id"
            for r in execute_query_with_result(fac_q, uni_ids):
                faculty_counts[str(r["university_id"])] = r["c"]
            # Departments via faculties per university
            dept_q = f"""
                SELECT f.university_id AS uid, COUNT(d.id) AS c
                FROM departments d
                JOIN faculties f ON d.faculty_id = f.id
                WHERE f.university_id IN ({placeholders})
                GROUP BY f.university_id
            """
            for r in execute_query_with_result(dept_q, uni_ids):
                department_counts[str(r["uid"])] = r["c"]
            # Theses per university (approved/published)
            thesis_q = f"SELECT university_id, COUNT(*) AS c FROM theses WHERE status IN ('approved','published') AND university_id IN ({placeholders}) GROUP BY university_id"
            for r in execute_query_with_result(thesis_q, uni_ids):
                thesis_counts[str(r["university_id"])] = r["c"]
        
        # Format results
        universities = []
        for row in results:
            uid = str(row["id"])
            universities.append({
                "id": uid,
                "name_fr": row["name_fr"],
                "name_ar": row["name_ar"],
                "name_en": row["name_en"],
                "acronym": row["acronym"],
                "geographic_entities_id": str(row["geographic_entities_id"]) if row["geographic_entities_id"] else None,
                "location_name": row["location_name"],
                "faculty_count": faculty_counts.get(uid, 0),
                "department_count": department_counts.get(uid, 0),
                "thesis_count": thesis_counts.get(uid, 0),
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
    

@app.get("/admin/universities/tree", response_model=List[Dict], tags=["Admin - Universities"])
async def get_universities_tree(
    request: Request,
    include_counts: bool = Query(True, description="Include aggregated counts on nodes"),
    include_theses: bool = Query(False, description="Include sample theses under departments"),
    theses_per_department: int = Query(3, ge=0, le=10, description="Number of theses to include per department when include_theses=true"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    Return a hierarchical tree of universities -> faculties -> departments.
    Optionally include per-node counts and sample theses under each department.
    """
    try:
        # Load all universities, faculties and departments
        universities = execute_query_with_result(
            "SELECT id, name_fr, acronym FROM universities ORDER BY name_fr"
        )
        faculties = execute_query_with_result(
            "SELECT id, university_id, name_fr, acronym FROM faculties ORDER BY name_fr"
        )
        departments = execute_query_with_result(
            "SELECT id, faculty_id, name_fr, acronym FROM departments ORDER BY name_fr"
        )

        # Group by parent relations
        faculties_by_university: Dict[str, List[Dict[str, Any]]] = {}
        for f in faculties:
            uid = str(f["university_id"]) if f["university_id"] else None
            if not uid:
                continue
            faculties_by_university.setdefault(uid, []).append({
                "id": str(f["id"]),
                "name_fr": f["name_fr"],
                "acronym": f.get("acronym"),
                "departments": []
            })

        departments_by_faculty: Dict[str, List[Dict[str, Any]]] = {}
        department_ids: List[str] = []
        for d in departments:
            fid = str(d["faculty_id"]) if d["faculty_id"] else None
            if not fid:
                continue
            dep_node = {
                "id": str(d["id"]),
                "name_fr": d["name_fr"],
                "acronym": d.get("acronym"),
            }
            if include_counts:
                dep_node["thesis_count"] = 0  # will populate later if needed
            if include_theses and theses_per_department > 0:
                dep_node["theses"] = []  # will populate later
            departments_by_faculty.setdefault(fid, []).append(dep_node)
            department_ids.append(str(d["id"]))

        # Attach departments to faculties
        for uid, fac_list in faculties_by_university.items():
            for fac in fac_list:
                fid = fac["id"]
                fac["departments"] = departments_by_faculty.get(fid, [])
                if include_counts:
                    fac["department_count"] = len(fac["departments"])

        # Precompute thesis counts per department if requested
        thesis_counts: Dict[str, int] = {}
        if include_counts and department_ids:
            placeholders = ",".join(["%s"] * len(department_ids))
            count_query = f"""
                SELECT department_id, COUNT(*) AS c
                FROM theses
                WHERE status IN ('approved','published') AND department_id IN ({placeholders})
                GROUP BY department_id
            """
            rows = execute_query_with_result(count_query, department_ids)
            thesis_counts = {str(r["department_id"]): r["c"] for r in rows}
            # fill counts
            for fac_list in faculties_by_university.values():
                for fac in fac_list:
                    for dep in fac["departments"]:
                        dep["thesis_count"] = thesis_counts.get(dep["id"], 0)

        # Optionally include sample theses per department
        if include_theses and theses_per_department > 0 and department_ids:
            placeholders = ",".join(["%s"] * len(department_ids))
            sample_query = f"""
                SELECT * FROM (
                    SELECT 
                        t.id,
                        t.title_fr,
                        t.defense_date,
                        t.status,
                        t.department_id,
                        ROW_NUMBER() OVER (
                            PARTITION BY t.department_id 
                            ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC
                        ) AS rn
                    FROM theses t
                    WHERE t.status IN ('approved','published') AND t.department_id IN ({placeholders})
                ) s
                WHERE s.rn <= %s
            """
            params = department_ids + [theses_per_department]
            rows = execute_query_with_result(sample_query, params)
            theses_by_department: Dict[str, List[Dict[str, Any]]] = {}
            for r in rows:
                did = str(r["department_id"]) if r["department_id"] else None
                if not did:
                    continue
                theses_by_department.setdefault(did, []).append({
                    "id": str(r["id"]),
                    "title_fr": r["title_fr"],
                    "defense_date": r["defense_date"],
                    "status": r["status"],
                })
            for fac_list in faculties_by_university.values():
                for fac in fac_list:
                    for dep in fac["departments"]:
                        dep["theses"] = theses_by_department.get(dep["id"], [])

        # Build final tree per university
        tree: List[Dict[str, Any]] = []
        for u in universities:
            uid = str(u["id"])
            uni_node: Dict[str, Any] = {
                "id": uid,
                "type": "university",
                "name_fr": u["name_fr"],
                "acronym": u.get("acronym"),
                "faculties": faculties_by_university.get(uid, [])
            }
            if include_counts:
                uni_node["faculty_count"] = len(uni_node["faculties"])
                uni_node["department_count"] = sum(len(f["departments"]) for f in uni_node["faculties"]) if uni_node["faculties"] else 0
                if thesis_counts:
                    # total theses across departments
                    uni_node["thesis_count"] = sum(
                        thesis_counts.get(dep["id"], 0)
                        for f in uni_node["faculties"]
                        for dep in f["departments"]
                    )
            tree.append(uni_node)

        return tree

    except Exception as e:
        logger.error(f"Error building universities tree: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to build universities tree")

# Faculties (including retreiving tree of faculties/departments)
# =============================================================================

@app.get("/admin/faculties", response_model=PaginatedResponse, tags=["Admin - Faculties"])
async def get_admin_faculties(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=10000, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in name fields"),
    university_id: Optional[str] = Query(None, description="Filter by university"),
    order_by: str = Query("name_fr", description="Field to order by"),
    order_dir: str = Query("asc", regex="^(asc|desc)$", description="Order direction"),
    load_all: bool = Query(False, description="Load all entities without pagination"),
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
        
        # Get total count
        total = execute_query(count_query, count_params, fetch_one=True)["total"]
        
        if load_all:
            # Load all entities without pagination
            results = execute_query_with_result(base_query, params)
            # Set pagination meta to reflect all data
            page = 1
            limit = total
        else:
            # Add pagination
            offset = (page - 1) * limit
            base_query += " LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            # Get paginated results
            results = execute_query_with_result(base_query, params)
        
        # Roll-up counts for dashboard cards
        fac_ids = [str(r["id"]) for r in results]
        department_counts: Dict[str, int] = {}
        thesis_counts: Dict[str, int] = {}
        if fac_ids:
            placeholders = ",".join(["%s"] * len(fac_ids))
            dept_q = f"SELECT faculty_id, COUNT(*) AS c FROM departments WHERE faculty_id IN ({placeholders}) GROUP BY faculty_id"
            for r in execute_query_with_result(dept_q, fac_ids):
                department_counts[str(r["faculty_id"])] = r["c"]
            thesis_q = f"SELECT faculty_id, COUNT(*) AS c FROM theses WHERE status IN ('approved','published') AND faculty_id IN ({placeholders}) GROUP BY faculty_id"
            for r in execute_query_with_result(thesis_q, fac_ids):
                thesis_counts[str(r["faculty_id"])] = r["c"]

        # Format results
        faculties = []
        for row in results:
            fid = str(row["id"])
            faculties.append({
                "id": fid,
                "university_id": str(row["university_id"]),
                "university_name": row["university_name"],
                "university_acronym": row["university_acronym"],
                "name_fr": row["name_fr"],
                "name_ar": row["name_ar"],
                "name_en": row["name_en"],
                "acronym": row["acronym"],
                "department_count": department_counts.get(fid, 0),
                "thesis_count": thesis_counts.get(fid, 0),
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
    include_counts: bool = Query(True, description="Include aggregated counts on nodes"),
    include_theses: bool = Query(False, description="Include sample theses for schools/departments"),
    theses_per_node: int = Query(3, ge=0, le=10, description="Number of theses to include per node when include_theses=true"),
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

        # Load departments attached to schools
        dept_rows = execute_query_with_result(
            "SELECT id, school_id, name_fr, acronym FROM departments WHERE school_id IS NOT NULL ORDER BY name_fr"
        )
        departments_by_school: Dict[str, List[Dict[str, Any]]] = {}
        for d in dept_rows:
            sid = str(d["school_id"]) if d["school_id"] else None
            if not sid:
                continue
            node: Dict[str, Any] = {
                "id": str(d["id"]),
                "type": "department",
                "name_fr": d["name_fr"],
                "acronym": d.get("acronym"),
            }
            if include_counts:
                node["thesis_count"] = 0
            if include_theses and theses_per_node > 0:
                node["theses"] = []
            departments_by_school.setdefault(sid, []).append(node)

        # Build tree structure
        def build_school_node(school):
            node: Dict[str, Any] = {
                "id": str(school["id"]),
                "type": "school",
                "name_fr": school["name_fr"],
                "name_ar": school["name_ar"],
                "name_en": school["name_en"],
                "acronym": school["acronym"],
                "parent_type": "university" if school["parent_university_id"] else "school",
                "parent_id": str(school["parent_university_id"] or school["parent_school_id"]),
                "children": []
            }
            # Attach direct departments
            node["departments"] = departments_by_school.get(node["id"], [])
            if include_counts:
                node["department_count"] = len(node["departments"])
            if include_theses and theses_per_node > 0:
                node["theses"] = []
            return node
        
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
        
        # Optionally compute thesis counts and samples
        if include_counts or (include_theses and theses_per_node > 0):
            # Department counts
            dept_ids = [dep["id"] for deps in departments_by_school.values() for dep in deps]
            dept_counts: Dict[str, int] = {}
            if dept_ids:
                placeholders = ",".join(["%s"] * len(dept_ids))
                q = f"""
                    SELECT department_id, COUNT(*) AS c
                    FROM theses
                    WHERE status IN ('approved','published') AND department_id IN ({placeholders})
                    GROUP BY department_id
                """
                rows = execute_query_with_result(q, dept_ids)
                dept_counts = {str(r["department_id"]): r["c"] for r in rows}
                for deps in departments_by_school.values():
                    for dep in deps:
                        dep["thesis_count"] = dept_counts.get(dep["id"], 0)
            # School direct thesis counts
            school_ids = [str(s["id"]) for s in schools]
            school_counts: Dict[str, int] = {}
            if include_counts and school_ids:
                placeholders = ",".join(["%s"] * len(school_ids))
                q = f"""
                    SELECT school_id, COUNT(*) AS c
                    FROM theses
                    WHERE status IN ('approved','published') AND school_id IN ({placeholders})
                    GROUP BY school_id
                """
                rows = execute_query_with_result(q, school_ids)
                school_counts = {str(r["school_id"]): r["c"] for r in rows}
            # Sample theses per department/school
            dep_samples: Dict[str, List[Dict[str, Any]]] = {}
            school_samples: Dict[str, List[Dict[str, Any]]] = {}
            if include_theses and theses_per_node > 0:
                parts = []
                params: List[Any] = []
                if dept_ids:
                    placeholders = ",".join(["%s"] * len(dept_ids))
                    parts.append(f"""
                        SELECT id, title_fr, defense_date, status, department_id, NULL::uuid AS school_id, rn FROM (
                            SELECT t.id, t.title_fr, t.defense_date, t.status, t.department_id,
                                   ROW_NUMBER() OVER (PARTITION BY t.department_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) AS rn
                            FROM theses t WHERE t.status IN ('approved','published') AND t.department_id IN ({placeholders})
                        ) x WHERE rn <= %s
                    """)
                    params.extend(dept_ids + [theses_per_node])
                if school_ids:
                    placeholders = ",".join(["%s"] * len(school_ids))
                    parts.append(f"""
                        SELECT id, title_fr, defense_date, status, NULL::uuid AS department_id, school_id, rn FROM (
                            SELECT t.id, t.title_fr, t.defense_date, t.status, t.school_id,
                                   ROW_NUMBER() OVER (PARTITION BY t.school_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) AS rn
                            FROM theses t WHERE t.status IN ('approved','published') AND t.school_id IN ({placeholders})
                        ) y WHERE rn <= %s
                    """)
                    params.extend(school_ids + [theses_per_node])
                if parts:
                    q = " UNION ALL " + (" UNION ALL ".join(parts)) if len(parts) > 1 else parts[0]
                    rows = execute_query_with_result(q, params)
                    for r in rows:
                        if r["department_id"]:
                            dep_samples.setdefault(str(r["department_id"]), []).append({
                                "id": str(r["id"]),
                                "title_fr": r["title_fr"],
                                "defense_date": r["defense_date"],
                                "status": r["status"],
                            })
                        if r["school_id"]:
                            school_samples.setdefault(str(r["school_id"]), []).append({
                                "id": str(r["id"]),
                                "title_fr": r["title_fr"],
                                "defense_date": r["defense_date"],
                                "status": r["status"],
                            })

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
                    # Attach counts and samples if requested
                    if include_counts:
                        direct = school_counts.get(school["id"], 0) if 'school_counts' in locals() else 0
                        dept_total = sum(dep.get("thesis_count", 0) for dep in school.get("departments", []))
                        school["thesis_count"] = direct + dept_total
                    if include_theses and theses_per_node > 0:
                        school["theses"] = school_samples.get(school["id"], [])
                
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
async def get_admin_departments(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    university_id: Optional[str] = Query(None),
    faculty_id: Optional[str] = Query(None),
    school_id: Optional[str] = Query(None),
    order_by: str = Query("name_fr"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
    admin_user: dict = Depends(get_admin_user)
):
    try:
        base_query = """
            SELECT d.*, f.name_fr AS faculty_name, s.name_fr AS school_name
            FROM departments d
            LEFT JOIN faculties f ON d.faculty_id = f.id
            LEFT JOIN schools s ON d.school_id = s.id
            WHERE 1=1
        """
        count_query = "SELECT COUNT(*) AS total FROM departments d WHERE 1=1"
        params = []
        count_params = []

        if search:
            cond = " AND (LOWER(d.name_fr) LIKE LOWER(%s) OR LOWER(d.name_en) LIKE LOWER(%s))"
            base_query += cond
            count_query += cond
            like = f"%{search}%"
            params.extend([like, like])
            count_params.extend([like, like])

        if university_id:
            cond = " AND f.university_id = %s"
            base_query += cond
            count_query += cond
            params.append(university_id)
            count_params.append(university_id)

        if faculty_id:
            cond = " AND d.faculty_id = %s"
            base_query += cond
            count_query += cond
            params.append(faculty_id)
            count_params.append(faculty_id)

        if school_id:
            cond = " AND d.school_id = %s"
            base_query += cond
            count_query += cond
            params.append(school_id)
            count_params.append(school_id)

        allowed = ["name_fr", "created_at", "updated_at"]
        if order_by not in allowed:
            order_by = "name_fr"

        offset = (page - 1) * limit
        base_query += f" ORDER BY d.{order_by} {order_dir.upper()} LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        total = execute_query(count_query, count_params, fetch_one=True)["total"]
        rows = execute_query_with_result(base_query, params)
        data = [
            {
                "id": str(r["id"]),
                "faculty_id": str(r["faculty_id"]) if r["faculty_id"] else None,
                "school_id": str(r["school_id"]) if r["school_id"] else None,
                "name_fr": r["name_fr"],
                "name_en": r["name_en"],
                "name_ar": r["name_ar"],
                "acronym": r["acronym"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            }
            for r in rows
        ]

        pages = (total + limit - 1) // limit
        return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))
    except Exception as e:
        logger.error(f"Error listing departments: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch departments")

@app.post("/admin/departments", response_model=DepartmentResponse, tags=["Admin - Departments"])
async def create_department(
    request: Request,
    body: DepartmentCreate,
    admin_user: dict = Depends(get_admin_user)
):
    try:
        new_id = str(uuid.uuid4())
        q = """
            INSERT INTO departments (id, faculty_id, school_id, name_fr, name_en, name_ar, acronym)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        row = execute_query(q, (
            new_id,
            str(body.faculty_id) if body.faculty_id else None,
            str(body.school_id) if body.school_id else None,
            body.name_fr,
            body.name_en,
            body.name_ar,
            body.acronym,
        ), fetch_one=True)
        return DepartmentResponse(
            id=row["id"],
            faculty_id=row["faculty_id"],
            school_id=row["school_id"],
            name_fr=row["name_fr"],
            name_en=row["name_en"],
            name_ar=row["name_ar"],
            acronym=row["acronym"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
    except Exception as e:
        logger.error(f"Error creating department: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create department")

@app.get("/admin/departments/{department_id}", response_model=DepartmentResponse, tags=["Admin - Departments"])
async def get_department(
    request: Request,
    department_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    row = execute_query("SELECT * FROM departments WHERE id = %s", (department_id,), fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return DepartmentResponse(
        id=row["id"],
        faculty_id=row["faculty_id"],
        school_id=row["school_id"],
        name_fr=row["name_fr"],
        name_en=row["name_en"],
        name_ar=row["name_ar"],
        acronym=row["acronym"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )

@app.put("/admin/departments/{department_id}", response_model=DepartmentResponse, tags=["Admin - Departments"])
async def update_department(
    request: Request,
    department_id: str,
    body: DepartmentUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    # Build dynamic update
    fields = []
    params = []
    mapping = {
        "faculty_id": str(body.faculty_id) if body.faculty_id else None,
        "school_id": str(body.school_id) if body.school_id else None,
        "name_fr": body.name_fr,
        "name_en": body.name_en,
        "name_ar": body.name_ar,
        "acronym": body.acronym,
    }
    for k, v in mapping.items():
        if v is not None:
            fields.append(f"{k} = %s")
            params.append(v)
    if not fields:
        return await get_department(request, department_id, admin_user)  # type: ignore
    fields.append("updated_at = %s")
    params.append(datetime.utcnow())
    params.append(department_id)
    q = f"UPDATE departments SET {', '.join(fields)} WHERE id = %s RETURNING *"
    row = execute_query(q, params, fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return DepartmentResponse(
        id=row["id"],
        faculty_id=row["faculty_id"],
        school_id=row["school_id"],
        name_fr=row["name_fr"],
        name_en=row["name_en"],
        name_ar=row["name_ar"],
        acronym=row["acronym"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )

@app.delete("/admin/departments/{department_id}", response_model=BaseResponse, tags=["Admin - Departments"])
async def delete_department(
    request: Request,
    department_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    # Check usages
    count = execute_query("SELECT COUNT(*) AS c FROM theses WHERE department_id = %s", (department_id,), fetch_one=True)
    if count and count.get("c", 0) > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot delete: department has theses")
    rows = execute_query("DELETE FROM departments WHERE id = %s", (department_id,))
    if rows == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return BaseResponse(success=True, message="Department deleted")

# Categories
# =============================================================================

@app.get("/admin/categories", response_model=PaginatedResponse, tags=["Admin - Categories"])
async def get_admin_categories(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000),
    search: Optional[str] = Query(None),
    parent_id: Optional[str] = Query(None),
    load_all: bool = Query(False, description="Load all entities without pagination"),
    admin_user: dict = Depends(get_admin_user)
):
    try:
        base = "SELECT * FROM categories WHERE 1=1"
        count = "SELECT COUNT(*) AS total FROM categories WHERE 1=1"
        params = []
        count_params = []
        if search:
            cond = " AND (LOWER(name_fr) LIKE LOWER(%s) OR LOWER(name_en) LIKE LOWER(%s))"
            base += cond
            count += cond
            like = f"%{search}%"
            params.extend([like, like])
            count_params.extend([like, like])
        if parent_id:
            cond = " AND parent_id = %s"
            base += cond
            count += cond
            params.append(parent_id)
            count_params.append(parent_id)
        total = execute_query(count, count_params, fetch_one=True)["total"]
        
        if load_all:
            # Load all entities without pagination
            base += " ORDER BY level, name_fr"
            rows = execute_query_with_result(base, params)
            # Set pagination meta to reflect all data
            page = 1
            limit = total
        else:
            # Apply pagination
            offset = (page - 1) * limit
            base += " ORDER BY level, name_fr LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            rows = execute_query_with_result(base, params)
        data = [
            {
                "id": str(r["id"]),
                "parent_id": str(r["parent_id"]) if r["parent_id"] else None,
                "level": r["level"],
                "code": r["code"],
                "name_fr": r["name_fr"],
                "name_en": r["name_en"],
                "name_ar": r["name_ar"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }
            for r in rows
        ]
        pages = (total + limit - 1) // limit
        return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))
    except Exception as e:
        logger.error(f"Error listing categories: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch categories")

@app.post("/admin/categories", response_model=CategoryResponse, tags=["Admin - Categories"])
async def create_category(request: Request, body: CategoryCreate, admin_user: dict = Depends(get_admin_user)):
    row = execute_query(
        """
        INSERT INTO categories (id, parent_id, level, code, name_fr, name_en, name_ar)
        VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s) RETURNING *
        """,
        (
            str(body.parent_id) if body.parent_id else None,
            body.level,
            body.code,
            body.name_fr,
            body.name_en,
            body.name_ar,
        ),
        fetch_one=True,
    )
    return CategoryResponse(
        id=row["id"],
        parent_id=row["parent_id"],
        level=row["level"],
        code=row["code"],
        name_fr=row["name_fr"],
        name_en=row["name_en"],
        name_ar=row["name_ar"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )

@app.get("/admin/categories/{category_id}", response_model=CategoryResponse, tags=["Admin - Categories"])
async def get_category(request: Request, category_id: str, admin_user: dict = Depends(get_admin_user)):
    row = execute_query("SELECT * FROM categories WHERE id = %s", (category_id,), fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return CategoryResponse(
        id=row["id"],
        parent_id=row["parent_id"],
        level=row["level"],
        code=row["code"],
        name_fr=row["name_fr"],
        name_en=row["name_en"],
        name_ar=row["name_ar"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )

@app.put("/admin/categories/{category_id}", response_model=CategoryResponse, tags=["Admin - Categories"])
async def update_category(request: Request, category_id: str, body: CategoryUpdate, admin_user: dict = Depends(get_admin_user)):
    fields = []
    params = []
    mapping = {
        "parent_id": str(body.parent_id) if body.parent_id else None,
        "level": body.level,
        "code": body.code,
        "name_fr": body.name_fr,
        "name_en": body.name_en,
        "name_ar": body.name_ar,
    }
    for k, v in mapping.items():
        if v is not None:
            fields.append(f"{k} = %s")
            params.append(v)
    if not fields:
        return await get_category(request, category_id, admin_user)  # type: ignore
    fields.append("updated_at = %s")
    params.append(datetime.utcnow())
    params.append(category_id)
    row = execute_query(f"UPDATE categories SET {', '.join(fields)} WHERE id = %s RETURNING *", params, fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return CategoryResponse(
        id=row["id"],
        parent_id=row["parent_id"],
        level=row["level"],
        code=row["code"],
        name_fr=row["name_fr"],
        name_en=row["name_en"],
        name_ar=row["name_ar"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )

@app.delete("/admin/categories/{category_id}", response_model=BaseResponse, tags=["Admin - Categories"])
async def delete_category(request: Request, category_id: str, admin_user: dict = Depends(get_admin_user)):
    used = execute_query("SELECT COUNT(*) AS c FROM thesis_categories WHERE category_id = %s", (category_id,), fetch_one=True)
    if used and used.get("c", 0) > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category in use by theses")
    rows = execute_query("DELETE FROM categories WHERE id = %s", (category_id,))
    if rows == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return BaseResponse(success=True, message="Category deleted")

@app.get("/admin/categories/tree", response_model=List[Dict], tags=["Admin - Categories"])
async def get_categories_tree(
    request: Request,
    include_counts: bool = Query(True, description="Include thesis counts per category"),
    include_theses: bool = Query(False, description="Include sample theses per category"),
    theses_per_category: int = Query(3, ge=0, le=10),
    admin_user: dict = Depends(get_admin_user)
):
    rows = execute_query_with_result("SELECT id, parent_id, code, name_fr, level FROM categories ORDER BY level, name_fr")
    by_parent: Dict[Optional[str], List[Dict[str, Any]]] = {}
    nodes: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        pid = str(r["parent_id"]) if r["parent_id"] else None
        node: Dict[str, Any] = {"id": str(r["id"]), "code": r["code"], "name_fr": r["name_fr"], "level": r["level"], "children": []}
        if include_counts:
            node["thesis_count"] = 0
        if include_theses and theses_per_category > 0:
            node["theses"] = []
        by_parent.setdefault(pid, []).append(node)
        nodes[node["id"]] = node
    # counts
    if include_counts and nodes:
        cat_ids = list(nodes.keys())
        placeholders = ",".join(["%s"] * len(cat_ids))
        q = f"""
            SELECT category_id, COUNT(*) AS c
            FROM thesis_categories
            WHERE category_id IN ({placeholders})
            GROUP BY category_id
        """
        counts = execute_query_with_result(q, cat_ids)
        for r in counts:
            cid = str(r["category_id"])
            if cid in nodes:
                nodes[cid]["thesis_count"] = r["c"]
    # samples
    if include_theses and theses_per_category > 0 and nodes:
        cat_ids = list(nodes.keys())
        placeholders = ",".join(["%s"] * len(cat_ids))
        q = f"""
            SELECT * FROM (
                SELECT t.id, t.title_fr, t.defense_date, t.status, tc.category_id,
                       ROW_NUMBER() OVER (PARTITION BY tc.category_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) as rn
                FROM thesis_categories tc
                JOIN theses t ON t.id = tc.thesis_id
                WHERE t.status IN ('approved','published') AND tc.category_id IN ({placeholders})
            ) s WHERE rn <= %s
        """
        params = cat_ids + [theses_per_category]
        rows = execute_query_with_result(q, params)
        for r in rows:
            cid = str(r["category_id"]) if r["category_id"] else None
            if cid and cid in nodes:
                nodes[cid].setdefault("theses", []).append({
                    "id": str(r["id"]),
                    "title_fr": r["title_fr"],
                    "defense_date": r["defense_date"],
                    "status": r["status"],
                })
    def attach(parent_id: Optional[str]) -> List[Dict[str, Any]]:
        children = by_parent.get(parent_id, [])
        for ch in children:
            ch["children"] = attach(ch["id"])
        return children
    return attach(None)

# =============================================================================
# ADMIN - FLEXIBLE REFERENCES TREE (UNIFIED)
# =============================================================================

def build_references_tree(
    ref_type: ReferenceTree,
    start_level: Optional[str],
    stop_level: Optional[str],
    root_id: Optional[str],
    include_counts: bool,
    include_theses: bool,
    theses_per_node: int,
    max_depth: Optional[int],
) -> List[Dict[str, Any]]:
    # Helper: normalize values
    def normalize_id(value: Any) -> Optional[str]:
        return str(value) if value is not None else None

    if ref_type == ReferenceTree.UNIVERSITIES:
        # levels: university(0) -> faculty(1) -> department(2)
        level_order = {"university": 0, "faculty": 1, "department": 2}
        s_level = (start_level or "university").lower()
        e_level = (stop_level or "department").lower()
        if s_level not in level_order or e_level not in level_order:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid start_level/stop_level for universities tree")
        if level_order[s_level] > level_order[e_level]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_level must be before or equal to stop_level")

        # Load entities
        universities = []
        if level_order[s_level] <= 0:
            if root_id:
                universities = execute_query_with_result(
                    "SELECT id, name_fr, acronym FROM universities WHERE id = %s ORDER BY name_fr",
                    (root_id,),
                )
            else:
                universities = execute_query_with_result(
                    "SELECT id, name_fr, acronym FROM universities ORDER BY name_fr"
                )

        faculties = []
        if level_order[s_level] <= 1 and level_order[e_level] >= 1:
            if level_order[s_level] == 1 and root_id:
                faculties = execute_query_with_result(
                    "SELECT id, university_id, name_fr, acronym FROM faculties WHERE id = %s ORDER BY name_fr",
                    (root_id,),
                )
            elif universities:
                uni_ids = [str(u["id"]) for u in universities]
                placeholders = ",".join(["%s"] * len(uni_ids))
                faculties = execute_query_with_result(
                    f"SELECT id, university_id, name_fr, acronym FROM faculties WHERE university_id IN ({placeholders}) ORDER BY name_fr",
                    uni_ids,
                )
            else:
                faculties = execute_query_with_result(
                    "SELECT id, university_id, name_fr, acronym FROM faculties ORDER BY name_fr"
                )

        departments = []
        if level_order[e_level] >= 2:
            if level_order[s_level] == 2 and root_id:
                departments = execute_query_with_result(
                    "SELECT id, faculty_id, name_fr, acronym FROM departments WHERE id = %s ORDER BY name_fr",
                    (root_id,),
                )
            elif faculties:
                fac_ids = [str(f["id"]) for f in faculties]
                placeholders = ",".join(["%s"] * len(fac_ids))
                departments = execute_query_with_result(
                    f"SELECT id, faculty_id, name_fr, acronym FROM departments WHERE faculty_id IN ({placeholders}) ORDER BY name_fr",
                    fac_ids,
                )
            else:
                departments = execute_query_with_result(
                    "SELECT id, faculty_id, name_fr, acronym FROM departments ORDER BY name_fr"
                )

        # Grouping
        faculties_by_university: Dict[str, List[Dict[str, Any]]] = {}
        for f in faculties:
            uid = normalize_id(f.get("university_id"))
            if not uid:
                continue
            faculties_by_university.setdefault(uid, []).append({
                "id": normalize_id(f.get("id")),
                "type": "faculty",
                "name_fr": f.get("name_fr"),
                "acronym": f.get("acronym"),
                "departments": [],
            })

        departments_by_faculty: Dict[str, List[Dict[str, Any]]] = {}
        department_ids: List[str] = []
        for d in departments:
            fid = normalize_id(d.get("faculty_id"))
            if not fid:
                continue
            node: Dict[str, Any] = {
                "id": normalize_id(d.get("id")),
                "type": "department",
                "name_fr": d.get("name_fr"),
                "acronym": d.get("acronym"),
            }
            if include_counts:
                node["thesis_count"] = 0
            if include_theses and theses_per_node > 0:
                node["theses"] = []
            departments_by_faculty.setdefault(fid, []).append(node)
            if node["id"]:
                department_ids.append(node["id"])  # type: ignore

        # Attach children based on stop level
        if level_order[e_level] >= 2:
            for uid, fac_list in faculties_by_university.items():
                for fac in fac_list:
                    fid = fac["id"]
                    fac["departments"] = departments_by_faculty.get(fid, [])
                    if include_counts:
                        fac["department_count"] = len(fac["departments"])  # type: ignore
        elif include_counts and faculties_by_university:
            for uid, fac_list in faculties_by_university.items():
                for fac in fac_list:
                    fac["department_count"] = 0  # type: ignore

        thesis_counts: Dict[str, int] = {}
        if include_counts and department_ids:
            placeholders = ",".join(["%s"] * len(department_ids))
            q = f"""
                SELECT department_id, COUNT(*) AS c
                FROM theses
                WHERE status IN ('approved','published') AND department_id IN ({placeholders})
                GROUP BY department_id
            """
            rows = execute_query_with_result(q, department_ids)
            thesis_counts = {normalize_id(r.get("department_id")): r["c"] for r in rows}
            # fill counts
            for fac_list in faculties_by_university.values():
                for fac in fac_list:
                    for dep in fac.get("departments", []):
                        dep["thesis_count"] = thesis_counts.get(dep["id"], 0)

        if include_theses and theses_per_node > 0 and department_ids:
            placeholders = ",".join(["%s"] * len(department_ids))
            q = f"""
                SELECT * FROM (
                    SELECT t.id, t.title_fr, t.defense_date, t.status, t.department_id,
                           ROW_NUMBER() OVER (
                               PARTITION BY t.department_id
                               ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC
                           ) rn
                    FROM theses t
                    WHERE t.status IN ('approved','published') AND t.department_id IN ({placeholders})
                ) s WHERE rn <= %s
            """
            rows = execute_query_with_result(q, department_ids + [theses_per_node])
            samples: Dict[str, List[Dict[str, Any]]] = {}
            for r in rows:
                did = normalize_id(r.get("department_id"))
                if did:
                    samples.setdefault(did, []).append({
                        "id": normalize_id(r.get("id")),
                        "title_fr": r.get("title_fr"),
                        "defense_date": r.get("defense_date"),
                        "status": r.get("status"),
                    })
            for fac_list in faculties_by_university.values():
                for fac in fac_list:
                    for dep in fac.get("departments", []):
                        dep["theses"] = samples.get(dep["id"], [])

        # Build output according to start level
        if level_order[s_level] == 0:
            tree: List[Dict[str, Any]] = []
            for u in universities:
                uid = normalize_id(u.get("id"))
                node: Dict[str, Any] = {
                    "id": uid,
                    "type": "university",
                    "name_fr": u.get("name_fr"),
                    "acronym": u.get("acronym"),
                }
                if level_order[e_level] >= 1:
                    node["faculties"] = faculties_by_university.get(uid or "", [])  # type: ignore
                if include_counts:
                    if level_order[e_level] >= 1:
                        node["faculty_count"] = len(node.get("faculties", []))  # type: ignore
                        if thesis_counts and level_order[e_level] >= 2:
                            node["department_count"] = sum(len(f.get("departments", [])) for f in node.get("faculties", []))  # type: ignore
                            node["thesis_count"] = sum(
                                thesis_counts.get(dep.get("id"), 0)
                                for f in node.get("faculties", [])  # type: ignore
                                for dep in f.get("departments", [])
                            )
                    else:
                        node["faculty_count"] = 0
                tree.append(node)
            return tree

        if level_order[s_level] == 1:
            # Return faculties as roots
            roots: List[Dict[str, Any]] = []
            fac_lists = list(faculties_by_university.values())
            for lst in fac_lists:
                for fac in lst:
                    roots.append(fac)
            if root_id:
                roots = [f for f in roots if f.get("id") == root_id]
            return roots

        if level_order[s_level] == 2:
            # Return departments only
            all_deps = []
            for deps in departments_by_faculty.values():
                all_deps.extend(deps)
            if root_id:
                all_deps = [d for d in all_deps if d.get("id") == root_id]
            return all_deps

        return []

    if ref_type == ReferenceTree.SCHOOLS:
        # Build hierarchical schools tree with optional root and depth limit
        s_level = (start_level or "university").lower()
        if s_level not in ("university", "school"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_level must be 'university' or 'school' for schools tree")
        depth_limit = max_depth if max_depth is not None else 100

        schools = execute_query_with_result(
            """
            SELECT s.*, u.name_fr AS university_name, ps.name_fr AS parent_school_name
            FROM schools s
            LEFT JOIN universities u ON s.parent_university_id = u.id
            LEFT JOIN schools ps ON s.parent_school_id = ps.id
            ORDER BY s.name_fr
            """
        )

        # departments attached to schools
        dept_rows = execute_query_with_result(
            "SELECT id, school_id, name_fr, acronym FROM departments WHERE school_id IS NOT NULL ORDER BY name_fr"
        )
        departments_by_school: Dict[str, List[Dict[str, Any]]] = {}
        for d in dept_rows:
            sid = normalize_id(d.get("school_id"))
            if not sid:
                continue
            node: Dict[str, Any] = {
                "id": normalize_id(d.get("id")),
                "type": "department",
                "name_fr": d.get("name_fr"),
                "acronym": d.get("acronym"),
            }
            if include_counts:
                node["thesis_count"] = 0
            if include_theses and theses_per_node > 0:
                node["theses"] = []
            departments_by_school.setdefault(sid, []).append(node)

        school_children: Dict[str, List[Dict[str, Any]]] = {}
        schools_by_university: Dict[str, List[Dict[str, Any]]] = {}

        def make_school_node(row: Dict[str, Any]) -> Dict[str, Any]:
            nid = normalize_id(row.get("id"))
            node: Dict[str, Any] = {
                "id": nid,
                "type": "school",
                "name_fr": row.get("name_fr"),
                "name_ar": row.get("name_ar"),
                "name_en": row.get("name_en"),
                "acronym": row.get("acronym"),
                "parent_type": "university" if row.get("parent_university_id") else "school",
                "parent_id": normalize_id(row.get("parent_university_id") or row.get("parent_school_id")),
                "children": [],
                "departments": departments_by_school.get(nid or "", []),
            }
            if include_counts:
                node["department_count"] = len(node["departments"])  # type: ignore
            if include_theses and theses_per_node > 0:
                node["theses"] = []
            return node

        nodes_by_id: Dict[str, Dict[str, Any]] = {}
        for s in schools:
            node = make_school_node(s)
            sid = node["id"] or ""
            nodes_by_id[sid] = node
            if s.get("parent_school_id"):
                pid = normalize_id(s.get("parent_school_id")) or ""
                school_children.setdefault(pid, []).append(node)
            elif s.get("parent_university_id"):
                uid = normalize_id(s.get("parent_university_id")) or ""
                schools_by_university.setdefault(uid, []).append(node)

        # counts and samples
        if include_counts:
            # department thesis counts
            dep_ids = [d["id"] for deps in departments_by_school.values() for d in deps if d.get("id")]
            if dep_ids:
                placeholders = ",".join(["%s"] * len(dep_ids))
                q = f"SELECT department_id, COUNT(*) AS c FROM theses WHERE status IN ('approved','published') AND department_id IN ({placeholders}) GROUP BY department_id"
                rows = execute_query_with_result(q, dep_ids)
                by_dep = {normalize_id(r.get("department_id")): r["c"] for r in rows}
                for deps in departments_by_school.values():
                    for d in deps:
                        d["thesis_count"] = by_dep.get(d.get("id"), 0)
            # direct school thesis counts
            sid_list = [normalize_id(s.get("id")) for s in schools if s.get("id")]
            if sid_list:
                placeholders = ",".join(["%s"] * len(sid_list))
                q = f"SELECT school_id, COUNT(*) AS c FROM theses WHERE status IN ('approved','published') AND school_id IN ({placeholders}) GROUP BY school_id"
                rows = execute_query_with_result(q, sid_list)
                school_counts = {normalize_id(r.get("school_id")): r["c"] for r in rows}
                for node in nodes_by_id.values():
                    node["thesis_count"] = school_counts.get(node.get("id"), 0) + sum(dep.get("thesis_count", 0) for dep in node.get("departments", []))

        if include_theses and theses_per_node > 0:
            # samples for schools only (departments can be extended similarly)
            sid_list = [normalize_id(s.get("id")) for s in schools if s.get("id")]
            if sid_list:
                placeholders = ",".join(["%s"] * len(sid_list))
                q = f"""
                    SELECT * FROM (
                        SELECT t.id, t.title_fr, t.defense_date, t.status, t.school_id,
                               ROW_NUMBER() OVER (PARTITION BY t.school_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) rn
                        FROM theses t WHERE t.status IN ('approved','published') AND t.school_id IN ({placeholders})
                    ) s WHERE rn <= %s
                """
                rows = execute_query_with_result(q, sid_list + [theses_per_node])
                samples: Dict[str, List[Dict[str, Any]]] = {}
                for r in rows:
                    sid = normalize_id(r.get("school_id"))
                    if sid:
                        samples.setdefault(sid, []).append({
                            "id": normalize_id(r.get("id")),
                            "title_fr": r.get("title_fr"),
                            "defense_date": r.get("defense_date"),
                            "status": r.get("status"),
                        })
                for sid, lst in samples.items():
                    if sid in nodes_by_id:
                        nodes_by_id[sid]["theses"] = lst

        def add_children(node: Dict[str, Any], depth: int) -> None:
            if depth >= depth_limit:
                node["children"] = []
                return
            sid = node.get("id") or ""
            node["children"] = school_children.get(sid, [])
            for ch in node["children"]:
                add_children(ch, depth + 1)

        # Compose tree
        if s_level == "university":
            uni_rows = []
            if root_id:
                uni_rows = execute_query_with_result("SELECT id, name_fr, acronym FROM universities WHERE id = %s ORDER BY name_fr", (root_id,))
            else:
                uni_rows = execute_query_with_result("SELECT id, name_fr, acronym FROM universities ORDER BY name_fr")
            tree: List[Dict[str, Any]] = []
            for u in uni_rows:
                uid = normalize_id(u.get("id")) or ""
                node = {
                    "id": uid,
                    "type": "university",
                    "name_fr": u.get("name_fr"),
                    "acronym": u.get("acronym"),
                    "schools": schools_by_university.get(uid, []),
                }
                for sch in node["schools"]:
                    add_children(sch, 0)
                tree.append(node)  # counts already inside school nodes
            return tree
        else:
            # start from school
            roots: List[Dict[str, Any]] = []
            if root_id:
                n = nodes_by_id.get(root_id)
                if n:
                    roots = [n]
            else:
                # top schools without parent_school_id
                roots = [n for n in nodes_by_id.values() if n.get("parent_type") == "university"]
            for r in roots:
                add_children(r, 0)
            return roots

    if ref_type == ReferenceTree.CATEGORIES:
        # Support numeric level (preferred) and named mapping as fallback
        mapping = {"domain": 0, "discipline": 1, "specialty": 2, "subdiscipline": 3}
        def parse_level(val: Optional[str], default: int) -> int:
            if val is None:
                return default
            v = val.lower()
            if v.isdigit():
                return int(v)
            return mapping.get(v, default)

        s_int = parse_level(start_level, 0)
        e_int = parse_level(stop_level, 10)
        if s_int > e_int:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_level must be <= stop_level")

        rows = execute_query_with_result("SELECT id, parent_id, code, name_fr, level FROM categories ORDER BY level, name_fr")
        by_parent: Dict[Optional[str], List[Dict[str, Any]]] = {}
        nodes: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            level = int(r.get("level") or 0)
            if level < s_int or level > e_int:
                continue
            pid = normalize_id(r.get("parent_id"))
            node: Dict[str, Any] = {
                "id": normalize_id(r.get("id")),
                "type": "category",
                "code": r.get("code"),
                "name_fr": r.get("name_fr"),
                "level": level,
                "children": [],
            }
            if include_counts:
                node["thesis_count"] = 0
            if include_theses and theses_per_node > 0:
                node["theses"] = []
            by_parent.setdefault(pid, []).append(node)
            nodes[node["id"] or ""] = node

        # counts
        if include_counts and nodes:
            ids = [k for k in nodes.keys() if k]
            if ids:
                placeholders = ",".join(["%s"] * len(ids))
                q = f"SELECT category_id, COUNT(*) AS c FROM thesis_categories WHERE category_id IN ({placeholders}) GROUP BY category_id"
                for r in execute_query_with_result(q, ids):
                    cid = normalize_id(r.get("category_id"))
                    if cid and cid in nodes:
                        nodes[cid]["thesis_count"] = r["c"]

        # samples
        if include_theses and theses_per_node > 0 and nodes:
            ids = [k for k in nodes.keys() if k]
            if ids:
                placeholders = ",".join(["%s"] * len(ids))
                q = f"""
                    SELECT * FROM (
                        SELECT t.id, t.title_fr, t.defense_date, t.status, tc.category_id,
                               ROW_NUMBER() OVER (PARTITION BY tc.category_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) rn
                        FROM thesis_categories tc JOIN theses t ON t.id = tc.thesis_id
                        WHERE t.status IN ('approved','published') AND tc.category_id IN ({placeholders})
                    ) s WHERE rn <= %s
                """
                for r in execute_query_with_result(q, ids + [theses_per_node]):
                    cid = normalize_id(r.get("category_id"))
                    if cid and cid in nodes:
                        nodes[cid].setdefault("theses", []).append({
                            "id": normalize_id(r.get("id")),
                            "title_fr": r.get("title_fr"),
                            "defense_date": r.get("defense_date"),
                            "status": r.get("status"),
                        })

        def attach_limited(parent_id: Optional[str]) -> List[Dict[str, Any]]:
            children = by_parent.get(parent_id, [])
            for ch in children:
                # include only children whose level <= e_int
                ch_level = int(ch.get("level") or 0)
                if ch_level < e_int:
                    ch["children"] = attach_limited(ch.get("id"))
                else:
                    ch["children"] = []
            return children

        # roots selection
        if root_id:
            root_node = nodes.get(root_id)
            if root_node:
                # return the root with its children (within range)
                root_node["children"] = attach_limited(root_id)
                return [root_node]
            return []
        else:
            if s_int == 0:
                return attach_limited(None)
            # return nodes at the specified start level as roots
            return [n for n in nodes.values() if n.get("level") == s_int and (n.get("id") is not None)]

    if ref_type == ReferenceTree.GEOGRAPHIC:
        # levels: country(0) -> region(1) -> province/prefecture(2) -> city(3)
        map_to_idx = {"country": 0, "region": 1, "province": 2, "prefecture": 2, "city": 3}
        def to_idx(val: Optional[str], default: int) -> int:
            if val is None:
                return default
            return map_to_idx.get(val.lower(), default)

        s_idx = to_idx(start_level, 0)
        e_idx = to_idx(stop_level, 3)
        if s_idx > e_idx:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_level must be <= stop_level")

        rows = execute_query_with_result("SELECT id, parent_id, name_fr, level FROM geographic_entities ORDER BY level, name_fr")
        by_parent: Dict[Optional[str], List[Dict[str, Any]]] = {}
        nodes: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            lvl = map_to_idx.get(str(r.get("level") or "").lower(), 99)
            if lvl < s_idx or lvl > e_idx:
                continue
            pid = normalize_id(r.get("parent_id"))
            node: Dict[str, Any] = {
                "id": normalize_id(r.get("id")),
                "type": "geographic",
                "name_fr": r.get("name_fr"),
                "level": r.get("level"),
                "children": [],
            }
            if include_counts:
                node["thesis_count"] = 0
            if include_theses and theses_per_node > 0:
                node["theses"] = []
            by_parent.setdefault(pid, []).append(node)
            nodes[node["id"] or ""] = node

        if include_counts and nodes:
            ids = [k for k in nodes.keys() if k]
            if ids:
                placeholders = ",".join(["%s"] * len(ids))
                q = f"SELECT study_location_id, COUNT(*) AS c FROM theses WHERE status IN ('approved','published') AND study_location_id IN ({placeholders}) GROUP BY study_location_id"
                for r in execute_query_with_result(q, ids):
                    eid = normalize_id(r.get("study_location_id"))
                    if eid and eid in nodes:
                        nodes[eid]["thesis_count"] = r["c"]

        if include_theses and theses_per_node > 0 and nodes:
            ids = [k for k in nodes.keys() if k]
            if ids:
                placeholders = ",".join(["%s"] * len(ids))
                q = f"""
                    SELECT * FROM (
                        SELECT t.id, t.title_fr, t.defense_date, t.status, t.study_location_id,
                               ROW_NUMBER() OVER (PARTITION BY t.study_location_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) rn
                        FROM theses t WHERE t.status IN ('approved','published') AND t.study_location_id IN ({placeholders})
                    ) s WHERE rn <= %s
                """
                for r in execute_query_with_result(q, ids + [theses_per_node]):
                    eid = normalize_id(r.get("study_location_id"))
                    if eid and eid in nodes:
                        nodes[eid].setdefault("theses", []).append({
                            "id": normalize_id(r.get("id")),
                            "title_fr": r.get("title_fr"),
                            "defense_date": r.get("defense_date"),
                            "status": r.get("status"),
                        })

        def attach_geo(parent_id: Optional[str]) -> List[Dict[str, Any]]:
            children = by_parent.get(parent_id, [])
            for ch in children:
                # limit by stop level index
                lvl = map_to_idx.get(str(ch.get("level") or "").lower(), 99)
                if lvl < e_idx:
                    ch["children"] = attach_geo(ch.get("id"))
                else:
                    ch["children"] = []
            return children

        if root_id:
            root = nodes.get(root_id)
            if root:
                root["children"] = attach_geo(root_id)
                return [root]
            return []
        else:
            if s_idx == 0:
                return attach_geo(None)
            # return nodes at the specified starting level as roots
            return [n for n in nodes.values() if map_to_idx.get(str(n.get("level") or "").lower(), 99) == s_idx]

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported ref_type")


@app.get("/admin/references/tree", response_model=List[Dict], tags=["Admin - Trees"])
async def get_admin_references_tree(
    request: Request,
    ref_type: ReferenceTree = Query(..., description="Tree type: universities|schools|categories|geographic"),
    start_level: Optional[str] = Query(None, description="Start level label (depends on ref_type)"),
    stop_level: Optional[str] = Query(None, description="Stop level label (depends on ref_type)"),
    root_id: Optional[str] = Query(None, description="Optional root node id"),
    max_depth: Optional[int] = Query(None, ge=1, le=20, description="Depth limit for recursive types (schools)"),
    include_counts: bool = Query(True),
    include_theses: bool = Query(False),
    theses_per_node: int = Query(3, ge=0, le=10),
    admin_user: dict = Depends(get_admin_user),
):
    return build_references_tree(
        ref_type=ref_type,
        start_level=start_level,
        stop_level=stop_level,
        root_id=root_id,
        include_counts=include_counts,
        include_theses=include_theses,
        theses_per_node=theses_per_node,
        max_depth=max_depth,
    )

@app.get("/references/tree", response_model=List[Dict], tags=["Public - Trees"])
async def get_public_references_tree(
    ref_type: ReferenceTree = Query(..., description="Tree type: universities|schools|categories|geographic"),
    start_level: Optional[str] = Query(None, description="Start level label (depends on ref_type)"),
    stop_level: Optional[str] = Query(None, description="Stop level label (depends on ref_type)"),
    root_id: Optional[str] = Query(None, description="Optional root node id"),
    max_depth: Optional[int] = Query(None, ge=1, le=20, description="Depth limit for recursive types (schools)"),
    include_counts: bool = Query(True),
    include_theses: bool = Query(False),
    theses_per_node: int = Query(3, ge=0, le=10),
):
    return build_references_tree(
        ref_type=ref_type,
        start_level=start_level,
        stop_level=stop_level,
        root_id=root_id,
        include_counts=include_counts,
        include_theses=include_theses,
        theses_per_node=theses_per_node,
        max_depth=max_depth,
    )

@app.get("/admin/categories/{category_id}/subcategories", response_model=List[CategoryResponse], tags=["Admin - Categories"])
async def get_subcategories(request: Request, category_id: str, admin_user: dict = Depends(get_admin_user)):
    rows = execute_query_with_result("SELECT * FROM categories WHERE parent_id = %s ORDER BY name_fr", (category_id,))
    return [CategoryResponse(
        id=r["id"], parent_id=r["parent_id"], level=r["level"], code=r["code"], name_fr=r["name_fr"], name_en=r["name_en"], name_ar=r["name_ar"], created_at=r["created_at"], updated_at=r["updated_at"]
    ) for r in rows]

# Keywords
# =============================================================================

@app.get("/admin/keywords", response_model=PaginatedResponse, tags=["Admin - Keywords"])
async def get_admin_keywords(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000),
    search: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    load_all: bool = Query(False, description="Load all entities without pagination"),
    admin_user: dict = Depends(get_admin_user)
):
    base = "SELECT * FROM keywords WHERE 1=1"
    count = "SELECT COUNT(*) AS total FROM keywords WHERE 1=1"
    params: List[Any] = []
    count_params: List[Any] = []
    if search:
        cond = " AND (LOWER(keyword_fr) LIKE LOWER(%s) OR LOWER(keyword_en) LIKE LOWER(%s))"
        base += cond
        count += cond
        like = f"%{search}%"
        params.extend([like, like])
        count_params.extend([like, like])
    if category_id:
        cond = " AND category_id = %s"
        base += cond
        count += cond
        params.append(category_id)
        count_params.append(category_id)
    total = execute_query(count, count_params, fetch_one=True)["total"]
    
    if load_all:
        # Load all entities without pagination
        base += " ORDER BY keyword_fr"
        rows = execute_query_with_result(base, params)
        # Set pagination meta to reflect all data
        page = 1
        limit = total
    else:
        # Apply pagination
        offset = (page - 1) * limit
        base += " ORDER BY keyword_fr LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        rows = execute_query_with_result(base, params)
    data = [
        {
            "id": str(r["id"]),
            "parent_keyword_id": str(r["parent_keyword_id"]) if r["parent_keyword_id"] else None,
            "keyword_fr": r["keyword_fr"],
            "keyword_en": r["keyword_en"],
            "keyword_ar": r["keyword_ar"],
            "category_id": str(r["category_id"]) if r["category_id"] else None,
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        }
        for r in rows
    ]
    pages = (total + limit - 1) // limit
    return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))

@app.post("/admin/keywords", response_model=KeywordResponse, tags=["Admin - Keywords"])
async def create_keyword(request: Request, body: KeywordCreate, admin_user: dict = Depends(get_admin_user)):
    row = execute_query(
        """
        INSERT INTO keywords (id, parent_keyword_id, keyword_en, keyword_fr, keyword_ar, category_id)
        VALUES (gen_random_uuid(), %s, %s, %s, %s, %s) RETURNING *
        """,
        (
            str(body.parent_keyword_id) if body.parent_keyword_id else None,
            body.keyword_en,
            body.keyword_fr,
            body.keyword_ar,
            str(body.category_id) if body.category_id else None,
        ),
        fetch_one=True,
    )
    return KeywordResponse(
        id=row["id"], parent_keyword_id=row["parent_keyword_id"], keyword_en=row["keyword_en"], keyword_fr=row["keyword_fr"], keyword_ar=row["keyword_ar"], category_id=row["category_id"], created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.get("/admin/keywords/{keyword_id}", response_model=KeywordResponse, tags=["Admin - Keywords"])
async def get_keyword(request: Request, keyword_id: str, admin_user: dict = Depends(get_admin_user)):
    row = execute_query("SELECT * FROM keywords WHERE id = %s", (keyword_id,), fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found")
    return KeywordResponse(
        id=row["id"], parent_keyword_id=row["parent_keyword_id"], keyword_en=row["keyword_en"], keyword_fr=row["keyword_fr"], keyword_ar=row["keyword_ar"], category_id=row["category_id"], created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.put("/admin/keywords/{keyword_id}", response_model=KeywordResponse, tags=["Admin - Keywords"])
async def update_keyword(request: Request, keyword_id: str, body: KeywordUpdate, admin_user: dict = Depends(get_admin_user)):
    fields = []
    params = []
    mapping = {
        "parent_keyword_id": str(body.parent_keyword_id) if body.parent_keyword_id else None,
        "keyword_en": body.keyword_en,
        "keyword_fr": body.keyword_fr,
        "keyword_ar": body.keyword_ar,
        "category_id": str(body.category_id) if body.category_id else None,
    }
    for k, v in mapping.items():
        if v is not None:
            fields.append(f"{k} = %s")
            params.append(v)
    if not fields:
        return await get_keyword(request, keyword_id, admin_user)  # type: ignore
    fields.append("updated_at = %s")
    params.append(datetime.utcnow())
    params.append(keyword_id)
    row = execute_query(f"UPDATE keywords SET {', '.join(fields)} WHERE id = %s RETURNING *", params, fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found")
    return KeywordResponse(
        id=row["id"], parent_keyword_id=row["parent_keyword_id"], keyword_en=row["keyword_en"], keyword_fr=row["keyword_fr"], keyword_ar=row["keyword_ar"], category_id=row["category_id"], created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.delete("/admin/keywords/{keyword_id}", response_model=BaseResponse, tags=["Admin - Keywords"])
async def delete_keyword(request: Request, keyword_id: str, admin_user: dict = Depends(get_admin_user)):
    used = execute_query("SELECT COUNT(*) AS c FROM thesis_keywords WHERE keyword_id = %s", (keyword_id,), fetch_one=True)
    if used and used.get("c", 0) > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Keyword in use by theses")
    rows = execute_query("DELETE FROM keywords WHERE id = %s", (keyword_id,))
    if rows == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found")
    return BaseResponse(success=True, message="Keyword deleted")

# Academic persons
# =============================================================================

@app.get("/admin/academic-persons", response_model=PaginatedResponse, tags=["Admin - Academic Persons"])
async def get_admin_academic_persons(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=10000, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in name fields"),
    university_id: Optional[str] = Query(None, description="Filter by university"),
    faculty_id: Optional[str] = Query(None, description="Filter by faculty"),
    school_id: Optional[str] = Query(None, description="Filter by school"),
    is_external: Optional[bool] = Query(None, description="Filter by external status"),
    load_all: bool = Query(False, description="Load all entities without pagination"),
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
        
        if load_all:
            # Load all entities without pagination
            data_query = f"{base_query} ORDER BY {order_by} {order_dir}"
            results = execute_query_with_result(data_query, params)
            # Set pagination meta to reflect all data
            page = 1
            limit = total
        else:
            # Apply pagination
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
async def get_admin_degrees(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000),
    search: Optional[str] = Query(None),
    load_all: bool = Query(False, description="Load all entities without pagination"),
    admin_user: dict = Depends(get_admin_user)
):
    base = "SELECT * FROM degrees WHERE 1=1"
    count = "SELECT COUNT(*) AS total FROM degrees WHERE 1=1"
    params: List[Any] = []
    count_params: List[Any] = []
    if search:
        cond = " AND (LOWER(name_fr) LIKE LOWER(%s) OR LOWER(name_en) LIKE LOWER(%s) OR LOWER(abbreviation) LIKE LOWER(%s))"
        base += cond
        count += cond
        like = f"%{search}%"
        params.extend([like, like, like])
        count_params.extend([like, like, like])
    total = execute_query(count, count_params, fetch_one=True)["total"]
    
    if load_all:
        # Load all entities without pagination
        base += " ORDER BY name_fr"
        rows = execute_query_with_result(base, params)
        # Set pagination meta to reflect all data
        page = 1
        limit = total
    else:
        # Apply pagination
        offset = (page - 1) * limit
        base += " ORDER BY name_fr LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        rows = execute_query_with_result(base, params)
    data = [
        {
            "id": str(r["id"]),
            "name_en": r["name_en"],
            "name_fr": r["name_fr"],
            "name_ar": r["name_ar"],
            "abbreviation": r["abbreviation"],
            "type": r["type"],
            "category": r["category"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        }
        for r in rows
    ]
    pages = (total + limit - 1) // limit
    return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))

@app.post("/admin/degrees", response_model=DegreeResponse, tags=["Admin - Degrees"])
async def create_degree(request: Request, body: DegreeCreate, admin_user: dict = Depends(get_admin_user)):
    row = execute_query(
        """
        INSERT INTO degrees (id, name_en, name_fr, name_ar, abbreviation, type, category)
        VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s) RETURNING *
        """,
        (body.name_en, body.name_fr, body.name_ar, body.abbreviation, body.type.value, body.category.value if body.category else None),
        fetch_one=True,
    )
    return DegreeResponse(
        id=row["id"], name_en=row["name_en"], name_fr=row["name_fr"], name_ar=row["name_ar"], abbreviation=row["abbreviation"], type=row["type"], category=row["category"], created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.get("/admin/degrees/{degree_id}", response_model=DegreeResponse, tags=["Admin - Degrees"])
async def get_degree(request: Request, degree_id: str, admin_user: dict = Depends(get_admin_user)):
    row = execute_query("SELECT * FROM degrees WHERE id = %s", (degree_id,), fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Degree not found")
    return DegreeResponse(
        id=row["id"], name_en=row["name_en"], name_fr=row["name_fr"], name_ar=row["name_ar"], abbreviation=row["abbreviation"], type=row["type"], category=row["category"], created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.put("/admin/degrees/{degree_id}", response_model=DegreeResponse, tags=["Admin - Degrees"])
async def update_degree(request: Request, degree_id: str, body: DegreeUpdate, admin_user: dict = Depends(get_admin_user)):
    fields = []
    params: List[Any] = []
    mapping = {
        "name_en": body.name_en,
        "name_fr": body.name_fr,
        "name_ar": body.name_ar,
        "abbreviation": body.abbreviation,
        "type": body.type.value if body.type else None,
        "category": body.category.value if body.category else None,
    }
    for k, v in mapping.items():
        if v is not None:
            fields.append(f"{k} = %s")
            params.append(v)
    if not fields:
        return await get_degree(request, degree_id, admin_user)  # type: ignore
    fields.append("updated_at = %s")
    params.append(datetime.utcnow())
    params.append(degree_id)
    row = execute_query(f"UPDATE degrees SET {', '.join(fields)} WHERE id = %s RETURNING *", params, fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Degree not found")
    return DegreeResponse(
        id=row["id"], name_en=row["name_en"], name_fr=row["name_fr"], name_ar=row["name_ar"], abbreviation=row["abbreviation"], type=row["type"], category=row["category"], created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.delete("/admin/degrees/{degree_id}", response_model=BaseResponse, tags=["Admin - Degrees"])
async def delete_degree(request: Request, degree_id: str, admin_user: dict = Depends(get_admin_user)):
    used = execute_query("SELECT COUNT(*) AS c FROM theses WHERE degree_id = %s", (degree_id,), fetch_one=True)
    if used and used.get("c", 0) > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Degree in use by theses")
    rows = execute_query("DELETE FROM degrees WHERE id = %s", (degree_id,))
    if rows == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Degree not found")
    return BaseResponse(success=True, message="Degree deleted")
# Languages
# =============================================================================

@app.get("/admin/languages", response_model=PaginatedResponse, tags=["Admin - Languages"])
async def get_admin_languages(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000),
    search: Optional[str] = Query(None),
    load_all: bool = Query(False, description="Load all entities without pagination"),
    admin_user: dict = Depends(get_admin_user)
):
    base = "SELECT * FROM languages WHERE 1=1"
    count = "SELECT COUNT(*) AS total FROM languages WHERE 1=1"
    params: List[Any] = []
    count_params: List[Any] = []
    if search:
        cond = " AND (LOWER(name) LIKE LOWER(%s) OR LOWER(native_name) LIKE LOWER(%s) OR LOWER(code) LIKE LOWER(%s))"
        base += cond
        count += cond
        like = f"%{search}%"
        params.extend([like, like, like])
        count_params.extend([like, like, like])
    total = execute_query(count, count_params, fetch_one=True)["total"]
    
    if load_all:
        # Load all entities without pagination
        base += " ORDER BY display_order, name"
        rows = execute_query_with_result(base, params)
        # Set pagination meta to reflect all data
        page = 1
        limit = total
    else:
        # Apply pagination
        offset = (page - 1) * limit
        base += " ORDER BY display_order, name LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        rows = execute_query_with_result(base, params)
    data = [
        {
            "id": str(r["id"]),
            "code": r["code"],
            "name": r["name"],
            "native_name": r["native_name"],
            "rtl": r["rtl"],
            "is_active": r["is_active"],
            "display_order": r["display_order"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        }
        for r in rows
    ]
    pages = (total + limit - 1) // limit
    return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))

@app.post("/admin/languages", response_model=LanguageResponse, tags=["Admin - Languages"])
async def create_language(request: Request, body: LanguageCreate, admin_user: dict = Depends(get_admin_user)):
    # languages has both code (PK in doc) and id (uuid) in dump; we will generate id and use unique code
    row = execute_query(
        """
        INSERT INTO languages (code, name, native_name, rtl, is_active, display_order, id)
        VALUES (%s, %s, %s, %s, %s, %s, gen_random_uuid()) RETURNING *
        """,
        (body.code.value, body.name, body.native_name, body.rtl, body.is_active, body.display_order),
        fetch_one=True,
    )
    return LanguageResponse(
        id=row["id"], code=row["code"], name=row["name"], native_name=row["native_name"], rtl=row["rtl"], is_active=row["is_active"], display_order=row["display_order"], created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.get("/admin/languages/{language_id}", response_model=LanguageResponse, tags=["Admin - Languages"])
async def get_language(request: Request, language_id: str, admin_user: dict = Depends(get_admin_user)):
    row = execute_query("SELECT * FROM languages WHERE id = %s", (language_id,), fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language not found")
    return LanguageResponse(
        id=row["id"], code=row["code"], name=row["name"], native_name=row["native_name"], rtl=row["rtl"], is_active=row["is_active"], display_order=row["display_order"], created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.put("/admin/languages/{language_id}", response_model=LanguageResponse, tags=["Admin - Languages"])
async def update_language(request: Request, language_id: str, body: LanguageUpdate, admin_user: dict = Depends(get_admin_user)):
    fields = []
    params: List[Any] = []
    mapping = {
        "name": body.name,
        "native_name": body.native_name,
        "rtl": body.rtl,
        "is_active": body.is_active,
        "display_order": body.display_order,
    }
    for k, v in mapping.items():
        if v is not None:
            fields.append(f"{k} = %s")
            params.append(v)
    if not fields:
        return await get_language(request, language_id, admin_user)  # type: ignore
    fields.append("updated_at = %s")
    params.append(datetime.utcnow())
    params.append(language_id)
    row = execute_query(f"UPDATE languages SET {', '.join(fields)} WHERE id = %s RETURNING *", params, fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language not found")
    return LanguageResponse(
        id=row["id"], code=row["code"], name=row["name"], native_name=row["native_name"], rtl=row["rtl"], is_active=row["is_active"], display_order=row["display_order"], created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.delete("/admin/languages/{language_id}", response_model=BaseResponse, tags=["Admin - Languages"])
async def delete_language(request: Request, language_id: str, admin_user: dict = Depends(get_admin_user)):
    used = execute_query("SELECT COUNT(*) AS c FROM theses WHERE language_id = %s", (language_id,), fetch_one=True)
    if used and used.get("c", 0) > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Language in use by theses")
    rows = execute_query("DELETE FROM languages WHERE id = %s", (language_id,))
    if rows == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language not found")
    return BaseResponse(success=True, message="Language deleted")

# Geographic entities
# =============================================================================

@app.get("/admin/geographic-entities", response_model=PaginatedResponse, tags=["Admin - Geographic Entities"])
async def get_admin_geographic_entities(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000),  # Increased limit to allow loading all data
    search: Optional[str] = Query(None),
    parent_id: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    load_all: bool = Query(False, description="Load all entities without pagination"),
    admin_user: dict = Depends(get_admin_user)
):
    base = "SELECT * FROM geographic_entities WHERE 1=1"
    count = "SELECT COUNT(*) AS total FROM geographic_entities WHERE 1=1"
    params: List[Any] = []
    count_params: List[Any] = []
    if search:
        cond = " AND (LOWER(name_fr) LIKE LOWER(%s) OR LOWER(name_en) LIKE LOWER(%s) OR LOWER(name_ar) LIKE LOWER(%s))"
        base += cond
        count += cond
        like = f"%{search}%"
        params.extend([like, like, like])
        count_params.extend([like, like, like])
    if parent_id:
        cond = " AND parent_id = %s"
        base += cond
        count += cond
        params.append(parent_id)
        count_params.append(parent_id)
    if level:
        cond = " AND level = %s"
        base += cond
        count += cond
        params.append(level)
        count_params.append(level)
    total = execute_query(count, count_params, fetch_one=True)["total"]
    
    if load_all:
        # Load all entities without pagination
        base += " ORDER BY name_fr"
        rows = execute_query_with_result(base, params)
        # Set pagination meta to reflect all data
        page = 1
        limit = total
    else:
        # Apply pagination
        offset = (page - 1) * limit
        base += " ORDER BY name_fr LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        rows = execute_query_with_result(base, params)
    data = [
        {
            "id": str(r["id"]),
            "name_fr": r["name_fr"],
            "name_en": r["name_en"],
            "name_ar": r["name_ar"],
            "parent_id": str(r["parent_id"]) if r["parent_id"] else None,
            "level": r["level"],
            "code": r["code"],
            "latitude": float(r["latitude"]) if r["latitude"] is not None else None,
            "longitude": float(r["longitude"]) if r["longitude"] is not None else None,
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        }
        for r in rows
    ]
    pages = (total + limit - 1) // limit
    return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))

@app.post("/admin/geographic-entities", response_model=GeographicEntityResponse, tags=["Admin - Geographic Entities"])
async def create_geographic_entity(request: Request, body: GeographicEntityBase, admin_user: dict = Depends(get_admin_user)):
    row = execute_query(
        """
        INSERT INTO geographic_entities (id, name_en, name_fr, name_ar, parent_id, level, code, latitude, longitude)
        VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """,
        (body.name_en, body.name_fr, body.name_ar, str(body.parent_id) if body.parent_id else None, body.level.value if body.level else None, body.code, body.latitude, body.longitude),
        fetch_one=True,
    )
    return GeographicEntityResponse(
        id=row["id"], name_en=row["name_en"], name_fr=row["name_fr"], name_ar=row["name_ar"], parent_id=row["parent_id"], level=row["level"], code=row["code"], latitude=float(row["latitude"]) if row["latitude"] is not None else None, longitude=float(row["longitude"]) if row["longitude"] is not None else None, created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.get("/admin/geographic-entities/{entity_id}", response_model=GeographicEntityResponse, tags=["Admin - Geographic Entities"])
async def get_geographic_entity(request: Request, entity_id: str, admin_user: dict = Depends(get_admin_user)):
    row = execute_query("SELECT * FROM geographic_entities WHERE id = %s", (entity_id,), fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geographic entity not found")
    return GeographicEntityResponse(
        id=row["id"], name_en=row["name_en"], name_fr=row["name_fr"], name_ar=row["name_ar"], parent_id=row["parent_id"], level=row["level"], code=row["code"], latitude=float(row["latitude"]) if row["latitude"] is not None else None, longitude=float(row["longitude"]) if row["longitude"] is not None else None, created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.put("/admin/geographic-entities/{entity_id}", response_model=GeographicEntityResponse, tags=["Admin - Geographic Entities"])
async def update_geographic_entity(request: Request, entity_id: str, body: GeographicEntityUpdate, admin_user: dict = Depends(get_admin_user)):
    fields = []
    params: List[Any] = []
    mapping = {
        "name_en": body.name_en,
        "name_fr": body.name_fr,
        "name_ar": body.name_ar,
        "parent_id": str(body.parent_id) if body.parent_id else None,
        "level": body.level.value if body.level else None,
        "code": body.code,
        "latitude": body.latitude,
        "longitude": body.longitude,
    }
    for k, v in mapping.items():
        if v is not None:
            fields.append(f"{k} = %s")
            params.append(v)
    if not fields:
        return await get_geographic_entity(request, entity_id, admin_user)  # type: ignore
    fields.append("updated_at = %s")
    params.append(datetime.utcnow())
    params.append(entity_id)
    row = execute_query(f"UPDATE geographic_entities SET {', '.join(fields)} WHERE id = %s RETURNING *", params, fetch_one=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geographic entity not found")
    return GeographicEntityResponse(
        id=row["id"], name_en=row["name_en"], name_fr=row["name_fr"], name_ar=row["name_ar"], parent_id=row["parent_id"], level=row["level"], code=row["code"], latitude=float(row["latitude"]) if row["latitude"] is not None else None, longitude=float(row["longitude"]) if row["longitude"] is not None else None, created_at=row["created_at"], updated_at=row["updated_at"]
    )

@app.delete("/admin/geographic-entities/{entity_id}", response_model=BaseResponse, tags=["Admin - Geographic Entities"])
async def delete_geographic_entity(request: Request, entity_id: str, admin_user: dict = Depends(get_admin_user)):
    rows = execute_query("DELETE FROM geographic_entities WHERE id = %s", (entity_id,))
    if rows == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geographic entity not found")
    return BaseResponse(success=True, message="Geographic entity deleted")

@app.get("/admin/geographic-entities/tree", response_model=List[Dict], tags=["Admin - Geographic Entities"])
async def get_geographic_tree(
    request: Request,
    include_counts: bool = Query(True, description="Include thesis counts per entity"),
    include_theses: bool = Query(False, description="Include sample theses per entity"),
    theses_per_entity: int = Query(3, ge=0, le=10),
    admin_user: dict = Depends(get_admin_user)
):
    rows = execute_query_with_result("SELECT id, parent_id, name_fr, level FROM geographic_entities ORDER BY level, name_fr")
    by_parent: Dict[Optional[str], List[Dict[str, Any]]] = {}
    nodes: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        pid = str(r["parent_id"]) if r["parent_id"] else None
        node: Dict[str, Any] = {"id": str(r["id"]), "name_fr": r["name_fr"], "level": r["level"], "children": []}
        if include_counts:
            node["thesis_count"] = 0
        if include_theses and theses_per_entity > 0:
            node["theses"] = []
        by_parent.setdefault(pid, []).append(node)
        nodes[node["id"]] = node
    # counts
    if include_counts and nodes:
        eids = list(nodes.keys())
        placeholders = ",".join(["%s"] * len(eids))
        q = f"""
            SELECT study_location_id, COUNT(*) AS c
            FROM theses
            WHERE status IN ('approved','published') AND study_location_id IN ({placeholders})
            GROUP BY study_location_id
        """
        rows = execute_query_with_result(q, eids)
        for r in rows:
            eid = str(r["study_location_id"]) if r["study_location_id"] else None
            if eid and eid in nodes:
                nodes[eid]["thesis_count"] = r["c"]
    # samples
    if include_theses and theses_per_entity > 0 and nodes:
        eids = list(nodes.keys())
        placeholders = ",".join(["%s"] * len(eids))
        q = f"""
            SELECT * FROM (
                SELECT t.id, t.title_fr, t.defense_date, t.status, t.study_location_id,
                       ROW_NUMBER() OVER (PARTITION BY t.study_location_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) as rn
                FROM theses t WHERE t.status IN ('approved','published') AND t.study_location_id IN ({placeholders})
            ) s WHERE rn <= %s
        """
        params = eids + [theses_per_entity]
        rows = execute_query_with_result(q, params)
        for r in rows:
            eid = str(r["study_location_id"]) if r["study_location_id"] else None
            if eid and eid in nodes:
                nodes[eid].setdefault("theses", []).append({
                    "id": str(r["id"]),
                    "title_fr": r["title_fr"],
                    "defense_date": r["defense_date"],
                    "status": r["status"],
                })
    def attach(parent_id: Optional[str]) -> List[Dict[str, Any]]:
        children = by_parent.get(parent_id, [])
        for ch in children:
            ch["children"] = attach(ch["id"])
        return children
    return attach(None)

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
# Download endpoint (public)
@app.get("/theses/{thesis_id}/download", tags=["Public - Thesis search"])
async def public_thesis_download(thesis_id: str, request: Request):
    r = execute_query("SELECT id, file_url, file_name FROM theses WHERE id = %s AND status IN ('approved','published')", (thesis_id,), fetch_one=True)
    if not r or not r.get("file_url"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis or file not found")
    try:
        # record download event (best-effort)
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
        execute_query(
            "INSERT INTO thesis_downloads (id, thesis_id, user_id, ip_address, user_agent) VALUES (gen_random_uuid(), %s, NULL, %s, %s)",
            (thesis_id, ip, ua),
        )
    except Exception:
        logger.warning("Failed to log thesis download event", exc_info=True)
    # serve file
    return serve_file(r["file_url"], r["file_name"]) 

# =============================================================================
# PUBLIC API - TREES AND LISTS
# =============================================================================

@app.get("/statistics", response_model=StatisticsResponse, tags=["Public - Statistics"])
async def public_statistics():
    """Public statistics for homepage widgets"""
    try:
        total_theses_row = execute_query(
            "SELECT COUNT(*) AS c FROM theses WHERE status IN ('approved','published')",
            fetch_one=True,
        )
        total_universities_row = execute_query(
            "SELECT COUNT(*) AS c FROM universities",
            fetch_one=True,
        )
        total_faculties_row = execute_query(
            "SELECT COUNT(*) AS c FROM faculties",
            fetch_one=True,
        )
        total_schools_row = execute_query(
            "SELECT COUNT(*) AS c FROM schools",
            fetch_one=True,
        )
        total_categories_row = execute_query(
            "SELECT COUNT(*) AS c FROM categories",
            fetch_one=True,
        )
        total_keywords_row = execute_query(
            "SELECT COUNT(*) AS c FROM keywords",
            fetch_one=True,
        )
        total_degrees_row = execute_query(
            "SELECT COUNT(*) AS c FROM degrees",
            fetch_one=True,
        )
        total_languages_row = execute_query(
            "SELECT COUNT(*) AS c FROM languages WHERE is_active = true",
            fetch_one=True,
        )
        total_geographic_entities_row = execute_query(
            "SELECT COUNT(*) AS c FROM geographic_entities",
            fetch_one=True,
        )
        total_authors_row = execute_query(
            "SELECT COUNT(DISTINCT person_id) AS c FROM thesis_academic_persons WHERE role = 'author'",
            fetch_one=True,
        )

        # Recent theses (latest published/approved)
        recent_rows = execute_query_with_result(
            """
            SELECT id, title_fr, title_en, title_ar, defense_date, file_url, created_at
            FROM theses
            WHERE status IN ('approved','published')
            ORDER BY created_at DESC
            LIMIT 6
            """,
        )
        recent_theses = []
        for r in recent_rows:
            recent_theses.append({
                "id": str(r["id"]),
                "title_fr": r.get("title_fr"),
                "title_en": r.get("title_en"),
                "title_ar": r.get("title_ar"),
                "defense_date": r.get("defense_date").isoformat() if r.get("defense_date") else None,
                "file_url": r.get("file_url"),
                "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
            })

        # Popular categories by usage
        popular_rows = execute_query_with_result(
            """
            SELECT c.id, c.name_fr AS name, COUNT(*) AS count
            FROM thesis_categories tc
            JOIN categories c ON c.id = tc.category_id
            JOIN theses t ON t.id = tc.thesis_id
            WHERE t.status IN ('approved','published')
            GROUP BY c.id, c.name_fr
            ORDER BY count DESC
            LIMIT 10
            """,
        )
        popular_categories = [{
            "id": str(r["id"]),
            "name": r["name"],
            "count": r["count"],
        } for r in popular_rows]

        # Top universities by thesis count
        uni_rows = execute_query_with_result(
            """
            SELECT u.id, u.name_fr AS name, u.acronym, COUNT(t.id) AS count
            FROM theses t
            JOIN universities u ON u.id = t.university_id
            WHERE t.status IN ('approved','published')
            GROUP BY u.id, u.name_fr, u.acronym
            ORDER BY count DESC
            LIMIT 8
            """,
        )
        top_universities = [{
            "id": str(r["id"]),
            "name": r["name"],
            "acronym": r.get("acronym"),
            "count": r["count"],
        } for r in uni_rows]

        return StatisticsResponse(
            total_theses=total_theses_row["c"],
            total_universities=total_universities_row["c"],
            total_faculties=total_faculties_row["c"],
            total_schools=total_schools_row["c"],
            total_categories=total_categories_row["c"],
            total_keywords=total_keywords_row["c"],
            total_degrees=total_degrees_row["c"],
            total_languages=total_languages_row["c"],
            total_geographic_entities=total_geographic_entities_row["c"],
            total_authors=total_authors_row["c"],
            recent_theses=recent_theses,
            popular_categories=popular_categories,
            top_universities=top_universities,
        )
    except Exception as e:
        logger.error(f"Failed to compute statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch statistics",
        )

@app.get("/theses", response_model=PaginatedResponse, tags=["Public - Thesis search"])
async def public_theses_list(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    university_id: Optional[str] = Query(None),
    faculty_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    degree_id: Optional[str] = Query(None),
    language_id: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc", regex="^(asc|desc)$"),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    defense_date_from: Optional[date] = Query(None),
    defense_date_to: Optional[date] = Query(None),
):
    """Public list/search of theses (approved/published only)"""
    try:
        base_query = """
            SELECT 
                t.*,
                u.name_fr AS university_name,
                f.name_fr AS faculty_name,
                d.name_fr AS degree_name,
                l.name AS language_name
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN faculties f ON t.faculty_id = f.id
            LEFT JOIN degrees d ON t.degree_id = d.id
            LEFT JOIN languages l ON t.language_id = l.id
            WHERE t.status IN ('approved','published')
        """
        count_query = "SELECT COUNT(*) AS total FROM theses t WHERE t.status IN ('approved','published')"
        params: List[Any] = []
        count_params: List[Any] = []

        if search:
            cond = (
                """
                AND (
                    LOWER(t.title_fr) LIKE LOWER(%s) OR
                    LOWER(t.title_ar) LIKE LOWER(%s) OR
                    LOWER(t.title_en) LIKE LOWER(%s) OR
                    LOWER(t.thesis_number) LIKE LOWER(%s)
                )
                """
            )
            base_query += cond
            count_query += cond
            pattern = f"%{search}%"
            params.extend([pattern] * 4)
            count_params.extend([pattern] * 4)

        if university_id:
            cond = " AND t.university_id = %s"
            base_query += cond
            count_query += cond
            params.append(university_id)
            count_params.append(university_id)

        if faculty_id:
            cond = " AND t.faculty_id = %s"
            base_query += cond
            count_query += cond
            params.append(faculty_id)
            count_params.append(faculty_id)

        if department_id:
            cond = " AND t.department_id = %s"
            base_query += cond
            count_query += cond
            params.append(department_id)
            count_params.append(department_id)

        if degree_id:
            cond = " AND t.degree_id = %s"
            base_query += cond
            count_query += cond
            params.append(degree_id)
            count_params.append(degree_id)

        if language_id:
            cond = " AND t.language_id = %s"
            base_query += cond
            count_query += cond
            params.append(language_id)
            count_params.append(language_id)

        if year_from is not None:
            cond = " AND EXTRACT(YEAR FROM t.defense_date) >= %s"
            base_query += cond
            count_query += cond
            params.append(year_from)
            count_params.append(year_from)

        if year_to is not None:
            cond = " AND EXTRACT(YEAR FROM t.defense_date) <= %s"
            base_query += cond
            count_query += cond
            params.append(year_to)
            count_params.append(year_to)

        if defense_date_from is not None:
            cond = " AND t.defense_date >= %s"
            base_query += cond
            count_query += cond
            params.append(defense_date_from)
            count_params.append(defense_date_from)

        if defense_date_to is not None:
            cond = " AND t.defense_date <= %s"
            base_query += cond
            count_query += cond
            params.append(defense_date_to)
            count_params.append(defense_date_to)

        # Filter by category if provided
        if category_id:
            cond = " AND EXISTS (SELECT 1 FROM thesis_categories tc WHERE tc.thesis_id = t.id AND tc.category_id = %s)"
            base_query += cond
            count_query += cond
            params.append(category_id)
            count_params.append(category_id)

        allowed_order_fields = ["title_fr", "defense_date", "status", "created_at", "updated_at"]
        if order_by not in allowed_order_fields:
            order_by = "created_at"

        base_query += f" ORDER BY t.{order_by} {order_dir.upper()}"
        offset = (page - 1) * limit
        base_query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        total = execute_query(count_query, count_params, fetch_one=True)["total"]
        rows = execute_query_with_result(base_query, params)

        results: List[Dict[str, Any]] = []
        for row in rows:
            # Try to fetch primary author name
            author_row = execute_query(
                """
                SELECT ap.complete_name_fr 
                FROM thesis_academic_persons tap
                JOIN academic_persons ap ON tap.person_id = ap.id
                WHERE tap.thesis_id = %s AND tap.role = 'author'
                LIMIT 1
                """,
                (row["id"],),
                fetch_one=True,
            )
            results.append({
                "id": str(row["id"]),
                "title_fr": row["title_fr"],
                "title_ar": row.get("title_ar"),
                "title_en": row.get("title_en"),
                "author_name": author_row["complete_name_fr"] if author_row else "Unknown",
                "university_name": row.get("university_name"),
                "faculty_name": row.get("faculty_name"),
                "degree_name": row.get("degree_name"),
                "defense_date": row["defense_date"].isoformat() if row.get("defense_date") else None,
                "language_name": row.get("language_name"),
                "status": row.get("status"),
                "file_url": row.get("file_url"),
                "file_name": row.get("file_name"),
                "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
                "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
            })

        pages = (total + limit - 1) // limit
        return PaginatedResponse(
            success=True,
            data=results,
            meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages),
        )
    except Exception as e:
        logger.error(f"Error fetching public theses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch theses",
        )

@app.get("/universities/tree", tags=["Public - Trees"])
async def public_universities_tree(
    include_counts: bool = Query(True),
    include_theses: bool = Query(False),
    theses_per_department: int = Query(3, ge=0, le=10)
):
    try:
        # Reuse admin logic without auth
        universities = execute_query_with_result(
            "SELECT id, name_fr, acronym FROM universities ORDER BY name_fr"
        )
        faculties = execute_query_with_result(
            "SELECT id, university_id, name_fr, acronym FROM faculties ORDER BY name_fr"
        )
        departments = execute_query_with_result(
            "SELECT id, faculty_id, name_fr, acronym FROM departments ORDER BY name_fr"
        )
        faculties_by_university: Dict[str, List[Dict[str, Any]]] = {}
        for f in faculties:
            uid = str(f["university_id"]) if f["university_id"] else None
            if not uid:
                continue
            faculties_by_university.setdefault(uid, []).append({
                "id": str(f["id"]),
                "name_fr": f["name_fr"],
                "acronym": f.get("acronym"),
                "departments": []
            })
        departments_by_faculty: Dict[str, List[Dict[str, Any]]] = {}
        department_ids: List[str] = []
        for d in departments:
            fid = str(d["faculty_id"]) if d["faculty_id"] else None
            if not fid:
                continue
            node: Dict[str, Any] = {
                "id": str(d["id"]),
                "name_fr": d["name_fr"],
                "acronym": d.get("acronym"),
            }
            if include_counts:
                node["thesis_count"] = 0
            if include_theses and theses_per_department > 0:
                node["theses"] = []
            departments_by_faculty.setdefault(fid, []).append(node)
            department_ids.append(str(d["id"]))
        for uid, fac_list in faculties_by_university.items():
            for fac in fac_list:
                fid = fac["id"]
                fac["departments"] = departments_by_faculty.get(fid, [])
                if include_counts:
                    fac["department_count"] = len(fac["departments"])
        thesis_counts: Dict[str, int] = {}
        if include_counts and department_ids:
            placeholders = ",".join(["%s"] * len(department_ids))
            count_q = f"SELECT department_id, COUNT(*) AS c FROM theses WHERE status IN ('approved','published') AND department_id IN ({placeholders}) GROUP BY department_id"
            for r in execute_query_with_result(count_q, department_ids):
                thesis_counts[str(r["department_id"])] = r["c"]
            for fac_list in faculties_by_university.values():
                for fac in fac_list:
                    for dep in fac["departments"]:
                        dep["thesis_count"] = thesis_counts.get(dep["id"], 0)
        if include_theses and theses_per_department > 0 and department_ids:
            placeholders = ",".join(["%s"] * len(department_ids))
            q = f"""
                SELECT * FROM (
                    SELECT t.id, t.title_fr, t.defense_date, t.status, t.department_id,
                           ROW_NUMBER() OVER (PARTITION BY t.department_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) rn
                    FROM theses t
                    WHERE t.status IN ('approved','published') AND t.department_id IN ({placeholders})
                ) s WHERE rn <= %s
            """
            rows = execute_query_with_result(q, department_ids + [theses_per_department])
            samples: Dict[str, List[Dict[str, Any]]] = {}
            for r in rows:
                did = str(r["department_id"]) if r["department_id"] else None
                if did:
                    samples.setdefault(did, []).append({
                        "id": str(r["id"]),
                        "title_fr": r["title_fr"],
                        "defense_date": r["defense_date"],
                        "status": r["status"],
                    })
            for fac_list in faculties_by_university.values():
                for fac in fac_list:
                    for dep in fac["departments"]:
                        dep["theses"] = samples.get(dep["id"], [])
        tree: List[Dict[str, Any]] = []
        for u in universities:
            uid = str(u["id"])
            node: Dict[str, Any] = {
                "id": uid,
                "type": "university",
                "name_fr": u["name_fr"],
                "acronym": u.get("acronym"),
                "faculties": faculties_by_university.get(uid, [])
            }
            if include_counts:
                node["faculty_count"] = len(node["faculties"])
                node["department_count"] = sum(len(f["departments"]) for f in node["faculties"]) if node["faculties"] else 0
                if thesis_counts:
                    node["thesis_count"] = sum(thesis_counts.get(dep["id"], 0) for f in node["faculties"] for dep in f["departments"])
            tree.append(node)
        return tree
    except Exception as e:
        logger.error(f"Public universities tree error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to build universities tree")


@app.get("/schools/tree", tags=["Public - Trees"])
async def public_schools_tree(
    include_counts: bool = Query(True),
    include_theses: bool = Query(False),
    theses_per_node: int = Query(3, ge=0, le=10)
):
    try:
        schools = execute_query_with_result(
            """
            SELECT s.*, u.name_fr AS university_name, ps.name_fr AS parent_school_name
            FROM schools s
            LEFT JOIN universities u ON s.parent_university_id = u.id
            LEFT JOIN schools ps ON s.parent_school_id = ps.id
            ORDER BY s.name_fr
            """
        )
        dept_rows = execute_query_with_result(
            "SELECT id, school_id, name_fr, acronym FROM departments WHERE school_id IS NOT NULL ORDER BY name_fr"
        )
        departments_by_school: Dict[str, List[Dict[str, Any]]] = {}
        for d in dept_rows:
            sid = str(d["school_id"]) if d["school_id"] else None
            if sid:
                node: Dict[str, Any] = {"id": str(d["id"]), "type": "department", "name_fr": d["name_fr"], "acronym": d.get("acronym")}
                if include_counts:
                    node["thesis_count"] = 0
                if include_theses and theses_per_node > 0:
                    node["theses"] = []
                departments_by_school.setdefault(sid, []).append(node)
        def build_school_node(school):
            node: Dict[str, Any] = {
                "id": str(school["id"]),
                "type": "school",
                "name_fr": school["name_fr"],
                "name_ar": school["name_ar"],
                "name_en": school["name_en"],
                "acronym": school["acronym"],
                "parent_type": "university" if school["parent_university_id"] else "school",
                "parent_id": str(school["parent_university_id"] or school["parent_school_id"]),
                "children": [],
                "departments": departments_by_school.get(str(school["id"]), [])
            }
            if include_counts:
                node["department_count"] = len(node["departments"])
            if include_theses and theses_per_node > 0:
                node["theses"] = []
            return node
        university_schools: Dict[str, List[Dict[str, Any]]] = {}
        school_children: Dict[str, List[Dict[str, Any]]] = {}
        for s in schools:
            node = build_school_node(s)
            if s["parent_university_id"]:
                university_schools.setdefault(str(s["parent_university_id"]), []).append(node)
            elif s["parent_school_id"]:
                school_children.setdefault(str(s["parent_school_id"]), []).append(node)
        def add_children(node):
            sid = node["id"]
            if sid in school_children:
                node["children"] = school_children[sid]
                for ch in node["children"]:
                    add_children(ch)
        # counts and samples
        dept_ids = [d["id"] for deps in departments_by_school.values() for d in deps]
        school_ids = [str(s["id"]) for s in schools]
        school_counts: Dict[str, int] = {}
        if include_counts and dept_ids:
            placeholders = ",".join(["%s"] * len(dept_ids))
            q = f"SELECT department_id, COUNT(*) AS c FROM theses WHERE status IN ('approved','published') AND department_id IN ({placeholders}) GROUP BY department_id"
            rows = execute_query_with_result(q, dept_ids)
            counts = {str(r["department_id"]): r["c"] for r in rows}
            for deps in departments_by_school.values():
                for d in deps:
                    d["thesis_count"] = counts.get(d["id"], 0)
        if include_counts and school_ids:
            placeholders = ",".join(["%s"] * len(school_ids))
            q = f"SELECT school_id, COUNT(*) AS c FROM theses WHERE status IN ('approved','published') AND school_id IN ({placeholders}) GROUP BY school_id"
            for r in execute_query_with_result(q, school_ids):
                school_counts[str(r["school_id"])] = r["c"]
        school_samples: Dict[str, List[Dict[str, Any]]] = {}
        if include_theses and theses_per_node > 0 and school_ids:
            placeholders = ",".join(["%s"] * len(school_ids))
            q = f"""
                SELECT * FROM (
                    SELECT t.id, t.title_fr, t.defense_date, t.status, t.school_id,
                           ROW_NUMBER() OVER (PARTITION BY t.school_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) rn
                    FROM theses t WHERE t.status IN ('approved','published') AND t.school_id IN ({placeholders})
                ) s WHERE rn <= %s
            """
            rows = execute_query_with_result(q, school_ids + [theses_per_node])
            for r in rows:
                sid = str(r["school_id"]) if r["school_id"] else None
                if sid:
                    school_samples.setdefault(sid, []).append({
                        "id": str(r["id"]),
                        "title_fr": r["title_fr"],
                        "defense_date": r["defense_date"],
                        "status": r["status"],
                    })
        tree: List[Dict[str, Any]] = []
        universities = execute_query_with_result("SELECT id, name_fr FROM universities ORDER BY name_fr")
        for uni in universities:
            uid = str(uni["id"])
            if uid in university_schools:
                node = {"id": uid, "name_fr": uni["name_fr"], "type": "university", "schools": university_schools[uid]}
                for sch in node["schools"]:
                    add_children(sch)
                    if include_counts:
                        direct = school_counts.get(sch["id"], 0)
                        dept_total = sum(dep.get("thesis_count", 0) for dep in sch.get("departments", []))
                        sch["thesis_count"] = direct + dept_total
                    if include_theses and theses_per_node > 0:
                        sch["theses"] = school_samples.get(sch["id"], [])
                tree.append(node)
        return tree
    except Exception as e:
        logger.error(f"Public schools tree error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to build schools tree")


@app.get("/categories/tree", tags=["Public - Trees"])
async def public_categories_tree(
    include_counts: bool = Query(True),
    include_theses: bool = Query(False),
    theses_per_category: int = Query(3, ge=0, le=10)
):
    rows = execute_query_with_result("SELECT id, parent_id, code, name_fr, level FROM categories ORDER BY level, name_fr")
    by_parent: Dict[Optional[str], List[Dict[str, Any]]] = {}
    nodes: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        pid = str(r["parent_id"]) if r["parent_id"] else None
        node: Dict[str, Any] = {"id": str(r["id"]), "code": r["code"], "name_fr": r["name_fr"], "level": r["level"], "children": []}
        if include_counts:
            node["thesis_count"] = 0
        if include_theses and theses_per_category > 0:
            node["theses"] = []
        by_parent.setdefault(pid, []).append(node)
        nodes[node["id"]] = node
    if include_counts and nodes:
        ids = list(nodes.keys())
        placeholders = ",".join(["%s"] * len(ids))
        q = f"SELECT category_id, COUNT(*) AS c FROM thesis_categories WHERE category_id IN ({placeholders}) GROUP BY category_id"
        for r in execute_query_with_result(q, ids):
            cid = str(r["category_id"])
            if cid in nodes:
                nodes[cid]["thesis_count"] = r["c"]
    if include_theses and theses_per_category > 0 and nodes:
        ids = list(nodes.keys())
        placeholders = ",".join(["%s"] * len(ids))
        q = f"""
            SELECT * FROM (
                SELECT t.id, t.title_fr, t.defense_date, t.status, tc.category_id,
                       ROW_NUMBER() OVER (PARTITION BY tc.category_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) rn
                FROM thesis_categories tc JOIN theses t ON t.id = tc.thesis_id
                WHERE t.status IN ('approved','published') AND tc.category_id IN ({placeholders})
            ) s WHERE rn <= %s
        """
        for r in execute_query_with_result(q, ids + [theses_per_category]):
            cid = str(r["category_id"]) if r["category_id"] else None
            if cid and cid in nodes:
                nodes[cid].setdefault("theses", []).append({
                    "id": str(r["id"]),
                    "title_fr": r["title_fr"],
                    "defense_date": r["defense_date"],
                    "status": r["status"]
                })
    def attach(parent_id: Optional[str]) -> List[Dict[str, Any]]:
        children = by_parent.get(parent_id, [])
        for ch in children:
            ch["children"] = attach(ch["id"])
        return children
    return attach(None)


@app.get("/geographic-entities/tree", tags=["Public - Trees"])
async def public_geographic_tree(
    include_counts: bool = Query(True),
    include_theses: bool = Query(False),
    theses_per_entity: int = Query(3, ge=0, le=10)
):
    rows = execute_query_with_result("SELECT id, parent_id, name_fr, level FROM geographic_entities ORDER BY level, name_fr")
    by_parent: Dict[Optional[str], List[Dict[str, Any]]] = {}
    nodes: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        pid = str(r["parent_id"]) if r["parent_id"] else None
        node: Dict[str, Any] = {"id": str(r["id"]), "name_fr": r["name_fr"], "level": r["level"], "children": []}
        if include_counts:
            node["thesis_count"] = 0
        if include_theses and theses_per_entity > 0:
            node["theses"] = []
        by_parent.setdefault(pid, []).append(node)
        nodes[node["id"]] = node
    if include_counts and nodes:
        ids = list(nodes.keys())
        placeholders = ",".join(["%s"] * len(ids))
        q = f"SELECT study_location_id, COUNT(*) AS c FROM theses WHERE status IN ('approved','published') AND study_location_id IN ({placeholders}) GROUP BY study_location_id"
        for r in execute_query_with_result(q, ids):
            eid = str(r["study_location_id"]) if r["study_location_id"] else None
            if eid and eid in nodes:
                nodes[eid]["thesis_count"] = r["c"]
    if include_theses and theses_per_entity > 0 and nodes:
        ids = list(nodes.keys())
        placeholders = ",".join(["%s"] * len(ids))
        q = f"""
            SELECT * FROM (
                SELECT t.id, t.title_fr, t.defense_date, t.status, t.study_location_id,
                       ROW_NUMBER() OVER (PARTITION BY t.study_location_id ORDER BY t.defense_date DESC NULLS LAST, t.created_at DESC) rn
                FROM theses t WHERE t.status IN ('approved','published') AND t.study_location_id IN ({placeholders})
            ) s WHERE rn <= %s
        """
        for r in execute_query_with_result(q, ids + [theses_per_entity]):
            eid = str(r["study_location_id"]) if r["study_location_id"] else None
            if eid and eid in nodes:
                nodes[eid].setdefault("theses", []).append({
                    "id": str(r["id"]),
                    "title_fr": r["title_fr"],
                    "defense_date": r["defense_date"],
                    "status": r["status"]
                })
    def attach(parent_id: Optional[str]) -> List[Dict[str, Any]]:
        children = by_parent.get(parent_id, [])
        for ch in children:
            ch["children"] = attach(ch["id"])
        return children
    return attach(None)


def resolve_limit(limit: int, page_size: Optional[int]) -> int:
    presets = {10, 20, 50, 100}
    if page_size in presets:
        return int(page_size)  # type: ignore[arg-type]
    return limit


@app.get("/universities", response_model=PaginatedResponse, tags=["Public - Lists"])
async def public_universities_list(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    page_size: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    order_by: str = Query("name_fr"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
):
    try:
        limit = resolve_limit(limit, page_size)
        base = """
            SELECT u.*, g.name_fr AS location_name
            FROM universities u
            LEFT JOIN geographic_entities g ON u.geographic_entities_id = g.id
            WHERE 1=1
        """
        count = "SELECT COUNT(*) AS total FROM universities u WHERE 1=1"
        params: List[Any] = []
        count_params: List[Any] = []
        if search:
            cond = " AND (LOWER(u.name_fr) LIKE LOWER(%s) OR LOWER(u.name_en) LIKE LOWER(%s) OR LOWER(u.name_ar) LIKE LOWER(%s) OR LOWER(u.acronym) LIKE LOWER(%s))"
            base += cond
            count += cond
            like = f"%{search}%"
            params.extend([like, like, like, like])
            count_params.extend([like, like, like, like])
        allowed = {"name_fr", "name_en", "name_ar", "acronym", "created_at", "updated_at"}
        if order_by not in allowed:
            order_by = "name_fr"
        base += f" ORDER BY u.{order_by} {order_dir.upper()}"
        offset = (page - 1) * limit
        base += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        total = execute_query(count, count_params, fetch_one=True)["total"]
        rows = execute_query_with_result(base, params)
        data = [{
            "id": str(r["id"]),
            "name_fr": r["name_fr"],
            "name_en": r["name_en"],
            "name_ar": r["name_ar"],
            "acronym": r["acronym"],
            "geographic_entities_id": str(r["geographic_entities_id"]) if r["geographic_entities_id"] else None,
            "location_name": r["location_name"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        } for r in rows]
        pages = (total + limit - 1) // limit
        return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))
    except Exception as e:
        logger.error(f"Public universities list error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch universities")


@app.get("/faculties", response_model=PaginatedResponse, tags=["Public - Lists"])
async def public_faculties_list(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    page_size: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    university_id: Optional[str] = Query(None),
    order_by: str = Query("name_fr"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
):
    try:
        limit = resolve_limit(limit, page_size)
        base = """
            SELECT f.*, u.name_fr AS university_name
            FROM faculties f
            JOIN universities u ON f.university_id = u.id
            WHERE 1=1
        """
        count = "SELECT COUNT(*) AS total FROM faculties f WHERE 1=1"
        params: List[Any] = []
        count_params: List[Any] = []
        if university_id:
            cond = " AND f.university_id = %s"
            base += cond
            count += cond
            params.append(university_id)
            count_params.append(university_id)
        if search:
            cond = " AND (LOWER(f.name_fr) LIKE LOWER(%s) OR LOWER(f.name_en) LIKE LOWER(%s) OR LOWER(f.name_ar) LIKE LOWER(%s) OR LOWER(f.acronym) LIKE LOWER(%s))"
            base += cond
            count += cond
            like = f"%{search}%"
            params.extend([like, like, like, like])
            count_params.extend([like, like, like, like])
        allowed = {"name_fr", "name_en", "name_ar", "acronym", "created_at", "updated_at"}
        if order_by not in allowed:
            order_by = "name_fr"
        base += f" ORDER BY f.{order_by} {order_dir.upper()}"
        offset = (page - 1) * limit
        base += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        total = execute_query(count, count_params, fetch_one=True)["total"]
        rows = execute_query_with_result(base, params)
        data = [{
            "id": str(r["id"]),
            "university_id": str(r["university_id"]),
            "university_name": r["university_name"],
            "name_fr": r["name_fr"],
            "name_en": r["name_en"],
            "name_ar": r["name_ar"],
            "acronym": r["acronym"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        } for r in rows]
        pages = (total + limit - 1) // limit
        return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))
    except Exception as e:
        logger.error(f"Public faculties list error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch faculties")


@app.get("/schools", response_model=PaginatedResponse, tags=["Public - Lists"])
async def public_schools_list(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    page_size: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    parent_university_id: Optional[str] = Query(None),
    parent_school_id: Optional[str] = Query(None),
    order_by: str = Query("name_fr"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
):
    try:
        limit = resolve_limit(limit, page_size)
        base = "SELECT * FROM schools WHERE 1=1"
        count = "SELECT COUNT(*) AS total FROM schools WHERE 1=1"
        params: List[Any] = []
        count_params: List[Any] = []
        if parent_university_id:
            cond = " AND parent_university_id = %s"
            base += cond
            count += cond
            params.append(parent_university_id)
            count_params.append(parent_university_id)
        if parent_school_id:
            cond = " AND parent_school_id = %s"
            base += cond
            count += cond
            params.append(parent_school_id)
            count_params.append(parent_school_id)
        if search:
            cond = " AND (LOWER(name_fr) LIKE LOWER(%s) OR LOWER(name_en) LIKE LOWER(%s) OR LOWER(name_ar) LIKE LOWER(%s) OR LOWER(acronym) LIKE LOWER(%s))"
            base += cond
            count += cond
            like = f"%{search}%"
            params.extend([like, like, like, like])
            count_params.extend([like, like, like, like])
        allowed = {"name_fr", "name_en", "name_ar", "acronym", "created_at", "updated_at"}
        if order_by not in allowed:
            order_by = "name_fr"
        base += f" ORDER BY {order_by} {order_dir.upper()}"
        offset = (page - 1) * limit
        base += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        total = execute_query(count, count_params, fetch_one=True)["total"]
        rows = execute_query_with_result(base, params)
        data = [{
            "id": str(r["id"]),
            "parent_university_id": str(r["parent_university_id"]) if r["parent_university_id"] else None,
            "parent_school_id": str(r["parent_school_id"]) if r["parent_school_id"] else None,
            "name_fr": r["name_fr"],
            "name_en": r["name_en"],
            "name_ar": r["name_ar"],
            "acronym": r.get("acronym"),
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        } for r in rows]
        pages = (total + limit - 1) // limit
        return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))
    except Exception as e:
        logger.error(f"Public schools list error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch schools")


@app.get("/departments", response_model=PaginatedResponse, tags=["Public - Lists"])
async def public_departments_list(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    page_size: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    faculty_id: Optional[str] = Query(None),
    school_id: Optional[str] = Query(None),
    order_by: str = Query("name_fr"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
):
    try:
        limit = resolve_limit(limit, page_size)
        base = "SELECT * FROM departments WHERE 1=1"
        count = "SELECT COUNT(*) AS total FROM departments WHERE 1=1"
        params: List[Any] = []
        count_params: List[Any] = []
        if faculty_id:
            cond = " AND faculty_id = %s"
            base += cond
            count += cond
            params.append(faculty_id)
            count_params.append(faculty_id)
        if school_id:
            cond = " AND school_id = %s"
            base += cond
            count += cond
            params.append(school_id)
            count_params.append(school_id)
        if search:
            cond = " AND (LOWER(name_fr) LIKE LOWER(%s) OR LOWER(name_en) LIKE LOWER(%s) OR LOWER(name_ar) LIKE LOWER(%s) OR LOWER(acronym) LIKE LOWER(%s))"
            base += cond
            count += cond
            like = f"%{search}%"
            params.extend([like, like, like, like])
            count_params.extend([like, like, like, like])
        allowed = {"name_fr", "name_en", "name_ar", "acronym", "created_at", "updated_at"}
        if order_by not in allowed:
            order_by = "name_fr"
        base += f" ORDER BY {order_by} {order_dir.upper()}"
        offset = (page - 1) * limit
        base += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        total = execute_query(count, count_params, fetch_one=True)["total"]
        rows = execute_query_with_result(base, params)
        data = [{
            "id": str(r["id"]),
            "faculty_id": str(r["faculty_id"]) if r["faculty_id"] else None,
            "school_id": str(r["school_id"]) if r["school_id"] else None,
            "name_fr": r["name_fr"],
            "name_en": r["name_en"],
            "name_ar": r["name_ar"],
            "acronym": r["acronym"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        } for r in rows]
        pages = (total + limit - 1) // limit
        return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))
    except Exception as e:
        logger.error(f"Public departments list error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch departments")


@app.get("/categories", response_model=PaginatedResponse, tags=["Public - Lists"])
async def public_categories_list(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    page_size: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    parent_id: Optional[str] = Query(None),
    order_by: str = Query("level"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
):
    try:
        limit = resolve_limit(limit, page_size)
        base = "SELECT * FROM categories WHERE 1=1"
        count = "SELECT COUNT(*) AS total FROM categories WHERE 1=1"
        params: List[Any] = []
        count_params: List[Any] = []
        if parent_id:
            cond = " AND parent_id = %s"
            base += cond
            count += cond
            params.append(parent_id)
            count_params.append(parent_id)
        if search:
            cond = " AND (LOWER(name_fr) LIKE LOWER(%s) OR LOWER(name_en) LIKE LOWER(%s))"
            base += cond
            count += cond
            like = f"%{search}%"
            params.extend([like, like])
            count_params.extend([like, like])
        allowed = {"level", "name_fr", "name_en", "created_at", "updated_at"}
        if order_by not in allowed:
            order_by = "level"
        base += f" ORDER BY {order_by} {order_dir.upper()}, name_fr ASC"
        offset = (page - 1) * limit
        base += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        total = execute_query(count, count_params, fetch_one=True)["total"]
        rows = execute_query_with_result(base, params)
        data = [{
            "id": str(r["id"]),
            "parent_id": str(r["parent_id"]) if r["parent_id"] else None,
            "level": r["level"],
            "code": r["code"],
            "name_fr": r["name_fr"],
            "name_en": r["name_en"],
            "name_ar": r["name_ar"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        } for r in rows]
        pages = (total + limit - 1) // limit
        return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))
    except Exception as e:
        logger.error(f"Public categories list error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch categories")


@app.get("/academic_persons", response_model=PaginatedResponse, tags=["Public - Lists"])
async def public_academic_persons_list(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    page_size: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    order_by: str = Query("complete_name_fr"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
):
    try:
        limit = resolve_limit(limit, page_size)
        base = "SELECT * FROM academic_persons WHERE 1=1"
        count = "SELECT COUNT(*) AS total FROM academic_persons WHERE 1=1"
        params: List[Any] = []
        count_params: List[Any] = []
        if search:
            cond = " AND (LOWER(complete_name_fr) LIKE LOWER(%s) OR LOWER(complete_name_ar) LIKE LOWER(%s))"
            base += cond
            count += cond
            like = f"%{search}%"
            params.extend([like, like])
            count_params.extend([like, like])
        allowed = {"complete_name_fr", "complete_name_ar", "created_at", "updated_at"}
        if order_by not in allowed:
            order_by = "complete_name_fr"
        base += f" ORDER BY {order_by} {order_dir.upper()}"
        offset = (page - 1) * limit
        base += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        total = execute_query(count, count_params, fetch_one=True)["total"]
        rows = execute_query_with_result(base, params)
        data = [{
            "id": str(r["id"]),
            "complete_name_fr": r["complete_name_fr"],
            "complete_name_ar": r["complete_name_ar"],
            "title": r["title"],
            "university_id": str(r["university_id"]) if r["university_id"] else None,
            "faculty_id": str(r["faculty_id"]) if r["faculty_id"] else None,
            "school_id": str(r["school_id"]) if r["school_id"] else None,
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        } for r in rows]
        pages = (total + limit - 1) // limit
        return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))
    except Exception as e:
        logger.error(f"Public academic persons list error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch academic persons")


@app.get("/degrees", response_model=PaginatedResponse, tags=["Public - Lists"])
async def public_degrees_list(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    page_size: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    order_by: str = Query("name_fr"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
):
    try:
        limit = resolve_limit(limit, page_size)
        base = "SELECT * FROM degrees WHERE 1=1"
        count = "SELECT COUNT(*) AS total FROM degrees WHERE 1=1"
        params: List[Any] = []
        count_params: List[Any] = []
        if search:
            cond = " AND (LOWER(name_fr) LIKE LOWER(%s) OR LOWER(name_en) LIKE LOWER(%s) OR LOWER(name_ar) LIKE LOWER(%s))"
            base += cond
            count += cond
            like = f"%{search}%"
            params.extend([like, like, like])
            count_params.extend([like, like, like])
        allowed = {"name_fr", "name_en", "name_ar", "abbreviation", "created_at", "updated_at"}
        if order_by not in allowed:
            order_by = "name_fr"
        base += f" ORDER BY {order_by} {order_dir.upper()}"
        offset = (page - 1) * limit
        base += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        total = execute_query(count, count_params, fetch_one=True)["total"]
        rows = execute_query_with_result(base, params)
        data = [{
            "id": str(r["id"]),
            "name_fr": r["name_fr"],
            "name_en": r["name_en"],
            "name_ar": r["name_ar"],
            "abbreviation": r["abbreviation"],
            "type": r["type"],
            "category": r["category"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        } for r in rows]
        pages = (total + limit - 1) // limit
        return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))
    except Exception as e:
        logger.error(f"Public degrees list error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch degrees")


@app.get("/languages", response_model=PaginatedResponse, tags=["Public - Lists"])
async def public_languages_list(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    page_size: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    order_by: str = Query("display_order"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
):
    try:
        limit = resolve_limit(limit, page_size)
        base = "SELECT * FROM languages WHERE is_active = TRUE"
        count = "SELECT COUNT(*) AS total FROM languages WHERE is_active = TRUE"
        params: List[Any] = []
        count_params: List[Any] = []
        if search:
            cond = " AND (LOWER(name) LIKE LOWER(%s) OR LOWER(native_name) LIKE LOWER(%s))"
            base += cond
            count += cond
            like = f"%{search}%"
            params.extend([like, like])
            count_params.extend([like, like])
        allowed = {"display_order", "name", "created_at", "updated_at"}
        if order_by not in allowed:
            order_by = "display_order"
        base += f" ORDER BY {order_by} {order_dir.upper()}"
        offset = (page - 1) * limit
        base += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        total = execute_query(count, count_params, fetch_one=True)["total"]
        rows = execute_query_with_result(base, params)
        data = [{
            "id": str(r["id"]),
            "code": r["code"],
            "name": r["name"],
            "native_name": r["native_name"],
            "rtl": r["rtl"],
            "is_active": r["is_active"],
            "display_order": r["display_order"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        } for r in rows]
        pages = (total + limit - 1) // limit
        return PaginatedResponse(success=True, data=data, meta=PaginationMeta(total=total, page=page, limit=limit, pages=pages))
    except Exception as e:
        logger.error(f"Public languages list error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch languages")


# =============================================================================
# APPLICATION STARTUP/SHUTDOWN
# =============================================================================

@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    try:
        skip_db_init = os.getenv("SKIP_DB_INIT", "false").lower() == "true"
        if skip_db_init:
            logger.warning("SKIP_DB_INIT=true detected. Skipping database initialization for local testing.")
        else:
            init_database()
            logger.info("Database connection initialized successfully")
        for directory in [TEMP_UPLOAD_DIR, PUBLISHED_DIR, BULK_UPLOAD_DIR]:
            directory.mkdir(parents=True, exist_ok=True)
        logger.info("Upload directories created/verified")
    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application...")
    try:
        if db_pool:
            db_pool.close_all()
            logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

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
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )