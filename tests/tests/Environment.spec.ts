import { test, expect } from '@playwright/test';

test('Environment Setup - Save Settings', async ({ page }) => {
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

  // Login button validation
  await expect(loginButton).toBeVisible();
  await expect(loginButton).toBeEnabled();

  await loginButton.click();

  await page.waitForTimeout(4000);


  // ENVIRONMENT SETUP

  await page.goto('https://cms.teamzuna.in/admin');

  await page.waitForTimeout(4000);

  const environmentSetupLink = page.getByRole('link', {
    name: 'Environment Setup'
  });

  await expect(environmentSetupLink).toBeVisible();
  await expect(environmentSetupLink).toBeEnabled();

  await environmentSetupLink.click();

  await page.waitForTimeout(4000);


  // COLLEGE NAME

  const collegeName = page.getByRole('textbox', {
    name: 'College Name'
  });

  await expect(collegeName).toBeVisible();
  await expect(collegeName).toBeEnabled();

  await collegeName.fill('PSG institutes.');

  await expect(collegeName).toHaveValue('PSG institutes.');


  // CONTACT EMAIL

  const contactEmail = page.getByRole('textbox', {
    name: 'Contact Email'
  });

  await expect(contactEmail).toBeVisible();
  await expect(contactEmail).toBeEnabled();

  await contactEmail.fill('psg@gmail.com');

  await expect(contactEmail).toHaveValue('psg@gmail.com');


  // CONTACT PHONE

  const contactPhone = page.getByRole('textbox', {
    name: 'Contact Phone'
  });

  await expect(contactPhone).toBeVisible();
  await expect(contactPhone).toBeEnabled();

  await contactPhone.fill('1234567890');

  await expect(contactPhone).toHaveValue('1234567890');


  // ADDRESS

  const address = page.getByRole('textbox', {
    name: 'Address'
  });

  await expect(address).toBeVisible();
  await expect(address).toBeEnabled();

  await address.fill('uyiughiurha');

  await expect(address).toHaveValue('uyiughiurha');


  // WEBSITE

  const website = page.getByRole('textbox', {
    name: 'Website'
  });

  await expect(website).toBeVisible();
  await expect(website).toBeEnabled();

  await website.fill('q1');

  await expect(website).toHaveValue('q1');


  // AFFILIATION CODE

  const affiliationCode = page.getByRole('textbox', {
    name: 'Affiliation Code'
  });

  await expect(affiliationCode).toBeVisible();
  await expect(affiliationCode).toBeEnabled();

  await affiliationCode.fill('ABC12345677');

  await expect(affiliationCode).toHaveValue('ABC12345677');


  // AICTE NUMBER

  const aicteNumber = page.getByRole('textbox', {
    name: 'AICTE Number'
  });

  await expect(aicteNumber).toBeVisible();
  await expect(aicteNumber).toBeEnabled();

  await aicteNumber.fill('79880980986');

  await expect(aicteNumber).toHaveValue('79880980986');


  // UGC CODE

  const ugcCode = page.getByRole('textbox', {
    name: 'UGC Code'
  });

  await expect(ugcCode).toBeVisible();
  await expect(ugcCode).toBeEnabled();

  await ugcCode.fill('567567576585');

  await expect(ugcCode).toHaveValue('567567576585');


  // SAVE ENVIRONMENT SETTINGS

  const saveEnvironmentSettingsButton = page
    .locator('form')
    .getByRole('button', {
      name: 'Save Environment Settings'
    });

  await saveEnvironmentSettingsButton.scrollIntoViewIfNeeded();

  // Save button validation
  await expect(saveEnvironmentSettingsButton).toBeVisible();
  await expect(saveEnvironmentSettingsButton).toBeEnabled();

  await saveEnvironmentSettingsButton.click();

  await page.waitForTimeout(4000);


  // SAVE VALIDATION

  // Verify that the entered values are still present
  // after saving.

  await expect(collegeName).toHaveValue('PSG institutes.');

  await expect(contactEmail).toHaveValue(
    'psg@gmail.com'
  );

  await expect(contactPhone).toHaveValue(
    '1234567890'
  );

  await expect(address).toHaveValue(
    'uyiughiurha'
  );

  await expect(website).toHaveValue(
    'q1'
  );

  await expect(affiliationCode).toHaveValue(
    'ABC12345677'
  );

  await expect(aicteNumber).toHaveValue(
    '79880980986'
  );

  await expect(ugcCode).toHaveValue(
    '567567576585'
  );


  // RELOAD VALIDATION

  // Reload page to verify values are actually
  // saved in the application/database.

  await page.reload();

  await page.waitForTimeout(4000);


  // Validate saved values after reload

  await expect(
    page.getByRole('textbox', {
      name: 'College Name'
    })
  ).toHaveValue('PSG institutes.');

  await expect(
    page.getByRole('textbox', {
      name: 'Contact Email'
    })
  ).toHaveValue('psg@gmail.com');

  await expect(
    page.getByRole('textbox', {
      name: 'Contact Phone'
    })
  ).toHaveValue('1234567890');

  await expect(
    page.getByRole('textbox', {
      name: 'Address'
    })
  ).toHaveValue('uyiughiurha');

  await expect(
    page.getByRole('textbox', {
      name: 'Website'
    })
  ).toHaveValue('q1');

  await expect(
    page.getByRole('textbox', {
      name: 'Affiliation Code'
    })
  ).toHaveValue('ABC12345677');

  await expect(
    page.getByRole('textbox', {
      name: 'AICTE Number'
    })
  ).toHaveValue('79880980986');

  await expect(
    page.getByRole('textbox', {
      name: 'UGC Code'
    })
  ).toHaveValue('567567576585');
});