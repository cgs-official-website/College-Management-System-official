import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Mail, Phone, MoreVertical, Edit, Trash2, Building, Shield, Eye, Link2, Loader2, Calendar, X, RotateCcw, Download, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../contexts/AuthContext';
import { useStaff } from '../../../hooks/useStaff';
import { useDepartments } from '../../../hooks/useDepartments';
import { useRoles } from '../../../hooks/useRoles';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { StaffFormModal } from './StaffFormModal';
import { StaffDetailsModal } from './StaffDetailsModal';
import { useConfirm } from '../../../contexts/ConfirmContext';
import toast from 'react-hot-toast';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';
import { api } from '../../../services/apiClient';

const formatJoiningDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (_) {
    return 'N/A';
  }
};

export const STAFF_IMPORT_FIELDS = [
  { name: 'Employee_ID', required: true, type: 'String', description: 'Unique staff / teacher ID', example: 'TCH001' },
  { name: 'Staff_Name', required: true, type: 'String', description: 'Full name of the staff member', example: 'Kalaivaani P' },
  { name: 'Email_ID', required: true, type: 'String', description: 'Valid email, used for the account setup link (must be unique)', example: 'kalaivaani.p@example.com' },
  { name: 'Department', required: true, type: 'String', description: 'Department name (created if it does not exist)', example: 'Computer Science & Engineering' },
  { name: 'Designation', required: true, type: 'String', description: 'Job title', example: 'Assistant Professor' },
  { name: 'Date_of_Joining', required: true, type: 'Date', description: 'YYYY-MM-DD or DD-MM-YYYY', example: '2024-06-10' },
  { name: 'Mobile_Number', required: false, type: 'String', description: '10-digit mobile number', example: '9876543210' },
  { name: 'Gender', required: false, type: 'String', description: 'Male / Female / Other', example: 'Female' },
  { name: 'Date_of_Birth', required: false, type: 'Date', description: 'YYYY-MM-DD or DD-MM-YYYY', example: '1990-03-21' },
  { name: 'Employment_Type', required: false, type: 'String', description: 'Full-time, Part-time or Contract', example: 'Full-time' },
  { name: 'Qualification', required: false, type: 'String', description: 'Highest qualification', example: 'M.E., Ph.D.' },
  { name: 'Experience_Years', required: false, type: 'Number', description: 'Total years of experience', example: '8' },
  { name: 'Blood_Group', required: false, type: 'String', description: 'e.g. O+', example: 'O+' },
  { name: 'Address', required: false, type: 'String', description: 'Residential address', example: '12 Gandhiji Road' },
  { name: 'City', required: false, type: 'String', description: 'City', example: 'Erode' },
  { name: 'District', required: false, type: 'String', description: 'District', example: 'Erode' },
  { name: 'State', required: false, type: 'String', description: 'State', example: 'Tamil Nadu' },
  { name: 'Pincode', required: false, type: 'String', description: '6-digit pincode', example: '638001' },
  { name: 'Emergency_Contact_Name', required: false, type: 'String', description: 'Emergency contact person', example: 'Raman K' },
  { name: 'Emergency_Contact_Number', required: false, type: 'String', description: 'Emergency contact phone', example: '9876543211' },
];

const STAFF_IMPORT_NOTES =
  '1. Do not rename or delete header columns in row 1 of the Template sheet. ' +
  '2. Columns marked with * are required. ' +
  '3. Employee_ID and Email_ID must be unique; duplicate rows are reported with their row number. ' +
  '4. Dates can be YYYY-MM-DD or DD-MM-YYYY. ' +
  '5. Imported staff are created as teaching staff with status "pending setup"; send each one the setup link from the staff list.';

