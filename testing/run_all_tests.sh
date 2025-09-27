#!/bin/bash

# Comprehensive Test Runner for theses.ma
# Runs all backend and frontend tests with reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/workspace"
FRONTEND_DIR="/workspace/UI"
TESTING_DIR="/workspace/testing"
REPORTS_DIR="$TESTING_DIR/reports"

# Create reports directory
mkdir -p "$REPORTS_DIR"

echo -e "${BLUE}🚀 Starting Comprehensive Test Suite for theses.ma${NC}"
echo "=================================================="

# Function to print section headers
print_section() {
    echo -e "\n${YELLOW}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to start services
start_services() {
    print_section "Starting Required Services"
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo -e "${RED}❌ PostgreSQL is not running. Please start PostgreSQL service.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
    
    # Start backend server in background
    echo "🔧 Starting backend server..."
    cd "$BACKEND_DIR"
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    echo "⏳ Waiting for backend to be ready..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if curl -s http://localhost:8000/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend server is ready${NC}"
            break
        fi
        sleep 1
        timeout=$((timeout-1))
    done
    
    if [ $timeout -eq 0 ]; then
        echo -e "${RED}❌ Backend server failed to start${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Start frontend server in background
    echo "🔧 Starting frontend server..."
    cd "$FRONTEND_DIR"
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait for frontend to be ready
    echo "⏳ Waiting for frontend to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -s http://localhost:5173 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend server is ready${NC}"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -eq 0 ]; then
        echo -e "${RED}❌ Frontend server failed to start${NC}"
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
}

# Function to stop services
stop_services() {
    print_section "Stopping Services"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo "🛑 Backend server stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "🛑 Frontend server stopped"
    fi
}

# Trap to ensure services are stopped on exit
trap stop_services EXIT

# Function to run backend tests
run_backend_tests() {
    print_section "Running Backend Tests"
    
    cd "$TESTING_DIR/backend"
    
    # Set test environment variables
    export TEST_DATABASE_URL="postgresql://postgres:admin@localhost:5432/thesis_test"
    export PYTHONPATH="$BACKEND_DIR:$PYTHONPATH"
    
    echo "🧪 Running API Tests..."
    pytest api/ -v \
        --html="$REPORTS_DIR/backend_api_report.html" \
        --self-contained-html \
        --cov="$BACKEND_DIR" \
        --cov-report=html:"$REPORTS_DIR/backend_coverage" \
        --cov-report=json:"$REPORTS_DIR/backend_coverage.json" \
        --junitxml="$REPORTS_DIR/backend_junit.xml" \
        --tb=short
    
    echo "🧪 Running Integration Tests..."
    pytest integration/ -v \
        --html="$REPORTS_DIR/backend_integration_report.html" \
        --self-contained-html \
        --tb=short
    
    echo "🧪 Running Performance Tests..."
    pytest performance/ -v -m performance \
        --html="$REPORTS_DIR/backend_performance_report.html" \
        --self-contained-html \
        --tb=short \
        --benchmark-only \
        --benchmark-json="$REPORTS_DIR/backend_benchmark.json"
    
    echo -e "${GREEN}✅ Backend tests completed${NC}"
}

# Function to run frontend tests
run_frontend_tests() {
    print_section "Running Frontend Tests"
    
    cd "$FRONTEND_DIR"
    
    echo "🧪 Running Unit Tests..."
    npm run test:unit -- --coverage --reporter=html --outputFile="$REPORTS_DIR/frontend_unit_report.html"
    
    echo "🧪 Running Integration Tests..."
    npm run test:integration -- --reporter=html --outputFile="$REPORTS_DIR/frontend_integration_report.html"
    
    echo "🧪 Running E2E Tests..."
    cd "$TESTING_DIR/frontend"
    npx playwright test --reporter=html --output="$REPORTS_DIR/playwright-report"
    
    echo -e "${GREEN}✅ Frontend tests completed${NC}"
}

# Function to run performance tests
run_performance_tests() {
    print_section "Running Performance Tests"
    
    echo "🚀 Running Load Tests..."
    cd "$TESTING_DIR"
    
    # Run load tests with artillery (if available)
    if command_exists artillery; then
        artillery run performance/load-test.yml --output "$REPORTS_DIR/load_test_results.json"
        artillery report "$REPORTS_DIR/load_test_results.json" --output "$REPORTS_DIR/load_test_report.html"
    else
        echo -e "${YELLOW}⚠️ Artillery not found, skipping load tests${NC}"
    fi
    
    # Run Lighthouse performance audit (if available)
    if command_exists lighthouse; then
        echo "🔍 Running Lighthouse audit..."
        lighthouse http://localhost:5173 \
            --output=html \
            --output-path="$REPORTS_DIR/lighthouse_report.html" \
            --chrome-flags="--headless" \
            --quiet
    else
        echo -e "${YELLOW}⚠️ Lighthouse not found, skipping performance audit${NC}"
    fi
    
    echo -e "${GREEN}✅ Performance tests completed${NC}"
}

