import { Router } from 'express';

// Helper to quickly generate stub routers for the remaining 50+ modules
const createStubRouter = (moduleName) => {
  const router = Router();
  router.use((req, res) => {
    res.status(501).json({ 
      error: `Module '${moduleName}' is stubbed and pending full implementation.` 
    });
  });
  return router;
};

export const libraryRoutes = createStubRouter('library');
export const hostelRoutes = createStubRouter('hostel');
export const transportRoutes = createStubRouter('transport');
export const infrastructureRoutes = createStubRouter('infrastructure');
export const noticesRoutes = createStubRouter('notices');
export const complaintsRoutes = createStubRouter('complaints');
export const placementsRoutes = createStubRouter('placements');
export const storeRoutes = createStubRouter('store');
export const publicRoutes = Router();
publicRoutes.get('/plans', (req, res) => {
  res.json({
    data: [
      { id: '1', name: 'Starter', price: '$49', duration: 'month', storage: '10GB', studentCount: 'Up to 500', order: 1 },
      { id: '2', name: 'Professional', price: '$99', duration: 'month', storage: '50GB', studentCount: 'Up to 2000', order: 2 },
      { id: '3', name: 'Enterprise', price: 'Custom', duration: 'year', storage: 'Unlimited', studentCount: 'Unlimited', order: 3 }
    ]
  });
});

export const mockDataRoutes = Router();
mockDataRoutes.get('/courses', (req, res) => {
  res.json({ data: [{ id: 'course-1', name: 'Computer Science 101', code: 'CS101' }] });
});
mockDataRoutes.get('/students', (req, res) => {
  res.json({ data: [{ id: 'student-1', name: 'Alice Smith', rollNumber: '1001' }, { id: 'student-2', name: 'Bob Jones', rollNumber: '1002' }] });
});
mockDataRoutes.get('/exams', (req, res) => {
  res.json({ data: [{ id: 'exam-1', title: 'Midterm', examDate: '2026-10-15', maxMarks: 100 }] });
});
mockDataRoutes.get('/timetables', (req, res) => {
  res.json({ data: [{ id: 'tt-1', day: 'Monday', startTime: '09:00', endTime: '10:00', room: '101' }] });
});
mockDataRoutes.get('/assignments', (req, res) => {
  res.json({ data: [{ id: 'assign-1', title: 'Homework 1', dueDate: '2026-10-20', status: 'pending' }] });
});
