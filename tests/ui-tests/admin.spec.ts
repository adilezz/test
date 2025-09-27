import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  // Mock authentication for admin tests
  test.beforeEach(async ({ page }) => {
    // Mock successful admin login
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          access_token: 'mock-admin-token',
          refresh_token: 'mock-refresh-token',
          token_type: 'Bearer',
          expires_in: 1440,
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            username: 'admin',
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin'
          }
        })
      });
    });

    // Mock profile endpoint
    await page.route('**/auth/profile', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'admin-123',
          email: 'admin@example.com',
          username: 'admin',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          email_verified: true,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        })
      });
    });

    // Mock admin dashboard data
    await page.route('**/admin/statistics', async route => {
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

    // Login as admin
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Mot de passe').fill('adminpassword');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    
    // Wait for login to complete
    await expect(page).toHaveURL('/');
  });

  test('should display admin dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Check dashboard elements
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    await expect(page.locator('text=150 thèses')).toBeVisible();
    await expect(page.locator('text=15 universités')).toBeVisible();
    await expect(page.locator('text=45 facultés')).toBeVisible();
    
    // Check navigation menu
    await expect(page.getByRole('link', { name: 'Universités' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Facultés' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Écoles' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Départements' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Catégories' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mots-clés' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Personnes académiques' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Thèses' })).toBeVisible();
  });

  test('should manage universities', async ({ page }) => {
    // Mock universities API
    await page.route('**/admin/universities', async route => {
      if (route.request().method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'univ-1',
                name_fr: 'Université de Test',
                name_en: 'Test University',
                acronym: 'UT',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              }
            ],
            meta: {
              total: 1,
              page: 1,
              limit: 20,
              pages: 1
            }
          })
        });
      } else if (route.request().method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            id: 'univ-2',
            name_fr: 'Nouvelle Université',
            name_en: 'New University',
            acronym: 'NU',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          })
        });
      }
    });

    await page.goto('/admin/universities');
    
    // Check universities list page
    await expect(page.getByRole('heading', { name: 'Gestion des universités' })).toBeVisible();
    await expect(page.getByText('Université de Test')).toBeVisible();
    
    // Click add new university button
    await page.getByRole('button', { name: 'Ajouter une université' }).click();
    
    // Check add university form
    await expect(page.getByLabel('Nom français')).toBeVisible();
    await expect(page.getByLabel('Nom anglais')).toBeVisible();
    await expect(page.getByLabel('Acronyme')).toBeVisible();
    
    // Fill form
    await page.getByLabel('Nom français').fill('Nouvelle Université');
    await page.getByLabel('Nom anglais').fill('New University');
    await page.getByLabel('Acronyme').fill('NU');
    
    // Submit form
    await page.getByRole('button', { name: 'Créer' }).click();
    
    // Check success message
    await expect(page.getByText('Université créée avec succès')).toBeVisible();
  });

  test('should manage faculties', async ({ page }) => {
    // Mock faculties API
    await page.route('**/admin/faculties', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'fac-1',
              university_id: 'univ-1',
              name_fr: 'Faculté de Test',
              name_en: 'Test Faculty',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 20,
            pages: 1
          }
        })
      });
    });

    await page.goto('/admin/faculties');
    
    // Check faculties list page
    await expect(page.getByRole('heading', { name: 'Gestion des facultés' })).toBeVisible();
    await expect(page.getByText('Faculté de Test')).toBeVisible();
  });

  test('should manage theses', async ({ page }) => {
    // Mock theses API
    await page.route('**/admin/theses', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'thesis-1',
              title_fr: 'Thèse de Test',
              title_en: 'Test Thesis',
              defense_date: '2024-01-15',
              status: 'published',
              university_name: 'Université de Test',
              faculty_name: 'Faculté de Test',
              degree_name: 'Doctorat',
              language_name: 'Français',
              author_name: 'Auteur Test',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 20,
            pages: 1
          }
        })
      });
    });

    await page.goto('/admin/theses');
    
    // Check theses list page
    await expect(page.getByRole('heading', { name: 'Gestion des thèses' })).toBeVisible();
    await expect(page.getByText('Thèse de Test')).toBeVisible();
    
    // Check thesis status
    await expect(page.locator('text=Publiée')).toBeVisible();
    
    // Check action buttons
    await expect(page.getByRole('button', { name: 'Voir' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Supprimer' })).toBeVisible();
  });

  test('should create new thesis', async ({ page }) => {
    // Mock thesis form structure API
    await page.route('**/admin/thesis-content/manual/form', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          thesis_fields: {},
          related_entities: {},
          reference_data: {
            universities: [
              { id: 'univ-1', name_fr: 'Université de Test', acronym: 'UT' }
            ],
            faculties: [
              { id: 'fac-1', university_id: 'univ-1', name_fr: 'Faculté de Test' }
            ],
            degrees: [
              { id: 'deg-1', name_fr: 'Doctorat', abbreviation: 'PhD', type: 'doctorate' }
            ],
            languages: [
              { id: 'lang-1', code: 'fr', name: 'Français' }
            ],
            categories_tree: [],
            academic_roles: [
              { value: 'author', label: 'Auteur' },
              { value: 'director', label: 'Directeur' }
            ]
          }
        })
      });
    });

    // Mock file upload API
    await page.route('**/admin/thesis-content/upload-file', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          file_id: 'file-123',
          original_filename: 'test_thesis.pdf',
          temp_filename: 'temp_file.pdf',
          file_size: 1024000,
          file_hash: 'abc123',
          extraction_job_id: 'job-123'
        })
      });
    });

    // Mock thesis creation API
    await page.route('**/admin/thesis-content/manual/create', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          id: 'thesis-new',
          title_fr: 'Nouvelle Thèse',
          title_en: 'New Thesis',
          abstract_fr: 'Résumé de la nouvelle thèse',
          defense_date: '2024-03-15',
          language_id: 'lang-1',
          status: 'draft',
          file_url: '/files/thesis-new.pdf',
          file_name: 'thesis-new.pdf',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        })
      });
    });

    await page.goto('/admin/theses/new');
    
    // Check thesis creation form
    await expect(page.getByRole('heading', { name: 'Créer une nouvelle thèse' })).toBeVisible();
    
    // Fill basic thesis information
    await page.getByLabel('Titre français').fill('Nouvelle Thèse');
    await page.getByLabel('Titre anglais').fill('New Thesis');
    await page.getByLabel('Résumé français').fill('Résumé de la nouvelle thèse');
    await page.getByLabel('Date de soutenance').fill('2024-03-15');
    
    // Select university
    await page.getByLabel('Université').click();
    await page.getByText('Université de Test').click();
    
    // Select faculty
    await page.getByLabel('Faculté').click();
    await page.getByText('Faculté de Test').click();
    
    // Select degree
    await page.getByLabel('Degré').click();
    await page.getByText('Doctorat').click();
    
    // Select language
    await page.getByLabel('Langue').click();
    await page.getByText('Français').click();
    
    // Upload file
    await page.setInputFiles('input[type="file"]', {
      name: 'test_thesis.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF content')
    });
    
    // Wait for file upload
    await expect(page.getByText('Fichier téléchargé avec succès')).toBeVisible();
    
    // Submit form
    await page.getByRole('button', { name: 'Créer la thèse' }).click();
    
    // Check success message
    await expect(page.getByText('Thèse créée avec succès')).toBeVisible();
  });

  test('should manage academic persons', async ({ page }) => {
    // Mock academic persons API
    await page.route('**/admin/academic-persons', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'person-1',
              complete_name_fr: 'Professeur Test',
              complete_name_ar: 'الأستاذ اختبار',
              first_name_fr: 'Test',
              last_name_fr: 'Professeur',
              title: 'Professeur',
              university_id: 'univ-1',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 20,
            pages: 1
          }
        })
      });
    });

    await page.goto('/admin/academic-persons');
    
    // Check academic persons list page
    await expect(page.getByRole('heading', { name: 'Gestion des personnes académiques' })).toBeVisible();
    await expect(page.getByText('Professeur Test')).toBeVisible();
  });

  test('should manage categories', async ({ page }) => {
    // Mock categories API
    await page.route('**/admin/categories', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'cat-1',
              code: 'INF',
              name_fr: 'Informatique',
              name_en: 'Computer Science',
              description: 'Sciences informatiques',
              level: 1,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 20,
            pages: 1
          }
        })
      });
    });

    await page.goto('/admin/categories');
    
    // Check categories list page
    await expect(page.getByRole('heading', { name: 'Gestion des catégories' })).toBeVisible();
    await expect(page.getByText('Informatique')).toBeVisible();
    await expect(page.getByText('INF')).toBeVisible();
  });

  test('should handle admin errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/admin/universities', async route => {
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

    await page.goto('/admin/universities');
    
    // Should show error message
    await expect(page.getByText('Erreur lors du chargement des données')).toBeVisible();
    await expect(page.getByText('Veuillez réessayer plus tard')).toBeVisible();
  });

  test('should prevent unauthorized access', async ({ page }) => {
    // Mock user login (not admin)
    await page.route('**/auth/profile', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-123',
          email: 'user@example.com',
          username: 'user',
          first_name: 'User',
          last_name: 'Test',
          role: 'user',
          email_verified: true,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        })
      });
    });

    await page.goto('/admin/dashboard');
    
    // Should redirect to home page or show access denied
    await expect(page).toHaveURL('/');
    // Or check for access denied message
    // await expect(page.getByText('Accès non autorisé')).toBeVisible();
  });
});