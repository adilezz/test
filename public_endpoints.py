"""
Public API Endpoints for theses.ma
These endpoints are accessible without authentication
"""

from fastapi import APIRouter, HTTPException, Query, Path, Depends, Request
from fastapi.responses import FileResponse, StreamingResponse
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import json
from pathlib import Path as FilePath
import mimetypes

# Import from main.py (these would be imported from the main module)
from pydantic import BaseModel, Field
from enum import Enum

# Create router for public endpoints
router = APIRouter(prefix="/api/v1", tags=["Public"])

# =============================================================================
# RESPONSE MODELS
# =============================================================================

class ThesisSearchResponse(BaseModel):
    """Response model for thesis search results"""
    id: str
    title_fr: str
    title_ar: Optional[str] = None
    title_en: Optional[str] = None
    author_name: str
    director_name: str
    university_name: str
    faculty_name: Optional[str] = None
    department_name: Optional[str] = None
    defense_date: date
    degree_name: str
    abstract_fr: Optional[str] = None
    abstract_ar: Optional[str] = None
    abstract_en: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    language: str
    page_count: Optional[int] = None
    download_count: int = 0
    view_count: int = 0
    has_file: bool = False
    file_size: Optional[int] = None
    created_at: datetime
    relevance_score: Optional[float] = None

class ThesisDetailResponse(ThesisSearchResponse):
    """Extended response model for thesis details"""
    co_director_name: Optional[str] = None
    jury_members: List[Dict[str, str]] = Field(default_factory=list)
    secondary_languages: List[str] = Field(default_factory=list)
    disciplines: List[Dict[str, str]] = Field(default_factory=list)
    file_url: Optional[str] = None
    preview_url: Optional[str] = None
    citation_count: int = 0
    related_theses: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SearchFilters(BaseModel):
    """Model for search filters"""
    universities: Optional[List[str]] = Field(default=None)
    faculties: Optional[List[str]] = Field(default=None)
    departments: Optional[List[str]] = Field(default=None)
    categories: Optional[List[str]] = Field(default=None)
    disciplines: Optional[List[str]] = Field(default=None)
    degrees: Optional[List[str]] = Field(default=None)
    languages: Optional[List[str]] = Field(default=None)
    authors: Optional[List[str]] = Field(default=None)
    directors: Optional[List[str]] = Field(default=None)
    keywords: Optional[List[str]] = Field(default=None)
    defense_date_from: Optional[date] = Field(default=None)
    defense_date_to: Optional[date] = Field(default=None)
    year_from: Optional[int] = Field(default=None)
    year_to: Optional[int] = Field(default=None)
    has_file: Optional[bool] = Field(default=None)

class SortOption(str, Enum):
    """Sorting options for search results"""
    RELEVANCE = "relevance"
    DATE_DESC = "date_desc"
    DATE_ASC = "date_asc"
    TITLE_ASC = "title_asc"
    TITLE_DESC = "title_desc"
    DOWNLOADS = "downloads"
    VIEWS = "views"
    AUTHOR = "author"

class SearchStatistics(BaseModel):
    """Statistics for search results"""
    total_results: int
    total_pages: int
    current_page: int
    results_per_page: int
    processing_time_ms: float
    facets: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)

# =============================================================================
# PUBLIC THESIS ENDPOINTS
# =============================================================================

