# theses.ma - Moroccan Thesis Repository Platform

## Project Overview

**theses.ma** is a comprehensive thesis management and search platform designed for Moroccan academic institutions. It enables researchers, students, authors, and the public to search for, view, download, cite, and manage thesis documents across multiple institutions and academic disciplines.

### Current Version: 1.0.0
### Technology Stack:
- **Backend**: FastAPI (Python) with PostgreSQL database
- **Frontend**: React with TypeScript, Vite, TailwindCSS
- **Authentication**: JWT-based with role-based access control
- **File Processing**: PDF handling with metadata extraction pipeline using Google Gemini AI

---

## 1. DATABASE ARCHITECTURE

### Core Tables Structure

#### 1.1 Geographic & Institutional Hierarchy
```
geographic_entities (countries, regions, provinces, cities)
    ↓
universities
    ↓
faculties ←→ schools (can be parallel or hierarchical)
    ↓           ↓
departments ← departments
```

#### 1.2 Main Database Tables

**Geographic & Institutional Tables:**
- `geographic_entities` - Geographic hierarchy (country → region → province → city)
- `universities` - Higher education institutions
- `faculties` - University faculties
- `schools` - Schools (can be under universities or other schools)
- `departments` - Academic departments (under faculties or schools)

**Academic Content Tables:**
- `theses` - Main thesis records with metadata
- `academic_persons` - Authors, directors, jury members
- `categories` - Hierarchical subject classification
- `keywords` - Thesis keywords (hierarchical structure)
- `degrees` - Academic degree types (doctorate, master, etc.)
- `languages` - Supported languages

**Relationship Tables:**
- `thesis_academic_persons` - Links theses to people with roles
- `thesis_categories` - Links theses to subject categories
- `thesis_keywords` - Links theses to keywords

**System Tables:**
- `users` - Platform users with role-based access
- `user_roles` - User role definitions
- `user_sessions` - Active user sessions
- `audit_logs` - System activity logging
- `thesis_views` - Thesis view tracking
- `thesis_downloads` - Download tracking

**Metadata Processing Tables:**
- `extraction_jobs` - PDF metadata extraction jobs
- `extraction_batches` - Batch processing management
- `extracted_metadata` - Raw extracted metadata from PDFs

#### 1.3 Key Database Constraints & Features

**Status Enums:**
- Thesis Status: `draft`, `submitted`, `under_review`, `approved`, `published`, `rejected`
- Academic Roles: `author`, `director`, `co_director`, `jury_president`, `jury_examiner`, `jury_reporter`, `external_examiner`
- User Roles: `user`, `admin`, `super_admin`

**Key Relationships:**
- Universities can have multiple faculties and schools
- Schools can be hierarchical (school → sub-school)
- Departments can belong to either faculties or schools
- Theses are linked to institutional hierarchy
- Categories and keywords support hierarchical structures
- Full audit trail for all CRUD operations

---

## 2. API ARCHITECTURE

### 2.1 Authentication & Security
- JWT-based authentication with access and refresh tokens
- Role-based access control (User, Admin, Super Admin)
- Password hashing with bcrypt
- Session management with automatic cleanup

**Authentication Endpoints:**
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Token refresh
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile
- `POST /auth/change-password` - Change password

### 2.2 Public API Endpoints

**Search & Discovery:**
- `GET /theses` - Advanced thesis search with filters
- `GET /theses/{id}/download` - Download thesis PDF
- `GET /statistics` - Platform statistics

**Reference Data:**
- `GET /universities/tree` - University hierarchy
- `GET /schools/tree` - Schools hierarchy
- `GET /categories/tree` - Subject categories tree
- `GET /geographic-entities/tree` - Geographic hierarchy
- `GET /universities`, `/faculties`, `/schools`, `/departments`, `/categories` - List endpoints

### 2.3 Admin API Endpoints

**Content Management:**
- `GET|POST|PUT|DELETE /admin/universities/{id}` - University CRUD
- `GET|POST|PUT|DELETE /admin/faculties/{id}` - Faculty CRUD
- `GET|POST|PUT|DELETE /admin/schools/{id}` - School CRUD
- `GET|POST|PUT|DELETE /admin/departments/{id}` - Department CRUD
- `GET|POST|PUT|DELETE /admin/categories/{id}` - Category CRUD
- `GET|POST|PUT|DELETE /admin/keywords/{id}` - Keyword CRUD
- `GET|POST|PUT|DELETE /admin/academic-persons/{id}` - Academic person CRUD
- `GET|POST|PUT|DELETE /admin/degrees/{id}` - Degree CRUD
- `GET|POST|PUT|DELETE /admin/languages/{id}` - Language CRUD
- `GET|POST|PUT|DELETE /admin/geographic-entities/{id}` - Geographic entity CRUD

