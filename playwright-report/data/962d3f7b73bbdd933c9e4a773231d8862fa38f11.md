# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: superadmin.spec.js >> Superadmin Panel Verification >> TC-001: Superadmin Login & Dashboard Overview
- Location: tests\superadmin.spec.js:33:3

# Error details

```
Error: Authentication failed for Superadmin with error: "Invalid email or password.". Please configure valid credentials in tests/testData.js.
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
          - generic [ref=e21]: Invalid email or password.
        - generic [ref=e22]:
          - generic [ref=e23]:
            - generic [ref=e24]: Email Address
            - generic [ref=e25]:
              - generic:
                - img
              - textbox "admin@college.edu" [ref=e26]: superadmin@zuna.hq
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: Password
              - link "Forgot password?" [ref=e30] [cursor=pointer]:
                - /url: "#"
            - generic [ref=e31]:
              - generic:
                - img
              - textbox "••••••••" [ref=e32]: SuperPassword123!
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
  4   | test.describe('Superadmin Panel Verification', () => {
  5   |   
  6   |   test.beforeEach(async ({ page }) => {
  7   |     // Navigate to login page
  8   |     await page.goto('/login');
  9   |     
  10  |     // Fill credentials from testData
  11  |     await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.superadmin.email);
  12  |     await page.getByPlaceholder('••••••••').fill(testData.credentials.superadmin.password);
  13  |     
  14  |     // Click login button
  15  |     await page.getByRole('button', { name: 'Secure Login' }).click();
  16  |     
  17  |     // Check if error message appears on the login page immediately
  18  |     const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
  19  |     await Promise.race([
  20  |       page.waitForURL(/.*super/, { timeout: 10000 }).catch(() => {}),
  21  |       errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  22  |     ]);
  23  |     
  24  |     if (await errorAlert.isVisible()) {
  25  |       const errorText = await errorAlert.innerText();
> 26  |       throw new Error(`Authentication failed for Superadmin with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
      |             ^ Error: Authentication failed for Superadmin with error: "Invalid email or password.". Please configure valid credentials in tests/testData.js.
  27  |     }
  28  |     
  29  |     // Verify successful login redirection
  30  |     await expect(page).toHaveURL(/.*super/, { timeout: 5000 });
  31  |   });
  32  | 
  33  |   test('TC-001: Superadmin Login & Dashboard Overview', async ({ page }) => {
  34  |     // Verify landing page title
  35  |     await expect(page.getByRole('heading', { name: 'Global Overview' })).toBeVisible();
  36  |     
  37  |     // Verify stats cards are present and visible
  38  |     await expect(page.getByText('Total Colleges')).toBeVisible();
  39  |     await expect(page.getByText('Active Students')).toBeVisible();
  40  |     await expect(page.getByText('Total Revenue')).toBeVisible();
  41  |     await expect(page.getByText('System Health')).toBeVisible();
  42  |   });
  43  | 
  44  |   test('TC-002: Global Modules Dashboard Verification', async ({ page }) => {
  45  |     // Navigate to Global Modules dashboard via sidebar
  46  |     await page.getByRole('link', { name: 'Modules' }).click();
  47  |     await expect(page).toHaveURL(/.*super\/modules/);
  48  |     
  49  |     // Verify landing header
  50  |     await expect(page.getByRole('heading', { name: 'Global Modules' })).toBeVisible();
  51  |     
  52  |     // Verify empty state fallback or module catalog configuration
  53  |     const emptyStateHeader = page.getByRole('heading', { name: 'No Modules Configured' });
  54  |     const isMockEmpty = await emptyStateHeader.isVisible();
  55  |     
  56  |     if (isMockEmpty) {
  57  |       await expect(emptyStateHeader).toBeVisible();
  58  |       await expect(page.getByText('There are no global modules configured in the system yet.')).toBeVisible();
  59  |       // Stats cards should display 0
  60  |       await expect(page.locator('h3:has-text("0")').first()).toBeVisible();
  61  |     } else {
  62  |       // If modules are configured in the database, toggle the first available module
  63  |       const moduleRow = page.locator('tbody tr').first();
  64  |       await expect(moduleRow).toBeVisible();
  65  |       
  66  |       const toggleButton = moduleRow.locator('button');
  67  |       
  68  |       // Click the toggle button
  69  |       await toggleButton.click();
  70  |       
  71  |       // Verify the toast success message is shown
  72  |       await expect(page.locator('div[role="status"]')).toContainText(/is now (Enabled|Disabled) globally/);
  73  |     }
  74  |   });
  75  | 
  76  |   test('TC-003: College Onboarding & Approval', async ({ page }) => {
  77  |     // Navigate to Colleges directory
  78  |     await page.getByRole('link', { name: 'Colleges' }).click();
  79  |     await expect(page).toHaveURL(/.*super\/colleges/);
  80  |     
  81  |     // Verify Colleges list header
  82  |     await expect(page.getByRole('heading', { name: 'Colleges Directory' })).toBeVisible();
  83  |     
  84  |     // Search or locate pending college
  85  |     const searchInput = page.getByPlaceholder(/Search by college name/);
  86  |     await searchInput.fill(testData.superadminData.pendingCollegeName);
  87  |     
  88  |     // Select the row matching pending status
  89  |     const collegeRow = page.locator('tbody tr').filter({ hasText: testData.superadminData.pendingCollegeName });
  90  |     
  91  |     // Check if the college is actually in the table
  92  |     if (await collegeRow.count() > 0) {
  93  |       const statusBadge = collegeRow.locator('td').nth(2);
  94  |       await expect(statusBadge).toContainText('Pending');
  95  |       
  96  |       // Click the Approve button
  97  |       const approveBtn = collegeRow.getByRole('button', { name: 'Approve' });
  98  |       await approveBtn.click();
  99  |       
  100 |       // Verify status transitions to Active
  101 |       await expect(statusBadge).toContainText('Active', { timeout: 10000 });
  102 |     } else {
  103 |       console.log(`Pending college "${testData.superadminData.pendingCollegeName}" was not found in the live colleges list.`);
  104 |     }
  105 |   });
  106 | 
  107 |   test.afterEach(async ({ page }) => {
  108 |     if (!page.url().includes('/login')) {
  109 |       const logoutBtn = page.locator('aside').getByText('LogOut')
  110 |         .or(page.locator('aside').locator('.lucide-log-out'))
  111 |         .or(page.getByText('Sign Out'));
  112 |       if (await logoutBtn.isVisible()) {
  113 |         await logoutBtn.click({ force: true });
  114 |         await expect(page).toHaveURL(/.*login/);
  115 |       }
  116 |     }
  117 |   });
  118 | });
  119 | 
```