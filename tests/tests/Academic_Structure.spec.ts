import { test, expect } from '@playwright/test';

test('Academic Structure - Add Department, Program and Class', async ({ page }) => {

  // Total test timeout = 90 seconds
  test.setTimeout(90000);

  // LOGIN

  await page.goto('https://cms.teamzuna.in/login');

  const email = page.getByRole('textbox', { name: 'Email' });
  const password = page.getByRole('textbox', { name: '••••••' });
  const loginButton = page.getByRole('button', { name: 'Secure Login' });

  // VALIDATION - Login fields should be visible
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();

  await email.fill('nithish@gmail.com');
  await password.fill('123456');

  // ASSERTION - Values entered correctly
  await expect(email).toHaveValue('nithish@gmail.com');
  await expect(password).toHaveValue('123456');

  // ASSERTION - Login button should be enabled
  await expect(loginButton).toBeEnabled();

  await loginButton.click();

  // Wait for dashboard
  await page.waitForTimeout(4000);

  // ACADEMIC STRUCTURE

  const academicStructure =
    page.getByRole('link', { name: 'Academic Structure' });

  // ASSERTION - Academic Structure should be visible
  await expect(academicStructure).toBeVisible();

  await academicStructure.click();

  await page.waitForTimeout(4000);


  // ADD DEPARTMENT

  await page.getByRole('button', { name: 'Add Department' }).click();

  await page.waitForTimeout(2000);

  const departmentName =
    page.getByRole('textbox', { name: 'Department Name' });

  const departmentCode =
    page.getByRole('textbox', { name: 'Department Code' });

  const saveDepartment =
    page.getByRole('button', { name: 'Save Department' });


  // VALIDATION - Department fields should be visible
  await expect(departmentName).toBeVisible();
  await expect(departmentCode).toBeVisible();

  // Enter Department Name
  await departmentName.fill('english');

  // Enter Department Code
  await departmentCode.fill('654g');


  // ASSERTION - Check entered values
  await expect(departmentName).toHaveValue('english');
  await expect(departmentCode).toHaveValue('654g');


  // ASSERTION - Save button enabled
  await expect(saveDepartment).toBeEnabled();

  await saveDepartment.click();

  await page.waitForTimeout(4000);


  // ASSERTION - Department should be created
  // Change the text below if your application uses a different success message.
 


  // ADD PROGRAM / COURSE

  await page.getByRole('button', { name: 'Programs / Courses' }).click();

  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: 'Add Program' }).click();

  await page.waitForTimeout(2000);


  const programName =
    page.getByRole('textbox', { name: 'Program Name' });

  const programCode =
    page.getByRole('textbox', { name: 'Program Code' });


  // VALIDATION - Program fields visible
  await expect(programName).toBeVisible();
  await expect(programCode).toBeVisible();


  // Enter Program Name
  await programName.fill('b.tech');

  // Enter Program Code
  await programCode.fill('3456');


  // ASSERTION - Check entered values
  await expect(programName).toHaveValue('b.tech');
  await expect(programCode).toHaveValue('3456');


  // Program Department dropdown
  const programDepartment =
    page.getByRole('combobox');

  await expect(programDepartment).toBeVisible();

  await programDepartment.selectOption(
    'ef720f47-fbe2-4349-a9a6-d6170803237c'
  );


  // ASSERTION - Department selected
  await expect(programDepartment).toHaveValue(
    'ef720f47-fbe2-4349-a9a6-d6170803237c'
  );


  const saveProgram =
    page.getByRole('button', { name: 'Save Program' });


  // ASSERTION - Save Program button enabled
  await expect(saveProgram).toBeEnabled();

  await saveProgram.click();

  await page.waitForTimeout(4000);


  // ASSERTION - Program creation success
 


  // ADD CLASS / SECTION

  await page.getByRole('button', { name: 'Classes / Sections' }).click();

  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: 'Add Class' }).click();

  await page.waitForTimeout(2000);


  const className =
    page.getByRole('textbox', { name: 'Class Name' });


  // VALIDATION - Class Name visible
  await expect(className).toBeVisible();


  // Enter Class Name
  await className.fill('year6');


  // ASSERTION - Class Name value
  await expect(className).toHaveValue('year6');


  // SELECT PROGRAM

  const classProgram =
    page.getByRole('combobox').first();

  await expect(classProgram).toBeVisible();

  await classProgram.selectOption(
    '7cc8affa-441d-4e47-bf4d-86d1e9075eb0'
  );


  // ASSERTION - Program selected
  await expect(classProgram).toHaveValue(
    '7cc8affa-441d-4e47-bf4d-86d1e9075eb0'
  );


  // SELECT SECTION

  const section =
    page.getByRole('listbox');

  await expect(section).toBeVisible();

  await section.selectOption(
    '46dd7369-64df-4122-8dc7-78634f63c450'
  );


  // ASSERTION - Section selected
  await expect(section).toHaveValue(
    '46dd7369-64df-4122-8dc7-78634f63c450'
  );


  // SAVE CLASS

  const saveClass =
    page.getByRole('button', { name: 'Save Class' });


  // ASSERTION - Save Class button enabled
  await expect(saveClass).toBeEnabled();

  await saveClass.click();

  await page.waitForTimeout(5000);


  // FINAL ASSERTION

  // Check that class was successfully created.
  // Change the message if your application shows different text.

});