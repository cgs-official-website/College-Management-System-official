import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../server.js';

export const errorHandler = (err, req, res, _next) => {
  const reqLogger = req.log || logger;
  const requestId = req.id || 'unknown';
  const collegeId = req.user?.collegeId || req.tenant?.collegeId || 'none';

  let statusCode = err.statusCode || err.status || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
  } 
  // Handle Prisma Known Request Errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
      const target = err.meta?.target ? ` on field (${Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target})` : '';
      message = `A record with this identifier already exists${target}.`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      errorCode = 'RECORD_NOT_FOUND';
      message = 'The requested record was not found.';
    } else if (err.code === 'P2003') {
      statusCode = 409;
      errorCode = 'FOREIGN_KEY_CONSTRAINT_VIOLATION';
      message = 'Operation violates foreign key constraint.';
    } else {
      statusCode = 400;
      errorCode = `PRISMA_${err.code}`;
      message = err.message.split('\n').pop() || 'Database query error';
    }
  } 
  // Handle Prisma Validation Errors
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    errorCode = 'DATABASE_VALIDATION_ERROR';
    message = 'Invalid data provided to database operation.';
  }
  // Handle Syntax / JSON Parsing Errors
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = 'INVALID_JSON_PAYLOAD';
    message = 'Malformed JSON payload in request body.';
  }

  // Log error with structured context
  reqLogger.error({
    reqId: requestId,
    collegeId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorCode,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  }, `[error] req=${requestId} college=${collegeId} ${req.method} ${req.originalUrl} ${statusCode} - ${message}`);

  res.status(statusCode).json({
    success: false,
    error: {
      code: String(errorCode),
      message
    }
  });
};

export const notFoundHandler = (req, res) => {
  const reqLogger = req.log || logger;
  const requestId = req.id || 'unknown';
  const collegeId = req.user?.collegeId || req.tenant?.collegeId || 'none';

  reqLogger.warn(`[warn] req=${requestId} college=${collegeId} ${req.method} ${req.originalUrl} 404 - Route not found`);

  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
};
