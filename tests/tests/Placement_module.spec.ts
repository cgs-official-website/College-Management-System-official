import { test, expect } from '@playwright/test';

test('Placements - Add Placement Drive', async ({ page }) => {
  test.setTimeout(60000);

  // LOGIN

  await page.goto('https://cms.teamzuna.in/login');

  const email = page.getByRole('textbox', { name: 'Email' });
  const password = page.getByRole('textbox', { name: '••••••' });
  const loginButton = page.getByRole('button', { name: 'Secure Login' });

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


  // PLACEMENTS MODULE

  const placementsLink = page.getByRole('link', {
    name: 'Placements'
  });

  await expect(placementsLink).toBeVisible();
  await expect(placementsLink).toBeEnabled();

  await placementsLink.click();

  await page.waitForTimeout(4000);

  // Validate Placements page
  await expect(page.getByText('Placement Cell')).toBeVisible();


  // ADD PLACEMENT DRIVE

  const addPlacementButton = page.getByRole('button', {
    name: 'Add Placement Drive'
  });

  await expect(addPlacementButton).toBeVisible();
  await expect(addPlacementButton).toBeEnabled();

  await addPlacementButton.click();

  await page.waitForTimeout(2000);


  // COMPANY NAME

  const companyName = page.getByRole('textbox', {
    name: 'Company Name'
  });

  await expect(companyName).toBeVisible();
  await expect(companyName).toBeEnabled();

  await companyName.fill('TCS');

  await expect(companyName).toHaveValue('TCS');


  // DESIGNATION / ROLE

  const designation = page.getByRole('textbox', {
    name: 'Designation / Role'
  });

  await expect(designation).toBeVisible();
  await expect(designation).toBeEnabled();

  await designation.fill('Data science');

  await expect(designation).toHaveValue('Data science');


  // SALARY PACKAGE

  const salary = page.getByRole('textbox', {
    name: 'Salary Package (CTC)'
  });

  await expect(salary).toBeVisible();
  await expect(salary).toBeEnabled();

  await salary.fill('15');

  await expect(salary).toHaveValue('15');


  // DRIVE DATE

  const driveDate = page.getByRole('textbox', {
    name: 'Drive Date'
  });

  await expect(driveDate).toBeVisible();
  await expect(driveDate).toBeEnabled();

  await driveDate.fill('2026-09-05');

  await expect(driveDate).toHaveValue('2026-09-05');


  // STUDENTS PLACED

  const studentsPlaced = page.getByRole('spinbutton', {
    name: 'Students Placed (if completed)'
  });

  await expect(studentsPlaced).toBeVisible();
  await expect(studentsPlaced).toBeEnabled();

  await studentsPlaced.fill('20');

  await expect(studentsPlaced).toHaveValue('20');


  // ELIGIBILITY CRITERIA

  const eligibility = page.getByRole('textbox', {
    name: 'Eligibility Criteria'
  });

  await expect(eligibility).toBeVisible();
  await expect(eligibility).toBeEnabled();

  await eligibility.fill('UG student');

  await expect(eligibility).toHaveValue('UG student');


  // SAVE PLACEMENT DRIVE

  const savePlacementButton = page.getByRole('button', {
    name: 'Save Placement Drive'
  });

  await savePlacementButton.scrollIntoViewIfNeeded();

  // Save button validation
  await expect(savePlacementButton).toBeVisible();
  await expect(savePlacementButton).toBeEnabled();

  await savePlacementButton.click();


  // SUCCESS MESSAGE VALIDATION

  const successMessage = page.getByText(
    'Placement drive added successfully!',
    { exact: true }
  );

  await expect(successMessage).toBeVisible();


  // SAVED DATA VALIDATION

  // Validate company
  await expect(page.getByText('TCS', { exact: true }).first())
    .toBeVisible();

  // Validate role
  await expect(page.getByText('Data science', { exact: true }).first())
    .toBeVisible();

  // Validate package
  await expect(page.getByText('15 LPA', { exact: true }).first())
    .toBeVisible();

  // Validate drive date
  await expect(page.getByText('Sep 5, 2026', { exact: true }).first())
    .toBeVisible();

  // Validate eligibility
  await expect(page.getByText('UG student', { exact: true }).first())
    .toBeVisible();
});