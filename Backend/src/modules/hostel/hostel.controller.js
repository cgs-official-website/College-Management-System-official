import { prisma } from '../../server.js';

export const getItems = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const items = await prisma.hostelBlock.findMany({ where: { collegeId } });
    res.json({ data: items });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const createItem = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { name } = req.body;
    const item = await prisma.hostelBlock.create({
      data: { collegeId, name }
    });
    res.status(201).json({ data: item });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    await prisma.hostelBlock.delete({
      where: { id: req.params.id, collegeId }
    });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