@router.get("/theses", response_model=Dict[str, Any])
async def list_theses(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    sort: SortOption = Query(SortOption.DATE_DESC, description="Sort option"),
    language: Optional[str] = Query(None, description="Filter by language"),
    year: Optional[int] = Query(None, description="Filter by year"),
    university_id: Optional[str] = Query(None, description="Filter by university")
):
    """
    List all public theses with basic filtering and pagination.
    Default sorting by date (newest first).
    """
    from main import execute_query, create_paginated_response
    
    try:
        # Build the base query
        base_query = """
            SELECT 
                t.id,
                t.title_fr,
                t.title_ar,
                t.title_en,
                t.abstract_fr,
                t.defense_date,
                t.page_count,
                t.download_count,
                t.view_count,
                t.created_at,
                u.name_fr as university_name,
                f.name_fr as faculty_name,
                d.name_fr as department_name,
                deg.name_fr as degree_name,
                l.name_fr as language_name,
                l.code as language_code,
                ap_author.complete_name_fr as author_name,
                ap_director.complete_name_fr as director_name,
                CASE WHEN tf.id IS NOT NULL THEN true ELSE false END as has_file,
                tf.file_size
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN faculties f ON t.faculty_id = f.id
            LEFT JOIN departments d ON t.department_id = d.id
            LEFT JOIN degrees deg ON t.degree_id = deg.id
            LEFT JOIN languages l ON t.primary_language_id = l.id
            LEFT JOIN thesis_academic_persons tap_author 
                ON t.id = tap_author.thesis_id AND tap_author.role = 'author'
            LEFT JOIN academic_persons ap_author 
                ON tap_author.academic_person_id = ap_author.id
            LEFT JOIN thesis_academic_persons tap_director 
                ON t.id = tap_director.thesis_id AND tap_director.role = 'director'
            LEFT JOIN academic_persons ap_director 
                ON tap_director.academic_person_id = ap_director.id
            LEFT JOIN thesis_files tf ON t.id = tf.thesis_id AND tf.is_primary = true
            WHERE t.status = 'published'
        """
        
        # Add filters
        conditions = []
        params = []
        param_count = 0
        
        if language:
            param_count += 1
            conditions.append(f"l.code = ${param_count}")
            params.append(language)
        
        if year:
            param_count += 1
            conditions.append(f"EXTRACT(YEAR FROM t.defense_date) = ${param_count}")
            params.append(year)
        
        if university_id:
            param_count += 1
            conditions.append(f"t.university_id = ${param_count}::uuid")
            params.append(university_id)
        
        # Combine conditions
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        # Add sorting
        sort_clause = {
            SortOption.DATE_DESC: "t.defense_date DESC NULLS LAST",
            SortOption.DATE_ASC: "t.defense_date ASC NULLS LAST",
            SortOption.TITLE_ASC: "t.title_fr ASC",
            SortOption.TITLE_DESC: "t.title_fr DESC",
            SortOption.DOWNLOADS: "t.download_count DESC",
            SortOption.VIEWS: "t.view_count DESC",
            SortOption.AUTHOR: "author_name ASC",
            SortOption.RELEVANCE: "t.created_at DESC"  # Default for now
        }
        
        base_query += f" ORDER BY {sort_clause[sort]}"
        
        # Get total count
        count_query = f"""
            SELECT COUNT(*) as total
            FROM theses t
            LEFT JOIN languages l ON t.primary_language_id = l.id
            WHERE t.status = 'published'
            {" AND " + " AND ".join(conditions) if conditions else ""}
        """
        
        total_result = execute_query(count_query, params, fetch_one=True)
        total_count = total_result['total'] if total_result else 0
        
        # Add pagination
        offset = (page - 1) * limit
        param_count += 1
        base_query += f" LIMIT ${param_count}"
        params.append(limit)
        param_count += 1
        base_query += f" OFFSET ${param_count}"
        params.append(offset)
        
        # Execute query
        results = execute_query(base_query, params, fetch_all=True)
        
        # Format results
        formatted_results = []
        for row in results:
            # Get keywords for this thesis
            keyword_query = """
                SELECT k.name_fr 
                FROM thesis_keywords tk
                JOIN keywords k ON tk.keyword_id = k.id
                WHERE tk.thesis_id = $1
            """
            keywords = execute_query(keyword_query, [row['id']], fetch_all=True)
            
            # Get categories for this thesis
            category_query = """
                SELECT c.name_fr 
                FROM thesis_categories tc
                JOIN categories c ON tc.category_id = c.id
                WHERE tc.thesis_id = $1
            """
            categories = execute_query(category_query, [row['id']], fetch_all=True)
            
            formatted_results.append(ThesisSearchResponse(
                id=str(row['id']),
                title_fr=row['title_fr'],
                title_ar=row.get('title_ar'),
                title_en=row.get('title_en'),
                author_name=row.get('author_name', 'Unknown'),
                director_name=row.get('director_name', 'Unknown'),
                university_name=row.get('university_name', 'Unknown'),
                faculty_name=row.get('faculty_name'),
                department_name=row.get('department_name'),
                defense_date=row['defense_date'],
                degree_name=row.get('degree_name', 'Unknown'),
                abstract_fr=row.get('abstract_fr'),
                keywords=[k['name_fr'] for k in keywords] if keywords else [],
                categories=[c['name_fr'] for c in categories] if categories else [],
                language=row.get('language_code', 'fr'),
                page_count=row.get('page_count'),
                download_count=row.get('download_count', 0),
                view_count=row.get('view_count', 0),
                has_file=row.get('has_file', False),
                file_size=row.get('file_size'),
                created_at=row['created_at']
            ))
        
        return create_paginated_response(
            data=[thesis.dict() for thesis in formatted_results],
            total=total_count,
            page=page,
            limit=limit,
            message="Theses retrieved successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve theses: {str(e)}"
        )

