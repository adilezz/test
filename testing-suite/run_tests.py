#!/usr/bin/env python3
"""
Test runner script for theses.ma
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

def run_command(command, cwd=None):
    """Run a command and return the result."""
    print(f"Running: {command}")
    result = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
    
    if result.stdout:
        print("STDOUT:", result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    return result.returncode == 0

def setup_test_environment():
    """Set up test environment."""
    print("Setting up test environment...")
    
    # Set environment variables
    os.environ["TEST_DATABASE_URL"] = "postgresql://postgres:admin@localhost:5432/thesis_test"
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing"
    os.environ["UPLOAD_DIRECTORY"] = "./test_uploads"
    
    # Create test directories
    Path("test_uploads").mkdir(exist_ok=True)
    
    print("Test environment setup complete.")

def run_backend_tests(coverage=True, verbose=True):
    """Run backend tests."""
    print("\n" + "="*50)
    print("RUNNING BACKEND TESTS")
    print("="*50)
    
    setup_test_environment()
    
    # Install test dependencies
    if not run_command("pip install -r tests/requirements-test.txt"):
        print("Failed to install test dependencies")
        return False
    
    # Run tests
    cmd = "pytest tests/"
    
    if verbose:
        cmd += " -v"
    
    if coverage:
        cmd += " --cov=. --cov-report=html --cov-report=term"
    
    # Exclude frontend tests
    cmd += " --ignore=tests/ui-tests/"
    
    return run_command(cmd)

def run_frontend_tests():
    """Run frontend tests."""
    print("\n" + "="*50)
    print("RUNNING FRONTEND TESTS")
    print("="*50)
    
    ui_dir = Path("UI")
    if not ui_dir.exists():
        print("UI directory not found")
        return False
    
    # Install dependencies
    if not run_command("npm ci", cwd=ui_dir):
        print("Failed to install frontend dependencies")
        return False
    
    # Install Playwright
    if not run_command("npx playwright install", cwd=ui_dir):
        print("Failed to install Playwright")
        return False
    
    # Run frontend tests
    return run_command("npx playwright test", cwd=ui_dir)

def run_security_tests():
    """Run security tests."""
    print("\n" + "="*50)
    print("RUNNING SECURITY TESTS")
    print("="*50)
    
    setup_test_environment()
    
    # Install security tools
    if not run_command("pip install bandit safety"):
        print("Failed to install security tools")
        return False
    
    # Run bandit security scan
    print("Running Bandit security scan...")
    if not run_command("bandit -r . -f json -o bandit-report.json"):
        print("Bandit scan found security issues")
        return False
    
    # Run safety check
    print("Running Safety check...")
    if not run_command("safety check --json --output safety-report.json"):
        print("Safety check found vulnerable dependencies")
        return False
    
    print("Security tests passed!")
    return True

def run_performance_tests():
    """Run performance tests."""
    print("\n" + "="*50)
    print("RUNNING PERFORMANCE TESTS")
    print("="*50)
    
    setup_test_environment()
    
    # Run performance tests
    cmd = "pytest tests/test_performance.py -v --benchmark-only"
    return run_command(cmd)

def run_all_tests():
    """Run all tests."""
    print("\n" + "="*60)
    print("RUNNING ALL TESTS FOR THESES.MA")
    print("="*60)
    
    results = []
    
    # Run backend tests
    results.append(("Backend Tests", run_backend_tests()))
    
    # Run frontend tests
    results.append(("Frontend Tests", run_frontend_tests()))
    
    # Run security tests
    results.append(("Security Tests", run_security_tests()))
    
    # Run performance tests
    results.append(("Performance Tests", run_performance_tests()))
    
    # Print summary
    print("\n" + "="*60)
    print("TEST RESULTS SUMMARY")
    print("="*60)
    
    all_passed = True
    for test_name, passed in results:
        status = "PASSED" if passed else "FAILED"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False
    
    print("="*60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
    else:
        print("❌ SOME TESTS FAILED!")
    
    return all_passed

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Run tests for theses.ma")
    parser.add_argument("--backend", action="store_true", help="Run backend tests only")
    parser.add_argument("--frontend", action="store_true", help="Run frontend tests only")
    parser.add_argument("--security", action="store_true", help="Run security tests only")
    parser.add_argument("--performance", action="store_true", help="Run performance tests only")
    parser.add_argument("--no-coverage", action="store_true", help="Skip coverage reporting")
    parser.add_argument("--quiet", action="store_true", help="Run tests quietly")
    
    args = parser.parse_args()
    
    if args.backend:
        success = run_backend_tests(coverage=not args.no_coverage, verbose=not args.quiet)
    elif args.frontend:
        success = run_frontend_tests()
    elif args.security:
        success = run_security_tests()
    elif args.performance:
        success = run_performance_tests()
    else:
        success = run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()