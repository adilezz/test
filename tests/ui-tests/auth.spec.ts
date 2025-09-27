import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.getByRole('button', { name: 'Se connecter' }).click();
    
    // Check for validation messages
    await expect(page.locator('text=Email requis')).toBeVisible();
    await expect(page.locator('text=Mot de passe requis')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Mot de passe').fill('wrongpassword');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    
    // Check for error message
    await expect(page.locator('text=Identifiants invalides')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Mock successful login response
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          token_type: 'Bearer',
          expires_in: 1440,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            role: 'user'
          }
        })
      });
    });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Mot de passe').fill('password123');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    
    // Should redirect to home page after successful login
    await expect(page).toHaveURL('/');
    
    // Should show user is logged in (check for logout button or user menu)
    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.getByRole('link', { name: 'Créer un compte' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('should display register form', async ({ page }) => {
    await page.goto('/register');
    
    await expect(page.getByRole('heading', { name: 'Créer un compte' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Nom d\'utilisateur')).toBeVisible();
    await expect(page.getByLabel('Prénom')).toBeVisible();
    await expect(page.getByLabel('Nom de famille')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Créer le compte' })).toBeVisible();
  });

  test('should show validation errors for register form', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Créer le compte' }).click();
    
    // Check for validation messages
    await expect(page.locator('text=Email requis')).toBeVisible();
    await expect(page.locator('text=Nom d\'utilisateur requis')).toBeVisible();
    await expect(page.locator('text=Prénom requis')).toBeVisible();
    await expect(page.locator('text=Nom de famille requis')).toBeVisible();
    await expect(page.locator('text=Mot de passe requis')).toBeVisible();
  });

  test('should register new user', async ({ page }) => {
    // Mock successful registration response
    await page.route('**/auth/register', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          token_type: 'Bearer',
          expires_in: 1440,
          user: {
            id: 'user-456',
            email: 'newuser@example.com',
            username: 'newuser',
            first_name: 'New',
            last_name: 'User',
            role: 'user'
          }
        })
      });
    });

    await page.goto('/register');
    
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Nom d\'utilisateur').fill('newuser');
    await page.getByLabel('Prénom').fill('New');
    await page.getByLabel('Nom de famille').fill('User');
    await page.getByLabel('Mot de passe').fill('password123');
    await page.getByRole('button', { name: 'Créer le compte' }).click();
    
    // Should redirect to home page after successful registration
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=New User')).toBeVisible();
  });

  test('should logout user', async ({ page }) => {
    // First login
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          token_type: 'Bearer',
          expires_in: 1440,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            role: 'user'
          }
        })
      });
    });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Mot de passe').fill('password123');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    
    // Wait for login to complete
    await expect(page).toHaveURL('/');
    
    // Mock logout response
    await page.route('**/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Logged out successfully'
        })
      });
    });
    
    // Click logout button (assuming it's in a user menu)
    await page.locator('[data-testid="user-menu"]').click();
    await page.getByRole('button', { name: 'Déconnexion' }).click();
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login for protected routes', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/profile');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/auth/login', async route => {
      await route.abort('failed');
    });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Mot de passe').fill('password123');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    
    // Should show network error message
    await expect(page.locator('text=Erreur de connexion')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Mot de passe').fill('password123');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    
    // Should show email validation error
    await expect(page.locator('text=Format d\'email invalide')).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/register');
    
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Nom d\'utilisateur').fill('testuser');
    await page.getByLabel('Prénom').fill('Test');
    await page.getByLabel('Nom de famille').fill('User');
    await page.getByLabel('Mot de passe').fill('123'); // Weak password
    await page.getByRole('button', { name: 'Créer le compte' }).click();
    
    // Should show password strength validation
    await expect(page.locator('text=Le mot de passe doit contenir au moins 8 caractères')).toBeVisible();
  });
});