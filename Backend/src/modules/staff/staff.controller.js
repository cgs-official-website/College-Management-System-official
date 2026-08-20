import { prisma } from '../../server.js';

export const getStaff = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const staff = await prisma.teacher.findMany({
      where: { collegeId, deletedAt: null },
      include: {
        user: { select: { email: true, name: true, role: true } },
        department: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    // Format to match frontend expectations
    const formattedStaff = staff.map(t => ({
      id: t.id,
      name: t.user?.name || 'Unknown',
      email: t.user?.email,
      department: t.department?.name,
      designation: t.designation,
      joiningDate: t.joiningDate,
      salaryGrade: t.salaryGrade,
      userId: t.userId,
    }));
    res.json({ data: formattedStaff });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const createStaff = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    // In a real system we'd create the User and Teacher records in a transaction
    // For now we'll simulate success
    res.status(201).json({ data: { id: 'new-staff', ...req.body } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const updateStaff = async (req, res) => {
  try {
    // Simulated update
    res.json({ data: { id: req.params.id, ...req.body } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    // Simulated delete
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
