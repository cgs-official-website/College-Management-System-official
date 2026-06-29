# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: security.spec.js >> Multi-Tenant Security & Guard Checks >> TC-045: Role Escalate Bypass Attempt - RBAC Redirection
- Location: tests\security.spec.js:27:3

# Error details

```
Error: Authentication failed for Student with error: "Invalid email or password.". Please configure valid credentials in tests/testData.js.
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
              - textbox "admin@college.edu" [ref=e26]: student@testcollege.edu
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: Password
              - link "Forgot password?" [ref=e30] [cursor=pointer]:
                - /url: "#"
            - generic [ref=e31]:
              - generic:
                - img
              - textbox "••••••••" [ref=e32]: StudentPassword123!
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
  1  | import { test, expect } from '@playwright/test';
  2  | import { testData } from './testData';
  3  | 
  4  | test.describe('Multi-Tenant Security & Guard Checks', () => {
  5  | 
  6  |   // TC-044: Direct Path Intrusion Attempt
  7  |   test('TC-044: Direct Path Intrusion Attempt - Unauthorized Redirect', async ({ page }) => {
  8  |     // Ensure logged out
  9  |     await page.goto('/login');
  10 |     await page.evaluate(() => {
  11 |       localStorage.clear();
  12 |       sessionStorage.clear();
  13 |     });
  14 | 
  15 |     // Try navigating directly to protected Admin subpaths
  16 |     await page.goto('/admin/fees');
  17 |     await expect(page).toHaveURL(/.*login/);
  18 |     
  19 |     await page.goto('/admin/hr');
  20 |     await expect(page).toHaveURL(/.*login/);
  21 | 
  22 |     await page.goto('/super/colleges');
  23 |     await expect(page).toHaveURL(/.*login/);
  24 |   });
  25 | 
  26 |   // TC-045: Role Escalate Bypass Attempt
  27 |   test('TC-045: Role Escalate Bypass Attempt - RBAC Redirection', async ({ page }) => {
  28 |     // Log in with Student Credentials
  29 |     await page.goto('/login');
  30 |     await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.student.email);
  31 |     await page.getByPlaceholder('••••••••').fill(testData.credentials.student.password);
  32 |     await page.getByRole('button', { name: 'Secure Login' }).click();
  33 |     
  34 |     // Check if error message appears on the login page immediately
  35 |     const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
  36 |     await Promise.race([
  37 |       page.waitForURL(/.*student/, { timeout: 10000 }).catch(() => {}),
  38 |       errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  39 |     ]);
  40 |     
  41 |     if (await errorAlert.isVisible()) {
  42 |       const errorText = await errorAlert.innerText();
> 43 |       throw new Error(`Authentication failed for Student with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
     |             ^ Error: Authentication failed for Student with error: "Invalid email or password.". Please configure valid credentials in tests/testData.js.
  44 |     }
  45 |     
  46 |     // Wait for student dashboard redirect
  47 |     await expect(page).toHaveURL(/.*student/, { timeout: 5000 });
  48 |     
  49 |     // Attempt to access Admin dashboard manually
  50 |     await page.goto('/admin');
  51 |     await expect(page).toHaveURL(/.*(student|login|dashboard)/, { timeout: 10000 });
  52 |     
  53 |     // Attempt to access Super Admin panel manually
  54 |     await page.goto('/super');
  55 |     await expect(page).toHaveURL(/.*(student|login|dashboard)/, { timeout: 10000 });
  56 |   });
  57 | 
  58 |   // TC-046: Multi-Tenant Isolation Attempt
  59 |   test('TC-046: Multi-Tenant Isolation Attempt', async ({ page }) => {
  60 |     // Log in with College Admin Credentials (belonging to College B)
  61 |     await page.goto('/login');
  62 |     await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.admin.email);
  63 |     await page.getByPlaceholder('••••••••').fill(testData.credentials.admin.password);
  64 |     await page.getByRole('button', { name: 'Secure Login' }).click();
  65 |     
  66 |     // Check if error message appears on the login page immediately
  67 |     const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
  68 |     await Promise.race([
  69 |       page.waitForURL(/.*admin/, { timeout: 10000 }).catch(() => {}),
  70 |       errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  71 |     ]);
  72 |     
  73 |     if (await errorAlert.isVisible()) {
  74 |       const errorText = await errorAlert.innerText();
  75 |       throw new Error(`Authentication failed for Admin with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
  76 |     }
  77 |     
  78 |     await expect(page).toHaveURL(/.*admin/, { timeout: 5000 });
  79 |     
  80 |     // Attempt to access detail page for a record ID belonging to College A
  81 |     await page.goto(`/admin/students/${testData.securityData.foreignCollegeStudentId}`);
  82 |     
  83 |     // Expected Result: UI redirects or displays not found/permission denied state
  84 |     const studentNotFound = page.getByText(/Student not found/i).or(page.getByText(/No student found/i)).or(page.getByText(/Permission Denied/i));
  85 |     const isRedirected = page.url() !== `/admin/students/${testData.securityData.foreignCollegeStudentId}`;
  86 |     
  87 |     if (!isRedirected) {
  88 |       await expect(studentNotFound.first()).toBeVisible({ timeout: 10000 });
  89 |     } else {
  90 |       expect(page.url()).not.toContain(testData.securityData.foreignCollegeStudentId);
  91 |     }
  92 |   });
  93 | });
  94 | 
```