# Theses.ma - Moroccan Thesis Repository Platform

## Project Overview

Theses.ma is a comprehensive Moroccan thesis repository website that enables researchers, authors, students, and the public to search for, view, download, cite, and add to favorites thesis across multiple institutions and disciplines. The platform provides advanced search capabilities, filtering through all thesis fields, and includes administrative tools for content management.

## Architecture

### Technology Stack
- **Backend**: FastAPI (Python) with PostgreSQL database
- **Frontend**: React + TypeScript with Vite build system
- **UI Framework**: Tailwind CSS with Framer Motion animations
- **Authentication**: JWT-based authentication with role-based access control
- **File Processing**: PDF metadata extraction using Google Gemini AI
- **Database**: PostgreSQL with comprehensive relational schema

### Project Structure
```
/workspace/
├── main.py                     # FastAPI backend application
├── thesis.txt                  # PostgreSQL database schema dump
├── requirements.txt            # Python dependencies
├── fastapi_gemini_integration.py # AI metadata extraction
├── metadata_pipeline/          # Two-step PDF processing pipeline
├── UI/                         # React frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── pages/          # Page components (user & admin)
│   │   │   ├── layout/         # Header, Footer components
│   │   │   └── ui/             # Reusable UI components
│   │   ├── contexts/           # React contexts (Auth, Search)
│   │   ├── services/           # API service layer
│   │   └── types/              # TypeScript type definitions
│   └── package.json            # Frontend dependencies
└── CHANGES_SUMMARY.md          # Recent fixes documentation
```

## Database Schema

### Core Tables (23 tables total)

#### Main Entity Tables
- **`theses`** - Central thesis table with metadata (title, abstract, defense date, status, etc.)
- **`universities`** - University institutions with multilingual names
- **`faculties`** - Faculty entities linked to universities
- **`schools`** - School entities with hierarchical structure
- **`departments`** - Department entities linked to faculties/schools
- **`academic_persons`** - Academic personnel (authors, directors, examiners)
- **`categories`** - Hierarchical thesis classification categories
- **`keywords`** - Thesis keywords with category associations
- **`degrees`** - Academic degree types (doctorate, master, etc.)
- **`languages`** - Supported languages (French, Arabic, English, Spanish, Tamazight)
- **`geographic_entities`** - Geographic locations with hierarchical levels

#### Relationship Tables
- **`thesis_academic_persons`** - Links theses to academic persons with roles (author, director, etc.)
- **`thesis_categories`** - Links theses to categories with primary/secondary classification
- **`thesis_keywords`** - Links theses to keywords with positioning
- **`thesis_downloads`** - Tracks thesis download statistics
- **`thesis_views`** - Tracks thesis view statistics

#### User Management Tables
- **`users`** - User accounts with role-based access (admin, super_admin, user)
- **`user_roles`** - Role definitions and permissions
- **`user_sessions`** - User session management
- **`audit_logs`** - System audit trail

#### Metadata Extraction Tables
- **`extraction_jobs`** - AI metadata extraction job tracking
- **`extraction_batches`** - Batch processing for multiple files
- **`extracted_metadata`** - AI-extracted metadata with confidence scores

### Key Relationships
- Universities → Faculties → Departments (cascade hierarchy)
- Universities → Schools → Departments (alternative hierarchy)
- Theses → Academic Persons (many-to-many with roles)
- Theses → Categories (many-to-many with primary/secondary)
- Theses → Keywords (many-to-many with positioning)
- Categories → Keywords (hierarchical classification)
- Geographic Entities (hierarchical: country → region → province → city)

## API Endpoints

### Authentication Endpoints
- `POST /auth/login` - User login with JWT token generation
- `POST /auth/logout` - User logout and token invalidation
- `POST /auth/refresh` - Token refresh mechanism
- `GET /auth/profile` - Get current user profile
- `PUT /auth/profile` - Update user profile
- `POST /auth/change-password` - Change user password

### Public Endpoints
- `GET /theses` - Search and browse theses with advanced filtering
- `GET /theses/{id}/download` - Download thesis PDF files
- `GET /statistics` - Public platform statistics
- `GET /universities/tree` - Hierarchical university structure
- `GET /schools/tree` - Hierarchical school structure
- `GET /categories/tree` - Hierarchical category structure
- `GET /geographic-entities/tree` - Geographic hierarchy

### Admin Endpoints (98 total endpoints)

#### Reference Data Management
- **Universities**: CRUD operations + tree structure
- **Faculties**: CRUD operations + department associations
- **Schools**: CRUD operations + hierarchical management
- **Departments**: CRUD operations
- **Categories**: CRUD operations + hierarchical tree
- **Keywords**: CRUD operations + category associations
- **Academic Persons**: CRUD operations + search + merge functionality
- **Degrees**: CRUD operations for degree types
- **Languages**: CRUD operations for supported languages
- **Geographic Entities**: CRUD operations + hierarchical tree

#### Thesis Management
- `GET /admin/theses` - List all theses with admin metadata
- `GET /admin/theses/{id}` - Get detailed thesis information
- `PUT /admin/theses/{id}` - Update thesis metadata
- `DELETE /admin/theses/{id}` - Delete thesis
- `POST /admin/thesis-content/upload-file` - Upload thesis PDF
- `POST /admin/thesis-content/manual/create` - Create thesis manually
- `GET /admin/thesis-content/manual/form` - Get thesis form structure

