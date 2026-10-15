import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listAuditLogsQuerySchema } from '../validators/auditValidators.js';

const router = Router();

// Strict security: Administrator role required. Responders will receive 403 Forbidden.
router.use(authenticate, requireRole('admin'));

// Audit logs must never be cached by browsers or intermediate proxies.
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/', validate(listAuditLogsQuerySchema, 'query'), getAuditLogs);

export default router;

