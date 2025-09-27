/**
 * HomePage Page Object Model
 * Encapsulates interactions with the main homepage
 */

import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly advancedSearchLink: Locator;
  readonly statisticsSection: Locator;
  readonly featuredThesesSection: Locator;
  readonly navigationMenu: Locator;
  readonly mobileMenuButton: Locator;
  readonly heroSection: Locator;
  readonly quickStats: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Rechercher"]');
    this.searchButton = page.locator('[data-testid="search-button"], button:has-text("Rechercher")');
    this.advancedSearchLink = page.locator('[data-testid="advanced-search"], a:has-text("Recherche avancée")');
    this.statisticsSection = page.locator('[data-testid="statistics-section"], .statistics');
    this.featuredThesesSection = page.locator('[data-testid="featured-theses"], .featured-theses');
    this.navigationMenu = page.locator('[data-testid="main-navigation"], nav');
    this.mobileMenuButton = page.locator('[data-testid="mobile-menu-button"], .mobile-menu-toggle');
    this.heroSection = page.locator('[data-testid="hero-section"], .hero');
    this.quickStats = page.locator('[data-testid="quick-stats"], .quick-stats');
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  async waitForLoad() {
    // Wait for main content to load
    await expect(this.searchInput).toBeVisible();
    await expect(this.navigationMenu).toBeVisible();
  }

  async performSearch(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    
    // Wait for navigation to search results
    await this.page.waitForURL('**/search**');
  }

  async performQuickSearch(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForURL('**/search**');
  }

  async clickAdvancedSearch() {
    await this.advancedSearchLink.click();
    await this.page.waitForURL('**/search**');
  }

  async waitForStatisticsToLoad() {
    // Wait for statistics to load (they might load asynchronously)
    await expect(this.statisticsSection).toBeVisible();
    
    // Wait for actual numbers to appear (not just loading placeholders)
    await this.page.waitForFunction(() => {
      const statsElements = document.querySelectorAll('[data-testid="stat-number"]');
      return Array.from(statsElements).some(el => 
        el.textContent && el.textContent.trim() !== '0' && el.textContent.trim() !== '...'
      );
    }, { timeout: 10000 });
  }

  async getStatistic(name: string): Promise<string> {
    const statElement = this.page.locator(`[data-testid="stat-${name}"], [data-stat="${name}"]`);
    await expect(statElement).toBeVisible();
    return await statElement.textContent() || '0';
  }

  async getFeaturedTheses() {
    await expect(this.featuredThesesSection).toBeVisible();
    return await this.page.locator('[data-testid="featured-thesis"], .thesis-card').all();
  }

  async clickFeaturedThesis(index: number = 0) {
    const theses = await this.getFeaturedTheses();
    if (theses.length > index) {
      await theses[index].click();
      await this.page.waitForURL('**/thesis/**');
    }
  }

  async navigateToSection(sectionName: string) {
    const navLink = this.navigationMenu.locator(`a:has-text("${sectionName}")`);
    await navLink.click();
  }

  async openMobileMenu() {
    await this.mobileMenuButton.click();
    const mobileMenu = this.page.locator('[data-testid="mobile-menu"], .mobile-menu');
    await expect(mobileMenu).toBeVisible();
    return mobileMenu;
  }

  async searchSuggestions(query: string) {
    await this.searchInput.fill(query);
    
    // Wait for suggestions to appear
    const suggestions = this.page.locator('[data-testid="search-suggestions"], .search-suggestions');
    await expect(suggestions).toBeVisible();
    
    return await suggestions.locator('li, .suggestion-item').all();
  }

  async selectSearchSuggestion(suggestionText: string) {
    const suggestions = await this.searchSuggestions('');
    
    for (const suggestion of suggestions) {
      const text = await suggestion.textContent();
      if (text?.includes(suggestionText)) {
        await suggestion.click();
        await this.page.waitForURL('**/search**');
        break;
      }
    }
  }

  async getPopularCategories() {
    const categoriesSection = this.page.locator('[data-testid="popular-categories"], .popular-categories');
    await expect(categoriesSection).toBeVisible();
    return await categoriesSection.locator('a, .category-link').all();
  }

  async clickPopularCategory(categoryName: string) {
    const categories = await this.getPopularCategories();
    
    for (const category of categories) {
      const text = await category.textContent();
      if (text?.includes(categoryName)) {
        await category.click();
        await this.page.waitForURL('**/search**');
        break;
      }
    }
  }

  async getTopUniversities() {
    const universitiesSection = this.page.locator('[data-testid="top-universities"], .top-universities');
    await expect(universitiesSection).toBeVisible();
    return await universitiesSection.locator('a, .university-link').all();
  }

  async clickTopUniversity(universityName: string) {
    const universities = await this.getTopUniversities();
    
    for (const university of universities) {
      const text = await university.textContent();
      if (text?.includes(universityName)) {
        await university.click();
        await this.page.waitForURL('**/search**');
        break;
      }
    }
  }

  async scrollToSection(sectionName: string) {
    const section = this.page.locator(`[data-testid="${sectionName}"], .${sectionName}`);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
  }

  async checkAccessibility() {
    // Check if main elements have proper ARIA labels
    await expect(this.searchInput).toHaveAttribute('aria-label');
    await expect(this.searchButton).toHaveAttribute('aria-label');
    
    // Check heading hierarchy
    const h1 = this.page.locator('h1').first();
    await expect(h1).toBeVisible();
    
    // Check skip link (for keyboard navigation)
    const skipLink = this.page.locator('[data-testid="skip-link"], .skip-link');
    if (await skipLink.count() > 0) {
      await expect(skipLink).toHaveAttribute('href');
    }
  }

  async getSearchPlaceholder(): Promise<string> {
    return await this.searchInput.getAttribute('placeholder') || '';
  }

  async isSearchInputFocused(): Promise<boolean> {
    return await this.searchInput.evaluate(el => el === document.activeElement);
  }

  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  async getMetaDescription(): Promise<string> {
    const metaDesc = this.page.locator('meta[name="description"]');
    return await metaDesc.getAttribute('content') || '';
  }

  async checkSEOElements() {
    // Check title
    const title = await this.getPageTitle();
    expect(title).toContain('theses.ma');
    
    // Check meta description
    const description = await this.getMetaDescription();
    expect(description.length).toBeGreaterThan(100);
    
    // Check canonical URL
    const canonical = this.page.locator('link[rel="canonical"]');
    if (await canonical.count() > 0) {
      await expect(canonical).toHaveAttribute('href');
    }
  }

  async performKeyboardNavigation() {
    // Tab through main elements
    await this.page.keyboard.press('Tab');
    await expect(this.searchInput).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(this.searchButton).toBeFocused();
    
    // Continue tabbing through navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = this.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  }

  async checkResponsiveDesign() {
    // Check mobile breakpoint
    await this.page.setViewportSize({ width: 375, height: 667 });
    await expect(this.mobileMenuButton).toBeVisible();
    await expect(this.navigationMenu).toBeHidden();
    
    // Check tablet breakpoint
    await this.page.setViewportSize({ width: 768, height: 1024 });
    
    // Check desktop breakpoint
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await expect(this.navigationMenu).toBeVisible();
  }
}