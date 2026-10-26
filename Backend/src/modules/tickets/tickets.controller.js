import crypto from 'crypto';
import { prisma, pool } from '../../lib/prisma.js';
import { logger } from '../../server.js';

let tableInitialized = false;

/**
 * Ensures the PlatformTicket table exists in PostgreSQL.
 * Uses direct pool queries when available with multi-statement safety, pgcrypto support, and DDL fallbacks.
 */
export async function ensurePlatformTicketTable() {
  if (tableInitialized) return;
  try {
    // 1. Enable pgcrypto extension for gen_random_uuid() if permissions permit
    try {
      if (pool) {
        await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      } else {
        await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      }
    } catch (_) { }

    // 2. Primary DDL: Create PlatformTicket table with UUID default
    const createTableDDL = `
      CREATE TABLE IF NOT EXISTS "PlatformTicket" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "adminUserId" UUID NOT NULL,
        "subject" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'open',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    if (pool) {
      await pool.query(createTableDDL);
    } else {
      await prisma.$executeRawUnsafe(createTableDDL);
    }

    try {
      const createIndexDDL = 'CREATE INDEX IF NOT EXISTS "idx_platform_ticket_admin_user" ON "PlatformTicket"("adminUserId");';
      if (pool) {
        await pool.query(createIndexDDL);
      } else {
        await prisma.$executeRawUnsafe(createIndexDDL);
      }
    } catch (_) { }

    tableInitialized = true;
    console.log('[Tickets] ✅ PlatformTicket table verified/created successfully');
  } catch (err) {
    console.warn('[Tickets] Primary table check failed, applying fallback DDL:', err.message);
    try {
      // Fallback DDL without gen_random_uuid() default in case DB lacks pgcrypto
      const fallbackDDL = `
        CREATE TABLE IF NOT EXISTS "PlatformTicket" (
          "id" UUID PRIMARY KEY,
          "adminUserId" UUID NOT NULL,
          "subject" VARCHAR(255) NOT NULL,
          "description" TEXT NOT NULL,
          "status" VARCHAR(50) NOT NULL DEFAULT 'open',
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      if (pool) {
        await pool.query(fallbackDDL);
      } else {
        await prisma.$executeRawUnsafe(fallbackDDL);
      }
      tableInitialized = true;
      console.log('[Tickets] ✅ PlatformTicket table created via fallback DDL');
    } catch (fallbackErr) {
      console.error('[Tickets] Critical error creating PlatformTicket table:', fallbackErr.message);
    }
  }
}

const REPLY_MARK = /\n\n--- Reply from (.+?) \((.*?)\) ---\n/;

/**
 * Parses replies out of ticket description into structured message objects.
 */
const parseTicketMessages = (t, defaultAuthor) => {
  const raw = t.description || '';
  const parts = raw.split(REPLY_MARK);
  const initialText = parts[0] || '';

  const messages = [
    {
      sender: 'Client',
      author: defaultAuthor,
      text: initialText.replace(/^\[(LOW|MEDIUM|HIGH|URGENT)\]\s*/i, '').trim(),
      timestamp: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString()
    }
  ];

  for (let i = 1; i + 2 < parts.length + 1; i += 3) {
    const author = parts[i];
    const date = parts[i + 1];
    const text = (parts[i + 2] || '').trim();
    const isSuperAdmin = /zuna|superadmin|support desk|agent/i.test(author);
    messages.push({
      sender: isSuperAdmin ? 'SuperAdmin' : 'Client',
      author,
      text,
      timestamp: date ? new Date(date).toISOString() : (t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString())
    });
  }

  return messages;
};

/**
 * Get all platform tickets.
 * SuperAdmin sees tickets from all colleges; College Admins/Users see their college's tickets.
 */
