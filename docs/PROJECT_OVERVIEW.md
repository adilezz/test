## theses.ma — System Overview (Implemented Features Only)

This document summarizes the actual, working parts of the theses.ma repository so LLMs can understand the project without reading all files. It reflects only features that exist in code today.

### TL;DR
- Public: search theses with rich filters, browse trees/lists of reference data, and download thesis files.
- Admin: full CRUD over reference data (universities, faculties, departments, schools, categories, keywords, academic persons, degrees, languages, geographic entities), upload PDF, create/manual-publish theses, and manage thesis relations.
- Auth: login, logout, refresh, profile view/update, change password. No backend registration endpoint.

## Architecture
- Backend: FastAPI + PostgreSQL (psycopg2), JWT auth, file uploads, and a broad REST API.
  - Entrypoint: `main.py`
  - DB schema: `thesis.txt` (PostgreSQL dump with tables, FKs, triggers)
- Frontend: React + TypeScript + Vite + TailwindCSS (under `UI/`).
  - API service: `UI/src/services/api.ts`
  - Global contexts: `AuthContext`, `SearchContext`
  - Admin and public pages under `UI/src/components/pages/`

## Data Model (from thesis.txt)
Core entities and relationships used by the API/UI:
- Institutions hierarchy
  - `universities` → `faculties` → `departments`; separate `schools` with nesting (`parent_school_id`) and/or a parent university
- Classifications and descriptors
  - `categories` (hierarchical; `parent_id`, `level`), `keywords` (optional `parent_keyword_id`, optional `category_id`)
  - `degrees` (name, type, category) and `languages`
  - `geographic_entities` (country→region→province→city hierarchy)
- People and users
  - `academic_persons` (authors, directors, jury roles)
  - `users`, `user_roles`, `user_sessions`
- Theses and relations
  - `theses`: titles/abstracts (fr/en/ar), institutional links, `degree_id`, `language_id`, `defense_date`, file info (`file_url`, `file_name`), status (draft/submitted/under_review/approved/published/rejected)
  - Many-to-many via `thesis_academic_persons` (role), `thesis_categories` (primary/secondary), `thesis_keywords` (position)
  - Activity tables: `thesis_downloads`, `thesis_views`
- Extraction/logs (present; used by upload flow)
  - `extraction_jobs`, `extraction_batches`, `extracted_metadata`, `audit_logs`

Notable constraints (non-exhaustive):
- FKs from `theses` to institutions, `languages`, and `degrees` (mostly SET NULL on delete)
- Check constraint on `theses.status`
- `set_updated_at()` trigger updates timestamps on several tables

## Backend API (main.py)
Only implemented endpoints listed. Route groups shown by tag.

### Health
- GET `/health`
- GET `/health/db`
- GET `/health/ready`

### Authentication
- POST `/auth/login` — returns access/refresh tokens
- POST `/auth/logout`
- POST `/auth/refresh`
- GET `/auth/profile`
- PUT `/auth/profile`
- POST `/auth/change-password`
- Note: there is no `/auth/register` endpoint in the backend.

### Public — Search, Lists, Trees, Statistics
- GET `/theses` — search with filters (title, author, abstract, keywords, university/faculty/department/category/degree/language, date/year ranges, pagination, sorting)
- GET `/theses/{thesis_id}/download` — downloads thesis file and records a download
- GET `/statistics` — platform statistics
- Lists (paginated):
  - `/universities`, `/faculties`, `/schools`, `/departments`
  - `/categories`, `/academic_persons`, `/degrees`, `/languages`
- Trees (public):
  - `/universities/tree`, `/schools/tree`, `/categories/tree`, `/geographic-entities/tree`

### Admin — Reference Data CRUD
- Universities: GET/POST/GET(id)/PUT(id)/DELETE(id); nested: `/admin/universities/{id}/faculties`, `/admin/universities/tree`
- Faculties: GET/POST/GET(id)/PUT(id)/DELETE(id); nested: `/admin/faculties/{id}/departments`
- Schools: GET/POST/GET(id)/PUT(id)/DELETE(id); nested: `/admin/schools/tree`, `/admin/schools/{id}/children`, `/admin/schools/{id}/departments`
- Departments: GET/POST/GET(id)/PUT(id)/DELETE(id)
- Categories: GET/POST/GET(id)/PUT(id)/DELETE(id); `/admin/categories/tree`, `/admin/categories/{id}/subcategories`
- Keywords: GET/POST/GET(id)/PUT(id)/DELETE(id)
- Academic persons: GET/POST/GET(id)/PUT(id)/DELETE(id); `/admin/academic-persons/search`, merge endpoint
- Degrees: GET/POST/GET(id)/PUT(id)/DELETE(id)
- Languages: GET/POST/GET(id)/PUT(id)/DELETE(id)
- Geographic entities: GET/POST/GET(id)/PUT(id)/DELETE(id); `/admin/geographic-entities/tree`
- Unified references tree:
  - GET `/admin/references/tree` (ref_type: universities|schools|categories|geographic)

