import { Router } from 'express';
import { queryAssistant } from '../controllers/assistantController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'responder'));

// Field queries are operational and must not be cached by browser
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.post('/query', queryAssistant);

export default router;
