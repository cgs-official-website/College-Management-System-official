import { prisma } from '../../lib/prisma.js';

export const getItems = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { userId, role } = req.user;
    
    // If not admin, only fetch own complaints
    const where = { collegeId };
    if (role !== 'superadmin' && role !== 'admin') {
      where.userId = userId;
    }
    
    const items = await prisma.complaint.findMany({ 
      where,
      include: {
        user: {
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
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = items.map(c => ({
      id: c.id,
      collegeId: c.collegeId,
      userId: c.userId,
      subject: c.subject,
      description: c.description,
      category: c.category,
      priority: c.priority,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      resolvedAt: c.resolvedAt,
      studentName: c.user?.name || 'Student',
      studentEmail: c.user?.email || '',
      studentId: c.user?.studentProfile?.admissionNumber || c.user?.studentProfile?.rollNumber || 'N/A',
      admissionNumber: c.user?.studentProfile?.admissionNumber || 'N/A',
      rollNumber: c.user?.studentProfile?.rollNumber || '',
      department: c.user?.studentProfile?.department?.name || 'General',
      section: c.user?.studentProfile?.section?.name || ''
    }));

    res.json({ data: formatted });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const createItem = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { userId } = req.user;
    const { subject, description, category, priority } = req.body;
    
    const item = await prisma.complaint.create({
      data: { 
        collegeId, 
        userId,
        subject, 
        description,
        category: category || 'General',
        priority: priority || 'medium',
        status: 'open'
      }
    });
    res.status(201).json({ data: item });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { id } = req.params;
    const { status, subject, description, priority, category } = req.body;

    const existing = await prisma.complaint.findFirst({
      where: { id, collegeId }
    });

    if (!existing) {
      return res.status(404).json({ error: { message: 'Complaint not found' } });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(status === 'resolved' || status === 'closed' ? { resolvedAt: new Date() } : {}),
        ...(subject && { subject }),
        ...(description && { description }),
        ...(priority && { priority }),
        ...(category && { category })
      }
    });

    res.json({ data: updated });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    await prisma.complaint.delete({
      where: { id: req.params.id, collegeId }
    });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

