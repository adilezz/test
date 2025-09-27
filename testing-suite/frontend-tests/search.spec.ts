import { test, expect } from '@playwright/test';

test.describe('Search and Discovery', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for search
    await page.route('**/theses**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'thesis-1',
              title_fr: 'Thèse de Test 1',
              title_en: 'Test Thesis 1',
              abstract_fr: 'Résumé de la thèse de test 1',
              defense_date: '2024-01-15',
              university_name: 'Université de Test',
              faculty_name: 'Faculté de Test',
              degree_name: 'Doctorat',
              language_name: 'Français',
              author_name: 'Auteur Test'
            },
            {
              id: 'thesis-2',
              title_fr: 'Thèse de Test 2',
              title_en: 'Test Thesis 2',
              abstract_fr: 'Résumé de la thèse de test 2',
              defense_date: '2024-02-15',
              university_name: 'Université de Test',
              faculty_name: 'Faculté de Test',
              degree_name: 'Master',
              language_name: 'Français',
              author_name: 'Auteur Test 2'
            }
          ],
          meta: {
            total: 2,
            page: 1,
            limit: 20,
            pages: 1
          }
        })
      });
    });

    await page.route('**/statistics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          total_theses: 150,
          total_universities: 15,
          total_faculties: 45,
          total_departments: 120,
          total_schools: 8,
          total_categories: 25,
          total_keywords: 300,
          total_degrees: 5,
          total_languages: 4,
          total_geographic_entities: 50,
          total_authors: 200,
          recent_theses: [],
          popular_categories: [],
          top_universities: []
        })
      });
    });
  });

  test('should display homepage with search functionality', async ({ page }) => {
    await page.goto('/');
    
    // Check homepage elements
    await expect(page.getByRole('heading', { name: 'Bienvenue sur Theses.ma' })).toBeVisible();
    await expect(page.getByPlaceholder('Rechercher des thèses...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rechercher' })).toBeVisible();
    
    // Check statistics are displayed
    await expect(page.locator('text=150 thèses')).toBeVisible();
    await expect(page.locator('text=15 universités')).toBeVisible();
  });

  test('should perform basic search', async ({ page }) => {
    await page.goto('/');
    
    // Perform search
    await page.getByPlaceholder('Rechercher des thèses...').fill('test');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    
    // Should navigate to search results page
    await expect(page).toHaveURL('/search?q=test');
    
    // Check search results
    await expect(page.getByText('Thèse de Test 1')).toBeVisible();
    await expect(page.getByText('Thèse de Test 2')).toBeVisible();
  });

  test('should display search results with metadata', async ({ page }) => {
    await page.goto('/search?q=test');
    
    // Check that thesis cards display properly
    const thesisCards = page.locator('[data-testid="thesis-card"]');
    await expect(thesisCards).toHaveCount(2);
    
    // Check first thesis card content
    const firstCard = thesisCards.first();
    await expect(firstCard.locator('text=Thèse de Test 1')).toBeVisible();
    await expect(firstCard.locator('text=Université de Test')).toBeVisible();
    await expect(firstCard.locator('text=Faculté de Test')).toBeVisible();
    await expect(firstCard.locator('text=Doctorat')).toBeVisible();
    await expect(firstCard.locator('text=Auteur Test')).toBeVisible();
  });

  test('should handle empty search results', async ({ page }) => {
    // Mock empty search results
    await page.route('**/theses**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 20,
            pages: 0
          }
        })
      });
    });

    await page.goto('/search?q=nonexistent');
    
    // Should show no results message
    await expect(page.getByText('Aucune thèse trouvée')).toBeVisible();
    await expect(page.getByText('Essayez de modifier vos critères de recherche')).toBeVisible();
  });

  test('should display advanced search filters', async ({ page }) => {
    await page.goto('/search');
    
    // Check advanced search filters are present
    await expect(page.getByText('Filtres avancés')).toBeVisible();
    await expect(page.getByLabel('Université')).toBeVisible();
    await expect(page.getByLabel('Faculté')).toBeVisible();
    await expect(page.getByLabel('Département')).toBeVisible();
    await expect(page.getByLabel('Catégorie')).toBeVisible();
    await expect(page.getByLabel('Degré')).toBeVisible();
    await expect(page.getByLabel('Langue')).toBeVisible();
    await expect(page.getByLabel('Année de soutenance')).toBeVisible();
  });

  test('should filter search results by university', async ({ page }) => {
    // Mock universities API
    await page.route('**/universities/tree', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'univ-1',
            name_fr: 'Université de Test',
            children: []
          }
        ])
      });
    });

    await page.goto('/search');
    
    // Select university filter
    await page.getByLabel('Université').click();
    await page.getByText('Université de Test').click();
    
    // Check that URL includes the filter
    await expect(page).toHaveURL(/university_id=univ-1/);
  });

  test('should filter search results by date range', async ({ page }) => {
    await page.goto('/search');
    
    // Set date range filters
    await page.getByLabel('Année de soutenance').fill('2024');
    
    // Check that URL includes the filter
    await expect(page).toHaveURL(/year=2024/);
  });

  test('should sort search results', async ({ page }) => {
    await page.goto('/search?q=test');
    
    // Check sort dropdown is present
    await expect(page.getByLabel('Trier par')).toBeVisible();
    
    // Change sort order
    await page.getByLabel('Trier par').selectOption('title');
    
    // Check that URL includes sort parameters
    await expect(page).toHaveURL(/sort_field=title/);
  });

  test('should paginate search results', async ({ page }) => {
    // Mock paginated results
    await page.route('**/theses**', async route => {
      const url = new URL(route.request().url());
      const page = url.searchParams.get('page') || '1';
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: `thesis-${page}`,
              title_fr: `Thèse Page ${page}`,
              abstract_fr: `Résumé page ${page}`,
              defense_date: '2024-01-15',
              university_name: 'Université de Test',
              faculty_name: 'Faculté de Test',
              degree_name: 'Doctorat',
              language_name: 'Français',
              author_name: 'Auteur Test'
            }
          ],
          meta: {
            total: 50,
            page: parseInt(page),
            limit: 20,
            pages: 3
          }
        })
      });
    });

    await page.goto('/search?q=test');
    
    // Check pagination controls are present
    await expect(page.getByRole('button', { name: 'Page suivante' })).toBeVisible();
    
    // Click next page
    await page.getByRole('button', { name: 'Page suivante' }).click();
    
    // Should navigate to page 2
    await expect(page).toHaveURL(/page=2/);
  });

  test('should display thesis detail page', async ({ page }) => {
    // Mock thesis detail API
    await page.route('**/theses/thesis-1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          thesis: {
            id: 'thesis-1',
            title_fr: 'Thèse de Test 1',
            title_en: 'Test Thesis 1',
            abstract_fr: 'Résumé détaillé de la thèse de test 1',
            defense_date: '2024-01-15',
            page_count: 150,
            file_url: '/files/thesis-1.pdf',
            file_name: 'thesis-1.pdf'
          },
          institution: {
            university: { id: 'univ-1', name: 'Université de Test' },
            faculty: { id: 'fac-1', name: 'Faculté de Test' },
            school: null,
            department: null
          },
          academic: {
            degree: { id: 'deg-1', name: 'Doctorat' },
            language: { id: 'lang-1', name: 'Français' }
          },
          persons: [
            {
              id: 'person-1',
              person_id: 'author-1',
              role: 'author',
              name: 'Auteur Test',
              title: 'Dr.',
              is_external: false
            }
          ],
          categories: [
            {
              id: 'cat-1',
              category_id: 'category-1',
              code: 'INF',
              name_fr: 'Informatique',
              is_primary: true
            }
          ],
          keywords: [
            {
              id: 'kw-1',
              keyword_id: 'keyword-1',
              keyword_fr: 'intelligence artificielle',
              position: 1
            }
          ],
          metadata: {
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            submitted_by: 'admin',
            submitted_at: '2024-01-01T00:00:00Z'
          }
        })
      });
    });

    await page.goto('/thesis/thesis-1');
    
    // Check thesis detail elements
    await expect(page.getByRole('heading', { name: 'Thèse de Test 1' })).toBeVisible();
    await expect(page.getByText('Test Thesis 1')).toBeVisible();
    await expect(page.getByText('Résumé détaillé de la thèse de test 1')).toBeVisible();
    await expect(page.getByText('Université de Test')).toBeVisible();
    await expect(page.getByText('Faculté de Test')).toBeVisible();
    await expect(page.getByText('Doctorat')).toBeVisible();
    await expect(page.getByText('Dr. Auteur Test')).toBeVisible();
    await expect(page.getByText('Informatique')).toBeVisible();
    await expect(page.getByText('intelligence artificielle')).toBeVisible();
    
    // Check download button
    await expect(page.getByRole('button', { name: 'Télécharger' })).toBeVisible();
  });

  test('should download thesis file', async ({ page }) => {
    // Mock download endpoint
    await page.route('**/theses/thesis-1/download', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('PDF content')
      });
    });

    await page.goto('/thesis/thesis-1');
    
    // Click download button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Télécharger' }).click();
    const download = await downloadPromise;
    
    // Check download
    expect(download.suggestedFilename()).toBe('thesis-1.pdf');
  });

  test('should handle search errors gracefully', async ({ page }) => {
    // Mock search API error
    await page.route('**/theses**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error'
          }
        })
      });
    });

    await page.goto('/search?q=test');
    
    // Should show error message
    await expect(page.getByText('Erreur lors de la recherche')).toBeVisible();
    await expect(page.getByText('Veuillez réessayer plus tard')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Check that search form is still accessible
    await expect(page.getByPlaceholder('Rechercher des thèses...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rechercher' })).toBeVisible();
    
    // Check that statistics are displayed in mobile-friendly format
    await expect(page.locator('text=150 thèses')).toBeVisible();
  });
});