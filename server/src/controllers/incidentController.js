import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { logAudit } from '../services/auditService.js';
import {
  acceptIncidentSummary,
  addIncidentEvent,
  assignIncident,
  createIncident,
  generateIncidentSummary,
  getIncidentById,
  linkIncidentPatient,
  listAssignableUsers,
  listIncidents,
  updateIncidentStatus,
} from '../services/incidentService.js';

export const list = asyncHandler(async (req, res) => {
  const result = await listIncidents(req.validated.query);
  res.json({ success: true, data: result });
});

export const get = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const incident = await getIncidentById(id);
  if (!incident) {
    throw new HttpError(404, 'NOT_FOUND', 'Incident not found.');
  }

  await logAudit({
    req,
    action: 'incident.view',
    resourceType: 'incident',
    resourceId: id,
  });

  res.json({ success: true, data: { incident } });
});

export const create = asyncHandler(async (req, res) => {
  const data = req.validated.body;
  const incident = await createIncident(data, req.user);

  await logAudit({
    req,
    action: 'incident.create',
    resourceType: 'incident',
    resourceId: incident.id,
    details: {
      incident_type: incident.incidentType,
      severity: incident.severity,
      has_patient: Boolean(incident.patientId),
    },
  });

  res.status(201).json({ success: true, data: { incident } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { new_status, note } = req.validated.body;

  const { incident, oldStatus, newStatus } = await updateIncidentStatus(
    id,
    { new_status, note },
    req.user
  );

  await logAudit({
    req,
    action: 'incident.status_change',
    resourceType: 'incident',
    resourceId: id,
    details: {
      old_status: oldStatus,
      new_status: newStatus,
      has_note: Boolean(note),
    },
  });

  res.json({ success: true, data: { incident } });
});

export const addEvent = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { event_type, body } = req.validated.body;

  const event = await addIncidentEvent(id, { event_type, body }, req.user);

  await logAudit({
    req,
    action: 'incident.note_add',
    resourceType: 'incident',
    resourceId: id,
    details: {
      event_type: event.eventType,
    },
  });

  res.status(201).json({ success: true, data: { event } });
});

export const assign = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { assigned_to } = req.validated.body;

  const incident = await assignIncident(id, { assigned_to }, req.user);

  await logAudit({
    req,
    action: 'incident.assign',
    resourceType: 'incident',
    resourceId: id,
    details: {
      assigned_to: assigned_to ? String(assigned_to) : null,
    },
  });

  res.json({ success: true, data: { incident } });
});

export const linkPatient = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { patient_id } = req.validated.body;

  const incident = await linkIncidentPatient(id, { patient_id }, req.user);

  await logAudit({
    req,
    action: 'incident.patient_link',
    resourceType: 'incident',
    resourceId: id,
    details: {
      patient_id: patient_id ? String(patient_id) : null,
    },
  });

  res.json({ success: true, data: { incident } });
});

export const assignableUsers = asyncHandler(async (req, res) => {
  const users = await listAssignableUsers();
  res.json({ success: true, data: { users } });
});

export const generateAiSummary = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const summary = await generateIncidentSummary(id, req.user);

  await logAudit({
    req,
    action: 'ai_summary.generate',
    resourceType: 'incident',
    resourceId: id,
    details: {
      summary_id: summary.summaryId,
      model: summary.model,
    },
  });

  res.status(201).json({ success: true, data: { summary } });
});

export const acceptAiSummary = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { summary_id, edited_content } = req.validated.body;

  const incident = await acceptIncidentSummary(id, { summary_id, edited_content }, req.user);

  await logAudit({
    req,
    action: 'ai_summary.reviewed',
    resourceType: 'ai_summary',
    resourceId: summary_id,
    details: {
      incident_id: id,
    },
  });

  res.json({ success: true, data: { incident } });
});