@router.get("/theses/search", response_model=Dict[str, Any])
async def search_theses(
    request: Request,
    q: Optional[str] = Query(None, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    sort: SortOption = Query(SortOption.RELEVANCE, description="Sort option"),
    # Filters
    university_ids: Optional[str] = Query(None, description="Comma-separated university IDs"),
    faculty_ids: Optional[str] = Query(None, description="Comma-separated faculty IDs"),
    department_ids: Optional[str] = Query(None, description="Comma-separated department IDs"),
    category_ids: Optional[str] = Query(None, description="Comma-separated category IDs"),
    degree_ids: Optional[str] = Query(None, description="Comma-separated degree IDs"),
    language_codes: Optional[str] = Query(None, description="Comma-separated language codes"),
    keywords: Optional[str] = Query(None, description="Comma-separated keywords"),
    date_from: Optional[date] = Query(None, description="Defense date from"),
    date_to: Optional[date] = Query(None, description="Defense date to"),
    year_from: Optional[int] = Query(None, description="Year from"),
    year_to: Optional[int] = Query(None, description="Year to"),
    has_file: Optional[bool] = Query(None, description="Has downloadable file"),
    include_facets: bool = Query(False, description="Include faceted search results")
):
    """
    Advanced search endpoint with full-text search and multiple filters.
    Supports faceted search for filter refinement.
    """
    from main import execute_query, create_paginated_response
    import time
    
    start_time = time.time()
    
    try:
        # Build the search query with full-text search if query provided
        if q and len(q.strip()) >= 2:
            # Use PostgreSQL full-text search
            search_query = """
                WITH search_results AS (
                    SELECT 
                        t.id,
                        t.title_fr,
                        t.title_ar,
                        t.title_en,
                        t.abstract_fr,
                        t.abstract_ar,
                        t.abstract_en,
                        t.defense_date,
                        t.page_count,
                        t.download_count,
                        t.view_count,
                        t.created_at,
                        u.name_fr as university_name,
                        f.name_fr as faculty_name,
                        d.name_fr as department_name,
                        deg.name_fr as degree_name,
                        l.name_fr as language_name,
                        l.code as language_code,
                        ap_author.complete_name_fr as author_name,
                        ap_director.complete_name_fr as director_name,
                        CASE WHEN tf.id IS NOT NULL THEN true ELSE false END as has_file,
                        tf.file_size,
                        -- Calculate relevance score
                        ts_rank_cd(
                            setweight(to_tsvector('french', COALESCE(t.title_fr, '')), 'A') ||
                            setweight(to_tsvector('french', COALESCE(t.abstract_fr, '')), 'B') ||
                            setweight(to_tsvector('french', COALESCE(ap_author.complete_name_fr, '')), 'C') ||
                            setweight(to_tsvector('french', COALESCE(string_agg(k.name_fr, ' '), '')), 'D'),
                            plainto_tsquery('french', $1)
                        ) as relevance_score
                    FROM theses t
                    LEFT JOIN universities u ON t.university_id = u.id
                    LEFT JOIN faculties f ON t.faculty_id = f.id
                    LEFT JOIN departments d ON t.department_id = d.id
                    LEFT JOIN degrees deg ON t.degree_id = deg.id
                    LEFT JOIN languages l ON t.primary_language_id = l.id
                    LEFT JOIN thesis_academic_persons tap_author 
                        ON t.id = tap_author.thesis_id AND tap_author.role = 'author'
                    LEFT JOIN academic_persons ap_author 
                        ON tap_author.academic_person_id = ap_author.id
                    LEFT JOIN thesis_academic_persons tap_director 
                        ON t.id = tap_director.thesis_id AND tap_director.role = 'director'
                    LEFT JOIN academic_persons ap_director 
                        ON tap_director.academic_person_id = ap_director.id
                    LEFT JOIN thesis_files tf ON t.id = tf.thesis_id AND tf.is_primary = true
                    LEFT JOIN thesis_keywords tk ON t.id = tk.thesis_id
                    LEFT JOIN keywords k ON tk.keyword_id = k.id
                    WHERE t.status = 'published'
                    AND (
                        to_tsvector('french', COALESCE(t.title_fr, '')) @@ plainto_tsquery('french', $1)
                        OR to_tsvector('french', COALESCE(t.abstract_fr, '')) @@ plainto_tsquery('french', $1)
                        OR to_tsvector('french', COALESCE(ap_author.complete_name_fr, '')) @@ plainto_tsquery('french', $1)
                        OR to_tsvector('french', COALESCE(ap_director.complete_name_fr, '')) @@ plainto_tsquery('french', $1)
                        OR EXISTS (
                            SELECT 1 FROM thesis_keywords tk2
                            JOIN keywords k2 ON tk2.keyword_id = k2.id
                            WHERE tk2.thesis_id = t.id
                            AND to_tsvector('french', k2.name_fr) @@ plainto_tsquery('french', $1)
                        )
                    )
                    GROUP BY 
                        t.id, t.title_fr, t.title_ar, t.title_en, t.abstract_fr, t.abstract_ar,
                        t.abstract_en, t.defense_date, t.page_count, t.download_count, t.view_count,
                        t.created_at, u.name_fr, f.name_fr, d.name_fr, deg.name_fr, l.name_fr,
                        l.code, ap_author.complete_name_fr, ap_director.complete_name_fr, tf.id, tf.file_size
                )
                SELECT * FROM search_results WHERE 1=1
            """
            params = [q]
            param_count = 1
        else:
            # No search query, just filter
            search_query = """
                SELECT 
                    t.id,
                    t.title_fr,
                    t.title_ar,
                    t.title_en,
                    t.abstract_fr,
                    t.defense_date,
                    t.page_count,
                    t.download_count,
                    t.view_count,
                    t.created_at,
                    u.name_fr as university_name,
                    f.name_fr as faculty_name,
                    d.name_fr as department_name,
                    deg.name_fr as degree_name,
                    l.name_fr as language_name,
                    l.code as language_code,
                    ap_author.complete_name_fr as author_name,
                    ap_director.complete_name_fr as director_name,
                    CASE WHEN tf.id IS NOT NULL THEN true ELSE false END as has_file,
                    tf.file_size,
                    0 as relevance_score
                FROM theses t
                LEFT JOIN universities u ON t.university_id = u.id
                LEFT JOIN faculties f ON t.faculty_id = f.id
                LEFT JOIN departments d ON t.department_id = d.id
                LEFT JOIN degrees deg ON t.degree_id = deg.id
                LEFT JOIN languages l ON t.primary_language_id = l.id
                LEFT JOIN thesis_academic_persons tap_author 
                    ON t.id = tap_author.thesis_id AND tap_author.role = 'author'
                LEFT JOIN academic_persons ap_author 
                    ON tap_author.academic_person_id = ap_author.id
                LEFT JOIN thesis_academic_persons tap_director 
                    ON t.id = tap_director.thesis_id AND tap_director.role = 'director'
                LEFT JOIN academic_persons ap_director 
                    ON tap_director.academic_person_id = ap_director.id
                LEFT JOIN thesis_files tf ON t.id = tf.thesis_id AND tf.is_primary = true
                WHERE t.status = 'published'
            """
            params = []
            param_count = 0
        
        # Apply filters
        conditions = []
        
        if university_ids:
            param_count += 1
            university_list = university_ids.split(',')
            conditions.append(f"t.university_id = ANY(${param_count}::uuid[])")
            params.append(university_list)
        
        if faculty_ids:
            param_count += 1
            faculty_list = faculty_ids.split(',')
            conditions.append(f"t.faculty_id = ANY(${param_count}::uuid[])")
            params.append(faculty_list)
        
        if department_ids:
            param_count += 1
            department_list = department_ids.split(',')
            conditions.append(f"t.department_id = ANY(${param_count}::uuid[])")
            params.append(department_list)
        
        if category_ids:
            param_count += 1
            category_list = category_ids.split(',')
            conditions.append(f"""
                EXISTS (
                    SELECT 1 FROM thesis_categories tc 
                    WHERE tc.thesis_id = t.id 
                    AND tc.category_id = ANY(${param_count}::uuid[])
                )
            """)
            params.append(category_list)
        
        if degree_ids:
            param_count += 1
            degree_list = degree_ids.split(',')
            conditions.append(f"t.degree_id = ANY(${param_count}::uuid[])")
            params.append(degree_list)
        
        if language_codes:
            param_count += 1
            language_list = language_codes.split(',')
            conditions.append(f"l.code = ANY(${param_count}::text[])")
            params.append(language_list)
        
        if keywords:
            param_count += 1
            keyword_list = keywords.split(',')
            conditions.append(f"""
                EXISTS (
                    SELECT 1 FROM thesis_keywords tk
                    JOIN keywords k ON tk.keyword_id = k.id
                    WHERE tk.thesis_id = t.id
                    AND LOWER(k.name_fr) = ANY(${param_count}::text[])
                )
            """)
            params.append([k.lower().strip() for k in keyword_list])
        
        if date_from:
            param_count += 1
            conditions.append(f"t.defense_date >= ${param_count}")
            params.append(date_from)
        
        if date_to:
            param_count += 1
            conditions.append(f"t.defense_date <= ${param_count}")
            params.append(date_to)
        
        if year_from:
            param_count += 1
            conditions.append(f"EXTRACT(YEAR FROM t.defense_date) >= ${param_count}")
            params.append(year_from)
        
        if year_to:
            param_count += 1
            conditions.append(f"EXTRACT(YEAR FROM t.defense_date) <= ${param_count}")
            params.append(year_to)
        
        if has_file is not None:
            if has_file:
                conditions.append("tf.id IS NOT NULL")
            else:
                conditions.append("tf.id IS NULL")
        
        # Add conditions to query
        if conditions:
            search_query += " AND " + " AND ".join(conditions)
        
        # Add sorting
        sort_clause = {
            SortOption.RELEVANCE: "relevance_score DESC, t.defense_date DESC",
            SortOption.DATE_DESC: "t.defense_date DESC NULLS LAST",
            SortOption.DATE_ASC: "t.defense_date ASC NULLS LAST",
            SortOption.TITLE_ASC: "t.title_fr ASC",
            SortOption.TITLE_DESC: "t.title_fr DESC",
            SortOption.DOWNLOADS: "t.download_count DESC",
            SortOption.VIEWS: "t.view_count DESC",
            SortOption.AUTHOR: "author_name ASC"
        }
        
        search_query += f" ORDER BY {sort_clause[sort]}"
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM ({search_query}) as search_count"
        total_result = execute_query(count_query, params, fetch_one=True)
        total_count = total_result['total'] if total_result else 0
        
        # Add pagination
        offset = (page - 1) * limit
        param_count += 1
        search_query += f" LIMIT ${param_count}"
        params.append(limit)
        param_count += 1
        search_query += f" OFFSET ${param_count}"
        params.append(offset)
        
        # Execute search
        results = execute_query(search_query, params, fetch_all=True)
        
        # Format results
        formatted_results = []
        for row in results:
            # Get keywords and categories (same as before)
            keyword_query = """
                SELECT k.name_fr FROM thesis_keywords tk
                JOIN keywords k ON tk.keyword_id = k.id
                WHERE tk.thesis_id = $1
            """
            keywords_result = execute_query(keyword_query, [row['id']], fetch_all=True)
            
            category_query = """
                SELECT c.name_fr FROM thesis_categories tc
                JOIN categories c ON tc.category_id = c.id
                WHERE tc.thesis_id = $1
            """
            categories_result = execute_query(category_query, [row['id']], fetch_all=True)
            
            formatted_results.append(ThesisSearchResponse(
                id=str(row['id']),
                title_fr=row['title_fr'],
                title_ar=row.get('title_ar'),
                title_en=row.get('title_en'),
                author_name=row.get('author_name', 'Unknown'),
                director_name=row.get('director_name', 'Unknown'),
                university_name=row.get('university_name', 'Unknown'),
                faculty_name=row.get('faculty_name'),
                department_name=row.get('department_name'),
                defense_date=row['defense_date'],
                degree_name=row.get('degree_name', 'Unknown'),
                abstract_fr=row.get('abstract_fr'),
                keywords=[k['name_fr'] for k in keywords_result] if keywords_result else [],
                categories=[c['name_fr'] for c in categories_result] if categories_result else [],
                language=row.get('language_code', 'fr'),
                page_count=row.get('page_count'),
                download_count=row.get('download_count', 0),
                view_count=row.get('view_count', 0),
                has_file=row.get('has_file', False),
                file_size=row.get('file_size'),
                created_at=row['created_at'],
                relevance_score=row.get('relevance_score', 0) if q else None
            ))
        
        # Calculate facets if requested
        facets = {}
        if include_facets:
            # University facets
            uni_facet_query = """
                SELECT u.id, u.name_fr, COUNT(t.id) as count
                FROM universities u
                JOIN theses t ON t.university_id = u.id
                WHERE t.status = 'published'
                GROUP BY u.id, u.name_fr
                ORDER BY count DESC
                LIMIT 10
            """
            uni_facets = execute_query(uni_facet_query, [], fetch_all=True)
            facets['universities'] = [
                {'id': str(f['id']), 'name': f['name_fr'], 'count': f['count']}
                for f in uni_facets
            ] if uni_facets else []
            
            # Category facets
            cat_facet_query = """
                SELECT c.id, c.name_fr, COUNT(tc.thesis_id) as count
                FROM categories c
                JOIN thesis_categories tc ON tc.category_id = c.id
                JOIN theses t ON tc.thesis_id = t.id
                WHERE t.status = 'published'
                GROUP BY c.id, c.name_fr
                ORDER BY count DESC
                LIMIT 10
            """
            cat_facets = execute_query(cat_facet_query, [], fetch_all=True)
            facets['categories'] = [
                {'id': str(f['id']), 'name': f['name_fr'], 'count': f['count']}
                for f in cat_facets
            ] if cat_facets else []
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000
        
        # Prepare response with statistics
        response = create_paginated_response(
            data=[thesis.dict() for thesis in formatted_results],
            total=total_count,
            page=page,
            limit=limit,
            message="Search completed successfully"
        )
        
        # Add search statistics
        response['statistics'] = SearchStatistics(
            total_results=total_count,
            total_pages=(total_count + limit - 1) // limit,
            current_page=page,
            results_per_page=limit,
            processing_time_ms=processing_time,
            facets=facets
        ).dict()
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )

