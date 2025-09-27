#!/usr/bin/env python3
"""
Test script to verify ThesisCreate validation works correctly (no database needed)
"""

import os
import sys

# Set environment variables
os.environ['DATABASE_HOST'] = 'localhost'
os.environ['DATABASE_PORT'] = '5432'
os.environ['DATABASE_NAME'] = 'thesis'
os.environ['DATABASE_USER'] = 'postgres'
os.environ['DATABASE_PASSWORD'] = 'postgres'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key'
os.environ['UPLOAD_DIRECTORY'] = '/tmp/uploads'
os.environ['SKIP_DB_INIT'] = 'true'

def test_thesis_validation():
    """Test ThesisCreate model validation"""
    print("Testing ThesisCreate model validation...")
    
    try:
        from main import ThesisCreate, ThesisStatus
        print("✓ Successfully imported ThesisCreate model")
    except Exception as e:
        print(f"✗ Failed to import: {e}")
        return False
    
    # Test 1: Empty string for required UUID field (should fail)
    print("\nTest 1: Empty string for required language_id (should fail)")
    try:
        thesis_bad = ThesisCreate(
            title_fr="Test Title",
            abstract_fr="Test Abstract",
            defense_date="2023-01-01",
            language_id="",  # Empty string - should fail
            status=ThesisStatus.DRAFT,
            file_id="test-file-id"
        )
        print("✗ FAILED: Should have raised validation error")
        return False
    except Exception as e:
        print(f"✓ PASSED: Expected validation error: {type(e).__name__}")
    
    # Test 2: Valid UUID for required field (should pass)
    print("\nTest 2: Valid UUID for required language_id (should pass)")
    try:
        thesis_good = ThesisCreate(
            title_fr="Test Title",
            abstract_fr="Test Abstract",
            defense_date="2023-01-01",
            language_id="550e8400-e29b-41d4-a716-446655440000",
            status=ThesisStatus.DRAFT,
            file_id="test-file-id"
        )
        print("✓ PASSED: Valid thesis created")
    except Exception as e:
        print(f"✗ FAILED: Unexpected error: {e}")
        return False
    
    # Test 3: None for optional UUID field (should pass)
    print("\nTest 3: None for optional university_id (should pass)")
    try:
        thesis_good2 = ThesisCreate(
            title_fr="Test Title 2",
            abstract_fr="Test Abstract 2",
            defense_date="2023-01-01",
            language_id="550e8400-e29b-41d4-a716-446655440000",
            university_id=None,  # None should be OK
            status=ThesisStatus.DRAFT,
            file_id="test-file-id-2"
        )
        print("✓ PASSED: Thesis with None university_id created")
    except Exception as e:
        print(f"✗ FAILED: Unexpected error: {e}")
        return False
    
    # Test 4: Empty string for optional UUID field (should fail)
    print("\nTest 4: Empty string for optional university_id (should fail)")
    try:
        thesis_bad2 = ThesisCreate(
            title_fr="Test Title 3",
            abstract_fr="Test Abstract 3",
            defense_date="2023-01-01",
            language_id="550e8400-e29b-41d4-a716-446655440000",
            university_id="",  # Empty string should fail even for optional fields
            status=ThesisStatus.DRAFT,
            file_id="test-file-id-3"
        )
        print("✗ FAILED: Should have raised validation error for empty string")
        return False
    except Exception as e:
        print(f"✓ PASSED: Expected validation error: {type(e).__name__}")
    
    return True

def test_json_serialization():
    """Test JSON serialization with None values"""
    print("\nTesting JSON serialization with None values...")
    
    try:
        from main import ThesisCreate, ThesisStatus
        import json
        
        # Create thesis with None values
        thesis = ThesisCreate(
            title_fr="Test Title",
            abstract_fr="Test Abstract",
            defense_date="2023-01-01",
            language_id="550e8400-e29b-41d4-a716-446655440000",
            university_id=None,
            faculty_id=None,
            department_id=None,
            degree_id=None,
            status=ThesisStatus.DRAFT,
            file_id="test-file-id"
        )
        
        # Convert to dict (similar to what FastAPI does)
        thesis_dict = thesis.model_dump()
        print(f"✓ Model dump successful: {thesis_dict}")
        
        # Serialize to JSON
        json_str = json.dumps(thesis_dict, default=str)
        print(f"✓ JSON serialization successful")
        
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

def main():
    """Run all tests"""
    print("="*60)
    print("THESIS VALIDATION TESTS")
    print("="*60)
    
    validation_passed = test_thesis_validation()
    serialization_passed = test_json_serialization()
    
    print("\n" + "="*60)
    print("FINAL RESULTS:")
    print(f"Validation tests: {'PASSED' if validation_passed else 'FAILED'}")
    print(f"Serialization tests: {'PASSED' if serialization_passed else 'FAILED'}")
    
    if validation_passed and serialization_passed:
        print("\n✓ ALL TESTS PASSED!")
        print("The validation logic is working correctly.")
        print("Empty strings for UUID fields will be rejected.")
        print("None values for optional UUID fields will be accepted.")
        return True
    else:
        print("\n✗ SOME TESTS FAILED!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)