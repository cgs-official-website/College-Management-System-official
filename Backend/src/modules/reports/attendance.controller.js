import { prisma } from '../../server.js';
import { attendanceReportQuerySchema } from './attendance.validator.js';

export const getAttendanceReport = async (req, res) => {
  try {
    const collegeId = req.user?.collegeId || req.tenant?.collegeId;

    if (!collegeId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_COLLEGE_ID', message: 'College ID is required' }
      });
    }

    const validationResult = attendanceReportQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: validationResult.error.errors,
      });
    }

    const { startDate, endDate, departmentId, classId, groupBy } = validationResult.data;
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build base where clause scoped to collegeId and date range
    const whereClause = {
      collegeId: collegeId,
      date: {
        gte: start,
        lte: end,
      },
    };

    if (departmentId) {
      whereClause.student = {
        departmentId: departmentId,
      };
    }

    if (classId) {
      whereClause.courseId = classId;
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            department: true,
            section: true,
            course: true,
          }
        },
        course: true,
        teacher: true,
      },
      orderBy: {
        date: 'asc'
      }
    });

    let overallPresent = 0;
    let overallAbsent = 0;
    let overallLate = 0;
    const totalStudentsSet = new Set();
    const trendMap = new Map();
    const groupMap = new Map();

    attendanceRecords.forEach(record => {
      totalStudentsSet.add(record.studentId);

      const status = (record.status || '').toLowerCase();
      if (status === 'present') overallPresent++;
      else if (status === 'absent') overallAbsent++;
      else if (status === 'late') overallLate++;

      // Process Trend Data (Group by Day)
      const dateString = record.date.toISOString().split('T')[0];
      if (!trendMap.has(dateString)) {
        trendMap.set(dateString, { date: dateString, presentCount: 0, absentCount: 0, lateCount: 0, totalRecords: 0 });
      }
      const trendDay = trendMap.get(dateString);
      trendDay.totalRecords++;
      if (status === 'present') trendDay.presentCount++;
      else if (status === 'absent') trendDay.absentCount++;
      else if (status === 'late') trendDay.lateCount++;

      // Process Grouped Results
      let groupKey = '';
      let groupName = '';

      if (groupBy === 'day') {
        groupKey = dateString;
        groupName = dateString;
      } else if (groupBy === 'class') {
        groupKey = record.courseId || record.student?.sectionId || 'Unknown';
        groupName = record.course?.name || record.student?.section?.name || 'General Class';
      } else if (groupBy === 'department') {
        const dId = record.student?.departmentId || record.course?.departmentId || 'Unknown';
        groupKey = dId;
        groupName = record.student?.department?.name || record.course?.department?.name || 'General Department';
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          id: groupKey,
          name: groupName,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          studentIds: new Set(),
        });
      }

      const groupData = groupMap.get(groupKey);
      groupData.studentIds.add(record.studentId);
      if (status === 'present') groupData.presentCount++;
      else if (status === 'absent') groupData.absentCount++;
      else if (status === 'late') groupData.lateCount++;
    });

    // Calculate Summary
    const totalRecords = overallPresent + overallAbsent + overallLate;
    const overallPercentage = totalRecords > 0 
      ? Number((((overallPresent + overallLate) / totalRecords) * 100).toFixed(2))
      : 0;

    // Finalize Trend Data
    const trendData = Array.from(trendMap.values()).map(day => {
      const percentage = day.totalRecords > 0 
        ? Number((((day.presentCount + day.lateCount) / day.totalRecords) * 100).toFixed(2)) 
        : 0;
      return {
        date: day.date,
        presentCount: day.presentCount,
        absentCount: day.absentCount,
        lateCount: day.lateCount,
        attendancePercentage: percentage
      };
    });

    // Finalize Grouped Results
    const groupedResults = Array.from(groupMap.values()).map(group => {
      const groupTotalRecords = group.presentCount + group.absentCount + group.lateCount;
      const percentage = groupTotalRecords > 0 
        ? Number((((group.presentCount + group.lateCount) / groupTotalRecords) * 100).toFixed(2)) 
        : 0;
      return {
        id: group.id,
        name: group.name,
        totalStudents: group.studentIds.size,
        presentCount: group.presentCount,
        absentCount: group.absentCount,
        lateCount: group.lateCount,
        attendancePercentage: percentage
      };
    });

    return res.json({
      success: true,
      data: {
        filters: validationResult.data,
        groupedResults,
        trendData,
        summary: {
          overallPercentage,
          totalStudents: totalStudentsSet.size
        }
      }
    });

  } catch (error) {
    console.error('Error fetching attendance report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
