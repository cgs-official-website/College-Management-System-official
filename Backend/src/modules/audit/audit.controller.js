import { getAuditLogs, getAuditLogById, createAuditLog } from './audit.service.js';

export const getAuditLogsController = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId || req.query?.collegeId;
  const {
    page = 1,
    limit = 25,
    module,
    action,
    status,
    search,
    startDate,
    endDate,
    userId
  } = req.query;

  const result = await getAuditLogs({
    collegeId,
    page,
    limit,
    module,
    action,
    status,
    search,
    startDate,
    endDate,
    userId
  });

  return res.json({
    success: true,
    data: {
      logs: result.logs,
      pagination: result.pagination,
      stats: result.stats
    },
    logs: result.logs,
    pagination: result.pagination,
    stats: result.stats
  });
};

export const getAuditLogByIdController = async (req, res) => {
  const { id } = req.params;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

  const log = await getAuditLogById(id, collegeId);
  if (!log) {
    return res.status(404).json({
      success: false,
      error: { message: 'Audit log entry not found' }
    });
  }

  return res.json({
    success: true,
    data: log
  });
};

export const createAuditLogController = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const user = req.user;

  const {
    action,
    module,
    entity,
    entityId,
    description,
    oldValue,
    newValue,
    status = 'SUCCESS'
  } = req.body;

  if (!action || !module) {
    return res.status(400).json({
      success: false,
      error: { message: 'action and module are required for audit log' }
    });
  }

  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const entry = await createAuditLog({
    collegeId,
    userId: user?.id || user?.userId,
    userName: user?.name || user?.userName,
    userEmail: user?.email,
    userRole: user?.role,
    action,
    module,
    entity,
    entityId,
    description,
    oldValue,
    newValue,
    ipAddress,
    userAgent,
    status
  });

  return res.status(201).json({
    success: true,
    data: entry
  });
};

export const immutableBlockController = (req, res) => {
  return res.status(405).json({
    success: false,
    error: {
      code: 'IMMUTABLE_LOG_RECORD',
      message: 'Audit logs are immutable. Modifying or deleting audit records is strictly prohibited by security policy.'
    }
  });
};
