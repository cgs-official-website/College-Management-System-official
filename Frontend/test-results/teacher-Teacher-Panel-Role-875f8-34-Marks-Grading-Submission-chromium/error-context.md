# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teacher.spec.js >> Teacher Panel Role-Based Verification >> TC-034: Marks & Grading Submission
- Location: tests\teacher.spec.js:67:3

# Error details

```
Error: Authentication failed for Teacher with error: "Invalid email or password.". Please configure valid credentials in tests/testData.js.
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
              - textbox "admin@college.edu" [ref=e26]: teacher@testcollege.edu
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: Password
              - link "Forgot password?" [ref=e30] [cursor=pointer]:
                - /url: "#"
            - generic [ref=e31]:
              - generic:
                - img
              - textbox "••••••••" [ref=e32]: TeacherPassword123!
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
  4   | test.describe('Teacher Panel Role-Based Verification', () => {
  5   | 
  6   |   test.beforeEach(async ({ page }) => {
  7   |     // Navigate to login
  8   |     await page.goto('/login');
  9   |     
  10  |     // Fill credentials
  11  |     await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.teacher.email);
  12  |     await page.getByPlaceholder('••••••••').fill(testData.credentials.teacher.password);
  13  |     await page.getByRole('button', { name: 'Secure Login' }).click();
  14  |     
  15  |     // Check if error message appears on the login page immediately
  16  |     const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
  17  |     await Promise.race([
  18  |       page.waitForURL(/.*teacher/, { timeout: 10000 }).catch(() => {}),
  19  |       errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  20  |     ]);
  21  |     
  22  |     if (await errorAlert.isVisible()) {
  23  |       const errorText = await errorAlert.innerText();
> 24  |       throw new Error(`Authentication failed for Teacher with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
      |             ^ Error: Authentication failed for Teacher with error: "Invalid email or password.". Please configure valid credentials in tests/testData.js.
  25  |     }
  26  |     
  27  |     // Wait for redirect to teacher dashboard
  28  |     await expect(page).toHaveURL(/.*teacher/, { timeout: 5000 });
  29  |   });
  30  | 
  31  |   // TC-032: LMS Material Upload
  32  |   test('TC-032: LMS Material Upload', async ({ page }) => {
  33  |     await page.goto('/teacher/lms');
  34  |     await expect(page.getByRole('heading', { name: 'LMS Portal' }).or(page.getByText('Study Material'))).toBeVisible();
  35  |     
  36  |     // Click Upload Study Material
  37  |     await page.getByRole('button', { name: 'Upload Study Material' }).or(page.getByRole('button', { name: 'Upload Material' })).click();
  38  |     
  39  |     // Select batch and fill name
  40  |     const batchSelect = page.getByLabel('Batch').or(page.getByLabel('Class'));
  41  |     await batchSelect.selectOption({ index: 1 });
  42  |     
  43  |     await page.getByLabel('Material Name').or(page.getByLabel('Title')).fill(testData.teacherData.lms.materialName);
  44  |     
  45  |     // Upload file
  46  |     const fileInput = page.locator('input[type="file"]');
  47  |     await fileInput.setInputFiles(testData.teacherData.lms.filePath);
  48  |     
  49  |     // Submit
  50  |     await page.getByRole('button', { name: 'Upload' }).or(page.getByRole('button', { name: 'Submit' })).click();
  51  |     
  52  |     // Verify uploaded document populates the batch files repository
  53  |     await expect(page.getByText(testData.teacherData.lms.materialName).first()).toBeVisible();
  54  |   });
  55  | 
  56  |   // TC-033: Timetable & Schedule
  57  |   test('TC-033: Timetable & Schedule Display', async ({ page }) => {
  58  |     await page.goto('/teacher/schedule');
  59  |     await expect(page.getByRole('heading', { name: 'My Schedule' }).or(page.getByText('Timetable'))).toBeVisible();
  60  |     
  61  |     // Verify calendar blocks populate
  62  |     const calendarEvent = page.locator('.rbc-event').first().or(page.locator('.bg-white:has-text("Room")').first()).or(page.locator('tbody tr').first());
  63  |     await expect(calendarEvent).toBeVisible();
  64  |   });
  65  | 
  66  |   // TC-034: Marks & Grading
  67  |   test('TC-034: Marks & Grading Submission', async ({ page }) => {
  68  |     await page.goto('/teacher/grades');
  69  |     await expect(page.getByRole('heading', { name: 'Marks & Grading' }).or(page.getByText('Grade Book'))).toBeVisible();
  70  |     
  71  |     // Select class/assignment dynamically if list is visible
  72  |     const classSelect = page.locator('select').first();
  73  |     if (await classSelect.isVisible()) {
  74  |       await classSelect.selectOption({ index: 1 });
  75  |     }
  76  |     
  77  |     // Input grade score for the first student row
  78  |     const gradeInput = page.locator('input[type="text"][placeholder*="Grade"]').first().or(page.locator('input[type="number"]').first()).or(page.locator('tbody tr input').first());
  79  |     if (await gradeInput.isVisible()) {
  80  |       await gradeInput.fill(testData.teacherData.grades.score);
  81  |       
  82  |       // Click Submit Grades
  83  |       await page.getByRole('button', { name: 'Submit Grades' }).or(page.getByRole('button', { name: 'Save Grades' })).click();
  84  |       
  85  |       // Verify success toast
  86  |       await expect(page.locator('div[role="status"]')).toContainText(/(Grates|Grades|Scores) (submitted|saved) successfully/i);
  87  |     } else {
  88  |       console.log('No grading input fields found.');
  89  |     }
  90  |   });
  91  | 
  92  |   // TC-035: Timesheet Clocking
  93  |   test('TC-035: Timesheet Clocking - Clock In / Clock Out', async ({ page }) => {
  94  |     await page.goto('/teacher/timesheet');
  95  |     await expect(page.getByRole('heading', { name: 'Work Timesheet' }).or(page.getByText('Timesheet'))).toBeVisible();
  96  |     
  97  |     // Click Clock In
  98  |     const clockInBtn = page.getByRole('button', { name: 'Clock In' });
  99  |     await expect(clockInBtn).toBeVisible();
  100 |     await clockInBtn.click();
  101 |     
  102 |     // Timer must start (Clock In changes to Clock Out)
  103 |     const clockOutBtn = page.getByRole('button', { name: 'Clock Out' });
  104 |     await expect(clockOutBtn).toBeVisible();
  105 |     
  106 |     // Log history table registers a new active session
  107 |     await expect(page.locator('tbody tr').first()).toContainText('Active');
  108 |     
  109 |     // Click Clock Out
  110 |     await clockOutBtn.click();
  111 |     
  112 |     // Verify log completion
  113 |     await expect(page.locator('tbody tr').first()).not.toContainText('Active');
  114 |   });
  115 | 
  116 |   // TC-036: Research/Project Tracking
  117 |   test('TC-036: Research/Project Tracking - Allocate Hours', async ({ page }) => {
  118 |     await page.goto('/teacher/projects');
  119 |     await expect(page.getByRole('heading', { name: 'Research & Projects' }).or(page.getByText('Project Tracking'))).toBeVisible();
  120 |     
  121 |     // Click Allocate Project Hours
  122 |     await page.getByRole('button', { name: 'Allocate Project Hours' }).or(page.getByRole('button', { name: 'Log Hours' })).click();
  123 |     
  124 |     // Select project & input hours
```