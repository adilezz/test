# Implementation Guide for theses.ma API

## Overview
This guide provides instructions for integrating the completed API endpoints into your existing FastAPI application.

## Files Created

1. **`analysis_report.md`** - Comprehensive analysis of the current state, issues, and recommendations
2. **`public_endpoints.py`** - Complete implementation of public API endpoints
3. **`admin_endpoints_completion.py`** - Missing admin endpoints for categories and keywords
4. **`requirements.txt`** - Python dependencies for the project

## Integration Steps

### 1. Database Schema Fixes

Fix the departments table conflict (line 167-168 in database):
```sql
-- Current (incorrect):
CREATE TABLE departments (
    faculty_id UUID NOT NULL REFERENCES faculties(id),
    school_id UUID NOT NULL REFERENCES schools(id)  -- Both NOT NULL is wrong
    ...
);

-- Should be:
CREATE TABLE departments (
    faculty_id UUID REFERENCES faculties(id),
    school_id UUID REFERENCES schools(id),
    -- Add constraint to ensure at least one is set
    CONSTRAINT check_parent CHECK (
        (faculty_id IS NOT NULL AND school_id IS NULL) OR 
        (faculty_id IS NULL AND school_id IS NOT NULL)
    )
    ...
);
```

### 2. Add Missing Database Tables

Create these tables if they don't exist:
```sql
-- Download logs for tracking
CREATE TABLE download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID REFERENCES theses(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    downloaded_at TIMESTAMP DEFAULT NOW()
);

-- Admin audit log
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_theses_status ON theses(status);
CREATE INDEX idx_theses_defense_date ON theses(defense_date);
CREATE INDEX idx_theses_title_fr ON theses(title_fr);
CREATE INDEX idx_thesis_keywords_thesis ON thesis_keywords(thesis_id);
CREATE INDEX idx_thesis_categories_thesis ON thesis_categories(thesis_id);
```

### 3. Integrate Public Endpoints

Replace the placeholder endpoints at the end of main.py (lines 5991-6000) with the implementations from `public_endpoints.py`:

```python
# In main.py, replace lines 5991-6000 with:

# Import the functions from public_endpoints.py
from public_endpoints import (
    list_theses,
    search_theses,
    get_recent_theses,
    get_popular_theses,
    get_thesis_details,
    download_thesis,
    preview_thesis,
    get_public_universities,
    get_public_categories,
    suggest_keywords,
    get_public_statistics
)

# Register the endpoints
@app.get("/api/v1/theses", response_model=Dict[str, Any], tags=["Public - Thesis"])
async def public_list_theses(request: Request, **kwargs):
    return await list_theses(request, **kwargs)

@app.get("/api/v1/theses/search", response_model=Dict[str, Any], tags=["Public - Thesis"])
async def public_search_theses(request: Request, **kwargs):
    return await search_theses(request, **kwargs)

@app.get("/api/v1/theses/recent", response_model=Dict[str, Any], tags=["Public - Thesis"])
async def public_recent_theses(request: Request, **kwargs):
    return await get_recent_theses(request, **kwargs)

@app.get("/api/v1/theses/popular", response_model=Dict[str, Any], tags=["Public - Thesis"])
async def public_popular_theses(request: Request, **kwargs):
    return await get_popular_theses(request, **kwargs)

@app.get("/api/v1/theses/{thesis_id}", response_model=ThesisDetailResponse, tags=["Public - Thesis"])
async def public_thesis_details(request: Request, thesis_id: str, **kwargs):
    return await get_thesis_details(request, thesis_id, **kwargs)

@app.get("/api/v1/theses/{thesis_id}/download", tags=["Public - Thesis"])
async def public_download_thesis(request: Request, thesis_id: str):
    return await download_thesis(request, thesis_id)

@app.get("/api/v1/theses/{thesis_id}/preview", tags=["Public - Thesis"])
async def public_preview_thesis(request: Request, thesis_id: str, **kwargs):
    return await preview_thesis(request, thesis_id, **kwargs)
```

### 4. Complete Admin Endpoints

Replace the placeholder admin endpoints (lines 4056-4072) with implementations from `admin_endpoints_completion.py`:

```python
# Categories - replace lines 4056-4062
@app.get("/admin/categories", response_model=PaginatedResponse, tags=["Admin - Categories"])
async def admin_get_categories(request: Request, **kwargs):
    return await get_admin_categories(request, **kwargs)

@app.post("/admin/categories", response_model=CategoryResponse, tags=["Admin - Categories"])
async def admin_create_category(request: Request, category_data: CategoryCreate, **kwargs):
    return await create_category(request, category_data, **kwargs)

# ... (similar for other endpoints)

# Keywords - replace lines 4067-4071
@app.get("/admin/keywords", response_model=PaginatedResponse, tags=["Admin - Keywords"])
async def admin_get_keywords(request: Request, **kwargs):
    return await get_admin_keywords(request, **kwargs)

# ... (similar for other endpoints)
```

### 5. Add Full-Text Search Support

Enable PostgreSQL full-text search:
```sql
-- Add text search columns to theses table
ALTER TABLE theses ADD COLUMN search_vector tsvector;

-- Create index for faster searches
CREATE INDEX idx_theses_search ON theses USING GIN(search_vector);

-- Update search vectors
UPDATE theses SET search_vector = 
    setweight(to_tsvector('french', COALESCE(title_fr, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(abstract_fr, '')), 'B');

-- Create trigger to keep search vector updated
CREATE OR REPLACE FUNCTION update_thesis_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('french', COALESCE(NEW.title_fr, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(NEW.abstract_fr, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER thesis_search_vector_update 
BEFORE INSERT OR UPDATE ON theses
FOR EACH ROW EXECUTE FUNCTION update_thesis_search_vector();
```

### 6. Environment Configuration

Create a `.env` file in the project root:
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=thesis
DATABASE_USER=postgres
DATABASE_PASSWORD=admin

# JWT
JWT_SECRET_KEY=your-secret-key-here-change-in-production
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# File Upload
UPLOAD_DIRECTORY=./uploads
MAX_FILE_SIZE_MB=100

# Application
DEBUG=true
LOG_LEVEL=INFO

# CORS (add your frontend URLs)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 7. Error Handling Improvements

Add these utility functions to main.py:
```python
def validate_search_params(params: dict) -> dict:
    """Validate and sanitize search parameters"""
    # Remove empty strings and None values
    cleaned = {k: v for k, v in params.items() if v not in [None, '', []]}
    
    # Validate date ranges
    if 'date_from' in cleaned and 'date_to' in cleaned:
        if cleaned['date_from'] > cleaned['date_to']:
            raise HTTPException(400, "Invalid date range")
    
    return cleaned

def sanitize_query(query: str) -> str:
    """Sanitize search query to prevent injection"""
    # Remove special characters that could break queries
    import re
    return re.sub(r'[^\w\s\-\']', '', query)
```

### 8. Performance Optimizations

Add caching for frequently accessed data:
```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def get_cached_categories():
    """Cache category tree for 5 minutes"""
    return execute_query("SELECT * FROM categories ORDER BY level, name_fr", fetch_all=True)

def invalidate_category_cache():
    """Call this when categories are modified"""
    get_cached_categories.cache_clear()
```

### 9. Testing the Implementation

Test the endpoints:
```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Test public endpoints
curl http://localhost:8000/api/v1/theses
curl http://localhost:8000/api/v1