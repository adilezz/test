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
academic_persons = []

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
        
        print(f"GET {path}")
        
        if path == '/admin/academic-persons':
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
        elif path.startswith('/admin/academic-persons/'):
            # Get single academic person
            person_id = path.split('/')[-1]
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
        elif path == '/admin/universities':
            # Mock universities
            self._send_json_response({
                "success": True,
                "data": [
                    {"id": str(uuid.uuid4()), "name_fr": "Université Mohammed V", "name_ar": "جامعة محمد الخامس"},
                    {"id": str(uuid.uuid4()), "name_fr": "Université Hassan II", "name_ar": "جامعة الحسن الثاني"}
                ],
                "meta": {"total": 2, "page": 1, "limit": 20, "pages": 1},
                "timestamp": datetime.now().isoformat()
            })
        elif path == '/admin/faculties':
            # Mock faculties
            self._send_json_response({
                "success": True,
                "data": [
                    {"id": str(uuid.uuid4()), "name_fr": "Faculté des Sciences", "name_ar": "كلية العلوم"},
                    {"id": str(uuid.uuid4()), "name_fr": "Faculté de Médecine", "name_ar": "كلية الطب"}
                ],
                "meta": {"total": 2, "page": 1, "limit": 20, "pages": 1},
                "timestamp": datetime.now().isoformat()
            })
        elif path == '/admin/schools':
            # Mock schools
            self._send_json_response({
                "success": True,
                "data": [
                    {"id": str(uuid.uuid4()), "name_fr": "École Nationale Supérieure d'Informatique", "name_ar": "المدرسة الوطنية العليا للمعلوميات"},
                    {"id": str(uuid.uuid4()), "name_fr": "École Mohammadia d'Ingénieurs", "name_ar": "المدرسة المحمدية للمهندسين"}
                ],
                "meta": {"total": 2, "page": 1, "limit": 20, "pages": 1},
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
        
        print(f"POST {path}")
        
        if path == '/admin/academic-persons':
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
        
        print(f"PUT {path}")
        
        if path.startswith('/admin/academic-persons/'):
            # Update academic person
            person_id = path.split('/')[-1]
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
        
        print(f"DELETE {path}")
        
        if path.startswith('/admin/academic-persons/'):
            # Delete academic person
            person_id = path.split('/')[-1]
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