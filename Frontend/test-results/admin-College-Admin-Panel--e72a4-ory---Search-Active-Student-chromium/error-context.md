# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.js >> College Admin Panel Verification >> TC-007: Student Directory - Search Active Student
- Location: tests\admin.spec.js:106:3

# Error details

```
Error: Authentication failed for Admin with error: "Too many failed attempts. Please try again later.". Please configure valid credentials in tests/testData.js.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - link "Back to Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - img [ref=e7]
      - generic [ref=e10]: Back to Home
    - generic [ref=e11]:
      - generic [ref=e12]:
        - img "Zuna" [ref=e14]
        - heading "Welcome Back" [level=1] [ref=e15]
        - paragraph [ref=e16]: Authenticate to access your Zuna Ecosystem.
      - generic [ref=e17]:
        - generic [ref=e18]:
          - img [ref=e19]
          - generic [ref=e21]: Too many failed attempts. Please try again later.
        - generic [ref=e22]:
          - generic [ref=e23]:
            - generic [ref=e24]: Email Address
            - generic [ref=e25]:
              - generic:
                - img
              - textbox "admin@college.edu" [ref=e26]: admin@testcollege.edu
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: Password
              - link "Forgot password?" [ref=e30] [cursor=pointer]:
                - /url: "#"
            - generic [ref=e31]:
              - generic:
                - img
              - textbox "••••••••" [ref=e32]: AdminPassword123!
              - button [ref=e33]:
                - img [ref=e34]
          - button "Authenticating..." [disabled] [ref=e37]:
            - generic [ref=e39]:
              - img [ref=e40]
              - text: Authenticating...
        - generic [ref=e42]:
          - text: Need an account?
          - link "Create your environment" [ref=e43] [cursor=pointer]:
            - /url: /register
  - generic [ref=e47]:
    - img [ref=e49]
    - heading "Enterprise-Grade Security" [level=2] [ref=e52]
    - paragraph [ref=e53]: Zuna utilizes role-based cryptographic isolation to ensure that student, teacher, and administrative data remains absolutely secure.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { testData } from './testData';
  3   | 
  4   | test.describe('College Admin Panel Verification', () => {
  5   | 
  6   |   test.beforeEach(async ({ page }) => {
  7   |     // Navigate to login
  8   |     await page.goto('/login');
  9   |     
  10  |     // Fill credentials
  11  |     await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.admin.email);
  12  |     await page.getByPlaceholder('••••••••').fill(testData.credentials.admin.password);
  13  |     await page.getByRole('button', { name: 'Secure Login' }).click();
  14  |     
  15  |     // Check if error message appears on the login page immediately
  16  |     const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
  17  |     await Promise.race([
  18  |       page.waitForURL(/.*admin/, { timeout: 10000 }).catch(() => {}),
  19  |       errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  20  |     ]);
  21  |     
  22  |     if (await errorAlert.isVisible()) {
  23  |       const errorText = await errorAlert.innerText();
> 24  |       throw new Error(`Authentication failed for Admin with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
      |             ^ Error: Authentication failed for Admin with error: "Too many failed attempts. Please try again later.". Please configure valid credentials in tests/testData.js.
  25  |     }
  26  |     
  27  |     // Wait for redirect to admin dashboard
  28  |     await expect(page).toHaveURL(/.*admin/, { timeout: 5000 });
  29  |   });
  30  | 
  31  |   // TC-004: Root Dashboard
  32  |   test('TC-004: Root Dashboard - Generate Invite Links', async ({ page, context }) => {
  33  |     // Ensure metrics are visible
  34  |     await expect(page.getByText('Total Students')).toBeVisible();
  35  |     await expect(page.getByText('Total Teachers')).toBeVisible();
  36  |     await expect(page.getByText('Active Courses')).toBeVisible();
  37  |     
  38  |     // Grant clipboard permissions so Playwright can read/write clipboard
  39  |     await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  40  |     
  41  |     // Click Generate Invite Links button
  42  |     const generateBtn = page.getByRole('button', { name: 'Generate Invite Links' });
  43  |     await generateBtn.click();
  44  |     
  45  |     // Click Student Link option to copy it
  46  |     await page.getByText('Student Link').click();
  47  |     
  48  |     // Verify toast success
  49  |     await expect(page.locator('div[role="status"]')).toContainText(/Copied student link to clipboard!/i);
  50  |     
  51  |     // Click Generate Invite Links again to copy Teacher Link
  52  |     await generateBtn.click();
  53  |     await page.getByText('Teacher Link').click();
  54  |     await expect(page.locator('div[role="status"]')).toContainText(/Copied teacher link to clipboard!/i);
  55  |   });
  56  | 
  57  |   // TC-005: Admission Management
  58  |   test('TC-005: Admission Management - Add Inquiry', async ({ page }) => {
  59  |     await page.goto('/admin/admission');
  60  |     await expect(page.getByRole('heading', { name: 'Admissions Dashboard' })).toBeVisible();
  61  |     
  62  |     // Click Add Inquiry button
  63  |     await page.getByRole('button', { name: 'Add Inquiry' }).click();
  64  |     
  65  |     // Fill candidate details
  66  |     await page.getByLabel('First Name').fill(testData.adminData.admission.firstName);
  67  |     await page.getByLabel('Last Name').fill(testData.adminData.admission.lastName);
  68  |     await page.getByLabel('Email Address').fill(testData.adminData.admission.email);
  69  |     await page.getByLabel('Phone Number').fill(testData.adminData.admission.phone);
  70  |     await page.getByLabel('Previous School / Institution').fill(testData.adminData.admission.previousSchool);
  71  |     
  72  |     // Select the first available course dynamically
  73  |     const courseSelect = page.getByLabel('Applied Course / Program');
  74  |     await courseSelect.selectOption({ index: 1 });
  75  |     
  76  |     // Submit form
  77  |     await page.getByRole('button', { name: 'Add Inquiry' }).click();
  78  |     
  79  |     // Assert inquiry added to the table
  80  |     const fullName = `${testData.adminData.admission.firstName} ${testData.adminData.admission.lastName}`;
  81  |     await expect(page.getByText(fullName).first()).toBeVisible();
  82  |   });
  83  | 
  84  |   // TC-006: Marketing & Leads
  85  |   test('TC-006: Marketing & Leads - Create Campaign', async ({ page }) => {
  86  |     await page.goto('/admin/marketing');
  87  |     await expect(page.getByRole('heading', { name: 'Marketing & Leads' })).toBeVisible();
  88  |     
  89  |     // Click Create Campaign
  90  |     await page.getByRole('button', { name: 'Create Campaign' }).click();
  91  |     
  92  |     // Fill campaign details
  93  |     await page.getByPlaceholder('e.g. Summer Admissions Push').fill(testData.adminData.marketing.campaignName);
  94  |     await page.getByLabel('Channel').selectOption(testData.adminData.marketing.channel);
  95  |     await page.getByLabel('Target Audience').selectOption('All Leads');
  96  |     await page.getByPlaceholder('Type your campaign message here...').fill('Mock Marketing Campaign Message Body.');
  97  |     
  98  |     // Submit/Launch
  99  |     await page.getByRole('button', { name: 'Launch Campaign' }).click();
  100 |     
  101 |     // Verify success toast
  102 |     await expect(page.locator('div[role="status"]')).toContainText(/Campaign created successfully!/i);
  103 |   });
  104 | 
  105 |   // TC-007: Student Directory
  106 |   test('TC-007: Student Directory - Search Active Student', async ({ page }) => {
  107 |     await page.goto('/admin/students');
  108 |     await expect(page.getByRole('heading', { name: 'Students Directory' }).or(page.getByText('Student Directory'))).toBeVisible();
  109 |     
  110 |     // Search for newly admitted student
  111 |     const fullName = `${testData.adminData.admission.firstName} ${testData.adminData.admission.lastName}`;
  112 |     const searchInput = page.getByPlaceholder(/Search students/i).or(page.locator('input[type="text"]').first());
  113 |     await searchInput.fill(fullName);
  114 |     
  115 |     // Expect student profile to be displayed with status Active
  116 |     const studentRow = page.locator('tbody tr').filter({ hasText: testData.adminData.admission.firstName });
  117 |     if (await studentRow.count() > 0) {
  118 |       await expect(studentRow).toContainText('Active');
  119 |     } else {
  120 |       console.log(`Student "${fullName}" was not found or is not active yet in the database.`);
  121 |     }
  122 |   });
  123 | 
  124 |   // TC-008: HR & Staff
```