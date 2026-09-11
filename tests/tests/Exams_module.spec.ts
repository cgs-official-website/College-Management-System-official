import { test, expect } from '@playwright/test';

test('Exams - Schedule Exam and Exam Performance', async ({ page }) => {
  test.setTimeout(60000);

  // LOGIN

  await page.goto('https://cms.teamzuna.in/login');

  await expect(
    page.getByRole('textbox', { name: 'Email' })
  ).toBeVisible();

  await page.getByRole('textbox', { name: 'Email' })
    .fill('nithish@gmail.com');

  await page.getByRole('textbox', { name: '••••••••' })
    .fill('123456');

  await expect(
    page.getByRole('button', { name: 'Secure Login' })
  ).toBeEnabled();

  await page.getByRole('button', { name: 'Secure Login' }).click();

  // Validate successful login/navigation
  await page.waitForURL('**/admin**', { timeout: 10000 });

  // EXAMS MODULE

  await page.getByRole('link', { name: 'Exams' }).click();

  await expect(
    page.getByRole('button', { name: 'Schedule Exam' }).first()
  ).toBeVisible();

  // SCHEDULE FIRST EXAM

  await page.getByRole('button', { name: 'Schedule Exam' }).first().click();

  const examTitle1 = page.getByRole('textbox', {
    name: 'Exam Title'
  });

  const courseDepartment1 = page.getByLabel(
    'Course / Department'
  );

  const subject1 = page.getByRole('textbox', {
    name: 'Subject',
    exact: true
  });

  const roomHall1 = page.getByRole('textbox', {
    name: 'Room / Hall'
  });

  // Validate fields are visible
  await expect(examTitle1).toBeVisible();
  await expect(courseDepartment1).toBeVisible();
  await expect(subject1).toBeVisible();
  await expect(roomHall1).toBeVisible();

  // Enter Exam Title
  await examTitle1.fill('sem8');

  // Validate entered value
  await expect(examTitle1).toHaveValue('sem8');

  // Select Course / Department
  await courseDepartment1.selectOption(
    '10475972-14cb-4520-bed3-743af631fb9a'
  );

  // Validate course was selected
  await expect(courseDepartment1).toHaveValue(
    '10475972-14cb-4520-bed3-743af631fb9a'
  );

  // Enter Subject
  await subject1.fill('data science');

  // Validate Subject
  await expect(subject1).toHaveValue('data science');

  // Enter Room / Hall
  await roomHall1.fill('12');

  // Validate Room / Hall
  await expect(roomHall1).toHaveValue('12');

  // FIRST EXAM SUBMIT

  const scheduleExamButton1 = page
    .locator('form')
    .getByRole('button', {
      name: 'Schedule Exam'
    });

  await scheduleExamButton1.scrollIntoViewIfNeeded();

  await expect(scheduleExamButton1).toBeVisible();
  await expect(scheduleExamButton1).toBeEnabled();

  await scheduleExamButton1.click();

  // SUCCESS MESSAGE VALIDATION

  const successMessage1 = page.getByText(
    'Exam scheduled successfully!',
    { exact: true }
  );

  await expect(successMessage1).toBeVisible({
    timeout: 10000
  });

  console.log('First exam scheduled successfully');


  // EXAM PERFORMANCE

  await page.getByRole('button', {
    name: 'Exam Performance'
  }).click();

  await expect(
    page.getByRole('button', {
      name: 'Schedule Exam'
    })
  ).toBeVisible();

  // SCHEDULE SECOND EXAM

  await page.getByRole('button', {
    name: 'Schedule Exam'
  }).click();

  const examTitle2 = page.getByRole('textbox', {
    name: 'Exam Title'
  });

  const courseDepartment2 = page.getByLabel(
    'Course / Department'
  );

  const subject2 = page.getByRole('textbox', {
    name: 'Subject',
    exact: true
  });

  const roomHall2 = page.getByRole('textbox', {
    name: 'Room / Hall'
  });

  // Validate fields
  await expect(examTitle2).toBeVisible();
  await expect(courseDepartment2).toBeVisible();
  await expect(subject2).toBeVisible();
  await expect(roomHall2).toBeVisible();

  // Exam Title
  await examTitle2.fill('sem4');

  await expect(examTitle2).toHaveValue('sem4');

  // Course / Department
  await courseDepartment2.selectOption(
    '10475972-14cb-4520-bed3-743af631fb9a'
  );

  await expect(courseDepartment2).toHaveValue(
    '10475972-14cb-4520-bed3-743af631fb9a'
  );

  // Subject
  await subject2.fill('data tech');

  await expect(subject2).toHaveValue('data tech');

  // Room / Hall
  await roomHall2.fill('43');

  await expect(roomHall2).toHaveValue('43');

  // SECOND EXAM SUBMIT

  const scheduleExamButton2 = page
    .locator('form')
    .getByRole('button', {
      name: 'Schedule Exam'
    });

  await scheduleExamButton2.scrollIntoViewIfNeeded();

  await expect(scheduleExamButton2).toBeVisible();
  await expect(scheduleExamButton2).toBeEnabled();

  await scheduleExamButton2.click();

  // SECOND SUCCESS MESSAGE VALIDATION
  
  const successMessage2 = page.getByText(
    'Exam scheduled successfully!',
    { exact: true }
  );

  await expect(successMessage2).toBeVisible({
    timeout: 10000
  });

  console.log('Second exam scheduled successfully');

  // FINAL PAGE VALIDATION

  await expect(
    page.getByRole('heading', {
      name: 'Examination Center'
    })
  ).toBeVisible();

});