import { useState, useEffect } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useDashboardStats(collegeId, isSuperAdmin = false) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeCourses: 0,
    attendanceRate: 0,
    totalColleges: 0,
    isLoading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (isSuperAdmin) {
          const collegesQuery = query(collection(db, 'colleges'));
          const collegesSnapshot = await getCountFromServer(collegesQuery);
          
          setStats(s => ({
            ...s,
            totalColleges: collegesSnapshot.data().count,
            isLoading: false
          }));
          return;
        }

        if (!collegeId) return;

        // Fetch students
        const studentsQuery = query(collection(db, 'students'), where('collegeId', '==', collegeId));
        const studentsSnapshot = await getCountFromServer(studentsQuery);
        
        // Fetch staff
        const staffQuery = query(collection(db, 'staff'), where('collegeId', '==', collegeId));
        const staffSnapshot = await getCountFromServer(staffQuery);

        // Fetch courses (if collection exists, else it returns 0)
        const coursesQuery = query(collection(db, 'courses'), where('collegeId', '==', collegeId));
        const coursesSnapshot = await getCountFromServer(coursesQuery);

        setStats({
          totalStudents: studentsSnapshot.data().count,
          totalTeachers: staffSnapshot.data().count,
          activeCourses: coursesSnapshot.data().count,
          attendanceRate: 0, // Placeholder for attendance
          totalColleges: 0,
          isLoading: false
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setStats(s => ({ ...s, isLoading: false }));
      }
    };

    fetchStats();
  }, [collegeId, isSuperAdmin]);

  return stats;
}
