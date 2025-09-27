#!/usr/bin/env python3
"""
Simple mock server for testing the Academic Persons UI
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import uuid
from datetime import datetime
import urllib.parse

# Mock data
academic_persons = [
    {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "complete_name_fr": "Dr. Ahmed Ben Mohammed",
        "complete_name_ar": "د. أحمد بن محمد",
        "first_name_fr": "Ahmed",
        "last_name_fr": "Ben Mohammed",
        "first_name_ar": "أحمد",
        "last_name_ar": "بن محمد",
        "title": "Dr",
        "university_id": "550e8400-e29b-41d4-a716-446655440010",
        "faculty_id": "550e8400-e29b-41d4-a716-446655440011",
        "school_id": None,
        "external_institution_name": None,
        "external_institution_country": None,
        "external_institution_type": None,
        "user_id": None,
        "created_at": "2024-01-15T10:30:00",
        "updated_at": "2024-01-15T10:30:00"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "complete_name_fr": "Prof. Fatima El Alaoui",
        "complete_name_ar": "أ. فاطمة العلوي",
        "first_name_fr": "Fatima",
        "last_name_fr": "El Alaoui",
        "first_name_ar": "فاطمة",
        "last_name_ar": "العلوي",
        "title": "Prof",
        "university_id": "550e8400-e29b-41d4-a716-446655440010",
        "faculty_id": "550e8400-e29b-41d4-a716-446655440012",
        "school_id": None,
        "external_institution_name": None,
        "external_institution_country": None,
        "external_institution_type": None,
        "user_id": None,
        "created_at": "2024-01-10T09:15:00",
        "updated_at": "2024-01-10T09:15:00"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "complete_name_fr": "Dr. Jean Dupont",
        "complete_name_ar": None,
        "first_name_fr": "Jean",
        "last_name_fr": "Dupont",
        "first_name_ar": None,
        "last_name_ar": None,
        "title": "Dr",
        "university_id": None,
        "faculty_id": None,
        "school_id": None,
        "external_institution_name": "Université de Paris",
        "external_institution_country": "France",
        "external_institution_type": "Université",
        "user_id": None,
        "created_at": "2024-02-01T14:20:00",
        "updated_at": "2024-02-01T14:20:00"
    }
]

class MockAPIHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    def _send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        query_params = urllib.parse.parse_qs(parsed_path.query)
        
        # Normalize path to handle /api prefix
        normalized_path = path.replace('/api', '') if path.startswith('/api') else path
        
        print(f"GET {path} -> {normalized_path}")
        
        if normalized_path == '/admin/academic-persons':
            # Return paginated list of academic persons
            response = {
                "success": True,
                "data": academic_persons,
                "meta": {
                    "total": len(academic_persons),
                    "page": 1,
                    "limit": int(query_params.get('limit', ['20'])[0]),
                    "pages": 1
                },
                "timestamp": datetime.now().isoformat()
            }
            self._send_json_response(response)
        elif normalized_path.startswith('/admin/academic-persons/'):
            # Get single academic person
            person_id = normalized_path.split('/')[-1]
            person = next((p for p in academic_persons if p['id'] == person_id), None)
            if person:
                self._send_json_response({
                    "success": True,
                    **person,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                self._send_json_response({
                    "success": False,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Academic person not found"
                    },
                    "timestamp": datetime.now().isoformat()
                }, 404)
        elif normalized_path == '/admin/universities':
            # Mock universities
            self._send_json_response({
                "success": True,
                "data": [
                    {"id": "550e8400-e29b-41d4-a716-446655440010", "name_fr": "Université Mohammed V", "name_ar": "جامعة محمد الخامس"},
                    {"id": "550e8400-e29b-41d4-a716-446655440020", "name_fr": "Université Hassan II", "name_ar": "جامعة الحسن الثاني"}
                ],
                "meta": {"total": 2, "page": 1, "limit": 20, "pages": 1},
                "timestamp": datetime.now().isoformat()
            })
        elif normalized_path == '/admin/faculties':
            # Mock faculties
            self._send_json_response({
                "success": True,
                "data": [
                    {"id": "550e8400-e29b-41d4-a716-446655440011", "name_fr": "Faculté des Sciences", "name_ar": "كلية العلوم"},
                    {"id": "550e8400-e29b-41d4-a716-446655440012", "name_fr": "Faculté de Médecine", "name_ar": "كلية الطب"}
                ],
                "meta": {"total": 2, "page": 1, "limit": 20, "pages": 1},
                "timestamp": datetime.now().isoformat()
            })
        elif normalized_path == '/admin/schools':
            # Mock schools
            self._send_json_response({
                "success": True,
                "data": [
                    {"id": "550e8400-e29b-41d4-a716-446655440013", "name_fr": "École Nationale Supérieure d'Informatique", "name_ar": "المدرسة الوطنية العليا للمعلوميات"},
                    {"id": "550e8400-e29b-41d4-a716-446655440014", "name_fr": "École Mohammadia d'Ingénieurs", "name_ar": "المدرسة المحمدية للمهندسين"}
                ],
                "meta": {"total": 2, "page": 1, "limit": 20, "pages": 1},
                "timestamp": datetime.now().isoformat()
            })
        elif normalized_path == '/auth/login':
            # Mock login
            self._send_json_response({
                "success": True,
                "access_token": "mock_access_token_12345",
                "refresh_token": "mock_refresh_token_12345",
                "token_type": "bearer",
                "expires_in": 86400,
                "user": {
                    "id": "550e8400-e29b-41d4-a716-446655440100",
                    "email": "admin@test.com",
                    "first_name": "Admin",
                    "last_name": "User",
                    "role": "admin",
                    "is_active": True,
                    "created_at": "2024-01-01T00:00:00",
                    "updated_at": "2024-01-01T00:00:00"
                },
                "timestamp": datetime.now().isoformat()
            })
        elif normalized_path == '/auth/profile':
            # Mock profile
            self._send_json_response({
                "success": True,
                "id": "550e8400-e29b-41d4-a716-446655440100",
                "email": "admin@test.com",
                "first_name": "Admin",
                "last_name": "User",
                "role": "admin",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
                "timestamp": datetime.now().isoformat()
            })
        elif normalized_path == '/auth/refresh':
            # Mock token refresh
            self._send_json_response({
                "success": True,
                "access_token": "mock_access_token_refreshed_12345",
                "refresh_token": "mock_refresh_token_refreshed_12345",
                "token_type": "bearer",
                "expires_in": 86400,
                "timestamp": datetime.now().isoformat()
            })
        else:
            self._send_json_response({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Endpoint not found"
                },
                "timestamp": datetime.now().isoformat()
            }, 404)
    
    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Normalize path to handle /api prefix
        normalized_path = path.replace('/api', '') if path.startswith('/api') else path
        
        print(f"POST {path} -> {normalized_path}")
        
        if normalized_path == '/admin/academic-persons':
            # Create new academic person
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            new_person = {
                "id": str(uuid.uuid4()),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                **data
            }
            
            academic_persons.append(new_person)
            
            self._send_json_response({
                "success": True,
                **new_person,
                "timestamp": datetime.now().isoformat()
            }, 201)
        elif normalized_path == '/auth/login':
            # Mock login
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            self._send_json_response({
                "success": True,
                "access_token": "mock_access_token_12345",
                "refresh_token": "mock_refresh_token_12345",
                "token_type": "bearer",
                "expires_in": 86400,
                "user": {
                    "id": "550e8400-e29b-41d4-a716-446655440100",
                    "email": "admin@test.com",
                    "first_name": "Admin",
                    "last_name": "User",
                    "role": "admin",
                    "is_active": True,
                    "created_at": "2024-01-01T00:00:00",
                    "updated_at": "2024-01-01T00:00:00"
                },
                "timestamp": datetime.now().isoformat()
            })
        elif normalized_path == '/auth/refresh':
            # Mock token refresh
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            self._send_json_response({
                "success": True,
                "access_token": "mock_access_token_refreshed_12345",
                "refresh_token": "mock_refresh_token_refreshed_12345",
                "token_type": "bearer",
                "expires_in": 86400,
                "timestamp": datetime.now().isoformat()
            })
        else:
            self._send_json_response({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Endpoint not found"
                },
                "timestamp": datetime.now().isoformat()
            }, 404)
    
    def do_PUT(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Normalize path to handle /api prefix
        normalized_path = path.replace('/api', '') if path.startswith('/api') else path
        
        print(f"PUT {path} -> {normalized_path}")
        
        if normalized_path.startswith('/admin/academic-persons/'):
            # Update academic person
            person_id = normalized_path.split('/')[-1]
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            person_index = next((i for i, p in enumerate(academic_persons) if p['id'] == person_id), None)
            if person_index is not None:
                academic_persons[person_index].update(data)
                academic_persons[person_index]['updated_at'] = datetime.now().isoformat()
                
                self._send_json_response({
                    "success": True,
                    **academic_persons[person_index],
                    "timestamp": datetime.now().isoformat()
                })
            else:
                self._send_json_response({
                    "success": False,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Academic person not found"
                    },
                    "timestamp": datetime.now().isoformat()
                }, 404)
        else:
            self._send_json_response({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Endpoint not found"
                },
                "timestamp": datetime.now().isoformat()
            }, 404)
    
    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Normalize path to handle /api prefix
        normalized_path = path.replace('/api', '') if path.startswith('/api') else path
        
        print(f"DELETE {path} -> {normalized_path}")
        
        if normalized_path.startswith('/admin/academic-persons/'):
            # Delete academic person
            person_id = normalized_path.split('/')[-1]
            person_index = next((i for i, p in enumerate(academic_persons) if p['id'] == person_id), None)
            if person_index is not None:
                del academic_persons[person_index]
                
                self._send_json_response({
                    "success": True,
                    "message": "Academic person deleted successfully",
                    "timestamp": datetime.now().isoformat()
                })
            else:
                self._send_json_response({
                    "success": False,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Academic person not found"
                    },
                    "timestamp": datetime.now().isoformat()
                }, 404)
        else:
            self._send_json_response({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Endpoint not found"
                },
                "timestamp": datetime.now().isoformat()
            }, 404)

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, MockAPIHandler)
    print(f"Mock API server running on http://localhost:{port}")
    print("Available endpoints:")
    print("  GET /admin/academic-persons")
    print("  POST /admin/academic-persons")
    print("  GET /admin/academic-persons/{id}")
    print("  PUT /admin/academic-persons/{id}")
    print("  DELETE /admin/academic-persons/{id}")
    print("  GET /admin/universities")
    print("  GET /admin/faculties")
    print("  GET /admin/schools")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()