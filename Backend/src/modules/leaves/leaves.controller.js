import { prisma } from '../../server.js';

export const getLeaveRequests = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const { status, role } = req.query;

    const where = { collegeId };
    if (status && status !== 'all') {
      where.status = status;
    }
    if (role) {
      where.requesterRole = role;
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const userIds = [...new Set(leaves.map(l => l.requesterUserId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentProfile: {
          select: {
            id: true,
            admissionNumber: true,
            rollNumber: true,
            department: { select: { name: true } },
            section: { select: { name: true } }
          }
        },
        teacherProfile: {
          select: {
            id: true,
            designation: true,
            department: { select: { name: true } }
          }
        }
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const formatted = leaves.map(l => {
      const user = userMap.get(l.requesterUserId);
      return {
        id: l.id,
        requesterUserId: l.requesterUserId,
        requesterRole: l.requesterRole || user?.role || 'student',
        fromDate: l.fromDate,
        toDate: l.toDate,
        reason: l.reason,
        medicalCertUrl: l.medicalCertUrl,
        status: l.status,
        reviewedBy: l.reviewedBy,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        studentName: user?.name || 'Student',
        studentEmail: user?.email || '',
        admissionNumber: user?.studentProfile?.admissionNumber || user?.teacherProfile?.id || 'N/A',
        rollNumber: user?.studentProfile?.rollNumber || '',
        department: user?.studentProfile?.department?.name || user?.teacherProfile?.department?.name || 'Academic',
        section: user?.studentProfile?.section?.name || ''
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const updateLeaveRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const reviewerUserId = req.user?.id || req.user?.userId;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Invalid status. Allowed values: approved, rejected, pending' } 
      });
    }

    // Verify existence within college
    const existing = await prisma.leaveRequest.findFirst({
      where: { id, collegeId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Leave request not found' } });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: reviewerUserId,
        updatedAt: new Date()
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
