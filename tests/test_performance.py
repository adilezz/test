"""
Performance and Load Testing for theses.ma
"""

import pytest
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any
import statistics

class TestPerformance:
    """Performance testing for API endpoints."""
    
    def test_search_performance(self, client, test_db_session, large_dataset):
        """Test search performance with large dataset."""
        # Create large dataset
        for university_data in large_dataset[:50]:  # Create 50 universities
            response = client.post("/admin/universities", json=university_data)
            assert response.status_code == 201
        
        # Test search performance
        start_time = time.time()
        response = client.get("/admin/universities?search=Test")
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # Should respond within 2 seconds
        assert response_time < 2.0
        assert response.status_code == 200
        
        print(f"Search response time: {response_time:.3f} seconds")
    
    def test_pagination_performance(self, client, test_db_session, large_dataset):
        """Test pagination performance."""
        # Create large dataset
        for university_data in large_dataset[:100]:  # Create 100 universities
            response = client.post("/admin/universities", json=university_data)
            assert response.status_code == 201
        
        # Test different page sizes
        page_sizes = [10, 20, 50, 100]
        response_times = []
        
        for page_size in page_sizes:
            start_time = time.time()
            response = client.get(f"/admin/universities?page=1&limit={page_size}")
            end_time = time.time()
            
            response_time = end_time - start_time
            response_times.append(response_time)
            
            assert response.status_code == 200
            print(f"Page size {page_size}: {response_time:.3f} seconds")
        
        # Response time should not increase dramatically with page size
        assert max(response_times) < 3.0
    
    def test_concurrent_requests(self, client, test_db_session):
        """Test concurrent request handling."""
        def make_request():
            response = client.get("/admin/universities")
            return response.status_code == 200
        
        # Make 10 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in futures]
        
        # All requests should succeed
        assert all(results)
    
    def test_database_query_performance(self, test_db_session):
        """Test database query performance."""
        # Test simple query
        start_time = time.time()
        result = test_db_session.execute("SELECT COUNT(*) FROM universities")
        end_time = time.time()
        
        query_time = end_time - start_time
        assert query_time < 0.1  # Should be very fast
        print(f"Database query time: {query_time:.3f} seconds")
    
    def test_file_upload_performance(self, client, auth_headers_admin, sample_pdf_content):
        """Test file upload performance."""
        # Create a larger PDF content for testing
        large_pdf_content = sample_pdf_content * 10  # 10x larger
        
        start_time = time.time()
        files = {"file": ("large_test.pdf", large_pdf_content, "application/pdf")}
        response = client.post("/admin/thesis-content/upload-file", files=files, headers=auth_headers_admin)
        end_time = time.time()
        
        upload_time = end_time - start_time
        
        # Should upload within 10 seconds
        assert upload_time < 10.0
        assert response.status_code == 200
        print(f"File upload time: {upload_time:.3f} seconds")
    
    def test_api_response_sizes(self, client, auth_headers_admin):
        """Test API response sizes for optimization."""
        # Test universities list response size
        response = client.get("/admin/universities", headers=auth_headers_admin)
        response_size = len(response.content)
        
        # Response should not be too large
        assert response_size < 100000  # 100KB limit
        print(f"Universities response size: {response_size} bytes")
    
    def test_memory_usage(self, client, test_db_session):
        """Test memory usage with large datasets."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Create large dataset
        for i in range(100):
            university_data = {
                "name_fr": f"Université Performance Test {i}",
                "name_en": f"Performance Test University {i}",
                "acronym": f"PTU{i}"
            }
            response = client.post("/admin/universities", json=university_data)
            assert response.status_code == 201
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 50MB)
        assert memory_increase < 50 * 1024 * 1024
        print(f"Memory increase: {memory_increase / 1024 / 1024:.2f} MB")

class TestLoadTesting:
    """Load testing scenarios."""
    
    def test_high_frequency_searches(self, client):
        """Test high frequency search requests."""
        search_terms = ["test", "university", "science", "research", "doctorate"]
        
        start_time = time.time()
        successful_requests = 0
        
        # Make 50 requests with different search terms
        for i in range(50):
            search_term = search_terms[i % len(search_terms)]
            response = client.get(f"/theses?q={search_term}")
            if response.status_code == 200:
                successful_requests += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should handle high frequency requests
        assert successful_requests >= 45  # 90% success rate
        assert total_time < 30  # Should complete within 30 seconds
        
        print(f"High frequency test: {successful_requests}/50 successful in {total_time:.2f} seconds")
    
    def test_concurrent_admin_operations(self, client, auth_headers_admin):
        """Test concurrent admin operations."""
        def create_university(index):
            university_data = {
                "name_fr": f"Université Concurrent {index}",
                "name_en": f"Concurrent University {index}",
                "acronym": f"CU{index}"
            }
            response = client.post("/admin/universities", json=university_data, headers=auth_headers_admin)
            return response.status_code == 201
        
        # Create 20 universities concurrently
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_university, i) for i in range(20)]
            results = [future.result() for future in futures]
        
        # Most operations should succeed
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.8  # 80% success rate
        print(f"Concurrent admin operations success rate: {success_rate:.2%}")
    
    def test_mixed_workload(self, client, auth_headers_admin):
        """Test mixed workload of different operations."""
        def mixed_operation(operation_type, index):
            if operation_type == "search":
                response = client.get(f"/theses?q=test{index}")
                return response.status_code == 200
            elif operation_type == "list":
                response = client.get("/admin/universities", headers=auth_headers_admin)
                return response.status_code == 200
            elif operation_type == "statistics":
                response = client.get("/statistics")
                return response.status_code == 200
            return False
        
        operations = ["search", "list", "statistics"] * 10  # 30 operations
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(mixed_operation, op, i) 
                for i, op in enumerate(operations)
            ]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.9  # 90% success rate
        assert total_time < 20  # Should complete within 20 seconds
        
        print(f"Mixed workload: {success_rate:.2%} success in {total_time:.2f} seconds")

class TestStressTesting:
    """Stress testing scenarios."""
    
    def test_database_connection_pool(self, test_db_session):
        """Test database connection pool under stress."""
        def database_operation():
            try:
                result = test_db_session.execute("SELECT 1")
                return True
            except Exception:
                return False
        
        # Make 100 concurrent database operations
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(database_operation) for _ in range(100)]
            results = [future.result() for future in futures]
        
        # All operations should succeed
        assert all(results)
        print("Database connection pool stress test passed")
    
    def test_memory_leak_detection(self, client, test_db_session):
        """Test for memory leaks in API endpoints."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        
        # Get initial memory
        initial_memory = process.memory_info().rss
        
        # Make many requests
        for i in range(100):
            response = client.get("/admin/universities")
            assert response.status_code == 200
        
        # Force garbage collection
        import gc
        gc.collect()
        
        # Get final memory
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be minimal (less than 10MB)
        assert memory_increase < 10 * 1024 * 1024
        print(f"Memory leak test: {memory_increase / 1024 / 1024:.2f} MB increase")

class TestPerformanceBenchmarks:
    """Performance benchmarks for monitoring."""
    
    @pytest.mark.benchmark
    def test_search_benchmark(self, client, benchmark):
        """Benchmark search performance."""
        def search_operation():
            response = client.get("/theses?q=test")
            return response.status_code == 200
        
        result = benchmark(search_operation)
        assert result
    
    @pytest.mark.benchmark
    def test_list_benchmark(self, client, auth_headers_admin, benchmark):
        """Benchmark list operations."""
        def list_operation():
            response = client.get("/admin/universities", headers=auth_headers_admin)
            return response.status_code == 200
        
        result = benchmark(list_operation)
        assert result
    
    @pytest.mark.benchmark
    def test_database_benchmark(self, test_db_session, benchmark):
        """Benchmark database operations."""
        def db_operation():
            result = test_db_session.execute("SELECT COUNT(*) FROM universities")
            return result.scalar()
        
        result = benchmark(db_operation)
        assert result is not None