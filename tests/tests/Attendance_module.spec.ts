import { test, expect } from '@playwright/test';

test('Attendance - Mark All Present and Class Filter Validation', async ({ page }) => {

  // Total timeout: 60 seconds
  test.setTimeout(60000);

  
  // LOGIN
  

  await page.goto('https://cms.teamzuna.in/login');

  await page.getByRole('textbox', { name: 'Email' }).fill('nithish@gmail.com');

  await page.getByRole('textbox', { name: '••••••' }).fill('123456');

  const loginButton = page.getByRole('button', { name: 'Secure Login' });

  // ASSERTION 1: Login button should be visible
  await expect(loginButton).toBeVisible();

  // ASSERTION 2: Login button should be enabled
  await expect(loginButton).toBeEnabled();

  await loginButton.click();

  await page.waitForTimeout(4000);


  // ATTENDANCE MODULE  
  const attendanceLink = page.getByRole('link', {
    name: 'Attendance',
    exact: true
  });

  // ASSERTION 3: Attendance menu should be visible
  await expect(attendanceLink).toBeVisible();

  await attendanceLink.click();

  await page.waitForTimeout(4000);


  
  // VALIDATE ATTENDANCE PAGE

  // ASSERTION 4:
  // Attendance page should contain Attendance text
  await expect(
    page.getByText('Attendance', { exact: true }).first()
  ).toBeVisible();


  // MARK ALL PRESENT  

  const markAllPresentButton = page.getByRole('button', {
    name: 'Mark All Present'
  });

  // ASSERTION 5: Button should be visible
  await expect(markAllPresentButton).toBeVisible();

  // ASSERTION 6: Button should be enabled
  await expect(markAllPresentButton).toBeEnabled();

  await markAllPresentButton.click();

  await page.waitForTimeout(3000);


  // CLASS FILTER

  const classFilter = page.getByLabel('Filter by Class');

  // ASSERTION 7: Filter should be visible
  await expect(classFilter).toBeVisible();

  // ASSERTION 8: Filter should be enabled
  await expect(classFilter).toBeEnabled();


  // FILTER - EEE

  await classFilter.selectOption({
    label: 'Class EEEu'
  });

  await page.waitForTimeout(2000);

  // VALIDATION:
  // Verify EEE is actually selected
  await expect(classFilter).toHaveValue('EEEu');


  // FILTER - BSC COMPUTER SCIENCE

  await classFilter.selectOption({
    label: 'Class BSC Computer science'
  });

  await page.waitForTimeout(2000);

  // VALIDATION:
  // Verify BSC Computer science is selected
  await expect(classFilter).toHaveValue('BSC Computer science');


  // FILTER - MBA

  await classFilter.selectOption({
    label: 'Class MBA'
  });

  await page.waitForTimeout(3000);

  // VALIDATION:
  // Verify MBA is selected
  await expect(classFilter).toHaveValue('MBA');


  // FINAL ASSERTION

  // Final filter should remain MBA
  await expect(classFilter).toHaveValue('MBA');

});