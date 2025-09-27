"""
Performance Benchmark Tests
Tests API response times and database query performance
"""

import pytest
import time
import asyncio
import concurrent.futures
import statistics
from typing import List, Dict, Any
import psutil
import os

@pytest.mark.performance
class TestAPIPerformance:
    """Test API endpoint performance"""
    
    def test_search_endpoint_performance(self, client, sample_test_data, performance_thresholds):
        """Test thesis search endpoint performance"""
        search_queries = [
            "intelligence",
            "machine learning",
            "informatique",
            "médecine",
            "économie"
        ]
        
        response_times = []
        
        for query in search_queries:
            start_time = time.time()
            response = client.get(f"/theses?q={query}&limit=20")
            end_time = time.time()
            
            response_time = end_time - start_time
            response_times.append(response_time)
            
            assert response.status_code == 200
            assert response_time < performance_thresholds["search_response_time"]
        
        # Calculate performance statistics
        avg_response_time = statistics.mean(response_times)
        max_response_time = max(response_times)
        min_response_time = min(response_times)
        
        print(f"Search Performance Stats:")
        print(f"Average: {avg_response_time:.3f}s")
        print(f"Max: {max_response_time:.3f}s")
        print(f"Min: {min_response_time:.3f}s")
        
        assert avg_response_time < performance_thresholds["search_response_time"]
    
    def test_admin_endpoints_performance(self, client, auth_headers, performance_thresholds):
        """Test admin endpoints performance"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
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
            "/admin/theses"
        ]
        
        response_times = {}
        
        for endpoint in admin_endpoints:
            start_time = time.time()
            response = client.get(endpoint, headers=auth_headers["admin"])
            end_time = time.time()
            
            response_time = end_time - start_time
            response_times[endpoint] = response_time
            
            assert response.status_code == 200
            assert response_time < performance_thresholds["api_response_time"]
        
        # Print performance report
        print("Admin Endpoints Performance:")
        for endpoint, time_taken in response_times.items():
            print(f"{endpoint}: {time_taken:.3f}s")
    
    def test_concurrent_search_requests(self, client, performance_thresholds):
        """Test concurrent search request handling"""
        def perform_search(query_index):
            query = f"test{query_index}"
            start_time = time.time()
            response = client.get(f"/theses?q={query}")
            end_time = time.time()
            return {
                'status_code': response.status_code,
                'response_time': end_time - start_time,
                'query': query
            }
        
        # Simulate 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(perform_search, i) for i in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Verify all requests succeeded
        for result in results:
            assert result['status_code'] == 200
            assert result['response_time'] < performance_thresholds["search_response_time"] * 2  # Allow 2x time for concurrent
        
        avg_concurrent_time = statistics.mean([r['response_time'] for r in results])
        print(f"Average concurrent response time: {avg_concurrent_time:.3f}s")
    
    def test_pagination_performance(self, client, performance_thresholds):
        """Test pagination performance"""
        page_times = []
        
        # Test first 5 pages
        for page in range(1, 6):
            start_time = time.time()
            response = client.get(f"/theses?page={page}&limit=20")
            end_time = time.time()
            
            response_time = end_time - start_time
            page_times.append(response_time)
            
            assert response.status_code == 200
            assert response_time < performance_thresholds["api_response_time"]
        
        # Ensure pagination performance is consistent
        max_variation = max(page_times) - min(page_times)
        assert max_variation < 0.5  # Max 500ms variation between pages
    
    def test_large_result_set_performance(self, client, performance_thresholds):
        """Test performance with large result sets"""
        # Search with broad query to get many results
        start_time = time.time()
        response = client.get("/theses?q=a&limit=100")  # Broad search with large limit
        end_time = time.time()
        
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < performance_thresholds["search_response_time"] * 3  # Allow 3x time for large sets
        
        data = response.json()
        print(f"Large result set ({len(data.get('data', []))} items) took: {response_time:.3f}s")
    
    def test_filter_combinations_performance(self, client, sample_test_data, performance_thresholds):
        """Test performance with multiple filter combinations"""
        filter_combinations = [
            {"university_id": sample_test_data['university_id']},
            {"category_id": sample_test_data['category_id']},
            {"language_id": sample_test_data['language_id']},
            {"university_id": sample_test_data['university_id'], "category_id": sample_test_data['category_id']},
            {"year_from": 2020, "year_to": 2024},
            {"status": "published", "university_id": sample_test_data['university_id']}
        ]
        
        for filters in filter_combinations:
            query_params = "&".join([f"{k}={v}" for k, v in filters.items()])
            
            start_time = time.time()
            response = client.get(f"/theses?{query_params}")
            end_time = time.time()
            
            response_time = end_time - start_time
            
            assert response.status_code == 200
            assert response_time < performance_thresholds["search_response_time"]
            
            print(f"Filter {filters} took: {response_time:.3f}s")

@pytest.mark.performance  
class TestDatabasePerformance:
    """Test database query performance"""
    
    def test_complex_search_queries(self, clean_db, performance_thresholds):
        """Test complex database search query performance"""
        with clean_db.cursor() as cursor:
            # Test complex join query (similar to what search endpoint does)
            start_time = time.time()
            cursor.execute("""
                SELECT t.id, t.title_fr, t.title_en, t.abstract_fr,
                       u.name_fr as university_name,
                       f.name_fr as faculty_name,
                       d.name_fr as degree_name,
                       l.name as language_name
                FROM theses t
                LEFT JOIN universities u ON t.university_id = u.id
                LEFT JOIN faculties f ON t.faculty_id = f.id
                LEFT JOIN degrees d ON t.degree_id = d.id
                LEFT JOIN languages l ON t.language_id = l.id
                WHERE t.status = 'published'
                ORDER BY t.created_at DESC
                LIMIT 50
            """)
            results = cursor.fetchall()
            end_time = time.time()
            
            query_time = end_time - start_time
            assert query_time < performance_thresholds["api_response_time"]
            
            print(f"Complex search query took: {query_time:.3f}s for {len(results)} results")
    
    def test_full_text_search_performance(self, clean_db, sample_test_data):
        """Test full-text search performance"""
        with clean_db.cursor() as cursor:
            # Test full-text search on thesis content
            start_time = time.time()
            cursor.execute("""
                SELECT t.id, t.title_fr, t.abstract_fr,
                       ts_rank(to_tsvector('french', t.title_fr || ' ' || COALESCE(t.abstract_fr, '')), 
                               plainto_tsquery('french', %s)) as rank
                FROM theses t
                WHERE to_tsvector('french', t.title_fr || ' ' || COALESCE(t.abstract_fr, '')) 
                      @@ plainto_tsquery('french', %s)
                ORDER BY rank DESC
                LIMIT 20
            """, ("intelligence artificielle", "intelligence artificielle"))
            results = cursor.fetchall()
            end_time = time.time()
            
            query_time = end_time - start_time
            assert query_time < 1.0  # Full-text search should be under 1 second
            
            print(f"Full-text search took: {query_time:.3f}s for {len(results)} results")
    
    def test_aggregation_queries_performance(self, clean_db):
        """Test aggregation query performance (for statistics)"""
        with clean_db.cursor() as cursor:
            start_time = time.time()
            
            # Test multiple aggregation queries (like statistics endpoint)
            queries = [
                "SELECT COUNT(*) FROM theses WHERE status = 'published'",
                "SELECT COUNT(*) FROM universities",
                "SELECT COUNT(*) FROM faculties",
                "SELECT u.name_fr, COUNT(t.id) FROM universities u LEFT JOIN theses t ON u.id = t.university_id GROUP BY u.id, u.name_fr ORDER BY COUNT(t.id) DESC LIMIT 10",
                "SELECT c.name_fr, COUNT(tc.thesis_id) FROM categories c LEFT JOIN thesis_categories tc ON c.id = tc.category_id GROUP BY c.id, c.name_fr ORDER BY COUNT(tc.thesis_id) DESC LIMIT 10"
            ]
            
            for query in queries:
                cursor.execute(query)
                cursor.fetchall()
            
            end_time = time.time()
            
            total_time = end_time - start_time
            assert total_time < 2.0  # All aggregation queries should complete in under 2 seconds
            
            print(f"Statistics aggregation queries took: {total_time:.3f}s")
    
    def test_index_effectiveness(self, clean_db):
        """Test database index effectiveness"""
        with clean_db.cursor() as cursor:
            # Test queries that should use indexes
            indexed_queries = [
                ("SELECT * FROM theses WHERE id = %s", [str(sample_test_data['thesis_id'])]),
                ("SELECT * FROM theses WHERE university_id = %s", [str(sample_test_data['university_id'])]),
                ("SELECT * FROM theses WHERE status = %s", ["published"]),
                ("SELECT * FROM universities WHERE id = %s", [str(sample_test_data['university_id'])])
            ]
            
            for query, params in indexed_queries:
                start_time = time.time()
                cursor.execute(query, params)
                cursor.fetchall()
                end_time = time.time()
                
                query_time = end_time - start_time
                assert query_time < 0.1  # Indexed queries should be very fast
                
                print(f"Indexed query took: {query_time:.3f}s")

@pytest.mark.performance
class TestFileUploadPerformance:
    """Test file upload and processing performance"""
    
    def test_pdf_upload_performance(self, client, auth_headers, sample_pdf_files, performance_thresholds):
        """Test PDF file upload performance"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # Test with different file sizes
        for filename, filepath in sample_pdf_files.items():
            file_size = os.path.getsize(filepath)
            
            start_time = time.time()
            
            with open(filepath, "rb") as f:
                files = {"file": (filename, f, "application/pdf")}
                response = client.post("/admin/thesis-content/upload-file",
                                     files=files,
                                     headers=auth_headers["admin"])
            
            end_time = time.time()
            upload_time = end_time - start_time
            
            if response.status_code in [200, 201]:
                # Calculate upload speed (MB/s)
                file_size_mb = file_size / (1024 * 1024)
                upload_speed = file_size_mb / upload_time if upload_time > 0 else 0
                
                print(f"Upload {filename} ({file_size_mb:.2f}MB): {upload_time:.3f}s ({upload_speed:.2f}MB/s)")
                
                # Should complete within threshold (adjusted for file size)
                max_time = performance_thresholds["file_upload_time"]
                if file_size_mb > 10:  # Larger files get more time
                    max_time *= (file_size_mb / 10)
                
                assert upload_time < max_time
    
    def test_metadata_extraction_performance(self, client, auth_headers, sample_pdf_files):
        """Test metadata extraction performance"""
        if "admin" not in auth_headers:
            pytest.skip("No admin authentication available")
        
        # Upload a file and measure extraction time
        filepath = sample_pdf_files["simple_thesis.pdf"]
        
        with open(filepath, "rb") as f:
            files = {"file": ("test_thesis.pdf", f, "application/pdf")}
            response = client.post("/admin/thesis-content/upload-file",
                                 files=files,
                                 headers=auth_headers["admin"])
        
        if response.status_code in [200, 201]:
            data = response.json()
            extraction_job_id = data.get("extraction_job_id")
            
            # Monitor extraction job completion
            start_time = time.time()
            max_wait = 300  # 5 minutes max
            
            while time.time() - start_time < max_wait:
                # Check extraction job status (if endpoint exists)
                status_response = client.get(f"/admin/extraction-jobs/{extraction_job_id}",
                                           headers=auth_headers["admin"])
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    if status_data.get("status") == "completed":
                        extraction_time = time.time() - start_time
                        print(f"Metadata extraction completed in: {extraction_time:.3f}s")
                        assert extraction_time < 120  # Should complete within 2 minutes
                        break
                
                time.sleep(5)  # Check every 5 seconds
            else:
                pytest.fail("Metadata extraction timed out")

