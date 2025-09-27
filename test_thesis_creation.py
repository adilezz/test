#!/usr/bin/env python3
"""
Test script to verify thesis creation API endpoint works correctly
"""

import os
import requests
import json

# Set environment variables
os.environ['DATABASE_HOST'] = 'localhost'
os.environ['DATABASE_PORT'] = '5432'
os.environ['DATABASE_NAME'] = 'thesis'
os.environ['DATABASE_USER'] = 'postgres'
os.environ['DATABASE_PASSWORD'] = 'postgres'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key'
os.environ['UPLOAD_DIRECTORY'] = '/tmp/uploads'
os.environ['SKIP_DB_INIT'] = 'true'

API_BASE_URL = "http://localhost:8000"

def test_login():
    """Test admin login"""
    print("Testing admin login...")
    login_data = {
        "email": "admin@theses.ma",
        "password": "admin123"
    }
    
    response = requests.post(f"{API_BASE_URL}/auth/login", json=login_data)
    print(f"Login response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("Login successful!")
        return data["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def test_thesis_creation_with_empty_strings(token):
    """Test thesis creation with empty strings (should fail)"""
    print("\nTesting thesis creation with empty strings (should fail)...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # This is what the UI was sending before the fix
    thesis_data = {
        "title_fr": "Test Thesis Title",
        "abstract_fr": "Test thesis abstract",
        "defense_date": "2023-01-01",
        "language_id": "",  # Empty string - should fail
        "university_id": "",  # Empty string - should be OK since optional
        "faculty_id": "",
        "department_id": "",
        "degree_id": "",
        "status": "draft",
        "file_id": "test-file-id"
    }
    
    response = requests.post(f"{API_BASE_URL}/admin/thesis-content/manual/create", 
                           json=thesis_data, headers=headers)
    print(f"Response status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 422:
        print("✓ Expected 422 validation error received")
        return True
    else:
        print("✗ Expected validation error but got different response")
        return False

def test_thesis_creation_with_proper_data(token):
    """Test thesis creation with proper data (should work if file exists)"""
    print("\nTesting thesis creation with proper data...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # This is what the UI should send after the fix
    thesis_data = {
        "title_fr": "Test Thesis Title",
        "abstract_fr": "Test thesis abstract",
        "defense_date": "2023-01-01",
        "language_id": "550e8400-e29b-41d4-a716-446655440000",  # Valid UUID
        "university_id": None,  # None instead of empty string
        "faculty_id": None,
        "department_id": None,
        "degree_id": "550e8400-e29b-41d4-a716-446655440001",  # Valid UUID
        "status": "draft",
        "file_id": "test-file-id"
    }
    
    response = requests.post(f"{API_BASE_URL}/admin/thesis-content/manual/create", 
                           json=thesis_data, headers=headers)
    print(f"Response status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 400 and "File not found" in response.text:
        print("✓ Expected file not found error (validation passed, but file doesn't exist)")
        return True
    elif response.status_code == 201:
        print("✓ Thesis created successfully!")
        return True
    else:
        print("✗ Unexpected response")
        return False

def main():
    """Run the tests"""
    print("Testing thesis creation API fixes...")
    
    # Test login
    token = test_login()
    if not token:
        print("Cannot continue without valid token")
        return
    
    # Test with empty strings (old UI behavior)
    test1_passed = test_thesis_creation_with_empty_strings(token)
    
    # Test with proper data (new UI behavior)
    test2_passed = test_thesis_creation_with_proper_data(token)
    
    print("\n" + "="*50)
    print("TEST RESULTS:")
    print(f"Empty strings validation test: {'PASSED' if test1_passed else 'FAILED'}")
    print(f"Proper data test: {'PASSED' if test2_passed else 'FAILED'}")
    
    if test1_passed and test2_passed:
        print("✓ All tests passed! The fix is working correctly.")
    else:
        print("✗ Some tests failed. Please check the implementation.")

if __name__ == "__main__":
    main()