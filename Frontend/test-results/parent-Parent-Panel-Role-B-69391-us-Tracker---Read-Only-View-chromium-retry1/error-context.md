# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: parent.spec.js >> Parent Panel Role-Based Verification >> TC-042: Child Bus Tracker - Read-Only View
- Location: tests\parent.spec.js:75:3

# Error details

```
Error: Authentication failed for Parent with error: "Invalid email or password.". Please configure valid credentials in tests/testData.js.
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
              - textbox "admin@college.edu" [ref=e26]: parent@testcollege.edu
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: Password
              - link "Forgot password?" [ref=e30] [cursor=pointer]:
                - /url: "#"
            - generic [ref=e31]:
              - generic:
                - img
              - textbox "••••••••" [ref=e32]: ParentPassword123!
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
  4   | test.describe('Parent Panel Role-Based Verification', () => {
  5   | 
  6   |   test.beforeEach(async ({ page }) => {
  7   |     // Navigate to login
  8   |     await page.goto('/login');
  9   |     
  10  |     // Fill credentials
  11  |     await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.parent.email);
  12  |     await page.getByPlaceholder('••••••••').fill(testData.credentials.parent.password);
  13  |     await page.getByRole('button', { name: 'Secure Login' }).click();
  14  |     
  15  |     // Check if error message appears on the login page immediately
  16  |     const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
  17  |     await Promise.race([
  18  |       page.waitForURL(/.*parent/, { timeout: 10000 }).catch(() => {}),
  19  |       errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  20  |     ]);
  21  |     
  22  |     if (await errorAlert.isVisible()) {
  23  |       const errorText = await errorAlert.innerText();
> 24  |       throw new Error(`Authentication failed for Parent with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
      |             ^ Error: Authentication failed for Parent with error: "Invalid email or password.". Please configure valid credentials in tests/testData.js.
  25  |     }
  26  |     
  27  |     // Wait for redirect to parent dashboard
  28  |     await expect(page).toHaveURL(/.*parent/, { timeout: 5000 });
  29  |   });
  30  | 
  31  |   // TC-039: Child Overview Dashboard
  32  |   test('TC-039: Child Overview Dashboard Verification', async ({ page }) => {
  33  |     // Verify dashboard landing state
  34  |     const blockScreen = page.getByRole('heading', { name: 'No Child Linked' });
  35  |     const isUnlinked = await blockScreen.isVisible();
  36  |     
  37  |     if (isUnlinked) {
  38  |       await expect(blockScreen).toBeVisible();
  39  |       await expect(page.getByText(/Please contact the college administration/i)).toBeVisible();
  40  |     } else {
  41  |       // Child profile card details
  42  |       await expect(page.getByText('Attendance').first()).toBeVisible();
  43  |       await expect(page.getByText('CGPA').first()).toBeVisible();
  44  |       await expect(page.getByText('Roll Number').first()).toBeVisible();
  45  |     }
  46  |   });
  47  | 
  48  |   // TC-040: Child Attendance Tracking
  49  |   test('TC-040: Child Attendance Tracking - Read-Only View', async ({ page }) => {
  50  |     await page.goto('/parent/attendance');
  51  |     await expect(page.getByRole('heading', { name: 'Attendance Record' }).or(page.getByText('Attendance'))).toBeVisible();
  52  |     
  53  |     // Ensure no attendance modification buttons exist
  54  |     await expect(page.getByRole('button', { name: 'Submit Attendance' })).not.toBeVisible();
  55  |     await expect(page.getByRole('button', { name: 'Save' })).not.toBeVisible();
  56  |     
  57  |     const calendarMonth = page.locator('.rbc-month-view').or(page.locator('.lucide-calendar')).or(page.locator('table'));
  58  |     await expect(calendarMonth).toBeVisible();
  59  |   });
  60  | 
  61  |   // TC-041: Child Hostel Profile
  62  |   test('TC-041: Child Hostel Profile - Read-Only View', async ({ page }) => {
  63  |     await page.goto('/parent/hostel');
  64  |     await expect(page.getByRole('heading', { name: 'Hostel Details' }).or(page.getByText('Hostel Room'))).toBeVisible();
  65  |     
  66  |     // Verify Child's assigned Hostel Block, Room Number, and Warden Phone Number
  67  |     await expect(page.getByText('Block').or(page.getByText('Room'))).toBeVisible();
  68  |     await expect(page.getByText('Warden Phone').or(page.getByText('Contact'))).toBeVisible();
  69  |     
  70  |     // Ensure no room allocation controls are present
  71  |     await expect(page.getByRole('button', { name: 'Allocate Room' })).not.toBeVisible();
  72  |   });
  73  | 
  74  |   // TC-042: Child Bus Tracker
  75  |   test('TC-042: Child Bus Tracker - Read-Only View', async ({ page }) => {
  76  |     await page.goto('/parent/transport');
  77  |     await expect(page.getByRole('heading', { name: 'Bus Details' }).or(page.getByText('Transport'))).toBeVisible();
  78  |     
  79  |     // Verify route details, pickup stop name, driver name, and driver phone
  80  |     await expect(page.getByText('Driver Name').or(page.getByText('Route'))).toBeVisible();
  81  |     await expect(page.getByText('Driver Phone').or(page.getByText('Contact'))).toBeVisible();
  82  |     
  83  |     // Ensure no vehicle onboarding button is present
  84  |     await expect(page.getByRole('button', { name: 'Add Vehicle' })).not.toBeVisible();
  85  |   });
  86  | 
  87  |   // TC-043: Parent Concerns & Complaints
  88  |   test('TC-043: Parent Concerns & Complaints - File Concern', async ({ page }) => {
  89  |     await page.goto('/parent/complaints');
  90  |     await expect(page.getByRole('heading', { name: 'Parent Concerns' }).or(page.getByText('My Complaints'))).toBeVisible();
  91  |     
  92  |     // Click File Concern
  93  |     await page.getByRole('button', { name: 'File Concern' }).or(page.getByRole('button', { name: 'File Complaint' })).click();
  94  |     
  95  |     // Write concern description and submit
  96  |     await page.getByLabel('Concern Details').or(page.locator('textarea')).fill(testData.parentData.concerns.description);
  97  |     await page.getByRole('button', { name: 'Submit' }).or(page.getByRole('button', { name: 'Submit Concern' })).click();
  98  |     
  99  |     // Verify concern shows up in "My Complaints" list
  100 |     await expect(page.getByText(testData.parentData.concerns.description).first()).toBeVisible();
  101 |   });
  102 | 
  103 |   test.afterEach(async ({ page }) => {
  104 |     if (!page.url().includes('/login')) {
  105 |       const logoutBtn = page.locator('aside').getByText('LogOut')
  106 |         .or(page.locator('aside').locator('.lucide-log-out'))
  107 |         .or(page.getByText('Sign Out'));
  108 |       if (await logoutBtn.isVisible()) {
  109 |         await logoutBtn.click({ force: true });
  110 |         await expect(page).toHaveURL(/.*login/);
  111 |       }
  112 |     }
  113 |   });
  114 | });
  115 | 
```