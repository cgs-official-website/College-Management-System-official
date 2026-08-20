import jwt from 'jsonwebtoken';
import { redis } from '../lib/cache.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token/session is revoked in Redis
    // Key pattern: session:{userId}:{tokenId}
    if (decoded.jti) {
      const isRevoked = await redis.get(`revoked:${decoded.jti}`).catch(() => null);
      if (isRevoked) {
        return res.status(401).json({ error: 'Token revoked' });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token expired or invalid' });
  }
};
