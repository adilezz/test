# Comprehensive Testing Guide for theses.ma

## Overview

This testing suite provides 100% feature coverage for the theses.ma platform, including:

- **Backend API Testing**: All 98 endpoints with realistic data
- **Frontend E2E Testing**: Complete user workflows across browsers
- **Performance Testing**: Response times, load testing, resource usage
- **Integration Testing**: Real PDF processing with Gemini API
- **Cross-browser Testing**: Chrome, Firefox, Safari, Edge
- **Mobile Testing**: Responsive design and mobile workflows

## Quick Start

### Prerequisites

1. **PostgreSQL** running on localhost:5432 with `thesis_test` database
2. **Python 3.9+** with pip
3. **Node.js 18+** with npm
4. **Google Gemini API key** (set as `GEMINI_API_KEY` environment variable)

### Run All Tests

```bash
# Run complete test suite
./testing/run_all_tests.sh

# Run specific test category
./testing/run_all_tests.sh backend
./testing/run_all_tests.sh frontend
./testing/run_all_tests.sh performance
./testing/run_all_tests.sh e2e
```

### View Results

After running tests, open the comprehensive report:
```bash
open testing/reports/index.html
```

## Test Structure

### Backend Tests (`testing/backend/`)

```
backend/
├── api/                    # API endpoint tests
│   ├── test_authentication.py      # Auth endpoints
│   ├── test_thesis_management.py   # Thesis CRUD
│   ├── test_admin_crud.py          # Admin operations
│   ├── test_search.py              # Search functionality
│   └── test_file_upload.py         # File handling
├── integration/            # Integration tests
│   ├── test_pdf_processing.py     # PDF + Gemini integration
│   ├── test_database_operations.py # Complex DB operations
│   └── test_workflow_integration.py # End-to-end workflows
├── performance/            # Performance tests
│   ├── test_performance_benchmarks.py # Response time tests
│   ├── test_load_testing.py          # Load and stress tests
│   └── test_resource_usage.py        # Memory/CPU monitoring
└── fixtures/               # Test data and utilities
    ├── sample_data.py      # Database fixtures
    └── sample_pdfs/        # Test PDF files
```

### Frontend Tests (`testing/frontend/`)

```
frontend/
├── e2e/                    # End-to-end tests
│   ├── user-flows/         # Complete user workflows
│   │   ├── search-and-discovery.spec.ts
│   │   ├── admin-workflows.spec.ts
│   │   └── thesis-management.spec.ts
│   ├── page-objects/       # Page Object Models
│   │   ├── HomePage.ts
│   │   ├── SearchResultsPage.ts
│   │   ├── AdminDashboardPage.ts
│   │   └── ThesisDetailPage.ts
│   └── cross-browser/      # Browser-specific tests
├── unit/                   # Component unit tests
├── integration/            # Frontend integration tests
└── performance/            # Frontend performance tests
```

## Test Categories

### 1. API Testing

**Coverage**: All 98 endpoints
- Authentication and authorization
- CRUD operations for all entities
- Advanced search with filters
- File upload and processing
- Error handling and validation

**Example**:
```bash
# Run only API tests
pytest testing/backend/api/ -v
```

### 2. User Flow Testing

**Coverage**: Complete user journeys
- Public user search and discovery
- Admin login and management
- Thesis creation and publishing
- File upload and processing
- Cross-browser compatibility

**Example**:
```bash
# Run user flow tests
npx playwright test testing/frontend/e2e/user-flows/
```

### 3. Performance Testing

**Benchmarks**:
- Search response: < 500ms
- File upload: < 30s for 50MB
- Page load: < 2s
- Bulk operations: < 5s

**Example**:
```bash
# Run performance tests
pytest testing/backend/performance/ -m performance
```

### 4. Integration Testing

**Coverage**:
- Real PDF processing with Gemini API
- Database operations with constraints
- Multi-step workflows
- Error recovery scenarios

## Test Data Strategy

### Realistic Test Data

The test suite uses realistic Moroccan academic data:

- **Universities**: Mohammed V, Hassan II, Al Akhawayn, etc.
- **Faculties**: Sciences, Medicine, Engineering, etc.
- **Sample PDFs**: Real thesis documents for processing
- **Academic Persons**: Realistic names and titles
- **Geographic Data**: Moroccan regions and cities