**Thesis Management:**
- `GET|POST|PUT|DELETE /admin/theses/{id}` - Thesis CRUD
- `POST /admin/thesis-content/upload-file` - File upload
- `GET /admin/thesis-content/manual/form` - Form structure data
- `POST /admin/thesis-content/manual/create` - Create thesis manually
- `POST /admin/theses/{id}/academic-persons` - Link academic persons
- `POST /admin/theses/{id}/categories` - Link categories
- `POST /admin/theses/{id}/keywords` - Link keywords

**System Management:**
- `GET /admin/references/tree` - All reference trees
- `POST /admin/academic-persons/{id}/merge/{target_id}` - Merge academic persons
- `GET /admin/academic-persons/search` - Search academic persons

### 2.4 API Features
- Comprehensive error handling with structured responses
- Request validation using Pydantic models
- Pagination support for all list endpoints
- Advanced filtering and sorting capabilities
- CORS support for frontend integration
- File upload handling with validation
- Automatic metadata extraction pipeline integration

---

## 3. FRONTEND ARCHITECTURE

### 3.1 Technology Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation
- **Lucide React** for icons

### 3.2 Project Structure
```
UI/src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx - Main site header
│   │   ├── AdminHeader.tsx - Admin panel header
│   │   └── Footer.tsx - Site footer
│   ├── pages/
│   │   ├── HomePage.tsx - Landing page with search
│   │   ├── SearchResultsPage.tsx - Thesis search results
│   │   ├── ThesisDetailPage.tsx - Individual thesis view
│   │   ├── LoginPage.tsx - User authentication
│   │   ├── RegisterPage.tsx - User registration
│   │   ├── ProfilePage.tsx - User profile management
│   │   ├── UploadPage.tsx - Thesis upload (future)
│   │   └── Admin*Page.tsx - Admin panel pages
│   └── ui/ - Reusable UI components
├── contexts/
│   ├── AuthContext.tsx - Authentication state
│   └── SearchContext.tsx - Search state management
├── services/
│   └── api.ts - API service layer
├── types/
│   ├── api.ts - TypeScript type definitions
│   └── tree.ts - Tree structure types
└── App.tsx - Main application component
```

### 3.3 Key Frontend Features

**Public User Interface:**
- **Home Page**: Statistics dashboard, featured theses, quick search
- **Advanced Search**: Multi-field search with filters (university, category, language, date range, etc.)
- **Search Results**: Grid/list view toggle, pagination, sorting, bulk actions
- **Thesis Detail**: Full metadata display, download functionality, citation formats
- **Responsive Design**: Mobile-first approach with TailwindCSS

**Admin Interface:**
- **Dashboard**: Statistics overview, quick actions, recent activity
- **Content Management**: CRUD interfaces for all reference data
- **Thesis Management**: Thesis listing, editing, status management
- **File Upload**: PDF upload with metadata extraction
- **Hierarchical Data**: Tree views for universities, categories, keywords
- **Bulk Operations**: Mass actions for efficient management

**Authentication & Authorization:**
- Role-based route protection
- JWT token management with auto-refresh
- User profile management
- Session persistence

### 3.4 State Management
- **AuthContext**: User authentication state, role-based permissions
- **SearchContext**: Search filters, results, pagination state
- **Local State**: Component-specific state with React hooks
- **API State**: Centralized API calls through service layer

---

## 4. METADATA EXTRACTION PIPELINE

### 4.1 Pipeline Architecture
The system includes an automated metadata extraction pipeline for processing uploaded thesis PDFs:

**Step 1 - Text Processing (`step1_text.py`):**
- PDF text extraction using PyPDF2
- Table of contents detection
- Abstract extraction (French, English, Arabic)
- References counting
- Scanned PDF detection

**Step 2 - AI Processing (`step2_gemini.py`):**
- Google Gemini AI integration for metadata extraction
- Structured data extraction (titles, authors, institutions, dates)
- Multi-language support
- Category and keyword suggestion

**Pipeline Integration (`pipeline.py`):**
- Combines both steps for comprehensive metadata
- Handles fallback for scanned documents
- Merges results with preference logic

### 4.2 Extraction Jobs System
- `extraction_jobs` table tracks processing status
- `extraction_batches` for bulk processing management
- `extracted_metadata` stores raw extraction results
- Automatic matching with existing database entities

---

## 5. CURRENT FUNCTIONALITY

