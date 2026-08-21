import crypto from 'crypto';
import { logger } from '../server.js';

export const requestLogger = (req, res, next) => {
  const reqId = crypto.randomUUID();
  req.id = reqId;
  const startTime = Date.now();

  // Child logger with request context
  req.log = logger.child({ reqId });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const collegeId = req.user?.collegeId || req.tenant?.collegeId || 'none';
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;

    const logMessage = `[${statusCode >= 400 ? (statusCode >= 500 ? 'error' : 'warn') : 'info'}] req=${reqId} college=${collegeId} ${method} ${url} ${statusCode} ${duration}ms`;

    if (statusCode >= 500) {
      req.log.error({ reqId, collegeId, method, url, statusCode, duration }, logMessage);
    } else if (statusCode >= 400) {
      req.log.warn({ reqId, collegeId, method, url, statusCode, duration }, logMessage);
    } else {
      req.log.info({ reqId, collegeId, method, url, statusCode, duration }, logMessage);
    }
  });

  next();
};

export default requestLogger;
