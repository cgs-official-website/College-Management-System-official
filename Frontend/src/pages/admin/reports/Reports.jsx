import React, { useState, useMemo } from 'react';
import { Users, Wallet, GraduationCap, Calendar } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useStudents } from '../../../hooks/useStudents';
import { useStaff } from '../../../hooks/useStaff';
import { useFees } from '../../../hooks/useFees';
import { useAttendanceReport } from '../../../modules/reports/useAttendanceReport';
import AttendanceReportChart from '../../../modules/reports/AttendanceReportChart';
import DemographicsChart from '../../../modules/reports/DemographicsChart';
import StaffOverviewChart from '../../../modules/reports/StaffOverviewChart';
import FinancialSummaryChart from '../../../modules/reports/FinancialSummaryChart';
import ReportExportMenu from '../../../modules/reports/ReportExportMenu';

export default function Reports() {
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  
  // Fetch raw data
  const { students, isLoading: loadingStudents } = useStudents(collegeId);
  const { staff, isLoading: loadingStaff } = useStaff(collegeId);
  const { fees, isLoading: loadingFees } = useFees(collegeId);

  // Setup dynamic date range for attendance
  const [attendanceDays, setAttendanceDays] = useState(30);
  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - attendanceDays);
    return d;
  }, [attendanceDays]);

  const { data: attendanceData, isLoading: loadingAttendance } = useAttendanceReport({
    startDate: startDate.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    groupBy: 'class'
  });

  const trendData = attendanceData?.data?.trendData || attendanceData?.trendData || [];
  const summary = attendanceData?.data?.summary || attendanceData?.summary || {};
  const groupedResults = attendanceData?.data?.groupedResults || attendanceData?.groupedResults || [];
  const hasExportableAttendance = trendData.length > 0;

  // Export Data Preparation (Excel, CSV, PDF)
  const studentExportData = useMemo(() => {
    return (students || []).map((s, idx) => ({
      'S.No': idx + 1,
      'Student ID': s.id || `STU-${idx + 1}`,
      'Full Name': `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'N/A',
      'Class': s.class || 'N/A',
      'Section': s.section || 'N/A',
      'Gender': s.gender || 'N/A',
      'Email': s.email || 'N/A',
      'Phone': s.phone || 'N/A',
      'Join Date': s.createdAt?.toDate 
        ? new Date(s.createdAt.toDate()).toLocaleDateString() 
        : (s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A')
    }));
  }, [students]);

  const staffExportData = useMemo(() => {
    return (staff || []).map((s, idx) => ({
      'S.No': idx + 1,
      'Staff ID': s.id || `EMP-${idx + 1}`,
      'Full Name': `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || 'N/A',
      'Role': s.role || 'N/A',
      'Department': s.department || 'N/A',
      'Email': s.email || 'N/A',
      'Phone': s.phone || 'N/A',
      'Status': s.status || 'Active',
      'Join Date': s.joinDate || 'N/A'
    }));
  }, [staff]);

  const financialExportData = useMemo(() => {
    return (fees || []).map((f, idx) => {
      const due = Number(f.amountDue ?? f.amount ?? 0);
      const paid = Number(f.amountPaid ?? 0);
      return {
        'S.No': idx + 1,
        'Transaction ID': f.id || `TXN-${idx + 1}`,
        'Student Name': f.studentName || f.student?.user?.name || 'N/A',
        'Class': f.studentClass || f.student?.course?.name || 'N/A',
        'Fee Type': f.feeType || 'Tuition Fee',
        'Amount Due': due,
        'Amount Paid': paid,
        'Balance': Math.max(0, due - paid),
        'Due Date': f.dueDate || 'N/A',
        'Status': (f.status || 'Pending').toUpperCase(),
        'Payment Method': f.paymentMethod || 'N/A'
      };
    });
  }, [fees]);

  const attendanceExportData = useMemo(() => {
    return (trendData || []).map((day, idx) => {
      const total = (day.presentCount || 0) + (day.absentCount || 0) + (day.lateCount || 0);
      const rate = Number(day.attendancePercentage || 0);
      return {
        'S.No': idx + 1,
        'Date': day.date,
        'Present Count': day.presentCount || 0,
        'Absent Count': day.absentCount || 0,
        'Late Count': day.lateCount || 0,
        'Total Tracked': total,
        'Attendance Rate': `${rate}%`,
        'Compliance Status': rate >= 85 ? 'Optimal' : rate >= 75 ? 'Healthy' : 'Low'
      };
    });
  }, [trendData]);

  // --- Data Aggregations for Charts --- //

  const { studentsByClass, studentsByGender } = useMemo(() => {
    if (!students?.length) return { studentsByClass: [], studentsByGender: [] };
    const cMap = {};
    const gMap = {};
    
    students.forEach(s => {
      const cls = s.class || 'Unknown';
      cMap[cls] = (cMap[cls] || 0) + 1;
      
      const rawGen = s.gender || 'Others';
      let gen = rawGen.charAt(0).toUpperCase() + rawGen.slice(1).toLowerCase();
      if (gen === 'Unknown') gen = 'Others';
      
      gMap[gen] = (gMap[gen] || 0) + 1;
    });
    
    return {
      studentsByClass: Object.keys(cMap).map(k => ({ name: k, count: cMap[k] })),
      studentsByGender: Object.keys(gMap).map(k => ({ name: k, value: gMap[k] })).sort((a, b) => {
        const order = { 'Male': 1, 'Female': 2, 'Others': 3 };
        return (order[a.name] || 4) - (order[b.name] || 4);
      })
    };
  }, [students]);

  const staffByDept = useMemo(() => {
    if (!staff?.length) return [];
    const dMap = {};
    staff.forEach(s => {
      const dept = s.department || 'Unknown';
      dMap[dept] = (dMap[dept] || 0) + 1;
    });
    return Object.keys(dMap).map(k => ({ name: k, count: dMap[k] }));
  }, [staff]);

  const financialSummary = useMemo(() => {
    if (!fees?.length) {
      return {
        totalFees: 0,
        totalCollected: 0,
        totalPending: 0,
        totalOverdue: 0,
        collectionRate: 0,
        paidCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        totalRecords: 0
      };
    }

    let totalFees = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    fees.forEach(f => {
      const amt = parseFloat(f.amount ?? f.amountDue ?? 0) || 0;
      const paid = parseFloat(f.amountPaid ?? 0) || 0;
      const status = (f.status || 'pending').toLowerCase();

      totalFees += amt;

      if (status === 'paid') {
        totalCollected += amt;
        paidCount++;
      } else if (status === 'overdue') {
        totalOverdue += amt;
        overdueCount++;
        if (paid > 0) totalCollected += paid;
      } else if (status === 'partial') {
        totalCollected += paid;
        totalPending += Math.max(0, amt - paid);
      } else {
        totalPending += amt;
        pendingCount++;
        if (paid > 0) totalCollected += paid;
      }
    });

    const collectionRate = totalFees > 0 ? Math.round((totalCollected / totalFees) * 100) : 0;

    return {
      totalFees,
      totalCollected,
      totalPending,
      totalOverdue,
      collectionRate,
      paidCount,
      pendingCount,
      overdueCount,
      totalRecords: fees.length
    };
  }, [fees]);

  const { feesByStatus, feesByType } = useMemo(() => {
    if (!fees?.length) return { feesByStatus: [], feesByType: [] };
    const sMap = {};
    const tMap = {};
    
    fees.forEach(f => {
      const amt = parseFloat(f.amount ?? f.amountDue ?? 0) || 0;
      const status = (f.status || 'Pending').toUpperCase();
      sMap[status] = (sMap[status] || 0) + amt;
      
      const type = f.feeType || 'Tuition Fee';
      tMap[type] = (tMap[type] || 0) + amt;
    });
    
    return {
      feesByStatus: Object.keys(sMap).map(k => ({ name: k, value: sMap[k] })),
      feesByType: Object.keys(tMap).map(k => ({ name: k, amount: tMap[k] }))
    };
  }, [fees]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visual insights and multi-format data exports in Excel (.xlsx), CSV (.csv), and PDF (.pdf) formats.
          </p>
        </div>
      </div>

      {/* Student Demographics Card (Up) */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary-500" />
            Student Demographics
          </h2>
          <ReportExportMenu
            data={studentExportData}
            fileName="Student_Demographics_Report"
            title="Student Demographics Report"
            subtitle="Enrolled student roster, class sections, and contact directory"
            summary={{
              'Total Students': students?.length || 0,
              'Active Classes': studentsByClass?.length || 0
            }}
            disabled={loadingStudents || !students?.length}
            buttonText="Export Students"
            size="sm"
          />
        </div>
        {loadingStudents ? (
          <div className="h-64 flex items-center justify-center text-slate-500">Loading data...</div>
        ) : (
          <DemographicsChart classData={studentsByClass} genderData={studentsByGender} />
        )}
      </div>

      {/* Staff Directory Card (Downside) */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            Staff Overview
          </h2>
          <ReportExportMenu
            data={staffExportData}
            fileName="Staff_Directory_Report"
            title="Staff Directory & Overview Report"
            subtitle="Faculty departments, institutional roles, and employment directory"
            summary={{
              'Total Staff': staff?.length || 0,
              'Departments': staffByDept?.length || 0
            }}
            disabled={loadingStaff || !staff?.length}
            buttonText="Export Staff"
            size="sm"
          />
        </div>
        {loadingStaff ? (
          <div className="h-64 flex items-center justify-center text-slate-500">Loading data...</div>
        ) : (
          <StaffOverviewChart deptData={staffByDept} />
        )}
      </div>

      {/* Full Width Financial Summary Card */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              Financial & Fee Summary
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Revenue collection, outstanding dues, and student transaction breakdown
            </p>
          </div>
          <ReportExportMenu
            data={financialExportData}
            fileName="Financial_Fee_Report"
            title="Financial & Fee Summary Report"
            subtitle="Fee collection ledger, pending balances, and transaction history"
            summary={{
              'Total Invoiced': `Rs. ${financialSummary.totalFees.toLocaleString()}`,
              'Total Collected': `Rs. ${financialSummary.totalCollected.toLocaleString()}`,
              'Outstanding Dues': `Rs. ${financialSummary.totalPending.toLocaleString()}`,
              'Collection Rate': `${financialSummary.collectionRate}%`
            }}
            disabled={loadingFees || !fees?.length}
            buttonText="Export Fee Report"
            size="sm"
          />
        </div>
        {loadingFees ? (
          <div className="h-64 flex items-center justify-center text-slate-500">Loading fee data...</div>
        ) : (
          <FinancialSummaryChart 
            statusData={feesByStatus} 
            typeData={feesByType}
            summary={financialSummary}
            feesList={fees}
          />
        )}
      </div>

      {/* Attendance Chart Section */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              Attendance Overview
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Institutional attendance health, daily trend tracking, and class engagement
            </p>
          </div>
          <ReportExportMenu
            data={attendanceExportData}
            fileName="Attendance_Overview_Report"
            title="Attendance Overview Report"
            subtitle="Institutional attendance telemetry and daily tracking"
            summary={{
              'Average Attendance': `${summary?.overallPercentage || (trendData.length > 0 ? Math.round(trendData.reduce((acc, d) => acc + (d.attendancePercentage || 0), 0) / trendData.length) : 0)}%`,
              'Observation Days': trendData.length
            }}
            disabled={loadingAttendance || !hasExportableAttendance}
            buttonText="Export Attendance"
            size="sm"
          />
        </div>
        {loadingAttendance ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            Loading attendance data...
          </div>
        ) : (
          <AttendanceReportChart 
            trendData={trendData} 
            summary={summary} 
            groupedResults={groupedResults}
            selectedRange={attendanceDays}
            onRangeChange={setAttendanceDays}
          />
        )}
      </div>

    </div>
  );
}
