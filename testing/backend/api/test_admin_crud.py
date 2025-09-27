"""
Admin CRUD API Tests
Tests all admin CRUD endpoints for reference data management
"""

import pytest
import time
import uuid
from datetime import datetime

class TestUniversitiesAPI:
    """Test universities CRUD endpoints"""
    
    def test_get_universities(self, client, auth_headers, sample_test_data):
        """Test universities listing"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/universities", headers=auth_headers["admin"])
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "meta" in data
        assert isinstance(data["data"], list)
    
    def test_create_university(self, client, auth_headers, sample_test_data):
        """Test university creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        university_data = {
            "name_fr": "Nouvelle Université",
            "name_en": "New University", 
            "acronym": "NU",
            "geographic_entities_id": sample_test_data['region_id']
        }
        
        response = client.post("/admin/universities",
                             json=university_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201]
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert data["name_fr"] == "Nouvelle Université"
            assert data["acronym"] == "NU"
            return data["id"]
    
    def test_get_university_detail(self, client, auth_headers, sample_test_data):
        """Test university detail retrieval"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        university_id = sample_test_data['university_id']
        response = client.get(f"/admin/universities/{university_id}",
                            headers=auth_headers["admin"])
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == university_id
    
    def test_update_university(self, client, auth_headers, sample_test_data):
        """Test university update"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        university_id = sample_test_data['university_id']
        update_data = {
            "name_fr": "Université Mise à Jour",
            "acronym": "UMJ"
        }
        
        response = client.put(f"/admin/universities/{university_id}",
                            json=update_data,
                            headers=auth_headers["admin"])
        
        assert response.status_code == 200
        data = response.json()
        assert data["name_fr"] == "Université Mise à Jour"
    
    def test_delete_university(self, client, auth_headers, sample_test_data, clean_db):
        """Test university deletion"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # Create a university to delete
        with clean_db.cursor() as cursor:
            test_university_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO universities (id, name_fr, name_en)
                VALUES (%s, 'To Delete University', 'To Delete University')
            """, (test_university_id,))
        
        response = client.delete(f"/admin/universities/{test_university_id}",
                               headers=auth_headers["admin"])
        
        assert response.status_code == 200
        
        # Verify deletion
        verify_response = client.get(f"/admin/universities/{test_university_id}",
                                   headers=auth_headers["admin"])
        assert verify_response.status_code == 404
    
    def test_university_tree_structure(self, client, auth_headers):
        """Test university tree structure endpoint"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/universities/tree", headers=auth_headers["admin"])
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_university_faculties(self, client, auth_headers, sample_test_data):
        """Test university faculties endpoint"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        university_id = sample_test_data['university_id']
        response = client.get(f"/admin/universities/{university_id}/faculties",
                            headers=auth_headers["admin"])
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

