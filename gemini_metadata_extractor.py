#!/usr/bin/env python3
"""
Gemini Metadata Extractor - Integration Module for FastAPI Application
A production-ready module for extracting thesis metadata using Google Gemini API
"""

import os
import json
import uuid
import asyncio
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Union, Tuple
from pathlib import Path
import base64
import logging

# PDF processing
import PyPDF2
from pdf2image import convert_from_path
from PIL import Image

# Google Gemini API
import google.generativeai as genai

# Database and validation
from pydantic import BaseModel, Field, ValidationError
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AcademicRole(str, Enum):
    AUTHOR = "author"
    DIRECTOR = "director"
    CO_DIRECTOR = "co_director"
    JURY_PRESIDENT = "jury_president"
    JURY_EXAMINER = "jury_examiner"
    JURY_REPORTER = "jury_reporter"
    EXTERNAL_EXAMINER = "external_examiner"

class ThesisStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    REJECTED = "rejected"

# Pydantic models for validation
class AcademicPersonExtracted(BaseModel):
    complete_name_fr: Optional[str] = None
    complete_name_ar: Optional[str] = None
    first_name_fr: Optional[str] = None
    last_name_fr: Optional[str] = None
    first_name_ar: Optional[str] = None
    last_name_ar: Optional[str] = None
    title: Optional[str] = None
    role: Optional[str] = None
    external_institution_name: Optional[str] = None
    external_institution_country: Optional[str] = None
    external_institution_type: Optional[str] = None
    is_external: bool = False

class ThesisMetadataExtracted(BaseModel):
    title_fr: Optional[str] = None
    title_en: Optional[str] = None
    title_ar: Optional[str] = None
    abstract_fr: Optional[str] = None
    abstract_en: Optional[str] = None
    abstract_ar: Optional[str] = None
    defense_date: Optional[str] = None  # YYYY-MM-DD format
    page_count: Optional[int] = None
    thesis_number: Optional[str] = None

class InstitutionExtracted(BaseModel):
    name_fr: Optional[str] = None
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    acronym: Optional[str] = None

class DegreeExtracted(BaseModel):
    name_fr: Optional[str] = None
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    abbreviation: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None

class LanguageExtracted(BaseModel):
    primary: Optional[str] = None
    secondary: List[str] = Field(default_factory=list)

class LocationExtracted(BaseModel):
    name_fr: Optional[str] = None
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    level: Optional[str] = None

class ExtractedMetadata(BaseModel):
    thesis: ThesisMetadataExtracted
    university: InstitutionExtracted
    faculty: InstitutionExtracted
    school: InstitutionExtracted
    department: InstitutionExtracted
    degree: DegreeExtracted
    language: LanguageExtracted
    academic_persons: List[AcademicPersonExtracted]
    categories: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    study_location: LocationExtracted

class ExtractionResult(BaseModel):
    success: bool
    metadata: Optional[ExtractedMetadata] = None
    error_message: Optional[str] = None
    confidence_score: Optional[float] = None
    processing_time: Optional[float] = None
    extraction_method: str = "gemini_api"

