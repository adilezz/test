#!/usr/bin/env python3
"""
Enhanced Gemini Metadata Extractor
Advanced extraction including abstracts, TOC, references, and improved handling of various thesis formats
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import logging
import re

# PDF processing
import PyPDF2
from pdf2image import convert_from_path
from PIL import Image

# Google Gemini API
import google.generativeai as genai

# Base extractor
from gemini_metadata_extractor import (
    GeminiMetadataExtractor, 
    ExtractionResult,
    ExtractedMetadata,
    AcademicPersonExtracted,
    ThesisMetadataExtracted
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedThesisMetadata(ThesisMetadataExtracted):
    """Enhanced thesis metadata with additional fields"""
    abstract_fr: Optional[str] = None
    abstract_en: Optional[str] = None
    abstract_ar: Optional[str] = None
    table_of_contents: Optional[List[str]] = None
    references_count: Optional[int] = None
    chapter_titles: Optional[List[str]] = None
    document_type: Optional[str] = None  # thesis, memoir, dissertation, etc.
    total_pages: Optional[int] = None
    submission_date: Optional[str] = None
    academic_year: Optional[str] = None
    specialization: Optional[str] = None

class EnhancedExtractedMetadata(ExtractedMetadata):
    """Enhanced metadata with additional fields"""
    thesis: EnhancedThesisMetadata

class EnhancedGeminiExtractor(GeminiMetadataExtractor):
    """Enhanced metadata extractor with comprehensive content analysis"""
    
    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        super().__init__(api_key, model_name)
        self.max_pages_to_analyze = 10  # Analyze more pages for comprehensive extraction
    
    def extract_comprehensive_text(self, pdf_path: str, max_pages: int = 10) -> Dict[str, str]:
        """
        Extract text from multiple sections of the PDF
        
        Returns:
            Dictionary with text from different sections
        """
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                total_pages = len(pdf_reader.pages)
                
                sections = {
                    'first_pages': '',      # First 3 pages (title, abstract, etc.)
                    'table_of_contents': '', # Pages likely to contain TOC
                    'middle_content': '',    # Sample from middle
                    'references': '',        # Last pages (likely references)
                    'full_text_sample': ''   # Sample of full text for analysis
                }
                
                # First pages (title, abstract, jury, etc.)
                first_page_count = min(3, total_pages)
                for i in range(first_page_count):
                    sections['first_pages'] += pdf_reader.pages[i].extract_text() + "\n"
                
                # Table of contents (usually pages 3-8)
                toc_start = min(3, total_pages)
                toc_end = min(8, total_pages)
                for i in range(toc_start, toc_end):
                    text = pdf_reader.pages[i].extract_text()
                    # Check if this looks like TOC
                    if any(keyword in text.lower() for keyword in ['sommaire', 'table', 'matières', 'plan', 'contenu']):
                        sections['table_of_contents'] += text + "\n"
                
                # Middle content sample
                if total_pages > 10:
                    middle_start = total_pages // 3
                    middle_end = min(middle_start + 3, total_pages)
                    for i in range(middle_start, middle_end):
                        sections['middle_content'] += pdf_reader.pages[i].extract_text() + "\n"
                
                # References/Bibliography (last 5 pages)
                ref_start = max(0, total_pages - 5)
                for i in range(ref_start, total_pages):
                    text = pdf_reader.pages[i].extract_text()
                    # Check if this looks like references
                    if any(keyword in text.lower() for keyword in ['références', 'bibliographie', 'bibliography', 'webographie']):
                        sections['references'] += text + "\n"
                
                # Full text sample (every 10th page for overview)
                sample_pages = list(range(0, total_pages, max(1, total_pages // max_pages)))[:max_pages]
                for i in sample_pages:
                    sections['full_text_sample'] += pdf_reader.pages[i].extract_text() + "\n"
                
                return sections
                
        except Exception as e:
            logger.error(f"Error extracting comprehensive text from {pdf_path}: {e}")
            return {}

    def create_enhanced_extraction_prompt(self) -> str:
        """Create enhanced prompt for comprehensive metadata extraction"""
        return """
You are an expert in analyzing Moroccan academic documents (theses, dissertations, memoirs). 
Analyze the provided document sections and extract comprehensive metadata in the exact JSON format below.

DOCUMENT TYPES TO RECOGNIZE:
- Thèse (Thesis) - For doctorate degree
- Mémoire (Memoir) - For master's degree or specialization
- Dissertation - For various academic levels
- Projet de fin d'études (Final project)

CRITICAL INSTRUCTIONS:
1. Extract ALL available information in French, English, and Arabic
2. Identify document type (thèse, mémoire, dissertation, etc.)
3. Extract comprehensive abstracts from any section
4. Parse table of contents and chapter titles
5. Count references/bibliography entries
6. Find defense/submission dates in various formats (DD/MM/YYYY, MM/YYYY, YYYY, etc.)
7. Extract academic year, specialization, and degree details
8. Identify all academic persons with their precise roles
9. Handle scanned documents with limited text extraction
10. Be flexible with date formats and missing information

