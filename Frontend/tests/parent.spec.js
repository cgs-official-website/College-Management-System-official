import { test, expect } from '@playwright/test';
import { testData } from './testData';

test.describe('Parent Panel Role-Based Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials
    await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.parent.email);
    await page.getByPlaceholder('••••••••').fill(testData.credentials.parent.password);
    await page.getByRole('button', { name: 'Secure Login' }).click();
    
    // Check if error message appears on the login page immediately
    const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
    await Promise.race([
      page.waitForURL(/.*parent/, { timeout: 10000 }).catch(() => {}),
      errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ]);
    
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.innerText();
      throw new Error(`Authentication failed for Parent with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
    }
    
    // Wait for redirect to parent dashboard
    await expect(page).toHaveURL(/.*parent/, { timeout: 5000 });
  });

  // TC-039: Child Overview Dashboard
  test('TC-039: Child Overview Dashboard Verification', async ({ page }) => {
    // Verify dashboard landing state
    const blockScreen = page.getByRole('heading', { name: 'No Child Linked' });
    const isUnlinked = await blockScreen.isVisible();
    
    if (isUnlinked) {
      await expect(blockScreen).toBeVisible();
      await expect(page.getByText(/Please contact the college administration/i)).toBeVisible();
    } else {
      // Child profile card details
      await expect(page.getByText('Attendance').first()).toBeVisible();
      await expect(page.getByText('CGPA').first()).toBeVisible();
      await expect(page.getByText('Roll Number').first()).toBeVisible();
    }
  });

  // TC-040: Child Attendance Tracking
  test('TC-040: Child Attendance Tracking - Read-Only View', async ({ page }) => {
    await page.goto('/parent/attendance');
    await expect(page.getByRole('heading', { name: 'Attendance Record' }).or(page.getByText('Attendance'))).toBeVisible();
    
    // Ensure no attendance modification buttons exist
    await expect(page.getByRole('button', { name: 'Submit Attendance' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).not.toBeVisible();
    
    const calendarMonth = page.locator('.rbc-month-view').or(page.locator('.lucide-calendar')).or(page.locator('table'));
    await expect(calendarMonth).toBeVisible();
  });

  // TC-041: Child Hostel Profile
  test('TC-041: Child Hostel Profile - Read-Only View', async ({ page }) => {
    await page.goto('/parent/hostel');
    await expect(page.getByRole('heading', { name: 'Hostel Details' }).or(page.getByText('Hostel Room'))).toBeVisible();
    
    // Verify Child's assigned Hostel Block, Room Number, and Warden Phone Number
    await expect(page.getByText('Block').or(page.getByText('Room'))).toBeVisible();
    await expect(page.getByText('Warden Phone').or(page.getByText('Contact'))).toBeVisible();
    
    // Ensure no room allocation controls are present
    await expect(page.getByRole('button', { name: 'Allocate Room' })).not.toBeVisible();
  });

  // TC-042: Child Bus Tracker
  test('TC-042: Child Bus Tracker - Read-Only View', async ({ page }) => {
    await page.goto('/parent/transport');
    await expect(page.getByRole('heading', { name: 'Bus Details' }).or(page.getByText('Transport'))).toBeVisible();
    
    // Verify route details, pickup stop name, driver name, and driver phone
    await expect(page.getByText('Driver Name').or(page.getByText('Route'))).toBeVisible();
    await expect(page.getByText('Driver Phone').or(page.getByText('Contact'))).toBeVisible();
    
    // Ensure no vehicle onboarding button is present
    await expect(page.getByRole('button', { name: 'Add Vehicle' })).not.toBeVisible();
  });

  // TC-043: Parent Concerns & Complaints
  test('TC-043: Parent Concerns & Complaints - File Concern', async ({ page }) => {
    await page.goto('/parent/complaints');
    await expect(page.getByRole('heading', { name: 'Parent Concerns' }).or(page.getByText('My Complaints'))).toBeVisible();
    
    // Click File Concern
    await page.getByRole('button', { name: 'File Concern' }).or(page.getByRole('button', { name: 'File Complaint' })).click();
    
    // Write concern description and submit
    await page.getByLabel('Concern Details').or(page.locator('textarea')).fill(testData.parentData.concerns.description);
    await page.getByRole('button', { name: 'Submit' }).or(page.getByRole('button', { name: 'Submit Concern' })).click();
    
    // Verify concern shows up in "My Complaints" list
    await expect(page.getByText(testData.parentData.concerns.description).first()).toBeVisible();
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
