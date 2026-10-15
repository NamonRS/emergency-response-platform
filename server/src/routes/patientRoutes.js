import { Router } from 'express';
import { create, get, list, update } from '../controllers/patientController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  idParamSchema,
  listQuerySchema,
  patientBodySchema,
} from '../validators/patientValidators.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'responder'));

// Patient data must never be cached by the browser.
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/', validate(listQuerySchema, 'query'), list);
router.post('/', validate(patientBodySchema), create);
router.get('/:id', validate(idParamSchema, 'params'), get);
router.put('/:id', validate(idParamSchema, 'params'), validate(patientBodySchema), update);

export default router;