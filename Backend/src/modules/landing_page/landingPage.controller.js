import { prisma } from '../../server.js';

export const getLandingPageContent = async (req, res) => {
  try {
    let content = await prisma.landingPageContent.findFirst();
    if (!content) {
      content = await prisma.landingPageContent.create({ data: {} });
    }
    res.json({ status: 'success', data: content });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch landing page content', error: error.message });
  }
};

export const updateLandingPageContent = async (req, res) => {
  try {
    const { heroBadge, heroTitle, heroSubtitle, aboutText, features, stats, contactEmail, contactPhone, contactAddress } = req.body;
    let content = await prisma.landingPageContent.findFirst();
    
    if (content) {
      content = await prisma.landingPageContent.update({
        where: { id: content.id },
        data: { heroBadge, heroTitle, heroSubtitle, aboutText, features, stats, contactEmail, contactPhone, contactAddress }
      });
    } else {
      content = await prisma.landingPageContent.create({
        data: { heroBadge, heroTitle, heroSubtitle, aboutText, features, stats, contactEmail, contactPhone, contactAddress }
      });
    }
    
    res.json({ status: 'success', data: content });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update landing page content', error: error.message });
  }
};
