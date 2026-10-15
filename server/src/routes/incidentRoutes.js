import { Router } from 'express';
import {
  acceptAiSummary,
  addEvent,
  assign,
  assignableUsers,
  create,
  generateAiSummary,
  get,
  linkPatient,
  list,
  updateStatus,
} from '../controllers/incidentController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  acceptAiSummaryBodySchema,
  addEventBodySchema,
  assignBodySchema,
  createIncidentBodySchema,
  idParamSchema,
  linkPatientBodySchema,
  listIncidentsQuerySchema,
  updateStatusBodySchema,
} from '../validators/incidentValidators.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'responder'));

// Incident data must never be cached by the browser.
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Static endpoints before parameterized '/:id'
router.get('/assignable-users', assignableUsers);

router.get('/', validate(listIncidentsQuerySchema, 'query'), list);
router.post('/', validate(createIncidentBodySchema), create);
router.get('/:id', validate(idParamSchema, 'params'), get);

router.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateStatusBodySchema),
  updateStatus
);
router.put(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateStatusBodySchema),
  updateStatus
);

router.post(
  '/:id/events',
  validate(idParamSchema, 'params'),
  validate(addEventBodySchema),
  addEvent
);

router.patch(
  '/:id/assign',
  validate(idParamSchema, 'params'),
  validate(assignBodySchema),
  assign
);
router.put(
  '/:id/assign',
  validate(idParamSchema, 'params'),
  validate(assignBodySchema),
  assign
);

router.patch(
  '/:id/patient',
  validate(idParamSchema, 'params'),
  validate(linkPatientBodySchema),
  linkPatient
);
router.put(
  '/:id/patient',
  validate(idParamSchema, 'params'),
  validate(linkPatientBodySchema),
  linkPatient
);

// AI Handover & Triage synthesis endpoints
router.post(
  '/:id/ai-summary',
  validate(idParamSchema, 'params'),
  generateAiSummary
);

router.post(
  '/:id/ai-summary/accept',
  validate(idParamSchema, 'params'),
  validate(acceptAiSummaryBodySchema),
  acceptAiSummary
);

export default router;
