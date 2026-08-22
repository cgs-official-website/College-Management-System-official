import { prisma } from '../../server.js';

export const getPayroll = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { userId, role } = req.user;
    
    // We only support teacher payroll view for now
    if (role === 'admin' || role === 'superadmin') {
      return res.status(403).json({ error: { message: 'Only faculty can view personal payroll here.' } });
    }

    const records = await prisma.payrollRecord.findMany({
      where: { collegeId, userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: records });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};
