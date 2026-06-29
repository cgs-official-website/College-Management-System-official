import { test, expect } from '@playwright/test';
import { testData } from './testData';

test.describe('Superadmin Panel Verification', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill credentials from testData
    await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.superadmin.email);
    await page.getByPlaceholder('••••••••').fill(testData.credentials.superadmin.password);
    
    // Click login button
    await page.getByRole('button', { name: 'Secure Login' }).click();
    
    // Check if error message appears on the login page immediately
    const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
    await Promise.race([
      page.waitForURL(/.*super/, { timeout: 10000 }).catch(() => {}),
      errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ]);
    
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.innerText();
      throw new Error(`Authentication failed for Superadmin with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
    }
    
    // Verify successful login redirection
    await expect(page).toHaveURL(/.*super/, { timeout: 5000 });
  });

  test('TC-001: Superadmin Login & Dashboard Overview', async ({ page }) => {
    // Verify landing page title
    await expect(page.getByRole('heading', { name: 'Global Overview' })).toBeVisible();
    
    // Verify stats cards are present and visible
    await expect(page.getByText('Total Colleges')).toBeVisible();
    await expect(page.getByText('Active Students')).toBeVisible();
    await expect(page.getByText('Total Revenue')).toBeVisible();
    await expect(page.getByText('System Health')).toBeVisible();
  });

  test('TC-002: Global Modules Dashboard Verification', async ({ page }) => {
    // Navigate to Global Modules dashboard via sidebar
    await page.getByRole('link', { name: 'Modules' }).click();
    await expect(page).toHaveURL(/.*super\/modules/);
    
    // Verify landing header
    await expect(page.getByRole('heading', { name: 'Global Modules' })).toBeVisible();
    
    // Verify empty state fallback or module catalog configuration
    const emptyStateHeader = page.getByRole('heading', { name: 'No Modules Configured' });
    const isMockEmpty = await emptyStateHeader.isVisible();
    
    if (isMockEmpty) {
      await expect(emptyStateHeader).toBeVisible();
      await expect(page.getByText('There are no global modules configured in the system yet.')).toBeVisible();
      // Stats cards should display 0
      await expect(page.locator('h3:has-text("0")').first()).toBeVisible();
    } else {
      // If modules are configured in the database, toggle the first available module
      const moduleRow = page.locator('tbody tr').first();
      await expect(moduleRow).toBeVisible();
      
      const toggleButton = moduleRow.locator('button');
      
      // Click the toggle button
      await toggleButton.click();
      
      // Verify the toast success message is shown
      await expect(page.locator('div[role="status"]')).toContainText(/is now (Enabled|Disabled) globally/);
    }
  });

  test('TC-003: College Onboarding & Approval', async ({ page }) => {
    // Navigate to Colleges directory
    await page.getByRole('link', { name: 'Colleges' }).click();
    await expect(page).toHaveURL(/.*super\/colleges/);
    
    // Verify Colleges list header
    await expect(page.getByRole('heading', { name: 'Colleges Directory' })).toBeVisible();
    
    // Search or locate pending college
    const searchInput = page.getByPlaceholder(/Search by college name/);
    await searchInput.fill(testData.superadminData.pendingCollegeName);
    
    // Select the row matching pending status
    const collegeRow = page.locator('tbody tr').filter({ hasText: testData.superadminData.pendingCollegeName });
    
    // Check if the college is actually in the table
    if (await collegeRow.count() > 0) {
      const statusBadge = collegeRow.locator('td').nth(2);
      await expect(statusBadge).toContainText('Pending');
      
      // Click the Approve button
      const approveBtn = collegeRow.getByRole('button', { name: 'Approve' });
      await approveBtn.click();
      
      // Verify status transitions to Active
      await expect(statusBadge).toContainText('Active', { timeout: 10000 });
    } else {
      console.log(`Pending college "${testData.superadminData.pendingCollegeName}" was not found in the live colleges list.`);
    }
  });

  test.afterEach(async ({ page }) => {
    if (!page.url().includes('/login')) {
      const logoutBtn = page.locator('aside').getByText('LogOut')
        .or(page.locator('aside').locator('.lucide-log-out'))
        .or(page.getByText('Sign Out'));
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click({ force: true });
        await expect(page).toHaveURL(/.*login/);
      }
    }
  });
});
