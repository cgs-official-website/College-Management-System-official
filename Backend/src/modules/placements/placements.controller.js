import { prisma } from '../../server.js';

export const getItems = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const items = await prisma.placement.findMany({ where: { collegeId } });
    res.json({ data: items });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const createItem = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { companyName } = req.body;
    const item = await prisma.placement.create({
      data: { collegeId, companyName }
    });
    res.status(201).json({ data: item });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    await prisma.placement.delete({
      where: { id: req.params.id, collegeId }
    });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
