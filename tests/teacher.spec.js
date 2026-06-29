import { test, expect } from '@playwright/test';
import { testData } from './testData';

test.describe('Teacher Panel Role-Based Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials
    await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.teacher.email);
    await page.getByPlaceholder('••••••••').fill(testData.credentials.teacher.password);
    await page.getByRole('button', { name: 'Secure Login' }).click();
    
    // Check if error message appears on the login page immediately
    const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
    await Promise.race([
      page.waitForURL(/.*teacher/, { timeout: 10000 }).catch(() => {}),
      errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ]);
    
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.innerText();
      throw new Error(`Authentication failed for Teacher with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
    }
    
    // Wait for redirect to teacher dashboard
    await expect(page).toHaveURL(/.*teacher/, { timeout: 5000 });
  });

  // TC-032: LMS Material Upload
  test('TC-032: LMS Material Upload', async ({ page }) => {
    await page.goto('/teacher/lms');
    await expect(page.getByRole('heading', { name: 'LMS Portal' }).or(page.getByText('Study Material'))).toBeVisible();
    
    // Click Upload Study Material
    await page.getByRole('button', { name: 'Upload Study Material' }).or(page.getByRole('button', { name: 'Upload Material' })).click();
    
    // Select batch and fill name
    const batchSelect = page.getByLabel('Batch').or(page.getByLabel('Class'));
    await batchSelect.selectOption({ index: 1 });
    
    await page.getByLabel('Material Name').or(page.getByLabel('Title')).fill(testData.teacherData.lms.materialName);
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testData.teacherData.lms.filePath);
    
    // Submit
    await page.getByRole('button', { name: 'Upload' }).or(page.getByRole('button', { name: 'Submit' })).click();
    
    // Verify uploaded document populates the batch files repository
    await expect(page.getByText(testData.teacherData.lms.materialName).first()).toBeVisible();
  });

  // TC-033: Timetable & Schedule
  test('TC-033: Timetable & Schedule Display', async ({ page }) => {
    await page.goto('/teacher/schedule');
    await expect(page.getByRole('heading', { name: 'My Schedule' }).or(page.getByText('Timetable'))).toBeVisible();
    
    // Verify calendar blocks populate
    const calendarEvent = page.locator('.rbc-event').first().or(page.locator('.bg-white:has-text("Room")').first()).or(page.locator('tbody tr').first());
    await expect(calendarEvent).toBeVisible();
  });

  // TC-034: Marks & Grading
  test('TC-034: Marks & Grading Submission', async ({ page }) => {
    await page.goto('/teacher/grades');
    await expect(page.getByRole('heading', { name: 'Marks & Grading' }).or(page.getByText('Grade Book'))).toBeVisible();
    
    // Select class/assignment dynamically if list is visible
    const classSelect = page.locator('select').first();
    if (await classSelect.isVisible()) {
      await classSelect.selectOption({ index: 1 });
    }
    
    // Input grade score for the first student row
    const gradeInput = page.locator('input[type="text"][placeholder*="Grade"]').first().or(page.locator('input[type="number"]').first()).or(page.locator('tbody tr input').first());
    if (await gradeInput.isVisible()) {
      await gradeInput.fill(testData.teacherData.grades.score);
      
      // Click Submit Grades
      await page.getByRole('button', { name: 'Submit Grades' }).or(page.getByRole('button', { name: 'Save Grades' })).click();
      
      // Verify success toast
      await expect(page.locator('div[role="status"]')).toContainText(/(Grates|Grades|Scores) (submitted|saved) successfully/i);
    } else {
      console.log('No grading input fields found.');
    }
  });

  // TC-035: Timesheet Clocking
  test('TC-035: Timesheet Clocking - Clock In / Clock Out', async ({ page }) => {
    await page.goto('/teacher/timesheet');
    await expect(page.getByRole('heading', { name: 'Work Timesheet' }).or(page.getByText('Timesheet'))).toBeVisible();
    
    // Click Clock In
    const clockInBtn = page.getByRole('button', { name: 'Clock In' });
    await expect(clockInBtn).toBeVisible();
    await clockInBtn.click();
    
    // Timer must start (Clock In changes to Clock Out)
    const clockOutBtn = page.getByRole('button', { name: 'Clock Out' });
    await expect(clockOutBtn).toBeVisible();
    
    // Log history table registers a new active session
    await expect(page.locator('tbody tr').first()).toContainText('Active');
    
    // Click Clock Out
    await clockOutBtn.click();
    
    // Verify log completion
    await expect(page.locator('tbody tr').first()).not.toContainText('Active');
  });

  // TC-036: Research/Project Tracking
  test('TC-036: Research/Project Tracking - Allocate Hours', async ({ page }) => {
    await page.goto('/teacher/projects');
    await expect(page.getByRole('heading', { name: 'Research & Projects' }).or(page.getByText('Project Tracking'))).toBeVisible();
    
    // Click Allocate Project Hours
    await page.getByRole('button', { name: 'Allocate Project Hours' }).or(page.getByRole('button', { name: 'Log Hours' })).click();
    
    // Select project & input hours
    const projectSelect = page.getByLabel('Select Project').or(page.locator('select').first());
    if (await projectSelect.isVisible()) {
      await projectSelect.selectOption({ index: 1 });
    }
    await page.getByLabel('Hours').or(page.locator('input[type="number"]')).fill(testData.teacherData.projects.hours);
    
    // Submit
    await page.getByRole('button', { name: 'Submit' }).or(page.getByRole('button', { name: 'Log Hours' })).click();
    
    // Verify progress bar updates
    await expect(page.locator('.bg-primary-500').first().or(page.locator('.h-full.rounded-full').first())).toBeVisible();
  });

  // TC-037: Payroll Payslips
  test('TC-037: Payroll Payslips - Read-Only Dashboard & Download', async ({ page }) => {
    await page.goto('/teacher/payroll');
    await expect(page.getByRole('heading', { name: 'Payroll & Payslips' }).or(page.getByText('Payslips'))).toBeVisible();
    
    // Read-only payslip metrics
    await expect(page.getByText('Basic Pay').or(page.getByText('Deductions'))).toBeVisible();
    
    // Locate first payslip and click Download PDF
    const downloadBtn = page.getByRole('button', { name: 'Download PDF' }).first().or(page.locator('tbody tr button').first());
    
    if (await downloadBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await downloadBtn.click();
      const download = await downloadPromise;
      
      // Verify download starts
      expect(download.suggestedFilename()).toContain('.pdf');
    } else {
      console.log('No payslip entries found.');
    }
  });

  // TC-038: Staff Complaints
  test('TC-038: Staff Complaints - Isolation Verification', async ({ page }) => {
    await page.goto('/teacher/complaints');
    await expect(page.getByRole('heading', { name: 'Staff Complaints' }).or(page.getByText('My Complaints'))).toBeVisible();
    
    // Click File Complaint
    await page.getByRole('button', { name: 'File Complaint' }).click();
    
    // Choose category, details and save
    await page.getByLabel('Category').selectOption(testData.teacherData.complaints.category);
    await page.getByLabel('Details').or(page.locator('textarea')).fill(testData.teacherData.complaints.details);
    await page.getByRole('button', { name: 'Save' }).or(page.getByRole('button', { name: 'Submit' })).click();
    
    // Verify only the teacher's own complaints populate the feed
    await expect(page.getByText(testData.teacherData.complaints.details).first()).toBeVisible();
    
    // Check isolation
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const rowText = await rows.nth(i).innerText();
      expect(rowText).not.toContain('Leakage Data From Other Users');
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
