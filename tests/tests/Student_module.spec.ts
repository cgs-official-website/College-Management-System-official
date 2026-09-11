import { test, expect } from '@playwright/test';

test('Student - Add Student with Valid Data', async ({ page }) => {

  test.setTimeout(60000);

  // LOGIN

  await page.goto('https://cms.teamzuna.in/login');

  const email = page.getByRole('textbox', { name: 'Email' });
  const password = page.getByRole('textbox', { name: '••••••••' });
  const loginButton = page.getByRole('button', { name: 'Secure Login' });

  await email.fill('nithish@gmail.com');
  await password.fill('123456');

  // ASSERTION 1: Login button should be enabled
  await expect(loginButton).toBeEnabled();

  await loginButton.click();

  await page.waitForTimeout(4000);

  // ASSERTION 2: Students module should be visible after login
  const studentsLink = page.getByRole('link', { name: 'Students' });
  await expect(studentsLink).toBeVisible();

  
  // STUDENT MODULE

  await studentsLink.click();

  await page.waitForTimeout(4000);

  // ASSERTION 3: Add Student button should be visible
  const addStudentButton = page.getByRole('button', { name: 'Add Student' });
  await expect(addStudentButton).toBeVisible();

  await addStudentButton.click();

  await page.waitForTimeout(2000);

  // ASSERTION 4: First Name field should be visible
  const firstName = page.getByRole('textbox', { name: 'First Name' });
  await expect(firstName).toBeVisible();

  // ENTER STUDENT DETAILS

  await firstName.fill('siva');

  const lastName = page.getByRole('textbox', { name: 'Last Name' });
  await lastName.fill('d');

  const studentEmail =
    page.getByRole('textbox', { name: 'Email Address *' });

  const testStudentEmail = `siva_${Date.now()}@gmail.com`;
  await studentEmail.fill(testStudentEmail);

  const phone = page.getByRole('textbox', { name: 'Phone Number' });
  await phone.fill('6543789213');

  await page.getByLabel('Gender').selectOption('male');

  await page.getByLabel('Class / Course')
    .selectOption('321e9ec5-7ab6-46b0-937c-bf6387d0c6ef');

  await page.locator('select[name="sectionId"]')
    .selectOption('5cb31604-7124-48ae-819b-96959765a9dd');

  const parentName =
    page.getByRole('textbox', { name: 'Parent/Guardian Name' });

  await parentName.fill('arun');

  const parentPhone =
    page.getByRole('textbox', { name: 'Parent Phone' });

  await parentPhone.fill('6543567865');

  await page.getByLabel('Residence Type')
    .selectOption('Hosteller');

  // VALIDATION

  // ASSERTION 5: Verify entered values

  await expect(firstName).toHaveValue('siva');

  await expect(lastName).toHaveValue('d');

  await expect(studentEmail).toHaveValue(testStudentEmail);

  await expect(phone).toHaveValue('6543789213');

  await expect(parentName).toHaveValue('arun');

  await expect(parentPhone).toHaveValue('6543567865');

  // ASSERTION 6: Email should be valid
  const emailIsValid = await studentEmail.evaluate(
    (element) => (element as HTMLInputElement).validity.valid
  );

  expect(emailIsValid).toBe(true);

  // ASSERTION 7: Add Student button should be enabled

  const submitButton = page
    .locator('form')
    .getByRole('button', { name: 'Add Student' });

  await submitButton.scrollIntoViewIfNeeded();

  await expect(submitButton).toBeEnabled();

  
   // SUBMIT

  await submitButton.click();

  await page.waitForTimeout(5000);

  // SUCCESS ASSERTION

  // Change this text if your application shows a different success message.

  await expect(
    page.getByText('Student added Successfully!')
  ).toBeVisible();

});