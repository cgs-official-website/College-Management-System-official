import { prisma } from '../../server.js';

export const getDynamicRecords = async (req, res) => {
  const collegeId = req.user.collegeId;
  const { entitySlug } = req.params;

  const entity = await prisma.customEntity.findUnique({
    where: { collegeId_slug: { collegeId, slug: entitySlug } }
  });
  if (!entity) return res.status(404).json({ success: false, message: 'Entity not found' });

  const records = await prisma.customRecord.findMany({
    where: { collegeId, entityId: entity.id }
  });
  res.json({ success: true, data: records });
};

export const createDynamicRecord = async (req, res) => {
  const collegeId = req.user.collegeId;
  const { entitySlug } = req.params;
  const data = req.body;

  const entity = await prisma.customEntity.findUnique({
    where: { collegeId_slug: { collegeId, slug: entitySlug } }
  });
  if (!entity) return res.status(404).json({ success: false, message: 'Entity not found' });

  const record = await prisma.customRecord.create({
    data: { collegeId, entityId: entity.id, data }
  });
  res.status(201).json({ success: true, data: record });
};

export const updateDynamicRecord = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  // Ideally, merge with existing data
  const existing = await prisma.customRecord.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Record not found' });

  const record = await prisma.customRecord.update({
    where: { id },
    data: { data: { ...existing.data, ...data } }
  });
  res.json({ success: true, data: record });
};

export const deleteDynamicRecord = async (req, res) => {
  const { id } = req.params;
  await prisma.customRecord.delete({ where: { id } });
  res.json({ success: true, message: 'Record deleted successfully' });
};
