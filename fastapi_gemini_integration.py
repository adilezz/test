#!/usr/bin/env python3
"""
FastAPI Integration for Metadata Extraction (Two-step Pipeline)
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import os
import tempfile
from datetime import datetime
import logging

from metadata_pipeline import run_pipeline as run_two_step_pipeline

# Configure logging
logger = logging.getLogger(__name__)

# Response models
class ExtractionResponse(BaseModel):
    extraction_id: str
    success: bool
    message: str
    metadata: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    processing_time: Optional[float] = None
    errors: Optional[List[str]] = None

class BatchExtractionResponse(BaseModel):
    batch_id: str
    total_files: int
    successful_extractions: int
    failed_extractions: int
    results: Dict[str, ExtractionResponse]

# Create router
router = APIRouter(prefix="/api/v1/metadata", tags=["Metadata Extraction"])

@router.post("/extract", response_model=ExtractionResponse)
async def extract_metadata_from_upload(
    file: UploadFile = File(...),
) -> ExtractionResponse:
    extraction_id = str(uuid.uuid4())

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        temp_path = temp_file.name
        content = await file.read()
        temp_file.write(content)

    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
        merged = await run_two_step_pipeline(temp_path, api_key)
        return ExtractionResponse(
            extraction_id=extraction_id,
            success=True,
            message="Metadata extracted via two-step pipeline",
            metadata=merged,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in metadata extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
    finally:
        try:
            os.unlink(temp_path)
        except OSError:
            pass

@router.post("/extract/batch", response_model=BatchExtractionResponse)
async def extract_metadata_batch(
    files: List[UploadFile] = File(...),
) -> BatchExtractionResponse:
    batch_id = str(uuid.uuid4())
    temp_files = []

    try:
        for file in files:
            if not file.filename.lower().endswith('.pdf'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {file.filename} is not a PDF"
                )
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_path = temp_file.name
                content = await file.read()
                temp_file.write(content)
                temp_files.append((temp_path, file.filename))

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

        results: Dict[str, ExtractionResponse] = {}
        successful = 0
        failed = 0
        for temp_path, original_filename in temp_files:
            extraction_id = str(uuid.uuid4())
            try:
                merged = await run_two_step_pipeline(temp_path, api_key)
                resp = ExtractionResponse(
                    extraction_id=extraction_id,
                    success=True,
                    message="Metadata extracted via two-step pipeline",
                    metadata=merged,
                )
                successful += 1
            except Exception as e:
                resp = ExtractionResponse(
                    extraction_id=extraction_id,
                    success=False,
                    message="Failed to extract metadata",
                    errors=[str(e)],
                )
                failed += 1
            results[original_filename] = resp

        return BatchExtractionResponse(
            batch_id=batch_id,
            total_files=len(files),
            successful_extractions=successful,
            failed_extractions=failed,
            results=results
        )
    finally:
        for temp_path, _ in temp_files:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

@router.post("/extract/from-file", response_model=ExtractionResponse)
async def extract_metadata_from_file(
    file_path: str,
) -> ExtractionResponse:
    extraction_id = str(uuid.uuid4())

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_path}"
        )
    if not file_path.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    merged = await run_two_step_pipeline(file_path, api_key)
    return ExtractionResponse(
        extraction_id=extraction_id,
        success=True,
        message="Metadata extracted via two-step pipeline",
        metadata=merged,
    )

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "metadata-extraction-pipeline",
        "timestamp": datetime.now().isoformat()
    }


def setup_gemini_extraction(app, api_key: str, model_name: str = "gemini-1.5-flash"):
    app.include_router(router)
    logging.getLogger(__name__).info("Two-step metadata extraction router enabled")