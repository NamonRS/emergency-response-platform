import { config } from '../config.js';
import { HttpError } from '../utils/httpError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF defense in depth: browsers always send Origin on cross-site state-changing requests.
export function originCheck(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== config.clientOrigin) {
    return next(new HttpError(403, 'BAD_ORIGIN', 'Request origin is not allowed.'));
  }
  return next();
}