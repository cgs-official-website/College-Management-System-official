import { prisma } from '../../server.js';

export const getAssets = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const assets = await prisma.infrastructureAsset.findMany({
      where: { collegeId }
    });
    res.json({ data: assets });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const createAsset = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { name } = req.body;
    const asset = await prisma.infrastructureAsset.create({
      data: { collegeId, name }
    });
    res.status(201).json({ data: asset });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    await prisma.infrastructureAsset.delete({
      where: { id: req.params.id, collegeId }
    });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