@pytest.mark.performance
class TestSystemResourceUsage:
    """Test system resource usage during operations"""
    
    def test_memory_usage_during_search(self, client):
        """Test memory usage during search operations"""
        process = psutil.Process()
        
        # Get baseline memory usage
        baseline_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Perform multiple searches
        for i in range(20):
            response = client.get(f"/theses?q=test{i}&limit=50")
            assert response.status_code == 200
        
        # Check memory usage after searches
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - baseline_memory
        
        print(f"Memory usage: {baseline_memory:.2f}MB -> {final_memory:.2f}MB (+{memory_increase:.2f}MB)")
        
        # Memory increase should be reasonable
        assert memory_increase < 100  # Less than 100MB increase
    
    def test_cpu_usage_during_concurrent_requests(self, client):
        """Test CPU usage during concurrent requests"""
        def make_request():
            response = client.get("/theses?q=performance&limit=20")
            return response.status_code
        
        # Monitor CPU usage during concurrent requests
        process = psutil.Process()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            cpu_before = process.cpu_percent()
            
            # Submit concurrent requests
            futures = [executor.submit(make_request) for _ in range(20)]
            
            # Wait for completion
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            cpu_after = process.cpu_percent()
        
        # All requests should succeed
        assert all(status == 200 for status in results)
        
        print(f"CPU usage during concurrent requests: {cpu_before:.1f}% -> {cpu_after:.1f}%")
    
    def test_database_connection_pool_performance(self, clean_db):
        """Test database connection pool performance"""
        def execute_query():
            with clean_db.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM theses")
                return cursor.fetchone()
        
        # Test multiple concurrent database operations
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(execute_query) for _ in range(50)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All queries should succeed
        assert len(results) == 50
        assert all(result is not None for result in results)
        
        # Should handle concurrent queries efficiently
        avg_time_per_query = total_time / 50
        print(f"Average time per concurrent query: {avg_time_per_query:.3f}s")
        assert avg_time_per_query < 0.1  # Each query should average under 100ms