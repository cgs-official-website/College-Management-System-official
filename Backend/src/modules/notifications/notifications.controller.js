import { prisma } from '../../lib/prisma.js';

export async function getTargetRolesForUser(user) {
  if (!user) return ['all', 'everyone'];
  const r = (user.role || '').toLowerCase();
  const roles = new Set([r, 'all', 'everyone']);
  if (r === 'teacher') {
    roles.add('teachers');
    roles.add('faculty');
  } else if (r === 'student') {
    roles.add('students');
  } else if (r === 'hod') {
    roles.add('hods');
    roles.add('teacher');
    roles.add('teachers');
    roles.add('faculty');
  } else if (r === 'admin' || r === 'superadmin') {
    roles.add('admin');
    roles.add('admins');
    roles.add('superadmin');
  } else if (r === 'staff') {
    roles.add('staffs');
  }

  // Include custom role name if user has customRoleId
  if (user.customRoleId) {
    try {
      const customRole = await prisma.role.findUnique({
        where: { id: user.customRoleId },
        select: { name: true }
      });
      if (customRole?.name) {
        const cName = customRole.name.toLowerCase().trim();
        roles.add(cName);
        roles.add(cName.replace(/\s+/g, '_'));
      }
    } catch (_) {}
  }

  return Array.from(roles);
}

export const getNotifications = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const user = req.user;

    if (!collegeId || !user) {
      return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true' || req.query.unread === 'true';

    const userRoles = await getTargetRolesForUser(user);

    // Unread filter:
    // - Direct user notification: readAt is null, isRead is false, and user.id is not in readBy
    // - Broadcast notification (userId is null): user.id is not in readBy
    const unreadCondition = {
      OR: [
        {
          userId: user.id,
          readAt: null,
          isRead: false,
          NOT: { readBy: { has: user.id } }
        },
        {
          userId: null,
          targetRole: { in: userRoles },
          NOT: { readBy: { has: user.id } }
        }
      ]
    };

    const allRecipientsCondition = {
      OR: [
        { userId: user.id },
        { targetRole: { in: userRoles } }
      ]
    };

    const where = {
      collegeId,
      ...(unreadOnly ? unreadCondition : allRecipientsCondition)
    };

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    // Format output with isRead computed specifically for this user
    const formatted = notifications.map((n) => {
      const isRead = n.userId
        ? Boolean(n.readAt || n.isRead || n.readBy?.includes(user.id))
        : Boolean(n.readBy?.includes(user.id));
      return {
        ...n,
        isRead
      };
    });

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Notifications] getNotifications error:', error);
    res.json({ success: false, data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const user = req.user;

    if (!collegeId || !user) {
      return res.json({ success: true, data: { unreadCount: 0, count: 0 } });
    }

    const userRoles = await getTargetRolesForUser(user);
    const unreadCount = await prisma.notification.count({
      where: {
        collegeId,
        OR: [
          {
            userId: user.id,
            readAt: null,
            isRead: false,
            NOT: { readBy: { has: user.id } }
          },
          {
            userId: null,
            targetRole: { in: userRoles },
            NOT: { readBy: { has: user.id } }
          }
        ]
      }
    });

    res.json({ success: true, data: { unreadCount, count: unreadCount } });
  } catch (error) {
    console.error('[Notifications] getUnreadCount error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const user = req.user;
    const { id } = req.params;

    if (!collegeId || !user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const isSuperadmin = user.role === 'superadmin';
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        ...(isSuperadmin ? {} : { collegeId })
      }
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: { message: 'Notification not found' } });
    }

    // Only recipient, college admin, or superadmin can mark it
    const isCollegeAdminOrSuper = user.role === 'admin' || user.role === 'superadmin';
    if (
      !isCollegeAdminOrSuper &&
      notification.userId &&
      notification.userId !== user.id
    ) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const now = new Date();
    const readBy = Array.isArray(notification.readBy) ? [...notification.readBy] : [];
    if (!readBy.includes(user.id)) {
      readBy.push(user.id);
    }

    let updated;
    if (notification.userId) {
      // Direct user notification: mark readAt, isRead, and record in readBy
      updated = await prisma.notification.update({
        where: { id: notification.id },
        data: {
          readAt: now,
          isRead: true,
          readBy
        }
      });
    } else {
      // Broadcast notification: only add user.id to readBy so other recipients are not affected
      updated = await prisma.notification.update({
        where: { id: notification.id },
        data: {
          readBy
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...updated,
        isRead: true
      }
    });
  } catch (error) {
    console.error('[Notifications] markAsRead error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const user = req.user;

    if (!collegeId || !user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const now = new Date();

    // 1. Direct user-specific notifications
    await prisma.notification.updateMany({
      where: {
        collegeId,
        userId: user.id,
        readAt: null
      },
      data: {
        readAt: now,
        isRead: true
      }
    });

    // 2. Broadcast / role-based notifications: add user.id to readBy without touching isRead/readAt
    const userRoles = getTargetRolesForUser(user);
    const roleBased = await prisma.notification.findMany({
      where: {
        collegeId,
        userId: null,
        targetRole: { in: userRoles },
        NOT: { readBy: { has: user.id } }
      },
      select: { id: true, readBy: true }
    });

    for (const notif of roleBased) {
      const readBy = Array.isArray(notif.readBy) ? [...notif.readBy] : [];
      if (!readBy.includes(user.id)) {
        readBy.push(user.id);
        await prisma.notification.update({
          where: { id: notif.id },
          data: { readBy }
        });
      }
    }

    res.json({ success: true, data: { success: true } });
  } catch (error) {
    console.error('[Notifications] markAllAsRead error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
