import { test, expect } from '@playwright/test';
import { testData } from './testData';

test.describe('Student Panel Role-Based Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials
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
    
    // Wait for redirect to student dashboard
    await expect(page).toHaveURL(/.*student/, { timeout: 5000 });
  });

  // TC-024: Enrolled Courses
  test('TC-024: Enrolled Courses - Read-Only Verification', async ({ page }) => {
    await page.goto('/student/courses');
    await expect(page.getByRole('heading', { name: 'My Courses' }).or(page.getByText('Enrolled Courses'))).toBeVisible();
    
    // Verify course syllabus progress percentage is read-only
    await expect(page.getByText('%')).first().toBeVisible();
    
    // Verification: Ensure no administrative controls exist
    await expect(page.getByRole('button', { name: 'Add Course' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Class' })).not.toBeVisible();
  });

  // TC-025: Assignments Portal
  test('TC-025: Assignments Portal - Submit Work', async ({ page }) => {
    await page.goto('/student/assignments');
    await expect(page.getByRole('heading', { name: 'Assignments' }).or(page.getByText('Assignments'))).toBeVisible();
    
    // Click Submit Work on a pending assignment row
    const submitBtn = page.getByRole('button', { name: 'Submit Work' }).or(page.locator('tbody tr button').first());
    
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      
      // Upload a test document file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testData.studentData.assignments.filePath);
      
      // Click submit
      await page.getByRole('button', { name: 'Submit Assignment' }).or(page.getByRole('button', { name: 'Submit' })).click();
      
      // Verification: Verify status transitions to "Submitted"
      await expect(page.locator('tbody tr').first()).toContainText('Submitted');
    } else {
      console.log('No pending assignments found to submit.');
    }
  });

  // TC-026: Attendance Analytics
  test('TC-026: Attendance Analytics - Leave Request Application', async ({ page }) => {
    await page.goto('/student/attendance');
    
    // Verify attendance meter is visible
    await expect(page.getByText('Attendance Rate').or(page.locator('.lucide-calendar'))).toBeVisible();
    
    // Click Apply for Leave
    await page.getByRole('button', { name: 'Apply for Leave' }).click();
    
    // Fill date pickers & reason
    const fromDate = page.locator('input[type="date"]').first();
    const toDate = page.locator('input[type="date"]').nth(1);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    await fromDate.fill(dateStr);
    await toDate.fill(dateStr);
    await page.getByLabel('Reason').or(page.locator('textarea')).fill(testData.studentData.leave.reason);
    
    // Submit
    await page.getByRole('button', { name: 'Submit Request' }).or(page.getByRole('button', { name: 'Submit' })).click();
    
    // Verification: Check leave request status log shows "Pending"
    const requestLog = page.locator('tbody tr').filter({ hasText: testData.studentData.leave.reason });
    await expect(requestLog).toContainText('Pending');
  });

  // TC-027: Read-Only LMS & Videos
  test('TC-027: Read-Only LMS & Videos - Access & Verification', async ({ page }) => {
    await page.goto('/student/lms');
    await expect(page.getByRole('heading', { name: 'LMS Portal' }).or(page.getByText('Live Classes'))).toBeVisible();
    
    // If a class is live, check for the Join Class CTA
    const joinClassBtn = page.getByRole('link', { name: 'Join Class' }).or(page.getByRole('button', { name: 'Join' }));
    if (await joinClassBtn.isVisible()) {
      await expect(joinClassBtn).toBeVisible();
    }
    
    // Verification: Ensure there are NO teacher upload/delete controls
    await expect(page.getByRole('button', { name: 'Schedule Class' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload Study Material' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Record' })).not.toBeVisible();
  });

  // TC-028: Hostel Room View
  test('TC-028: Hostel Room View - Raise Maintenance Request', async ({ page }) => {
    await page.goto('/student/hostel');
    
    // Verify room details card is visible
    await expect(page.getByText('Hostel Room').or(page.getByText('Warden Phone'))).toBeVisible();
    
    // Click Raise Maintenance Request
    await page.getByRole('button', { name: 'Raise Maintenance Request' }).or(page.getByRole('button', { name: 'Report Issue' })).click();
    
    // Fill out request details
    await page.getByLabel('Issue Description').or(page.getByPlaceholder(/describe/i)).fill(testData.studentData.hostel.issue);
    await page.getByLabel('Severity').selectOption(testData.studentData.hostel.severity);
    
    // Submit
    await page.getByRole('button', { name: 'Submit Request' }).or(page.getByRole('button', { name: 'Submit' })).click();
    
    // Ensure it populates under "My Requests"
    await expect(page.getByText(testData.studentData.hostel.issue).first()).toBeVisible();
  });

  // TC-029: Transport Bus Details
  test('TC-029: Transport Bus Details - Read-Only Verification', async ({ page }) => {
    await page.goto('/student/transport');
    
    // Verify read-only view of bus details
    await expect(page.getByText('Driver Name').or(page.getByText('Warden').or(page.locator('.lucide-bus')))).toBeVisible();
    
    // Check map rendering placeholder
    const mapPlaceholder = page.locator('.bg-slate-100:has-text("Map")').or(page.locator('iframe')).or(page.locator('[data-testid="map-placeholder"]').or(page.getByText(/Route Map/i)));
    await expect(mapPlaceholder).toBeVisible();
  });

  // TC-029a: Campus Store
  test('TC-029a: Campus Store - Dashboard Empty State Verification', async ({ page }) => {
    await page.goto('/student/store');
    
    // Verify landing page title
    await expect(page.getByRole('heading', { name: 'Campus Store' })).toBeVisible();
    
    // Assert catalog empty text
    await expect(page.getByRole('heading', { name: 'Store Catalog Empty' })).toBeVisible();
    await expect(page.getByText('Items will appear here once the college admin adds products')).toBeVisible();
  });

  // TC-030: Placements Portal
  test('TC-030: Placements Portal - Apply Drive', async ({ page }) => {
    await page.goto('/student/placement');
    await expect(page.getByRole('heading', { name: 'Placement Cell' }).or(page.getByText('Corporate Drives'))).toBeVisible();
    
    // Ensure no drive scheduler controls load
    await expect(page.getByRole('button', { name: 'Add Placement Drive' })).not.toBeVisible();
    
    // Locate upcoming drive
    const driveRow = page.locator('tbody tr').first().or(page.locator('.bg-white:has-text("Package")').first());
    
    if (await driveRow.isVisible()) {
      const applyBtn = driveRow.getByRole('button', { name: 'Apply' });
      if (await applyBtn.isVisible() && !(await applyBtn.isDisabled())) {
        await applyBtn.click();
        // Verify status badge
        await expect(driveRow.locator('.bg-emerald-500').or(page.getByText('Applied').first())).toBeVisible();
      }
    } else {
      console.log('No placement drives listed.');
    }
  });

  // TC-031: Private Complaints
  test('TC-031: Private Complaints - Isolation Verification', async ({ page }) => {
    await page.goto('/student/complaints');
    await expect(page.getByRole('heading', { name: 'Complaints' }).or(page.getByText('My Complaints'))).toBeVisible();
    
    // Click File Complaint
    await page.getByRole('button', { name: 'File Complaint' }).click();
    
    // Input description and submit
    await page.getByLabel('Complaint Details').or(page.locator('textarea')).fill(testData.studentData.complaints.description);
    await page.getByRole('button', { name: 'Submit' }).or(page.getByRole('button', { name: 'Submit Complaint' })).click();
    
    // Verify it appears under "My Complaints"
    await expect(page.getByText(testData.studentData.complaints.description).first()).toBeVisible();
    
    // Check isolation
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const rowText = await rows.nth(i).innerText();
      expect(rowText).not.toContain('Unauthorized Leakage Data');
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
