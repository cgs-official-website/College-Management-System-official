import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

/**
 * Safely creates in-app notifications for specified targets.
 * Wrapped in try/catch and never throws or interrupts the caller.
 *
 * @param {Object} options
 * @param {string} options.collegeId - Tenant college ID
 * @param {Object} options.target - Notification target:
 *   - { userId: string } - single user
 *   - { userIds: string[] } - specific list of users
 *   - { role: string } - all users with this role in the college
 *   - { sectionId: string } - all students enrolled in a section
 *   - { sectionTeachers: string } - teachers assigned to section (falls back to admins if none found)
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} [options.type='info'] - 'info' | 'success' | 'warning'
 * @param {string} [options.link] - In-app navigation route
 */
export async function notify({ collegeId, target, title, message, type = 'info', link }) {
  if (!collegeId || !target || !title || !message) {
    logger.warn({ collegeId, target, title, hasMessage: !!message }, 'notify() called with missing required arguments');
    return;
  }

  try {
    const recipientUserIds = new Set();

    if (target.userId) {
      recipientUserIds.add(target.userId);
    }

    if (Array.isArray(target.userIds)) {
      target.userIds.forEach(id => {
        if (id) recipientUserIds.add(id);
      });
    }

    if (target.role) {
      const users = await prisma.user.findMany({
        where: {
          collegeId,
          role: target.role,
          accountStatus: 'active'
        },
        select: { id: true }
      });
      users.forEach(u => recipientUserIds.add(u.id));
    }

    if (target.sectionId) {
      const students = await prisma.student.findMany({
        where: {
          collegeId,
          sectionId: target.sectionId,
          userId: { not: null }
        },
        select: { userId: true }
      });
      students.forEach(s => {
        if (s.userId) recipientUserIds.add(s.userId);
      });
    }

    if (target.sectionTeachers) {
      // Find teachers assigned to this section directly or via timetable
      const section = await prisma.section.findFirst({
        where: { id: target.sectionTeachers, collegeId },
        select: {
          teachers: { select: { userId: true } },
          timetable: { select: { teacher: { select: { userId: true } } } }
        }
      });

      if (section) {
        section.teachers?.forEach(t => {
          if (t.userId) recipientUserIds.add(t.userId);
        });
        section.timetable?.forEach(slot => {
          if (slot.teacher?.userId) recipientUserIds.add(slot.teacher.userId);
        });
      }

      // If no teachers found for this section, notify admins instead
      if (recipientUserIds.size === 0) {
        const admins = await prisma.user.findMany({
          where: {
            collegeId,
            role: 'admin',
            accountStatus: 'active'
          },
          select: { id: true }
        });
        admins.forEach(a => recipientUserIds.add(a.id));
      }
    }

    const userIdsArray = Array.from(recipientUserIds).filter(Boolean);
    if (userIdsArray.length === 0) {
      logger.warn({ type, target, collegeId }, 'Notification target resolved to zero users; skipping');
      return;
    }

    const now = new Date();
    if (userIdsArray.length === 1) {
      await prisma.notification.create({
        data: {
          collegeId,
          userId: userIdsArray[0],
          type,
          title,
          message,
          link: link || null,
          isRead: false,
          readBy: [],
          readAt: null,
          createdAt: now
        }
      });
    } else {
      await prisma.notification.createMany({
        data: userIdsArray.map(userId => ({
          collegeId,
          userId,
          type,
          title,
          message,
          link: link || null,
          isRead: false,
          readBy: [],
          readAt: null,
          createdAt: now
        }))
      });
    }
  } catch (error) {
    logger.warn({ error: error.message, type, target, collegeId }, 'Failed to create in-app notification');
  }
}
