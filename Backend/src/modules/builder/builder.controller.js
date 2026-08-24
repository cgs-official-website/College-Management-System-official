import { prisma } from '../../server.js';
import { createEntitySchema, createFieldSchema, createSectionSchema } from './builder.schema.js';
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
    const entity = await prisma.customEntity.create({
      data: { collegeId, ...validated.data }
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

  await prisma.customEntity.delete({
    where: { id, collegeId }
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
