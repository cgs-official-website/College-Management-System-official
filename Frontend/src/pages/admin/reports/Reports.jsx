import React, { useState } from 'react';
import { FileText, Download, Users, Wallet, Calendar, GraduationCap } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useStudents } from '../../../hooks/useStudents';
import { useStaff } from '../../../hooks/useStaff';
import { useFees } from '../../../hooks/useFees';
import { Button } from '../../../components/ui/Button';
import { toast } from 'react-hot-toast';

export default function Reports() {
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  
  // Fetch data required for reports
  const { students, isLoading: loadingStudents } = useStudents(collegeId);
  const { staff, isLoading: loadingStaff } = useStaff(collegeId);
  const { fees, isLoading: loadingFees } = useFees(collegeId);

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
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add rows
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        // Escape quotes and wrap in quotes to handle commas in data
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
      JoinDate: s.createdAt?.toDate ? new Date(s.createdAt.toDate()).toLocaleDateString() : 'N/A'
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
    const exportData = fees.map(f => ({
      TransactionID: f.id,
      StudentName: f.studentName,
      Class: f.studentClass,
      FeeType: f.feeType,
      Amount: f.amount,
      DueDate: f.dueDate,
      Status: f.status,
      PaymentMethod: f.paymentMethod || 'N/A'
    }));
    exportToCSV(exportData, 'Financial_Fee_Report');
  };

  const reportCards = [
    {
      id: 'students',
      title: 'Student Demographics',
      description: 'Comprehensive list of all enrolled students, their classes, and contact info.',
      icon: GraduationCap,
      color: 'text-primary-500',
      bg: 'bg-primary-50 dark:bg-primary-500/10',
      action: generateStudentReport,
      loading: loadingStudents
    },
    {
      id: 'staff',
      title: 'Staff Directory',
      description: 'Complete record of all teachers, HODs, and administrative staff.',
      icon: Users,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      action: generateStaffReport,
      loading: loadingStaff
    },
    {
      id: 'financial',
      title: 'Financial & Fee Summary',
      description: 'Export all fee records, including pending dues and paid transactions.',
      icon: Wallet,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      action: generateFinancialReport,
      loading: loadingFees
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Generate and export data for your institution.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {reportCards.map((report) => (
          <div key={report.id} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${report.bg}`}>
                <report.icon className={`w-6 h-6 ${report.color}`} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{report.title}</h3>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 flex-1">
              {report.description}
            </p>

            <Button 
              className="w-full justify-center" 
              onClick={report.action}
              isLoading={isExporting === report.id}
              disabled={report.loading}
            >
              <Download className="w-4 h-4 mr-2" />
              {report.loading ? 'Loading Data...' : 'Export CSV'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
