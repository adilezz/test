# Theses.ma Testing Documentation

This directory contains comprehensive testing for the theses.ma platform, including backend API tests, frontend UI tests, security tests, and performance tests.

## Test Structure

```
tests/
├── conftest.py                 # Pytest configuration and fixtures
├── test_authentication.py      # Authentication and authorization tests
├── test_universities_crud.py   # Universities CRUD operation tests
├── test_thesis_crud.py         # Thesis management tests
├── test_performance.py         # Performance and load tests
├── test_security.py           # Security and penetration tests
├── test_data_fixtures.py      # Test data generation utilities
├── run_tests.py               # Test runner script
├── requirements-test.txt      # Testing dependencies
├── ui-tests/                  # Frontend UI tests
│   ├── auth.spec.ts           # Authentication UI tests
│   ├── search.spec.ts         # Search and discovery UI tests
│   └── admin.spec.ts          # Admin panel UI tests
├── playwright.config.ts       # Playwright configuration
└── README.md                  # This file
```

## Test Categories

### 1. Backend API Tests

#### Authentication Tests (`test_authentication.py`)
- User login/logout functionality
- JWT token validation
- Role-based access control
- Password management
- Session handling

#### CRUD Operations Tests (`test_universities_crud.py`)
- Create, read, update, delete operations
- Data validation
- Pagination and filtering
- Search functionality
- Error handling

#### Thesis Management Tests (`test_thesis_crud.py`)
- Thesis creation and editing
- File upload functionality
- Metadata extraction
- Academic person associations
- Category and keyword management
- Public access controls

### 2. Frontend UI Tests

#### Authentication UI Tests (`ui-tests/auth.spec.ts`)
- Login form validation
- Registration process
- User session management
- Protected route access
- Error message display

#### Search and Discovery Tests (`ui-tests/search.spec.ts`)
- Search functionality
- Filter operations
- Result display
- Pagination
- Thesis detail pages
- Download functionality

#### Admin Panel Tests (`ui-tests/admin.spec.ts`)
- Admin dashboard
- Entity management (universities, faculties, etc.)
- Thesis management
- User interface validation
- Form submissions

### 3. Security Tests (`test_security.py`)
- Authentication security
- Input validation
- SQL injection prevention
- XSS protection
- File upload security
- Rate limiting
- Data privacy

### 4. Performance Tests (`test_performance.py`)
- API response times
- Database query performance
- File upload performance
- Memory usage
- Concurrent request handling
- Load testing scenarios

## Running Tests

### Prerequisites

1. **Python Dependencies**
   ```bash
   pip install -r requirements-test.txt
   ```

2. **Node.js Dependencies**
   ```bash
   cd UI
   npm install
   npx playwright install
   ```

3. **Test Database**
   ```bash
   # Create test database
   createdb thesis_test
   ```

### Running All Tests

```bash
python tests/run_tests.py
```

### Running Specific Test Categories

```bash
# Backend tests only
python tests/run_tests.py --backend

# Frontend tests only
python tests/run_tests.py --frontend

# Security tests only
python tests/run_tests.py --security

# Performance tests only
python tests/run_tests.py --performance
```

### Running Individual Test Files

```bash
# Backend tests
pytest tests/test_authentication.py -v
pytest tests/test_universities_crud.py -v
pytest tests/test_thesis_crud.py -v

# Frontend tests
cd UI
npx playwright test tests/ui-tests/auth.spec.ts
npx playwright test tests/ui-tests/search.spec.ts
npx playwright test tests/ui-tests/admin.spec.ts
```

### Running with Coverage

```bash
pytest tests/ --cov=. --cov-report=html --cov-report=term
```

## Test Configuration

### Environment Variables

```bash
export TEST_DATABASE_URL="postgresql://postgres:admin@localhost:5432/thesis_test"
export JWT_SECRET_KEY="test-secret-key"
export UPLOAD_DIRECTORY="./test_uploads"
```

### Test Data

Test data is generated using fixtures in `test_data_fixtures.py`:
- Universities, faculties, schools, departments
- Academic persons and degrees
- Categories and keywords
- Thesis data with multilingual support
- Sample PDF files for upload testing

## CI/CD Integration

Tests are automatically run on:
- Push to main/develop branches
- Pull requests
- Scheduled runs for performance monitoring

See `.github/workflows/test.yml` for the complete CI/CD configuration.

## Test Coverage Goals

- **Backend API**: 80%+ code coverage
- **Frontend Components**: All critical user flows tested
- **Security**: All OWASP Top 10 vulnerabilities tested
- **Performance**: Response times under 2 seconds for most operations

## Debugging Tests

### Backend Tests
```bash
# Run with detailed output
pytest tests/test_authentication.py -v -s

# Run specific test
pytest tests/test_authentication.py::TestAuthentication::test_login_success -v

# Run with debugging
pytest tests/test_authentication.py --pdb
```

### Frontend Tests
```bash
# Run with headed browser
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run specific test
npx playwright test tests/ui-tests/auth.spec.ts --grep "should login with valid credentials"
```

## Test Data Management

### Creating Test Data
```python
from tests.test_data_fixtures import TestDataFixtures

fixtures = TestDataFixtures()
university_data = fixtures.create_university_data()
```

### Cleaning Up Test Data
Test data is automatically cleaned up after each test using the `cleanup_test_data` fixture.

## Performance Benchmarks

Performance tests include:
- API response time benchmarks
- Database query performance
- File upload performance
- Memory usage monitoring
- Concurrent request handling

Run benchmarks with:
```bash
pytest tests/test_performance.py --benchmark-only
```

## Security Testing

Security tests cover:
- Authentication bypass attempts
- SQL injection prevention
- XSS protection
- File upload security
- Rate limiting
- Data privacy

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Data Cleanup**: Always clean up test data
3. **Mocking**: Use mocks for external dependencies
4. **Assertions**: Use descriptive assertions
5. **Error Testing**: Test both success and failure scenarios
6. **Performance**: Monitor test execution time

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Ensure PostgreSQL is running
   - Check database credentials
   - Verify test database exists

2. **Frontend Test Failures**
   - Ensure UI server is running
   - Check browser installation
   - Verify API endpoints are accessible

3. **File Upload Test Failures**
   - Check upload directory permissions
   - Verify file size limits
   - Ensure proper file types

### Getting Help

For test-related issues:
1. Check test logs and error messages
2. Run tests in verbose mode (`-v`)
3. Use debugging tools (`--pdb` for Python, `--debug` for Playwright)
4. Review CI/CD logs for environment-specific issues

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Add appropriate fixtures
3. Include both positive and negative test cases
4. Update documentation
5. Ensure tests pass in CI/CD pipeline