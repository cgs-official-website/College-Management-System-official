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
    const { title, audience } = req.body;
    const notice = await prisma.notice.create({
      data: { collegeId, title, audience }
    });
    res.status(201).json({ data: notice });
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
