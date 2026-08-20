import { prisma } from '../../server.js';

export const getLibraryItems = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const items = await prisma.libraryItem.findMany({
      where: { collegeId }
    });
    res.json({ data: items });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const createLibraryItem = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { title } = req.body;
    const item = await prisma.libraryItem.create({
      data: { collegeId, title }
    });
    res.status(201).json({ data: item });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const deleteLibraryItem = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    await prisma.libraryItem.delete({
      where: { id: req.params.id, collegeId }
    });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