REQUIRED JSON FORMAT:
{
    "thesis": {
        "title_fr": "French title",
        "title_en": "English title or null",
        "title_ar": "Arabic title or null",
        "abstract_fr": "French abstract (can be from any section)",
        "abstract_en": "English abstract or null",
        "abstract_ar": "Arabic abstract or null", 
        "defense_date": "YYYY-MM-DD format or null (be flexible with date extraction)",
        "submission_date": "YYYY-MM-DD format or null",
        "academic_year": "2020-2021 format or null",
        "page_count": "total pages or null",
        "thesis_number": "thesis number or null",
        "document_type": "thèse/mémoire/dissertation/projet",
        "specialization": "medical specialization or field",
        "total_pages": "number of pages",
        "table_of_contents": ["Chapter 1", "Chapter 2", "..."],
        "chapter_titles": ["Introduction", "Methodology", "Results", "..."],
        "references_count": "estimated number of references"
    },
    "university": {
        "name_fr": "French university name",
        "name_en": "English university name or null",
        "name_ar": "Arabic university name or null",
        "acronym": "acronym or null"
    },
    "faculty": {
        "name_fr": "French faculty name",
        "name_en": "English faculty name or null",
        "name_ar": "Arabic faculty name or null",
        "acronym": "acronym or null"
    },
    "school": {
        "name_fr": "French school name",
        "name_en": "English school name or null",
        "name_ar": "Arabic school name or null",
        "acronym": "acronym or null"
    },
    "department": {
        "name_fr": "French department name",
        "name_en": "English department name or null",
        "name_ar": "Arabic department name or null",
        "acronym": "acronym or null"
    },
    "degree": {
        "name_fr": "French degree name",
        "name_en": "English degree name or null",
        "name_ar": "Arabic degree name or null",
        "abbreviation": "abbreviation or null",
        "type": "doctorate/master/bachelor/specialization",
        "category": "research/professional/clinical"
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
            "role": "author/director/co_director/jury_president/jury_examiner/jury_reporter/external_examiner/supervisor",
            "external_institution_name": "external institution or null",
            "external_institution_country": "country or null",
            "external_institution_type": "university/hospital/research_center/etc.",
            "is_external": false
        }
    ],
    "categories": ["Subject area", "Medical specialty", "Research field"],
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "study_location": {
        "name_fr": "Location French name",
        "name_en": "Location English name or null", 
        "name_ar": "Location Arabic name or null",
        "level": "city/province/region/country"
    }
}

SPECIAL HANDLING INSTRUCTIONS:
- If defense date is not explicitly found, look for submission dates, academic years, or any date indicators
- For medical documents, extract specialization (Anesthésie-Réanimation, Chirurgie, etc.)
- If text extraction is poor (scanned document), focus on image analysis
- Extract abstracts from any section (résumé, abstract, summary, introduction)
- Be flexible with academic roles (directeur de mémoire = supervisor, etc.)
- Handle different document formats (thesis vs memoir vs dissertation)

