import { test, expect } from '@playwright/test';

test('Roles & Permissions - Create Role and Save Matrix', async ({ page }) => {
  test.setTimeout(60000);

  // LOGIN

  await page.goto('https://cms.teamzuna.in/login');

  const email = page.getByRole('textbox', { name: 'Email' });
  const password = page.getByRole('textbox', { name: '••••••••' });
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

  // Login button validation
  await expect(loginButton).toBeVisible();
  await expect(loginButton).toBeEnabled();

  await loginButton.click();

  await page.waitForTimeout(4000);


  // ROLES & PERMISSIONS

  const rolesPermissionsLink = page.getByRole('link', {
    name: 'Roles & Permissions'
  });

  await expect(rolesPermissionsLink).toBeVisible();
  await expect(rolesPermissionsLink).toBeEnabled();

  await rolesPermissionsLink.click();

  await page.waitForTimeout(4000);


  // CREATE ROLE

  const createRoleButton = page.getByRole('button', {
    name: 'Create Role'
  }).first();

  await expect(createRoleButton).toBeVisible();
  await expect(createRoleButton).toBeEnabled();

  await createRoleButton.click();

  await page.waitForTimeout(2000);


  // ROLE NAME

  const roleName = page.getByRole('textbox', {
    name: 'Role Name'
  });

  await expect(roleName).toBeVisible();
  await expect(roleName).toBeEnabled();

  const uniqueRoleName = `Role_${Date.now()}`;
  await roleName.fill(uniqueRoleName);

  // Validate entered role name
  await expect(roleName).toHaveValue(uniqueRoleName);


  // SUBMIT CREATE ROLE

  const submitCreateRoleButton = page
    .locator('form')
    .getByRole('button', {
      name: 'Create Role'
    });

  await submitCreateRoleButton.scrollIntoViewIfNeeded();

  await expect(submitCreateRoleButton).toBeVisible();
  await expect(submitCreateRoleButton).toBeEnabled();

  await submitCreateRoleButton.click();

  await page.waitForTimeout(4000);


  // PERMISSION MATRIX VALIDATION

  // Validate Permission Matrix is displayed
  


  // SELECT PERMISSIONS

  const permissionCheckboxes = page.locator(
    'input[type="checkbox"]'
  );

  // Validate that permission checkboxes exist
  await expect(permissionCheckboxes.first()).toBeVisible();

  // Select permissions
  await permissionCheckboxes.nth(0).check();
  await expect(permissionCheckboxes.nth(0)).toBeChecked();

  await page.waitForTimeout(500);


  await permissionCheckboxes.nth(5).check();
  await expect(permissionCheckboxes.nth(5)).toBeChecked();

  await page.waitForTimeout(500);


  // ADDITIONAL PERMISSION MATRIX ACTIONS

  await page.getByRole('cell').nth(2).click();

  await page.locator('label').nth(2).click();

  await page.locator('label').nth(3).click();

  await page
    .locator('tr:nth-child(3) > td:nth-child(2)')
    .click();

  await page.waitForTimeout(500);


  await page
    .locator('tr:nth-child(3) > td:nth-child(4) > .inline-flex')
    .click();

  await page.waitForTimeout(500);


  await page
    .locator('tr:nth-child(4) > td:nth-child(5)')
    .click();

  await page.waitForTimeout(500);


  await page
    .locator('tr:nth-child(6) > td:nth-child(4) > .inline-flex')
    .click();

  await page.waitForTimeout(500);


  await page
    .locator('tr:nth-child(5) > td:nth-child(4) > .inline-flex')
    .click();

  await page.waitForTimeout(500);


  await page
    .locator('tr:nth-child(7) > td:nth-child(3) > .inline-flex')
    .click();

  await page.waitForTimeout(500);


  const matrixCheckbox = page.locator(
    'tr:nth-child(7) > td:nth-child(4) > .inline-flex > .w-4'
  );

  await matrixCheckbox.check();

  // Validate checkbox is selected
  await expect(matrixCheckbox).toBeChecked();

  await page.waitForTimeout(500);


  await page
    .locator('tr:nth-child(8) > td:nth-child(3) > .inline-flex')
    .click();

  await page.waitForTimeout(500);


  await page
    .locator('tr:nth-child(9) > td:nth-child(4)')
    .click();

  await page.waitForTimeout(1000);


  // SAVE MATRIX

  const saveMatrixButton = page.getByRole('button', {
    name: 'Save Matrix'
  });

  await saveMatrixButton.scrollIntoViewIfNeeded();

  // Save button validation
  await expect(saveMatrixButton).toBeVisible();
  await expect(saveMatrixButton).toBeEnabled();

  // Click Save Matrix
  await saveMatrixButton.click();

  await page.waitForTimeout(4000);


  // SAVE VALIDATION

  // Check for common failure messages
  await expect(
    page.getByText(
      /failed to save|failed to create|error occurred|something went wrong/i
    )
  ).toHaveCount(0);


  // ROLE VALIDATION

  // Validate created role is displayed
  await expect(
    page.getByText(uniqueRoleName, {
      exact: true
    }).first()
  ).toBeVisible();
});