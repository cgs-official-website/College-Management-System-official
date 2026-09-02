import { prisma, logger } from '../../server.js';
import { createPayslipSchema, bulkImportPayrollSchema, updatePayrollStatusSchema } from './payroll.schema.js';
import { sendDynamicMail } from '../../services/email/email.service.js';

export const createPayslip = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const data = createPayslipSchema.parse(req.body);
  
  // Verify staff exists and is active / valid
  let targetUserId = data.staffId;
  let staff = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      collegeId,
      accountStatus: { notIn: ['suspended', 'inactive', 'deleted'] }
    }
  });

  // If not found by User ID, check if data.staffId is a Teacher ID
  if (!staff) {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: data.staffId,
        collegeId,
        deletedAt: null
      },
      include: { user: true }
    });
    if (teacher?.user && !['suspended', 'inactive', 'deleted'].includes(teacher.user.accountStatus)) {
      staff = teacher.user;
      targetUserId = teacher.user.id;
    }
  }

  if (!staff) {
    return res.status(404).json({ success: false, message: 'Active staff member not found.' });
  }

  // Check if payslip already exists for this staff, month, and year
  const existing = await prisma.payroll.findUnique({
    where: {
      staffId_month_year: {
        staffId: targetUserId,
        month: data.month,
        year: data.year
      }
    }
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Payslip for ${data.month}/${data.year} already exists for this staff member.`
    });
  }

  // Calculate totals (double check server side)
  const grossPay = data.basicPay + data.hra + data.da + data.specialAllowance;
  const totalDeductions = data.pf + data.esi + data.pt + data.tds + data.otherDeductions;
  const netPay = grossPay - totalDeductions;

  const payslip = await prisma.payroll.create({
    data: {
      collegeId,
      staffId: targetUserId,
      month: data.month,
      year: data.year,
      basicPay: data.basicPay,
      hra: data.hra,
      da: data.da,
      specialAllowance: data.specialAllowance,
      grossPay,
      pf: data.pf,
      esi: data.esi,
      pt: data.pt,
      tds: data.tds,
      otherDeductions: data.otherDeductions,
      netPay,
      status: 'Pending'
    },
    include: {
      staff: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${req.user?.id} Created manual payslip for ${data.month}/${data.year}. Staff: ${targetUserId}`);
  res.status(201).json({ success: true, message: 'Payslip created successfully.', data: payslip });
};

export const bulkImportPayrolls = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const payrollsData = bulkImportPayrollSchema.parse(req.body);
  
  let importedCount = 0;
  let skippedCount = 0;
  let errorMessages = [];

  for (const [index, data] of payrollsData.entries()) {
    try {
      let targetUserId = data.staffId;
      let staff = await prisma.user.findFirst({
        where: {
          id: targetUserId,
          collegeId,
          accountStatus: { notIn: ['suspended', 'inactive', 'deleted'] }
        }
      });

      if (!staff) {
        const teacher = await prisma.teacher.findFirst({
          where: { id: data.staffId, collegeId, deletedAt: null },
          include: { user: true }
        });
        if (teacher?.user && !['suspended', 'inactive', 'deleted'].includes(teacher.user.accountStatus)) {
          staff = teacher.user;
          targetUserId = teacher.user.id;
        }
      }
      
      if (!staff) {
        errorMessages.push(`Row ${index + 1}: Staff ID ${data.staffId} not found or inactive.`);
        skippedCount++;
        continue;
      }

      const existing = await prisma.payroll.findUnique({
        where: {
          staffId_month_year: {
            staffId: targetUserId,
            month: data.month,
            year: data.year
          }
        }
      });

      if (existing) {
        errorMessages.push(`Row ${index + 1}: Payslip for ${data.month}/${data.year} already exists for this staff.`);
        skippedCount++;
        continue;
      }

      const grossPay = data.basicPay + data.hra + data.da + data.specialAllowance;
      const totalDeductions = data.pf + data.esi + data.pt + data.tds + data.otherDeductions;
      const netPay = grossPay - totalDeductions;

      await prisma.payroll.create({
        data: {
          collegeId,
          staffId: targetUserId,
          month: data.month,
          year: data.year,
          basicPay: data.basicPay,
          hra: data.hra,
          da: data.da,
          specialAllowance: data.specialAllowance,
          grossPay,
          pf: data.pf,
          esi: data.esi,
          pt: data.pt,
          tds: data.tds,
          otherDeductions: data.otherDeductions,
          netPay,
          status: 'Pending'
        }
      });
      importedCount++;
    } catch (err) {
      errorMessages.push(`Row ${index + 1}: Failed to import - ${err.message}`);
      skippedCount++;
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${req.user?.id} Bulk imported payrolls. Imported: ${importedCount}, Skipped: ${skippedCount}`);
  res.status(201).json({ 
    success: true, 
    message: `Imported ${importedCount} payslips. Skipped ${skippedCount}.`,
    errors: errorMessages.length > 0 ? errorMessages : undefined
  });
};

export const getPayrolls = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { month, year, status } = req.query;

  const whereClause = { collegeId };
  if (month) whereClause.month = parseInt(month, 10);
  if (year) whereClause.year = parseInt(year, 10);
  if (status) whereClause.status = status;

  const payrolls = await prisma.payroll.findMany({
    where: whereClause,
    include: {
      staff: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedPayrolls = payrolls.map(p => {
    const staffName = p.staff?.name || (p.staff?.email ? p.staff.email.split('@')[0] : 'Staff');
    const allowances = (p.hra || 0) + (p.da || 0) + (p.specialAllowance || 0);
    const deductions = (p.pf || 0) + (p.esi || 0) + (p.pt || 0) + (p.tds || 0) + (p.otherDeductions || 0);
    return {
      ...p,
      allowances,
      deductions,
      staff: {
        ...p.staff,
        name: staffName
      }
    };
  });

  res.json({ success: true, data: formattedPayrolls });
};

export const updatePayrollStatus = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;
  const { status, paymentMethod, remarks } = updatePayrollStatusSchema.parse(req.body);

  const existing = await prisma.payroll.findFirst({
    where: { id, collegeId },
    include: { staff: true }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Payroll record not found.' });
  }

  const updated = await prisma.payroll.update({
    where: { id },
    data: {
      status,
      paymentMethod: status === 'Paid' ? paymentMethod : null,
      paymentDate: status === 'Paid' ? new Date() : null,
      remarks
    }
  });

  // Optional: Send Email Notification
  if (status === 'Paid') {
    try {
      await sendDynamicMail({
        templateName: 'Salary Processed',
        recipientEmail: existing.staff.email,
        collegeId: collegeId,
        variables: {
          staffName: existing.staff.name || 'Staff',
          month: existing.month.toString(),
          year: existing.year.toString(),
          netPay: updated.netPay.toString(),
        }
      });
    } catch (err) {
      logger.error(`[error] req=${req.id || ''} college=${collegeId} Failed to send payroll email: ${err.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${req.user?.id} Updated payroll ${id} status to ${status}`);
  res.json({ success: true, data: updated });
};

export const getStaffPayslips = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const staffId = req.user.id || req.user.userId;

  const payrolls = await prisma.payroll.findMany({
    where: {
      collegeId,
      staffId
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' }
    ]
  });

  const formattedPayrolls = payrolls.map(p => ({
    ...p,
    allowances: (p.hra || 0) + (p.da || 0) + (p.specialAllowance || 0),
    deductions: (p.pf || 0) + (p.esi || 0) + (p.pt || 0) + (p.tds || 0) + (p.otherDeductions || 0)
  }));

  res.json({ success: true, data: formattedPayrolls });
};
