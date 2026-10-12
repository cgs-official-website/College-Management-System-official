// Usage (inside your Mobile folder):  node create-structure.js
// Creates every folder + EMPTY file of the mobile app. Existing files are never overwritten.
const fs = require('fs');
const path = require('path');

const files = [];
const add = (dir, names, ext = '.tsx') => names.forEach((n) => files.push(`${dir}/${n}${n.includes('.') ? '' : ext}`));

// ---------- root ----------
['.env', '.env.example', '.env.production'].forEach((f) => files.push(f));

// ---------- config / types / theme / api / utils ----------
add('src/config', ['env'], '.ts');
add('src/types', ['react-native-config.d', 'auth', 'navigation', 'api', 'models'], '.ts');
add('src/theme', ['colors', 'typography', 'spacing', 'index'], '.ts');
add('src/api', ['client', 'session', 'index'], '.ts');
add('src/utils', ['toast', 'jwt', 'format', 'permissions', 'syncChannel'], '.ts');
add('src/utils', ['toastConfig'], '.tsx');

// ---------- contexts ----------
add('src/contexts', ['ThemeContext', 'AuthContext', 'ConfirmContext', 'ParentChildContext']);

// ---------- hooks (ported from web) ----------
add('src/hooks', [
  'useAdmissions', 'useApiIntegrations', 'useAttendance', 'useChat', 'useColleges', 'useComplaints',
  'useCourses', 'useDashboardStats', 'useDepartments', 'useEmailTemplates', 'useExams', 'useFees',
  'useHostel', 'useInfrastructure', 'useInventory', 'useLibrary', 'useNotices', 'useParentPortal',
  'usePayroll', 'usePlacements', 'useProjects', 'useSections', 'useStaff', 'useStore',
  'useStudentPortal', 'useStudents', 'useTimetable', 'useTransport',
], '.ts');

// ---------- components ----------
add('src/components/ui', [
  'Screen', 'Button', 'Input', 'Select', 'SheetModal', 'ConfirmModal', 'SearchBar', 'Card', 'Badge',
  'Loader', 'FullPageSkeleton', 'EmptyState', 'Pagination', 'Tabs', 'StatCard', 'ListItem', 'DataList',
  'ExcelUploadButton', 'NotificationSheet', 'RaiseTicketModal', 'PlaceholderModule',
  'ChatWidget', 'ChatMessage', 'ChatTypingIndicator',
]);
add('src/components/charts', ['AttendanceChart', 'FinancialChart', 'DemographicsChart', 'StaffOverviewChart']);
add('src/components/layout', ['DrawerContent', 'ScreenHeader', 'RoleGuard']);

// ---------- navigation ----------
add('src/navigation', [
  'RootNavigator', 'AuthStack', 'SuperDrawer', 'AdminDrawer', 'TeacherDrawer', 'StudentDrawer', 'ParentDrawer',
]);
add('src/navigation', ['linking'], '.ts');

// ---------- feature modals (web *FormModal.jsx) ----------
add('src/features/students', ['StudentFormModal', 'BulkImportModal', 'StudentRegistrationLinkModal']);
add('src/features/hr', ['StaffFormModal', 'StaffDetailsModal']);
add('src/features/fees', ['FeeFormModal']);
add('src/features/exams', ['ExamFormModal']);
add('src/features/timetable', ['TimetableFormModal']);
add('src/features/library', ['BookFormModal']);
add('src/features/notices', ['NoticeFormModal']);
add('src/features/admission', ['AdmissionFormModal']);
add('src/features/courses', ['CourseFormModal']);
add('src/features/payroll', ['PayslipFormModal']);
add('src/features/infrastructure', ['FacilityFormModal']);

// ---------- screens ----------
add('src/screens/auth', [
  'WelcomeScreen', 'LoginScreen', 'RegisterScreen', 'StudentRegisterScreen', 'TeacherRegisterScreen',
  'StaffSetupScreen', 'ForgotPasswordScreen', 'ResetPasswordScreen', 'PendingApprovalScreen', 'RejectedScreen',
]);
add('src/screens/shared', ['NotFoundScreen', 'PayslipsScreen', 'PTMDashboardScreen', 'StoreDashboardScreen', 'NotificationsScreen']);

add('src/screens/superadmin', [
  'SuperDashboardScreen', 'SuperCollegesScreen', 'SuperAdminsScreen', 'GlobalModulesScreen',
  'SuperEmailTemplatesScreen', 'LandingPageSettingsScreen', 'SuperSubscriptionsScreen', 'SuperSettingsScreen',
]);

add('src/screens/admin', [
  'AdminDashboardScreen', 'AdmissionScreen', 'StudentListScreen', 'StudentDetailScreen', 'AdminStudentDocumentsScreen',
  'HRManagementScreen', 'AcademicStructureScreen', 'DepartmentsTab', 'CoursesTab', 'SectionsTab', 'CoursesListScreen',
  'AssignmentsScreen', 'TimetableScreen', 'AttendanceScreen', 'LeaveRequestsScreen', 'MyLeavesScreen',
  'ExamsScreen', 'FeesScreen', 'PayrollScreen', 'LibraryScreen', 'HostelScreen', 'TransportScreen',
  'InfrastructureScreen', 'InventoryScreen', 'NoticeBoardScreen', 'ComplaintsScreen', 'PlacementsScreen',
  'ReportsScreen', 'RolesManagementScreen', 'SettingsScreen', 'ApiIntegrationsScreen',
  'LMSScreen', 'MarketingScreen', 'MobileAppsScreen', 'DynamicModuleScreen',
]);

add('src/screens/teacher', [
  'TeacherDashboardScreen', 'TeacherClassesScreen', 'TeacherAssignmentsScreen', 'TeacherAttendanceScreen',
  'TeacherScheduleScreen', 'TeacherGradesScreen', 'TeacherComplaintsScreen', 'ProjectTimesheetScreen',
  'TimesheetScreen', 'TeacherPayrollScreen', 'TeacherMyLeavesScreen', 'TeacherSettingsScreen', 'HODFacilityRequestsScreen',
]);

add('src/screens/student', [
  'StudentDashboardScreen', 'StudentCoursesScreen', 'StudentAssignmentsScreen', 'StudentAttendanceScreen',
  'StudentTimetableScreen', 'StudentExamsScreen', 'StudentFeesScreen', 'StudentNoticesScreen', 'StudentLibraryScreen',
  'StudentHostelScreen', 'StudentTransportScreen', 'StudentPlacementsScreen', 'StudentComplaintsScreen',
  'StudentDocumentsScreen', 'StudentLMSScreen', 'StudentSettingsScreen',
]);

add('src/screens/parent', [
  'ParentDashboardScreen', 'ParentAttendanceScreen', 'ParentGradesScreen', 'ParentFeesScreen', 'ParentPTMScreen',
  'ParentHostelScreen', 'ParentTransportScreen', 'ParentComplaintsScreen',
]);

let created = 0;
let skipped = 0;
files.forEach((f) => {
  const full = path.join(process.cwd(), f);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (fs.existsSync(full)) { skipped++; return; }
  fs.writeFileSync(full, '');
  created++;
});
fs.mkdirSync(path.join(process.cwd(), 'src/assets'), { recursive: true });
console.log(`Done. Created ${created} empty files, skipped ${skipped} existing. Total listed: ${files.length}`);
