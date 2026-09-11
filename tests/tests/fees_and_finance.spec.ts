import { test, expect } from '@playwright/test';

test('Fees & Finance - Create Fee Record with Validation and Assertion', async ({ page }) => {

  // Total test timeout = 60 seconds
  test.setTimeout(60000);

  // LOGIN

  await page.goto('https://cms.teamzuna.in/login');

  await expect(
    page.getByRole('textbox', { name: 'Email' })
  ).toBeVisible();

  await page.getByRole('textbox', { name: 'Email' })
    .fill('nithish@gmail.com');

  await expect(
    page.getByRole('textbox', { name: 'Email' })
  ).toHaveValue('nithish@gmail.com');


  await page.getByRole('textbox', { name: '••••••' })
    .fill('123456');

  await expect(
    page.getByRole('textbox', { name: '••••••' })
  ).toHaveValue('123456');


  // Login button validation
  const loginButton = page.getByRole('button', { name: 'Secure Login' });

  await expect(loginButton).toBeVisible();
  await expect(loginButton).toBeEnabled();

  await loginButton.click();

  await page.waitForTimeout(4000);


  // FEES & FINANCE MODULE

  const feesLink = page.getByRole('link', { name: 'Fees & Finance' });

  await expect(feesLink).toBeVisible();
  await feesLink.click();

  await page.waitForTimeout(4000);


  // CREATE FEE RECORD

  const createFeeButton = page.getByRole('button', {
    name: 'Create Fee Record'
  });

  await expect(createFeeButton).toBeVisible();
  await expect(createFeeButton).toBeEnabled();

  await createFeeButton.click();

  await page.waitForTimeout(2000);


  // SELECT STUDENT

  const studentDropdown = page.getByLabel('Select Student');

  await expect(studentDropdown).toBeVisible();

  await studentDropdown.selectOption(
    'e3e803e5-c9c1-4a75-b037-2edd9755aaa6'
  );

  // VALIDATION
  await expect(studentDropdown).toHaveValue(
    'e3e803e5-c9c1-4a75-b037-2edd9755aaa6'
  );


  // FEE TYPE

  const feeTypeDropdown = page.getByLabel('Fee Type');

  await expect(feeTypeDropdown).toBeVisible();

  await feeTypeDropdown.selectOption('Hostel Fee');

  // VALIDATION
  await expect(feeTypeDropdown).toHaveValue('Hostel Fee');


  // AMOUNT

  const amountField = page.getByRole('spinbutton', {
    name: 'Amount (₹)'
  });

  await expect(amountField).toBeVisible();

  await amountField.fill('3000');

  // VALIDATION
  await expect(amountField).toHaveValue('3000');


  // STATUS

  const statusDropdown = page.getByLabel('Status');

  await expect(statusDropdown).toBeVisible();

  await statusDropdown.selectOption('paid');

  // VALIDATION
  await expect(statusDropdown).toHaveValue('paid');


  // PAYMENT METHOD

  const paymentMethodDropdown = page.getByLabel('Payment Method');

  await expect(paymentMethodDropdown).toBeVisible();

  await paymentMethodDropdown.selectOption('Cash');

  // VALIDATION
  await expect(paymentMethodDropdown).toHaveValue('Cash');


  // CREATE RECORD BUTTON

  const createRecordButton = page.getByRole('button', {
    name: 'Create Record'
  });

  await createRecordButton.scrollIntoViewIfNeeded();

  // ASSERTION
  await expect(createRecordButton).toBeVisible();
  await expect(createRecordButton).toBeEnabled();


  // SUBMIT

  await createRecordButton.click();


  // SUCCESS ASSERTION

  // Wait for the operation to complete
  await page.waitForTimeout(3000);

  // Check that the page does not show a failure message
  await expect(
    page.getByText(/failed to record fee/i)
  ).not.toBeVisible({ timeout: 3000 });

});