@router.get("/theses/recent", response_model=Dict[str, Any])
async def get_recent_theses(
    request: Request,
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    limit: int = Query(10, ge=1, le=50, description="Number of results")
):
    """
    Get recently published theses within the specified number of days.
    """
    from main import execute_query
    from datetime import timedelta
    
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        query = """
            SELECT 
                t.id,
                t.title_fr,
                t.title_ar,
                t.defense_date,
                t.created_at,
                t.download_count,
                t.view_count,
                u.name_fr as university_name,
                deg.name_fr as degree_name,
                ap.complete_name_fr as author_name
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN degrees deg ON t.degree_id = deg.id
            LEFT JOIN thesis_academic_persons tap 
                ON t.id = tap.thesis_id AND tap.role = 'author'
            LEFT JOIN academic_persons ap ON tap.academic_person_id = ap.id
            WHERE t.status = 'published'
            AND t.created_at >= $1
            ORDER BY t.created_at DESC
            LIMIT $2
        """
        
        results = execute_query(query, [cutoff_date, limit], fetch_all=True)
        
        formatted_results = []
        for row in results:
            formatted_results.append({
                'id': str(row['id']),
                'title': row['title_fr'],
                'title_ar': row.get('title_ar'),
                'author': row.get('author_name', 'Unknown'),
                'university': row.get('university_name', 'Unknown'),
                'degree': row.get('degree_name', 'Unknown'),
                'defense_date': row['defense_date'].isoformat() if row['defense_date'] else None,
                'published_date': row['created_at'].isoformat(),
                'downloads': row.get('download_count', 0),
                'views': row.get('view_count', 0)
            })
        
        return {
            'success': True,
            'data': formatted_results,
            'count': len(formatted_results),
            'period_days': days,
            'message': f"Retrieved {len(formatted_results)} recent theses from the last {days} days"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve recent theses: {str(e)}"
        )