### Test Database

- Separate `thesis_test` database
- Full schema with constraints
- Automatic cleanup between tests
- Realistic relationships and hierarchies

## Running Specific Tests

### Backend Tests

```bash
# All backend tests
pytest testing/backend/ -v

# Specific test file
pytest testing/backend/api/test_thesis_management.py -v

# Specific test method
pytest testing/backend/api/test_thesis_management.py::TestThesisManagementAPI::test_create_thesis -v

# Tests with specific marker
pytest testing/backend/ -m "performance" -v
pytest testing/backend/ -m "not slow" -v
```

### Frontend Tests

```bash
# All E2E tests
npx playwright test

# Specific browser
npx playwright test --project=chromium

# Specific test file
npx playwright test search-and-discovery.spec.ts

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

### Performance Tests

```bash
# Backend performance
pytest testing/backend/performance/ -v --benchmark-only

# Frontend performance
npx playwright test --grep="performance"

# Load testing (if Artillery is installed)
artillery run testing/performance/load-test.yml
```

## Test Reports

### HTML Reports

After running tests, comprehensive HTML reports are generated:

- **Main Report**: `testing/reports/index.html`
- **Backend API**: `testing/reports/backend_api_report.html`
- **Coverage**: `testing/reports/backend_coverage/index.html`
- **E2E Tests**: `testing/reports/playwright-report/index.html`
- **Performance**: `testing/reports/backend_performance_report.html`

### Coverage Reports

- **Backend Coverage**: Line and branch coverage for Python code
- **Frontend Coverage**: Component and function coverage for TypeScript
- **Integration Coverage**: End-to-end workflow coverage

## Continuous Integration

### GitHub Actions Example

```yaml
name: Comprehensive Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: admin
          POSTGRES_DB: thesis_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        cd UI && npm install
        cd ../testing/frontend && npm install
    
    - name: Run tests
      run: ./testing/run_all_tests.sh
      env:
        GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        TEST_DATABASE_URL: postgresql://postgres:admin@localhost:5432/thesis_test
    
    - name: Upload test reports
      uses: actions/upload-artifact@v3
      with:
        name: test-reports
        path: testing/reports/
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL is running
   pg_isready -h localhost -p 5432
   
   # Create test database
   createdb thesis_test
   ```

2. **Frontend Server Not Starting**
   ```bash
   # Check Node.js version
   node --version  # Should be 18+
   
   # Clear npm cache
   npm cache clean --force
   cd UI && npm install
   ```

3. **Gemini API Errors**
   ```bash
   # Set API key
   export GEMINI_API_KEY="your-api-key"
   
   # Test API connection
   curl -H "Authorization: Bearer $GEMINI_API_KEY" https://generativelanguage.googleapis.com/v1/models
   ```

4. **Performance Test Failures**
   - Check system resources (CPU, memory)
   - Verify database indexes are created
   - Ensure no other heavy processes running

### Debug Mode

```bash
# Backend debug
pytest testing/backend/ -v -s --pdb

# Frontend debug
npx playwright test --debug --headed

# Performance profiling
pytest testing/backend/performance/ --profile
```

## Best Practices

### Writing New Tests

1. **Use Page Object Model** for frontend tests
2. **Create realistic test data** that matches production
3. **Test error scenarios** not just happy paths
4. **Include performance assertions** for critical operations
5. **Use proper test isolation** with setup/teardown

### Test Maintenance

1. **Update tests** when adding new features
2. **Review test coverage** regularly
3. **Monitor test execution time** and optimize slow tests
4. **Keep test data current** with schema changes

### Performance Considerations

1. **Run performance tests** on dedicated hardware
2. **Establish baselines** and track trends over time
3. **Test with realistic data volumes**
4. **Monitor resource usage** during tests

## Contributing

When adding new tests:

1. Follow existing patterns and naming conventions
2. Add appropriate markers (`@pytest.mark.performance`, etc.)
3. Include both positive and negative test cases
4. Update this documentation if adding new test categories
5. Ensure tests pass in CI environment

## Support

For questions about the testing framework:

1. Check this documentation first
2. Review existing test examples
3. Check the test reports for similar patterns
4. Run tests with `-v` flag for detailed output