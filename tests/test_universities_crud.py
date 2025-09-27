"""
Universities CRUD Operations Tests
"""

import pytest
from fastapi.testclient import TestClient

class TestUniversitiesCRUD:
    """Test universities CRUD operations."""
    
    def test_create_university(self, client: TestClient, auth_headers_admin, sample_university_data):
        """Test creating a new university."""
        response = client.post("/admin/universities", json=sample_university_data, headers=auth_headers_admin)
        assert response.status_code == 201
        
        data = response.json()
        assert data["name_fr"] == sample_university_data["name_fr"]
        assert data["name_en"] == sample_university_data["name_en"]
        assert data["name_ar"] == sample_university_data["name_ar"]
        assert data["acronym"] == sample_university_data["acronym"]
        assert "id" in data
        assert "created_at" in data
    
    def test_create_university_validation(self, client: TestClient, auth_headers_admin):
        """Test university creation validation."""
        # Test missing required field
        invalid_data = {
            "name_en": "Test University",
            "acronym": "UT"
            # Missing name_fr
        }
        
        response = client.post("/admin/universities", json=invalid_data, headers=auth_headers_admin)
        assert response.status_code == 422
    
    def test_get_universities_list(self, client: TestClient, auth_headers_admin):
        """Test getting universities list."""
        response = client.get("/admin/universities", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "meta" in data
        assert isinstance(data["data"], list)
        assert "total" in data["meta"]
        assert "page" in data["meta"]
        assert "limit" in data["meta"]
    
    def test_get_universities_pagination(self, client: TestClient, auth_headers_admin):
        """Test universities pagination."""
        # Test first page
        response = client.get("/admin/universities?page=1&limit=5", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["data"]) <= 5
        assert data["meta"]["page"] == 1
        assert data["meta"]["limit"] == 5
    
    def test_get_universities_search(self, client: TestClient, auth_headers_admin, sample_university_data):
        """Test universities search functionality."""
        # Create a university first
        client.post("/admin/universities", json=sample_university_data, headers=auth_headers_admin)
        
        # Search for it
        response = client.get("/admin/universities?search=Test", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["data"]) >= 1
        assert any("Test" in university["name_fr"] for university in data["data"])
    
    def test_get_university_by_id(self, client: TestClient, auth_headers_admin, sample_university_data):
        """Test getting university by ID."""
        # Create a university first
        create_response = client.post("/admin/universities", json=sample_university_data, headers=auth_headers_admin)
        university_id = create_response.json()["id"]
        
        # Get the university
        response = client.get(f"/admin/universities/{university_id}", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == university_id
        assert data["name_fr"] == sample_university_data["name_fr"]
    
    def test_get_nonexistent_university(self, client: TestClient, auth_headers_admin):
        """Test getting nonexistent university."""
        response = client.get("/admin/universities/00000000-0000-0000-0000-000000000000", headers=auth_headers_admin)
        assert response.status_code == 404
    
    def test_update_university(self, client: TestClient, auth_headers_admin, sample_university_data):
        """Test updating university."""
        # Create a university first
        create_response = client.post("/admin/universities", json=sample_university_data, headers=auth_headers_admin)
        university_id = create_response.json()["id"]
        
        # Update the university
        update_data = {
            "name_fr": "Université Modifiée",
            "name_en": "Modified University",
            "acronym": "UM"
        }
        
        response = client.put(f"/admin/universities/{university_id}", json=update_data, headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name_fr"] == update_data["name_fr"]
        assert data["name_en"] == update_data["name_en"]
        assert data["acronym"] == update_data["acronym"]
    
    def test_update_nonexistent_university(self, client: TestClient, auth_headers_admin):
        """Test updating nonexistent university."""
        update_data = {
            "name_fr": "Université Modifiée",
            "acronym": "UM"
        }
        
        response = client.put("/admin/universities/00000000-0000-0000-0000-000000000000", 
                            json=update_data, headers=auth_headers_admin)
        assert response.status_code == 404
    
    def test_delete_university(self, client: TestClient, auth_headers_admin, sample_university_data):
        """Test deleting university."""
        # Create a university first
        create_response = client.post("/admin/universities", json=sample_university_data, headers=auth_headers_admin)
        university_id = create_response.json()["id"]
        
        # Delete the university
        response = client.delete(f"/admin/universities/{university_id}", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        
        # Verify it's deleted
        get_response = client.get(f"/admin/universities/{university_id}", headers=auth_headers_admin)
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_university(self, client: TestClient, auth_headers_admin):
        """Test deleting nonexistent university."""
        response = client.delete("/admin/universities/00000000-0000-0000-0000-000000000000", 
                               headers=auth_headers_admin)
        assert response.status_code == 404
    
    def test_university_with_faculties(self, client: TestClient, auth_headers_admin, sample_university_data, sample_faculty_data):
        """Test university with associated faculties."""
        # Create a university first
        create_response = client.post("/admin/universities", json=sample_university_data, headers=auth_headers_admin)
        university_id = create_response.json()["id"]
        
        # Create a faculty associated with the university
        faculty_data = sample_faculty_data.copy()
        faculty_data["university_id"] = university_id
        
        faculty_response = client.post("/admin/faculties", json=faculty_data, headers=auth_headers_admin)
        assert faculty_response.status_code == 201
        
        # Get university faculties
        response = client.get(f"/admin/universities/{university_id}/faculties", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        assert any(faculty["university_id"] == university_id for faculty in data)
    
    def test_university_tree_structure(self, client: TestClient, auth_headers_admin):
        """Test university tree structure."""
        response = client.get("/admin/universities/tree", headers=auth_headers_admin)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_university_unauthorized(self, client: TestClient, sample_university_data):
        """Test creating university without authentication."""
        response = client.post("/admin/universities", json=sample_university_data)
        assert response.status_code == 401
    
    def test_create_university_user_role(self, client: TestClient, auth_headers_user, sample_university_data):
        """Test creating university with user role."""
        response = client.post("/admin/universities", json=sample_university_data, headers=auth_headers_user)
        assert response.status_code == 403

class TestUniversitiesValidation:
    """Test universities validation and constraints."""
    
    def test_duplicate_university_name(self, client: TestClient, auth_headers_admin, sample_university_data):
        """Test creating university with duplicate name."""
        # Create first university
        client.post("/admin/universities", json=sample_university_data, headers=auth_headers_admin)
        
        # Try to create second university with same name
        response = client.post("/admin/universities", json=sample_university_data, headers=auth_headers_admin)
        # This might succeed or fail depending on database constraints
        assert response.status_code in [201, 409, 422]
    
    def test_university_name_required(self, client: TestClient, auth_headers_admin):
        """Test that university name_fr is required."""
        invalid_data = {
            "name_en": "Test University",
            "acronym": "UT"
            # Missing name_fr
        }
        
        response = client.post("/admin/universities", json=invalid_data, headers=auth_headers_admin)
        assert response.status_code == 422
    
    def test_university_acronym_optional(self, client: TestClient, auth_headers_admin):
        """Test that university acronym is optional."""
        data = {
            "name_fr": "Université Sans Acronyme",
            "name_en": "University Without Acronym"
            # No acronym
        }
        
        response = client.post("/admin/universities", json=data, headers=auth_headers_admin)
        assert response.status_code == 201
        
        response_data = response.json()
        assert response_data["acronym"] is None or response_data["acronym"] == ""
    
    def test_university_multilingual_names(self, client: TestClient, auth_headers_admin):
        """Test university with multilingual names."""
        data = {
            "name_fr": "Université Multilingue",
            "name_en": "Multilingual University",
            "name_ar": "جامعة متعددة اللغات",
            "acronym": "UM"
        }
        
        response = client.post("/admin/universities", json=data, headers=auth_headers_admin)
        assert response.status_code == 201
        
        response_data = response.json()
        assert response_data["name_fr"] == data["name_fr"]
        assert response_data["name_en"] == data["name_en"]
        assert response_data["name_ar"] == data["name_ar"]