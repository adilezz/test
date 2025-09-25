#!/usr/bin/env python3
"""
Toubkal Repository Scraper
Downloads thesis PDFs from the Toubkal repository for testing
"""

import requests
from bs4 import BeautifulSoup
import os
import time
import re
from urllib.parse import urljoin, urlparse
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ToubkalScraper:
    """Scraper for Toubkal thesis repository"""
    
    def __init__(self, base_url="https://toubkal.imist.ma"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        # Disable SSL verification for testing (not recommended for production)
        self.session.verify = False
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        
    def get_thesis_page(self, thesis_id):
        """Get thesis page HTML"""
        url = f"{self.base_url}/handle/123456789/{thesis_id}"
        try:
            response = self.session.get(url, timeout=15)
            if response.status_code == 200:
                return response.text, url
            else:
                logger.error(f"Failed to get thesis {thesis_id}: {response.status_code}")
                return None, url
        except Exception as e:
            logger.error(f"Error accessing thesis {thesis_id}: {e}")
            return None, url
    
    def extract_pdf_links(self, html, base_url):
        """Extract PDF download links from thesis page"""
        soup = BeautifulSoup(html, 'html.parser')
        pdf_links = []
        
        # Look for bitstream links (common pattern in DSpace repositories)
        all_links = soup.find_all('a', href=True)
        for link in all_links:
            href = link.get('href')
            if href:
                # Check for bitstream PDF links
                if '/bitstream/' in href and href.lower().endswith('.pdf'):
                    full_url = urljoin(base_url, href)
                    if full_url not in pdf_links:
                        pdf_links.append(full_url)
                # Check for direct PDF links
                elif href.lower().endswith('.pdf'):
                    full_url = urljoin(base_url, href)
                    if full_url not in pdf_links:
                        pdf_links.append(full_url)
        
        # Also specifically look for file list table (ds-table file-list)
        file_tables = soup.find_all('table', class_='ds-table file-list')
        for table in file_tables:
            links = table.find_all('a', href=True)
            for link in links:
                href = link.get('href')
                if href and ('/bitstream/' in href or href.lower().endswith('.pdf')):
                    full_url = urljoin(base_url, href)
                    if full_url not in pdf_links:
                        pdf_links.append(full_url)
        
        return pdf_links
    
    def extract_metadata_from_page(self, html):
        """Extract available metadata from the thesis page"""
        soup = BeautifulSoup(html, 'html.parser')
        metadata = {}
        
        # Title
        title_elem = soup.find('h1') or soup.find('title')
        if title_elem:
            metadata['title'] = title_elem.get_text().strip()
        
        # Look for metadata table
        meta_tables = soup.find_all('table', class_='ds-includeSet-table')
        for table in meta_tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    key = cells[0].get_text().strip()
                    value = cells[1].get_text().strip()
                    metadata[key] = value
        
        return metadata
    
    def download_pdf(self, pdf_url, save_path):
        """Download PDF file"""
        try:
            logger.info(f"Downloading PDF from: {pdf_url}")
            response = self.session.get(pdf_url, timeout=30)
            if response.status_code == 200:
                with open(save_path, 'wb') as f:
                    f.write(response.content)
                logger.info(f"Downloaded PDF: {save_path} ({len(response.content)} bytes)")
                return True
            else:
                logger.error(f"Failed to download PDF: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error downloading PDF {pdf_url}: {e}")
            return False
    
    def process_thesis(self, thesis_id, download_dir="./toubkal_pdfs"):
        """Process a single thesis: extract metadata and download PDF"""
        logger.info(f"Processing thesis {thesis_id}")
        
        # Create download directory
        Path(download_dir).mkdir(exist_ok=True)
        
        # Get thesis page
        html, page_url = self.get_thesis_page(thesis_id)
        if not html:
            return None
        
        # Extract metadata from page
        page_metadata = self.extract_metadata_from_page(html)
        
        # Extract PDF links
        pdf_links = self.extract_pdf_links(html, page_url)
        
        result = {
            'thesis_id': thesis_id,
            'page_url': page_url,
            'page_metadata': page_metadata,
            'pdf_links': pdf_links,
            'downloaded_pdfs': []
        }
        
        # Download PDFs
        for i, pdf_url in enumerate(pdf_links):
            filename = f"thesis_{thesis_id}_{i+1}.pdf"
            save_path = os.path.join(download_dir, filename)
            
            if self.download_pdf(pdf_url, save_path):
                result['downloaded_pdfs'].append(save_path)
            
            # Be respectful with delays
            time.sleep(1)
        
        return result
    
    def process_multiple_theses(self, thesis_ids, download_dir="./toubkal_pdfs", max_count=5):
        """Process multiple theses"""
        results = []
        successful_downloads = 0
        
        for i, thesis_id in enumerate(thesis_ids[:max_count]):
            logger.info(f"Processing {i+1}/{min(len(thesis_ids), max_count)}: {thesis_id}")
            
            result = self.process_thesis(thesis_id, download_dir)
            if result:
                results.append(result)
                if result['downloaded_pdfs']:
                    successful_downloads += 1
            
            # Delay between requests
            time.sleep(2)
        
        logger.info(f"Completed: {successful_downloads}/{len(results)} theses with PDFs downloaded")
        return results

def main():
    """Test the scraper with sample thesis IDs"""
    
    # Sample thesis IDs from the user
    sample_ids = [
        "23976", "27301", "17192", "27062", "14689", 
        "16432", "26345", "29676", "19073", "22525"
    ]
    
    scraper = ToubkalScraper()
    
    print("🔍 Testing Toubkal Repository Access")
    print("=" * 50)
    
    # Test with first few IDs
    results = scraper.process_multiple_theses(sample_ids, max_count=3)
    
    # Print summary
    print("\n📊 SCRAPING RESULTS")
    print("=" * 50)
    
    for result in results:
        print(f"\n📄 Thesis {result['thesis_id']}:")
        print(f"   URL: {result['page_url']}")
        print(f"   Page metadata fields: {len(result['page_metadata'])}")
        print(f"   PDF links found: {len(result['pdf_links'])}")
        print(f"   PDFs downloaded: {len(result['downloaded_pdfs'])}")
        
        if result['page_metadata']:
            print("   Sample metadata:")
            for key, value in list(result['page_metadata'].items())[:3]:
                print(f"     {key}: {value[:100]}...")
        
        if result['downloaded_pdfs']:
            print("   Downloaded files:")
            for pdf_path in result['downloaded_pdfs']:
                size = os.path.getsize(pdf_path) if os.path.exists(pdf_path) else 0
                print(f"     {pdf_path} ({size:,} bytes)")
    
    return results

if __name__ == "__main__":
    main()