class TestFacultiesAPI:
    """Test faculties CRUD endpoints"""
    
    def test_get_faculties(self, client, auth_headers):
        """Test faculties listing"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/faculties", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_create_faculty(self, client, auth_headers, sample_test_data):
        """Test faculty creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        faculty_data = {
            "university_id": sample_test_data['university_id'],
            "name_fr": "Nouvelle Faculté",
            "name_en": "New Faculty",
            "acronym": "NF"
        }
        
        response = client.post("/admin/faculties",
                             json=faculty_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201]
    
    def test_faculty_departments(self, client, auth_headers, sample_test_data):
        """Test faculty departments endpoint"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        faculty_id = sample_test_data['faculty_id']
        response = client.get(f"/admin/faculties/{faculty_id}/departments",
                            headers=auth_headers["admin"])
        
        assert response.status_code == 200

class TestSchoolsAPI:
    """Test schools CRUD endpoints"""
    
    def test_get_schools(self, client, auth_headers):
        """Test schools listing"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/schools", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_create_school(self, client, auth_headers, sample_test_data):
        """Test school creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        school_data = {
            "parent_university_id": sample_test_data['university_id'],
            "name_fr": "Nouvelle École",
            "name_en": "New School",
            "acronym": "NE"
        }
        
        response = client.post("/admin/schools",
                             json=school_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201]
    
    def test_schools_tree_structure(self, client, auth_headers):
        """Test schools tree structure"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/schools/tree", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_school_children(self, client, auth_headers, sample_test_data):
        """Test school children endpoint"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        school_id = sample_test_data['school_id']
        response = client.get(f"/admin/schools/{school_id}/children",
                            headers=auth_headers["admin"])
        
        assert response.status_code == 200

class TestDepartmentsAPI:
    """Test departments CRUD endpoints"""
    
    def test_get_departments(self, client, auth_headers):
        """Test departments listing"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/departments", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_create_department(self, client, auth_headers, sample_test_data):
        """Test department creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        department_data = {
            "faculty_id": sample_test_data['faculty_id'],
            "name_fr": "Nouveau Département",
            "name_en": "New Department",
            "acronym": "ND"
        }
        
        response = client.post("/admin/departments",
                             json=department_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201]

class TestCategoriesAPI:
    """Test categories CRUD endpoints"""
    
    def test_get_categories(self, client, auth_headers):
        """Test categories listing"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/categories", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_create_category(self, client, auth_headers):
        """Test category creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        category_data = {
            "code": "TEST",
            "name_fr": "Catégorie Test",
            "name_en": "Test Category",
            "level": 1,
            "description": "Test category description"
        }
        
        response = client.post("/admin/categories",
                             json=category_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201]
    
    def test_categories_tree_structure(self, client, auth_headers):
        """Test categories tree structure"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/categories/tree", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_category_subcategories(self, client, auth_headers, sample_test_data):
        """Test category subcategories endpoint"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        category_id = sample_test_data['category_id']
        response = client.get(f"/admin/categories/{category_id}/subcategories",
                            headers=auth_headers["admin"])
        
        assert response.status_code == 200

class TestKeywordsAPI:
    """Test keywords CRUD endpoints"""
    
    def test_get_keywords(self, client, auth_headers):
        """Test keywords listing"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/keywords", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_create_keyword(self, client, auth_headers, sample_test_data):
        """Test keyword creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        keyword_data = {
            "keyword_fr": "Mot-clé Test",
            "keyword_en": "Test Keyword",
            "category_id": sample_test_data['category_id']
        }
        
        response = client.post("/admin/keywords",
                             json=keyword_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201]

class TestAcademicPersonsAPI:
    """Test academic persons CRUD endpoints"""
    
    def test_get_academic_persons(self, client, auth_headers):
        """Test academic persons listing"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/academic-persons", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_create_academic_person(self, client, auth_headers, sample_test_data):
        """Test academic person creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        person_data = {
            "complete_name_fr": "Dr. Test Person",
            "first_name_fr": "Test",
            "last_name_fr": "Person",
            "title": "Dr.",
            "university_id": sample_test_data['university_id']
        }
        
        response = client.post("/admin/academic-persons",
                             json=person_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201]
    
    def test_search_academic_persons(self, client, auth_headers):
        """Test academic persons search"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/academic-persons/search?q=test",
                            headers=auth_headers["admin"])
        
        assert response.status_code == 200
    
    def test_merge_academic_persons(self, client, auth_headers, sample_test_data, clean_db):
        """Test academic persons merge functionality"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # Create two persons to merge
        with clean_db.cursor() as cursor:
            person1_id = str(uuid.uuid4())
            person2_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO academic_persons (id, complete_name_fr, first_name_fr, last_name_fr)
                VALUES (%s, 'Person One', 'Person', 'One')
            """, (person1_id,))
            
            cursor.execute("""
                INSERT INTO academic_persons (id, complete_name_fr, first_name_fr, last_name_fr)
                VALUES (%s, 'Person Two', 'Person', 'Two')
            """, (person2_id,))
        
        response = client.post(f"/admin/academic-persons/{person1_id}/merge/{person2_id}",
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 409, 422]

