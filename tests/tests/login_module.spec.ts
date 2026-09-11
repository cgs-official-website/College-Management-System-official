import { test, expect } from '@playwright/test';


// =====================================================
// LOGIN MODULE - VALID LOGIN
// =====================================================

test('Login - Valid Credentials', async ({ page }) => {

  test.setTimeout(60000);

  await page.goto('https://cms.teamzuna.in/login');

  // ASSERTION 1: Login page should be displayed
  await expect(page).toHaveURL(/login/);

  // ASSERTION 2: Email field should be visible
  const email = page.getByRole('textbox', { name: 'Email' });

  await expect(email).toBeVisible();

  // Enter valid email
  await email.fill('nithish@gmail.com');

  // ASSERTION 3: Email value should be entered
  await expect(email).toHaveValue('nithish@gmail.com');


  // Password
  const password = page.getByRole('textbox', { name: '••••••••' });

  // ASSERTION 4: Password field should be visible
  await expect(password).toBeVisible();

  await password.fill('123456');


  // Login button
  const loginButton = page.getByRole('button', { name: 'Secure Login' });

  // ASSERTION 5: Login button should be visible
  await expect(loginButton).toBeVisible();

  // ASSERTION 6: Login button should be enabled
  await expect(loginButton).toBeEnabled();

  // Click Login
  await loginButton.click();

  await page.waitForTimeout(2000);


  // ASSERTION 7: Login should be successful
  // Admission link is expected after successful login
  // ASSERTION: Login should be successful
await expect(page).toHaveURL(/\/admin/);

});


// LOGIN MODULE - INVALID EMAIL

test('Login - Invalid Email Validation', async ({ page }) => {

  await page.goto('https://cms.teamzuna.in/login');

  const email = page.getByRole('textbox', { name: 'Email' });

  await email.fill('wrongemail');

  const password = page.getByRole('textbox', { name: '••••••••' });

  await password.fill('123456');

  await page.getByRole('button', { name: 'Secure Login' }).click();

  await page.waitForTimeout(2000);


  // VALIDATION
  // Browser/application should consider invalid email invalid
  await page.getByRole('button', { name: 'Secure Login' }).click();

await page.waitForTimeout(2000);

// VALIDATION
const isValid = await email.evaluate(
  (el: HTMLInputElement) => el.validity.valid
);

expect(isValid).toBe(false);

});


// ADMISSION MODULE - ADD INQUIRY WITH VALID DATA


test('Admission - Add Inquiry with Valid Data', async ({ page }) => {

  test.setTimeout(60000);

  // LOGIN
  await page.goto('https://cms.teamzuna.in/login');

  await page.getByRole('textbox', { name: 'Email' })
    .fill('nithish@gmail.com');

  await page.getByRole('textbox', { name: '••••••••' })
    .fill('123456');

  await page.getByRole('button', { name: 'Secure Login' })
    .click();

  await page.waitForTimeout(2000);


  // ADMISSION

  await page.getByRole('link', { name: 'Admission' }).click();

  await page.waitForTimeout(4000);

  // ASSERTION 1: Add Inquiry button visible
  await expect(
    page.getByRole('button', { name: 'Add Inquiry' })
  ).toBeVisible();

  // Click Add Inquiry
  await page.getByRole('button', { name: 'Add Inquiry' }).click();

  await page.waitForTimeout(2000);


  // FIRST NAME

  const firstName =
    page.getByRole('textbox', { name: 'First Name' });

  await expect(firstName).toBeVisible();

  await firstName.fill('Nithin');

  await expect(firstName).toHaveValue('Nithin');


  // LAST NAME

  const lastName =
    page.getByRole('textbox', { name: 'Last Name' });

  await expect(lastName).toBeVisible();

  await lastName.fill('U');

  await expect(lastName).toHaveValue('U');


  // EMAIL

  const inquiryEmail =
    page.getByRole('textbox', { name: 'Email Address' });

  await expect(inquiryEmail).toBeVisible();

  await inquiryEmail.fill('nithin@gmail.com');

  await expect(inquiryEmail)
    .toHaveValue('nithin@gmail.com');


  // PHONE NUMBER

  const phone =
    page.getByRole('textbox', { name: 'Phone Number' });

  await expect(phone).toBeVisible();

  await phone.fill('9234561234');

  await expect(phone)
    .toHaveValue('9234561234');


  // COURSE

  const course =
    page.getByLabel('Applied Course / Program');

  await course.selectOption(
    '7cc8affa-441d-4e47-bf4d-86d1e9075eb0'
  );

  await expect(course)
    .toHaveValue('7cc8affa-441d-4e47-bf4d-86d1e9075eb0');


   
  // RESIDENCE TYPE

  const residence =
    page.getByLabel('Residence Type');

  await residence.selectOption('Hosteller');

  await expect(residence)
    .toHaveValue('Hosteller');


  // SUBMIT

  await page.locator('form')
    .getByRole('button', { name: 'Add Inquiry' })
    .click();


  // IMPORTANT:
  // Don't wait 5 seconds before checking the toast.
  // Playwright will wait UP TO 5 seconds for it.

  await expect(
    page.getByText('Application submitted successfully!')
  ).toBeVisible({ timeout: 5000 });

});


// ADMISSION MODULE - INVALID EMAIL

test('Admission - Invalid Email Validation', async ({ page }) => {

  test.setTimeout(60000);

  // LOGIN
  await page.goto('https://cms.teamzuna.in/login');

  await page.getByRole('textbox', { name: 'Email' })
    .fill('nithish@gmail.com');

  await page.getByRole('textbox', { name: '••••••••' })
    .fill('123456');

  await page.getByRole('button', { name: 'Secure Login' })
    .click();

  await page.waitForTimeout(2000);


  // ADMISSION
  await page.getByRole('link', { name: 'Admission' }).click();

  await page.waitForTimeout(3000);

  await page.getByRole('button', { name: 'Add Inquiry' }).click();

  await page.waitForTimeout(1000);


  // Enter invalid email
const email =
  page.getByRole('textbox', { name: 'Email Address' });

await email.fill('nithin');

// ASSERTION / VALIDATION
await expect(email).toHaveAttribute('type', 'email');

const isValid = await email.evaluate(
  (el: HTMLInputElement) => el.validity.valid
);

expect(isValid).toBe(false);

});








