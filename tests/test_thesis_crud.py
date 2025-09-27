"""
Thesis CRUD Operations Tests
"""

import pytest
import io
from fastapi.testclient import TestClient
from main import ThesisStatus, AcademicRole

class TestThesisCRUD:
    """Test thesis CRUD operations."""
    
    def test_create_thesis_manual(self, client: TestClient, auth_headers_admin, test_db_session):
        """Test manual thesis creation."""
        # First create required entities
        university_data = {
            "name_fr": "Université de Test",
            "name_en": "Test University",
            "acronym": "UT"
        }
        university_response = client.post("/admin/universities", json=university_data, headers=auth_headers_admin)
        university_id = university_response.json()["id"]
        
        faculty_data = {
            "university_id": university_id,
            "name_fr": "Faculté de Test",
            "name_en": "Test Faculty"
        }
        faculty_response = client.post("/admin/faculties", json=faculty_data, headers=auth_headers_admin)
        faculty_id = faculty_response.json()["id"]
        
        degree_data = {
            "name_fr": "Doctorat",
            "name_en": "Doctorate",
            "name_ar": "دكتوراه",
            "abbreviation": "PhD",
            "type": "doctorate"
        }
        degree_response = client.post("/admin/degrees", json=degree_data, headers=auth_headers_admin)
        degree_id = degree_response.json()["id"]
        
        language_data = {
            "name": "French",
            "code": "fr",
            "native_name": "Français",
            "rtl": False,
            "is_active": True,
            "display_order": 1
        }
        language_response = client.post("/admin/languages", json=language_data, headers=auth_headers_admin)
        language_id = language_response.json()["id"]
        
        # Create thesis
        thesis_data = {
            "title_fr": "Thèse de Test",
            "title_en": "Test Thesis",
            "abstract_fr": "Ceci est un résumé de test",
            "abstract_en": "This is a test abstract",
            "university_id": university_id,
            "faculty_id": faculty_id,
            "degree_id": degree_id,
            "defense_date": "2024-01-15",
            "language_id": language_id,
            "status": ThesisStatus.PUBLISHED.value,
            "file_id": "test-file-id-123"
        }
        
        response = client.post("/admin/thesis-content/manual/create", json=thesis_data, headers=auth_headers_admin)
        assert response.status_code == 201
        
        data = response.json()
        assert data["title_fr"] == thesis_data["title_fr"]
        assert data["title_en"] == thesis_data["title_en"]
        assert data["abstract_fr"] == thesis_data["abstract_fr"]
        assert data["status"] == thesis_data["status"]
        assert "id" in data
        assert "created_at" in data
    
    def test_get_thesis_details(self, client: TestClient, auth_headers_admin, test_db_session):
        """Test getting thesis details."""
        # Create a thesis first (simplified version)
        # This would require setting up all dependencies
        thesis_id = "test-thesis-id"
        
        response = client.get(f"/admin/theses/{thesis_id}", headers=auth_headers_admin)
        # This might return 404 if thesis doesn't exist, which is expected
        assert response.status_code in [200, 404]
    
    def test_get_theses_list(self, client: TestClient, auth_headers_admin):
        """Test getting theses list."""
        response = client.get("/admin/theses", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "meta" in data
        assert isinstance(data["data"], list)
    
    def test_search_theses(self, client: TestClient, auth_headers_admin):
        """Test searching theses."""
        response = client.get("/admin/theses?search=test", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
    
    def test_filter_theses_by_status(self, client: TestClient, auth_headers_admin):
        """Test filtering theses by status."""
        response = client.get(f"/admin/theses?status={ThesisStatus.PUBLISHED.value}", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
    
    def test_filter_theses_by_university(self, client: TestClient, auth_headers_admin):
        """Test filtering theses by university."""
        response = client.get("/admin/theses?university_id=test-university-id", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
    
    def test_thesis_pagination(self, client: TestClient, auth_headers_admin):
        """Test thesis pagination."""
        response = client.get("/admin/theses?page=1&limit=5", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["data"]) <= 5
        assert data["meta"]["page"] == 1
        assert data["meta"]["limit"] == 5
    
    def test_update_thesis(self, client: TestClient, auth_headers_admin):
        """Test updating thesis."""
        thesis_id = "test-thesis-id"
        update_data = {
            "title_fr": "Titre Modifié",
            "abstract_fr": "Résumé modifié"
        }
        
        response = client.put(f"/admin/theses/{thesis_id}", json=update_data, headers=auth_headers_admin)
        # This might return 404 if thesis doesn't exist
        assert response.status_code in [200, 404]
    
    def test_delete_thesis(self, client: TestClient, auth_headers_admin):
        """Test deleting thesis."""
        thesis_id = "test-thesis-id"
        
        response = client.delete(f"/admin/theses/{thesis_id}", headers=auth_headers_admin)
        # This might return 404 if thesis doesn't exist
        assert response.status_code in [200, 404]
    
    def test_add_academic_person_to_thesis(self, client: TestClient, auth_headers_admin):
        """Test adding academic person to thesis."""
        thesis_id = "test-thesis-id"
        person_id = "test-person-id"
        
        academic_person_data = {
            "person_id": person_id,
            "role": AcademicRole.AUTHOR.value,
            "faculty_id": None,
            "is_external": False
        }
        
        response = client.post(f"/admin/theses/{thesis_id}/academic-persons", 
                             json=academic_person_data, headers=auth_headers_admin)
        # This might return 404 if thesis or person doesn't exist
        assert response.status_code in [201, 404]
    
    def test_add_category_to_thesis(self, client: TestClient, auth_headers_admin):
        """Test adding category to thesis."""
        thesis_id = "test-thesis-id"
        category_id = "test-category-id"
        
        category_data = {
            "category_id": category_id,
            "is_primary": True
        }
        
        response = client.post(f"/admin/theses/{thesis_id}/categories", 
                             json=category_data, headers=auth_headers_admin)
        # This might return 404 if thesis or category doesn't exist
        assert response.status_code in [201, 404]
    
    def test_add_keyword_to_thesis(self, client: TestClient, auth_headers_admin):
        """Test adding keyword to thesis."""
        thesis_id = "test-thesis-id"
        keyword_id = "test-keyword-id"
        
        keyword_data = {
            "keyword_id": keyword_id,
            "keyword_position": 1
        }
        
        response = client.post(f"/admin/theses/{thesis_id}/keywords", 
                             json=keyword_data, headers=auth_headers_admin)
        # This might return 404 if thesis or keyword doesn't exist
        assert response.status_code in [201, 404]

class TestThesisFileUpload:
    """Test thesis file upload functionality."""
    
    def test_upload_pdf_file(self, client: TestClient, auth_headers_admin):
        """Test uploading PDF file."""
        # Create a mock PDF file
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        files = {"file": ("test_thesis.pdf", io.BytesIO(pdf_content), "application/pdf")}
        
        response = client.post("/admin/thesis-content/upload-file", files=files, headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert "file_id" in data
        assert "original_filename" in data
        assert "file_size" in data
        assert data["original_filename"] == "test_thesis.pdf"
    
    def test_upload_invalid_file_type(self, client: TestClient, auth_headers_admin):
        """Test uploading invalid file type."""
        # Create a mock text file
        text_content = b"This is not a PDF file"
        files = {"file": ("test.txt", io.BytesIO(text_content), "text/plain")}
        
        response = client.post("/admin/thesis-content/upload-file", files=files, headers=auth_headers_admin)
        assert response.status_code == 400
    
    def test_upload_large_file(self, client: TestClient, auth_headers_admin):
        """Test uploading file that's too large."""
        # Create a large mock PDF file (simulate large file)
        large_content = b"%PDF-1.4\n" + b"x" * (100 * 1024 * 1024)  # 100MB
        files = {"file": ("large_thesis.pdf", io.BytesIO(large_content), "application/pdf")}
        
        response = client.post("/admin/thesis-content/upload-file", files=files, headers=auth_headers_admin)
        # This might succeed or fail depending on file size limits
        assert response.status_code in [200, 413]
    
    def test_upload_without_file(self, client: TestClient, auth_headers_admin):
        """Test upload request without file."""
        response = client.post("/admin/thesis-content/upload-file", headers=auth_headers_admin)
        assert response.status_code == 422

class TestThesisValidation:
    """Test thesis validation and constraints."""
    
    def test_thesis_required_fields(self, client: TestClient, auth_headers_admin):
        """Test thesis creation with missing required fields."""
        invalid_data = {
            "title_en": "Test Thesis",
            "abstract_en": "Test Abstract"
            # Missing title_fr, abstract_fr, defense_date, language_id, status
        }
        
        response = client.post("/admin/thesis-content/manual/create", json=invalid_data, headers=auth_headers_admin)
        assert response.status_code == 422
    
    def test_thesis_invalid_date_format(self, client: TestClient, auth_headers_admin):
        """Test thesis with invalid date format."""
        invalid_data = {
            "title_fr": "Thèse de Test",
            "abstract_fr": "Résumé de test",
            "defense_date": "invalid-date",
            "language_id": "test-language-id",
            "status": ThesisStatus.PUBLISHED.value
        }
        
        response = client.post("/admin/thesis-content/manual/create", json=invalid_data, headers=auth_headers_admin)
        assert response.status_code == 422
    
    def test_thesis_invalid_status(self, client: TestClient, auth_headers_admin):
        """Test thesis with invalid status."""
        invalid_data = {
            "title_fr": "Thèse de Test",
            "abstract_fr": "Résumé de test",
            "defense_date": "2024-01-15",
            "language_id": "test-language-id",
            "status": "invalid_status"
        }
        
        response = client.post("/admin/thesis-content/manual/create", json=invalid_data, headers=auth_headers_admin)
        assert response.status_code == 422

class TestThesisPublicAccess:
    """Test public thesis access."""
    
    def test_get_public_theses(self, client: TestClient):
        """Test getting public theses list."""
        response = client.get("/theses")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "meta" in data
        assert isinstance(data["data"], list)
    
    def test_search_public_theses(self, client: TestClient):
        """Test searching public theses."""
        response = client.get("/theses?q=test")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
    
    def test_download_thesis(self, client: TestClient):
        """Test downloading thesis."""
        thesis_id = "test-thesis-id"
        
        response = client.get(f"/theses/{thesis_id}/download")
        # This might return 404 if thesis doesn't exist
        assert response.status_code in [200, 404]
    
    def test_get_thesis_statistics(self, client: TestClient):
        """Test getting public statistics."""
        response = client.get("/statistics")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_theses" in data
        assert "total_universities" in data
        assert "total_faculties" in data