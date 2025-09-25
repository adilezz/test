#!/usr/bin/env python3
"""
FastAPI Integration for Gemini Metadata Extraction
Integration endpoints for the main FastAPI application
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, BackgroundTasks, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
import os
import tempfile
import asyncio
from datetime import datetime
import logging

# Import our Gemini extractor
from gemini_metadata_extractor import (
    GeminiMetadataExtractor, 
    create_gemini_extractor,
    ExtractionResult,
    ExtractedMetadata
)

# Configure logging
logger = logging.getLogger(__name__)

# Response models
class ExtractionResponse(BaseModel):
    extraction_id: str
    success: bool
    message: str
    metadata: Optional[ExtractedMetadata] = None
    confidence_score: Optional[float] = None
    processing_time: Optional[float] = None
    errors: Optional[List[str]] = None

class BatchExtractionResponse(BaseModel):
    batch_id: str
    total_files: int
    successful_extractions: int
    failed_extractions: int
    results: Dict[str, ExtractionResponse]

class ExtractionJobStatus(BaseModel):
    job_id: str
    status: str  # "pending", "processing", "completed", "failed"
    progress: Optional[int] = None
    total_files: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[BatchExtractionResponse] = None

# Global extractor instance (should be configured in main app)
_extractor: Optional[GeminiMetadataExtractor] = None

def get_extractor() -> GeminiMetadataExtractor:
    """Dependency to get the configured extractor"""
    global _extractor
    if _extractor is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini extractor not configured"
        )
    return _extractor

def configure_extractor(api_key: str, model_name: str = "gemini-1.5-flash"):
    """Configure the global extractor instance"""
    global _extractor
    _extractor = create_gemini_extractor(api_key, model_name)
    logger.info("Gemini metadata extractor configured")

# Create router
router = APIRouter(prefix="/api/v1/metadata", tags=["Metadata Extraction"])

@router.post("/extract", response_model=ExtractionResponse)
async def extract_metadata_from_upload(
    file: UploadFile = File(...),
    extractor: GeminiMetadataExtractor = Depends(get_extractor)
) -> ExtractionResponse:
    """
    Extract metadata from a single uploaded PDF file
    
    Args:
        file: Uploaded PDF file
        extractor: Configured Gemini extractor
        
    Returns:
        Extraction response with metadata
    """
    extraction_id = str(uuid.uuid4())
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        temp_path = temp_file.name
        content = await file.read()
        temp_file.write(content)
    
    try:
        # Extract metadata
        result = await extractor.extract_metadata(temp_path)
        
        if result.success:
            return ExtractionResponse(
                extraction_id=extraction_id,
                success=True,
                message="Metadata extracted successfully",
                metadata=result.metadata,
                confidence_score=result.confidence_score,
                processing_time=result.processing_time
            )
        else:
            return ExtractionResponse(
                extraction_id=extraction_id,
                success=False,
                message="Failed to extract metadata",
                errors=[result.error_message] if result.error_message else [],
                processing_time=result.processing_time
            )
    
    except Exception as e:
        logger.error(f"Unexpected error in metadata extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
    
    finally:
        # Clean up temporary file
        try:
            os.unlink(temp_path)
        except OSError:
            pass

@router.post("/extract/batch", response_model=BatchExtractionResponse)
async def extract_metadata_batch(
    files: List[UploadFile] = File(...),
    extractor: GeminiMetadataExtractor = Depends(get_extractor)
) -> BatchExtractionResponse:
    """
    Extract metadata from multiple uploaded PDF files
    
    Args:
        files: List of uploaded PDF files
        extractor: Configured Gemini extractor
        
    Returns:
        Batch extraction response
    """
    batch_id = str(uuid.uuid4())
    temp_files = []
    
    try:
        # Validate and save all files
        for file in files:
            if not file.filename.lower().endswith('.pdf'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {file.filename} is not a PDF"
                )
            
            # Save temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_path = temp_file.name
                content = await file.read()
                temp_file.write(content)
                temp_files.append((temp_path, file.filename))
        
        # Extract metadata from all files
        file_paths = [temp_path for temp_path, _ in temp_files]
        batch_results = await extractor.batch_extract(file_paths)
        
        # Process results
        results = {}
        successful = 0
        failed = 0
        
        for (temp_path, original_filename), result in zip(temp_files, batch_results.values()):
            extraction_id = str(uuid.uuid4())
            
            if result.success:
                successful += 1
                response = ExtractionResponse(
                    extraction_id=extraction_id,
                    success=True,
                    message="Metadata extracted successfully",
                    metadata=result.metadata,
                    confidence_score=result.confidence_score,
                    processing_time=result.processing_time
                )
            else:
                failed += 1
                response = ExtractionResponse(
                    extraction_id=extraction_id,
                    success=False,
                    message="Failed to extract metadata",
                    errors=[result.error_message] if result.error_message else [],
                    processing_time=result.processing_time
                )
            
            results[original_filename] = response
        
        return BatchExtractionResponse(
            batch_id=batch_id,
            total_files=len(files),
            successful_extractions=successful,
            failed_extractions=failed,
            results=results
        )
    
    except Exception as e:
        logger.error(f"Unexpected error in batch extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
    
    finally:
        # Clean up temporary files
        for temp_path, _ in temp_files:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

@router.post("/extract/from-file", response_model=ExtractionResponse)
async def extract_metadata_from_file(
    file_path: str,
    extractor: GeminiMetadataExtractor = Depends(get_extractor)
) -> ExtractionResponse:
    """
    Extract metadata from a PDF file already stored on the server
    
    Args:
        file_path: Path to the PDF file on server
        extractor: Configured Gemini extractor
        
    Returns:
        Extraction response with metadata
    """
    extraction_id = str(uuid.uuid4())
    
    # Validate file exists
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_path}"
        )
    
    # Validate file type
    if not file_path.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    try:
        # Extract metadata
        result = await extractor.extract_metadata(file_path)
        
        if result.success:
            return ExtractionResponse(
                extraction_id=extraction_id,
                success=True,
                message="Metadata extracted successfully",
                metadata=result.metadata,
                confidence_score=result.confidence_score,
                processing_time=result.processing_time
            )
        else:
            return ExtractionResponse(
                extraction_id=extraction_id,
                success=False,
                message="Failed to extract metadata",
                errors=[result.error_message] if result.error_message else [],
                processing_time=result.processing_time
            )
    
    except Exception as e:
        logger.error(f"Unexpected error in metadata extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/health")
async def health_check(extractor: GeminiMetadataExtractor = Depends(get_extractor)):
    """
    Health check endpoint for the metadata extraction service
    
    Returns:
        Service status information
    """
    return {
        "status": "healthy",
        "service": "gemini-metadata-extractor",
        "model": extractor.model_name,
        "timestamp": datetime.now().isoformat()
    }

# Integration functions for main application

def setup_gemini_extraction(app, api_key: str, model_name: str = "gemini-1.5-flash"):
    """
    Setup Gemini metadata extraction in FastAPI application
    
    Args:
        app: FastAPI application instance
        api_key: Google Gemini API key
        model_name: Gemini model name to use
    """
    # Configure extractor
    configure_extractor(api_key, model_name)
    
    # Include router
    app.include_router(router)
    
    logger.info("Gemini metadata extraction setup completed")

async def extract_and_store_metadata(
    thesis_id: str, 
    pdf_file_path: str,
    database_connection,
    extractor: GeminiMetadataExtractor = None
) -> Dict[str, Any]:
    """
    Extract metadata and store in database
    
    Args:
        thesis_id: UUID of the thesis record
        pdf_file_path: Path to the PDF file
        database_connection: Database connection
        extractor: Gemini extractor instance
        
    Returns:
        Dictionary with extraction results and database operations
    """
    if extractor is None:
        extractor = get_extractor()
    
    # Extract metadata
    result = await extractor.extract_metadata(pdf_file_path)
    
    if not result.success:
        return {
            "success": False,
            "error": result.error_message,
            "thesis_id": thesis_id
        }
    
    metadata = result.metadata
    
    # TODO: Implement database storage logic here
    # This would involve:
    # 1. Creating/updating academic persons
    # 2. Creating/updating institutions (university, faculty, etc.)
    # 3. Creating/updating categories and keywords
    # 4. Linking everything to the thesis record
    # 5. Storing extraction metadata (confidence score, etc.)
    
    return {
        "success": True,
        "thesis_id": thesis_id,
        "confidence_score": result.confidence_score,
        "processing_time": result.processing_time,
        "extracted_metadata": metadata
    }

# Example usage in main.py integration
"""
# Add to main.py imports:
from fastapi_gemini_integration import setup_gemini_extraction

# Add to main.py configuration:
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "your-api-key-here")

# Add after FastAPI app creation:
setup_gemini_extraction(app, GEMINI_API_KEY)

# Usage in thesis upload endpoint:
from fastapi_gemini_integration import extract_and_store_metadata

@app.post("/api/v1/theses/upload")
async def upload_thesis(file: UploadFile = File(...)):
    # ... existing upload logic ...
    
    # Extract metadata after file is saved
    extraction_result = await extract_and_store_metadata(
        thesis_id=str(thesis_record.id),
        pdf_file_path=saved_file_path,
        database_connection=db_connection
    )
    
    if extraction_result["success"]:
        logger.info(f"Metadata extracted for thesis {thesis_id} with confidence {extraction_result['confidence_score']}")
    else:
        logger.error(f"Failed to extract metadata for thesis {thesis_id}: {extraction_result['error']}")
    
    # ... return response ...
"""