#### Thesis Relationships
- `POST /admin/theses/{id}/academic-persons` - Add academic person to thesis
- `POST /admin/theses/{id}/categories` - Add category to thesis
- `POST /admin/theses/{id}/keywords` - Add keyword to thesis

#### Analytics & Reports
- `GET /admin/statistics` - Comprehensive platform statistics
- `GET /admin/reports` - Generate various reports

### Health & Monitoring
- `GET /health` - Application health check
- `GET /health/db` - Database connectivity check
- `GET /health/ready` - Readiness check for deployment

## Frontend Application

### User Interface Components

#### Public Pages
- **HomePage** - Landing page with search, statistics, and featured theses
- **SearchResultsPage** - Advanced search with filtering capabilities
- **ThesisDetailPage** - Individual thesis view with metadata and download
- **LoginPage** - User authentication
- **RegisterPage** - User registration

#### Admin Pages (Protected Routes)
- **AdminDashboardPage** - Admin overview with statistics
- **AdminMainPage** - Admin navigation hub
- **AdminThesesListPage** - Thesis management interface
- **AdminThesisPage** - Individual thesis editing form
- **AdminUniversitiesPage** - University management
- **AdminSchoolsPage** - School management
- **AdminFacultiesPage** - Faculty management
- **AdminDepartmentsPage** - Department management
- **AdminCategoriesPage** - Category management
- **AdminKeywordsPage** - Keyword management
- **AdminAcademicPersonsPage** - Academic person management
- **AdminDegreesPage** - Degree type management
- **AdminLanguagesPage** - Language management
- **AdminGeographicEntitiesPage** - Geographic entity management
- **AdminStatisticsPage** - Analytics dashboard
- **AdminReportsPage** - Report generation

### Key Features

#### Search & Discovery
- **Advanced Search**: Multi-field search across title, author, abstract, keywords
- **Filtering**: By university, faculty, department, category, degree, language, date range
- **Sorting**: By creation date, update date, title, author, defense date, university
- **Pagination**: Configurable page sizes with efficient data loading

#### User Management
- **Role-Based Access**: Admin, Super Admin, and User roles
- **Profile Management**: User profiles with institutional affiliations
- **Session Management**: Secure JWT-based authentication

#### Content Management
- **Thesis Upload**: PDF file upload with automatic metadata extraction
- **Manual Entry**: Form-based thesis creation with comprehensive metadata
- **Bulk Operations**: Support for batch processing (future enhancement)
- **Review Workflow**: Draft → Submitted → Under Review → Approved/Rejected → Published

#### Metadata Extraction
- **AI-Powered**: Google Gemini AI for automatic metadata extraction from PDFs
- **Two-Step Pipeline**: Text extraction followed by AI analysis
- **Confidence Scoring**: Quality assessment of extracted metadata
- **Manual Review**: Admin oversight and correction of extracted data

## Current Functionality

### Working Features
1. **User Authentication & Authorization**
   - JWT-based login/logout
   - Role-based access control
   - Profile management

2. **Thesis Search & Discovery**
   - Advanced search with multiple filters
   - Thesis detail pages
   - PDF download functionality

3. **Admin Content Management**
   - Complete CRUD operations for all reference entities
   - Thesis upload and manual creation
   - Academic person management with search and merge
   - Hierarchical data management (universities, schools, categories)

4. **File Processing**
   - PDF upload and storage
   - Metadata extraction pipeline (two-step process)
   - File validation and security

5. **Statistics & Analytics**
   - Platform statistics
   - Download and view tracking
   - Admin dashboard with key metrics

6. **Multilingual Support**
   - French, Arabic, English, Spanish, Tamazight
   - Multilingual metadata storage and display

### Recent Fixes
- Fixed infinite re-render loop in AdminAcademicPersonsPage
- Standardized useEffect patterns across admin components
- Enhanced form validation and error handling

## Future Enhancements (Planned)

### User Features
- User account creation and profiles
- Thesis favoriting and personal collections
- User interactions and social features
- Advanced citation management

### Institution Features
- Institution-specific pages
- Key insights and highlights
- News and announcements
- Special offers and partnerships

### Technical Enhancements
- Bulk thesis loading through files
- Enhanced metadata extraction and matching
- Automatic metadata extraction for bulk operations
- Advanced reporting and analytics
- API versioning and documentation
- Performance optimizations

## Configuration

### Environment Variables
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
- `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `JWT_REFRESH_TOKEN_EXPIRE_DAYS`
- `UPLOAD_DIRECTORY`, `MAX_FILE_SIZE_MB`
- `DEBUG`, `LOG_LEVEL`

### Dependencies
- **Backend**: FastAPI, PostgreSQL, JWT authentication, Google Gemini AI
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, React Router
- **Development**: Vite, ESLint, PostCSS, TypeScript compiler

## Security Features
- JWT-based authentication with refresh tokens
- Role-based access control
- File upload validation and security
- SQL injection protection through parameterized queries
- CORS configuration for cross-origin requests
- Audit logging for administrative actions

## Data Model Highlights
- **Hierarchical Structures**: Universities → Faculties/Schools → Departments
- **Many-to-Many Relationships**: Theses ↔ Academic Persons, Categories, Keywords
- **Multilingual Support**: All entities support French, Arabic, and English names
- **Audit Trail**: Comprehensive tracking of all administrative actions
- **Metadata Extraction**: AI-powered extraction with confidence scoring and manual review

This platform serves as a comprehensive repository for Moroccan academic theses, providing both public access for research and discovery, and administrative tools for content management and curation.