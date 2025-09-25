#!/usr/bin/env python3
"""
Metadata Extraction Pipeline using Google Gemini API
A comprehensive pipeline to extract thesis metadata from PDF first pages
"""

import os
import json
import uuid
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
import base64

# PDF processing
import PyPDF2
from pdf2image import convert_from_path
from PIL import Image

# Google Gemini API
import google.generativeai as genai

# Database schema matching types
from enum import Enum

class ThesisStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    REJECTED = "rejected"

class AcademicRole(str, Enum):
    AUTHOR = "author"
    DIRECTOR = "director"
    CO_DIRECTOR = "co_director"
    JURY_PRESIDENT = "jury_president"
    JURY_EXAMINER = "jury_examiner"
    JURY_REPORTER = "jury_reporter"
    EXTERNAL_EXAMINER = "external_examiner"

class MetadataExtractionPipeline:
    """
    Pipeline for extracting thesis metadata from PDF first pages using Google Gemini API
    """
    
    def __init__(self, api_key: str):
        """Initialize the pipeline with Google Gemini API key"""
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Schema template for extraction
        self.extraction_schema = {
            "thesis": {
                "title_fr": None,
                "title_en": None,
                "title_ar": None,
                "abstract_fr": None,
                "abstract_en": None,
                "abstract_ar": None,
                "defense_date": None,
                "page_count": None,
                "thesis_number": None
            },
            "university": {
                "name_fr": None,
                "name_en": None,
                "name_ar": None,
                "acronym": None
            },
            "faculty": {
                "name_fr": None,
                "name_en": None,
                "name_ar": None,
                "acronym": None
            },
            "school": {
                "name_fr": None,
                "name_en": None,
                "name_ar": None,
                "acronym": None
            },
            "department": {
                "name_fr": None,
                "name_en": None,
                "name_ar": None,
                "acronym": None
            },
            "degree": {
                "name_fr": None,
                "name_en": None,
                "name_ar": None,
                "abbreviation": None,
                "type": None,
                "category": None
            },
            "language": {
                "primary": None,  # ISO code
                "secondary": []   # List of ISO codes
            },
            "academic_persons": [
                {
                    "complete_name_fr": None,
                    "complete_name_ar": None,
                    "first_name_fr": None,
                    "last_name_fr": None,
                    "first_name_ar": None,
                    "last_name_ar": None,
                    "title": None,  # Dr., Prof., etc.
                    "role": None,   # author, director, co_director, etc.
                    "university_id": None,
                    "faculty_id": None,
                    "school_id": None,
                    "external_institution_name": None,
                    "external_institution_country": None,
                    "external_institution_type": None,
                    "is_external": False
                }
            ],
            "categories": [],  # Subject/field categories
            "keywords": [],    # Key terms and phrases
            "study_location": {
                "name_fr": None,
                "name_en": None,
                "name_ar": None,
                "level": None  # country, region, province, city
            }
        }

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF first page"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                if len(pdf_reader.pages) > 0:
                    first_page = pdf_reader.pages[0]
                    text = first_page.extract_text()
                    return text
                return ""
        except Exception as e:
            print(f"Error extracting text from {pdf_path}: {e}")
            return ""

    def pdf_to_image(self, pdf_path: str) -> Optional[Image.Image]:
        """Convert PDF first page to image for visual analysis"""
        try:
            images = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=300)
            if images:
                return images[0]
            return None
        except Exception as e:
            print(f"Error converting PDF to image {pdf_path}: {e}")
            return None

    def create_extraction_prompt(self) -> str:
        """Create comprehensive prompt for Gemini API"""
        return """
You are an expert in academic document analysis, specifically Moroccan thesis documents. 
Analyze the provided thesis first page (text and/or image) and extract metadata in the exact JSON format specified below.

IMPORTANT INSTRUCTIONS:
1. Extract information in French, English, and Arabic when available
2. For academic persons, identify their roles: author, director, co_director, jury_president, jury_examiner, jury_reporter, external_examiner
3. Identify institutional hierarchy: University → Faculty/School → Department
4. Extract degree information (Doctorat, Master, Licence, etc.)
5. Look for defense date, thesis number, and study location
6. Identify subject categories and keywords
7. Determine primary and secondary languages of the thesis
8. For external persons/institutions, mark is_external as true

REQUIRED JSON STRUCTURE:
{
    "thesis": {
        "title_fr": "French title",
        "title_en": "English title if available",
        "title_ar": "Arabic title if available",
        "abstract_fr": "French abstract if available on first page",
        "abstract_en": "English abstract if available on first page",
        "abstract_ar": "Arabic abstract if available on first page",
        "defense_date": "YYYY-MM-DD format if found",
        "page_count": "number if mentioned",
        "thesis_number": "thesis registration number if found"
    },
    "university": {
        "name_fr": "French university name",
        "name_en": "English university name if available",
        "name_ar": "Arabic university name if available",
        "acronym": "University acronym if available"
    },
    "faculty": {
        "name_fr": "French faculty name",
        "name_en": "English faculty name if available", 
        "name_ar": "Arabic faculty name if available",
        "acronym": "Faculty acronym if available"
    },
    "school": {
        "name_fr": "French school name if different from faculty",
        "name_en": "English school name if available",
        "name_ar": "Arabic school name if available", 
        "acronym": "School acronym if available"
    },
    "department": {
        "name_fr": "French department name",
        "name_en": "English department name if available",
        "name_ar": "Arabic department name if available",
        "acronym": "Department acronym if available"
    },
    "degree": {
        "name_fr": "French degree name (Doctorat, Master, etc.)",
        "name_en": "English degree name if available",
        "name_ar": "Arabic degree name if available",
        "abbreviation": "Degree abbreviation (Ph.D., M.Sc., etc.)",
        "type": "doctorate/master/bachelor/other",
        "category": "research/professional/other"
    },
    "language": {
        "primary": "fr/en/ar - primary language of thesis",
        "secondary": ["fr", "en", "ar"] - secondary languages if multilingual
    },
    "academic_persons": [
        {
            "complete_name_fr": "Full name in French",
            "complete_name_ar": "Full name in Arabic if available",
            "first_name_fr": "First name in French",
            "last_name_fr": "Last name in French", 
            "first_name_ar": "First name in Arabic if available",
            "last_name_ar": "Last name in Arabic if available",
            "title": "Dr./Prof./Mr./Ms./etc.",
            "role": "author/director/co_director/jury_president/jury_examiner/jury_reporter/external_examiner",
            "university_id": null,
            "faculty_id": null,
            "school_id": null,
            "external_institution_name": "External institution name if person is external",
            "external_institution_country": "Country if external institution",
            "external_institution_type": "university/research_center/company/etc.",
            "is_external": false
        }
    ],
    "categories": ["Subject area", "Research field", "Discipline"],
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "study_location": {
        "name_fr": "City/Location name in French",
        "name_en": "City/Location name in English if available",
        "name_ar": "City/Location name in Arabic if available", 
        "level": "city/province/region/country"
    }
}

RETURN ONLY THE JSON OBJECT, NO OTHER TEXT.
If information is not available, use null for the field.
Be precise and accurate in your extraction.
"""

    def extract_metadata_with_gemini(self, text_content: str, image: Optional[Image.Image] = None) -> Dict[str, Any]:
        """Extract metadata using Gemini API"""
        try:
            prompt = self.create_extraction_prompt()
            
            # Prepare content for Gemini
            content_parts = [prompt]
            
            if text_content:
                content_parts.append(f"\n\nTEXT CONTENT:\n{text_content}")
            
            if image:
                content_parts.append(image)
            
            # Call Gemini API
            response = self.model.generate_content(content_parts)
            
            if response and response.text:
                # Clean and parse JSON response
                json_text = response.text.strip()
                # Remove potential markdown formatting
                if json_text.startswith('```json'):
                    json_text = json_text[7:]
                if json_text.endswith('```'):
                    json_text = json_text[:-3]
                
                try:
                    metadata = json.loads(json_text)
                    return metadata
                except json.JSONDecodeError as e:
                    print(f"JSON parsing error: {e}")
                    print(f"Raw response: {response.text}")
                    return {}
            
            return {}
            
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            return {}

    def analyze_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """Complete analysis of a PDF file"""
        print(f"\n{'='*60}")
        print(f"Analyzing: {pdf_path}")
        print(f"{'='*60}")
        
        # Extract text
        text_content = self.extract_text_from_pdf(pdf_path)
        print(f"Extracted text length: {len(text_content)} characters")
        
        # Convert to image
        image = self.pdf_to_image(pdf_path)
        print(f"Image conversion: {'Success' if image else 'Failed'}")
        
        # Extract metadata with Gemini
        metadata = self.extract_metadata_with_gemini(text_content, image)
        
        # Add analysis metadata
        analysis_info = {
            "file_path": pdf_path,
            "file_name": os.path.basename(pdf_path),
            "analysis_timestamp": datetime.now().isoformat(),
            "text_length": len(text_content),
            "has_image": image is not None,
            "extraction_status": "success" if metadata else "failed"
        }
        
        return {
            "analysis_info": analysis_info,
            "extracted_text": text_content[:1000] + "..." if len(text_content) > 1000 else text_content,
            "metadata": metadata
        }

    def validate_metadata_schema(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted metadata against database schema"""
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Check required fields
        if not metadata.get("thesis", {}).get("title_fr"):
            validation_results["errors"].append("Missing required field: thesis.title_fr")
            validation_results["valid"] = False
        
        if not metadata.get("thesis", {}).get("abstract_fr"):
            validation_results["warnings"].append("Missing recommended field: thesis.abstract_fr")
        
        if not metadata.get("thesis", {}).get("defense_date"):
            validation_results["errors"].append("Missing required field: thesis.defense_date")
            validation_results["valid"] = False
        
        # Validate academic persons
        academic_persons = metadata.get("academic_persons", [])
        if not academic_persons:
            validation_results["errors"].append("No academic persons found")
            validation_results["valid"] = False
        else:
            # Check for author
            has_author = any(person.get("role") == "author" for person in academic_persons)
            if not has_author:
                validation_results["errors"].append("No author found in academic persons")
                validation_results["valid"] = False
            
            # Validate roles
            valid_roles = [role.value for role in AcademicRole]
            for i, person in enumerate(academic_persons):
                role = person.get("role")
                if role and role not in valid_roles:
                    validation_results["warnings"].append(f"Invalid role '{role}' for person {i}")
        
        # Validate dates
        defense_date = metadata.get("thesis", {}).get("defense_date")
        if defense_date:
            try:
                datetime.strptime(defense_date, "%Y-%m-%d")
            except ValueError:
                validation_results["errors"].append("Invalid defense_date format, should be YYYY-MM-DD")
                validation_results["valid"] = False
        
        # Validate language codes
        primary_lang = metadata.get("language", {}).get("primary")
        if primary_lang and primary_lang not in ["fr", "en", "ar"]:
            validation_results["warnings"].append(f"Unusual primary language code: {primary_lang}")
        
        return validation_results

    def run_pipeline(self, pdf_files: List[str]) -> Dict[str, Any]:
        """Run the complete extraction pipeline on multiple PDF files"""
        results = {
            "pipeline_info": {
                "start_time": datetime.now().isoformat(),
                "total_files": len(pdf_files),
                "api_key_configured": bool(self.api_key)
            },
            "file_results": {}
        }
        
        for pdf_file in pdf_files:
            if os.path.exists(pdf_file):
                try:
                    # Analyze PDF
                    analysis = self.analyze_pdf(pdf_file)
                    
                    # Validate metadata
                    if analysis["metadata"]:
                        validation = self.validate_metadata_schema(analysis["metadata"])
                        analysis["validation"] = validation
                    
                    results["file_results"][pdf_file] = analysis
                    
                except Exception as e:
                    results["file_results"][pdf_file] = {
                        "error": str(e),
                        "analysis_info": {
                            "file_path": pdf_file,
                            "extraction_status": "error"
                        }
                    }
            else:
                results["file_results"][pdf_file] = {
                    "error": f"File not found: {pdf_file}"
                }
        
        results["pipeline_info"]["end_time"] = datetime.now().isoformat()
        return results

def main():
    """Main function to run the metadata extraction pipeline"""
    # Configuration
    GEMINI_API_KEY = "AIzaSyCG3cAtPWujvtHurXDTvrzJX4aHqEWtTVY"
    
    # PDF files to analyze
    pdf_files = [
        "/workspace/first_pages-1.pdf",
        "/workspace/first_pages-2.pdf", 
        "/workspace/first_pages-3.pdf",
        "/workspace/first_pages-4.pdf"
    ]
    
    # Initialize pipeline
    pipeline = MetadataExtractionPipeline(GEMINI_API_KEY)
    
    # Run pipeline
    print("Starting Metadata Extraction Pipeline...")
    print(f"Analyzing {len(pdf_files)} PDF files...")
    
    results = pipeline.run_pipeline(pdf_files)
    
    # Save results
    output_file = "/workspace/extraction_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\nResults saved to: {output_file}")
    
    # Print summary
    print(f"\n{'='*60}")
    print("PIPELINE SUMMARY")
    print(f"{'='*60}")
    
    total_files = results["pipeline_info"]["total_files"]
    successful = sum(1 for result in results["file_results"].values() 
                    if result.get("analysis_info", {}).get("extraction_status") == "success")
    failed = total_files - successful
    
    print(f"Total files processed: {total_files}")
    print(f"Successful extractions: {successful}")
    print(f"Failed extractions: {failed}")
    
    # Print validation summary
    print(f"\nVALIDATION SUMMARY:")
    for file_path, result in results["file_results"].items():
        validation = result.get("validation", {})
        if validation:
            status = "✓ VALID" if validation.get("valid") else "✗ INVALID"
            errors = len(validation.get("errors", []))
            warnings = len(validation.get("warnings", []))
            print(f"{os.path.basename(file_path)}: {status} ({errors} errors, {warnings} warnings)")
    
    return results

if __name__ == "__main__":
    main()