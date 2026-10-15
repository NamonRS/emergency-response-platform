import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, 'Not a real calendar date.')
  .refine((value) => value >= '1900-01-01', 'Date of birth is too far in the past.')
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    'Date of birth cannot be in the future.'
  );

// Trims, treats '' / null / missing as null.
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .nullish()
    .transform((v) => (v ? v : null));

const phone = z
  .string()
  .trim()
  .max(30, 'Phone number is too long.')
  .refine((v) => v === '' || /^[0-9+()\-\s]{5,30}$/.test(v), 'Enter a valid phone number.')
  .nullish()
  .transform((v) => (v ? v : null));

// null = not documented, [] = documented as none, otherwise documented entries.
const medicalList = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'Entries cannot be blank.')
      .max(200, 'Each entry must be 200 characters or fewer.')
  )
  .max(50, 'Too many entries (maximum 50).')
  .nullish()
  .transform((v) => v ?? null);

// undefined = field not supplied (existing value is kept on update).
const restrictedNotes = z
  .string()
  .trim()
  .max(2000, 'Must be 2000 characters or fewer.')
  .nullish()
  .transform((v) => (v === undefined ? undefined : v || null));

export const patientBodySchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.').max(120, 'Name is too long.'),
  dateOfBirth: isoDate,
  conditions: medicalList,
  allergies: medicalList,
  medications: medicalList,
  medicalHistory: optionalText(5000),
  emergencyContactName: optionalText(120),
  emergencyContactRelationship: optionalText(60),
  emergencyContactPhone: phone,
  restrictedNotes,
});

export const idParamSchema = z.object({
  id: z.string().regex(/^\d{1,15}$/, 'Invalid id.'),
});

export const listQuerySchema = z.object({
  q: z.string().trim().max(100, 'Search text is too long.').optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const patientAiOutputSchema = z.object({
  clinicalAlert: z.enum(['High', 'Medium', 'Low']).catch('Medium'),
  criticalRisks: z.array(z.string()).default([]),
  allergiesSummary: z.array(z.string()).default([]),
  chronicConditionsSummary: z.array(z.string()).default([]),
  emergencyActionProtocol: z.string().trim().default(''),
});

const optionalBigInt = z
  .union([z.string().regex(/^\d{1,15}$/, 'Invalid id format.'), z.number().int().positive()])
  .nullish()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    return String(v);
  });

export const acceptPatientAiSummaryBodySchema = z
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