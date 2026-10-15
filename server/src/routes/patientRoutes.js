import { Router } from 'express';
import {
  acceptAiSummary,
  create,
  generateAiSummary,
  get,
  list,
  update,
} from '../controllers/patientController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  acceptPatientAiSummaryBodySchema,
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

// Patient AI Clinical Medical Brief endpoints
router.post('/:id/ai-summary', validate(idParamSchema, 'params'), generateAiSummary);
router.post(
  '/:id/ai-summary/accept',
  validate(idParamSchema, 'params'),
  validate(acceptPatientAiSummaryBodySchema),
  acceptAiSummary
);

export default router;