export default function HRManagement() {
  const confirm = useConfirm();
  const { userData, userRole, permissions } = useAuth();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const canCreateStaff = isAdmin || permissions?.staff?.canCreate === true;
  const canUpdateStaff = isAdmin || permissions?.staff?.canUpdate === true;
  const canDeleteStaff = isAdmin || permissions?.staff?.canDelete === true;

  const collegeId = userData?.collegeId || 'default_college_id';
  const { staff, isLoading, addStaff, updateStaff, deleteStaff, isAdding, isUpdating, isImporting, bulkImport } = useStaff(collegeId);
  const { departments = [] } = useDepartments();
  const { roles = [] } = useRoles();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedStaffType, setSelectedStaffType] = useState('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [generatingLinkId, setGeneratingLinkId] = useState(null);
  const [sendingMailId, setSendingMailId] = useState(null);
  const [mailCooldowns, setMailCooldowns] = useState({});

  useEffect(() => {
    const hasCooldowns = Object.values(mailCooldowns).some(secs => secs > 0);
    if (!hasCooldowns) return;

    const timer = setInterval(() => {
      setMailCooldowns(prev => {
        const next = { ...prev };
        let hasChanges = false;
        for (const [id, secs] of Object.entries(next)) {
          if (secs > 1) {
            next[id] = secs - 1;
            hasChanges = true;
          } else if (secs === 1) {
            delete next[id];
            hasChanges = true;
          }
        }
        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mailCooldowns]);

  const copyToClipboard = async (text, successMsg = 'Copied to clipboard!') => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast.success(successMsg);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success(successMsg);
        } catch (err) {
          console.error('Fallback copy failed', err);
          toast.error(
            <div className="flex flex-col gap-2">
              <span className="font-bold">Manual copy required:</span>
              <input readOnly value={text} className="text-xs p-1 rounded bg-slate-100 dark:bg-slate-800 border-none w-full" onClick={e => e.target.select()} />
            </div>,
            { duration: 8000 }
          );
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy', err);
      toast.error(
        <div className="flex flex-col gap-2">
          <span className="font-bold">Manual copy required:</span>
          <input readOnly value={text} className="text-xs p-1 rounded bg-slate-100 dark:bg-slate-800 border-none w-full" onClick={e => e.target.select()} />
        </div>,
        { duration: 8000 }
      );
    }
  };

  const handleGenerateSetupLink = async (member) => {
    setGeneratingLinkId(member.id);
    try {
      const response = await api.post(`/staff/${member.id}/setup-link`);
      const linkData = response?.data ?? response;
      const setupUrl = linkData?.setupUrl || linkData?.data?.setupUrl;

      if (!setupUrl) {
        throw new Error('Failed to generate setup link.');
      }

      await copyToClipboard(setupUrl, 'Teacher setup link copied to clipboard!');
    } catch (err) {
      console.error('Error generating setup link:', err);
      const message = err.response?.data?.error?.message || err.data?.error?.message || err.message || 'Failed to generate setup link.';
      toast.error(message);
    } finally {
      setGeneratingLinkId(null);
    }
  };

  const handleSendSetupMail = async (member) => {
    if (sendingMailId === member.id || mailCooldowns[member.id]) return;

    setSendingMailId(member.id);
    try {
      const response = await api.post(`/staff/${member.id}/send-setup-mail`);
      const resData = response?.data ?? response;
      const maskedEmail = resData?.maskedEmail || resData?.data?.maskedEmail || member.email;

      toast.success(`Setup link sent to ${maskedEmail}`);
      setMailCooldowns(prev => ({ ...prev, [member.id]: 30 }));
    } catch (err) {
      console.error('Error sending setup email:', err);
      const message = err.response?.data?.error?.message || err.data?.error?.message || err.message || 'Could not send the email. Please try again or use Generate Link.';
      toast.error(message);
    } finally {
      setSendingMailId(null);
    }
  };

  const departmentOptions = useMemo(() => {
    const deptSet = new Set();
    if (departments && Array.isArray(departments)) {
      departments.forEach(d => {
        if (d?.name) deptSet.add(d.name);
      });
    }
    if (staff && Array.isArray(staff)) {
      staff.forEach(s => {
        if (s?.department && s.department !== 'N/A') deptSet.add(s.department);
      });
    }
    return Array.from(deptSet).sort((a, b) => a.localeCompare(b));
  }, [departments, staff]);

  const customRoleOptions = useMemo(() => {
    if (!roles || !Array.isArray(roles)) return [];
    return roles.filter(r => !r.isSystemRole);
  }, [roles]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedRole !== 'all') count++;
    if (selectedDepartment !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (selectedStaffType !== 'all') count++;
    return count;
  }, [selectedRole, selectedDepartment, selectedStatus, selectedStaffType]);

  const handleResetFilters = () => {
    setSelectedRole('all');
    setSelectedDepartment('all');
    setSelectedStatus('all');
    setSelectedStaffType('all');
  };

  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      // 1. Search filter
      const fullName = `${member.firstName || ''} ${member.lastName || ''} ${member.name || ''}`.toLowerCase();
      const dept = (member.department || '').toLowerCase();
      const email = (member.email || '').toLowerCase();
      const tid = (member.teacherId || '').toLowerCase();
      const desig = (member.designation || '').toLowerCase();
      const search = (searchTerm || '').toLowerCase().trim();

      const matchesSearch = !search || fullName.includes(search) || dept.includes(search) || email.includes(search) || tid.includes(search) || desig.includes(search);
      if (!matchesSearch) return false;

      // 2. Staff Role Filter
      if (selectedRole !== 'all') {
        const memberRole = String(member.role || '').toLowerCase();
        const memberCustomRoleId = member.customRoleId;
        const memberCustomRoleName = String(member.customRole || '').toLowerCase();
        const memberDesig = String(member.designation || '').toLowerCase();
        const sel = selectedRole.toLowerCase();

        const isCustomRoleMatch = memberCustomRoleId === selectedRole || memberCustomRoleName === sel;
        const isStandardRoleMatch = memberRole === sel;
        const isHodMatch = (sel === 'hod') && (memberRole === 'hod' || memberDesig === 'hod' || memberDesig === 'head of department' || memberCustomRoleName === 'hod');
        const isDesigMatch = memberDesig === sel;

        if (!isStandardRoleMatch && !isCustomRoleMatch && !isHodMatch && !isDesigMatch) return false;
      }

      // 3. Department Filter
      if (selectedDepartment !== 'all') {
        const memberDept = String(member.department || '').toLowerCase();
        const targetDept = selectedDepartment.toLowerCase();
        if (memberDept !== targetDept && member.departmentId !== selectedDepartment) {
          return false;
        }
      }

      // 4. Status Filter
      if (selectedStatus !== 'all') {
        const memberStatus = String(member.status || member.accountStatus || 'active').toLowerCase();
        if (selectedStatus === 'active') {
          if (memberStatus !== 'active') return false;
        } else if (selectedStatus === 'pending_setup') {
          if (memberStatus !== 'pending_setup' && memberStatus !== 'pending') return false;
        } else if (selectedStatus === 'on_leave') {
          if (memberStatus !== 'on_leave') return false;
        } else if (selectedStatus === 'resigned') {
          if (memberStatus !== 'resigned' && memberStatus !== 'inactive') return false;
        }
      }

      // 5. Staff Category / Type Filter
      if (selectedStaffType !== 'all') {
        const isExplicitNonTeaching = member.staffType === 'non-teaching' ||
          String(member.role || '').toLowerCase() === 'staff' ||
          /admin|office|library|account|clerk|reception|driver|peon|warden|security|maintenance|store/i.test(member.designation || member.customRole || '');
        const isTeaching = !isExplicitNonTeaching;
        if (selectedStaffType === 'teaching' && !isTeaching) return false;
        if (selectedStaffType === 'non-teaching' && isTeaching) return false;
      }

      return true;
    });
  }, [staff, searchTerm, selectedRole, selectedDepartment, selectedStatus, selectedStaffType]);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (member) => {
    setEditingStaff(member);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this user?" })) {
      await deleteStaff(id);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingStaff) {
        await updateStaff({ id: editingStaff.id, data });
        setIsFormOpen(false);
      } else {
        await addStaff(data);
        setIsFormOpen(false);
        toast.success('Teacher created successfully.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleBulkImport = async (rows) => {
    const normalizedRows = rows.map(row => {
      const clean = {};
      for (const [k, v] of Object.entries(row)) {
        const keyWithoutAsterisk = k.replace(/\*+$/, '').trim();
        clean[keyWithoutAsterisk] = v;
        clean[k] = v;
      }
      return clean;
    });
    return await bulkImport(normalizedRows);
  };

  const handleExportStaff = () => {
    const listToExport = filteredStaff.length > 0 ? filteredStaff : staff;
    if (!listToExport || listToExport.length === 0) {
      toast.error('No staff records to export');
      return;
    }

    const exportData = listToExport.map(s => ({
      'Employee ID': s.employeeId || s.staffId || s.teacherId || 'N/A',
      'Staff Name': s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'N/A',
      'Email': s.email || s.emailId || s.user?.email || 'N/A',
      'Department': s.department?.name || s.department || 'General',
      'Designation': s.designation || 'Staff',
      'Role': s.customRole || (s.designation && !['teacher', 'staff'].includes(s.designation.toLowerCase()) ? s.designation : null) || (s.role === 'hod' ? 'HOD' : s.role) || (s.staffType === 'non-teaching' ? 'Non-Teaching' : 'Teaching'),
      'Staff Type': s.staffType === 'non-teaching' ? 'Non-Teaching' : 'Teaching',
      'Employment Type': s.employmentType || 'Permanent',
      'Mobile Number': s.mobileNumber || s.phone || 'N/A',
      'Date of Joining': formatJoiningDate(s.joiningDate),
      'Account Status': s.accountStatus || (s.user?.accountStatus ?? 'Active'),
      'City': s.city || 'N/A',
      'State': s.state || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Directory');
    XLSX.writeFile(wb, `Staff_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${exportData.length} staff records to Excel`);
  };

  const getRoleBadge = (role, member) => {
    // Determine the specific role display name:
    // Priority:
    // 1. member?.customRole (explicit custom role name)
    // 2. roles lookup if member?.customRoleId is present
    // 3. member?.designation (if it's not a generic default like 'Teacher' or 'Staff')
    const roleIdMatch = member?.customRoleId ? roles.find(r => r.id === member.customRoleId) : null;
    const explicitCustomRole = (member?.customRole || roleIdMatch?.name || '').trim();

    const rawDesig = (member?.designation || '').trim();
    const isGenericDesig = !rawDesig || ['teacher', 'staff', 'n/a', 'support'].includes(rawDesig.toLowerCase());
    const specificDesignation = !isGenericDesig ? rawDesig : null;

    const specificRoleName = explicitCustomRole || specificDesignation;
    const normalizedRole = String(role || member?.role || '').toLowerCase();
    const effectiveStaffType = member?.staffType || (roleIdMatch?.category === 'non_teaching' ? 'non-teaching' : null);

    // Case 1: HOD (Head of Department)
    const isHod = normalizedRole === 'hod' || 
      (specificRoleName && /^(hod|head of department)$/i.test(specificRoleName));
    if (isHod) {
      return (
        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max">
          <Shield className="w-3 h-3" /> HOD
        </span>
      );
    }

    // Case 2: Admin
    const isAdmin = normalizedRole === 'admin' || 
      (specificRoleName && /^admin(istrator)?$/i.test(specificRoleName));
    if (isAdmin) {
      return (
        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max">
          <Shield className="w-3 h-3" /> Admin
        </span>
      );
    }

    // Case 3: Specific role / designation exists (e.g. "admin office", "Library staff", "Assistant Professor", "Accountant")
    if (specificRoleName) {
      const isNonTeaching = effectiveStaffType === 'non-teaching' ||
        normalizedRole === 'staff' ||
        roleIdMatch?.category === 'non_teaching' ||
        /admin|office|library|account|clerk|reception|driver|peon|warden|security|maintenance|store|staff/i.test(specificRoleName);

      if (isNonTeaching) {
        return (
          <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 rounded-md text-xs font-bold uppercase tracking-wider w-max flex items-center gap-1">
            <Shield className="w-3 h-3" /> {specificRoleName}
          </span>
        );
      }

      // Teaching custom role / academic rank (e.g., "Assistant Professor", "Professor", "Lecturer")
      return (
        <span className="px-2.5 py-1 bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 rounded-md text-xs font-bold uppercase tracking-wider w-max flex items-center gap-1">
          {specificRoleName}
        </span>
      );
    }

    // Case 4: Non-teaching staff without specific role name
    if (normalizedRole === 'staff' || effectiveStaffType === 'non-teaching') {
      return (
        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 rounded-md text-xs font-bold uppercase tracking-wider w-max flex items-center gap-1">
          <Shield className="w-3 h-3" /> Staff
        </span>
      );
    }

    // Case 5: Faculty
    if (normalizedRole === 'faculty') {
      return (
        <span className="px-2.5 py-1 bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400 rounded-md text-xs font-bold uppercase tracking-wider w-max">
          Faculty
        </span>
      );
    }

    // Case 6: Standard Teacher
    return (
      <span className="px-2.5 py-1 bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 rounded-md text-xs font-bold uppercase tracking-wider w-max">
        Teacher
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">HR & Staff Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage all college employees and faculty.</p>
        </div>
        <div className="flex gap-2">
          {canCreateStaff && (
            <ExcelUploadButton
              onUpload={bulkImport}
              isLoading={isImporting}
              title="Import Staff"
              description="Upload an Excel (.xlsx, .xls) or CSV file. Required: Employee ID, name, email, department, designation and joining date."
              fields={STAFF_IMPORT_FIELDS}
              notes={STAFF_IMPORT_NOTES}
              sampleFileName="staff_import_template.xlsx"
            />
          )}
          <Button 
            variant="outline" 
            onClick={handleExportStaff}
            className="flex items-center gap-2"
            title="Export staff records to Excel"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export Staff
          </Button>
          {canCreateStaff && (
            <Button onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar & Filter Drawer */}
      <div className="bg-white dark:bg-[#0A0F1C] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-all">
        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input 
              placeholder="Search by name, email, department, or staff ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 mb-0"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset
              </Button>
            )}
            <Button
              variant={isFilterOpen || activeFilterCount > 0 ? "primary" : "secondary"}
              onClick={() => setIsFilterOpen(prev => !prev)}
              className={`px-4 relative transition-all ${
                isFilterOpen || activeFilterCount > 0
                  ? 'ring-2 ring-primary-500/20 shadow-sm'
                  : ''
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-white text-primary-600 dark:bg-black dark:text-primary-300 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Expandable Filter Options Drawer */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-4 sm:p-5"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Filter Staff By:
                  </span>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    ({filteredStaff.length} of {staff.length} staff members shown)
                  </span>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear all filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Staff Role */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Staff Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <optgroup label="Standard Roles">
                      <option value="teacher">Teacher</option>
                      <option value="hod">Head of Department (HOD)</option>
                      <option value="faculty">Faculty</option>
                      <option value="staff">Non-Teaching Staff</option>
                      <option value="admin">Admin</option>
                    </optgroup>
                    {customRoleOptions.length > 0 && (
                      <optgroup label="Custom Roles">
                        {customRoleOptions.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* 2. Department */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer"
                  >
                    <option value="all">All Departments</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Status */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending_setup">Pending Setup</option>
                    <option value="on_leave">On Leave</option>
                    <option value="resigned">Resigned / Inactive</option>
                  </select>
                </div>

                {/* 4. Staff Category */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Staff Category
                  </label>
                  <select
                    value={selectedStaffType}
                    onChange={(e) => setSelectedStaffType(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="teaching">Teaching Staff</option>
                    <option value="non-teaching">Non-Teaching Staff</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Chips */}
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Active Filters:
                  </span>
                  {selectedRole !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30">
                      Role: {customRoleOptions.find(r => r.id === selectedRole)?.name || selectedRole}
                      <button onClick={() => setSelectedRole('all')} className="hover:text-primary-900 dark:hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedDepartment !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                      Dept: {selectedDepartment}
                      <button onClick={() => setSelectedDepartment('all')} className="hover:text-emerald-900 dark:hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                      Status: {selectedStatus.replace('_', ' ')}
                      <button onClick={() => setSelectedStatus('all')} className="hover:text-amber-900 dark:hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedStaffType !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                      Category: {selectedStaffType === 'teaching' ? 'Teaching' : 'Non-Teaching'}
                      <button onClick={() => setSelectedStaffType('all')} className="hover:text-purple-900 dark:hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Staff Member</th>
                <th className="p-4">Staff ID</th>
                <th className="p-4">Role & Dept</th>
                <th className="p-4">Contact Details</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                [1, 2, 3, 4].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="p-4 pl-6"><div className="h-10 w-48 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-20 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-24 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-32 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-16 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4 pr-6"></td>
                  </tr>
                ))
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3 text-slate-400">
                        <Filter className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 dark:text-white text-base mb-1">No matching staff members found</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        {activeFilterCount > 0 || searchTerm
                          ? 'Try adjusting your search criteria or resetting your active filters.'
                          : 'No staff members have been added to the directory yet.'}
                      </p>
                      {(activeFilterCount > 0 || searchTerm) && (
                        <Button variant="secondary" size="sm" onClick={() => { handleResetFilters(); setSearchTerm(''); }}>
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {member.firstName?.charAt(0) || member.name?.charAt(0) || 'U'}{member.lastName?.charAt(0) || ''}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{member.firstName || member.name} {member.lastName || ''}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                            {member.designation && member.designation !== 'Teacher' && member.designation !== 'Staff' && (
                              <>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{member.designation}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                              </>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              Joined: {formatJoiningDate(member.joiningDate || member.joinDate || member.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {member.teacherId ? (
                        <span className="inline-flex items-center px-2.5 py-1 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 rounded-md text-xs font-bold font-mono tracking-wider">
                          {member.teacherId}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-600 font-medium">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        {getRoleBadge(member.role, member)}
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building className="w-3 h-3" /> {member.department || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {member.email}</div>
                        {member.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {member.phone}</div>}
                      </div>
                    </td>
                    <td className="p-4">
                      {(member.status || member.accountStatus || 'unknown') === 'active' ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span> {(member.status || member.accountStatus || 'unknown').replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        {((member.accountStatus || member.status) === 'pending_setup') && (
                          <>
                            <button
                              onClick={() => handleGenerateSetupLink(member)}
                              disabled={generatingLinkId === member.id}
                              className="inline-flex items-center p-2 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 border border-primary-200 dark:border-primary-500/30 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                              title="Generate Setup Link"
                              aria-label="Generate Setup Link"
                            >
                              {generatingLinkId === member.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Link2 className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              onClick={() => handleSendSetupMail(member)}
                              disabled={sendingMailId === member.id || !!mailCooldowns[member.id]}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              title={mailCooldowns[member.id] ? `Please wait ${mailCooldowns[member.id]}s before resending` : "Send Setup Email"}
                            >
                              {sendingMailId === member.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {sendingMailId === member.id
                                  ? 'Sending...'
                                  : mailCooldowns[member.id]
                                    ? `Sent (${mailCooldowns[member.id]}s)`
                                    : 'Send Mail'}
                              </span>
                            </button>
                          </>
                        )}
                        <button onClick={() => setViewingStaff(member)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm" title="View Profile">
                          <Eye className="w-4 h-4" />
                        </button>
                        {canUpdateStaff && (
                          <button onClick={() => handleOpenEdit(member)} className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteStaff && (
                          <button onClick={() => handleDelete(member.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}

            </tbody>
          </table>
        </div>
      </div>

      <StaffFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingStaff}
        isLoading={isAdding || isUpdating}
      />

      <StaffDetailsModal
        isOpen={!!viewingStaff}
        onClose={() => setViewingStaff(null)}
        staff={viewingStaff}
      />
    </div>
  );
}
