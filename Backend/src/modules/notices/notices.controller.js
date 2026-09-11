import { prisma } from '../../server.js';

export const getNotices = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const notices = await prisma.notice.findMany({
      where: { collegeId }
    });
    res.json({ data: notices });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const createNotice = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { title, content, priority, targetAudience } = req.body;
    const notice = await prisma.notice.create({
      data: { 
        collegeId, 
        title, 
        content: content || '', 
        priority: priority || 'normal', 
        targetAudience: targetAudience || 'all' 
      }
    });
    res.status(201).json({ data: notice });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const updateNotice = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { id } = req.params;
    const { title, content, priority, targetAudience } = req.body;

    const existing = await prisma.notice.findFirst({
      where: { id, collegeId }
    });

    if (!existing) {
      return res.status(404).json({ error: { message: 'Notice not found' } });
    }

    const updated = await prisma.notice.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(priority && { priority }),
        ...(targetAudience && { targetAudience })
      }
    });

    res.json({ data: updated });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const deleteNotice = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    await prisma.notice.delete({
      where: { id: req.params.id, collegeId }
    });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
