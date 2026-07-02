# Goal Description

To provide a flawless, comprehensive business proposal, we need to populate *every single module* across the Admin, Teacher, Student, and Parent panels with rich, realistic dummy data. 

Currently, the `demoDataSeeder.js` creates Users, Courses, Notices, and Timetables. We will expand it significantly to inject data into all the remaining functional areas of the college management system.

## User Review Required

> [!IMPORTANT]
> Please review the list of modules below that will be populated. Let me know if there are any specific values or specific scenarios (e.g., a specific library book name or a specific fee amount) you want highlighted in the demo!

## Proposed Changes

We will modify `src/utils/demoDataSeeder.js` to generate interconnected dummy data for the following additional collections:

### 1. Academic & Staff Modules
- **Attendance**: Daily attendance records for the generated students to populate charts in the Admin and Teacher dashboards.
- **Staff / HR**: Generating support staff records in addition to teachers to populate the HR Management panel.
- **Admissions**: Mock admission inquiries and applications (Pending/Approved) to populate the Admissions pipeline.

### 2. Examination & LMS Modules
- **Assignments**: Sample homework and project assignments uploaded by teachers.
- **Exams**: Mid-term and Final examination schedules.
- **Grades**: Sample grades for students to populate the Teacher Grading panel and Student performance charts.

### 3. Finance & Facilities Modules
- **Fees**: Sample fee structures (e.g., Tuition, Transport) and payment records for students.
- **Library**: Mock book inventory (e.g., Engineering textbooks) and active book issue records for students.
- **Infrastructure**: Buildings (e.g., "Main Block", "Science Wing") and rooms to populate the Facilities management dashboard.

### 4. Global Communication
- **Notifications**: Personal notifications for the users (e.g., "Your leave request was approved") to populate the top navigation bell dropdown.
- **Timetable Alignment**: Ensuring the timetable records perfectly match the `timetables` and `timetable` collection schemas used across different dashboards.

## Verification Plan

### Manual Verification
1. Run the updated `DemoSeeder` page from `http://localhost:5173/setup-demo`.
2. Wait for the comprehensive data injection to finish.
3. Log in as **Admin** and verify Admissions, Fees, Library, HR, Exams, and Infrastructure panels.
4. Log in as **Teacher** and verify Assignments, Grades, Attendance, and Schedule panels.
5. Log in as **Student** and verify their personal Fees, Library dues, Grades, and Assignments.
