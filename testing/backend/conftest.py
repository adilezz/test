"""
Pytest configuration and fixtures for backend testing
"""

import pytest
import asyncio
import os
import tempfile
import shutil
from pathlib import Path
from typing import Generator, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi.testclient import TestClient
import json
from datetime import datetime, timedelta
import uuid

# Import the main FastAPI app
import sys
sys.path.append('/workspace')
from main import app, get_database_connection, Settings

# Test settings
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql://postgres:admin@localhost:5432/thesis_test")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
def test_settings():
    """Override settings for testing"""
    settings = Settings()
    settings.DATABASE_URL = TEST_DATABASE_URL
    settings.DEBUG = True
    settings.UPLOAD_DIRECTORY = tempfile.mkdtemp()
    return settings

@pytest.fixture(scope="session")
def test_db_connection(test_settings):
    """Create test database connection"""
    conn = psycopg2.connect(
        host=test_settings.DATABASE_HOST,
        port=test_settings.DATABASE_PORT,
        database="thesis_test",
        user=test_settings.DATABASE_USER,
        password=test_settings.DATABASE_PASSWORD,
        cursor_factory=RealDictCursor
    )
    conn.autocommit = True
    yield conn
    conn.close()

@pytest.fixture(scope="function")
def clean_db(test_db_connection):
    """Clean database before each test"""
    with test_db_connection.cursor() as cursor:
        # Clean tables in reverse dependency order
        tables = [
            'thesis_downloads', 'thesis_views', 'thesis_keywords', 
            'thesis_categories', 'thesis_academic_persons', 'theses',
            'extracted_metadata', 'extraction_jobs', 'extraction_batches',
            'user_sessions', 'audit_logs', 'users', 'user_roles',
            'academic_persons', 'keywords', 'degrees', 'departments',
            'faculties', 'schools', 'categories', 'languages',
            'universities', 'geographic_entities'
        ]
        
        for table in tables:
            cursor.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
    
    yield test_db_connection

@pytest.fixture(scope="session")
def client(test_settings):
    """FastAPI test client"""
    # Override database dependency
    def override_get_database():
        conn = psycopg2.connect(TEST_DATABASE_URL, cursor_factory=RealDictCursor)
        try:
            yield conn
        finally:
            conn.close()
    
    app.dependency_overrides[get_database_connection] = override_get_database
    
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def test_user_credentials():
    """Test user credentials"""
    return {
        "admin": {
            "email": "admin@test.com",
            "password": "admin123",
            "role": "admin"
        },
        "super_admin": {
            "email": "superadmin@test.com", 
            "password": "superadmin123",
            "role": "super_admin"
        },
        "user": {
            "email": "user@test.com",
            "password": "user123", 
            "role": "user"
        }
    }