class GeminiMetadataExtractor:
    """
    Production-ready metadata extractor using Google Gemini API
    """
    
    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        """Initialize the extractor with API configuration"""
        self.api_key = api_key
        self.model_name = model_name
        
        # Configure Gemini API
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        
        # Rate limiting and retry configuration
        self.max_retries = 3
        self.retry_delay = 1.0
        
        logger.info(f"Initialized GeminiMetadataExtractor with model: {model_name}")

    def extract_text_from_pdf(self, pdf_path: str, max_pages: int = 3) -> str:
        """
        Extract text from PDF first pages
        
        Args:
            pdf_path: Path to PDF file
            max_pages: Maximum number of pages to extract (default 3)
            
        Returns:
            Extracted text content
        """
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_content = ""
                
                pages_to_extract = min(len(pdf_reader.pages), max_pages)
                
                for page_num in range(pages_to_extract):
                    page = pdf_reader.pages[page_num]
                    text_content += page.extract_text() + "\n"
                
                return text_content.strip()
                
        except Exception as e:
            logger.error(f"Error extracting text from {pdf_path}: {e}")
            return ""

    def pdf_to_images(self, pdf_path: str, max_pages: int = 3) -> List[Image.Image]:
        """
        Convert PDF pages to images for visual analysis
        
        Args:
            pdf_path: Path to PDF file
            max_pages: Maximum number of pages to convert
            
        Returns:
            List of PIL Image objects
        """
        try:
            images = convert_from_path(
                pdf_path, 
                first_page=1, 
                last_page=max_pages,
                dpi=300
            )
            return images
        except Exception as e:
            logger.error(f"Error converting PDF to images {pdf_path}: {e}")
            return []

    def create_extraction_prompt(self) -> str:
        """Create optimized prompt for Gemini API"""
        return """
You are an expert in analyzing Moroccan academic thesis documents. Extract metadata from the provided thesis first page(s) in the exact JSON format below.

CRITICAL INSTRUCTIONS:
1. Extract ALL available information in French, English, and Arabic
2. Identify academic person roles precisely: author, director, co_director, jury_president, jury_examiner, jury_reporter, external_examiner
3. Parse institutional hierarchy: University → Faculty/School → Department
4. Extract degree information (Doctorat, Master, Licence, etc.)
5. Find defense date in YYYY-MM-DD format
6. Identify thesis number and study location
7. Extract subject categories and keywords
8. Determine primary and secondary languages
9. Mark external persons/institutions with is_external=true

REQUIRED JSON FORMAT:
{
    "thesis": {
        "title_fr": "French title",
        "title_en": "English title or null",
        "title_ar": "Arabic title or null",
        "abstract_fr": "French abstract or null",
        "abstract_en": "English abstract or null", 
        "abstract_ar": "Arabic abstract or null",
        "defense_date": "YYYY-MM-DD or null",
        "page_count": number_or_null,
        "thesis_number": "thesis_number_or_null"
    },
    "university": {
        "name_fr": "French university name or null",
        "name_en": "English university name or null",
        "name_ar": "Arabic university name or null",
        "acronym": "acronym_or_null"
    },
    "faculty": {
        "name_fr": "French faculty name or null",
        "name_en": "English faculty name or null",
        "name_ar": "Arabic faculty name or null",
        "acronym": "acronym_or_null"
    },
    "school": {
        "name_fr": "French school name or null",
        "name_en": "English school name or null",
        "name_ar": "Arabic school name or null",
        "acronym": "acronym_or_null"
    },
    "department": {
        "name_fr": "French department name or null",
        "name_en": "English department name or null",
        "name_ar": "Arabic department name or null",
        "acronym": "acronym_or_null"
    },
    "degree": {
        "name_fr": "French degree name",
        "name_en": "English degree name or null",
        "name_ar": "Arabic degree name or null",
        "abbreviation": "abbreviation_or_null",
        "type": "doctorate/master/bachelor/other",
        "category": "research/professional/other"
    },
    "language": {
        "primary": "fr/en/ar",
        "secondary": ["fr", "en", "ar"]
    },
    "academic_persons": [
        {
            "complete_name_fr": "Full French name",
            "complete_name_ar": "Full Arabic name or null",
            "first_name_fr": "First name French",
            "last_name_fr": "Last name French",
            "first_name_ar": "First name Arabic or null",
            "last_name_ar": "Last name Arabic or null",
            "title": "Dr./Prof./Mr./Ms./etc.",
            "role": "author/director/co_director/jury_president/jury_examiner/jury_reporter/external_examiner",
            "external_institution_name": "external_institution_or_null",
            "external_institution_country": "country_or_null",
            "external_institution_type": "university/research_center/company/etc.",
            "is_external": false
        }
    ],
    "categories": ["Subject area", "Research field"],
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "study_location": {
        "name_fr": "Location French name",
        "name_en": "Location English name or null",
        "name_ar": "Location Arabic name or null",
        "level": "city/province/region/country"
    }
}

RETURN ONLY THE JSON OBJECT, NO OTHER TEXT.
Be precise and thorough in extraction.
"""

    async def extract_with_gemini(self, text_content: str, images: List[Image.Image] = None) -> Dict[str, Any]:
        """
        Extract metadata using Gemini API with retry logic
        
        Args:
            text_content: Extracted text from PDF
            images: List of images from PDF
            
        Returns:
            Extracted metadata dictionary
        """
        for attempt in range(self.max_retries):
            try:
                prompt = self.create_extraction_prompt()
                content_parts = [prompt]
                
                if text_content:
                    content_parts.append(f"\n\nTEXT CONTENT:\n{text_content}")
                
                if images:
                    # Add first image for visual context
                    content_parts.append(images[0])
                
                # Call Gemini API
                response = self.model.generate_content(content_parts)
                
                if response and response.text:
                    # Clean and parse JSON response
                    json_text = response.text.strip()
                    
                    # Remove markdown formatting if present
                    if json_text.startswith('```json'):
                        json_text = json_text[7:]
                    if json_text.endswith('```'):
                        json_text = json_text[:-3]
                    
                    # Parse JSON
                    metadata = json.loads(json_text.strip())
                    return metadata
                
                logger.warning(f"Empty response from Gemini API on attempt {attempt + 1}")
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error on attempt {attempt + 1}: {e}")
                if attempt == self.max_retries - 1:
                    logger.error(f"Raw response: {response.text if 'response' in locals() else 'No response'}")
                
            except Exception as e:
                logger.error(f"Error calling Gemini API on attempt {attempt + 1}: {e}")
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
        
        return {}

    def validate_extracted_data(self, raw_metadata: Dict[str, Any]) -> Tuple[bool, List[str], ExtractedMetadata]:
        """
        Validate extracted metadata against schema
        
        Args:
            raw_metadata: Raw metadata from Gemini API
            
        Returns:
            Tuple of (is_valid, errors, validated_metadata)
        """
        errors = []
        
        try:
            # Create validated metadata object
            validated_metadata = ExtractedMetadata(**raw_metadata)
            
            # Additional validation rules
            if not validated_metadata.thesis.title_fr:
                errors.append("Missing required field: thesis.title_fr")
            
            if not validated_metadata.thesis.defense_date:
                errors.append("Missing required field: thesis.defense_date")
            
            # Validate defense date format
            if validated_metadata.thesis.defense_date:
                try:
                    datetime.strptime(validated_metadata.thesis.defense_date, "%Y-%m-%d")
                except ValueError:
                    errors.append("Invalid defense_date format, should be YYYY-MM-DD")
            
            # Check for author
            has_author = any(person.role == "author" for person in validated_metadata.academic_persons)
            if not has_author:
                errors.append("No author found in academic persons")
            
            # Validate academic roles
            valid_roles = [role.value for role in AcademicRole]
            for person in validated_metadata.academic_persons:
                if person.role and person.role not in valid_roles:
                    errors.append(f"Invalid academic role: {person.role}")
            
            is_valid = len(errors) == 0
            return is_valid, errors, validated_metadata
            
        except ValidationError as e:
            errors.extend([str(error) for error in e.errors()])
            return False, errors, None

    def calculate_confidence_score(self, metadata: ExtractedMetadata) -> float:
        """
        Calculate confidence score based on completeness of extracted data
        
        Args:
            metadata: Validated metadata object
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        score = 0.0
        max_score = 0.0
        
        # Core thesis information (40% of score)
        if metadata.thesis.title_fr:
            score += 20
        if metadata.thesis.defense_date:
            score += 10
        if metadata.thesis.thesis_number:
            score += 10
        max_score += 40
        
        # Academic persons (30% of score)
        if metadata.academic_persons:
            score += 15
            # Bonus for having complete jury
            if len(metadata.academic_persons) >= 3:
                score += 10
            # Bonus for having all names
            complete_names = sum(1 for person in metadata.academic_persons 
                               if person.complete_name_fr or (person.first_name_fr and person.last_name_fr))
            score += min(5, complete_names)
        max_score += 30
        
        # Institutional information (20% of score)
        if metadata.university.name_fr:
            score += 10
        if metadata.faculty.name_fr:
            score += 5
        if metadata.degree.name_fr:
            score += 5
        max_score += 20
        
        # Additional metadata (10% of score)
        if metadata.keywords:
            score += 5
        if metadata.study_location.name_fr:
            score += 5
        max_score += 10
        
        return min(1.0, score / max_score) if max_score > 0 else 0.0

    async def extract_metadata(self, pdf_path: str) -> ExtractionResult:
        """
        Main method to extract metadata from a PDF file
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            ExtractionResult with metadata and status
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"Starting metadata extraction for: {pdf_path}")
            
            # Check if file exists
            if not os.path.exists(pdf_path):
                return ExtractionResult(
                    success=False,
                    error_message=f"File not found: {pdf_path}",
                    processing_time=0.0
                )
            
            # Extract text content
            text_content = self.extract_text_from_pdf(pdf_path)
            if not text_content:
                logger.warning(f"No text extracted from {pdf_path}")
            
            # Convert to images
            images = self.pdf_to_images(pdf_path)
            if not images:
                logger.warning(f"No images extracted from {pdf_path}")
            
            # Extract metadata with Gemini API
            raw_metadata = await self.extract_with_gemini(text_content, images)
            
            if not raw_metadata:
                return ExtractionResult(
                    success=False,
                    error_message="Failed to extract metadata with Gemini API",
                    processing_time=(datetime.now() - start_time).total_seconds()
                )
            
            # Validate extracted data
            is_valid, errors, validated_metadata = self.validate_extracted_data(raw_metadata)
            
            if not is_valid:
                return ExtractionResult(
                    success=False,
                    error_message=f"Validation errors: {'; '.join(errors)}",
                    processing_time=(datetime.now() - start_time).total_seconds()
                )
            
            # Calculate confidence score
            confidence_score = self.calculate_confidence_score(validated_metadata)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Successfully extracted metadata from {pdf_path} "
                       f"(confidence: {confidence_score:.2f}, time: {processing_time:.2f}s)")
            
            return ExtractionResult(
                success=True,
                metadata=validated_metadata,
                confidence_score=confidence_score,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Unexpected error during extraction: {e}")
            return ExtractionResult(
                success=False,
                error_message=f"Unexpected error: {str(e)}",
                processing_time=(datetime.now() - start_time).total_seconds()
            )

    async def batch_extract(self, pdf_paths: List[str]) -> Dict[str, ExtractionResult]:
        """
        Extract metadata from multiple PDF files
        
        Args:
            pdf_paths: List of PDF file paths
            
        Returns:
            Dictionary mapping file paths to extraction results
        """
        logger.info(f"Starting batch extraction for {len(pdf_paths)} files")
        
        results = {}
        for pdf_path in pdf_paths:
            result = await self.extract_metadata(pdf_path)
            results[pdf_path] = result
            
            # Small delay between requests to respect rate limits
            await asyncio.sleep(0.5)
        
        successful = sum(1 for result in results.values() if result.success)
        logger.info(f"Batch extraction completed: {successful}/{len(pdf_paths)} successful")
        
        return results

# Factory function for easy integration
def create_gemini_extractor(api_key: str, model_name: str = "gemini-1.5-flash") -> GeminiMetadataExtractor:
    """
    Factory function to create a GeminiMetadataExtractor instance
    
    Args:
        api_key: Google Gemini API key
        model_name: Gemini model name to use
        
    Returns:
        Configured GeminiMetadataExtractor instance
    """
    return GeminiMetadataExtractor(api_key=api_key, model_name=model_name)

# Example usage and testing
async def main():
    """Example usage of the metadata extractor"""
    
    # Configuration
    API_KEY = os.getenv("GEMINI_API_KEY")
    if not API_KEY:
        print("GEMINI_API_KEY not set; skipping example run.")
        return
    
    # Test files
    test_files = [
        "/workspace/first_pages-1.pdf",
        "/workspace/first_pages-2.pdf",
        "/workspace/first_pages-3.pdf",
        "/workspace/first_pages-4.pdf"
    ]
    
    # Create extractor
    extractor = create_gemini_extractor(API_KEY)
    
    # Test single extraction
    print("Testing single extraction...")
    result = await extractor.extract_metadata(test_files[0])
    print(f"Result: {result.success}, Confidence: {result.confidence_score}")
    
    # Test batch extraction
    print("\nTesting batch extraction...")
    batch_results = await extractor.batch_extract(test_files)
    
    for file_path, result in batch_results.items():
        filename = os.path.basename(file_path)
        status = "✓ SUCCESS" if result.success else "✗ FAILED"
        confidence = f"{result.confidence_score:.2f}" if result.confidence_score else "N/A"
        time_taken = f"{result.processing_time:.2f}s" if result.processing_time else "N/A"
        
        print(f"{filename}: {status} (confidence: {confidence}, time: {time_taken})")
        
        if not result.success:
            print(f"  Error: {result.error_message}")

if __name__ == "__main__":
    asyncio.run(main())