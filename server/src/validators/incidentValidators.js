import { z } from 'zod';

export const INCIDENT_TYPES = [
  'medical_emergency',
  'road_accident',
  'fire',
  'natural_disaster',
  'other',
];

export const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export const STATUSES = [
  'reported',
  'under_review',
  'response_in_progress',
  'resolved',
  'closed',
];

export const EVENT_TYPES = ['note', 'action_taken'];

export const bigintIdRegex = /^\d{1,15}$/;

export const idParamSchema = z.object({
  id: z.string().regex(bigintIdRegex, 'Invalid id.'),
});

const occurredAtSchema = z
  .string()
  .trim()
  .min(1, 'Incident date and time is required.')
  .refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid date/time format.')
  .refine((val) => {
    const timestamp = new Date(val).getTime();
    const maxAllowed = Date.now() + 60 * 1000;
    return timestamp <= maxAllowed;
  }, 'Incident time cannot be in the future.');

const optionalBigInt = z
  .union([
    z.string().regex(bigintIdRegex, 'Invalid id format.'),
    z.number().int().positive(),
  ])
  .nullish()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    return String(v);
  });

export const listIncidentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(STATUSES).optional(),
    severity: z.enum(SEVERITIES).optional(),
    incident_type: z.enum(INCIDENT_TYPES).optional(),
    incidentType: z.enum(INCIDENT_TYPES).optional(),
    search: z.string().trim().max(100, 'Search text is too long.').optional(),
    q: z.string().trim().max(100, 'Search text is too long.').optional(),
  })
  .transform((data) => ({
    page: data.page,
    pageSize: data.pageSize,
    status: data.status,
    severity: data.severity,
    incident_type: data.incident_type || data.incidentType,
    search: data.search || data.q || undefined,
  }));

export const createIncidentBodySchema = z
  .object({
    incident_type: z.enum(INCIDENT_TYPES).optional(),
    incidentType: z.enum(INCIDENT_TYPES).optional(),
    location_description: z
      .string()
      .trim()
      .min(1, 'Location description is required.')
      .max(500, 'Location description must be 500 characters or fewer.')
      .optional(),
    locationDescription: z
      .string()
      .trim()
      .min(1, 'Location description is required.')
      .max(500, 'Location description must be 500 characters or fewer.')
      .optional(),
    occurred_at: occurredAtSchema.optional(),
    occurredAt: occurredAtSchema.optional(),
    description: z
      .string()
      .trim()
      .min(1, 'Description is required.')
      .max(5000, 'Description must be 5000 characters or fewer.'),
    severity: z.enum(SEVERITIES),
    patient_id: optionalBigInt,
    patientId: optionalBigInt,
    assigned_to: optionalBigInt,
    assignedTo: optionalBigInt,
  })
  .refine(
    (d) => Boolean(d.incident_type || d.incidentType),
    { message: 'Incident type is required.', path: ['incident_type'] }
  )
  .refine(
    (d) => Boolean(d.location_description || d.locationDescription),
    { message: 'Location description is required.', path: ['location_description'] }
  )
  .refine(
    (d) => Boolean(d.occurred_at || d.occurredAt),
    { message: 'Occurred at timestamp is required.', path: ['occurred_at'] }
  )
  .transform((d) => ({
    incident_type: d.incident_type || d.incidentType,
    location_description: d.location_description || d.locationDescription,
    occurred_at: d.occurred_at || d.occurredAt,
    description: d.description,
    severity: d.severity,
    patient_id: d.patient_id !== undefined ? d.patient_id : (d.patientId ?? null),
    assigned_to: d.assigned_to !== undefined ? d.assigned_to : (d.assignedTo ?? null),
  }));

export const updateStatusBodySchema = z
  .object({
    new_status: z.enum(STATUSES).optional(),
    newStatus: z.enum(STATUSES).optional(),
    status: z.enum(STATUSES).optional(),
    note: z
      .string()
      .trim()
      .max(2000, 'Note must be 2000 characters or fewer.')
      .nullish()
      .transform((v) => (v ? v : null)),
  })
  .refine(
    (d) => Boolean(d.new_status || d.newStatus || d.status),
    { message: 'New status is required.', path: ['new_status'] }
  )
  .transform((d) => ({
    new_status: d.new_status || d.newStatus || d.status,
    note: d.note ?? null,
  }));

export const addEventBodySchema = z
  .object({
    event_type: z.enum(EVENT_TYPES).optional(),
    eventType: z.enum(EVENT_TYPES).optional(),
    body: z
      .string()
      .trim()
      .min(1, 'Body text is required.')
      .max(2000, 'Body text must be 2000 characters or fewer.'),
  })
  .refine(
    (d) => Boolean(d.event_type || d.eventType),
    { message: 'Event type must be either "note" or "action_taken".', path: ['event_type'] }
  )
  .transform((d) => ({
    event_type: d.event_type || d.eventType,
    body: d.body,
  }));

export const assignBodySchema = z
  .object({
    assigned_to: optionalBigInt,
    assignedTo: optionalBigInt,
  })
  .transform((d) => ({
    assigned_to: d.assigned_to !== undefined ? d.assigned_to : (d.assignedTo ?? null),
  }));

export const linkPatientBodySchema = z
  .object({
    patient_id: optionalBigInt,
    patientId: optionalBigInt,
  })
  .transform((d) => ({
    patient_id: d.patient_id !== undefined ? d.patient_id : (d.patientId ?? null),
  }));

export const incidentAiOutputSchema = z.object({
  triageCategory: z.string().trim().min(1).default('Urgent'),
  primaryInjuries: z.array(z.string()).default([]),
  vitalSignAbnormalities: z.array(z.string()).default([]),
  criticalInterventionsDone: z.array(z.string()).default([]),
  immediateRisks: z.array(z.string()).default([]),
  suggestedHandoverNote: z.string().trim().default(''),
});

export const acceptAiSummaryBodySchema = z
  .object({
    summary_id: optionalBigInt,
    summaryId: optionalBigInt,
    edited_content: z.record(z.string(), z.any()).optional(),
    editedContent: z.record(z.string(), z.any()).optional(),
  })
  .refine((d) => Boolean(d.summary_id || d.summaryId), {
    message: 'summary_id is required.',
    path: ['summary_id'],
  })
  .transform((d) => ({
    summary_id: d.summary_id || d.summaryId,
    edited_content: d.edited_content || d.editedContent || {},
  }));
