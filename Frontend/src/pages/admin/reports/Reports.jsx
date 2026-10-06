import React, { useState, useMemo } from 'react';
import { Download, Users, Wallet, GraduationCap, Calendar } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useStudents } from '../../../hooks/useStudents';
import { useStaff } from '../../../hooks/useStaff';
import { useFees } from '../../../hooks/useFees';
import { Button } from '../../../components/ui/Button';
import { toast } from 'react-hot-toast';
import { useAttendanceReport } from '../../../modules/reports/useAttendanceReport';
import AttendanceReportChart from '../../../modules/reports/AttendanceReportChart';
import DemographicsChart from '../../../modules/reports/DemographicsChart';
import StaffOverviewChart from '../../../modules/reports/StaffOverviewChart';
import FinancialSummaryChart from '../../../modules/reports/FinancialSummaryChart';

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

  const [isExporting, setIsExporting] = useState(null);

  // Helper function to export array of objects to CSV
  const exportToCSV = (data, filename) => {
    if (!data || !data.length) {
      toast.error("No data available to export.");
      setIsExporting(null);
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header] !== undefined && row[header] !== null ? row[header] : 'N/A';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsExporting(null);
  };

  // Export handlers
  const generateStudentReport = () => {
    setIsExporting('students');
    const exportData = students.map(s => ({
      ID: s.id,
      FirstName: s.firstName,
      LastName: s.lastName,
      Email: s.email || 'N/A',
      Phone: s.phone || 'N/A',
      Class: s.class,
      Section: s.section,
      Gender: s.gender,
      JoinDate: s.createdAt?.toDate ? new Date(s.createdAt.toDate()).toLocaleDateString() : (s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A')
    }));
    exportToCSV(exportData, 'Student_Demographics_Report');
  };

  const generateStaffReport = () => {
    setIsExporting('staff');
    const exportData = staff.map(s => ({
      ID: s.id,
      Name: `${s.firstName} ${s.lastName}`,
      Role: s.role,
      Department: s.department,
      Email: s.email,
      Phone: s.phone || 'N/A',
      Status: s.status,
      JoinDate: s.joinDate
    }));
    exportToCSV(exportData, 'Staff_Directory_Report');
  };

  const generateFinancialReport = () => {
    setIsExporting('financial');
    if (!fees || !fees.length) {
      toast.error("No fee records available to export.");
      setIsExporting(null);
      return;
    }
    const exportData = fees.map(f => ({
      TransactionID: f.id || 'N/A',
      StudentName: f.studentName || f.student?.user?.name || 'N/A',
      Class: f.studentClass || f.student?.course?.name || 'N/A',
      FeeType: f.feeType || 'Tuition Fee',
      AmountDue: f.amountDue ?? f.amount ?? 0,
      AmountPaid: f.amountPaid ?? 0,
      DueDate: f.dueDate || 'N/A',
      Status: (f.status || 'Pending').toUpperCase(),
      PaymentMethod: f.paymentMethod || 'N/A'
    }));
    exportToCSV(exportData, 'Financial_Fee_Report');
  };

  const generateAttendanceReport = () => {
    setIsExporting('attendance');
    const exportData = trendData.map(day => ({
      Date: day.date,
      PresentCount: day.presentCount,
      AbsentCount: day.absentCount,
      LateCount: day.lateCount,
      AttendancePercentage: `${day.attendancePercentage}%`
    }));
    
    if (exportData && exportData.length > 0) {
      exportToCSV(exportData, 'Attendance_Trend_Report');
    } else {
      toast.error("No attendance data available to export.");
      setIsExporting(null);
    }
  };

  // --- Data Aggregations for Charts --- //

  const { studentsByClass, studentsByGender } = useMemo(() => {
    if (!students?.length) return { studentsByClass: [], studentsByGender: [] };
    const cMap = {};
    const gMap = {};
    
    students.forEach(s => {
      const cls = s.class || 'Unknown';
      cMap[cls] = (cMap[cls] || 0) + 1;
      
      const gen = s.gender || 'Unknown';
      gMap[gen] = (gMap[gen] || 0) + 1;
    });
    
    return {
      studentsByClass: Object.keys(cMap).map(k => ({ name: k, count: cMap[k] })),
      studentsByGender: Object.keys(gMap).map(k => ({ name: k, value: gMap[k] }))
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
            Visual insights and data exports for your institution.
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
          <Button 
            size="sm" 
            variant="outline" 
            onClick={generateStudentReport} 
            isLoading={isExporting === 'students'} 
            disabled={loadingStudents}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
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
          <Button 
            size="sm" 
            variant="outline" 
            onClick={generateStaffReport} 
            isLoading={isExporting === 'staff'} 
            disabled={loadingStaff}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
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
          <Button 
            size="sm" 
            variant="outline" 
            onClick={generateFinancialReport} 
            isLoading={isExporting === 'financial'} 
            disabled={loadingFees || !fees?.length}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Fee Report
          </Button>
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
          <Button 
            size="sm" 
            variant="outline" 
            onClick={generateAttendanceReport} 
            isLoading={isExporting === 'attendance'} 
            disabled={loadingAttendance || !hasExportableAttendance}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Attendance
          </Button>
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
