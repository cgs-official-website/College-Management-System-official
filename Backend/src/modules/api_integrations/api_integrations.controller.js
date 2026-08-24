import { prisma, logger } from '../../server.js';
import { integrationSchema } from './api_integrations.schema.js';

export const getIntegrations = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { message: 'Tenant context missing' } });
  }

  const integrations = await prisma.apiIntegration.findMany({
    where: { collegeId }
  });

  res.json({ success: true, data: integrations });
};

export const saveIntegration = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { message: 'Tenant context missing' } });
  }

  const payload = integrationSchema.parse(req.body);

  const integration = await prisma.apiIntegration.upsert({
    where: {
      collegeId_provider: {
        collegeId,
        provider: payload.provider
      }
    },
    update: {
      apiKey: payload.apiKey,
      apiSecret: payload.apiSecret,
      webhookUrl: payload.webhookUrl,
      isActive: payload.isActive
    },
    create: {
      collegeId,
      provider: payload.provider,
      apiKey: payload.apiKey,
      apiSecret: payload.apiSecret,
      webhookUrl: payload.webhookUrl,
      isActive: payload.isActive
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Updated API integration ${payload.provider}`);
  res.json({ success: true, data: integration });
};
