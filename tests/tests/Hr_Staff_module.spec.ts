import { test, expect } from '@playwright/test';

test('HR & Staff - Add Staff Member with Valid Data', async ({ page }) => {

  // TOTAL TEST TIMEOUT = 70 SECONDS
  test.setTimeout(60000);

  // LOGIN

  await page.goto('https://cms.teamzuna.in/login');

  await page.getByRole('textbox', { name: 'Email' })
    .fill('nithish@gmail.com');

  await page.getByRole('textbox', { name: '••••••' })
    .fill('123456');

  const loginButton = page.getByRole('button', { name: 'Secure Login' });

  // VALIDATION 1: Login button should be enabled
  await expect(loginButton).toBeEnabled();

  await loginButton.click();

  await page.waitForTimeout(4000);


  // HR & STAFF MODULE

  const hrStaffLink = page.getByRole('link', { name: 'HR & Staff' });

  // ASSERTION 2: HR & Staff link should be visible
  await expect(hrStaffLink).toBeVisible({
    timeout: 10000
  });

  await hrStaffLink.click();

  await page.waitForTimeout(4000);


  // ADD STAFF MEMBER

  const addStaffPageButton = page.getByRole('button', {
    name: 'Add Staff Member'
  });

  // ASSERTION 3: Add Staff Member button should be visible
  await expect(addStaffPageButton).toBeVisible({
    timeout: 10000
  });

  await addStaffPageButton.click();

  await page.waitForTimeout(3000);


  // STAFF DETAILS

  const firstName = page.getByRole('textbox', {
    name: 'First Name (Optional)'
  });

  const lastName = page.getByRole('textbox', {
    name: 'Last Name (Optional)'
  });

  const email = page.getByRole('textbox', {
    name: 'Email Address'
  });

  const phone = page.getByRole('textbox', {
    name: 'Phone Number'
  });


  // VALIDATION 4: First Name field visible
  await expect(firstName).toBeVisible();

  const testFirstName = `Staff_${Date.now().toString().slice(-4)}`;
  await firstName.fill(testFirstName);


  // VALIDATION 5: Last Name field visible
  await expect(lastName).toBeVisible();

  await lastName.fill('a');


  // VALIDATION 6: Email field visible
  await expect(email).toBeVisible();

  const testStaffEmail = `staff_${Date.now()}@gmail.com`;
  await email.fill(testStaffEmail);


  // VALIDATION 7: Phone field visible
  await expect(phone).toBeVisible();

  await phone.fill('6754327687');


  // STAFF CATEGORY

  const staffCategory = page.getByLabel('Staff Category');

  await expect(staffCategory).toBeVisible();

  await staffCategory.selectOption('non-teaching');


  // ROLE

  const customRole = page.locator(
    'select[name="customRoleId"]'
  );

  await expect(customRole).toBeVisible();

  await customRole.selectOption({ index: 1 });


  // STATUS

  const status = page.getByLabel('Status');

  await expect(status).toBeVisible();

  await status.selectOption('on_leave');


  // SUBMIT

  const submitButton = page
    .locator('form')
    .getByRole('button', {
      name: 'Add Staff Member'
    });

  // ASSERTION 8: Submit button should be enabled
  await expect(submitButton).toBeEnabled();

  await submitButton.scrollIntoViewIfNeeded();

  await submitButton.click();


  // FINAL ASSERTION

  await page.waitForTimeout(5000);

  // Check that newly added staff member appears
  await expect(
    page.getByText(testFirstName, { exact: false }).first()
  ).toBeVisible({
    timeout: 5000
  });

});