import { prisma, logger } from '../../server.js';
import { z } from 'zod';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  status: z.string().optional(),
  contentHtml: z.string().optional(),
});

export const getTemplates = async (req, res) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      where: { collegeId: null },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error(`[EmailTemplates] Error fetching templates: ${error.message}`);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch templates' } });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const payload = templateSchema.parse(req.body);
    const newTemplate = await prisma.emailTemplate.create({
      data: {
        name: payload.name,
        subject: payload.subject,
        status: payload.status || 'Active',
        contentHtml: payload.contentHtml || '',
        collegeId: null
      }
    });
    res.status(201).json({ success: true, data: newTemplate });
  } catch (error) {
    logger.error(`[EmailTemplates] Error creating template: ${error.message}`);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = templateSchema.parse(req.body);
    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name: payload.name,
        subject: payload.subject,
        status: payload.status,
        contentHtml: payload.contentHtml
      }
    });
    res.json({ success: true, data: updatedTemplate });
  } catch (error) {
    logger.error(`[EmailTemplates] Error updating template: ${error.message}`);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.emailTemplate.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    logger.error(`[EmailTemplates] Error deleting template: ${error.message}`);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
