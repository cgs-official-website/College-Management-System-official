# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student.spec.js >> Student Panel Role-Based Verification >> TC-030: Placements Portal - Apply Drive
- Location: tests\student.spec.js:162:3

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
  1   | import { test, expect } from '@playwright/test';
  2   | import { testData } from './testData';
  3   | 
  4   | test.describe('Student Panel Role-Based Verification', () => {
  5   | 
  6   |   test.beforeEach(async ({ page }) => {
  7   |     // Navigate to login
  8   |     await page.goto('/login');
  9   |     
  10  |     // Fill credentials
  11  |     await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.student.email);
  12  |     await page.getByPlaceholder('••••••••').fill(testData.credentials.student.password);
  13  |     await page.getByRole('button', { name: 'Secure Login' }).click();
  14  |     
  15  |     // Check if error message appears on the login page immediately
  16  |     const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
  17  |     await Promise.race([
  18  |       page.waitForURL(/.*student/, { timeout: 10000 }).catch(() => {}),
  19  |       errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  20  |     ]);
  21  |     
  22  |     if (await errorAlert.isVisible()) {
  23  |       const errorText = await errorAlert.innerText();
> 24  |       throw new Error(`Authentication failed for Student with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
      |             ^ Error: Authentication failed for Student with error: "Invalid email or password.". Please configure valid credentials in tests/testData.js.
  25  |     }
  26  |     
  27  |     // Wait for redirect to student dashboard
  28  |     await expect(page).toHaveURL(/.*student/, { timeout: 5000 });
  29  |   });
  30  | 
  31  |   // TC-024: Enrolled Courses
  32  |   test('TC-024: Enrolled Courses - Read-Only Verification', async ({ page }) => {
  33  |     await page.goto('/student/courses');
  34  |     await expect(page.getByRole('heading', { name: 'My Courses' }).or(page.getByText('Enrolled Courses'))).toBeVisible();
  35  |     
  36  |     // Verify course syllabus progress percentage is read-only
  37  |     await expect(page.getByText('%')).first().toBeVisible();
  38  |     
  39  |     // Verification: Ensure no administrative controls exist
  40  |     await expect(page.getByRole('button', { name: 'Add Course' })).not.toBeVisible();
  41  |     await expect(page.getByRole('button', { name: 'Add Class' })).not.toBeVisible();
  42  |   });
  43  | 
  44  |   // TC-025: Assignments Portal
  45  |   test('TC-025: Assignments Portal - Submit Work', async ({ page }) => {
  46  |     await page.goto('/student/assignments');
  47  |     await expect(page.getByRole('heading', { name: 'Assignments' }).or(page.getByText('Assignments'))).toBeVisible();
  48  |     
  49  |     // Click Submit Work on a pending assignment row
  50  |     const submitBtn = page.getByRole('button', { name: 'Submit Work' }).or(page.locator('tbody tr button').first());
  51  |     
  52  |     if (await submitBtn.isVisible()) {
  53  |       await submitBtn.click();
  54  |       
  55  |       // Upload a test document file
  56  |       const fileInput = page.locator('input[type="file"]');
  57  |       await fileInput.setInputFiles(testData.studentData.assignments.filePath);
  58  |       
  59  |       // Click submit
  60  |       await page.getByRole('button', { name: 'Submit Assignment' }).or(page.getByRole('button', { name: 'Submit' })).click();
  61  |       
  62  |       // Verification: Verify status transitions to "Submitted"
  63  |       await expect(page.locator('tbody tr').first()).toContainText('Submitted');
  64  |     } else {
  65  |       console.log('No pending assignments found to submit.');
  66  |     }
  67  |   });
  68  | 
  69  |   // TC-026: Attendance Analytics
  70  |   test('TC-026: Attendance Analytics - Leave Request Application', async ({ page }) => {
  71  |     await page.goto('/student/attendance');
  72  |     
  73  |     // Verify attendance meter is visible
  74  |     await expect(page.getByText('Attendance Rate').or(page.locator('.lucide-calendar'))).toBeVisible();
  75  |     
  76  |     // Click Apply for Leave
  77  |     await page.getByRole('button', { name: 'Apply for Leave' }).click();
  78  |     
  79  |     // Fill date pickers & reason
  80  |     const fromDate = page.locator('input[type="date"]').first();
  81  |     const toDate = page.locator('input[type="date"]').nth(1);
  82  |     
  83  |     const tomorrow = new Date();
  84  |     tomorrow.setDate(tomorrow.getDate() + 1);
  85  |     const dateStr = tomorrow.toISOString().split('T')[0];
  86  |     
  87  |     await fromDate.fill(dateStr);
  88  |     await toDate.fill(dateStr);
  89  |     await page.getByLabel('Reason').or(page.locator('textarea')).fill(testData.studentData.leave.reason);
  90  |     
  91  |     // Submit
  92  |     await page.getByRole('button', { name: 'Submit Request' }).or(page.getByRole('button', { name: 'Submit' })).click();
  93  |     
  94  |     // Verification: Check leave request status log shows "Pending"
  95  |     const requestLog = page.locator('tbody tr').filter({ hasText: testData.studentData.leave.reason });
  96  |     await expect(requestLog).toContainText('Pending');
  97  |   });
  98  | 
  99  |   // TC-027: Read-Only LMS & Videos
  100 |   test('TC-027: Read-Only LMS & Videos - Access & Verification', async ({ page }) => {
  101 |     await page.goto('/student/lms');
  102 |     await expect(page.getByRole('heading', { name: 'LMS Portal' }).or(page.getByText('Live Classes'))).toBeVisible();
  103 |     
  104 |     // If a class is live, check for the Join Class CTA
  105 |     const joinClassBtn = page.getByRole('link', { name: 'Join Class' }).or(page.getByRole('button', { name: 'Join' }));
  106 |     if (await joinClassBtn.isVisible()) {
  107 |       await expect(joinClassBtn).toBeVisible();
  108 |     }
  109 |     
  110 |     // Verification: Ensure there are NO teacher upload/delete controls
  111 |     await expect(page.getByRole('button', { name: 'Schedule Class' })).not.toBeVisible();
  112 |     await expect(page.getByRole('button', { name: 'Upload Study Material' })).not.toBeVisible();
  113 |     await expect(page.getByRole('button', { name: 'Delete Record' })).not.toBeVisible();
  114 |   });
  115 | 
  116 |   // TC-028: Hostel Room View
  117 |   test('TC-028: Hostel Room View - Raise Maintenance Request', async ({ page }) => {
  118 |     await page.goto('/student/hostel');
  119 |     
  120 |     // Verify room details card is visible
  121 |     await expect(page.getByText('Hostel Room').or(page.getByText('Warden Phone'))).toBeVisible();
  122 |     
  123 |     // Click Raise Maintenance Request
  124 |     await page.getByRole('button', { name: 'Raise Maintenance Request' }).or(page.getByRole('button', { name: 'Report Issue' })).click();
```