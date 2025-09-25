#!/usr/bin/env python3
"""
Simple Final Demo - Enhanced Gemini Metadata Extraction
Working demonstration with proper data handling
"""

import asyncio
import json
import os
from datetime import datetime
from enhanced_gemini_extractor import EnhancedGeminiExtractor

async def simple_final_demo():
    """Simple demonstration that works correctly"""
    
    print("🚀 ENHANCED GEMINI METADATA EXTRACTION - FINAL DEMO")
    print("=" * 70)
    
    API_KEY = "AIzaSyCG3cAtPWujvtHurXDTvrzJX4aHqEWtTVY"
    
    # Test files
    test_files = [
        "./toubkal_pdfs/thesis_23976_1.pdf",
        "./toubkal_pdfs/thesis_27301_1.pdf",
        "./toubkal_pdfs/thesis_17192_1.pdf"
    ]
    
    extractor = EnhancedGeminiExtractor(API_KEY)
    
    results_summary = []
    total_time = 0
    
    for i, pdf_file in enumerate(test_files, 1):
        if os.path.exists(pdf_file):
            filename = os.path.basename(pdf_file)
            size = os.path.getsize(pdf_file)
            
            print(f"\n📄 {i}/3: {filename} ({size:,} bytes)")
            print("-" * 50)
            
            try:
                start_time = datetime.now()
                
                # Extract comprehensive text sections
                text_sections = extractor.extract_comprehensive_text(pdf_file)
                print(f"📖 Extracted {len([s for s in text_sections.values() if s.strip()])} text sections")
                
                # Call Gemini API
                raw_metadata = await extractor.extract_with_enhanced_gemini(text_sections)
                
                processing_time = (datetime.now() - start_time).total_seconds()
                total_time += processing_time
                
                if raw_metadata:
                    # Validate
                    is_valid, messages, validated_metadata = extractor.enhanced_validation(raw_metadata)
                    confidence = extractor.calculate_enhanced_confidence_score(validated_metadata)
                    
                    print(f"✅ SUCCESS - Confidence: {confidence:.2f} - Time: {processing_time:.1f}s")
                    
                    # Extract key information
                    thesis_data = validated_metadata.get("thesis", {})
                    university = validated_metadata.get("university", {})
                    academic_persons = validated_metadata.get("academic_persons", [])
                    
                    # Display results
                    print(f"📚 Title: {thesis_data.get('title_fr', 'N/A')[:60]}...")
                    print(f"📄 Type: {thesis_data.get('document_type', 'N/A')}")
                    
                    if thesis_data.get('defense_date'):
                        print(f"📅 Defense: {thesis_data.get('defense_date')}")
                    if thesis_data.get('academic_year'):
                        print(f"📅 Year: {thesis_data.get('academic_year')}")
                    
                    if university.get('name_fr'):
                        print(f"🏛️ University: {university.get('name_fr')}")
                    
                    authors = [p for p in academic_persons if p.get('role') == 'author']
                    if authors:
                        print(f"👤 Author: {authors[0].get('complete_name_fr', 'N/A')}")
                    
                    print(f"👥 Academic Persons: {len(academic_persons)}")
                    
                    # Enhanced features
                    enhanced_features = []
                    if thesis_data.get('abstract_fr'):
                        enhanced_features.append(f"Abstract ({len(thesis_data.get('abstract_fr', ''))} chars)")
                    if thesis_data.get('table_of_contents'):
                        enhanced_features.append(f"TOC ({len(thesis_data.get('table_of_contents', []))} items)")
                    if thesis_data.get('references_count'):
                        enhanced_features.append(f"References (~{thesis_data.get('references_count')})")
                    
                    if enhanced_features:
                        print(f"🎯 Enhanced: {', '.join(enhanced_features)}")
                    
                    results_summary.append({
                        'file': filename,
                        'success': True,
                        'confidence': confidence,
                        'time': processing_time,
                        'title': thesis_data.get('title_fr', 'N/A'),
                        'type': thesis_data.get('document_type', 'N/A'),
                        'enhanced_count': len(enhanced_features)
                    })
                    
                else:
                    print(f"❌ FAILED - No metadata extracted")
                    results_summary.append({'file': filename, 'success': False})
                    
            except Exception as e:
                print(f"💥 ERROR: {str(e)[:100]}...")
                results_summary.append({'file': filename, 'success': False, 'error': str(e)})
    
    # Final summary
    print("\n" + "=" * 70)
    print("📊 FINAL RESULTS SUMMARY")
    print("=" * 70)
    
    successful = sum(1 for r in results_summary if r.get('success'))
    total = len(results_summary)
    
    print(f"📈 Success Rate: {successful}/{total} ({successful/total*100:.1f}%)")
    
    if successful > 0:
        avg_confidence = sum(r.get('confidence', 0) for r in results_summary if r.get('success')) / successful
        avg_time = sum(r.get('time', 0) for r in results_summary if r.get('success')) / successful
        
        print(f"🎯 Average Confidence: {avg_confidence:.2f}")
        print(f"⏱️ Average Time: {avg_time:.1f}s")
        print(f"⏱️ Total Time: {total_time:.1f}s")
    
    print("\n📋 Individual Results:")
    for result in results_summary:
        status = "✅" if result.get('success') else "❌"
        confidence = f"{result.get('confidence', 0):.2f}" if result.get('success') else "N/A"
        enhanced = f" | Enhanced: {result.get('enhanced_count', 0)}" if result.get('success') else ""
        print(f"{status} {result['file']}: {confidence}{enhanced}")
    
    # Production readiness
    print(f"\n🚀 PRODUCTION READINESS:")
    criteria = {
        "High Success Rate": successful >= 2,
        "Good Confidence": avg_confidence >= 0.85 if successful > 0 else False,
        "Reasonable Performance": avg_time <= 60 if successful > 0 else False,
        "Enhanced Features": sum(r.get('enhanced_count', 0) for r in results_summary if r.get('success')) > 0
    }
    
    for criterion, passed in criteria.items():
        status = "✅" if passed else "❌"
        print(f"{status} {criterion}")
    
    all_passed = all(criteria.values())
    if all_passed:
        print("\n🎉 PIPELINE IS PRODUCTION READY!")
        print("✅ Successfully tested on real Moroccan thesis PDFs")
        print("✅ High accuracy and comprehensive metadata extraction")
        print("✅ Ready for deployment in thesis repository system")
    else:
        print("\n⚠️ Pipeline needs refinement before production")
    
    return results_summary

if __name__ == "__main__":
    asyncio.run(simple_final_demo())