"""
Pytest configuration and fixtures for theses.ma testing
"""

import pytest
import asyncio
import os
import tempfile
import shutil
from typing import Dict, Any, Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import jwt
from datetime import datetime, timedelta

# Import your FastAPI app
from main import app, get_db, Settings
from main import UserRole, AcademicRole, ThesisStatus

# Test database configuration
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql://postgres:admin@localhost:5432/thesis_test")

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine."""
    engine = create_engine(TEST_DATABASE_URL)
    return engine

@pytest.fixture(scope="session")
def setup_test_database(test_engine):
    """Set up test database schema."""
    # Read the schema from thesis.txt and execute it
    schema_file = "thesis.txt"
    if os.path.exists(schema_file):
        with open(schema_file, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # Execute schema creation
        with test_engine.connect() as conn:
            conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
            conn.execute(text("CREATE SCHEMA public;"))
            conn.execute(text(schema_sql))
            conn.commit()
    
    yield test_engine
    
    # Cleanup after all tests
    with test_engine.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
        conn.commit()

@pytest.fixture
def test_db_session(setup_test_database):
    """Create a test database session."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=setup_test_database)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

@pytest.fixture
def client(test_db_session):
    """Create a test client with database override."""
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

@pytest.fixture
def temp_upload_dir():
    """Create a temporary upload directory for testing."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture
def admin_token():
    """Generate a JWT token for admin user."""
    settings = Settings()
    payload = {
        "sub": "test-admin@example.com",
        "user_id": "admin-user-id",
        "role": UserRole.ADMIN.value,
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token

@pytest.fixture
def super_admin_token():
    """Generate a JWT token for super admin user."""
    settings = Settings()
    payload = {
        "sub": "test-superadmin@example.com",
        "user_id": "superadmin-user-id",
        "role": UserRole.SUPER_ADMIN.value,
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token

@pytest.fixture
def user_token():
    """Generate a JWT token for regular user."""
    settings = Settings()
    payload = {
        "sub": "test-user@example.com",
        "user_id": "user-id",
        "role": UserRole.USER.value,
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token

@pytest.fixture
def auth_headers_admin(admin_token):
    """Authorization headers for admin user."""
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def auth_headers_super_admin(super_admin_token):
    """Authorization headers for super admin user."""
    return {"Authorization": f"Bearer {super_admin_token}"}

@pytest.fixture
def auth_headers_user(user_token):
    """Authorization headers for regular user."""
    return {"Authorization": f"Bearer {user_token}"}

@pytest.fixture
def sample_university_data():
    """Sample university data for testing."""
    return {
        "name_fr": "Université de Test",
        "name_en": "Test University",
        "name_ar": "جامعة الاختبار",
        "acronym": "UT",
        "geographic_entities_id": None
    }

@pytest.fixture
def sample_faculty_data():
    """Sample faculty data for testing."""
    return {
        "university_id": None,  # Will be set in tests
        "name_fr": "Faculté de Test",
        "name_en": "Test Faculty",
        "name_ar": "كلية الاختبار",
        "acronym": "FT"
    }

@pytest.fixture
def sample_thesis_data():
    """Sample thesis data for testing."""
    return {
        "title_fr": "Thèse de Test",
        "title_en": "Test Thesis",
        "title_ar": "أطروحة الاختبار",
        "abstract_fr": "Ceci est un résumé de test",
        "abstract_en": "This is a test abstract",
        "abstract_ar": "هذا ملخص اختبار",
        "defense_date": "2024-01-15",
        "language_id": None,  # Will be set in tests
        "status": ThesisStatus.PUBLISHED.value,
        "file_id": "test-file-id"
    }

@pytest.fixture
def sample_academic_person_data():
    """Sample academic person data for testing."""
    return {
        "complete_name_fr": "Professeur Test",
        "complete_name_ar": "الأستاذ اختبار",
        "first_name_fr": "Test",
        "last_name_fr": "Professeur",
        "title": "Professeur",
        "university_id": None  # Will be set in tests
    }

@pytest.fixture
def sample_category_data():
    """Sample category data for testing."""
    return {
        "code": "TEST001",
        "name_fr": "Catégorie de Test",
        "name_en": "Test Category",
        "name_ar": "فئة الاختبار",
        "description": "Description de test",
        "level": 1
    }

@pytest.fixture
def sample_keyword_data():
    """Sample keyword data for testing."""
    return {
        "keyword_fr": "mot-clé test",
        "keyword_en": "test keyword",
        "keyword_ar": "كلمة مفتاحية اختبار"
    }

@pytest.fixture
def sample_search_params():
    """Sample search parameters for testing."""
    return {
        "q": "test",
        "page": 1,
        "limit": 10,
        "sort_field": "created_at",
        "sort_order": "desc"
    }

# Test data cleanup fixtures
@pytest.fixture(autouse=True)
def cleanup_test_data(test_db_session):
    """Clean up test data after each test."""
    yield
    # Clean up in reverse order of dependencies
    test_db_session.execute(text("DELETE FROM thesis_views"))
    test_db_session.execute(text("DELETE FROM thesis_downloads"))
    test_db_session.execute(text("DELETE FROM thesis_keywords"))
    test_db_session.execute(text("DELETE FROM thesis_categories"))
    test_db_session.execute(text("DELETE FROM thesis_academic_persons"))
    test_db_session.execute(text("DELETE FROM theses"))
    test_db_session.execute(text("DELETE FROM academic_persons"))
    test_db_session.execute(text("DELETE FROM keywords"))
    test_db_session.execute(text("DELETE FROM categories"))
    test_db_session.execute(text("DELETE FROM departments"))
    test_db_session.execute(text("DELETE FROM faculties"))
    test_db_session.execute(text("DELETE FROM schools"))
    test_db_session.execute(text("DELETE FROM universities"))
    test_db_session.execute(text("DELETE FROM degrees"))
    test_db_session.execute(text("DELETE FROM languages"))
    test_db_session.execute(text("DELETE FROM geographic_entities"))
    test_db_session.execute(text("DELETE FROM users"))
    test_db_session.commit()

# Performance testing fixtures
@pytest.fixture
def large_dataset_generator():
    """Generate large dataset for performance testing."""
    def generate_large_dataset(size: int = 1000):
        universities = []
        for i in range(size):
            universities.append({
                "name_fr": f"Université Test {i}",
                "name_en": f"Test University {i}",
                "acronym": f"UT{i}"
            })
        return universities
    return generate_large_dataset