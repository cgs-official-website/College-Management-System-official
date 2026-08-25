import { prisma, logger } from '../../server.js';
import { generatePayrollSchema, updatePayrollStatusSchema } from './payroll.schema.js';
import { sendDynamicMail } from '../../services/email/email.service.js';

export const generatePayroll = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { month, year } = generatePayrollSchema.parse(req.body);
  
  // Find all active staff in the college
  const activeStaff = await prisma.user.findMany({
    where: {
      collegeId,
      role: { in: ['teacher', 'staff'] },
      isActive: true
    }
  });
  
  if (activeStaff.length === 0) {
    return res.status(400).json({ success: false, message: 'No active staff found to generate payroll.' });
  }

  // Find existing payrolls for the given month/year
  const existingPayrolls = await prisma.payroll.findMany({
    where: {
      collegeId,
      month,
      year
    },
    select: { staffId: true }
  });
  const existingStaffIds = new Set(existingPayrolls.map(p => p.staffId));

  let generatedCount = 0;
  let duplicateCount = 0;

  for (const staff of activeStaff) {
    if (existingStaffIds.has(staff.id)) {
      duplicateCount++;
      continue;
    }

    // Default basic pay (in a real system this would come from the staff profile)
    const basicPay = 50000;
    const allowances = 5000;
    const deductions = 2000;
    const netPay = basicPay + allowances - deductions;

    await prisma.payroll.create({
      data: {
        collegeId,
        staffId: staff.id,
        month,
        year,
        basicPay,
        allowances,
        deductions,
        netPay,
        status: 'Pending'
      }
    });
    generatedCount++;
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${req.user?.id} Generated payroll for ${month}/${year}. Count: ${generatedCount}, Duplicates: ${duplicateCount}`);
  res.status(201).json({ success: true, message: `Generated ${generatedCount} payrolls. Skipped ${duplicateCount} duplicates.` });
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
        select: { id: true, firstName: true, lastName: true, email: true, employeeId: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: payrolls });
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
          staffName: `${existing.staff.firstName} ${existing.staff.lastName}`,
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

  res.json({ success: true, data: payrolls });
};
