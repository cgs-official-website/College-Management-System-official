import { test, expect } from '@playwright/test';
import { testData } from './testData';

test.describe('Multi-Tenant Security & Guard Checks', () => {

  // TC-044: Direct Path Intrusion Attempt
  test('TC-044: Direct Path Intrusion Attempt - Unauthorized Redirect', async ({ page }) => {
    // Ensure logged out
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try navigating directly to protected Admin subpaths
    await page.goto('/admin/fees');
    await expect(page).toHaveURL(/.*login/);
    
    await page.goto('/admin/hr');
    await expect(page).toHaveURL(/.*login/);

    await page.goto('/super/colleges');
    await expect(page).toHaveURL(/.*login/);
  });

  // TC-045: Role Escalate Bypass Attempt
  test('TC-045: Role Escalate Bypass Attempt - RBAC Redirection', async ({ page }) => {
    // Log in with Student Credentials
    await page.goto('/login');
    await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.student.email);
    await page.getByPlaceholder('••••••••').fill(testData.credentials.student.password);
    await page.getByRole('button', { name: 'Secure Login' }).click();
    
    // Check if error message appears on the login page immediately
    const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
    await Promise.race([
      page.waitForURL(/.*student/, { timeout: 10000 }).catch(() => {}),
      errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ]);
    
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.innerText();
      throw new Error(`Authentication failed for Student with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
    }
    
    // Wait for student dashboard redirect
    await expect(page).toHaveURL(/.*student/, { timeout: 5000 });
    
    // Attempt to access Admin dashboard manually
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*(student|login|dashboard)/, { timeout: 10000 });
    
    // Attempt to access Super Admin panel manually
    await page.goto('/super');
    await expect(page).toHaveURL(/.*(student|login|dashboard)/, { timeout: 10000 });
  });

  // TC-046: Multi-Tenant Isolation Attempt
  test('TC-046: Multi-Tenant Isolation Attempt', async ({ page }) => {
    // Log in with College Admin Credentials (belonging to College B)
    await page.goto('/login');
    await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.admin.email);
    await page.getByPlaceholder('••••••••').fill(testData.credentials.admin.password);
    await page.getByRole('button', { name: 'Secure Login' }).click();
    
    // Check if error message appears on the login page immediately
    const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
    await Promise.race([
      page.waitForURL(/.*admin/, { timeout: 10000 }).catch(() => {}),
      errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ]);
    
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.innerText();
      throw new Error(`Authentication failed for Admin with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
    }
    
    await expect(page).toHaveURL(/.*admin/, { timeout: 5000 });
    
    // Attempt to access detail page for a record ID belonging to College A
    await page.goto(`/admin/students/${testData.securityData.foreignCollegeStudentId}`);
    
    // Expected Result: UI redirects or displays not found/permission denied state
    const studentNotFound = page.getByText(/Student not found/i).or(page.getByText(/No student found/i)).or(page.getByText(/Permission Denied/i));
    const isRedirected = page.url() !== `/admin/students/${testData.securityData.foreignCollegeStudentId}`;
    
    if (!isRedirected) {
      await expect(studentNotFound.first()).toBeVisible({ timeout: 10000 });
    } else {
      expect(page.url()).not.toContain(testData.securityData.foreignCollegeStudentId);
    }
  });
});
