import { prisma } from '../../server.js';
import { createEntitySchema, createFieldSchema, createSectionSchema, updateFieldSchema } from './builder.schema.js';
import fs from 'fs';

export const getEntities = async (req, res) => {
  const collegeId = req.user.collegeId;
  const entities = await prisma.customEntity.findMany({
    where: { collegeId },
    include: { fields: true }
  });
  res.json({ success: true, data: entities });
};

export const createEntity = async (req, res) => {
  const collegeId = req.user.collegeId;
  const validated = createEntitySchema.safeParse(req.body);
  if (!validated.success) return res.status(400).json({ success: false, errors: validated.error.errors });

  try {
    const entity = await prisma.$transaction(async (tx) => {
      const newEntity = await tx.customEntity.create({
        data: { collegeId, ...validated.data }
      });

      await tx.module.create({
        data: {
          key: `custom_${collegeId}_${newEntity.slug}`,
          label: newEntity.name
        }
      });

      return newEntity;
    });

    res.status(201).json({ success: true, data: entity });
  } catch (error) {
    fs.writeFileSync('C:\\College-Management-System-official\\Backend\\debug_error.log', JSON.stringify({
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    }, null, 2));
    
    console.error("CREATE ENTITY ERROR:", error);
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A custom module with this name already exists.' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEntity = async (req, res) => {
  const collegeId = req.user.collegeId;
  const { id } = req.params;

  const entity = await prisma.customEntity.findFirst({
    where: { id, collegeId }
  });

  if (!entity) return res.status(404).json({ success: false, message: 'Module not found' });

  await prisma.$transaction(async (tx) => {
    await tx.customEntity.delete({
      where: { id }
    });
    
    await tx.module.deleteMany({
      where: { key: `custom_${collegeId}_${entity.slug}` }
    });
  });

  res.json({ success: true, message: 'Module deleted successfully' });
};

export const getFieldsForModel = async (req, res) => {
  const collegeId = req.user.collegeId;
  const { model } = req.params;

  const [fields, sections] = await Promise.all([
    prisma.customFieldDef.findMany({
      where: {
        collegeId,
        OR: [
          { hardcodedModel: model },
          { entity: { slug: model } }
        ]
      },
      orderBy: { order: 'asc' }
    }),
    prisma.customSection.findMany({
      where: {
        collegeId,
        OR: [
          { hardcodedModel: model },
          { entity: { slug: model } }
        ]
      },
      orderBy: { order: 'asc' }
    })
  ]);

  res.json({ success: true, data: { fields, sections } });
};

export const createField = async (req, res) => {
  const collegeId = req.user.collegeId;
  const validated = createFieldSchema.safeParse(req.body);
  if (!validated.success) return res.status(400).json({ success: false, errors: validated.error.errors });

  try {
    const field = await prisma.customFieldDef.create({
      data: { collegeId, ...validated.data }
    });
    res.status(201).json({ success: true, data: field });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A field with this key already exists for this module.' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSection = async (req, res) => {
  const collegeId = req.user.collegeId;
  const validated = createSectionSchema.safeParse(req.body);
  if (!validated.success) return res.status(400).json({ success: false, errors: validated.error.errors });

  try {
    const section = await prisma.customSection.create({
      data: { collegeId, ...validated.data }
    });
    res.status(201).json({ success: true, data: section });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A section with this name already exists.' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSection = async (req, res) => {
  const collegeId = req.user.collegeId;
  const { id } = req.params;

  await prisma.customSection.delete({
    where: { id, collegeId }
  });
  res.json({ success: true, message: 'Section deleted successfully' });
};

export const updateField = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  if (!collegeId) return res.status(404).json({ success: false, message: 'Field not found' });

  const validated = updateFieldSchema.safeParse(req.body);
  if (!validated.success) return res.status(400).json({ success: false, errors: validated.error.errors });

  const existing = await prisma.customFieldDef.findFirst({
    where: { id, collegeId }
  });
  if (!existing) return res.status(404).json({ success: false, message: 'Field not found' });

  if (validated.data.sectionId) {
    const section = await prisma.customSection.findFirst({
      where: { id: validated.data.sectionId, collegeId }
    });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
  }

  const updateData = {};
  if (validated.data.name !== undefined) updateData.name = validated.data.name;
  if (validated.data.isRequired !== undefined) updateData.isRequired = validated.data.isRequired;
  if (validated.data.options !== undefined) updateData.options = validated.data.options;
  if (validated.data.sectionId !== undefined) updateData.sectionId = validated.data.sectionId;
  if (validated.data.order !== undefined) updateData.order = validated.data.order;

  const updated = await prisma.customFieldDef.update({
    where: { id },
    data: updateData
  });

  res.json({ success: true, data: updated });
};

export const deleteField = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  if (!collegeId) return res.status(404).json({ success: false, message: 'Field not found' });

  const existing = await prisma.customFieldDef.findFirst({
    where: { id, collegeId }
  });
  if (!existing) return res.status(404).json({ success: false, message: 'Field not found' });

  await prisma.customFieldDef.delete({ where: { id } });
  res.json({ success: true, message: 'Field deleted successfully' });
};
