/**
 * SearchResultsPage Page Object Model
 * Encapsulates interactions with the search results page
 */

import { Page, Locator, expect } from '@playwright/test';

export class SearchResultsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly filtersPanel: Locator;
  readonly filtersToggle: Locator;
  readonly resultsContainer: Locator;
  readonly resultsList: Locator;
  readonly noResultsMessage: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;
  readonly searchSuggestions: Locator;
  readonly activeFilters: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly sortSelect: Locator;
  readonly pagination: Locator;
  readonly loadingSpinner: Locator;
  readonly resultCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('[data-testid="search-input"], input[name="q"]');
    this.filtersPanel = page.locator('[data-testid="filters-panel"], .filters-panel');
    this.filtersToggle = page.locator('[data-testid="filters-toggle"], .filters-toggle');
    this.resultsContainer = page.locator('[data-testid="results-container"], .results-container');
    this.resultsList = page.locator('[data-testid="results-list"], .results-list');
    this.noResultsMessage = page.locator('[data-testid="no-results"], .no-results');
    this.errorMessage = page.locator('[data-testid="error-message"], .error-message');
    this.retryButton = page.locator('[data-testid="retry-button"], .retry-button');
    this.searchSuggestions = page.locator('[data-testid="search-suggestions"], .search-suggestions');
    this.activeFilters = page.locator('[data-testid="active-filters"], .active-filters');
    this.gridViewButton = page.locator('[data-testid="grid-view"], .grid-view-btn');
    this.listViewButton = page.locator('[data-testid="list-view"], .list-view-btn');
    this.sortSelect = page.locator('[data-testid="sort-select"], .sort-select');
    this.pagination = page.locator('[data-testid="pagination"], .pagination');
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner');
    this.resultCount = page.locator('[data-testid="result-count"], .result-count');
  }

  async waitForResults() {
    // Wait for loading to finish
    await expect(this.loadingSpinner).toBeHidden({ timeout: 30000 });
    
    // Wait for either results or no results message
    await Promise.race([
      expect(this.resultsList).toBeVisible(),
      expect(this.noResultsMessage).toBeVisible(),
      expect(this.errorMessage).toBeVisible()
    ]);
  }

  async getResultCount(): Promise<number> {
    await this.waitForResults();
    
    // Try to get count from result count element
    if (await this.resultCount.isVisible()) {
      const countText = await this.resultCount.textContent();
      const match = countText?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    
    // Fallback: count visible result items
    const results = await this.resultsList.locator('.thesis-card, .result-item').all();
    return results.length;
  }

  async getFirstResult() {
    const firstResult = this.resultsList.locator('.thesis-card, .result-item').first();
    
    return {
      container: firstResult,
      title: firstResult.locator('[data-testid="thesis-title"], .thesis-title, h3'),
      author: firstResult.locator('[data-testid="thesis-author"], .thesis-author'),
      university: firstResult.locator('[data-testid="thesis-university"], .thesis-university'),
      abstract: firstResult.locator('[data-testid="thesis-abstract"], .thesis-abstract'),
      downloadButton: firstResult.locator('[data-testid="download-btn"], .download-btn'),
      viewButton: firstResult.locator('[data-testid="view-btn"], .view-btn')
    };
  }

  async clickFirstThesis() {
    const firstResult = await this.getFirstResult();
    await firstResult.title.click();
    await this.page.waitForURL('**/thesis/**');
  }

  async openFiltersPanel() {
    if (await this.filtersToggle.isVisible()) {
      await this.filtersToggle.click();
    }
    await expect(this.filtersPanel).toBeVisible();
  }

  async closeFiltersPanel() {
    if (await this.filtersToggle.isVisible()) {
      await this.filtersToggle.click();
    }
    await expect(this.filtersPanel).toBeHidden();
  }

  async selectUniversityFilter(universityName: string) {
    await this.openFiltersPanel();
    const universitySelect = this.filtersPanel.locator('[data-testid="university-filter"], select[name="university_id"]');
    await universitySelect.selectOption({ label: universityName });
  }

  async selectCategoryFilter(categoryName: string) {
    await this.openFiltersPanel();
    const categorySelect = this.filtersPanel.locator('[data-testid="category-filter"], select[name="category_id"]');
    await categorySelect.selectOption({ label: categoryName });
  }

  async selectLanguageFilter(languageName: string) {
    await this.openFiltersPanel();
    const languageSelect = this.filtersPanel.locator('[data-testid="language-filter"], select[name="language_id"]');
    await languageSelect.selectOption({ label: languageName });
  }

  async setYearRange(fromYear: number, toYear: number) {
    await this.openFiltersPanel();
    const yearFromInput = this.filtersPanel.locator('[data-testid="year-from"], input[name="year_from"]');
    const yearToInput = this.filtersPanel.locator('[data-testid="year-to"], input[name="year_to"]');
    
    await yearFromInput.fill(fromYear.toString());
    await yearToInput.fill(toYear.toString());
  }

  async applyFilters() {
    const applyButton = this.filtersPanel.locator('[data-testid="apply-filters"], .apply-filters-btn');
    await applyButton.click();
    await this.waitForResults();
  }

  async clearFilters() {
    const clearButton = this.filtersPanel.locator('[data-testid="clear-filters"], .clear-filters-btn');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.waitForResults();
    }
  }

  async removeActiveFilter(filterName: string) {
    const filterTag = this.activeFilters.locator(`[data-filter="${filterName}"], .filter-tag:has-text("${filterName}")`);
    const removeButton = filterTag.locator('.remove-filter, [data-testid="remove-filter"]');
    await removeButton.click();
    await this.waitForResults();
  }

  async switchToGridView() {
    await this.gridViewButton.click();
    await expect(this.resultsContainer).toHaveClass(/grid/);
  }

  async switchToListView() {
    await this.listViewButton.click();
    await expect(this.resultsContainer).toHaveClass(/list/);
  }

  async selectSortOption(sortOption: string) {
    await this.sortSelect.selectOption({ label: sortOption });
    await this.waitForResults();
  }

  async goToNextPage() {
    const nextButton = this.pagination.locator('[data-testid="next-page"], .next-page');
    await nextButton.click();
    await this.waitForResults();
  }

  async goToPreviousPage() {
    const prevButton = this.pagination.locator('[data-testid="prev-page"], .prev-page');
    await prevButton.click();
    await this.waitForResults();
  }

  async goToPage(pageNumber: number) {
    const pageButton = this.pagination.locator(`[data-page="${pageNumber}"], .page-${pageNumber}`);
    await pageButton.click();
    await this.waitForResults();
  }

  async getTotalPages(): Promise<number> {
    if (await this.pagination.isVisible()) {
      const pageButtons = await this.pagination.locator('.page-number, [data-testid="page-number"]').all();
      if (pageButtons.length > 0) {
        const lastPageText = await pageButtons[pageButtons.length - 1].textContent();
        return parseInt(lastPageText || '1');
      }
    }
    return 1;
  }

  async getCurrentPage(): Promise<number> {
    const currentPageElement = this.pagination.locator('.current-page, [data-current="true"]');
    if (await currentPageElement.isVisible()) {
      const pageText = await currentPageElement.textContent();
      return parseInt(pageText || '1');
    }
    return 1;
  }

  async selectMultipleTheses(indices: number[]) {
    for (const index of indices) {
      const thesisCard = this.resultsList.locator('.thesis-card, .result-item').nth(index);
      const checkbox = thesisCard.locator('[data-testid="select-thesis"], input[type="checkbox"]');
      await checkbox.check();
    }
  }

  async getSelectedThesesCount(): Promise<number> {
    const selectedCheckboxes = await this.resultsList.locator('input[type="checkbox"]:checked').all();
    return selectedCheckboxes.length;
  }

  async bulkDownloadSelected() {
    const bulkDownloadButton = this.page.locator('[data-testid="bulk-download"], .bulk-download-btn');
    await bulkDownloadButton.click();
  }

  async searchWithinResults(query: string) {
    const withinResultsInput = this.page.locator('[data-testid="search-within"], .search-within-input');
    await withinResultsInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForResults();
  }

  async exportResults(format: 'csv' | 'json' | 'bibtex') {
    const exportButton = this.page.locator('[data-testid="export-results"], .export-btn');
    await exportButton.click();
    
    const formatOption = this.page.locator(`[data-export-format="${format}"]`);
    await formatOption.click();
    
    // Wait for download to start
    const downloadPromise = this.page.waitForEvent('download');
    return await downloadPromise;
  }

  async toggleMobileFilters() {
    const mobileFiltersToggle = this.page.locator('[data-testid="mobile-filters-toggle"], .mobile-filters-toggle');
    await mobileFiltersToggle.click();
  }

  async getSearchResults() {
    await this.waitForResults();
    return await this.resultsList.locator('.thesis-card, .result-item').all();
  }

  async getResultTitles(): Promise<string[]> {
    const results = await this.getSearchResults();
    const titles: string[] = [];
    
    for (const result of results) {
      const titleElement = result.locator('[data-testid="thesis-title"], .thesis-title, h3');
      const title = await titleElement.textContent();
      if (title) titles.push(title.trim());
    }
    
    return titles;
  }

  async verifyResultsContainKeyword(keyword: string) {
    const titles = await this.getResultTitles();
    const abstracts = await this.getResultAbstracts();
    
    const allText = [...titles, ...abstracts].join(' ').toLowerCase();
    expect(allText).toContain(keyword.toLowerCase());
  }

  async getResultAbstracts(): Promise<string[]> {
    const results = await this.getSearchResults();
    const abstracts: string[] = [];
    
    for (const result of results) {
      const abstractElement = result.locator('[data-testid="thesis-abstract"], .thesis-abstract');
      if (await abstractElement.isVisible()) {
        const abstract = await abstractElement.textContent();
        if (abstract) abstracts.push(abstract.trim());
      }
    }
    
    return abstracts;
  }

  async checkResultsAreSorted(sortField: 'title' | 'date' | 'university') {
    const results = await this.getSearchResults();
    const values: string[] = [];
    
    for (const result of results) {
      let valueElement;
      switch (sortField) {
        case 'title':
          valueElement = result.locator('[data-testid="thesis-title"], .thesis-title');
          break;
        case 'date':
          valueElement = result.locator('[data-testid="thesis-date"], .thesis-date');
          break;
        case 'university':
          valueElement = result.locator('[data-testid="thesis-university"], .thesis-university');
          break;
      }
      
      const value = await valueElement.textContent();
      if (value) values.push(value.trim());
    }
    
    // Check if values are sorted (basic check)
    if (values.length > 1) {
      const sortedValues = [...values].sort();
      // For descending date sort, reverse the check
      if (sortField === 'date') {
        expect(values).toEqual(sortedValues.reverse());
      } else {
        expect(values).toEqual(sortedValues);
      }
    }
  }

  async waitForLoadingToComplete() {
    await expect(this.loadingSpinner).toBeHidden({ timeout: 30000 });
  }

  async hasResults(): Promise<boolean> {
    await this.waitForResults();
    return await this.resultsList.isVisible() && (await this.getResultCount()) > 0;
  }

  async hasNoResults(): Promise<boolean> {
    await this.waitForResults();
    return await this.noResultsMessage.isVisible();
  }

  async hasError(): Promise<boolean> {
    await this.waitForResults();
    return await this.errorMessage.isVisible();
  }
}