@router.get("/theses/popular", response_model=Dict[str, Any])
async def get_popular_theses(
    request: Request,
    metric: str = Query("downloads", regex="^(downloads|views|combined)$", description="Popularity metric"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
    period: Optional[str] = Query(None, regex="^(week|month|year|all)$", description="Time period")
):
    """
    Get most popular theses based on downloads, views, or combined score.
    """
    from main import execute_query
    from datetime import timedelta
    
    try:
        # Build date filter if period specified
        date_filter = ""
        params = []
        if period and period != "all":
            if period == "week":
                cutoff = datetime.now() - timedelta(days=7)
            elif period == "month":
                cutoff = datetime.now() - timedelta(days=30)
            else:  # year
                cutoff = datetime.now() - timedelta(days=365)
            
            date_filter = "AND t.created_at >= $1"
            params.append(cutoff)
        
        # Build order clause based on metric
        if metric == "downloads":
            order_clause = "t.download_count DESC"
        elif metric == "views":
            order_clause = "t.view_count DESC"
        else:  # combined
            order_clause = "(t.download_count + t.view_count) DESC"
        
        # Adjust parameter placeholders
        limit_param = "$2" if params else "$1"
        
        query = f"""
            SELECT 
                t.id,
                t.title_fr,
                t.title_ar,
                t.defense_date,
                t.download_count,
                t.view_count,
                t.citation_count,
                (t.download_count + t.view_count) as total_interactions,
                u.name_fr as university_name,
                deg.name_fr as degree_name,
                ap.complete_name_fr as author_name,
                ARRAY_AGG(DISTINCT k.name_fr) FILTER (WHERE k.id IS NOT NULL) as keywords
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN degrees deg ON t.degree_id = deg.id
            LEFT JOIN thesis_academic_persons tap 
                ON t.id = tap.thesis_id AND tap.role = 'author'
            LEFT JOIN academic_persons ap ON tap.academic_person_id = ap.id
            LEFT JOIN thesis_keywords tk ON t.id = tk.thesis_id
            LEFT JOIN keywords k ON tk.keyword_id = k.id
            WHERE t.status = 'published'
            {date_filter}
            GROUP BY t.id, t.title_fr, t.title_ar, t.defense_date, t.download_count,
                     t.view_count, t.citation_count, u.name_fr, deg.name_fr, ap.complete_name_fr
            ORDER BY {order_clause}
            LIMIT {limit_param}
        """
        
        params.append(limit)
        results = execute_query(query, params, fetch_all=True)
        
        formatted_results = []
        for idx, row in enumerate(results, 1):
            formatted_results.append({
                'rank': idx,
                'id': str(row['id']),
                'title': row['title_fr'],
                'title_ar': row.get('title_ar'),
                'author': row.get('author_name', 'Unknown'),
                'university': row.get('university_name', 'Unknown'),
                'degree': row.get('degree_name', 'Unknown'),
                'defense_date': row['defense_date'].isoformat() if row['defense_date'] else None,
                'downloads': row['download_count'],
                'views': row['view_count'],
                'citations': row.get('citation_count', 0),
                'total_interactions': row['total_interactions'],
                'keywords': row.get('keywords', []) if row.get('keywords') else []
            })
        
        return {
            'success': True,
            'data': formatted_results,
            'count': len(formatted_results),
            'metric': metric,
            'period': period or 'all',
            'message': f"Retrieved top {len(formatted_results)} theses by {metric}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve popular theses: {str(e)}"
        )

@router.get("/theses/{thesis_id}", response_model=ThesisDetailResponse)
async def get_thesis_details(
    request: Request,
    thesis_id: str = Path(..., description="Thesis ID"),
    include_related: bool = Query(True, description="Include related theses")
):
    """
    Get detailed information about a specific thesis.
    Increments view count on each access.
    """
    from main import execute_query
    
    try:
        # Update view count
        update_query = """
            UPDATE theses 
            SET view_count = view_count + 1 
            WHERE id = $1::uuid
        """
        execute_query(update_query, [thesis_id])
        
        # Get thesis details
        query = """
            SELECT 
                t.*,
                u.name_fr as university_name,
                u.name_ar as university_name_ar,
                f.name_fr as faculty_name,
                f.name_ar as faculty_name_ar,
                d.name_fr as department_name,
                d.name_ar as department_name_ar,
                deg.name_fr as degree_name,
                deg.name_ar as degree_name_ar,
                deg.degree_type,
                l.name_fr as language_name,
                l.code as language_code
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN faculties f ON t.faculty_id = f.id
            LEFT JOIN departments d ON t.department_id = d.id
            LEFT JOIN degrees deg ON t.degree_id = deg.id
            LEFT JOIN languages l ON t.primary_language_id = l.id
            WHERE t.id = $1::uuid
            AND t.status = 'published'
        """
        
        thesis = execute_query(query, [thesis_id], fetch_one=True)
        
        if not thesis:
            raise HTTPException(status_code=404, detail="Thesis not found")
        
        # Get academic persons (author, director, co-director, jury)
        persons_query = """
            SELECT 
                ap.id,
                ap.complete_name_fr,
                ap.complete_name_ar,
                ap.email,
                ap.affiliation,
                tap.role,
                tap.order_index
            FROM thesis_academic_persons tap
            JOIN academic_persons ap ON tap.academic_person_id = ap.id
            WHERE tap.thesis_id = $1::uuid
            ORDER BY tap.role, tap.order_index
        """
        
        persons = execute_query(persons_query, [thesis_id], fetch_all=True)
        
        author_name = None
        director_name = None
        co_director_name = None
        jury_members = []
        
        for person in persons:
            if person['role'] == 'author':
                author_name = person['complete_name_fr']
            elif person['role'] == 'director':
                director_name = person['complete_name_fr']
            elif person['role'] == 'co-director':
                co_director_name = person['complete_name_fr']
            elif person['role'] == 'jury':
                jury_members.append({
                    'id': str(person['id']),
                    'name': person['complete_name_fr'],
                    'name_ar': person.get('complete_name_ar'),
                    'affiliation': person.get('affiliation')
                })
        
        # Get keywords
        keywords_query = """
            SELECT k.id, k.name_fr, k.name_ar, k.name_en
            FROM thesis_keywords tk
            JOIN keywords k ON tk.keyword_id = k.id
            WHERE tk.thesis_id = $1::uuid
        """
        keywords = execute_query(keywords_query, [thesis_id], fetch_all=True)
        
        # Get categories/disciplines
        categories_query = """
            SELECT 
                c.id, 
                c.name_fr, 
                c.name_ar, 
                c.name_en,
                c.level,
                pc.name_fr as parent_name
            FROM thesis_categories tc
            JOIN categories c ON tc.category_id = c.id
            LEFT JOIN categories pc ON c.parent_id = pc.id
            WHERE tc.thesis_id = $1::uuid
            ORDER BY c.level
        """
        categories = execute_query(categories_query, [thesis_id], fetch_all=True)
        
        disciplines = []
        for cat in categories:
            disciplines.append({
                'id': str(cat['id']),
                'name': cat['name_fr'],
                'name_ar': cat.get('name_ar'),
                'level': cat['level'],
                'parent': cat.get('parent_name')
            })
        
        # Get secondary languages
        sec_lang_query = """
            SELECT l.id, l.name_fr, l.code
            FROM thesis_secondary_languages tsl
            JOIN languages l ON tsl.language_id = l.id
            WHERE tsl.thesis_id = $1::uuid
        """
        sec_languages = execute_query(sec_lang_query, [thesis_id], fetch_all=True)
        
        # Get file information
        file_query = """
            SELECT 
                id,
                file_path,
                file_size,
                file_hash,
                is_primary,
                created_at
            FROM thesis_files
            WHERE thesis_id = $1::uuid
            AND is_primary = true
        """
        file_info = execute_query(file_query, [thesis_id], fetch_one=True)
        
        # Get related theses if requested
        related_theses = []
        if include_related:
            # Find related by keywords and categories
            related_query = """
                WITH thesis_keywords AS (
                    SELECT keyword_id FROM thesis_keywords WHERE thesis_id = $1::uuid
                ),
                thesis_categories AS (
                    SELECT category_id FROM thesis_categories WHERE thesis_id = $1::uuid
                )
                SELECT DISTINCT
                    t.id,
                    t.title_fr,
                    t.defense_date,
                    ap.complete_name_fr as author_name,
                    COUNT(DISTINCT tk.keyword_id) as keyword_matches,
                    COUNT(DISTINCT tc.category_id) as category_matches
                FROM theses t
                LEFT JOIN thesis_keywords tk ON t.id = tk.thesis_id 
                    AND tk.keyword_id IN (SELECT keyword_id FROM thesis_keywords)
                LEFT JOIN thesis_categories tc ON t.id = tc.thesis_id
                    AND tc.category_id IN (SELECT category_id FROM thesis_categories)
                LEFT JOIN thesis_academic_persons tap ON t.id = tap.thesis_id AND tap.role = 'author'
                LEFT JOIN academic_persons ap ON tap.academic_person_id = ap.id
                WHERE t.id != $1::uuid
                AND t.status = 'published'
                AND (tk.keyword_id IS NOT NULL OR tc.category_id IS NOT NULL)
                GROUP BY t.id, t.title_fr, t.defense_date, ap.complete_name_fr
                ORDER BY (COUNT(DISTINCT tk.keyword_id) + COUNT(DISTINCT tc.category_id)) DESC
                LIMIT 5
            """
            
            related = execute_query(related_query, [thesis_id], fetch_all=True)
            for r in related:
                related_theses.append({
                    'id': str(r['id']),
                    'title': r['title_fr'],
                    'author': r.get('author_name', 'Unknown'),
                    'defense_date': r['defense_date'].isoformat() if r['defense_date'] else None,
                    'relevance_score': r['keyword_matches'] + r['category_matches']
                })
        
        # Build file URLs
        file_url = None
        preview_url = None
        if file_info:
            file_url = f"/api/v1/theses/{thesis_id}/download"
            preview_url = f"/api/v1/theses/{thesis_id}/preview"
        
        # Prepare response
        response = ThesisDetailResponse(
            id=str(thesis['id']),
            title_fr=thesis['title_fr'],
            title_ar=thesis.get('title_ar'),
            title_en=thesis.get('title_en'),
            author_name=author_name or 'Unknown',
            director_name=director_name or 'Unknown',
            co_director_name=co_director_name,
            university_name=thesis.get('university_name', 'Unknown'),
            faculty_name=thesis.get('faculty_name'),
            department_name=thesis.get('department_name'),
            defense_date=thesis['defense_date'],
            degree_name=thesis.get('degree_name', 'Unknown'),
            abstract_fr=thesis.get('abstract_fr'),
            abstract_ar=thesis.get('abstract_ar'),
            abstract_en=thesis.get('abstract_en'),
            keywords=[k['name_fr'] for k in keywords] if keywords else [],
            categories=[c['name_fr'] for c in categories] if categories else [],
            language=thesis.get('language_code', 'fr'),
            secondary_languages=[l['code'] for l in sec_languages] if sec_languages else [],
            page_count=thesis.get('page_count'),
            download_count=thesis.get('download_count', 0),
            view_count=thesis.get('view_count', 0),
            citation_count=thesis.get('citation_count', 0),
            has_file=file_info is not None,
            file_size=file_info['file_size'] if file_info else None,
            file_url=file_url,
            preview_url=preview_url,
            created_at=thesis['created_at'],
            jury_members=jury_members,
            disciplines=disciplines,
            related_theses=related_theses,
            metadata={
                'university_name_ar': thesis.get('university_name_ar'),
                'faculty_name_ar': thesis.get('faculty_name_ar'),
                'department_name_ar': thesis.get('department_name_ar'),
                'degree_name_ar': thesis.get('degree_name_ar'),
                'degree_type': thesis.get('degree_type'),
                'updated_at': thesis['updated_at'].isoformat() if thesis.get('updated_at') else None
            }
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve thesis details: {str(e)}"
        )

@router.get("/theses/{thesis_id}/download")
async def download_thesis(
    request: Request,
    thesis_id: str = Path(..., description="Thesis ID")
):
    """
    Download the thesis file.
    Increments download count and logs the download.
    """
    from main import execute_query, PUBLISHED_DIR
    
    try:
        # Check if thesis exists and has a file
        file_query = """
            SELECT 
                tf.id,
                tf.file_path,
                tf.file_name,
                tf.file_size,
                t.title_fr
            FROM thesis_files tf
            JOIN theses t ON tf.thesis_id = t.id
            WHERE tf.thesis_id = $1::uuid
            AND tf.is_primary = true
            AND t.status = 'published'
        """
        
        file_info = execute_query(file_query, [thesis_id], fetch_one=True)
        
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found for this thesis")
        
        # Update download count
        update_query = """
            UPDATE theses 
            SET download_count = download_count + 1 
            WHERE id = $1::uuid
        """
        execute_query(update_query, [thesis_id])
        
        # Log the download
        log_query = """
            INSERT INTO download_logs (thesis_id, ip_address, user_agent, downloaded_at)
            VALUES ($1::uuid, $2, $3, NOW())
        """
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("User-Agent", "unknown")
        execute_query(log_query, [thesis_id, ip_address, user_agent])
        
        # Serve the file
        file_path = FilePath(PUBLISHED_DIR) / file_info['file_path']
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on server")
        
        # Generate filename for download
        safe_title = "".join(c for c in file_info['title_fr'] if c.isalnum() or c in (' ', '-', '_'))[:50]
        filename = f"{safe_title}.pdf"
        
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(file_info['file_size'])
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download thesis: {str(e)}"
        )

