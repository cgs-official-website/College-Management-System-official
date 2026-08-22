import { prisma } from '../../server.js';

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
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: items });
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
        category,
        priority: priority || 'medium',
        status: 'open'
      }
    });
    res.status(201).json({ data: item });
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