class TestDegreesAPI:
    """Test degrees CRUD endpoints"""
    
    def test_get_degrees(self, client, auth_headers):
        """Test degrees listing"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/degrees", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_create_degree(self, client, auth_headers):
        """Test degree creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        degree_data = {
            "name_fr": "Master Test",
            "name_en": "Test Master",
            "name_ar": "ماجستير اختبار",
            "abbreviation": "MT",
            "type": "master",
            "category": "research"
        }
        
        response = client.post("/admin/degrees",
                             json=degree_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201]

class TestLanguagesAPI:
    """Test languages CRUD endpoints"""
    
    def test_get_languages(self, client, auth_headers):
        """Test languages listing"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/languages", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_create_language(self, client, auth_headers):
        """Test language creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        language_data = {
            "name": "Test Language",
            "code": "tl",
            "native_name": "Test Native",
            "rtl": False,
            "is_active": True,
            "display_order": 99
        }
        
        response = client.post("/admin/languages",
                             json=language_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201]

class TestGeographicEntitiesAPI:
    """Test geographic entities CRUD endpoints"""
    
    def test_get_geographic_entities(self, client, auth_headers):
        """Test geographic entities listing"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/geographic-entities", headers=auth_headers["admin"])
        assert response.status_code == 200
    
    def test_create_geographic_entity(self, client, auth_headers, sample_test_data):
        """Test geographic entity creation"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        entity_data = {
            "name_fr": "Nouvelle Ville",
            "name_en": "New City",
            "parent_id": sample_test_data['region_id'],
            "level": "city",
            "code": "NC"
        }
        
        response = client.post("/admin/geographic-entities",
                             json=entity_data,
                             headers=auth_headers["admin"])
        
        assert response.status_code in [200, 201]
    
    def test_geographic_entities_tree(self, client, auth_headers):
        """Test geographic entities tree structure"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/geographic-entities/tree", headers=auth_headers["admin"])
        assert response.status_code == 200

class TestAdminValidation:
    """Test validation rules for admin endpoints"""
    
    def test_duplicate_codes_prevention(self, client, auth_headers):
        """Test prevention of duplicate codes"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # Try to create category with existing code
        category_data = {
            "code": "CS",  # This should already exist from sample data
            "name_fr": "Duplicate Code",
            "level": 1
        }
        
        response = client.post("/admin/categories",
                             json=category_data,
                             headers=auth_headers["admin"])
        
        # Should prevent duplicate or handle gracefully
        assert response.status_code in [409, 422]
    
    def test_invalid_uuid_handling(self, client, auth_headers):
        """Test handling of invalid UUIDs"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        response = client.get("/admin/universities/invalid-uuid",
                            headers=auth_headers["admin"])
        
        assert response.status_code == 422
    
    def test_nonexistent_resource_handling(self, client, auth_headers):
        """Test handling of nonexistent resources"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        fake_uuid = str(uuid.uuid4())
        response = client.get(f"/admin/universities/{fake_uuid}",
                            headers=auth_headers["admin"])
        
        assert response.status_code == 404
    
    @pytest.mark.performance
    def test_admin_endpoints_performance(self, client, auth_headers, performance_thresholds):
        """Test performance of admin endpoints"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        endpoints = [
            "/admin/universities",
            "/admin/faculties", 
            "/admin/schools",
            "/admin/departments",
            "/admin/categories",
            "/admin/keywords",
            "/admin/academic-persons",
            "/admin/degrees",
            "/admin/languages"
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            response = client.get(endpoint, headers=auth_headers["admin"])
            end_time = time.time()
            
            response_time = end_time - start_time
            assert response_time < performance_thresholds["api_response_time"]
            assert response.status_code == 200