@router.get("/theses/{thesis_id}/preview")
async def preview_thesis(
    request: Request,
    thesis_id: str = Path(..., description="Thesis ID"),
    pages: int = Query(10, ge=1, le=50, description="Number of pages to preview")
):
    """
    Preview the first few pages of a thesis.
    This could return a PDF with limited pages or images of pages.
    """
    from main import execute_query, PUBLISHED_DIR
    import PyPDF2
    import io
    
    try:
        # Get file information
        file_query = """
            SELECT 
                tf.file_path,
                tf.file_name,
                t.title_fr
            FROM thesis_files tf
            JOIN theses t ON tf.thesis_id = t.id
            WHERE tf.thesis_id = $1::uuid
            AND tf.is_primary = true
            AND t.status = 'published'
        """
        
        file_info = execute_query(file_query, [thesis_id], fetch_one=True)
        
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found for this thesis")
        
        file_path = FilePath(PUBLISHED_DIR) / file_info['file_path']
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on server")
        
        # Create preview PDF with limited pages
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                pdf_writer = PyPDF2.PdfWriter()
                
                # Add only the specified number of pages
                total_pages = len(pdf_reader.pages)
                preview_pages = min(pages, total_pages)
                
                for i in range(preview_pages):
                    pdf_writer.add_page(pdf_reader.pages[i])
                
                # Add watermark or notice about preview
                # This is a simplified version - you might want to add actual watermarking
                
                # Create preview PDF in memory
                preview_buffer = io.BytesIO()
                pdf_writer.write(preview_buffer)
                preview_buffer.seek(0)
                
                return StreamingResponse(
                    preview_buffer,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f'inline; filename="preview_{file_info["title_fr"][:30]}.pdf"',
                        "X-Preview-Pages": str(preview_pages),
                        "X-Total-Pages": str(total_pages)
                    }
                )
        except Exception as pdf_error:
            # If PDF processing fails, return error
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate preview: {str(pdf_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to preview thesis: {str(e)}"
        )

# =============================================================================
# PUBLIC REFERENCE DATA ENDPOINTS
# =============================================================================

@router.get("/universities", response_model=List[Dict[str, Any]])
async def get_public_universities(
    request: Request,
    active_only: bool = Query(True, description="Return only active universities")
):
    """Get list of all universities for public access"""
    from main import execute_query
    
    try:
        query = """
            SELECT 
                id,
                name_fr,
                name_ar,
                name_en,
                acronym,
                location_id,
                website,
                thesis_count,
                is_active
            FROM universities
            WHERE ($1 = false OR is_active = true)
            ORDER BY name_fr
        """
        
        results = execute_query(query, [active_only], fetch_all=True)
        
        formatted_results = []
        for row in results:
            formatted_results.append({
                'id': str(row['id']),
                'name': row['name_fr'],
                'name_ar': row.get('name_ar'),
                'name_en': row.get('name_en'),
                'acronym': row.get('acronym'),
                'website': row.get('website'),
                'thesis_count': row.get('thesis_count', 0),
                'is_active': row['is_active']
            })
        
        return formatted_results
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve universities: {str(e)}"
        )

