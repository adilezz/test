# 🔧 Integration Guide - Gemini Metadata Extraction

## Quick Integration Steps

### 1. Add to main.py

```python
# Add these imports at the top
import os
from fastapi_gemini_integration import setup_gemini_extraction

# Add after FastAPI app creation
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "your-api-key-here")
setup_gemini_extraction(app, GEMINI_API_KEY)
```

### 2. Environment Variables

```bash
# Add to your .env file
GEMINI_API_KEY=your-google-gemini-api-key
```

### 3. Thesis Upload Integration

```python
# In your thesis upload endpoint
from enhanced_gemini_extractor import EnhancedGeminiExtractor

@app.post("/api/v1/theses/upload")
async def upload_thesis(file: UploadFile = File(...)):
    # ... existing upload logic ...
    
    # Extract metadata after file is saved
    extractor = EnhancedGeminiExtractor(GEMINI_API_KEY)
    result = await extractor.extract_enhanced_metadata(saved_file_path)
    
    if result.success:
        # Store extracted metadata in database
        await store_thesis_metadata(thesis_id, result.metadata)
        logger.info(f"Metadata extracted with confidence {result.confidence_score}")
    
    return {"extraction_confidence": result.confidence_score}
```

### 4. Database Storage Function

```python
async def store_thesis_metadata(thesis_id: str, metadata: dict):
    """Store extracted metadata in database"""
    
    # Update thesis record
    thesis_data = metadata['thesis']
    await update_thesis(thesis_id, {
        'title_fr': thesis_data.get('title_fr'),
        'abstract_fr': thesis_data.get('abstract_fr'),
        'defense_date': thesis_data.get('defense_date'),
        'thesis_number': thesis_data.get('thesis_number')
    })
    
    # Store academic persons
    for person in metadata['academic_persons']:
        person_id = await create_academic_person(person)
        await create_thesis_relationship(thesis_id, person_id, person['role'])
    
    # Store keywords
    for keyword in metadata['keywords']:
        await add_thesis_keyword(thesis_id, keyword)
```

### 5. Background Processing (Recommended)

```python
from celery import Celery

@app.task
async def extract_metadata_background(thesis_id: str, pdf_path: str):
    """Background task for metadata extraction"""
    extractor = EnhancedGeminiExtractor(GEMINI_API_KEY)
    result = await extractor.extract_enhanced_metadata(pdf_path)
    
    if result.success:
        await store_thesis_metadata(thesis_id, result.metadata)
        return {"status": "success", "confidence": result.confidence_score}
    else:
        return {"status": "failed", "error": result.error_message}
```

## Testing the Integration

### 1. Health Check

```bash
curl http://localhost:8000/api/v1/metadata/health
```

### 2. Test Extraction

```bash
curl -X POST -F "file=@test.pdf" http://localhost:8000/api/v1/metadata/extract
```

### 3. Batch Processing

```bash
curl -X POST -F "files=@thesis1.pdf" -F "files=@thesis2.pdf" \
     http://localhost:8000/api/v1/metadata/extract/batch
```

## Configuration Options

```python
# Optional configuration
GEMINI_MODEL_NAME = "gemini-1.5-flash"  # Default model
MAX_PDF_PAGES = 10                      # Pages to analyze
EXTRACTION_TIMEOUT = 60                 # Timeout in seconds
ENABLE_CACHING = True                   # Cache results
```

## Monitoring & Alerts

```python
# Add metrics tracking
@app.middleware("http")
async def track_extraction_metrics(request: Request, call_next):
    if request.url.path.startswith("/api/v1/metadata"):
        start_time = time.time()
        response = await call_next(request)
        processing_time = time.time() - start_time
        
        # Log metrics
        logger.info(f"Extraction: {response.status_code}, Time: {processing_time:.2f}s")
        return response
    return await call_next(request)
```

That's it! Your thesis repository now has AI-powered metadata extraction. 🚀