### Admin — Thesis Content and Management
- Upload and manual creation flow:
  - POST `/admin/thesis-content/upload-file` — upload PDF, returns `file_id`, `extraction_job_id`
  - GET `/admin/thesis-content/manual/form` — reference data for the manual form
  - POST `/admin/thesis-content/manual/create` — create thesis using uploaded `file_id` and metadata
- Relations (per thesis):
  - POST `/admin/theses/{thesis_id}/academic-persons`
  - POST `/admin/theses/{thesis_id}/categories`
  - POST `/admin/theses/{thesis_id}/keywords`
- Admin theses CRUD:
  - GET `/admin/theses` (searchable list)
  - GET `/admin/theses/{thesis_id}` (details)
  - PUT `/admin/theses/{thesis_id}`
  - DELETE `/admin/theses/{thesis_id}`

## Frontend (UI/) — Implemented Screens and Behaviors

### Global
- `AuthContext` handles login, logout, refresh, profile; tokens in `localStorage`; protected routes (`ProtectedRoute`, `AdminRoute`).
- `SearchContext` queries `/theses` and manages filters, pagination, sort; debounced updates.
- API base: `VITE_API_BASE_URL` (defaults to `/api`).

### Public UI
- Search
  - Page: `SearchResultsPage.tsx` uses `SearchContext` and `EnhancedFilterPanel`.
  - Filters: university (tree), category (tree), language (checkbox), degree (loaded), year/page count ranges, text query, sort.
  - Cards: `EnhancedThesisCard` supports direct download via `/theses/{id}/download` when thesis is `published`.
- Trees/Lists
  - Uses public tree endpoints and public list endpoints (see API above) where linked in the UI.
- Downloads
  - Functional via `apiService.downloadThesis` (backs to `/theses/{id}/download`).
- Thesis detail page
  - `ThesisDetailPage.tsx` currently uses mock data (no API call). Shows a static citation modal (APA/MLA/Chicago examples) and a local-only favorite toggle.
- Registration and profile
  - `RegisterPage.tsx` calls `apiService.register(...)` but backend has no `/auth/register`; thus registration will not work against this backend.
  - `ProfilePage.tsx` renders profile/stats UI; stats are mock values.
- Upload (public)
  - `UploadPage.tsx` is a UI-only wizard; no backend calls (admin upload is implemented; see Admin section).

### Admin UI
- Theses list and edit
  - `AdminThesesListPage.tsx`: uses `/admin/theses` for listing; delete via `/admin/theses/{id}`; direct download available.
  - `AdminThesisPage.tsx`: end-to-end manual flow:
    - Upload PDF to `/admin/thesis-content/upload-file`
    - Load form refs from `/admin/thesis-content/manual/form`
    - Create thesis via `/admin/thesis-content/manual/create`
    - Add persons/categories/keywords via relation endpoints
    - Edit existing thesis via `/admin/theses/{id}`
- Reference data CRUD (all functional)
  - Universities/faculties/departments with trees and lists; Schools with tree and children; Categories, Keywords, Academic Persons; Degrees; Languages; Geographic entities — all use their respective admin endpoints to list/create/update/delete.

## Search Parameters Mapping (UI → API)
- UI `SearchRequest` maps to query params for `/theses` (public) and `/admin/theses` (admin).
  - `q` → `search`
  - `sort_field` → `order_by` (mapped to supported backend fields)
  - `sort_order` → `order_dir`
  - Other filters pass through (arrays become repeated params)

## Authentication Model
- Bearer JWT on requests after login; access token stored in `localStorage`; refresh token stored and used by `AuthContext` on 401.
- Protected routes check `isAuthenticated`; admin routes require `user.role` ∈ {`admin`, `super_admin`}.

## Configuration
- Backend env (see `main.py` Settings):
  - `DATABASE_*`, `JWT_*`, `UPLOAD_DIRECTORY`, CORS origins, pagination defaults
  - Optional Gemini extraction settings present but not required for core flows
- Frontend env: `VITE_API_BASE_URL` (defaults to `/api`)

## Known Gaps / UI Placeholders (no backend wiring yet)
- Public thesis detail page uses mock data (no backend fetch).
- Favorites/bookmarks — UI-only toggle; no endpoints.
- Citation formats — static modal; no citation export endpoints.
- Registration — UI calls `/auth/register`, but backend does not implement it.
- Public upload wizard — UI-only; admin upload flow is the functional path.
- Bulk download — button placeholder in search results.
- Some public routes show “Coming Soon” (e.g., `/universities`, `/categories`).

## Repository Layout (key paths)
- Backend: `main.py`, `requirements.txt`
- DB schema: `thesis.txt`
- Frontend: `UI/`
  - Service: `UI/src/services/api.ts`
  - Types: `UI/src/types/*.ts`
  - Contexts: `UI/src/contexts/*.tsx`
  - Pages: `UI/src/components/pages/*.tsx`
  - UI components: `UI/src/components/ui/*`

---
This overview is intentionally concise and implementation-accurate. For details, consult `main.py`, `thesis.txt`, and `UI/src/services/api.ts`.

