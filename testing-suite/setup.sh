#!/bin/bash

# Theses.ma Testing Suite Setup Script
# This script helps set up the testing environment

set -e

echo "🚀 Setting up Theses.ma Testing Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "run_tests.py" ]; then
    print_error "Please run this script from the testing-suite directory"
    exit 1
fi

# Check Python version
print_status "Checking Python version..."
python_version=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
if [ "$(echo "$python_version >= 3.11" | bc -l)" -eq 1 ]; then
    print_success "Python version $python_version is supported"
else
    print_error "Python 3.11+ is required. Current version: $python_version"
    exit 1
fi

# Check Node.js version
print_status "Checking Node.js version..."
if command -v node &> /dev/null; then
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -ge 18 ]; then
        print_success "Node.js version $(node --version) is supported"
    else
        print_error "Node.js 18+ is required. Current version: $(node --version)"
        exit 1
    fi
else
    print_error "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Check PostgreSQL
print_status "Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    print_success "PostgreSQL is installed"
else
    print_warning "PostgreSQL is not found. Please install PostgreSQL"
fi

# Install Python dependencies
print_status "Installing Python testing dependencies..."
if pip install -r backend-tests/requirements-test.txt; then
    print_success "Python dependencies installed successfully"
else
    print_error "Failed to install Python dependencies"
    exit 1
fi

# Check if UI directory exists
if [ -d "../UI" ]; then
    print_status "Found UI directory, installing frontend dependencies..."
    cd ../UI
    
    # Install npm dependencies
    if npm install; then
        print_success "Frontend dependencies installed successfully"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
    
    # Install Playwright
    print_status "Installing Playwright browsers..."
    if npx playwright install; then
        print_success "Playwright browsers installed successfully"
    else
        print_error "Failed to install Playwright browsers"
        exit 1
    fi
    
    cd ../testing-suite
else
    print_warning "UI directory not found. Frontend tests will not be available."
fi

# Create test database
print_status "Setting up test database..."
if command -v createdb &> /dev/null; then
    if createdb thesis_test 2>/dev/null; then
        print_success "Test database 'thesis_test' created successfully"
    else
        print_warning "Test database 'thesis_test' already exists or creation failed"
    fi
else
    print_warning "createdb command not found. Please create 'thesis_test' database manually"
fi

# Set up environment variables
print_status "Setting up environment variables..."
cat > .env.test << EOF
# Test Environment Variables for Theses.ma Testing Suite
TEST_DATABASE_URL=postgresql://postgres:admin@localhost:5432/thesis_test
JWT_SECRET_KEY=test-secret-key-for-testing-only
UPLOAD_DIRECTORY=./test_uploads
DEBUG=true
LOG_LEVEL=INFO
EOF

print_success "Environment variables configured in .env.test"

# Create test uploads directory
mkdir -p test_uploads
print_success "Test uploads directory created"

# Make run_tests.py executable
chmod +x run_tests.py
print_success "Test runner script made executable"

echo ""
echo "🎉 Testing Suite Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Review the configuration in .env.test"
echo "2. Update database credentials if needed"
echo "3. Run tests with: python run_tests.py"
echo ""
echo "📚 Documentation:"
echo "- Read docs/README.md for detailed information"
echo "- Check docs/TESTING_STRATEGY.md for testing approach"
echo "- Review docs/TESTING_IMPLEMENTATION_SUMMARY.md for complete overview"
echo ""
echo "🔧 Quick Commands:"
echo "- Run all tests: python run_tests.py"
echo "- Backend only: python run_tests.py --backend"
echo "- Frontend only: python run_tests.py --frontend"
echo "- Security tests: python run_tests.py --security"
echo "- Performance tests: python run_tests.py --performance"
echo ""
print_success "Setup completed successfully! 🚀"