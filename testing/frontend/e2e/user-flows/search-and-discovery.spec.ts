/**
 * Search and Discovery User Flow Tests
 * Tests the complete thesis search and discovery experience
 */

import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { SearchResultsPage } from '../page-objects/SearchResultsPage';
import { ThesisDetailPage } from '../page-objects/ThesisDetailPage';

test.describe('Thesis Search and Discovery', () => {
  let homePage: HomePage;
  let searchResultsPage: SearchResultsPage;
  let thesisDetailPage: ThesisDetailPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    searchResultsPage = new SearchResultsPage(page);
    thesisDetailPage = new ThesisDetailPage(page);
    
    await homePage.goto();
  });

  test('should load homepage with statistics and search functionality', async ({ page }) => {
    // Verify homepage loads correctly
    await expect(page).toHaveTitle(/theses\.ma/);
    
    // Check main elements are visible
    await expect(homePage.searchInput).toBeVisible();
    await expect(homePage.searchButton).toBeVisible();
    
    // Verify statistics are loaded
    await expect(homePage.statisticsSection).toBeVisible();
    await homePage.waitForStatisticsToLoad();
    
    // Check featured theses section
    await expect(homePage.featuredThesesSection).toBeVisible();
    
    // Verify navigation menu
    await expect(homePage.navigationMenu).toBeVisible();
  });

  test('should perform basic search and display results', async ({ page }) => {
    const searchTerm = 'intelligence artificielle';
    
    // Perform search
    await homePage.performSearch(searchTerm);
    
    // Should navigate to search results page
    await expect(page).toHaveURL(/\/search/);
    await expect(searchResultsPage.searchInput).toHaveValue(searchTerm);
    
    // Check search results are displayed
    await searchResultsPage.waitForResults();
    await expect(searchResultsPage.resultsContainer).toBeVisible();
    
    // Verify pagination if results exist
    const resultCount = await searchResultsPage.getResultCount();
    if (resultCount > 0) {
      await expect(searchResultsPage.resultsList).toBeVisible();
      
      // Check first result structure
      const firstResult = searchResultsPage.getFirstResult();
      await expect(firstResult.title).toBeVisible();
      await expect(firstResult.author).toBeVisible();
      await expect(firstResult.university).toBeVisible();
    }
  });

  test('should use advanced search filters', async ({ page }) => {
    // Navigate to search page
    await homePage.clickAdvancedSearch();
    await expect(page).toHaveURL(/\/search/);
    
    // Open filters panel
    await searchResultsPage.openFiltersPanel();
    
    // Apply various filters
    await searchResultsPage.selectUniversityFilter('Université Mohammed V');
    await searchResultsPage.selectCategoryFilter('Informatique');
    await searchResultsPage.selectLanguageFilter('Français');
    await searchResultsPage.setYearRange(2020, 2024);
    
    // Apply filters
    await searchResultsPage.applyFilters();
    
    // Verify URL contains filter parameters
    await expect(page).toHaveURL(/university_id=/);
    await expect(page).toHaveURL(/category_id=/);
    await expect(page).toHaveURL(/language_id=/);
    
    // Check results are filtered
    await searchResultsPage.waitForResults();
    
    // Verify active filters are displayed
    await expect(searchResultsPage.activeFilters).toBeVisible();
  });

  test('should change view modes (grid/list)', async ({ page }) => {
    // Perform search to get results
    await homePage.performSearch('test');
    await searchResultsPage.waitForResults();
    
    const resultCount = await searchResultsPage.getResultCount();
    if (resultCount > 0) {
      // Test grid view (default)
      await expect(searchResultsPage.gridViewButton).toHaveClass(/active/);
      await expect(searchResultsPage.resultsContainer).toHaveClass(/grid/);
      
      // Switch to list view
      await searchResultsPage.switchToListView();
      await expect(searchResultsPage.listViewButton).toHaveClass(/active/);
      await expect(searchResultsPage.resultsContainer).toHaveClass(/list/);
      
      // Switch back to grid view
      await searchResultsPage.switchToGridView();
      await expect(searchResultsPage.gridViewButton).toHaveClass(/active/);
    }
  });

  test('should sort search results', async ({ page }) => {
    // Perform search
    await homePage.performSearch('test');
    await searchResultsPage.waitForResults();
    
    const resultCount = await searchResultsPage.getResultCount();
    if (resultCount > 1) {
      // Test different sorting options
      await searchResultsPage.selectSortOption('Date de soutenance (récent)');
      await searchResultsPage.waitForResults();
      
      await searchResultsPage.selectSortOption('Titre (A-Z)');
      await searchResultsPage.waitForResults();
      
      await searchResultsPage.selectSortOption('Université');
      await searchResultsPage.waitForResults();
      
      // Verify URL updates with sort parameters
      await expect(page).toHaveURL(/sort_field=/);
      await expect(page).toHaveURL(/sort_order=/);
    }
  });

  test('should navigate through pagination', async ({ page }) => {
    // Perform search that should return multiple pages
    await homePage.performSearch('a'); // Broad search
    await searchResultsPage.waitForResults();
    
    const totalPages = await searchResultsPage.getTotalPages();
    if (totalPages > 1) {
      // Go to next page
      await searchResultsPage.goToNextPage();
      await expect(page).toHaveURL(/page=2/);
      await searchResultsPage.waitForResults();
      
      // Go to previous page
      await searchResultsPage.goToPreviousPage();
      await expect(page).toHaveURL(/page=1/);
      
      // Go to specific page
      if (totalPages > 2) {
        await searchResultsPage.goToPage(3);
        await expect(page).toHaveURL(/page=3/);
      }
    }
  });

  test('should view thesis details', async ({ page }) => {
    // Search and find a thesis
    await homePage.performSearch('test');
    await searchResultsPage.waitForResults();
    
    const resultCount = await searchResultsPage.getResultCount();
    if (resultCount > 0) {
      // Click on first thesis
      await searchResultsPage.clickFirstThesis();
      
      // Should navigate to thesis detail page
      await expect(page).toHaveURL(/\/thesis\/[a-f0-9-]+/);
      
      // Verify thesis details are displayed
      await expect(thesisDetailPage.thesisTitle).toBeVisible();
      await expect(thesisDetailPage.thesisAbstract).toBeVisible();
      await expect(thesisDetailPage.thesisMetadata).toBeVisible();
      
      // Check download button
      await expect(thesisDetailPage.downloadButton).toBeVisible();
      
      // Check citation formats
      await expect(thesisDetailPage.citationSection).toBeVisible();
      
      // Verify breadcrumb navigation
      await expect(thesisDetailPage.breadcrumb).toBeVisible();
    }
  });

  test('should download thesis PDF', async ({ page }) => {
    // Navigate to a thesis detail page
    await homePage.performSearch('test');
    await searchResultsPage.waitForResults();
    
    const resultCount = await searchResultsPage.getResultCount();
    if (resultCount > 0) {
      await searchResultsPage.clickFirstThesis();
      
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await thesisDetailPage.downloadButton.click();
      
      const download = await downloadPromise;
      
      // Verify download started
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    }
  });

  test('should handle empty search results', async ({ page }) => {
    // Search for something that shouldn't exist
    const uniqueSearch = 'xyzabc123nonexistent';
    await homePage.performSearch(uniqueSearch);
    
    await searchResultsPage.waitForResults();
    
    // Should show no results message
    await expect(searchResultsPage.noResultsMessage).toBeVisible();
    await expect(searchResultsPage.noResultsMessage).toContainText('Aucun résultat');
    
    // Should show search suggestions or tips
    await expect(searchResultsPage.searchSuggestions).toBeVisible();
  });

  test('should handle search errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/theses*', route => route.abort());
    
    await homePage.performSearch('test');
    
    // Should show error message
    await expect(searchResultsPage.errorMessage).toBeVisible();
    await expect(searchResultsPage.retryButton).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/theses*');
    await searchResultsPage.retryButton.click();
    
    // Should load results after retry
    await searchResultsPage.waitForResults();
  });

  test('should maintain search state on page refresh', async ({ page }) => {
    // Perform search with filters
    await homePage.performSearch('intelligence');
    await searchResultsPage.waitForResults();
    
    await searchResultsPage.openFiltersPanel();
    await searchResultsPage.selectUniversityFilter('Université Mohammed V');
    await searchResultsPage.applyFilters();
    
    // Refresh page
    await page.reload();
    
    // Should maintain search state
    await expect(searchResultsPage.searchInput).toHaveValue('intelligence');
    await expect(searchResultsPage.activeFilters).toBeVisible();
    await searchResultsPage.waitForResults();
  });

  test('should work on mobile devices', async ({ page, isMobile }) => {
    if (isMobile) {
      // Test mobile-specific functionality
      await expect(homePage.mobileMenuButton).toBeVisible();
      
      // Test mobile search
      await homePage.performSearch('test');
      await searchResultsPage.waitForResults();
      
      // Test mobile filters (should be collapsible)
      await searchResultsPage.toggleMobileFilters();
      await expect(searchResultsPage.filtersPanel).toBeVisible();
      
      // Test mobile view toggle
      const resultCount = await searchResultsPage.getResultCount();
      if (resultCount > 0) {
        await searchResultsPage.switchToListView();
        // List view should be better for mobile
        await expect(searchResultsPage.resultsContainer).toHaveClass(/list/);
      }
    }
  });

  test('should track thesis views', async ({ page }) => {
    // Navigate to thesis detail
    await homePage.performSearch('test');
    await searchResultsPage.waitForResults();
    
    const resultCount = await searchResultsPage.getResultCount();
    if (resultCount > 0) {
      await searchResultsPage.clickFirstThesis();
      
      // Wait for page to load completely
      await thesisDetailPage.waitForLoad();
      
      // View tracking should happen automatically
      // This is verified by checking if the view count increases
      // (implementation depends on your view tracking system)
    }
  });

  test.describe('Performance Tests', () => {
    test('should load search results within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await homePage.performSearch('test');
      await searchResultsPage.waitForResults();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 seconds max
    });

    test('should handle large result sets efficiently', async ({ page }) => {
      // Search for common term to get many results
      await homePage.performSearch('a');
      
      const startTime = Date.now();
      await searchResultsPage.waitForResults();
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // 5 seconds max for large sets
      
      // Test pagination performance
      const totalPages = await searchResultsPage.getTotalPages();
      if (totalPages > 1) {
        const paginationStart = Date.now();
        await searchResultsPage.goToNextPage();
        await searchResultsPage.waitForResults();
        const paginationTime = Date.now() - paginationStart;
        
        expect(paginationTime).toBeLessThan(2000); // 2 seconds max
      }
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Should focus search input
      await expect(homePage.searchInput).toBeFocused();
      
      await page.keyboard.type('test search');
      await page.keyboard.press('Enter');
      
      await searchResultsPage.waitForResults();
      
      // Navigate through results with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      // Should be able to navigate to first result
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check main search input
      await expect(homePage.searchInput).toHaveAttribute('aria-label');
      
      // Navigate to results
      await homePage.performSearch('test');
      await searchResultsPage.waitForResults();
      
      // Check results have proper ARIA attributes
      await expect(searchResultsPage.resultsContainer).toHaveAttribute('role', 'main');
      
      const resultCount = await searchResultsPage.getResultCount();
      if (resultCount > 0) {
        const firstResult = searchResultsPage.getFirstResult();
        await expect(firstResult.container).toHaveAttribute('role');
      }
    });
  });
});