# Function to generate comprehensive report
generate_report() {
    print_section "Generating Comprehensive Test Report"
    
    # Create main report HTML
    cat > "$REPORTS_DIR/index.html" << EOF
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>theses.ma - Test Results</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #ecf0f1; padding: 20px; border-radius: 6px; border-left: 4px solid #3498db; }
        .card.success { border-left-color: #27ae60; }
        .card.warning { border-left-color: #f39c12; }
        .card.error { border-left-color: #e74c3c; }
        .links { margin: 20px 0; }
        .links a { display: inline-block; margin: 5px 10px 5px 0; padding: 10px 15px; background: #3498db; color: white; text-decoration: none; border-radius: 4px; }
        .links a:hover { background: #2980b9; }
        .timestamp { color: #7f8c8d; font-size: 0.9em; }
        .status { font-weight: bold; padding: 4px 8px; border-radius: 4px; }
        .status.pass { background: #d5edda; color: #155724; }
        .status.fail { background: #f8d7da; color: #721c24; }
        .status.skip { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 theses.ma - Comprehensive Test Results</h1>
        <p class="timestamp">Generated: $(date)</p>
        
        <div class="summary">
            <div class="card success">
                <h3>✅ Backend Tests</h3>
                <p>API endpoints, database operations, and business logic</p>
                <div class="links">
                    <a href="backend_api_report.html">API Tests</a>
                    <a href="backend_integration_report.html">Integration</a>
                    <a href="backend_performance_report.html">Performance</a>
                    <a href="backend_coverage/index.html">Coverage Report</a>
                </div>
            </div>
            
            <div class="card success">
                <h3>🖥️ Frontend Tests</h3>
                <p>UI components, user workflows, and cross-browser compatibility</p>
                <div class="links">
                    <a href="frontend_unit_report.html">Unit Tests</a>
                    <a href="frontend_integration_report.html">Integration</a>
                    <a href="playwright-report/index.html">E2E Tests</a>
                </div>
            </div>
            
            <div class="card warning">
                <h3>⚡ Performance</h3>
                <p>Load testing, response times, and resource usage</p>
                <div class="links">
                    <a href="load_test_report.html">Load Tests</a>
                    <a href="lighthouse_report.html">Lighthouse Audit</a>
                    <a href="backend_benchmark.json">Benchmarks</a>
                </div>
            </div>
        </div>
        
        <h2>📊 Test Summary</h2>
        <div id="test-summary">
            <p>Detailed test results are available in the individual reports above.</p>
        </div>
        
        <h2>🔧 System Information</h2>
        <ul>
            <li><strong>Test Environment:</strong> $(uname -a)</li>
            <li><strong>Python Version:</strong> $(python --version)</li>
            <li><strong>Node Version:</strong> $(node --version)</li>
            <li><strong>Database:</strong> PostgreSQL $(psql --version | head -1)</li>
        </ul>
        
        <h2>📝 Notes</h2>
        <ul>
            <li>All tests run against realistic test data</li>
            <li>Performance tests include real PDF processing with Gemini API</li>
            <li>E2E tests cover complete user workflows</li>
            <li>Cross-browser testing included for Chrome, Firefox, Safari</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    echo -e "${GREEN}✅ Comprehensive report generated: $REPORTS_DIR/index.html${NC}"
}

# Function to run specific test category
run_specific_tests() {
    case "$1" in
        "backend")
            start_services
            run_backend_tests
            ;;
        "frontend")
            start_services
            run_frontend_tests
            ;;
        "performance")
            start_services
            run_performance_tests
            ;;
        "e2e")
            start_services
            cd "$TESTING_DIR/frontend"
            npx playwright test --reporter=html --output="$REPORTS_DIR/playwright-report"
            ;;
        *)
            echo -e "${RED}❌ Unknown test category: $1${NC}"
            echo "Available categories: backend, frontend, performance, e2e"
            exit 1
            ;;
    esac
}

# Main execution
main() {
    # Check if specific test category is requested
    if [ $# -eq 1 ]; then
        echo -e "${BLUE}🎯 Running specific test category: $1${NC}"
        run_specific_tests "$1"
        generate_report
        return
    fi
    
    # Run full test suite
    echo -e "${BLUE}🚀 Running Full Test Suite${NC}"
    
    # Check prerequisites
    print_section "Checking Prerequisites"
    
    if ! command_exists python; then
        echo -e "${RED}❌ Python not found${NC}"
        exit 1
    fi
    
    if ! command_exists node; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
    
    if ! command_exists npm; then
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
    
    # Install dependencies if needed
    print_section "Installing Dependencies"
    
    cd "$BACKEND_DIR"
    pip install -r requirements.txt pytest pytest-html pytest-cov pytest-benchmark
    
    cd "$FRONTEND_DIR"
    npm install
    
    cd "$TESTING_DIR/frontend"
    npm install
    npx playwright install
    
    # Start services
    start_services
    
    # Run all test suites
    run_backend_tests
    run_frontend_tests
    run_performance_tests
    
    # Generate comprehensive report
    generate_report
    
    print_section "Test Suite Complete!"
    echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
    echo -e "${BLUE}📊 View comprehensive report: file://$REPORTS_DIR/index.html${NC}"
}

# Handle command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [test_category]"
    echo ""
    echo "Test categories:"
    echo "  backend     - Run only backend tests"
    echo "  frontend    - Run only frontend tests"
    echo "  performance - Run only performance tests"
    echo "  e2e         - Run only E2E tests"
    echo ""
    echo "If no category is specified, runs all tests."
    exit 0
fi

# Run main function
main "$@"