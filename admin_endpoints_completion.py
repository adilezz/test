"""
Admin endpoint implementations for categories, keywords, and other missing functionality
These should be integrated into the main.py file
"""

from fastapi import APIRouter, HTTPException, Query, Path, Depends, Request
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

# =============================================================================
# CATEGORY ENDPOINTS IMPLEMENTATION
# =============================================================================

async def get_admin_categories(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    search: Optional[str] = Query(None, description="Search term"),
    level: Optional[int] = Query(None, ge=1, le=3, description="Category level"),
    parent_id: Optional[str] = Query(None, description="Parent category ID"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get paginated list of categories for admin management
    """
    try:
        # Build query with filters
        base_query = """
            SELECT 
                c.id,
                c.name_fr,
                c.name_ar,
                c.name_en,
                c.level,
                c.parent_id,
                c.is_active,
                c.created_at,
                c.updated_at,
                pc.name_fr as parent_name,
                (SELECT COUNT(*) FROM thesis_categories tc WHERE tc.category_id = c.id) as thesis_count,
                (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id) as subcategory_count
            FROM categories c
            LEFT JOIN categories pc ON c.parent_id = pc.id
            WHERE 1=1
        """
        
        conditions = []
        params = []
        
        if search:
            params.append(f"%{search}%")
            conditions.append(f"""
                (LOWER(c.name_fr) LIKE LOWER(${len(params)}) 
                OR LOWER(c.name_ar) LIKE LOWER(${len(params)})
                OR LOWER(c.name_en) LIKE LOWER(${len(params)}))
            """)
        
        if level is not None:
            params.append(level)
            conditions.append(f"c.level = ${len(params)}")
        
        if parent_id:
            params.append(parent_id)
            conditions.append(f"c.parent_id = ${len(params)}::uuid")
        
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM ({base_query}) as count_query"
        total_result = execute_query(count_query, params, fetch_one=True)
        total = total_result['total'] if total_result else 0
        
        # Add pagination
        base_query += " ORDER BY c.level, c.name_fr"
        offset = (page - 1) * limit
        params.extend([limit, offset])
        base_query += f" LIMIT ${len(params)-1} OFFSET ${len(params)}"
        
        # Execute query
        results = execute_query(base_query, params, fetch_all=True)
        
        # Format results
        formatted_results = []
        for row in results:
            formatted_results.append({
                'id': str(row['id']),
                'name_fr': row['name_fr'],
                'name_ar': row.get('name_ar'),
                'name_en': row.get('name_en'),
                'level': row['level'],
                'parent_id': str(row['parent_id']) if row['parent_id'] else None,
                'parent_name': row.get('parent_name'),
                'thesis_count': row['thesis_count'],
                'subcategory_count': row['subcategory_count'],
                'is_active': row['is_active'],
                'created_at': row['created_at'].isoformat(),
                'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
            })
        
        return create_paginated_response(
            data=formatted_results,
            total=total,
            page=page,
            limit=limit,
            message="Categories retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to retrieve categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def create_category(
    request: Request,
    category_data: CategoryCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Create a new category
    """
    try:
        # Validate parent category if provided
        if category_data.parent_id:
            parent_check = execute_query(
                "SELECT id, level FROM categories WHERE id = $1::uuid",
                [str(category_data.parent_id)],
                fetch_one=True
            )
            if not parent_check:
                raise HTTPException(status_code=400, detail="Parent category not found")
            
            # Set level based on parent
            level = parent_check['level'] + 1
            if level > 3:
                raise HTTPException(status_code=400, detail="Maximum category depth is 3 levels")
        else:
            level = 1
        
        # Check for duplicate names at the same level
        duplicate_check = execute_query(
            """
            SELECT id FROM categories 
            WHERE LOWER(name_fr) = LOWER($1) 
            AND level = $2
            AND ($3::uuid IS NULL OR parent_id = $3::uuid)
            """,
            [category_data.name_fr, level, str(category_data.parent_id) if category_data.parent_id else None],
            fetch_one=True
        )
        
        if duplicate_check:
            raise HTTPException(status_code=400, detail="Category with this name already exists at this level")
        
        # Insert new category
        insert_query = """
            INSERT INTO categories (
                name_fr, name_ar, name_en, 
                parent_id, level, is_active,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4::uuid, $5, $6,
                NOW(), NOW()
            ) RETURNING *
        """
        
        result = execute_query(
            insert_query,
            [
                category_data.name_fr,
                category_data.name_ar,
                category_data.name_en,
                str(category_data.parent_id) if category_data.parent_id else None,
                level,
                True
            ],
            fetch_one=True
        )
        
        # Log the action
        log_admin_action(
            admin_user['id'],
            'CREATE_CATEGORY',
            'categories',
            str(result['id']),
            {'name': category_data.name_fr}
        )
        
        return CategoryResponse(
            id=result['id'],
            name_fr=result['name_fr'],
            name_ar=result.get('name_ar'),
            name_en=result.get('name_en'),
            parent_id=result.get('parent_id'),
            level=result['level'],
            is_active=result['is_active'],
            created_at=result['created_at'],
            updated_at=result['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_category_by_id(
    request: Request,
    category_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get category details by ID
    """
    try:
        query = """
            SELECT 
                c.*,
                pc.name_fr as parent_name,
                (SELECT COUNT(*) FROM thesis_categories tc WHERE tc.category_id = c.id) as thesis_count,
                (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id) as subcategory_count
            FROM categories c
            LEFT JOIN categories pc ON c.parent_id = pc.id
            WHERE c.id = $1::uuid
        """
        
        result = execute_query(query, [category_id], fetch_one=True)
        
        if not result:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Get subcategories
        subcategories_query = """
            SELECT id, name_fr, name_ar, name_en 
            FROM categories 
            WHERE parent_id = $1::uuid
            ORDER BY name_fr
        """
        subcategories = execute_query(subcategories_query, [category_id], fetch_all=True)
        
        return {
            'id': str(result['id']),
            'name_fr': result['name_fr'],
            'name_ar': result.get('name_ar'),
            'name_en': result.get('name_en'),
            'parent_id': str(result['parent_id']) if result['parent_id'] else None,
            'parent_name': result.get('parent_name'),
            'level': result['level'],
            'thesis_count': result['thesis_count'],
            'subcategory_count': result['subcategory_count'],
            'subcategories': [
                {
                    'id': str(s['id']),
                    'name_fr': s['name_fr'],
                    'name_ar': s.get('name_ar'),
                    'name_en': s.get('name_en')
                } for s in subcategories
            ] if subcategories else [],
            'is_active': result['is_active'],
            'created_at': result['created_at'].isoformat(),
            'updated_at': result['updated_at'].isoformat() if result['updated_at'] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def update_category(
    request: Request,
    category_id: str,
    update_data: CategoryUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Update category information
    """
    try:
        # Check if category exists
        existing = execute_query(
            "SELECT * FROM categories WHERE id = $1::uuid",
            [category_id],
            fetch_one=True
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Build update query dynamically
        update_fields = []
        params = []
        param_count = 0
        
        if update_data.name_fr is not None:
            param_count += 1
            update_fields.append(f"name_fr = ${param_count}")
            params.append(update_data.name_fr)
        
        if update_data.name_ar is not None:
            param_count += 1
            update_fields.append(f"name_ar = ${param_count}")
            params.append(update_data.name_ar)
        
        if update_data.name_en is not None:
            param_count += 1
            update_fields.append(f"name_en = ${param_count}")
            params.append(update_data.name_en)
        
        if update_data.parent_id is not None:
            # Validate parent and prevent circular references
            if str(update_data.parent_id) == category_id:
                raise HTTPException(status_code=400, detail="Category cannot be its own parent")
            
            # Check if new parent exists and calculate new level
            if update_data.parent_id:
                parent_check = execute_query(
                    "SELECT id, level FROM categories WHERE id = $1::uuid",
                    [str(update_data.parent_id)],
                    fetch_one=True
                )
                if not parent_check:
                    raise HTTPException(status_code=400, detail="Parent category not found")
                new_level = parent_check['level'] + 1
            else:
                new_level = 1
            
            param_count += 1
            update_fields.append(f"parent_id = ${param_count}::uuid")
            params.append(str(update_data.parent_id) if update_data.parent_id else None)
            
            param_count += 1
            update_fields.append(f"level = ${param_count}")
            params.append(new_level)
        
        if update_data.is_active is not None:
            param_count += 1
            update_fields.append(f"is_active = ${param_count}")
            params.append(update_data.is_active)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated_at
        update_fields.append("updated_at = NOW()")
        
        # Add category_id to params
        param_count += 1
        params.append(category_id)
        
        # Execute update
        update_query = f"""
            UPDATE categories 
            SET {', '.join(update_fields)}
            WHERE id = ${param_count}::uuid
            RETURNING *
        """
        
        result = execute_query(update_query, params, fetch_one=True)
        
        # Log the action
        log_admin_action(
            admin_user['id'],
            'UPDATE_CATEGORY',
            'categories',
            category_id,
            update_data.dict(exclude_unset=True)
        )
        
        return CategoryResponse(
            id=result['id'],
            name_fr=result['name_fr'],
            name_ar=result.get('name_ar'),
            name_en=result.get('name_en'),
            parent_id=result.get('parent_id'),
            level=result['level'],
            is_active=result['is_active'],
            created_at=result['created_at'],
            updated_at=result['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def delete_category(
    request: Request,
    category_id: str,
    force: bool = Query(False, description="Force delete even if has theses"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    Delete a category
    """
    try:
        # Check if category exists
        existing = execute_query(
            """
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM thesis_categories tc WHERE tc.category_id = c.id) as thesis_count,
                (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id) as subcategory_count
            FROM categories c
            WHERE c.id = $1::uuid
            """,
            [category_id],
            fetch_one=True
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Check for dependencies
        if existing['subcategory_count'] > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete category with {existing['subcategory_count']} subcategories"
            )
        
        if existing['thesis_count'] > 0 and not force:
            raise HTTPException(
                status_code=400,
                detail=f"Category is used by {existing['thesis_count']} theses. Use force=true to delete anyway"
            )
        
        # Delete category
        execute_query("DELETE FROM categories WHERE id = $1::uuid", [category_id])
        
        # Log the action
        log_admin_action(
            admin_user['id'],
            'DELETE_CATEGORY',
            'categories',
            category_id,
            {'name': existing['name_fr'], 'forced': force}
        )
        
        return create_success_response(
            message=f"Category '{existing['name_fr']}' deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_category_tree(
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get complete category tree structure
    """
    try:
        query = """
            WITH RECURSIVE category_tree AS (
                -- Base case: top-level categories
                SELECT 
                    id, name_fr, name_ar, name_en, 
                    parent_id, level, is_active,
                    ARRAY[id] as path,
                    name_fr as full_path
                FROM categories
                WHERE parent_id IS NULL
                
                UNION ALL
                
                -- Recursive case
                SELECT 
                    c.id, c.name_fr, c.name_ar, c.name_en,
                    c.parent_id, c.level, c.is_active,
                    ct.path || c.id,
                    ct.full_path || ' > ' || c.name_fr
                FROM categories c
                JOIN category_tree ct ON c.parent_id = ct.id
            )
            SELECT 
                ct.*,
                (SELECT COUNT(*) FROM thesis_categories tc WHERE tc.category_id = ct.id) as thesis_count
            FROM category_tree ct
            ORDER BY ct.path
        """
        
        results = execute_query(query, fetch_all=True)
        
        # Build tree structure
        def build_tree(items, parent_id=None):
            tree = []
            for item in items:
                if item['parent_id'] == parent_id:
                    node = {
                        'id': str(item['id']),
                        'name_fr': item['name_fr'],
                        'name_ar': item.get('name_ar'),
                        'name_en': item.get('name_en'),
                        'level': item['level'],
                        'thesis_count': item['thesis_count'],
                        'is_active': item['is_active'],
                        'full_path': item['full_path'],
                        'children': build_tree(items, item['id'])
                    }
                    tree.append(node)
            return tree
        
        tree = build_tree(results)
        
        return tree
        
    except Exception as e:
        logger.error(f"Failed to retrieve category tree: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# KEYWORD ENDPOINTS IMPLEMENTATION
# =============================================================================

async def get_admin_keywords(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    search: Optional[str] = Query(None, description="Search term"),
    type: Optional[str] = Query(None, description="Keyword type"),
    min_usage: Optional[int] = Query(None, ge=0, description="Minimum usage count"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get paginated list of keywords for admin management
    """
    try:
        base_query = """
            SELECT 
                k.id,
                k.name_fr,
                k.name_ar,
                k.name_en,
                k.type,
                k.is_validated,
                k.created_at,
                k.updated_at,
                (SELECT COUNT(*) FROM thesis_keywords tk WHERE tk.keyword_id = k.id) as usage_count
            FROM keywords k
            WHERE 1=1
        """
        
        conditions = []
        params = []
        
        if search:
            params.append(f"%{search}%")
            conditions.append(f"""
                (LOWER(k.name_fr) LIKE LOWER(${len(params)}) 
                OR LOWER(k.name_ar) LIKE LOWER(${len(params)})
                OR LOWER(k.name_en) LIKE LOWER(${len(params)}))
            """)
        
        if type:
            params.append(type)
            conditions.append(f"k.type = ${len(params)}")
        
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        # Add having clause for usage count filter
        if min_usage is not None:
            base_query = f"""
                SELECT * FROM ({base_query}) as keywords_with_count
                WHERE usage_count >= {min_usage}
            """
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM ({base_query}) as count_query"
        total_result = execute_query(count_query, params, fetch_one=True)
        total = total_result['total'] if total_result else 0
        
        # Add sorting and pagination
        base_query += " ORDER BY usage_count DESC, k.name_fr"
        offset = (page - 1) * limit
        params.extend([limit, offset])
        base_query += f" LIMIT ${len(params)-1} OFFSET ${len(params)}"
        
        # Execute query
        results = execute_query(base_query, params, fetch_all=True)
        
        # Format results
        formatted_results = []
        for row in results:
            formatted_results.append({
                'id': str(row['id']),
                'name_fr': row['name_fr'],
                'name_ar': row.get('name_ar'),
                'name_en': row.get('name_en'),
                'type': row.get('type'),
                'usage_count': row['usage_count'],
                'is_validated': row.get('is_validated', False),
                'created_at': row['created_at'].isoformat(),
                'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
            })
        
        return create_paginated_response(
            data=formatted_results,
            total=total,
            page=page,
            limit=limit,
            message="Keywords retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to retrieve keywords: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def create_keyword(
    request: Request,
    keyword_data: KeywordCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Create a new keyword
    """
    try:
        # Check for duplicates
        duplicate_check = execute_query(
            "SELECT id FROM keywords WHERE LOWER(name_fr) = LOWER($1)",
            [keyword_data.name_fr],
            fetch_one=True
        )
        
        if duplicate_check:
            raise HTTPException(status_code=400, detail="Keyword already exists")
        
        # Insert new keyword
        insert_query = """
            INSERT INTO keywords (
                name_fr, name_ar, name_en, 
                type, is_validated,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                NOW(), NOW()
            ) RETURNING *
        """
        
        result = execute_query(
            insert_query,
            [
                keyword_data.name_fr,
                keyword_data.name_ar,
                keyword_data.name_en,
                keyword_data.type,
                True  # Admin-created keywords are validated by default
            ],
            fetch_one=True
        )
        
        # Log the action
        log_admin_action(
            admin_user['id'],
            'CREATE_KEYWORD',
            'keywords',
            str(result['id']),
            {'name': keyword_data.name_fr}
        )
        
        return KeywordResponse(
            id=result['id'],
            name_fr=result['name_fr'],
            name_ar=result.get('name_ar'),
            name_en=result.get('name_en'),
            type=result.get('type'),
            is_validated=result.get('is_validated', True),
            created_at=result['created_at'],
            updated_at=result['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create keyword: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_keyword_by_id(
    request: Request,
    keyword_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Get keyword details by ID
    """
    try:
        query = """
            SELECT 
                k.*,
                (SELECT COUNT(*) FROM thesis_keywords tk WHERE tk.keyword_id = k.id) as usage_count,
                ARRAY_AGG(DISTINCT t.title_fr) FILTER (WHERE t.id IS NOT NULL) as used_in_theses
            FROM keywords k
            LEFT JOIN thesis_keywords tk ON k.id = tk.keyword_id
            LEFT JOIN theses t ON tk.thesis_id = t.id
            WHERE k.id = $1::uuid
            GROUP BY k.id
        """
        
        result = execute_query(query, [keyword_id], fetch_one=True)
        
        if not result:
            raise HTTPException(status_code=404, detail="Keyword not found")
        
        return {
            'id': str(result['id']),
            'name_fr': result['name_fr'],
            'name_ar': result.get('name_ar'),
            'name_en': result.get('name_en'),
            'type': result.get('type'),
            'usage_count': result['usage_count'],
            'is_validated': result.get('is_validated', False),
            'used_in_theses': result.get('used_in_theses', [])[:10],  # Show first 10
            'created_at': result['created_at'].isoformat(),
            'updated_at': result['updated_at'].isoformat() if result['updated_at'] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve keyword: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def update_keyword(
    request: Request,
    keyword_id: str,
    update_data: KeywordUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Update keyword information
    """
    try:
        # Check if keyword exists
        existing = execute_query(
            "SELECT * FROM keywords WHERE id = $1::uuid",
            [keyword_id],
            fetch_one=True
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Keyword not found")
        
        # Build update query
        update_fields = []
        params = []
        param_count = 0
        
        if update_data.name_fr is not None:
            param_count += 1
            update_fields.append(f"name_fr = ${param_count}")
            params.append(update_data.name_fr)
        
        if update_data.name_ar is not None:
            param_count += 1
            update_fields.append(f"name_ar = ${param_count}")
            params.append(update_data.name_ar)
        
        if update_data.name_en is not None:
            param_count += 1
            update_fields.append(f"name_en = ${param_count}")
            params.append(update_data.name_en)
        
        if update_data.type is not None:
            param_count += 1
            update_fields.append(f"type = ${param_count}")
            params.append(update_data.type)
        
        if update_data.is_validated is not None:
            param_count += 1
            update_fields.append(f"is_validated = ${param_count}")
            params.append(update_data.is_validated)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated_at
        update_fields.append("updated_at = NOW()")
        
        # Add keyword_id to params
        param_count += 1
        params.append(keyword_id)
        
        # Execute update
        update_query = f"""
            UPDATE keywords 
            SET {', '.join(update_fields)}
            WHERE id = ${param_count}::uuid
            RETURNING *
        """
        
        result = execute_query(update_query, params, fetch_one=True)
        
        # Log the action
        log_admin_action(
            admin_user['id'],
            'UPDATE_KEYWORD',
            'keywords',
            keyword_id,
            update_data.dict(exclude_unset=True)
        )
        
        return KeywordResponse(
            id=result['id'],
            name_fr=result['name_fr'],
            name_ar=result.get('name_ar'),
            name_en=result.get('name_en'),
            type=result.get('type'),
            is_validated=result.get('is_validated', False),
            created_at=result['created_at'],
            updated_at=result['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update keyword: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def delete_keyword(
    request: Request,
    keyword_id: str,
    force: bool = Query(False, description="Force delete even if used"),
    admin_user: dict = Depends(get_admin_user)
):
    """
    Delete a keyword
    """
    try:
        # Check if keyword exists and get usage count
        existing = execute_query(
            """
            SELECT 
                k.*,
                (SELECT COUNT(*) FROM thesis_keywords tk WHERE tk.keyword_id = k.id) as usage_count
            FROM keywords k
            WHERE k.id = $1::uuid
            """,
            [keyword_id],
            fetch_one=True
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Keyword not found")
        
        # Check usage
        if existing['usage_count'] > 0 and not force:
            raise HTTPException(
                status_code=400,
                detail=f"Keyword is used in {existing['usage_count']} theses. Use force=true to delete anyway"
            )
        
        # Delete keyword (cascade will handle thesis_keywords)
        execute_query("DELETE FROM keywords WHERE id = $1::uuid", [keyword_id])
        
        # Log the action
        log_admin_action(
            admin_user['id'],
            'DELETE_KEYWORD',
            'keywords',
            keyword_id,
            {'name': existing['name_fr'], 'forced': force}
        )
        
        return create_success_response(
            message=f"Keyword '{existing['name_fr']}' deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete keyword: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def merge_keywords(
    request: Request,
    source_id: str,
    target_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Merge two keywords, moving all references from source to target
    """
    try:
        # Check both keywords exist
        source = execute_query(
            "SELECT * FROM keywords WHERE id = $1::uuid",
            [source_id],
            fetch_one=True
        )
        target = execute_query(
            "SELECT * FROM keywords WHERE id = $1::uuid",
            [target_id],
            fetch_one=True
        )
        
        if not source or not target:
            raise HTTPException(status_code=404, detail="Source or target keyword not found")
        
        if source_id == target_id:
            raise HTTPException(status_code=400, detail="Cannot merge keyword with itself")
        
        # Begin transaction
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Update all thesis_keywords references
                cursor.execute("""
                    UPDATE thesis_keywords 
                    SET keyword_id = %s 
                    WHERE keyword_id = %s
                    AND NOT EXISTS (
                        SELECT 1 FROM thesis_keywords tk2 
                        WHERE tk2.thesis_id = thesis_keywords.thesis_id 
                        AND tk2.keyword_id = %s
                    )
                """, (target_id, source_id, target_id))
                
                # Delete duplicate entries
                cursor.execute("""
                    DELETE FROM thesis_keywords 
                    WHERE keyword_id = %s
                """, (source_id,))
                
                # Delete source keyword
                cursor.execute("DELETE FROM keywords WHERE id = %s", (source_id,))
                
                conn.commit()
        
        # Log the action
        log_admin_action(
            admin_user['id'],
            'MERGE_KEYWORDS',
            'keywords',
            target_id,
            {
                'source_id': source_id,
                'source_name': source['name_fr'],
                'target_name': target['name_fr']
            }
        )
        
        return create_success_response(
            message=f"Keyword '{source['name_fr']}' merged into '{target['name_fr']}' successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to merge keywords: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def log_admin_action(user_id: str, action: str, entity_type: str, entity_id: str, details: dict = None):
    """
    Log admin actions for audit trail
    """
    try:
        query = """
            INSERT INTO admin_audit_log (
                user_id, action, entity_type, entity_id, 
                details, created_at
            ) VALUES (
                $1::uuid, $2, $3, $4::uuid, $5::jsonb, NOW()
            )
        """
        execute_query(
            query,
            [user_id, action, entity_type, entity_id, json.dumps(details) if details else None]
        )
    except Exception as e:
        logger.warning(f"Failed to log admin action: {e}")

def validate_uuid(uuid_string: str) -> bool:
    """
    Validate if a string is a valid UUID
    """
    try:
        uuid.UUID(uuid_string)
        return True
    except ValueError:
        return False

# =============================================================================
# LANGUAGE ENDPOINTS COMPLETION
# =============================================================================

async def get_languages(
    request: Request,
    active_only: bool = Query(True, description="Return only active languages")
):
    """
    Get all available languages
    """
    try:
        query = """
            SELECT 
                l.id,
                l.code,
                l.name_fr,
                l.name_ar,
                l.name_en,
                l.is_active,
                (SELECT COUNT(*) FROM theses t WHERE t.primary_language_id = l.id) as thesis_count
            FROM languages l
            WHERE ($1 = false OR l.is_active = true)
            ORDER BY l.name_fr
        """
        
        results = execute_query(query, [active_only], fetch_all=True)
        
        formatted_results = []
        for row in results:
            formatted_results.append({
                'id': str(row['id']),
                'code': row['code'],
                'name_fr': row['name_fr'],
                'name_ar': row.get('name_ar'),
                'name_en': row.get('name_en'),
                'is_active': row['is_active'],
                'thesis_count': row['thesis_count']
            })
        
        return formatted_results
        
    except Exception as e:
        logger.error(f"Failed to retrieve languages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_language_theses(
    request: Request,
    language_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get theses for a specific language
    """
    try:
        # Check if language exists
        language = execute_query(
            "SELECT * FROM languages WHERE id = $1::uuid",
            [language_id],
            fetch_one=True
        )
        
        if not language:
            raise HTTPException(status_code=404, detail="Language not found")
        
        # Get theses
        query = """
            SELECT 
                t.id,
                t.title_fr,
                t.defense_date,
                u.name_fr as university_name,
                ap.complete_name_fr as author_name
            FROM theses t
            LEFT JOIN universities u ON t.university_id = u.id
            LEFT JOIN thesis_academic_persons tap ON t.id = tap.thesis_id AND tap.role = 'author'
            LEFT JOIN academic_persons ap ON tap.academic_person_id = ap.id
            WHERE t.primary_language_id = $1::uuid
            AND t.status = 'published'
            ORDER BY t.defense_date DESC
            LIMIT $2 OFFSET $3
        """
        
        offset = (page - 1) * limit
        results = execute_query(query, [language_id, limit, offset], fetch_all=True)
        
        # Get total count
        count_query = """
            SELECT COUNT(*) as total 
            FROM theses 
            WHERE primary_language_id = $1::uuid 
            AND status = 'published'
        """
        total_result = execute_query(count_query, [language_id], fetch_one=True)
        total = total_result['total'] if total_result else 0
        
        formatted_results = []
        for row in results:
            formatted_results.append({
                'id': str(row['id']),
                'title': row['title_fr'],
                'author': row.get('author_name', 'Unknown'),
                'university': row.get('university_name', 'Unknown'),
                'defense_date': row['defense_date'].isoformat() if row['defense_date'] else None
            })
        
        return {
            'language': {
                'id': str(language['id']),
                'code': language['code'],
                'name': language['name_fr']
            },
            'theses': formatted_results,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'pages': (total + limit - 1) // limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve language theses: {e}")
        raise HTTPException(status_code=500, detail=str(e))