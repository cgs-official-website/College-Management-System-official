import { test, expect } from '@playwright/test';

test('Timetable - Schedule Class with Valid Data', async ({ page }) => {

  // Total timeout: 60 seconds
  test.setTimeout(60000);

  // LOGIN

  await page.goto('https://cms.teamzuna.in/login');

  await page.getByRole('textbox', { name: 'Email' }).fill('nithish@gmail.com');

  await page.getByRole('textbox', { name: '••••••' }).fill('123456');

  // ASSERTION - Login button should be enabled
  const loginButton = page.getByRole('button', { name: 'Secure Login' });

  await expect(loginButton).toBeVisible();
  await expect(loginButton).toBeEnabled();

  await loginButton.click();

  await page.waitForTimeout(4000);


  // TIMETABLE MODULE

  await page.getByRole('link', { name: 'Timetable' }).click();

  await page.waitForTimeout(4000);

  // ASSERTION - Timetable page should be displayed
  await expect(
    page.getByRole('button', { name: 'Schedule Class' }).first()
  ).toBeVisible();


  // SCHEDULE CLASS

  await page.getByRole('button', { name: 'Schedule Class' }).first().click();

  await page.waitForTimeout(2000);


  // SUBJECT NAME

  const subjectName = page.getByRole('textbox', { name: 'Subject Name' });

  await expect(subjectName).toBeVisible();

  await subjectName.fill('tamil');

  // VALIDATION - Check entered value
  await expect(subjectName).toHaveValue('tamil');


  // COURSE / PROGRAM

  const courseProgram = page.getByLabel('Course / Program');

  await expect(courseProgram).toBeVisible();

  await courseProgram.selectOption(
    '13a7b62f-e730-412f-bf12-93a0900684ae'
  );

  // VALIDATION - Check option was selected
  await expect(courseProgram).toHaveValue(
    '13a7b62f-e730-412f-bf12-93a0900684ae'
  );


  // ASSIGN TEACHER

  const assignTeacher = page.getByLabel('Assign Teacher');

  await expect(assignTeacher).toBeVisible();

  await assignTeacher.selectOption({ index: 3 });

  // VALIDATION - Check teacher was selected
  await expect(assignTeacher).not.toHaveValue('');


  
  // ROOM / LAB
  

  const roomLab = page.getByRole('textbox', { name: 'Room / Lab' });

  await expect(roomLab).toBeVisible();

  const testRoom = `Lab_${Math.floor(100 + Math.random() * 800)}`;
  await roomLab.fill(testRoom);

  // VALIDATION - Check entered value
  await expect(roomLab).toHaveValue(testRoom);

  // Select Wednesday and open afternoon timeslot to avoid schedule collisions
  const dayOfWeek = page.getByLabel('Day of Week');
  await dayOfWeek.selectOption('Wednesday');

  await page.getByLabel('Start Time').fill('11:00');
  await page.getByLabel('End Time').fill('12:00');


 
  // SCHEDULE BUTTON
 
  const scheduleButton = page
    .locator('form')
    .getByRole('button', { name: 'Schedule Class' });

  await scheduleButton.scrollIntoViewIfNeeded();

  // ASSERTION - Button should be visible
  await expect(scheduleButton).toBeVisible();

  // ASSERTION - Button should be enabled
  await expect(scheduleButton).toBeEnabled();


  
  // SUBMIT
  
  await scheduleButton.click();

  // SUCCESS ASSERTION

  // Check that success message is displayed
  await expect(
    page.getByText(/scheduled successfully|class session scheduled successfully/i)
  ).toBeVisible({
    timeout: 10000
  });
});