@pytest.fixture
def auth_headers(client, test_user_credentials):
    """Get authentication headers for different user roles"""
    headers = {}
    
    for role, creds in test_user_credentials.items():
        # Create user first
        user_data = {
            "email": creds["email"],
            "username": f"test_{role}",
            "password": creds["password"],
            "first_name": f"Test",
            "last_name": f"{role.title()}",
            "title": "Dr.",
            "language": "fr",
            "timezone": "Africa/Casablanca",
            "role": creds["role"]
        }
        
        # Login to get token
        login_response = client.post("/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            headers[role] = {"Authorization": f"Bearer {token}"}
    
    return headers

@pytest.fixture
def sample_test_data(clean_db):
    """Create comprehensive test data"""
    with clean_db.cursor() as cursor:
        test_data = {}
        
        # Geographic entities
        cursor.execute("""
            INSERT INTO geographic_entities (id, name_fr, name_en, level, code)
            VALUES (%s, 'Maroc', 'Morocco', 'country', 'MA') RETURNING id
        """, (str(uuid.uuid4()),))
        country_id = cursor.fetchone()['id']
        test_data['country_id'] = country_id
        
        cursor.execute("""
            INSERT INTO geographic_entities (id, parent_id, name_fr, name_en, level, code)
            VALUES (%s, %s, 'Rabat-Salé-Kénitra', 'Rabat-Sale-Kenitra', 'region', 'RSK') RETURNING id
        """, (str(uuid.uuid4()), country_id))
        region_id = cursor.fetchone()['id']
        test_data['region_id'] = region_id
        
        # Universities
        cursor.execute("""
            INSERT INTO universities (id, name_fr, name_en, acronym, geographic_entities_id)
            VALUES (%s, 'Université Mohammed V', 'Mohammed V University', 'UM5', %s) RETURNING id
        """, (str(uuid.uuid4()), region_id))
        university_id = cursor.fetchone()['id']
        test_data['university_id'] = university_id
        
        # Faculties
        cursor.execute("""
            INSERT INTO faculties (id, university_id, name_fr, name_en, acronym)
            VALUES (%s, %s, 'Faculté des Sciences', 'Faculty of Sciences', 'FS') RETURNING id
        """, (str(uuid.uuid4()), university_id))
        faculty_id = cursor.fetchone()['id']
        test_data['faculty_id'] = faculty_id
        
        # Schools
        cursor.execute("""
            INSERT INTO schools (id, parent_university_id, name_fr, name_en, acronym)
            VALUES (%s, %s, 'École Nationale Supérieure d\'Informatique', 'National School of Computer Science', 'ENSI') RETURNING id
        """, (str(uuid.uuid4()), university_id))
        school_id = cursor.fetchone()['id']
        test_data['school_id'] = school_id
        
        # Departments
        cursor.execute("""
            INSERT INTO departments (id, faculty_id, name_fr, name_en, acronym)
            VALUES (%s, %s, 'Département d\'Informatique', 'Computer Science Department', 'INFO') RETURNING id
        """, (str(uuid.uuid4()), faculty_id))
        department_id = cursor.fetchone()['id']
        test_data['department_id'] = department_id
        
        # Languages
        cursor.execute("""
            INSERT INTO languages (id, name, code, native_name, rtl, is_active, display_order)
            VALUES (%s, 'French', 'fr', 'Français', false, true, 1) RETURNING id
        """, (str(uuid.uuid4()),))
        language_id = cursor.fetchone()['id']
        test_data['language_id'] = language_id
        
        # Degrees
        cursor.execute("""
            INSERT INTO degrees (id, name_fr, name_en, name_ar, abbreviation, type, category)
            VALUES (%s, 'Doctorat', 'Doctorate', 'دكتوراه', 'PhD', 'doctorate', 'research') RETURNING id
        """, (str(uuid.uuid4()),))
        degree_id = cursor.fetchone()['id']
        test_data['degree_id'] = degree_id
        
        # Categories
        cursor.execute("""
            INSERT INTO categories (id, code, name_fr, name_en, level, description)
            VALUES (%s, 'CS', 'Informatique', 'Computer Science', 1, 'Computer Science and IT') RETURNING id
        """, (str(uuid.uuid4()),))
        category_id = cursor.fetchone()['id']
        test_data['category_id'] = category_id
        
        # Keywords
        cursor.execute("""
            INSERT INTO keywords (id, keyword_fr, keyword_en, category_id)
            VALUES (%s, 'Intelligence Artificielle', 'Artificial Intelligence', %s) RETURNING id
        """, (str(uuid.uuid4()), category_id))
        keyword_id = cursor.fetchone()['id']
        test_data['keyword_id'] = keyword_id
        
        # Academic Persons
        cursor.execute("""
            INSERT INTO academic_persons (id, complete_name_fr, first_name_fr, last_name_fr, title, university_id)
            VALUES (%s, 'Dr. Ahmed BENALI', 'Ahmed', 'BENALI', 'Dr.', %s) RETURNING id
        """, (str(uuid.uuid4()), university_id))
        person_id = cursor.fetchone()['id']
        test_data['person_id'] = person_id
        
        # User roles
        cursor.execute("""
            INSERT INTO user_roles (id, name, description, permissions)
            VALUES (%s, 'admin', 'Administrator', '{}') RETURNING id
        """, (str(uuid.uuid4()),))
        role_id = cursor.fetchone()['id']
        test_data['role_id'] = role_id
        
        # Test thesis
        cursor.execute("""
            INSERT INTO theses (id, title_fr, title_en, abstract_fr, university_id, faculty_id, 
                               department_id, degree_id, defense_date, language_id, status, file_url, file_name)
            VALUES (%s, 'Intelligence Artificielle en Médecine', 'Artificial Intelligence in Medicine',
                    'Cette thèse explore l\'application de l\'IA en médecine...', %s, %s, %s, %s, %s, %s, 'published',
                    '/files/test_thesis.pdf', 'test_thesis.pdf') RETURNING id
        """, (str(uuid.uuid4()), university_id, faculty_id, department_id, degree_id, 
              datetime.now().date(), language_id))
        thesis_id = cursor.fetchone()['id']
        test_data['thesis_id'] = thesis_id
        
        return test_data

@pytest.fixture
def sample_pdf_files():
    """Sample PDF files for testing"""
    test_data_dir = Path("/workspace/testing/test_data/pdfs")
    test_data_dir.mkdir(parents=True, exist_ok=True)
    
    # Create sample PDF content (you should replace with real PDFs)
    sample_files = {
        "simple_thesis.pdf": test_data_dir / "simple_thesis.pdf",
        "complex_thesis.pdf": test_data_dir / "complex_thesis.pdf",
        "scanned_thesis.pdf": test_data_dir / "scanned_thesis.pdf",
        "multilingual_thesis.pdf": test_data_dir / "multilingual_thesis.pdf"
    }
    
    # Note: In real implementation, you would have actual PDF files here
    # For now, we'll create placeholder files
    for name, path in sample_files.items():
        if not path.exists():
            path.write_bytes(b"%PDF-1.4 Sample PDF content for testing")
    
    return sample_files

@pytest.fixture
def performance_thresholds():
    """Performance testing thresholds"""
    return {
        "api_response_time": 0.5,  # 500ms
        "search_response_time": 1.0,  # 1 second
        "file_upload_time": 30.0,  # 30 seconds
        "bulk_operation_time": 5.0,  # 5 seconds
        "page_load_time": 2.0  # 2 seconds
    }

# Utility functions for tests
def create_test_user(cursor, role="user", email=None):
    """Helper to create test users"""
    if email is None:
        email = f"test_{role}_{uuid.uuid4().hex[:8]}@test.com"
    
    user_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, true) RETURNING id
    """, (user_id, email, f"user_{user_id[:8]}", "hashed_password", "Test", "User", role))
    
    return cursor.fetchone()['id']

def create_test_thesis(cursor, **kwargs):
    """Helper to create test theses"""
    defaults = {
        "id": str(uuid.uuid4()),
        "title_fr": "Test Thesis",
        "abstract_fr": "Test abstract",
        "status": "published",
        "defense_date": datetime.now().date(),
        "file_url": "/test/file.pdf",
        "file_name": "test.pdf"
    }
    defaults.update(kwargs)
    
    columns = ", ".join(defaults.keys())
    placeholders = ", ".join(["%s"] * len(defaults))
    values = list(defaults.values())
    
    cursor.execute(f"""
        INSERT INTO theses ({columns})
        VALUES ({placeholders}) RETURNING id
    """, values)
    
    return cursor.fetchone()['id']