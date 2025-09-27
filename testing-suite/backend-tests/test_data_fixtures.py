"""
Test data fixtures for theses.ma testing
"""

import pytest
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any
import json

class TestDataFixtures:
    """Generate test data for various entities."""
    
    @staticmethod
    def create_university_data(**overrides) -> Dict[str, Any]:
        """Create test university data."""
        base_data = {
            "name_fr": "Université de Test",
            "name_en": "Test University",
            "name_ar": "جامعة الاختبار",
            "acronym": "UT",
            "geographic_entities_id": None
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_faculty_data(university_id: str = None, **overrides) -> Dict[str, Any]:
        """Create test faculty data."""
        base_data = {
            "university_id": university_id or str(uuid.uuid4()),
            "name_fr": "Faculté de Test",
            "name_en": "Test Faculty",
            "name_ar": "كلية الاختبار",
            "acronym": "FT"
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_school_data(**overrides) -> Dict[str, Any]:
        """Create test school data."""
        base_data = {
            "name_fr": "École de Test",
            "name_en": "Test School",
            "name_ar": "مدرسة الاختبار",
            "acronym": "ET",
            "parent_university_id": None,
            "parent_school_id": None
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_department_data(faculty_id: str = None, school_id: str = None, **overrides) -> Dict[str, Any]:
        """Create test department data."""
        base_data = {
            "faculty_id": faculty_id,
            "school_id": school_id,
            "name_fr": "Département de Test",
            "name_en": "Test Department",
            "name_ar": "قسم الاختبار",
            "acronym": "DT"
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_category_data(**overrides) -> Dict[str, Any]:
        """Create test category data."""
        base_data = {
            "parent_id": None,
            "code": "TEST001",
            "name_fr": "Catégorie de Test",
            "name_en": "Test Category",
            "name_ar": "فئة الاختبار",
            "description": "Description de test",
            "level": 1
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_keyword_data(**overrides) -> Dict[str, Any]:
        """Create test keyword data."""
        base_data = {
            "parent_keyword_id": None,
            "keyword_fr": "mot-clé test",
            "keyword_en": "test keyword",
            "keyword_ar": "كلمة مفتاحية اختبار",
            "category_id": None
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_academic_person_data(**overrides) -> Dict[str, Any]:
        """Create test academic person data."""
        base_data = {
            "complete_name_fr": "Professeur Test",
            "complete_name_ar": "الأستاذ اختبار",
            "first_name_fr": "Test",
            "last_name_fr": "Professeur",
            "first_name_ar": "اختبار",
            "last_name_ar": "أستاذ",
            "title": "Professeur",
            "university_id": None,
            "faculty_id": None,
            "school_id": None,
            "external_institution_name": None,
            "external_institution_country": None,
            "external_institution_type": None,
            "user_id": None
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_degree_data(**overrides) -> Dict[str, Any]:
        """Create test degree data."""
        base_data = {
            "name_en": "Doctorate",
            "name_fr": "Doctorat",
            "name_ar": "دكتوراه",
            "abbreviation": "PhD",
            "type": "doctorate",
            "category": "research"
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_language_data(**overrides) -> Dict[str, Any]:
        """Create test language data."""
        base_data = {
            "name": "French",
            "code": "fr",
            "native_name": "Français",
            "rtl": False,
            "is_active": True,
            "display_order": 1
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_geographic_entity_data(**overrides) -> Dict[str, Any]:
        """Create test geographic entity data."""
        base_data = {
            "name_fr": "Casablanca",
            "name_en": "Casablanca",
            "name_ar": "الدار البيضاء",
            "parent_id": None,
            "level": "city",
            "code": "CAS",
            "latitude": 33.5731,
            "longitude": -7.5898
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_user_data(**overrides) -> Dict[str, Any]:
        """Create test user data."""
        base_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpassword123",
            "first_name": "Test",
            "last_name": "User",
            "title": "Student",
            "phone": "+212600000000",
            "language": "fr",
            "timezone": "Africa/Casablanca",
            "role": "user",
            "university_id": None,
            "faculty_id": None,
            "department_id": None,
            "school_id": None
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_thesis_data(**overrides) -> Dict[str, Any]:
        """Create test thesis data."""
        base_data = {
            "title_fr": "Thèse de Test",
            "title_en": "Test Thesis",
            "title_ar": "أطروحة الاختبار",
            "abstract_fr": "Ceci est un résumé de test",
            "abstract_en": "This is a test abstract",
            "abstract_ar": "هذا ملخص اختبار",
            "university_id": None,
            "faculty_id": None,
            "school_id": None,
            "department_id": None,
            "degree_id": None,
            "thesis_number": "TH-2024-001",
            "study_location_id": None,
            "defense_date": "2024-01-15",
            "language_id": None,
            "secondary_language_ids": [],
            "page_count": 150,
            "status": "published",
            "file_id": str(uuid.uuid4())
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_thesis_academic_person_data(thesis_id: str, person_id: str, **overrides) -> Dict[str, Any]:
        """Create test thesis academic person data."""
        base_data = {
            "thesis_id": thesis_id,
            "person_id": person_id,
            "role": "author",
            "faculty_id": None,
            "is_external": False,
            "external_institution_name": None
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_thesis_category_data(thesis_id: str, category_id: str, **overrides) -> Dict[str, Any]:
        """Create test thesis category data."""
        base_data = {
            "thesis_id": thesis_id,
            "category_id": category_id,
            "is_primary": True
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_thesis_keyword_data(thesis_id: str, keyword_id: str, **overrides) -> Dict[str, Any]:
        """Create test thesis keyword data."""
        base_data = {
            "thesis_id": thesis_id,
            "keyword_id": keyword_id,
            "keyword_position": 1
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def create_search_params(**overrides) -> Dict[str, Any]:
        """Create test search parameters."""
        base_data = {
            "q": "test",
            "page": 1,
            "limit": 20,
            "sort_field": "created_at",
            "sort_order": "desc"
        }
        base_data.update(overrides)
        return base_data

@pytest.fixture
def test_data_fixtures():
    """Provide test data fixtures."""
    return TestDataFixtures()

@pytest.fixture
def sample_pdf_content():
    """Generate sample PDF content for testing."""
    # Minimal PDF content for testing
    return b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Thesis Content) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000136 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
394
%%EOF"""

@pytest.fixture
def sample_metadata_extraction_result():
    """Generate sample metadata extraction result."""
    return {
        "thesis": {
            "title_fr": "Intelligence Artificielle et Apprentissage Automatique",
            "title_en": "Artificial Intelligence and Machine Learning",
            "abstract_fr": "Cette thèse traite de l'intelligence artificielle...",
            "abstract_en": "This thesis deals with artificial intelligence...",
            "defense_date": "2024-01-15",
            "submission_date": "2023-12-01",
            "academic_year": "2023-2024",
            "total_pages": 150,
            "thesis_number": "TH-2024-001"
        },
        "university": {
            "name_fr": "Université Mohammed V",
            "name_en": "Mohammed V University",
            "acronym": "UM5"
        },
        "faculty": {
            "name_fr": "Faculté des Sciences",
            "name_en": "Faculty of Sciences",
            "acronym": "FS"
        },
        "degree": {
            "name_fr": "Doctorat",
            "name_en": "Doctorate",
            "abbreviation": "PhD",
            "type": "doctorate"
        },
        "language": {
            "name": "French",
            "code": "fr"
        },
        "academic_persons": [
            {
                "name_fr": "Dr. Ahmed Benali",
                "role": "author",
                "title": "Doctorant"
            },
            {
                "name_fr": "Pr. Fatima Zahra",
                "role": "director",
                "title": "Professeur"
            }
        ],
        "categories": [
            {
                "code": "INF",
                "name_fr": "Informatique",
                "level": 1
            }
        ],
        "keywords": [
            "intelligence artificielle",
            "apprentissage automatique",
            "réseaux de neurones"
        ],
        "scanned_pdf": False,
        "extraction_confidence": 0.85
    }

@pytest.fixture
def large_dataset():
    """Generate large dataset for performance testing."""
    universities = []
    for i in range(100):
        universities.append(TestDataFixtures.create_university_data(
            name_fr=f"Université Test {i}",
            name_en=f"Test University {i}",
            acronym=f"UT{i}"
        ))
    return universities

@pytest.fixture
def multilingual_test_data():
    """Generate multilingual test data."""
    return {
        "french": {
            "title": "Intelligence Artificielle",
            "abstract": "L'intelligence artificielle est un domaine...",
            "keywords": ["apprentissage automatique", "réseaux de neurones"]
        },
        "arabic": {
            "title": "الذكاء الاصطناعي",
            "abstract": "الذكاء الاصطناعي هو مجال...",
            "keywords": ["التعلم الآلي", "الشبكات العصبية"]
        },
        "english": {
            "title": "Artificial Intelligence",
            "abstract": "Artificial intelligence is a field...",
            "keywords": ["machine learning", "neural networks"]
        }
    }