export const getTickets = async (req, res) => {
  await ensurePlatformTicketTable();

  const user = req.user;
  const isSuperAdmin = user.role === 'superadmin';
  const userId = user.id || user.userId;
  const collegeId = user.collegeId;

  let where = {};
  if (!isSuperAdmin) {
    if (collegeId) {
      where = {
        OR: [
          { adminUserId: userId },
          { admin: { collegeId } }
        ]
      };
    } else {
      where = { adminUserId: userId };
    }
  }

  let tickets = [];
  try {
    tickets = await prisma.platformTicket.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            college: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (dbErr) {
    console.warn(`[getTickets] Falling back to direct database query: ${dbErr.message}`);
    if (pool) {
      try {
        let queryStr = `SELECT t.*, u.name as "adminName", u.email as "adminEmail", c.name as "collegeName"
                        FROM "PlatformTicket" t
                        LEFT JOIN "User" u ON t."adminUserId" = u.id
                        LEFT JOIN "College" c ON u."collegeId" = c.id`;
        const params = [];
        if (!isSuperAdmin) {
          if (collegeId) {
            queryStr += ` WHERE t."adminUserId" = $1 OR u."collegeId" = $2`;
            params.push(userId, collegeId);
          } else {
            queryStr += ` WHERE t."adminUserId" = $1`;
            params.push(userId);
          }
        }
        queryStr += ` ORDER BY t."createdAt" DESC`;
        const resPool = await pool.query(queryStr, params);
        tickets = resPool.rows.map(r => ({
          id: r.id,
          adminUserId: r.adminUserId,
          subject: r.subject,
          description: r.description,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          admin: {
            id: r.adminUserId,
            name: r.adminName,
            email: r.adminEmail,
            college: { name: r.collegeName }
          }
        }));
      } catch (poolErr) {
        console.error('[getTickets] Pool query failed:', poolErr.message);
      }
    }
  }

  const formatted = (tickets || []).map(t => {
    const collegeName = t.admin?.college?.name || t.admin?.name || user.collegeName || user.name || 'College Admin';
    const collegeEmail = t.admin?.email || user.email || '';

    const priorityMatch = t.description?.match(/^\[(LOW|MEDIUM|HIGH|URGENT)\]\s*/i);
    const priority = priorityMatch ? priorityMatch[1].toLowerCase() : 'medium';
    const messages = parseTicketMessages(t, collegeName);

    return {
      id: t.id,
      productId: 'college-management',
      productName: 'College Management System',
      clientName: collegeName,
      clientEmail: collegeEmail,
      college: collegeName,
      subject: t.subject,
      description: t.description,
      status: t.status || 'open',
      priority,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
      adminUserId: t.adminUserId,
      messages
    };
  });

  res.json({
    success: true,
    data: formatted
  });
};

/**
 * Creates a new platform support ticket.
 */
export const createTicket = async (req, res) => {
  await ensurePlatformTicketTable();

  const user = req.user;
  const userId = user.id || user.userId;
  const { subject, description, priority = 'medium' } = req.body;

  if (!subject || !subject.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Subject is required' }
    });
  }

  if (!description || !description.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Description is required' }
    });
  }

  const prefix = priority && priority !== 'medium' ? `[${priority.toUpperCase()}] ` : '';
  const fullDescription = `${prefix}${description.trim()}`;

  const ticketId = crypto.randomUUID();
  const now = new Date();
  let ticket = null;
  let admin = null;

  try {
    ticket = await prisma.platformTicket.create({
      data: {
        id: ticketId,
        adminUserId: userId,
        subject: subject.trim(),
        description: fullDescription,
        status: 'open'
      }
    });
  } catch (prismaErr) {
    console.warn('[createTicket] Prisma create failed, falling back to direct pool query:', prismaErr.message);
    if (pool) {
      try {
        const insertResult = await pool.query(
          `INSERT INTO "PlatformTicket" ("id", "adminUserId", "subject", "description", "status", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [ticketId, userId, subject.trim(), fullDescription, 'open', now, now]
        );
        ticket = insertResult.rows[0];
      } catch (poolErr) {
        console.error('[createTicket] Direct pool insert also failed:', poolErr.message);
        return res.status(500).json({
          success: false,
          error: { message: `Failed to create support ticket: ${poolErr.message}` }
        });
      }
    } else {
      return res.status(500).json({
        success: false,
        error: { message: `Failed to create support ticket: ${prismaErr.message}` }
      });
    }
  }

  try {
    admin = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        college: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  } catch (_) { }

  const collegeName = admin?.college?.name || admin?.name || user.collegeName || user.name || 'College Admin';
  const collegeEmail = admin?.email || user.email || '';

  const formatted = {
    id: ticket.id,
    productId: 'college-management',
    productName: 'College Management System',
    clientName: collegeName,
    clientEmail: collegeEmail,
    college: collegeName,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status || 'open',
    priority: priority || 'medium',
    createdAt: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : now.toISOString(),
    updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt).toISOString() : now.toISOString(),
    adminUserId: ticket.adminUserId,
    messages: [
      {
        sender: 'Client',
        author: collegeName,
        text: description.trim(),
        timestamp: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : now.toISOString()
      }
    ]
  };

  res.status(201).json({
    success: true,
    message: 'Support ticket submitted successfully',
    data: formatted
  });
};

/**
 * Updates the status of a platform ticket.
 */
export const updateTicketStatus = async (req, res) => {
  await ensurePlatformTicketTable();

  const user = req.user;
  const userId = user.id || user.userId;
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: { message: `Invalid status. Valid values: ${validStatuses.join(', ')}` }
    });
  }

  let ticket = null;
  try {
    ticket = await prisma.platformTicket.findUnique({ where: { id } });
  } catch (_) {
    if (pool) {
      const r = await pool.query('SELECT * FROM "PlatformTicket" WHERE "id" = $1', [id]);
      ticket = r.rows[0];
    }
  }

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: { message: 'Ticket not found' }
    });
  }

  const isSuperAdmin = user.role === 'superadmin';
  const isOwner = ticket.adminUserId === userId;

  if (!isSuperAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      error: { message: 'Forbidden: You do not have permission to update this ticket' }
    });
  }

  let updated = null;
  try {
    updated = await prisma.platformTicket.update({
      where: { id },
      data: { status }
    });
  } catch (_) {
    if (pool) {
      const r = await pool.query(
        'UPDATE "PlatformTicket" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2 RETURNING *',
        [status, id]
      );
      updated = r.rows[0];
    }
  }

  res.json({
    success: true,
    message: 'Ticket status updated successfully',
    data: updated
  });
};

/**
 * Appends a message/reply to a platform ticket.
 */
export const replyTicket = async (req, res) => {
  await ensurePlatformTicketTable();

  const user = req.user;
  const userId = user.id || user.userId;
  const { id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Reply text is required' }
    });
  }

  let ticket = null;
  try {
    ticket = await prisma.platformTicket.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            collegeId: true,
            college: { select: { name: true } }
          }
        }
      }
    });
  } catch (_) {
    if (pool) {
      const r = await pool.query(
        `SELECT t.*, u."collegeId", c.name as "collegeName", u.name as "adminName"
         FROM "PlatformTicket" t
         LEFT JOIN "User" u ON t."adminUserId" = u.id
         LEFT JOIN "College" c ON u."collegeId" = c.id
         WHERE t."id" = $1`,
        [id]
      );
      if (r.rows[0]) {
        const row = r.rows[0];
        ticket = {
          ...row,
          admin: {
            id: row.adminUserId,
            name: row.adminName,
            collegeId: row.collegeId,
            college: { name: row.collegeName }
          }
        };
      }
    }
  }

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: { message: 'Ticket not found' }
    });
  }

  const isSuperAdmin = user.role === 'superadmin';
  const isOwner = ticket.adminUserId === userId;
  const isSameCollege = user.collegeId && ticket.admin?.collegeId === user.collegeId;

  if (!isSuperAdmin && !isOwner && !isSameCollege) {
    return res.status(403).json({
      success: false,
      error: { message: 'Forbidden: You do not have permission to reply to this ticket' }
    });
  }

  const senderLabel = isSuperAdmin ? 'SuperAdmin' : 'Client';
  const authorName = isSuperAdmin ? 'Zuna Support Desk' : (ticket.admin?.college?.name || user.collegeName || user.name || 'College Admin');

  const nowIso = new Date().toISOString();
  const updatedDescription = `${ticket.description}\n\n--- Reply from ${authorName} (${nowIso}) ---\n${text.trim()}`;

  let updated = null;
  try {
    updated = await prisma.platformTicket.update({
      where: { id },
      data: {
        description: updatedDescription,
        updatedAt: new Date()
      }
    });
  } catch (_) {
    if (pool) {
      const r = await pool.query(
        'UPDATE "PlatformTicket" SET "description" = $1, "updatedAt" = NOW() WHERE "id" = $2 RETURNING *',
        [updatedDescription, id]
      );
      updated = r.rows[0];
    }
  }

  res.json({
    success: true,
    message: 'Reply logged successfully',
    data: {
      ...updated,
      reply: {
        sender: senderLabel,
        author: authorName,
        text: text.trim(),
        timestamp: nowIso
      }
    }
  });
};
