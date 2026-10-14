import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { HttpError } from '../utils/httpError.js';
import { verifySession } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';

// Returns the current active user from the session cookie, or null.
async function resolveUser(req) {
  const token = req.cookies?.[config.cookieName];
  if (!token) return null;

  let payload;
  try {
    payload = verifySession(token);
  } catch {
    return null; // expired, malformed, or wrong signature
  }

  const { rows } = await pool.query(
    'SELECT id, username, full_name, email, role, is_active FROM users WHERE id = $1',
    [payload.sub]
  );
  const user = rows[0];
  return user && user.is_active ? user : null;
}

export async function authenticate(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication required.');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (user) req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Server-side role enforcement. Must run after authenticate().
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'UNAUTHENTICATED', 'Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      logAudit({
        req,
        action: 'auth.forbidden',
        details: { method: req.method, path: req.originalUrl.split('?')[0], requiredRoles: roles },
      });
      return next(new HttpError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }
    return next();
  };