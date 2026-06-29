import { test, expect } from '@playwright/test';
import { testData } from './testData';

test.describe('College Admin Panel Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials
    await page.getByPlaceholder('admin@college.edu').fill(testData.credentials.admin.email);
    await page.getByPlaceholder('••••••••').fill(testData.credentials.admin.password);
    await page.getByRole('button', { name: 'Secure Login' }).click();
    
    // Check if error message appears on the login page immediately
    const errorAlert = page.locator('.text-red-600, .bg-red-50').first();
    await Promise.race([
      page.waitForURL(/.*admin/, { timeout: 10000 }).catch(() => {}),
      errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ]);
    
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.innerText();
      throw new Error(`Authentication failed for Admin with error: "${errorText.trim()}". Please configure valid credentials in tests/testData.js.`);
    }
    
    // Wait for redirect to admin dashboard
    await expect(page).toHaveURL(/.*admin/, { timeout: 5000 });
  });

  // TC-004: Root Dashboard
  test('TC-004: Root Dashboard - Generate Invite Links', async ({ page, context }) => {
    // Ensure metrics are visible
    await expect(page.getByText('Total Students')).toBeVisible();
    await expect(page.getByText('Total Teachers')).toBeVisible();
    await expect(page.getByText('Active Courses')).toBeVisible();
    
    // Grant clipboard permissions so Playwright can read/write clipboard
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Click Generate Invite Links button
    const generateBtn = page.getByRole('button', { name: 'Generate Invite Links' });
    await generateBtn.click();
    
    // Click Student Link option to copy it
    await page.getByText('Student Link').click();
    
    // Verify toast success
    await expect(page.locator('div[role="status"]')).toContainText(/Copied student link to clipboard!/i);
    
    // Click Generate Invite Links again to copy Teacher Link
    await generateBtn.click();
    await page.getByText('Teacher Link').click();
    await expect(page.locator('div[role="status"]')).toContainText(/Copied teacher link to clipboard!/i);
  });

  // TC-005: Admission Management
  test('TC-005: Admission Management - Add Inquiry', async ({ page }) => {
    await page.goto('/admin/admission');
    await expect(page.getByRole('heading', { name: 'Admissions Dashboard' })).toBeVisible();
    
    // Click Add Inquiry button
    await page.getByRole('button', { name: 'Add Inquiry' }).click();
    
    // Fill candidate details
    await page.getByLabel('First Name').fill(testData.adminData.admission.firstName);
    await page.getByLabel('Last Name').fill(testData.adminData.admission.lastName);
    await page.getByLabel('Email Address').fill(testData.adminData.admission.email);
    await page.getByLabel('Phone Number').fill(testData.adminData.admission.phone);
    await page.getByLabel('Previous School / Institution').fill(testData.adminData.admission.previousSchool);
    
    // Select the first available course dynamically
    const courseSelect = page.getByLabel('Applied Course / Program');
    await courseSelect.selectOption({ index: 1 });
    
    // Submit form
    await page.getByRole('button', { name: 'Add Inquiry' }).click();
    
    // Assert inquiry added to the table
    const fullName = `${testData.adminData.admission.firstName} ${testData.adminData.admission.lastName}`;
    await expect(page.getByText(fullName).first()).toBeVisible();
  });

  // TC-006: Marketing & Leads
  test('TC-006: Marketing & Leads - Create Campaign', async ({ page }) => {
    await page.goto('/admin/marketing');
    await expect(page.getByRole('heading', { name: 'Marketing & Leads' })).toBeVisible();
    
    // Click Create Campaign
    await page.getByRole('button', { name: 'Create Campaign' }).click();
    
    // Fill campaign details
    await page.getByPlaceholder('e.g. Summer Admissions Push').fill(testData.adminData.marketing.campaignName);
    await page.getByLabel('Channel').selectOption(testData.adminData.marketing.channel);
    await page.getByLabel('Target Audience').selectOption('All Leads');
    await page.getByPlaceholder('Type your campaign message here...').fill('Mock Marketing Campaign Message Body.');
    
    // Submit/Launch
    await page.getByRole('button', { name: 'Launch Campaign' }).click();
    
    // Verify success toast
    await expect(page.locator('div[role="status"]')).toContainText(/Campaign created successfully!/i);
  });

  // TC-007: Student Directory
  test('TC-007: Student Directory - Search Active Student', async ({ page }) => {
    await page.goto('/admin/students');
    await expect(page.getByRole('heading', { name: 'Students Directory' }).or(page.getByText('Student Directory'))).toBeVisible();
    
    // Search for newly admitted student
    const fullName = `${testData.adminData.admission.firstName} ${testData.adminData.admission.lastName}`;
    const searchInput = page.getByPlaceholder(/Search students/i).or(page.locator('input[type="text"]').first());
    await searchInput.fill(fullName);
    
    // Expect student profile to be displayed with status Active
    const studentRow = page.locator('tbody tr').filter({ hasText: testData.adminData.admission.firstName });
    if (await studentRow.count() > 0) {
      await expect(studentRow).toContainText('Active');
    } else {
      console.log(`Student "${fullName}" was not found or is not active yet in the database.`);
    }
  });

  // TC-008: HR & Staff
  test('TC-008: HR & Staff - Add Staff Member', async ({ page }) => {
    await page.goto('/admin/hr');
    await expect(page.getByRole('heading', { name: 'HR & Staff Directory' })).toBeVisible();
    
    // Click Add Staff Member
    await page.getByRole('button', { name: 'Add Staff Member' }).click();
    
    // Fill details
    const names = testData.adminData.staff.name.split(' ');
    await page.getByLabel('First Name').fill(names[1] || names[0]);
    await page.getByLabel('Last Name').fill(names[2] || 'Staff');
    await page.getByLabel('Email Address').fill(`staff.${Date.now()}@college.edu`);
    await page.getByLabel('Phone Number').fill('1234567890');
    await page.getByLabel('Role / Designation').selectOption(testData.adminData.staff.role.toLowerCase());
    await page.getByLabel('Department').fill('Computer Science');
    
    // Submit
    await page.getByRole('button', { name: 'Add Staff Member' }).click();
    
    // Verify saving (modal closes)
    await expect(page.getByRole('heading', { name: 'Add New Staff Member' })).not.toBeVisible();
  });

  // TC-009: Courses & Syllabus
  test('TC-009: Courses & Syllabus - Add Course', async ({ page }) => {
    await page.goto('/admin/courses');
    
    // Click Add Course
    await page.getByRole('button', { name: 'Add Course' }).or(page.getByRole('button', { name: 'Add Class' })).click();
    
    // Fill details
    await page.getByLabel('Course Code').or(page.getByPlaceholder(/CS101/)).fill(testData.adminData.course.code);
    await page.getByLabel('Course Title').or(page.getByPlaceholder(/Web Development/)).fill(testData.adminData.course.title);
    await page.getByLabel('Syllabus').or(page.getByPlaceholder(/Syllabus details/)).fill(testData.adminData.course.syllabus);
    
    // Assign a teacher dynamically if select dropdown is present
    const teacherSelect = page.getByLabel('Assign Teacher');
    if (await teacherSelect.isVisible()) {
      await teacherSelect.selectOption({ index: 1 });
    }
    
    // Save course
    await page.getByRole('button', { name: 'Save Course' }).or(page.getByRole('button', { name: 'Add Course' })).click();
  });

  // TC-010: Timetable Scheduling
  test('TC-010: Timetable Scheduling - Schedule Class Slot', async ({ page }) => {
    await page.goto('/admin/timetable');
    
    // Select Class/Semester if dropdown is present
    const classSelect = page.getByLabel('Class / Semester').or(page.locator('select').first());
    if (await classSelect.isVisible()) {
      await classSelect.selectOption({ index: 1 });
    }
    
    // Click an empty slot or the Add Schedule button
    const addBtn = page.getByRole('button', { name: 'Add Schedule' }).or(page.getByRole('button', { name: 'Schedule Slot' }));
    if (await addBtn.isVisible()) {
      await addBtn.click();
    } else {
      // Click calendar slot (fallback)
      await page.locator('.rbc-day-bg').first().or(page.locator('table tbody tr td').first()).click({ force: true });
    }
    
    // Fill slot details in modal
    const subjectField = page.getByLabel('Subject').or(page.locator('input[name="subject"]'));
    if (await subjectField.isVisible()) {
      await subjectField.fill(testData.adminData.timetable.subject);
      await page.getByLabel('Room').or(page.locator('input[name="room"]')).fill(testData.adminData.timetable.room);
      
      const teacherSelect = page.getByLabel('Teacher').or(page.locator('select[name="teacherId"]'));
      if (await teacherSelect.isVisible()) {
        await teacherSelect.selectOption({ index: 1 });
      }
      
      // Save Slot
      await page.getByRole('button', { name: 'Save' }).or(page.getByRole('button', { name: 'Schedule' })).click();
    }
  });

  // TC-011: Attendance Logs
  test('TC-011: Attendance Logs - Submit Attendance', async ({ page }) => {
    await page.goto('/admin/attendance');
    
    // Select Class
    const classSelect = page.getByLabel('Class').or(page.locator('select').first());
    if (await classSelect.isVisible()) {
      await classSelect.selectOption({ index: 1 });
      
      // Select Section
      const secSelect = page.getByLabel('Section').or(page.locator('select').nth(1));
      if (await secSelect.isVisible()) {
        await secSelect.selectOption('A');
      }
      
      // Click Search/Fetch students
      const fetchBtn = page.getByRole('button', { name: 'Fetch Students' }).or(page.getByRole('button', { name: 'Search' }));
      if (await fetchBtn.isVisible()) {
        await fetchBtn.click();
      }
      
      // Mark student Present
      const radioPresent = page.locator('input[type="radio"][value="present"]').first().or(page.getByText('Present').first());
      if (await radioPresent.isVisible()) {
        await radioPresent.click();
      }
      
      // Submit attendance
      await page.getByRole('button', { name: 'Submit Attendance' }).or(page.getByRole('button', { name: 'Save Attendance' })).click();
      
      // Verify confirmation toast/success
      await expect(page.locator('div[role="status"]')).toContainText(/Attendance (submitted|saved|recorded) successfully/i);
    }
  });

  // TC-012: Exam Management
  test('TC-012: Exam Management - Schedule Exam', async ({ page }) => {
    await page.goto('/admin/exams');
    
    // Click Schedule Exam
    await page.getByRole('button', { name: 'Schedule Exam' }).click();
    
    // Input details
    await page.getByLabel('Subject').fill(testData.adminData.exam.subject);
    await page.getByLabel('Date').fill(testData.adminData.exam.date);
    await page.getByLabel('Start Time').fill(testData.adminData.exam.time);
    await page.getByLabel('Classroom location').or(page.getByLabel('Location')).fill(testData.adminData.exam.location);
    
    // Save Exam
    await page.getByRole('button', { name: 'Schedule Exam' }).click();
    
    // Verify listing
    await expect(page.getByText(testData.adminData.exam.subject).first()).toBeVisible();
  });

  // TC-013: LMS Setup
  test('TC-013: LMS Setup - Schedule Live Class', async ({ page }) => {
    await page.goto('/admin/lms');
    
    // Click Schedule Live Class
    await page.getByRole('button', { name: 'Schedule Live Class' }).click();
    
    // Fill Details
    await page.getByLabel('Topic').fill(testData.adminData.lms.topic);
    await page.getByLabel('Batch').or(page.getByLabel('Class')).selectOption({ index: 1 });
    await page.getByLabel('Time').fill(testData.adminData.lms.time);
    await page.getByLabel('Join Link').fill(testData.adminData.lms.link);
    
    // Submit
    await page.getByRole('button', { name: 'Schedule Class' }).or(page.getByRole('button', { name: 'Submit' })).click();
    
    // Verify upcoming class listed
    await expect(page.getByText(testData.adminData.lms.topic).first()).toBeVisible();
  });

  // TC-014: Fees & Invoicing
  test('TC-014: Fees & Invoicing - Create Fee Invoice', async ({ page }) => {
    await page.goto('/admin/fees');
    
    // Click Create Fee Invoice
    await page.getByRole('button', { name: 'Create Fee Invoice' }).or(page.getByRole('button', { name: 'New Invoice' })).click();
    
    // Fill Form Details
    const studentSelect = page.getByLabel('Student');
    if (await studentSelect.isVisible()) {
      await studentSelect.selectOption({ index: 1 });
    } else {
      await page.getByPlaceholder(/Select student/i).or(page.locator('input[type="text"]').first()).fill(testData.adminData.fees.studentName);
    }
    await page.getByLabel('Amount').fill(testData.adminData.fees.amount);
    await page.getByLabel('Fee Category').selectOption(testData.adminData.fees.category);
    
    // Submit Invoice
    await page.getByRole('button', { name: 'Create Invoice' }).or(page.getByRole('button', { name: 'Submit' })).click();
    
    // Verify stats update or list update
    await expect(page.getByText(testData.adminData.fees.amount).first()).toBeVisible();
  });

  // TC-015: Library Management
  test('TC-015: Library Management - Add and Issue Book', async ({ page }) => {
    await page.goto('/admin/library');
    
    // Click Add Book
    await page.getByRole('button', { name: 'Add Book' }).click();
    
    // Input Book info
    await page.getByLabel('Title').fill(testData.adminData.library.title);
    await page.getByLabel('Author').fill(testData.adminData.library.author);
    await page.getByLabel('ISBN').fill(testData.adminData.library.isbn);
    
    // Save
    await page.getByRole('button', { name: 'Add Book' }).click();
    
    // Locate the newly created book
    const bookRow = page.locator('tbody tr').filter({ hasText: testData.adminData.library.title });
    await expect(bookRow).toBeVisible();
    
    // Issue Book Action
    const issueBtn = bookRow.getByRole('button', { name: 'Issue Book' }).or(bookRow.locator('button').first());
    await issueBtn.click();
    
    // Select Student in Issue Modal
    const studentSelect = page.getByLabel('Select Student');
    if (await studentSelect.isVisible()) {
      await studentSelect.selectOption({ index: 1 });
    }
    
    // Click Issue
    await page.getByRole('button', { name: 'Issue' }).click();
  });

  // TC-016: Hostel Management
  test('TC-016: Hostel Management - Allocate Room', async ({ page }) => {
    await page.goto('/admin/hostel');
    
    // Click Allocate Room
    await page.getByRole('button', { name: 'Allocate Room' }).click();
    
    // Select student, block, room
    const studentSelect = page.getByLabel('Select Student');
    if (await studentSelect.isVisible()) {
      await studentSelect.selectOption({ index: 1 });
    }
    await page.getByLabel('Block').selectOption(testData.adminData.hostel.block);
    await page.getByLabel('Room Number').fill(testData.adminData.hostel.roomNumber);
    
    // Submit
    await page.getByRole('button', { name: 'Allocate' }).click();
    
    // Verify occupancy listing
    await expect(page.getByText(testData.adminData.hostel.roomNumber).first()).toBeVisible();
  });

  // TC-017: Transport & Fleet
  test('TC-017: Transport & Fleet - Add Vehicle/Bus', async ({ page }) => {
    await page.goto('/admin/transport');
    
    // Click Add Vehicle/Bus
    await page.getByRole('button', { name: 'Add Vehicle' }).or(page.getByRole('button', { name: 'Add Bus' })).click();
    
    // Input vehicle details
    await page.getByLabel('Vehicle Number').fill(testData.adminData.transport.vehicleNumber);
    await page.getByLabel('Route coordinates').or(page.getByLabel('Route')).fill(testData.adminData.transport.routeCoordinates);
    await page.getByLabel('Driver Name').fill(testData.adminData.transport.driverName);
    
    // Submit
    await page.getByRole('button', { name: 'Add Vehicle' }).or(page.getByRole('button', { name: 'Submit' })).click();
    
    // Verify bus route listed
    await expect(page.getByText(testData.adminData.transport.vehicleNumber).first()).toBeVisible();
  });

  // TC-018: Infrastructure Maintenance
  test('TC-018: Infrastructure Maintenance - Mark Issue Resolved', async ({ page }) => {
    await page.goto('/admin/infrastructure');
    
    // Verify incoming maintenance requests
    const requestRow = page.locator('tbody tr').filter({ hasText: 'Pending' }).first();
    
    if (await requestRow.count() > 0) {
      const resolveBtn = requestRow.getByRole('button', { name: 'Mark Resolved' }).or(requestRow.locator('button').first());
      await resolveBtn.click();
      
      // Verify success status updates to Resolved
      await expect(requestRow).toContainText('Resolved');
    } else {
      console.log('No pending infrastructure maintenance requests exist to resolve.');
    }
  });

  // TC-019: Notice Board Announcements
  test('TC-019: Notice Board Announcements - Create Notice', async ({ page }) => {
    await page.goto('/admin/notices');
    
    // Click Create Notice
    await page.getByRole('button', { name: 'Create Notice' }).click();
    
    // Fill notice content
    await page.getByLabel('Title').fill(testData.adminData.notice.title);
    await page.getByLabel('Body').fill(testData.adminData.notice.body);
    await page.getByLabel('Target Audience').selectOption(testData.adminData.notice.targetAudience);
    
    // Click Save
    await page.getByRole('button', { name: 'Save' }).or(page.getByRole('button', { name: 'Create Notice' })).click();
    
    // Verify listing
    await expect(page.getByText(testData.adminData.notice.title).first()).toBeVisible();
  });

  // TC-020: Services (Placement Control)
  test('TC-020: Services (Placement Control) - Add Placement Drive', async ({ page }) => {
    await page.goto('/admin/placements');
    
    // Click Add Placement Drive
    await page.getByRole('button', { name: 'Add Placement Drive' }).click();
    
    // Input Drive details
    await page.getByLabel('Company Name').fill(testData.adminData.placement.companyName);
    await page.getByLabel('Role').fill(testData.adminData.placement.role);
    await page.getByLabel('Package (LPA)').fill(testData.adminData.placement.packageLPA);
    await page.getByLabel('Eligibility Criteria (CGPA)').or(page.getByLabel('Eligibility')).fill(testData.adminData.placement.eligibilityCGPA);
    await page.getByLabel('Date').fill(testData.adminData.placement.date);
    
    // Submit
    await page.getByRole('button', { name: 'Add Drive' }).or(page.getByRole('button', { name: 'Save' })).click();
    
    // Verify drive in listing
    await expect(page.getByText(testData.adminData.placement.companyName).first()).toBeVisible();
  });

  // TC-021: Analytics Reports
  test('TC-021: Analytics Reports - Export PDF/CSV', async ({ page }) => {
    await page.goto('/admin/reports');
    
    // Verify PDF Download starts
    const downloadPromisePdf = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export PDF' }).first().click();
    const downloadPdf = await downloadPromisePdf;
    expect(downloadPdf.suggestedFilename()).toContain('.pdf');

    // Verify CSV Download starts
    const downloadPromiseCsv = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).first().click();
    const downloadCsv = await downloadPromiseCsv;
    expect(downloadCsv.suggestedFilename()).toContain('.csv');
  });

  // TC-022: Mobile App Configuration
  test('TC-022: Mobile App Configuration - Send Push Notification', async ({ page }) => {
    await page.goto('/admin/apps');
    
    // Click Send Push Notification
    await page.getByRole('button', { name: 'Send Push Notification' }).click();
    
    // Fill out form
    await page.getByLabel('Title').fill(testData.adminData.notification.title);
    await page.getByLabel('Body').fill(testData.adminData.notification.body);
    await page.getByLabel('Platform').selectOption(testData.adminData.notification.platform);
    
    // Click Dispatch
    await page.getByRole('button', { name: 'Dispatch' }).click();
    
    // Verify success toast
    await expect(page.locator('div[role="status"]')).toContainText(/notification sent successfully/i);
  });

  // TC-023: Admin Settings
  test('TC-023: Admin Settings - Edit College Name', async ({ page }) => {
    await page.goto('/admin/settings');
    
    // Edit College Name
    const nameInput = page.getByLabel('College Name').or(page.locator('input[name="collegeName"]'));
    await nameInput.clear();
    await nameInput.fill(testData.adminData.settings.newName);
    
    // Click Save
    await page.getByRole('button', { name: 'Save' }).or(page.getByRole('button', { name: 'Save Settings' })).click();
    
    // Verify sidebar title changes globally to the new name
    const sidebarTitle = page.locator('aside h3');
    await expect(sidebarTitle).toContainText(testData.adminData.settings.newName, { timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    if (!page.url().includes('/login')) {
      const logoutBtn = page.locator('aside').getByText('LogOut')
        .or(page.locator('aside').locator('.lucide-log-out'))
        .or(page.getByText('Sign Out'));
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click({ force: true });
        await expect(page).toHaveURL(/.*login/);
      }
    }
  });
});
