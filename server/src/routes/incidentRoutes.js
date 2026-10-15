import { Router } from 'express';
import {
  addEvent,
  assign,
  assignableUsers,
  create,
  get,
  linkPatient,
  list,
  updateStatus,
} from '../controllers/incidentController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
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

// Place static paths before parameterized '/:id' paths
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

export default router;

