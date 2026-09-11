import { test, expect } from '@playwright/test';

test('Payroll - Create Payslip', async ({ page }) => {
  test.setTimeout(60000);

  // LOGIN
  
  await page.goto('https://cms.teamzuna.in/login');

  const email = page.getByRole('textbox', { name: 'Email' });
  const password = page.getByRole('textbox', { name: '••••••' });
  const loginButton = page.getByRole('button', {
    name: 'Secure Login'
  });

  // Email validation
  await expect(email).toBeVisible();
  await expect(email).toBeEnabled();

  await email.fill('nithish@gmail.com');

  await expect(email).toHaveValue('nithish@gmail.com');

  // Password validation
  await expect(password).toBeVisible();
  await expect(password).toBeEnabled();

  await password.fill('123456');

  await expect(password).toHaveValue('123456');

  // Login validation
  await expect(loginButton).toBeVisible();
  await expect(loginButton).toBeEnabled();

  await loginButton.click();

  await page.waitForTimeout(4000);


  // PAYROLL MODULE

  const payrollLink = page.getByRole('link', {
    name: 'Payroll'
  });

  await expect(payrollLink).toBeVisible();
  await expect(payrollLink).toBeEnabled();

  await payrollLink.click();

  await page.waitForTimeout(4000);


  // CREATE PAYSLIP

  const createPayslipButton = page.getByRole('button', {
    name: 'Create Payslip'
  }).first();

  await expect(createPayslipButton).toBeVisible();
  await expect(createPayslipButton).toBeEnabled();

  await createPayslipButton.click();

  await page.waitForTimeout(2000);


  // STAFF MEMBER

  const staffMember = page.getByLabel('Staff Member');

  // Validate dropdown
  await expect(staffMember).toBeVisible();
  await expect(staffMember).toBeEnabled();

  // Wait for staff options to load
  await expect(
    staffMember.locator('option')
  ).not.toHaveCount(1);

  // Select first available staff member
  await staffMember.selectOption({
    index: 1
  });

  // Validate that a staff member is selected
  await expect(staffMember).not.toHaveValue('');


  // BASIC PAY

  const basicPay = page.getByRole('spinbutton', {
    name: 'Basic Pay'
  });

  await expect(basicPay).toBeVisible();
  await expect(basicPay).toBeEnabled();

  await basicPay.fill('40000');

  await expect(basicPay).toHaveValue('40000');


  // HRA

  const hra = page.getByRole('spinbutton', {
    name: 'HRA'
  });

  await expect(hra).toBeVisible();
  await expect(hra).toBeEnabled();

  await hra.fill('3000');

  await expect(hra).toHaveValue('3000');


  // ========================================
  // DA
  // ========================================

  const da = page.getByRole('spinbutton', {
    name: 'DA'
  });

  await expect(da).toBeVisible();
  await expect(da).toBeEnabled();

  await da.fill('4000');

  await expect(da).toHaveValue('4000');


  // SPECIAL ALLOWANCE

  const specialAllowance = page.getByRole('spinbutton', {
    name: 'Special Allowance'
  });

  await expect(specialAllowance).toBeVisible();
  await expect(specialAllowance).toBeEnabled();

  await specialAllowance.fill('5000');

  await expect(specialAllowance).toHaveValue('5000');


  
  // CREATE PAYSLIP
  
  const savePayslipButton = page
    .locator('form')
    .getByRole('button', {
      name: 'Create Payslip'
    });

  await savePayslipButton.scrollIntoViewIfNeeded();

  await expect(savePayslipButton).toBeVisible();
  await expect(savePayslipButton).toBeEnabled();

  await savePayslipButton.click();

  await page.waitForTimeout(3000);


  // VALIDATION AFTER CREATION

  // Make sure failure messages are not displayed
  await expect(
    page.getByText(
      /Failed to create payslip|Failed to generate payslip|Failed to create|Failed to generate/i
    )
  ).toHaveCount(0);


  // Validate Payroll/Payslip page is still visible
  await expect(
    page.getByText(/Payroll|Payslip/i).first()
  ).toBeVisible();
});