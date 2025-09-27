/**
 * Admin Workflow Tests
 * Tests complete admin user workflows including login, CRUD operations, and thesis management
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { AdminDashboardPage } from '../page-objects/AdminDashboardPage';
import { AdminUniversitiesPage } from '../page-objects/AdminUniversitiesPage';
import { AdminThesesPage } from '../page-objects/AdminThesesPage';
import { AdminThesisFormPage } from '../page-objects/AdminThesisFormPage';

test.describe('Admin Workflows', () => {
  let loginPage: LoginPage;
  let dashboardPage: AdminDashboardPage;
  let universitiesPage: AdminUniversitiesPage;
  let thesesPage: AdminThesesPage;
  let thesisFormPage: AdminThesisFormPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new AdminDashboardPage(page);
    universitiesPage = new AdminUniversitiesPage(page);
    thesesPage = new AdminThesesPage(page);
    thesisFormPage = new AdminThesisFormPage(page);
  });

  test.describe('Admin Authentication', () => {
    test('should login as admin and access dashboard', async ({ page }) => {
      await loginPage.goto();
      
      // Login with admin credentials
      await loginPage.loginAsAdmin();
      
      // Should redirect to admin dashboard
      await expect(page).toHaveURL(/\/admin|\/dashboard/);
      await expect(dashboardPage.pageTitle).toBeVisible();
      await expect(dashboardPage.pageTitle).toContainText('Tableau de bord');
      
      // Verify admin navigation is present
      await expect(dashboardPage.adminNavigation).toBeVisible();
      
      // Check statistics cards are loaded
      await dashboardPage.waitForStatisticsToLoad();
      await expect(dashboardPage.statisticsCards).toBeVisible();
    });

    test('should show proper admin navigation menu', async ({ page }) => {
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      
      // Verify all admin menu items are present
      const expectedMenuItems = [
        'Tableau de bord',
        'Thèses',
        'Universités',
        'Facultés',
        'Écoles',
        'Départements',
        'Catégories',
        'Mots-clés',
        'Personnes académiques',
        'Diplômes',
        'Langues',
        'Entités géographiques',
        'Statistiques',
        'Rapports'
      ];
      
      for (const menuItem of expectedMenuItems) {
        await expect(dashboardPage.getMenuItemByText(menuItem)).toBeVisible();
      }
    });

    test('should logout successfully', async ({ page }) => {
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      
      // Logout
      await dashboardPage.logout();
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);
      await expect(loginPage.loginForm).toBeVisible();
    });
  });

  test.describe('Universities Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      await dashboardPage.navigateToUniversities();
    });

    test('should list existing universities', async ({ page }) => {
      await expect(universitiesPage.pageTitle).toContainText('Universités');
      await expect(universitiesPage.universitiesList).toBeVisible();
      
      // Check table headers
      await expect(universitiesPage.tableHeader).toContainText('Nom');
      await expect(universitiesPage.tableHeader).toContainText('Acronyme');
      await expect(universitiesPage.tableHeader).toContainText('Actions');
      
      // Verify pagination if there are many universities
      const universityCount = await universitiesPage.getUniversityCount();
      if (universityCount > 20) {
        await expect(universitiesPage.pagination).toBeVisible();
      }
    });

    test('should create new university', async ({ page }) => {
      await universitiesPage.clickCreateNew();
      
      // Fill university form
      await universitiesPage.fillUniversityForm({
        nameFr: 'Université Test E2E',
        nameEn: 'E2E Test University',
        acronym: 'UTE2E',
        location: 'Rabat'
      });
      
      await universitiesPage.submitForm();
      
      // Should show success message
      await expect(universitiesPage.successMessage).toBeVisible();
      
      // Should appear in list
      await expect(universitiesPage.getUniversityByName('Université Test E2E')).toBeVisible();
    });

    test('should edit existing university', async ({ page }) => {
      // Find first university in list
      const firstUniversity = await universitiesPage.getFirstUniversity();
      await firstUniversity.clickEdit();
      
      // Update university details
      await universitiesPage.updateUniversityForm({
        nameFr: 'Université Modifiée',
        acronym: 'UM'
      });
      
      await universitiesPage.submitForm();
      
      // Should show success message
      await expect(universitiesPage.successMessage).toBeVisible();
      
      // Should reflect changes in list
      await expect(universitiesPage.getUniversityByName('Université Modifiée')).toBeVisible();
    });

    test('should delete university with confirmation', async ({ page }) => {
      // Create a test university first
      await universitiesPage.clickCreateNew();
      await universitiesPage.fillUniversityForm({
        nameFr: 'Université à Supprimer',
        nameEn: 'University to Delete',
        acronym: 'UAS'
      });
      await universitiesPage.submitForm();
      
      // Delete the university
      const universityToDelete = await universitiesPage.getUniversityByName('Université à Supprimer');
      await universityToDelete.clickDelete();
      
      // Should show confirmation dialog
      await expect(universitiesPage.confirmationDialog).toBeVisible();
      await universitiesPage.confirmDeletion();
      
      // Should show success message
      await expect(universitiesPage.successMessage).toBeVisible();
      
      // Should no longer appear in list
      await expect(universitiesPage.getUniversityByName('Université à Supprimer')).not.toBeVisible();
    });

    test('should search and filter universities', async ({ page }) => {
      // Use search functionality
      await universitiesPage.searchUniversities('Mohammed');
      
      // Results should be filtered
      const searchResults = await universitiesPage.getSearchResults();
      expect(searchResults.length).toBeGreaterThan(0);
      
      // All results should contain search term
      for (const result of searchResults) {
        const text = await result.textContent();
        expect(text?.toLowerCase()).toContain('mohammed');
      }
      
      // Clear search
      await universitiesPage.clearSearch();
      
      // Should show all universities again
      const allResults = await universitiesPage.getAllUniversities();
      expect(allResults.length).toBeGreaterThanOrEqual(searchResults.length);
    });
  });

  test.describe('Thesis Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      await dashboardPage.navigateToTheses();
    });

    test('should list existing theses with proper metadata', async ({ page }) => {
      await expect(thesesPage.pageTitle).toContainText('Thèses');
      await expect(thesesPage.thesesList).toBeVisible();
      
      // Check table columns
      const expectedColumns = ['Titre', 'Auteur', 'Université', 'Statut', 'Date', 'Actions'];
      for (const column of expectedColumns) {
        await expect(thesesPage.tableHeader).toContainText(column);
      }
      
      // Verify thesis entries have required information
      const firstThesis = await thesesPage.getFirstThesis();
      if (firstThesis) {
        await expect(firstThesis.title).toBeVisible();
        await expect(firstThesis.status).toBeVisible();
        await expect(firstThesis.actions).toBeVisible();
      }
    });

    test('should create new thesis manually', async ({ page }) => {
      await thesesPage.clickCreateNew();
      
      // Should navigate to thesis form
      await expect(page).toHaveURL(/\/admin\/theses\/new/);
      await expect(thesisFormPage.formTitle).toContainText('Nouvelle thèse');
      
      // Fill basic thesis information
      await thesisFormPage.fillBasicInfo({
        titleFr: 'Thèse Test E2E',
        titleEn: 'E2E Test Thesis',
        abstractFr: 'Résumé de la thèse de test pour les tests E2E automatisés.',
        abstractEn: 'Abstract of the test thesis for automated E2E testing.'
      });
      
      // Fill institutional information
      await thesisFormPage.fillInstitutionalInfo({
        university: 'Université Mohammed V',
        faculty: 'Faculté des Sciences',
        department: 'Département d\'Informatique',
        degree: 'Doctorat'
      });
      
      // Fill academic information
      await thesisFormPage.fillAcademicInfo({
        language: 'Français',
        defenseDate: '2024-01-15',
        pageCount: 250
      });
      
      // Add academic persons
      await thesisFormPage.addAcademicPerson({
        role: 'Auteur',
        name: 'Dr. Test Author',
        title: 'Dr.'
      });
      
      await thesisFormPage.addAcademicPerson({
        role: 'Directeur',
        name: 'Prof. Test Director',
        title: 'Prof.'
      });
      
      // Add categories
      await thesisFormPage.addCategory('Informatique', true); // Primary category
      await thesisFormPage.addCategory('Intelligence Artificielle', false);
      
      // Add keywords
      await thesisFormPage.addKeywords(['machine learning', 'deep learning', 'neural networks']);
      
      // Submit form
      await thesisFormPage.submitForm();
      
      // Should show success message and redirect
      await expect(thesisFormPage.successMessage).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/theses$/);
      
      // Should appear in theses list
      await expect(thesesPage.getThesisByTitle('Thèse Test E2E')).toBeVisible();
    });

    test('should upload and process thesis PDF', async ({ page }) => {
      await thesesPage.clickUploadThesis();
      
      // Upload PDF file
      const filePath = '../test_data/pdfs/sample_thesis.pdf';
      await thesisFormPage.uploadPDF(filePath);
      
      // Should show upload progress
      await expect(thesisFormPage.uploadProgress).toBeVisible();
      
      // Wait for processing to complete
      await thesisFormPage.waitForProcessingComplete();
      
      // Should show extracted metadata
      await expect(thesisFormPage.extractedMetadata).toBeVisible();
      
      // Verify some metadata was extracted
      const extractedTitle = await thesisFormPage.getExtractedTitle();
      expect(extractedTitle).toBeTruthy();
      
      // Complete the form with extracted data
      await thesisFormPage.acceptExtractedMetadata();
      await thesisFormPage.submitForm();
      
      // Should create thesis successfully
      await expect(thesisFormPage.successMessage).toBeVisible();
    });

    test('should edit existing thesis', async ({ page }) => {
      // Find first thesis and edit
      const firstThesis = await thesesPage.getFirstThesis();
      await firstThesis.clickEdit();
      
      // Should navigate to edit form
      await expect(page).toHaveURL(/\/admin\/theses\/[a-f0-9-]+/);
      
      // Update thesis information
      await thesisFormPage.updateBasicInfo({
        titleFr: 'Titre Modifié',
        abstractFr: 'Résumé modifié pour le test E2E'
      });
      
      // Update status
      await thesisFormPage.updateStatus('Publié');
      
      // Submit changes
      await thesisFormPage.submitForm();
      
      // Should show success message
      await expect(thesisFormPage.successMessage).toBeVisible();
      
      // Verify changes in list
      await page.goto('/admin/theses');
      await expect(thesesPage.getThesisByTitle('Titre Modifié')).toBeVisible();
    });

    test('should manage thesis status workflow', async ({ page }) => {
      // Create a draft thesis first
      await thesesPage.clickCreateNew();
      await thesisFormPage.fillMinimalThesisForm({
        titleFr: 'Thèse Workflow Test',
        status: 'Brouillon'
      });
      await thesisFormPage.submitForm();
      
      // Navigate back to list
      await page.goto('/admin/theses');
      
      const workflowThesis = await thesesPage.getThesisByTitle('Thèse Workflow Test');
      
      // Test status transitions
      await workflowThesis.clickEdit();
      
      // Draft -> Submitted
      await thesisFormPage.updateStatus('Soumis');
      await thesisFormPage.submitForm();
      await expect(thesisFormPage.successMessage).toBeVisible();
      
      // Submitted -> Under Review
      await thesisFormPage.updateStatus('En révision');
      await thesisFormPage.submitForm();
      
      // Under Review -> Approved
      await thesisFormPage.updateStatus('Approuvé');
      await thesisFormPage.submitForm();
      
      // Approved -> Published
      await thesisFormPage.updateStatus('Publié');
      await thesisFormPage.submitForm();
      
      // Verify final status
      await page.goto('/admin/theses');
      const finalThesis = await thesesPage.getThesisByTitle('Thèse Workflow Test');
      await expect(finalThesis.status).toContainText('Publié');
    });

    test('should bulk update thesis statuses', async ({ page }) => {
      // Select multiple theses
      await thesesPage.selectMultipleTheses([0, 1, 2]); // Select first 3
      
      // Open bulk actions menu
      await thesesPage.openBulkActions();
      
      // Select bulk status update
      await thesesPage.selectBulkAction('Mettre à jour le statut');
      
      // Choose new status
      await thesesPage.selectBulkStatus('Publié');
      
      // Confirm bulk update
      await thesesPage.confirmBulkUpdate();
      
      // Should show success message
      await expect(thesesPage.bulkSuccessMessage).toBeVisible();
      
      // Verify statuses were updated
      const selectedTheses = await thesesPage.getSelectedTheses();
      for (const thesis of selectedTheses) {
        await expect(thesis.status).toContainText('Publié');
      }
    });
  });

  test.describe('Reference Data Management', () => {
    test('should manage categories hierarchy', async ({ page }) => {
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      await dashboardPage.navigateToCategories();
      
      // Should display categories in tree view
      await expect(page.locator('[data-testid="categories-tree"]')).toBeVisible();
      
      // Create parent category
      await page.click('[data-testid="create-category"]');
      await page.fill('[data-testid="category-name-fr"]', 'Sciences Appliquées');
      await page.fill('[data-testid="category-code"]', 'SA');
      await page.selectOption('[data-testid="category-level"]', '1');
      await page.click('[data-testid="submit-category"]');
      
      // Create child category
      await page.click('[data-testid="create-category"]');
      await page.fill('[data-testid="category-name-fr"]', 'Génie Informatique');
      await page.fill('[data-testid="category-code"]', 'GI');
      await page.selectOption('[data-testid="category-parent"]', 'Sciences Appliquées');
      await page.selectOption('[data-testid="category-level"]', '2');
      await page.click('[data-testid="submit-category"]');
      
      // Verify hierarchy in tree view
      const parentCategory = page.locator('[data-testid="category-Sciences Appliquées"]');
      await expect(parentCategory).toBeVisible();
      
      await parentCategory.click(); // Expand
      const childCategory = page.locator('[data-testid="category-Génie Informatique"]');
      await expect(childCategory).toBeVisible();
    });

    test('should manage academic persons with merge functionality', async ({ page }) => {
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      await dashboardPage.navigateToAcademicPersons();
      
      // Create duplicate persons
      await page.click('[data-testid="create-person"]');
      await page.fill('[data-testid="person-name-fr"]', 'Dr. Ahmed BENALI');
      await page.fill('[data-testid="person-first-name"]', 'Ahmed');
      await page.fill('[data-testid="person-last-name"]', 'BENALI');
      await page.click('[data-testid="submit-person"]');
      
      await page.click('[data-testid="create-person"]');
      await page.fill('[data-testid="person-name-fr"]', 'Ahmed BENALI');
      await page.fill('[data-testid="person-first-name"]', 'Ahmed');
      await page.fill('[data-testid="person-last-name"]', 'BENALI');
      await page.click('[data-testid="submit-person"]');
      
      // Find duplicates
      await page.fill('[data-testid="search-persons"]', 'Ahmed BENALI');
      await page.click('[data-testid="search-button"]');
      
      // Should show duplicate detection
      await expect(page.locator('[data-testid="duplicate-warning"]')).toBeVisible();
      
      // Merge duplicates
      await page.click('[data-testid="merge-persons"]');
      await page.click('[data-testid="confirm-merge"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="merge-success"]')).toBeVisible();
    });
  });

  test.describe('Performance and Error Handling', () => {
    test('should handle large data sets efficiently', async ({ page }) => {
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      
      // Navigate to page with potentially large dataset
      await dashboardPage.navigateToTheses();
      
      const startTime = Date.now();
      await thesesPage.waitForLoad();
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(5000); // 5 seconds
      
      // Test pagination performance
      if (await thesesPage.hasPagination()) {
        const paginationStart = Date.now();
        await thesesPage.goToNextPage();
        await thesesPage.waitForLoad();
        const paginationTime = Date.now() - paginationStart;
        
        expect(paginationTime).toBeLessThan(3000); // 3 seconds
      }
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      
      // Simulate network failure
      await page.route('**/admin/universities**', route => route.abort());
      
      await dashboardPage.navigateToUniversities();
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Test retry functionality
      await page.unroute('**/admin/universities**');
      await page.click('[data-testid="retry-button"]');
      
      // Should load successfully after retry
      await expect(universitiesPage.universitiesList).toBeVisible();
    });

    test('should validate form inputs properly', async ({ page }) => {
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      await dashboardPage.navigateToUniversities();
      
      await universitiesPage.clickCreateNew();
      
      // Submit empty form
      await universitiesPage.submitForm();
      
      // Should show validation errors
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="name-error"]')).toContainText('obligatoire');
      
      // Test field-specific validation
      await page.fill('[data-testid="university-acronym"]', 'TOOLONGACRONYM');
      await universitiesPage.submitForm();
      
      await expect(page.locator('[data-testid="acronym-error"]')).toBeVisible();
    });
  });

  test.describe('Mobile Admin Interface', () => {
    test('should work on mobile devices', async ({ page, isMobile }) => {
      if (isMobile) {
        await loginPage.goto();
        await loginPage.loginAsAdmin();
        
        // Check mobile navigation
        await expect(dashboardPage.mobileMenuButton).toBeVisible();
        await dashboardPage.mobileMenuButton.click();
        await expect(dashboardPage.mobileMenu).toBeVisible();
        
        // Test mobile thesis management
        await dashboardPage.navigateToTheses();
        await expect(thesesPage.mobileView).toBeVisible();
        
        // Mobile-specific interactions
        await thesesPage.openMobileFilters();
        await expect(thesesPage.mobileFiltersPanel).toBeVisible();
      }
    });
  });
});