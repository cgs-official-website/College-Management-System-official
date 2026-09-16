import { prisma } from '../../server.js';

/**
 * Get all platform tickets.
 * SuperAdmin sees tickets from all colleges; College Admins/Users see only their own.
 */
export const getTickets = async (req, res) => {
  const user = req.user;
  const isSuperAdmin = user.role === 'superadmin';

  const where = isSuperAdmin ? {} : { adminUserId: user.id };

  const tickets = await prisma.platformTicket.findMany({
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

  const formatted = tickets.map(t => {
    const collegeName = t.admin?.college?.name || t.admin?.name || 'College Admin';
    const collegeEmail = t.admin?.email || '';
    
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
      priority: 'medium',
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      adminUserId: t.adminUserId,
      messages: [
        {
          sender: 'Client',
          author: collegeName,
          text: t.description,
          timestamp: t.createdAt.toISOString()
        }
      ]
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
  const user = req.user;
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

  const ticket = await prisma.platformTicket.create({
    data: {
      adminUserId: user.id,
      subject: subject.trim(),
      description: fullDescription,
      status: 'open'
    },
    include: {
      admin: {
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
      }
    }
  });

  const collegeName = ticket.admin?.college?.name || ticket.admin?.name || 'College Admin';

  const formatted = {
    id: ticket.id,
    productId: 'college-management',
    productName: 'College Management System',
    clientName: collegeName,
    clientEmail: ticket.admin?.email || '',
    college: collegeName,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: [
      {
        sender: 'Client',
        author: collegeName,
        text: ticket.description,
        timestamp: ticket.createdAt.toISOString()
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
  const user = req.user;
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: { message: `Invalid status. Valid values: ${validStatuses.join(', ')}` }
    });
  }

  const ticket = await prisma.platformTicket.findUnique({
    where: { id }
  });

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: { message: 'Ticket not found' }
    });
  }

  // Only superadmin or ticket creator can update status
  if (user.role !== 'superadmin' && ticket.adminUserId !== user.id) {
    return res.status(403).json({
      success: false,
      error: { message: 'Forbidden: You do not have permission to update this ticket' }
    });
  }

  const updated = await prisma.platformTicket.update({
    where: { id },
    data: { status }
  });

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
  const user = req.user;
  const { id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Reply text is required' }
    });
  }

  const ticket = await prisma.platformTicket.findUnique({
    where: { id },
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          college: { select: { name: true } }
        }
      }
    }
  });

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: { message: 'Ticket not found' }
    });
  }

  if (user.role !== 'superadmin' && ticket.adminUserId !== user.id) {
    return res.status(403).json({
      success: false,
      error: { message: 'Forbidden: You do not have permission to reply to this ticket' }
    });
  }

  const senderLabel = user.role === 'superadmin' ? 'SuperAdmin' : 'Client';
  const authorName = user.role === 'superadmin' ? 'Zuna Support Desk' : (ticket.admin?.college?.name || user.name);

  const updatedDescription = `${ticket.description}\n\n--- Reply from ${authorName} (${new Date().toLocaleString()}) ---\n${text.trim()}`;

  const updated = await prisma.platformTicket.update({
    where: { id },
    data: {
      description: updatedDescription,
      updatedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Reply logged successfully',
    data: {
      ...updated,
      reply: {
        sender: senderLabel,
        author: authorName,
        text: text.trim(),
        timestamp: new Date().toISOString()
      }
    }
  });
};
