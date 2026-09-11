import { test, expect } from '@playwright/test';

test('Notice Board - Create and Publish Notice', async ({ page }) => {

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



  // NOTICE BOARD

  const noticeBoardLink = page.getByRole('link', {
    name: 'Notice Board'
  });

  await expect(noticeBoardLink).toBeVisible();
  await noticeBoardLink.click();

  // Validate Notice Board page
  await expect(page).toHaveURL(/notice/i);

  // CREATE NOTICE

  const createNoticeButton = page.getByRole('button', {
    name: 'Create Notice'
  });

  await expect(createNoticeButton).toBeVisible();
  await expect(createNoticeButton).toBeEnabled();

  await createNoticeButton.click();

  // Validate Create Notice form
  const noticeTitle = page.getByRole('textbox', {
    name: 'Notice Title'
  });

  const announcement = page.getByRole('textbox', {
    name: 'Write the full announcement'
  });

  await expect(noticeTitle).toBeVisible();
  await expect(noticeTitle).toBeEnabled();

  await expect(announcement).toBeVisible();
  await expect(announcement).toBeEnabled();

  
  // ENTER NOTICE DETAILS

  const uniqueNoticeTitle = `Notice_${Date.now()}`;
  await noticeTitle.fill(uniqueNoticeTitle);

  // Validate Notice Title
  await expect(noticeTitle).toHaveValue(uniqueNoticeTitle);

  await announcement.fill('all subject');

  // Validate Announcement
  await expect(announcement).toHaveValue('all subject');

  // PRIORITY LEVEL

  const priority = page.getByLabel('Priority Level');

  await expect(priority).toBeVisible();
  await expect(priority).toBeEnabled();

  await priority.selectOption('low');

  // Validate selected priority
  await expect(priority).toHaveValue('low');

  // TARGET AUDIENCE

  const targetAudience = page.getByLabel('Target Audience');

  await expect(targetAudience).toBeVisible();
  await expect(targetAudience).toBeEnabled();

  await targetAudience.selectOption('students');

  // Validate selected audience
  await expect(targetAudience).toHaveValue('students');

  // PUBLISH NOTICE

  const publishNoticeButton = page.getByRole('button', {
    name: 'Publish Notice'
  });

  await publishNoticeButton.scrollIntoViewIfNeeded();

  await expect(publishNoticeButton).toBeVisible();
  await expect(publishNoticeButton).toBeEnabled();

  await publishNoticeButton.click();

  // SUCCESS VALIDATION

  // Wait for save operation
  await page.waitForTimeout(3000);

  // Check for success message
  const successMessage = page.getByText(
    /success|published|created/i
  ).first();

  await expect(successMessage).toBeVisible();

  // NOTICE LIST VALIDATION

  // Validate created notice is displayed
  await expect(page.getByText(uniqueNoticeTitle).first()).toBeVisible();
});
