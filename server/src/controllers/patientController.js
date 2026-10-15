import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { logAudit } from '../services/auditService.js';
import {
  createPatient,
  getPatientById,
  getPatientIncidents,
  listPatients,
  updatePatient,
} from '../services/patientService.js';

const isAdmin = (req) => req.user.role === 'admin';

// Only administrators may set restricted notes. Checked on the server regardless of the UI.
async function rejectRestrictedWrite(req, data) {
  if (!isAdmin(req) && data.restrictedNotes != null) {
    await logAudit({
      req,
      action: 'auth.forbidden',
      resourceType: 'patient',
      details: { reason: 'restricted_notes_write' },
    });
    throw new HttpError(403, 'FORBIDDEN', 'Only administrators can set restricted notes.');
  }
}

export const list = asyncHandler(async (req, res) => {
  const result = await listPatients(req.validated.query);
  res.json({ success: true, data: result });
});

export const get = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const patient = await getPatientById(id, { isAdmin: isAdmin(req) });
  if (!patient) throw new HttpError(404, 'NOT_FOUND', 'Patient not found.');

  const incidents = await getPatientIncidents(id);

  await logAudit({ req, action: 'patient.view', resourceType: 'patient', resourceId: id });
  if (isAdmin(req) && patient.restrictedNotes) {
    await logAudit({
      req,
      action: 'patient.restricted_notes_viewed',
      resourceType: 'patient',
      resourceId: id,
    });
  }

  res.json({ success: true, data: { patient, incidents } });
});

export const create = asyncHandler(async (req, res) => {
  const data = req.validated.body;
  await rejectRestrictedWrite(req, data);

  const patient = await createPatient(data, req.user.id, { isAdmin: isAdmin(req) });
  await logAudit({ req, action: 'patient.create', resourceType: 'patient', resourceId: patient.id });

  res.status(201).json({ success: true, data: { patient } });
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const data = req.validated.body;
  await rejectRestrictedWrite(req, data);

  const result = await updatePatient(id, data, { isAdmin: isAdmin(req) });
  if (!result) throw new HttpError(404, 'NOT_FOUND', 'Patient not found.');

  await logAudit({
    req,
    action: 'patient.update',
    resourceType: 'patient',
    resourceId: id,
    details: { fields: result.changedFields }, // field names only, never values
  });

  res.json({ success: true, data: { patient: result.patient } });
});