### 5.1 Working Features

**Public Access:**
✅ Advanced thesis search with multiple filters
✅ Thesis browsing and viewing
✅ PDF download functionality
✅ Statistics and analytics display
✅ Hierarchical browsing (universities, categories)
✅ Responsive web interface

**Authentication:**
✅ User login/logout system
✅ JWT-based session management
✅ Role-based access control
✅ Profile management

**Admin Panel:**
✅ Complete CRUD for all reference data:
  - Universities, Faculties, Schools, Departments
  - Categories, Keywords, Degrees, Languages
  - Academic Persons, Geographic Entities
✅ Thesis management interface
✅ File upload and processing
✅ Manual thesis creation forms
✅ Statistics and reporting dashboard
✅ Hierarchical data management with tree views

**Data Management:**
✅ Comprehensive database schema
✅ Full audit logging
✅ Data validation and constraints
✅ Relationship management
✅ Metadata extraction pipeline

### 5.2 API Coverage
- **98 API endpoints** covering all functionality
- Complete CRUD operations for all entities
- Advanced search and filtering
- File upload and processing
- Statistics and analytics
- Tree-structured data endpoints

---

## 6. TECHNICAL SPECIFICATIONS

### 6.1 Backend Configuration
- **Database**: PostgreSQL with UUID primary keys
- **Authentication**: JWT with configurable expiration
- **File Storage**: Local filesystem with configurable upload directory
- **Security**: CORS enabled, input validation, SQL injection protection
- **Logging**: Comprehensive audit trail and error logging

### 6.2 Frontend Configuration
- **Build System**: Vite with TypeScript strict mode
- **Styling**: TailwindCSS with custom configuration
- **State Management**: React Context API
- **API Integration**: Axios-based service layer
- **Type Safety**: Full TypeScript coverage

### 6.3 Development Features
- **Hot Reload**: Both backend (uvicorn) and frontend (Vite)
- **Type Safety**: Pydantic models and TypeScript interfaces
- **Error Handling**: Structured error responses
- **Development Tools**: ESLint, PostCSS, debugging support

---

## 7. FUTURE ENHANCEMENTS (NOT YET IMPLEMENTED)

The following features are mentioned in the project description but are not yet implemented:

### 7.1 User Features (Future)
- User registration and account creation
- User profiles and personalization
- Thesis favorites and bookmarking
- User interaction features
- Personal thesis collections

### 7.2 Institutional Features (Future)
- Institution-specific pages
- Key insights and analytics per institution
- Institution highlights and news
- Special offers and announcements
- Institution-specific branding

### 7.3 Advanced Processing (Future)
- Bulk thesis loading through files
- Metadata file import/export
- Automatic metadata matching for bulk operations
- Enhanced AI-powered categorization
- OCR for scanned documents

---

## 8. DEPLOYMENT REQUIREMENTS

### 8.1 System Dependencies
- **Python 3.9+** with FastAPI ecosystem
- **PostgreSQL 17+** database server
- **Node.js 18+** for frontend build
- **Poppler-utils** for PDF processing
- **Google Gemini API key** for metadata extraction

### 8.2 Environment Configuration
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=thesis
DATABASE_USER=postgres
DATABASE_PASSWORD=admin

# JWT Security
JWT_SECRET_KEY=<generated-secret>
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# File Upload
UPLOAD_DIRECTORY=./uploads
MAX_FILE_SIZE_MB=100

# API Configuration
DEBUG=true
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## 9. API USAGE EXAMPLES

### 9.1 Search Theses
```http
GET /theses?q=machine+learning&university_id=uuid&page=1&limit=20
```

### 9.2 Create University (Admin)
```http
POST /admin/universities
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name_fr": "Université Mohammed V",
  "name_en": "Mohammed V University",
  "acronym": "UM5",
  "geographic_entities_id": "uuid"
}
```

### 9.3 Upload Thesis File (Admin)
```http
POST /admin/thesis-content/upload-file
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>

file: <pdf-file>
```

---

## 10. SUMMARY

**theses.ma** is a fully functional thesis repository platform with:

- **Complete backend API** (98 endpoints) with PostgreSQL database
- **Modern React frontend** with TypeScript and responsive design
- **Role-based admin panel** for content management
- **Advanced search capabilities** with multiple filters
- **Automated metadata extraction** using AI
- **Comprehensive data model** supporting Moroccan academic institutions
- **Production-ready architecture** with security and scalability considerations

The platform currently provides all core functionality for thesis management, search, and administration. Future enhancements will focus on user engagement features and advanced institutional capabilities.