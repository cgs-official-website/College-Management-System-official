import { prisma } from '../../server.js';
import { attendanceReportQuerySchema } from './attendance.validator.js';

export const getAttendanceReport = async (req, res) => {
  try {
    const collegeId = req.user.collegeId;

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
    const end = new Date(endDate);

    // Build base where clause scoped to collegeId and date range
    const whereClause = {
      student: {
        collegeId: collegeId,
      },
      date: {
        gte: start,
        lte: end,
      },
    };

    if (departmentId) {
      whereClause.student.departmentId = departmentId;
    }
    if (classId) {
      whereClause.classId = classId;
    }

    // Since we need complex grouping (day truncations) and distinct student counts per group,
    // and we don't want to risk schema mismatch with $queryRaw (e.g. table names vs Prisma virtuals),
    // we fetch the scoped records and aggregate in JS. For typical report timeframes, this is efficient.
    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            department: true,
          }
        },
        class: true,
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

      const status = record.status;
      if (status === 'PRESENT') overallPresent++;
      else if (status === 'ABSENT') overallAbsent++;
      else if (status === 'LATE') overallLate++;

      // Process Trend Data (Group by Day)
      const dateString = record.date.toISOString().split('T')[0];
      if (!trendMap.has(dateString)) {
        trendMap.set(dateString, { date: dateString, presentCount: 0, absentCount: 0, lateCount: 0, totalRecords: 0 });
      }
      const trendDay = trendMap.get(dateString);
      trendDay.totalRecords++;
      if (status === 'PRESENT') trendDay.presentCount++;
      else if (status === 'ABSENT') trendDay.absentCount++;
      else if (status === 'LATE') trendDay.lateCount++;

      // Process Grouped Results
      let groupKey = '';
      let groupName = '';

      if (groupBy === 'day') {
        groupKey = dateString;
        groupName = dateString;
      } else if (groupBy === 'class') {
        groupKey = record.classId;
        groupName = record.class?.name || record.classId;
      } else if (groupBy === 'department') {
        const dId = record.student?.departmentId || 'Unknown';
        groupKey = dId;
        groupName = record.student?.department?.name || dId;
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
      if (status === 'PRESENT') groupData.presentCount++;
      else if (status === 'ABSENT') groupData.absentCount++;
      else if (status === 'LATE') groupData.lateCount++;
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