@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_public_categories(
    request: Request,
    level: Optional[int] = Query(None, ge=1, le=3, description="Category level"),
    parent_id: Optional[str] = Query(None, description="Parent category ID")
):
    """Get category tree for public access"""
    from main import execute_query
    
    try:
        conditions = []
        params = []
        
        if level is not None:
            conditions.append(f"level = ${len(params) + 1}")
            params.append(level)
        
        if parent_id:
            conditions.append(f"parent_id = ${len(params) + 1}::uuid")
            params.append(parent_id)
        
        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        
        query = f"""
            SELECT 
                id,
                name_fr,
                name_ar,
                name_en,
                level,
                parent_id,
                (SELECT COUNT(*) FROM thesis_categories tc WHERE tc.category_id = c.id) as thesis_count
            FROM categories c
            {where_clause}
            ORDER BY level, name_fr
        """
        
        results = execute_query(query, params, fetch_all=True)
        
        formatted_results = []
        for row in results:
            formatted_results.append({
                'id': str(row['id']),
                'name': row['name_fr'],
                'name_ar': row.get('name_ar'),
                'name_en': row.get('name_en'),
                'level': row['level'],
                'parent_id': str(row['parent_id']) if row['parent_id'] else None,
                'thesis_count': row['thesis_count']
            })
        
        return formatted_results
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve categories: {str(e)}"
        )

