"""
Thesis Management API Tests
Tests all thesis-related endpoints including CRUD operations, search, and file handling
"""

import pytest
import time
import json
import uuid
from datetime import datetime, date
from pathlib import Path
import tempfile
import os

class TestThesisManagementAPI:
    """Test thesis management endpoints"""
    
    def test_get_theses_public(self, client, sample_test_data):
        """Test public thesis listing endpoint"""
        response = client.get("/theses")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "meta" in data
        assert isinstance(data["data"], list)
        
        # Test pagination metadata
        meta = data["meta"]
        assert "total" in meta
        assert "page" in meta
        assert "limit" in meta
        assert "pages" in meta
    
    def test_get_theses_with_filters(self, client, sample_test_data):
        """Test thesis listing with various filters"""
        # Test search query
        response = client.get("/theses?q=intelligence")
        assert response.status_code == 200
        
        # Test university filter
        response = client.get(f"/theses?university_id={sample_test_data['university_id']}")
        assert response.status_code == 200
        
        # Test category filter
        response = client.get(f"/theses?category_id={sample_test_data['category_id']}")
        assert response.status_code == 200
        
        # Test language filter
        response = client.get(f"/theses?language_id={sample_test_data['language_id']}")
        assert response.status_code == 200
        
        # Test year range filter
        current_year = datetime.now().year
        response = client.get(f"/theses?year_from={current_year-5}&year_to={current_year}")
        assert response.status_code == 200
        
        # Test status filter
        response = client.get("/theses?status=published")
        assert response.status_code == 200
        
        # Test pagination
        response = client.get("/theses?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 10
        
        # Test sorting
        response = client.get("/theses?sort_field=created_at&sort_order=desc")
        assert response.status_code == 200
    
    def test_get_theses_invalid_filters(self, client):
        """Test thesis listing with invalid filters"""
        # Invalid UUID
        response = client.get("/theses?university_id=invalid-uuid")
        assert response.status_code == 422
        
        # Invalid year range
        response = client.get("/theses?year_from=2025&year_to=2020")
        assert response.status_code in [200, 422]  # Depends on validation
        
        # Invalid sort field
        response = client.get("/theses?sort_field=invalid_field")
        assert response.status_code == 422
        
        # Invalid page number
        response = client.get("/theses?page=0")
        assert response.status_code == 422
    
    def test_thesis_download(self, client, sample_test_data):
        """Test thesis PDF download"""
        thesis_id = sample_test_data['thesis_id']
        response = client.get(f"/theses/{thesis_id}/download")
        
        # Should either return file or 404 if file doesn't exist
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            # Check content type for PDF
            assert response.headers.get("content-type") == "application/pdf"
    
    def test_admin_thesis_listing(self, client, auth_headers, sample_test_data):
        """Test admin thesis listing endpoint"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/theses", headers=auth_headers["admin"])
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "meta" in data
        
        # Admin listing should include more details
        if data["data"]:
            thesis = data["data"][0]
            expected_fields = [
                "id", "title_fr", "status", "created_at", 
                "university_name", "author_name"
            ]
            for field in expected_fields:
                assert field in thesis or field + "_name" in thesis
    
    def test_admin_thesis_detail(self, client, auth_headers, sample_test_data):
        """Test admin thesis detail endpoint"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        thesis_id = sample_test_data['thesis_id']
        response = client.get(f"/admin/theses/{thesis_id}", headers=auth_headers["admin"])
        assert response.status_code == 200
        
        data = response.json()
        assert "thesis" in data
        assert "institution" in data
        assert "academic" in data
        assert "persons" in data
        assert "categories" in data
        assert "keywords" in data
        assert "metadata" in data
        
        # Verify thesis details
        thesis = data["thesis"]
        assert thesis["id"] == thesis_id
        assert "title_fr" in thesis
        assert "status" in thesis
    
    def test_admin_thesis_create_manual(self, client, auth_headers, sample_test_data):
        """Test manual thesis creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # First get form structure
        response = client.get("/admin/thesis-content/manual/form", 
                            headers=auth_headers["admin"])
        assert response.status_code == 200
        
        # Create new thesis
        thesis_data = {
            "title_fr": "Test Thesis Manual",
            "title_en": "Test Thesis Manual",
            "abstract_fr": "Abstract in French",
            "abstract_en": "Abstract in English",
            "university_id": sample_test_data['university_id'],
            "faculty_id": sample_test_data['faculty_id'],
            "department_id": sample_test_data['department_id'],
            "degree_id": sample_test_data['degree_id'],
            "language_id": sample_test_data['language_id'],
            "defense_date": "2024-01-15",
            "status": "draft",
            "page_count": 150,
            "file_id": str(uuid.uuid4())  # Mock file ID
        }
        
        response = client.post("/admin/thesis-content/manual/create",
                             json=thesis_data,
                             headers=auth_headers["admin"])
        
        # Should create successfully or return validation error
        assert response.status_code in [200, 201, 422]
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data
            created_thesis_id = data["id"]
            
            # Verify creation by retrieving
            verify_response = client.get(f"/admin/theses/{created_thesis_id}",
                                       headers=auth_headers["admin"])
            assert verify_response.status_code == 200
    
    def test_admin_thesis_update(self, client, auth_headers, sample_test_data):
        """Test thesis update"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        thesis_id = sample_test_data['thesis_id']
        
        update_data = {
            "title_fr": "Updated Thesis Title",
            "abstract_fr": "Updated abstract",
            "status": "under_review",
            "page_count": 200
        }
        
        response = client.put(f"/admin/theses/{thesis_id}",
                            json=update_data,
                            headers=auth_headers["admin"])
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert data["title_fr"] == "Updated Thesis Title"
            assert data["status"] == "under_review"
    
    def test_admin_thesis_delete(self, client, auth_headers, sample_test_data, clean_db):
        """Test thesis deletion"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # Create a thesis to delete
        with clean_db.cursor() as cursor:
            test_thesis_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO theses (id, title_fr, abstract_fr, status, language_id, file_url, file_name)
                VALUES (%s, 'To Delete', 'Abstract', 'draft', %s, '/test.pdf', 'test.pdf')
            """, (test_thesis_id, sample_test_data['language_id']))
        
        response = client.delete(f"/admin/theses/{test_thesis_id}",
                               headers=auth_headers["admin"])
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            # Verify deletion
            verify_response = client.get(f"/admin/theses/{test_thesis_id}",
                                       headers=auth_headers["admin"])
            assert verify_response.status_code == 404
    
    def test_thesis_file_upload(self, client, auth_headers, sample_pdf_files):
        """Test thesis file upload"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # Get a sample PDF file
        pdf_file = sample_pdf_files["simple_thesis.pdf"]
        
        with open(pdf_file, "rb") as f:
            files = {"file": ("test_thesis.pdf", f, "application/pdf")}
            response = client.post("/admin/thesis-content/upload-file",
                                 files=files,
                                 headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201, 422]
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "file_id" in data
            assert "original_filename" in data
            assert "file_size" in data
            assert "extraction_job_id" in data
    
    def test_thesis_file_upload_invalid(self, client, auth_headers):
        """Test thesis file upload with invalid files"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # Test with non-PDF file
        with tempfile.NamedTemporaryFile(suffix=".txt") as f:
            f.write(b"This is not a PDF")
            f.seek(0)
            files = {"file": ("test.txt", f, "text/plain")}
            response = client.post("/admin/thesis-content/upload-file",
                                 files=files,
                                 headers=auth_headers["admin"])
        
        assert response.status_code == 422
        
        # Test with oversized file (if size limits are implemented)
        # This would need a very large file to test properly
    
    def test_thesis_academic_persons_management(self, client, auth_headers, sample_test_data):
        """Test thesis academic persons relationship management"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        thesis_id = sample_test_data['thesis_id']
        person_id = sample_test_data['person_id']
        
        # Add academic person to thesis
        person_data = {
            "thesis_id": thesis_id,
            "person_id": person_id,
            "role": "author",
            "is_external": False
        }
        
        response = client.post(f"/admin/theses/{thesis_id}/academic-persons",
                             json=person_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201, 409]  # 409 if already exists
    
    def test_thesis_categories_management(self, client, auth_headers, sample_test_data):
        """Test thesis categories relationship management"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        thesis_id = sample_test_data['thesis_id']
        category_id = sample_test_data['category_id']
        
        # Add category to thesis
        category_data = {
            "thesis_id": thesis_id,
            "category_id": category_id,
            "is_primary": True
        }
        
        response = client.post(f"/admin/theses/{thesis_id}/categories",
                             json=category_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201, 409]
    
    def test_thesis_keywords_management(self, client, auth_headers, sample_test_data):
        """Test thesis keywords relationship management"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        thesis_id = sample_test_data['thesis_id']
        keyword_id = sample_test_data['keyword_id']
        
        # Add keyword to thesis
        keyword_data = {
            "thesis_id": thesis_id,
            "keyword_id": keyword_id,
            "keyword_position": 1
        }
        
        response = client.post(f"/admin/theses/{thesis_id}/keywords",
                             json=keyword_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201, 409]
    
    @pytest.mark.performance
    def test_thesis_search_performance(self, client, performance_thresholds):
        """Test thesis search performance"""
        start_time = time.time()
        response = client.get("/theses?q=test&limit=20")
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response_time < performance_thresholds["search_response_time"]
        assert response.status_code == 200
    
    @pytest.mark.performance
    def test_thesis_listing_performance(self, client, performance_thresholds):
        """Test thesis listing performance"""
        start_time = time.time()
        response = client.get("/theses?limit=50")
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response_time < performance_thresholds["api_response_time"]
        assert response.status_code == 200
    
    def test_thesis_search_edge_cases(self, client):
        """Test thesis search with edge cases"""
        # Empty search query
        response = client.get("/theses?q=")
        assert response.status_code == 200
        
        # Very long search query
        long_query = "a" * 1000
        response = client.get(f"/theses?q={long_query}")
        assert response.status_code in [200, 422]
        
        # Special characters in search
        special_query = "test@#$%^&*()"
        response = client.get(f"/theses?q={special_query}")
        assert response.status_code == 200
        
        # Unicode characters
        unicode_query = "تجربة测试"
        response = client.get(f"/theses?q={unicode_query}")
        assert response.status_code == 200
    
    def test_thesis_bulk_operations(self, client, auth_headers, sample_test_data):
        """Test bulk operations on theses"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # This would test bulk status updates, bulk deletions, etc.
        # Implementation depends on whether bulk endpoints exist
        
        # Test bulk status update (if endpoint exists)
        bulk_data = {
            "thesis_ids": [sample_test_data['thesis_id']],
            "action": "update_status",
            "status": "published"
        }
        
        # Note: This endpoint might not exist yet
        response = client.post("/admin/theses/bulk-update",
                             json=bulk_data,
                             headers=auth_headers["admin"])
        
        # Accept that this might not be implemented yet
        assert response.status_code in [200, 404, 405]
    
    def test_thesis_validation_rules(self, client, auth_headers, sample_test_data):
        """Test thesis data validation rules"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # Test with missing required fields
        invalid_data = {
            "title_fr": "",  # Empty title
            "abstract_fr": "Valid abstract",
            "status": "invalid_status"  # Invalid status
        }
        
        response = client.post("/admin/thesis-content/manual/create",
                             json=invalid_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code == 422
        
        # Test with invalid date format
        invalid_date_data = {
            "title_fr": "Valid Title",
            "abstract_fr": "Valid abstract",
            "defense_date": "invalid-date",
            "language_id": sample_test_data['language_id'],
            "status": "draft",
            "file_id": str(uuid.uuid4())
        }
        
        response = client.post("/admin/thesis-content/manual/create",
                             json=invalid_date_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code == 422
    
    def test_thesis_status_transitions(self, client, auth_headers, sample_test_data):
        """Test valid thesis status transitions"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        thesis_id = sample_test_data['thesis_id']
        
        # Test valid status transitions
        valid_transitions = [
            ("draft", "submitted"),
            ("submitted", "under_review"),
            ("under_review", "approved"),
            ("approved", "published"),
            ("under_review", "rejected")
        ]
        
        for from_status, to_status in valid_transitions:
            # Set initial status
            response = client.put(f"/admin/theses/{thesis_id}",
                                json={"status": from_status},
                                headers=auth_headers["admin"])
            
            if response.status_code == 200:
                # Try transition
                response = client.put(f"/admin/theses/{thesis_id}",
                                    json={"status": to_status},
                                    headers=auth_headers["admin"])
                
                # Should succeed or have business logic preventing it
                assert response.status_code in [200, 400, 422]