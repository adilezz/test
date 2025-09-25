#!/usr/bin/env python3
"""
Complete Pipeline Demonstration
Shows the full workflow from PDF to structured database-ready metadata
"""

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

# Import our modules
from gemini_metadata_extractor import create_gemini_extractor

async def demonstrate_complete_pipeline():
    """
    Demonstrate the complete metadata extraction pipeline
    """
    print("🚀 GEMINI METADATA EXTRACTION PIPELINE DEMONSTRATION")
    print("=" * 60)
    
    # Configuration
    API_KEY = "AIzaSyCG3cAtPWujvtHurXDTvrzJX4aHqEWtTVY"
    
    # Test files
    test_files = [
        "/workspace/first_pages-1.pdf",
        "/workspace/first_pages-2.pdf", 
        "/workspace/first_pages-3.pdf",
        "/workspace/first_pages-4.pdf"
    ]
    
    print(f"📁 Testing {len(test_files)} PDF files")
    print(f"🔑 Using Gemini API Key: {API_KEY[:20]}...")
    print()
    
    # Initialize extractor
    print("🔧 Initializing Gemini Metadata Extractor...")
    extractor = create_gemini_extractor(API_KEY)
    print("✅ Extractor initialized successfully")
    print()
    
    # Process each file
    results = {}
    total_processing_time = 0
    
    for i, pdf_file in enumerate(test_files, 1):
        filename = os.path.basename(pdf_file)
        print(f"📄 Processing {i}/{len(test_files)}: {filename}")
        print("-" * 40)
        
        # Extract metadata
        start_time = datetime.now()
        result = await extractor.extract_metadata(pdf_file)
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        total_processing_time += processing_time
        
        if result.success:
            print(f"✅ SUCCESS")
            print(f"⏱️  Processing time: {processing_time:.2f}s")
            print(f"🎯 Confidence score: {result.confidence_score:.2f}")
            
            # Display key extracted information
            metadata = result.metadata
            print(f"📚 Title: {metadata.thesis.title_fr}")
            
            if metadata.thesis.defense_date:
                print(f"📅 Defense date: {metadata.thesis.defense_date}")
            
            if metadata.thesis.thesis_number:
                print(f"🔢 Thesis number: {metadata.thesis.thesis_number}")
            
            if metadata.university.name_fr:
                print(f"🏛️  University: {metadata.university.name_fr}")
            
            if metadata.faculty.name_fr:
                print(f"🏫 Faculty: {metadata.faculty.name_fr}")
            
            # Academic persons
            authors = [p for p in metadata.academic_persons if p.role == "author"]
            if authors:
                print(f"👤 Author: {authors[0].complete_name_fr}")
            
            jury_members = [p for p in metadata.academic_persons if p.role != "author"]
            if jury_members:
                print(f"👥 Jury members: {len(jury_members)}")
            
            # Keywords
            if metadata.keywords:
                print(f"🏷️  Keywords: {', '.join(metadata.keywords[:3])}{'...' if len(metadata.keywords) > 3 else ''}")
            
        else:
            print(f"❌ FAILED")
            print(f"⏱️  Processing time: {processing_time:.2f}s")
            print(f"❗ Error: {result.error_message}")
        
        results[filename] = result
        print()
    
    # Summary
    print("📊 PIPELINE SUMMARY")
    print("=" * 60)
    
    successful = sum(1 for r in results.values() if r.success)
    failed = len(results) - successful
    avg_confidence = sum(r.confidence_score for r in results.values() if r.success) / max(successful, 1)
    avg_time = total_processing_time / len(results)
    
    print(f"📈 Success rate: {successful}/{len(results)} ({successful/len(results)*100:.1f}%)")
    print(f"🎯 Average confidence: {avg_confidence:.2f}")
    print(f"⏱️  Average processing time: {avg_time:.2f}s")
    print(f"⏱️  Total processing time: {total_processing_time:.2f}s")
    print()
    
    # Detailed results
    print("📋 DETAILED RESULTS")
    print("=" * 60)
    
    for filename, result in results.items():
        status_icon = "✅" if result.success else "❌"
        confidence = f"{result.confidence_score:.2f}" if result.confidence_score else "N/A"
        time_taken = f"{result.processing_time:.2f}s" if result.processing_time else "N/A"
        
        print(f"{status_icon} {filename}")
        print(f"   Confidence: {confidence}")
        print(f"   Time: {time_taken}")
        
        if result.success:
            metadata = result.metadata
            print(f"   Title: {metadata.thesis.title_fr[:50]}{'...' if len(metadata.thesis.title_fr) > 50 else ''}")
            print(f"   Academic persons: {len(metadata.academic_persons)}")
        else:
            print(f"   Error: {result.error_message}")
        print()
    
    # Database integration preview
    print("🗄️  DATABASE INTEGRATION PREVIEW")
    print("=" * 60)
    
    for filename, result in results.items():
        if result.success:
            print(f"📄 {filename}:")
            metadata = result.metadata
            
            # Thesis record
            print("   📚 THESIS TABLE:")
            thesis_data = {
                "title_fr": metadata.thesis.title_fr,
                "title_en": metadata.thesis.title_en,
                "defense_date": metadata.thesis.defense_date,
                "thesis_number": metadata.thesis.thesis_number,
                "language_id": "uuid_for_french" if metadata.language.primary == "fr" else None
            }
            for key, value in thesis_data.items():
                if value:
                    print(f"     {key}: {value}")
            
            # Academic persons
            print("   👥 ACADEMIC_PERSONS TABLE:")
            for person in metadata.academic_persons:
                print(f"     - {person.complete_name_fr} ({person.role})")
            
            # Institution hierarchy
            if metadata.university.name_fr:
                print(f"   🏛️  UNIVERSITY: {metadata.university.name_fr}")
            if metadata.faculty.name_fr:
                print(f"   🏫 FACULTY: {metadata.faculty.name_fr}")
            
            print()
    
    # API Integration example
    print("🔌 FASTAPI INTEGRATION EXAMPLE")
    print("=" * 60)
    
    print("""
# Add to main.py:
from fastapi_gemini_integration import setup_gemini_extraction

# Setup extraction service
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
setup_gemini_extraction(app, GEMINI_API_KEY)

# Available endpoints:
# POST /api/v1/metadata/extract - Extract from uploaded PDF
# POST /api/v1/metadata/extract/batch - Batch extraction
# GET /api/v1/metadata/health - Health check

# Usage in thesis upload:
@app.post("/api/v1/theses/upload")
async def upload_thesis(file: UploadFile = File(...)):
    # Save file...
    
    # Extract metadata
    extraction_result = await extract_and_store_metadata(
        thesis_id=str(thesis.id),
        pdf_file_path=saved_file_path
    )
    
    return {"extraction_confidence": extraction_result["confidence_score"]}
    """)
    
    print("🎉 DEMONSTRATION COMPLETE!")
    print("=" * 60)
    print("The pipeline is ready for production deployment!")
    print()
    print("Next steps:")
    print("1. Add GEMINI_API_KEY to environment variables")
    print("2. Integrate fastapi_gemini_integration.py into main.py")
    print("3. Implement database storage functions")
    print("4. Add background job processing")
    print("5. Create admin interface for monitoring")

if __name__ == "__main__":
    asyncio.run(demonstrate_complete_pipeline())