@router.get("/keywords/suggest", response_model=List[Dict[str, Any]])
async def suggest_keywords(
    request: Request,
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of suggestions")
):
    """Get keyword suggestions for autocomplete"""
    from main import execute_query
    
    try:
        query = """
            SELECT 
                k.id,
                k.name_fr,
                k.name_ar,
                k.name_en,
                COUNT(tk.thesis_id) as usage_count
            FROM keywords k
            LEFT JOIN thesis_keywords tk ON k.id = tk.keyword_id
            WHERE LOWER(k.name_fr) LIKE LOWER($1)
               OR LOWER(k.name_en) LIKE LOWER($1)
               OR LOWER(k.name_ar) LIKE LOWER($1)
            GROUP BY k.id, k.name_fr, k.name_ar, k.name_en
            ORDER BY usage_count DESC, k.name_fr
            LIMIT $2
        """
        
        results = execute_query(query, [f"%{q}%", limit], fetch_all=True)
        
        formatted_results = []
        for row in results:
            formatted_results.append({
                'id': str(row['id']),
                'name': row['name_fr'],
                'name_ar': row.get('name_ar'),
                'name_en': row.get('name_en'),
                'usage_count': row['usage_count']
            })
        
        return formatted_results
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get keyword suggestions: {str(e)}"
        )

@router.get("/statistics", response_model=Dict[str, Any])
async def get_public_statistics(request: Request):
    """Get public statistics about the thesis repository"""
    from main import execute_query
    
    try:
        stats_query = """
            SELECT 
                (SELECT COUNT(*) FROM theses WHERE status = 'published') as total_theses,
                (SELECT COUNT(*) FROM universities WHERE is_active = true) as total_universities,
                (SELECT COUNT(DISTINCT ap.id) 
                 FROM academic_persons ap 
                 JOIN thesis_academic_persons tap ON ap.id = tap.academic_person_id) as total_authors,
                (SELECT COUNT(*) FROM categories) as total_categories,
                (SELECT SUM(download_count) FROM theses) as total_downloads,
                (SELECT SUM(view_count) FROM theses) as total_views
        """
        
        stats = execute_query(stats_query, fetch_one=True)
        
        # Get top categories
        top_categories_query = """
            SELECT 
                c.name_fr,
                COUNT(tc.thesis_id) as count
            FROM categories c
            JOIN thesis_categories tc ON c.id = tc.category_id
            GROUP BY c.id, c.name_fr
            ORDER BY count DESC
            LIMIT 5
        """
        top_categories = execute_query(top_categories_query, fetch_all=True)
        
        # Get thesis trend by year
        trend_query = """
            SELECT 
                EXTRACT(YEAR FROM defense_date) as year,
                COUNT(*) as count
            FROM theses
            WHERE status = 'published'
            AND defense_date IS NOT NULL
            GROUP BY year
            ORDER BY year DESC
            LIMIT 10
        """
        trends = execute_query(trend_query, fetch_all=True)
        
        return {
            'total_theses': stats['total_theses'],
            'total_universities': stats['total_universities'],
            'total_authors': stats['total_authors'],
            'total_categories': stats['total_categories'],
            'total_downloads': stats['total_downloads'] or 0,
            'total_views': stats['total_views'] or 0,
            'top_categories': [
                {'name': c['name_fr'], 'count': c['count']} 
                for c in top_categories
            ] if top_categories else [],
            'thesis_trends': [
                {'year': int(t['year']), 'count': t['count']} 
                for t in trends
            ] if trends else []
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve statistics: {str(e)}"
        )