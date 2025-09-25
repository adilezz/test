#!/usr/bin/env python3
"""
Test Enhanced Extraction on Real Thesis PDFs
Simplified approach using raw dictionaries
"""

import asyncio
import json
import os
from datetime import datetime
from enhanced_gemini_extractor import EnhancedGeminiExtractor

async def test_enhanced_extraction():
    """Test the enhanced extraction on real thesis PDFs"""
    
    API_KEY = "AIzaSyCG3cAtPWujvtHurXDTvrzJX4aHqEWtTVY"
    
    # Test files
    test_files = [
        ("./toubkal_pdfs/thesis_23976_1.pdf", "Medical thesis - Bévacizumab effects"),
        ("./toubkal_pdfs/thesis_27301_1.pdf", "Pediatric surgery - Diaphragmatic hernias"),
        ("./toubkal_pdfs/thesis_17192_1.pdf", "Anesthesia-Resuscitation memoir - COVID-19")
    ]
    
    print("🚀 ENHANCED GEMINI METADATA EXTRACTION TEST")
    print("=" * 70)
    
    # Create enhanced extractor
    extractor = EnhancedGeminiExtractor(API_KEY)
    
    results = []
    
    for pdf_file, description in test_files:
        if os.path.exists(pdf_file):
            filename = os.path.basename(pdf_file)
            size = os.path.getsize(pdf_file)
            print(f"\n📄 Processing: {filename}")
            print(f"📝 Description: {description}")
            print(f"💾 Size: {size:,} bytes")
            print("-" * 70)
            
            try:
                # Extract comprehensive text
                text_sections = extractor.extract_comprehensive_text(pdf_file)
                print(f"📖 Text sections extracted: {list(text_sections.keys())}")
                
                # Show sample text from each section
                for section, text in text_sections.items():
                    if text.strip():
                        print(f"   {section}: {len(text)} chars - '{text[:100].strip()}...'")
                
                # Convert to images
                images = extractor.pdf_to_images(pdf_file, max_pages=2)
                print(f"🖼️ Images extracted: {len(images)}")
                
                # Extract with Gemini
                print("🤖 Calling Gemini API...")
                start_time = datetime.now()
                
                raw_metadata = await extractor.extract_with_enhanced_gemini(text_sections, images)
                
                processing_time = (datetime.now() - start_time).total_seconds()
                print(f"⏱️ API call time: {processing_time:.2f}s")
                
                if raw_metadata:
                    print("✅ Gemini API Success!")
                    
                    # Validate
                    is_valid, messages, validated_metadata = extractor.enhanced_validation(raw_metadata)
                    
                    # Calculate confidence
                    confidence = extractor.calculate_enhanced_confidence_score(validated_metadata)
                    
                    print(f"🎯 Confidence Score: {confidence:.2f}")
                    print(f"✔️ Validation: {'PASSED' if is_valid else 'FAILED'}")
                    if messages:
                        print(f"⚠️ Messages: {'; '.join(messages[:3])}")
                    
                    # Display extracted metadata
                    print("\n📊 EXTRACTED METADATA:")
                    print("-" * 40)
                    
                    thesis_data = validated_metadata.get("thesis", {})
                    print(f"📚 Title: {thesis_data.get('title_fr', 'N/A')}")
                    print(f"📄 Document Type: {thesis_data.get('document_type', 'N/A')}")
                    
                    # Dates
                    dates_found = []
                    if thesis_data.get("defense_date"):
                        dates_found.append(f"Defense: {thesis_data.get('defense_date')}")
                    if thesis_data.get("submission_date"):
                        dates_found.append(f"Submission: {thesis_data.get('submission_date')}")
                    if thesis_data.get("academic_year"):
                        dates_found.append(f"Academic Year: {thesis_data.get('academic_year')}")
                    
                    if dates_found:
                        print(f"📅 Dates: {', '.join(dates_found)}")
                    
                    if thesis_data.get("specialization"):
                        print(f"🎓 Specialization: {thesis_data.get('specialization')}")
                    
                    # Institution
                    university = validated_metadata.get("university", {})
                    if university.get("name_fr"):
                        print(f"🏛️ University: {university.get('name_fr')}")
                    
                    faculty = validated_metadata.get("faculty", {})
                    if faculty.get("name_fr"):
                        print(f"🏫 Faculty: {faculty.get('name_fr')}")
                    
                    # Academic persons
                    academic_persons = validated_metadata.get("academic_persons", [])
                    if academic_persons:
                        print(f"👥 Academic Persons: {len(academic_persons)}")
                        
                        authors = [p for p in academic_persons if p.get("role") == "author"]
                        if authors:
                            print(f"   👤 Author: {authors[0].get('complete_name_fr', 'N/A')}")
                        
                        supervisors = [p for p in academic_persons if p.get("role") in ["director", "supervisor"]]
                        if supervisors:
                            print(f"   👨‍🏫 Supervisor: {supervisors[0].get('complete_name_fr', 'N/A')}")
                        
                        jury = [p for p in academic_persons if "jury" in p.get("role", "")]
                        if jury:
                            print(f"   ⚖️ Jury Members: {len(jury)}")
                    
                    # Enhanced content
                    if thesis_data.get("abstract_fr"):
                        abstract = thesis_data.get("abstract_fr", "")
                        print(f"📝 Abstract: {abstract[:150]}..." if len(abstract) > 150 else f"📝 Abstract: {abstract}")
                    
                    if thesis_data.get("table_of_contents"):
                        toc = thesis_data.get("table_of_contents", [])
                        print(f"📋 Table of Contents: {len(toc)} items")
                        if toc:
                            print(f"   First few: {', '.join(toc[:3])}")
                    
                    if thesis_data.get("chapter_titles"):
                        chapters = thesis_data.get("chapter_titles", [])
                        print(f"📖 Chapters: {len(chapters)}")
                        if chapters:
                            print(f"   First few: {', '.join(chapters[:3])}")
                    
                    if thesis_data.get("references_count"):
                        print(f"📚 References: ~{thesis_data.get('references_count')}")
                    
                    if thesis_data.get("total_pages"):
                        print(f"📄 Total Pages: {thesis_data.get('total_pages')}")
                    
                    keywords = validated_metadata.get("keywords", [])
                    if keywords:
                        print(f"🏷️ Keywords: {', '.join(keywords[:5])}{'...' if len(keywords) > 5 else ''}")
                    
                    # Store result
                    results.append({
                        "file": filename,
                        "success": True,
                        "confidence": confidence,
                        "processing_time": processing_time,
                        "metadata": validated_metadata
                    })
                    
                else:
                    print("❌ Gemini API Failed!")
                    results.append({
                        "file": filename,
                        "success": False,
                        "error": "Gemini API returned empty result"
                    })
                
            except Exception as e:
                print(f"💥 ERROR: {e}")
                results.append({
                    "file": filename,
                    "success": False,
                    "error": str(e)
                })
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 EXTRACTION SUMMARY")
    print("=" * 70)
    
    successful = sum(1 for r in results if r.get("success"))
    total = len(results)
    
    print(f"Success Rate: {successful}/{total} ({successful/total*100:.1f}%)")
    
    if successful > 0:
        avg_confidence = sum(r.get("confidence", 0) for r in results if r.get("success")) / successful
        avg_time = sum(r.get("processing_time", 0) for r in results if r.get("success")) / successful
        print(f"Average Confidence: {avg_confidence:.2f}")
        print(f"Average Processing Time: {avg_time:.2f}s")
    
    # Save detailed results
    output_file = "/workspace/enhanced_extraction_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Detailed results saved to: {output_file}")
    
    return results

if __name__ == "__main__":
    asyncio.run(test_enhanced_extraction())