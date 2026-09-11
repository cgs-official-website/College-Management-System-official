import { test, expect } from '@playwright/test';

test('Security Module - Update Password', async ({ page }) => {
  test.setTimeout(60000);

  
  // LOGIN

  await page.goto('https://cms.teamzuna.in/login');

  const email = page.getByRole('textbox', {
    name: 'Email'
  });

  const loginPassword = page.getByRole('textbox', {
    name: '••••••'
  });

  const loginButton = page.getByRole('button', {
    name: 'Secure Login'
  });

  // Email validation
  await expect(email).toBeVisible();
  await expect(email).toBeEnabled();

  await email.fill('nithish@gmail.com');

  await expect(email).toHaveValue('nithish@gmail.com');


  // Password validation
  await expect(loginPassword).toBeVisible();
  await expect(loginPassword).toBeEnabled();

  await loginPassword.fill('123456');

  await expect(loginPassword).toHaveValue('123456');


  // Login button validation
  await expect(loginButton).toBeVisible();
  await expect(loginButton).toBeEnabled();

  await loginButton.click();

  await page.waitForTimeout(4000);


  // ========================================
  // ADMIN
  // ========================================

  await page.goto('https://cms.teamzuna.in/admin');

  await page.waitForTimeout(4000);


  // ========================================
  // ENVIRONMENT SETUP
  // ========================================

  const environmentSetupLink = page.getByRole('link', {
    name: 'Environment Setup'
  });

  await expect(environmentSetupLink).toBeVisible();
  await expect(environmentSetupLink).toBeEnabled();

  await environmentSetupLink.click();

  await page.waitForTimeout(4000);


  // ========================================
  // SECURITY
  // ========================================

  const securityButton = page.getByRole('button', {
    name: 'Security'
  });

  await expect(securityButton).toBeVisible();
  await expect(securityButton).toBeEnabled();

  await securityButton.click();

  await page.waitForTimeout(2000);


  // ========================================
  // CURRENT PASSWORD
  // ========================================

  const currentPassword = page.getByRole('textbox', {
    name: 'Current Password'
  });

  await expect(currentPassword).toBeVisible();
  await expect(currentPassword).toBeEnabled();

  await currentPassword.fill('123456');

  // Validate entered current password
  await expect(currentPassword).toHaveValue('123456');


  // ========================================
  // NEW PASSWORD
  // ========================================

  const newPassword = page.getByRole('textbox', {
    name: 'New Password',
    exact: true
  });

  await expect(newPassword).toBeVisible();
  await expect(newPassword).toBeEnabled();

  await newPassword.fill('12345678');

  // Validate new password
  await expect(newPassword).toHaveValue('12345678');


  // ========================================
  // CONFIRM NEW PASSWORD
  // ========================================

  const confirmPassword = page.getByRole('textbox', {
    name: 'Confirm New Password'
  });

  await expect(confirmPassword).toBeVisible();
  await expect(confirmPassword).toBeEnabled();

  await confirmPassword.fill('12345678');

  // Validate confirm password
  await expect(confirmPassword).toHaveValue('12345678');

  // ========================================
  // PASSWORD MATCH VALIDATION
  // ========================================

  const newPasswordValue =
    await newPassword.inputValue();

  const confirmPasswordValue =
    await confirmPassword.inputValue();

  expect(newPasswordValue).toBe(confirmPasswordValue);


  // ========================================
  // UPDATE PASSWORD BUTTON
  // ========================================

  const updatePasswordButton = page.getByRole('button', {
    name: 'Update Password'
  });

  await updatePasswordButton.scrollIntoViewIfNeeded();

  // Button validation
  await expect(updatePasswordButton).toBeVisible();
  await expect(updatePasswordButton).toBeEnabled();


  // ========================================
  // UPDATE PASSWORD
  // ========================================

  await updatePasswordButton.click();

  await page.waitForTimeout(4000);


  // ========================================
  // SUCCESS / ERROR VALIDATION
  // ========================================

  // Check for common password update failure messages
  await expect(
    page.getByText(
      /failed to update password|failed to change password|something went wrong|error occurred/i
    )
  ).toHaveCount(0);


  // Check for success message
  const successMessage = page.getByText(
    /password updated|password changed|updated successfully|changed successfully/i
  ).first();

  await expect(successMessage).toBeVisible();


  // ========================================
  // AUTOMATED TEARDOWN / RESTORE PASSWORD
  // ========================================
  // Revert password back to 123456 so test suite remains repeatable and consistent

  await page.waitForTimeout(2000);

  await currentPassword.fill('12345678');
  await newPassword.fill('123456');
  await confirmPassword.fill('123456');

  await updatePasswordButton.click();

  await page.waitForTimeout(3000);

  // Check for success message on reversion
  await expect(
    page.getByText(
      /password updated|password changed|updated successfully|changed successfully/i
    ).first()
  ).toBeVisible();


  // ========================================
  // SECURITY FORM VALIDATION
  // ========================================

  // Verify Security section is still visible
  await expect(
    page.getByRole('button', {
      name: 'Security'
    })
  ).toBeVisible();
});