RETURN ONLY THE JSON OBJECT, NO OTHER TEXT.
Be comprehensive and extract as much information as possible from all provided sections.
"""

    async def extract_with_enhanced_gemini(self, text_sections: Dict[str, str], images: List[Image.Image] = None) -> Dict[str, Any]:
        """
        Enhanced metadata extraction using multiple text sections
        """
        for attempt in range(self.max_retries):
            try:
                prompt = self.create_enhanced_extraction_prompt()
                content_parts = [prompt]
                
                # Add text sections
                for section_name, text_content in text_sections.items():
                    if text_content.strip():
                        content_parts.append(f"\n\n=== {section_name.upper()} SECTION ===\n{text_content}")
                
                # Add first image if available
                if images:
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

    def enhanced_validation(self, raw_metadata: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Enhanced validation with more flexible requirements
        """
        errors = []
        warnings = []
        
        try:
            # Basic structure validation
            if not raw_metadata.get("thesis", {}).get("title_fr"):
                errors.append("Missing required field: thesis.title_fr")
            
            # More flexible date validation
            thesis_data = raw_metadata.get("thesis", {})
            has_any_date = any([
                thesis_data.get("defense_date"),
                thesis_data.get("submission_date"),
                thesis_data.get("academic_year")
            ])
            
            if not has_any_date:
                warnings.append("No date information found (defense_date, submission_date, or academic_year)")
            
            # Validate date formats if present
            for date_field in ["defense_date", "submission_date"]:
                date_value = thesis_data.get(date_field)
                if date_value:
                    try:
                        # Try different date formats
                        if not re.match(r'\d{4}-\d{2}-\d{2}', str(date_value)):
                            # Try to convert other formats
                            if re.match(r'\d{2}/\d{2}/\d{4}', str(date_value)):
                                # Convert DD/MM/YYYY to YYYY-MM-DD
                                day, month, year = str(date_value).split('/')
                                raw_metadata["thesis"][date_field] = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                            elif re.match(r'\d{4}', str(date_value)):
                                # Just year, add default month/day
                                raw_metadata["thesis"][date_field] = f"{date_value}-01-01"
                            else:
                                warnings.append(f"Unusual date format for {date_field}: {date_value}")
                    except:
                        warnings.append(f"Could not parse date {date_field}: {date_value}")
            
            # Check for academic persons
            academic_persons = raw_metadata.get("academic_persons", [])
            if not academic_persons:
                warnings.append("No academic persons found")
            else:
                # Check for author or main person
                has_main_person = any(person.get("role") in ["author", "supervisor", "director"] 
                                    for person in academic_persons)
                if not has_main_person:
                    warnings.append("No main person (author/supervisor/director) found")
            
            # Document type validation
            doc_type = thesis_data.get("document_type")
            if doc_type and doc_type not in ["thèse", "mémoire", "dissertation", "projet"]:
                warnings.append(f"Unusual document type: {doc_type}")
            
            # Success if we have basic title and at least some metadata
            is_valid = len(errors) == 0
            
            return is_valid, errors + warnings, raw_metadata
            
        except Exception as e:
            errors.append(f"Validation error: {str(e)}")
            return False, errors, raw_metadata

    async def extract_enhanced_metadata(self, pdf_path: str) -> ExtractionResult:
        """
        Main enhanced extraction method
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"Starting enhanced metadata extraction for: {pdf_path}")
            
            # Check if file exists
            if not os.path.exists(pdf_path):
                return ExtractionResult(
                    success=False,
                    error_message=f"File not found: {pdf_path}",
                    processing_time=0.0
                )
            
            # Extract comprehensive text content
            text_sections = self.extract_comprehensive_text(pdf_path, self.max_pages_to_analyze)
            if not any(text_sections.values()):
                logger.warning(f"No text extracted from {pdf_path}")
            
            # Convert to images (first few pages)
            images = self.pdf_to_images(pdf_path, max_pages=3)
            if not images:
                logger.warning(f"No images extracted from {pdf_path}")
            
            # Extract metadata with enhanced Gemini API
            raw_metadata = await self.extract_with_enhanced_gemini(text_sections, images)
            
            if not raw_metadata:
                return ExtractionResult(
                    success=False,
                    error_message="Failed to extract metadata with enhanced Gemini API",
                    processing_time=(datetime.now() - start_time).total_seconds()
                )
            
            # Enhanced validation
            is_valid, messages, validated_metadata = self.enhanced_validation(raw_metadata)
            
            if not is_valid:
                # Check if we have critical errors vs warnings
                critical_errors = [msg for msg in messages if "Missing required field" in msg]
                if critical_errors:
                    return ExtractionResult(
                        success=False,
                        error_message=f"Critical validation errors: {'; '.join(critical_errors)}",
                        processing_time=(datetime.now() - start_time).total_seconds()
                    )
            
            # Calculate confidence score (enhanced)
            confidence_score = self.calculate_enhanced_confidence_score(validated_metadata)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Successfully extracted enhanced metadata from {pdf_path} "
                       f"(confidence: {confidence_score:.2f}, time: {processing_time:.2f}s)")
            
            return ExtractionResult(
                success=True,
                metadata=validated_metadata,  # This is now a dict
                confidence_score=confidence_score,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Unexpected error during enhanced extraction: {e}")
            return ExtractionResult(
                success=False,
                error_message=f"Unexpected error: {str(e)}",
                processing_time=(datetime.now() - start_time).total_seconds()
            )

    def calculate_enhanced_confidence_score(self, metadata: Dict[str, Any]) -> float:
        """
        Enhanced confidence score calculation
        """
        score = 0.0
        max_score = 0.0
        
        thesis_data = metadata.get("thesis", {})
        
        # Core information (30%)
        if thesis_data.get("title_fr"):
            score += 15
        if thesis_data.get("document_type"):
            score += 5
        if any([thesis_data.get("defense_date"), thesis_data.get("submission_date"), thesis_data.get("academic_year")]):
            score += 10
        max_score += 30
        
        # Academic persons (25%)
        academic_persons = metadata.get("academic_persons", [])
        if academic_persons:
            score += 10
            # Bonus for complete information
            complete_persons = sum(1 for person in academic_persons 
                                 if person.get("complete_name_fr") and person.get("role"))
            score += min(15, complete_persons * 3)
        max_score += 25
        
        # Institutional information (20%)
        if metadata.get("university", {}).get("name_fr"):
            score += 8
        if metadata.get("faculty", {}).get("name_fr"):
            score += 6
        if metadata.get("degree", {}).get("name_fr"):
            score += 6
        max_score += 20
        
        # Enhanced content (15%)
        if thesis_data.get("abstract_fr"):
            score += 5
        if thesis_data.get("table_of_contents"):
            score += 3
        if thesis_data.get("chapter_titles"):
            score += 3
        if thesis_data.get("references_count"):
            score += 2
        if thesis_data.get("specialization"):
            score += 2
        max_score += 15
        
        # Additional metadata (10%)
        if metadata.get("keywords"):
            score += 3
        if metadata.get("categories"):
            score += 3
        if metadata.get("study_location", {}).get("name_fr"):
            score += 2
        if thesis_data.get("total_pages"):
            score += 2
        max_score += 10
        
        return min(1.0, score / max_score) if max_score > 0 else 0.0

def create_enhanced_extractor(api_key: str, model_name: str = "gemini-1.5-flash") -> EnhancedGeminiExtractor:
    """
    Factory function to create an EnhancedGeminiExtractor instance
    """
    return EnhancedGeminiExtractor(api_key=api_key, model_name=model_name)

async def main():
    """Test the enhanced extractor"""
    
    API_KEY = "AIzaSyCG3cAtPWujvtHurXDTvrzJX4aHqEWtTVY"
    
    # Test files
    test_files = [
        "./toubkal_pdfs/thesis_23976_1.pdf",
        "./toubkal_pdfs/thesis_27301_1.pdf",
        "./toubkal_pdfs/thesis_17192_1.pdf"
    ]
    
    print("🚀 ENHANCED GEMINI METADATA EXTRACTION")
    print("=" * 60)
    
    # Create enhanced extractor
    extractor = create_enhanced_extractor(API_KEY)
    
    for pdf_file in test_files:
        if os.path.exists(pdf_file):
            filename = os.path.basename(pdf_file)
            size = os.path.getsize(pdf_file)
            print(f"\n📄 Processing: {filename} ({size:,} bytes)")
            print("-" * 50)
            
            result = await extractor.extract_enhanced_metadata(pdf_file)
            
            if result.success:
                print(f"✅ SUCCESS - Confidence: {result.confidence_score:.2f}")
                metadata = result.metadata  # This should be a dict now
                
                thesis_data = metadata.get("thesis", {})
                print(f"📚 Title: {thesis_data.get('title_fr', 'N/A')}")
                print(f"📄 Document Type: {thesis_data.get('document_type', 'N/A')}")
                
                if thesis_data.get("defense_date"):
                    print(f"📅 Defense Date: {thesis_data.get('defense_date')}")
                if thesis_data.get("submission_date"):
                    print(f"📅 Submission Date: {thesis_data.get('submission_date')}")
                if thesis_data.get("academic_year"):
                    print(f"📅 Academic Year: {thesis_data.get('academic_year')}")
                if thesis_data.get("specialization"):
                    print(f"🎓 Specialization: {thesis_data.get('specialization')}")
                
                university = metadata.get("university", {})
                if university.get("name_fr"):
                    print(f"🏛️ University: {university.get('name_fr')}")
                
                academic_persons = metadata.get("academic_persons", [])
                if academic_persons:
                    authors = [p for p in academic_persons if p.get("role") == "author"]
                    if authors:
                        print(f"👤 Author: {authors[0].get('complete_name_fr', 'N/A')}")
                
                print(f"👥 Total Academic Persons: {len(academic_persons)}")
                
                if thesis_data.get("abstract_fr"):
                    abstract = thesis_data.get("abstract_fr", "")
                    print(f"📝 Abstract: {abstract[:100]}..." if len(abstract) > 100 else f"📝 Abstract: {abstract}")
                
                if thesis_data.get("table_of_contents"):
                    toc = thesis_data.get("table_of_contents", [])
                    print(f"📋 Table of Contents: {len(toc)} items")
                
                if thesis_data.get("chapter_titles"):
                    chapters = thesis_data.get("chapter_titles", [])
                    print(f"📖 Chapter Titles: {len(chapters)} chapters")
                
                if thesis_data.get("references_count"):
                    print(f"📚 References: ~{thesis_data.get('references_count')} found")
                
                if thesis_data.get("total_pages"):
                    print(f"📄 Total Pages: {thesis_data.get('total_pages')}")
                
                keywords = metadata.get("keywords", [])
                if keywords:
                    print(f"🏷️ Keywords: {', '.join(keywords[:5])}{'...' if len(keywords) > 5 else ''}")
                
            else:
                print(f"❌ FAILED - {result.error_message}")
            
            print(f"⏱️ Processing Time: {result.processing_time:.2f}s")

if __name__ == "__main__":
    asyncio.run(main())