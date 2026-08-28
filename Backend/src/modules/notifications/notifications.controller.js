import { prisma } from '../../server.js';

export const getNotifications = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const user = req.user;

    // Fetch notifications directed to this user, or targeted to their role, or broadcast 'all'
    const notifications = await prisma.notification.findMany({
      where: {
        collegeId,
        OR: [
          { userId: user.id },
          { targetRole: user.role },
          { targetRole: 'all' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ data: notifications });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const user = req.user;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, collegeId }
    });

    if (!notification) {
      return res.status(404).json({ error: { message: 'Notification not found' } });
    }

    const readBy = notification.readBy || [];
    if (!readBy.includes(user.id)) {
      readBy.push(user.id);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readBy
      }
    });

    res.json({ data: updated });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const user = req.user;

    const notifications = await prisma.notification.findMany({
      where: {
        collegeId,
        OR: [
          { userId: user.id },
          { targetRole: user.role },
          { targetRole: 'all' }
        ]
      }
    });

    for (const notif of notifications) {
      const readBy = notif.readBy || [];
      if (!readBy.includes(user.id)) {
        readBy.push(user.id);
        await prisma.notification.update({
          where: { id: notif.id },
          data: { isRead: true, readBy }
        });
      }
    }

    res.json({ data: { success: true } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};
