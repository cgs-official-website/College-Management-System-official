import { prisma, logger } from '../../server.js';
import { createNoticeSchema, updateNoticeSchema } from './notices.schema.js';
import { notify } from '../notifications/notify.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getNotices = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    if (!collegeId) {
      return res.status(400).json({ success: false, error: { message: 'College context is required' } });
    }

    const role = (req.user?.role || '').toLowerCase();
    const isTeacherOrStaff = ['teacher', 'hod', 'faculty', 'staff'].includes(role);

    const where = { collegeId };
    if (isTeacherOrStaff) {
      where.targetAudience = { in: ['all', 'staff', 'teachers', 'teacher'] };
    }

    const notices = await prisma.notice.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: notices });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getNoticeById = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid notice ID format' }
      });
    }

    const notice = await prisma.notice.findFirst({
      where: { id, collegeId }
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOTICE_NOT_FOUND', message: 'Notice not found' }
      });
    }

    const role = (req.user?.role || '').toLowerCase();
    const isTeacherOrStaff = ['teacher', 'hod', 'faculty', 'staff'].includes(role);
    if (isTeacherOrStaff) {
      const aud = (notice.targetAudience || 'all').toLowerCase();
      if (!['all', 'staff', 'teachers', 'teacher'].includes(aud)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'This notice is not accessible to staff members.' }
        });
      }
    }

    res.json({ success: true, data: notice });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const createNotice = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const payload = createNoticeSchema.parse(req.body);
    const notice = await prisma.notice.create({
      data: { 
        collegeId, 
        title: payload.title, 
        content: payload.content ?? '', 
        priority: payload.priority ?? 'normal', 
        targetAudience: payload.targetAudience ?? 'all' 
      }
    });

    const audience = (notice.targetAudience || 'all').toLowerCase();
    if (audience === 'student' || audience === 'students' || audience === 'all') {
      try {
        const preview = notice.content ? (notice.content.length > 120 ? `${notice.content.slice(0, 117)}...` : notice.content) : 'A new notice has been published.';
        await notify({
          collegeId,
          target: { role: 'student' },
          title: `New Notice: ${notice.title}`,
          message: preview,
          type: 'notice_new',
          link: '/student/notices',
        });
        logger?.info?.(`[Notices] Broadcast notification dispatched for notice ${notice.id}`);
      } catch (notifErr) {
        logger?.error?.(`[Notices] Notification error: ${notifErr.message}`);
      }
    }

    res.status(201).json({ success: true, data: notice });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues.map((i) => i.message).join(', ')
        }
      });
    }
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const updateNotice = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid notice ID format'
        }
      });
    }

    const payload = updateNoticeSchema.parse(req.body);

    const existingNotice = await prisma.notice.findFirst({
      where: { id, collegeId }
    });

    if (!existingNotice) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTICE_NOT_FOUND',
          message: 'Notice not found'
        }
      });
    }

    const updateData = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.content !== undefined) updateData.content = payload.content;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.targetAudience !== undefined) updateData.targetAudience = payload.targetAudience;

    const updatedNotice = await prisma.notice.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: updatedNotice
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues.map((i) => i.message).join(', ')
        }
      });
    }
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const deleteNotice = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid notice ID format'
        }
      });
    }

    const existingNotice = await prisma.notice.findFirst({
      where: { id, collegeId }
    });

    if (!existingNotice) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTICE_NOT_FOUND',
          message: 'Notice not found'
        }
      });
    }

    await prisma.notice.delete({
      where: { id }
    });

    res.json({ success: true, data: { success: true } });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
