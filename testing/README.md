# Comprehensive Automated Testing Suite for theses.ma

## Testing Architecture Overview

This testing suite provides 100% feature coverage for the theses.ma platform with:

### Backend Testing (Python/pytest)
- **API Tests**: All 98 endpoints with realistic data
- **Database Tests**: CRUD operations, constraints, relationships
- **Performance Tests**: Search, bulk operations, file processing
- **Integration Tests**: PDF processing pipeline with real Gemini API
- **Business Logic Tests**: Metadata extraction, data validation

### Frontend Testing (Playwright/Jest)
- **Unit Tests**: All React components and utilities
- **Integration Tests**: Context providers, API services
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Page load times, search responsiveness
- **Cross-browser Tests**: Chrome, Firefox, Safari compatibility

### Test Data Strategy
- **Realistic Test Database**: Full institutional hierarchy
- **Sample PDFs**: Real thesis documents for processing tests
- **User Scenarios**: Multiple user roles and permissions
- **Edge Cases**: Boundary conditions, error scenarios

## Test Coverage Goals
- **Backend API**: 100% endpoint coverage
- **Frontend Components**: 95%+ component coverage
- **User Workflows**: All critical paths tested
- **Performance Baselines**: Response time thresholds
- **Error Handling**: All error scenarios covered

## Reporting
- **HTML Reports**: Comprehensive test results with screenshots
- **Coverage Reports**: Code coverage metrics for both frontend/backend
- **Performance Reports**: Response time analysis and trends
- **CI Integration**: Automated test execution and reporting

## Directory Structure
```
testing/
├── backend/
│   ├── api/              # API endpoint tests
│   ├── database/         # Database operation tests
│   ├── integration/      # Integration tests
│   ├── performance/      # Performance tests
│   └── fixtures/         # Test data and utilities
├── frontend/
│   ├── unit/             # Component unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # End-to-end tests
│   └── performance/      # Frontend performance tests
├── test_data/
│   ├── pdfs/             # Sample thesis PDFs
│   ├── fixtures/         # Database fixtures
│   └── scenarios/        # Test scenarios
├── reports/              # Test reports output
├── config/               # Test configuration
└── utils/                # Shared testing utilities
```

## Running Tests

### Backend Tests
```bash
# Run all backend tests
pytest testing/backend/ --html=reports/backend_report.html --cov=.

# Run specific test categories
pytest testing/backend/api/ -v
pytest testing/backend/performance/ --benchmark-only
```

### Frontend Tests
```bash
# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance
```

### Full Test Suite
```bash
# Run complete test suite with reports
./run_all_tests.sh
```

## Test Configuration

### Environment Variables
```bash
# Test Database
TEST_DATABASE_URL=postgresql://postgres:admin@localhost:5432/thesis_test

# API Configuration
TEST_API_BASE_URL=http://localhost:8000
GEMINI_API_KEY=your_gemini_api_key

# Test Settings
TEST_TIMEOUT=30000
PARALLEL_TESTS=4
GENERATE_SCREENSHOTS=true
```

## Performance Baselines
- **Search Response**: < 500ms for simple queries
- **File Upload**: < 30s for 50MB PDFs
- **Page Load**: < 2s for thesis detail pages
- **Bulk Operations**: < 5s for 100 record operations