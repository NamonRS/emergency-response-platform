import { pool } from '../db/pool.js';

const PATIENT_COLUMNS = `
  id, patient_code, full_name,
  to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
  conditions, allergies, medications, medical_history,
  emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
  restricted_notes, is_synthetic, created_at, updated_at`;

// API field name -> column, used to report which fields changed (names only, never values).
const FIELD_COLUMNS = [
  ['fullName', 'full_name'],
  ['dateOfBirth', 'date_of_birth'],
  ['conditions', 'conditions'],
  ['allergies', 'allergies'],
  ['medications', 'medications'],
  ['medicalHistory', 'medical_history'],
  ['emergencyContactName', 'emergency_contact_name'],
  ['emergencyContactRelationship', 'emergency_contact_relationship'],
  ['emergencyContactPhone', 'emergency_contact_phone'],
  ['restrictedNotes', 'restricted_notes'],
];

// Restricted notes text is only ever included for administrators.
function mapPatient(row, { isAdmin }) {
  return {
    id: row.id,
    patientCode: row.patient_code,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    conditions: row.conditions,
    allergies: row.allergies,
    medications: row.medications,
    medicalHistory: row.medical_history,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactRelationship: row.emergency_contact_relationship,
    emergencyContactPhone: row.emergency_contact_phone,
    hasRestrictedNotes: Boolean(row.restricted_notes),
    ...(isAdmin ? { restrictedNotes: row.restricted_notes } : {}),
    isSynthetic: row.is_synthetic,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchRow(id) {
  const { rows } = await pool.query(`SELECT ${PATIENT_COLUMNS} FROM patients WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listPatients({ q, page, pageSize }) {
  // Escape LIKE wildcards so "%" or "_" in the search box are treated literally.
  const pattern = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null;
  const where = 'WHERE ($1::text IS NULL OR full_name ILIKE $1 OR patient_code ILIKE $1)';

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT count(*) AS total FROM patients ${where}`, [pattern]),
    pool.query(
      `SELECT id, patient_code, full_name,
              to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, updated_at
         FROM patients ${where}
        ORDER BY full_name, id
        LIMIT $2 OFFSET $3`,
      [pattern, pageSize, (page - 1) * pageSize]
    ),
  ]);

  const total = Number(countRes.rows[0].total);
  return {
    patients: dataRes.rows.map((r) => ({
      id: r.id,
      patientCode: r.patient_code,
      fullName: r.full_name,
      dateOfBirth: r.date_of_birth,
      updatedAt: r.updated_at,
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getPatientById(id, { isAdmin }) {
  const row = await fetchRow(id);
  return row ? mapPatient(row, { isAdmin }) : null;
}

export async function getPatientIncidents(patientId) {
  const { rows } = await pool.query(
    `SELECT id, incident_code, incident_type, severity, status, occurred_at
       FROM incidents
      WHERE patient_id = $1
      ORDER BY occurred_at DESC
      LIMIT 50`,
    [patientId]
  );
  return rows.map((r) => ({
    id: r.id,
    incidentCode: r.incident_code,
    incidentType: r.incident_type,
    severity: r.severity,
    status: r.status,
    occurredAt: r.occurred_at,
  }));
}

export async function createPatient(data, userId, { isAdmin }) {
  const { rows } = await pool.query(
    `INSERT INTO patients
       (full_name, date_of_birth, conditions, allergies, medications, medical_history,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
        restricted_notes, created_by)
     VALUES ($1, $2, $3::text[], $4::text[], $5::text[], $6, $7, $8, $9, $10, $11)
     RETURNING ${PATIENT_COLUMNS}`,
    [
      data.fullName,
      data.dateOfBirth,
      data.conditions ?? null,
      data.allergies ?? null,
      data.medications ?? null,
      data.medicalHistory ?? null,
      data.emergencyContactName ?? null,
      data.emergencyContactRelationship ?? null,
      data.emergencyContactPhone ?? null,
      isAdmin ? (data.restrictedNotes ?? null) : null,
      userId,
    ]
  );
  return mapPatient(rows[0], { isAdmin });
}

// Full replacement of editable fields. Restricted notes change only when an admin supplies them.
export async function updatePatient(id, data, { isAdmin }) {
  const existing = await fetchRow(id);
  if (!existing) return null;

  const restrictedProvided = isAdmin && data.restrictedNotes !== undefined;

  const { rows } = await pool.query(
    `UPDATE patients SET
       full_name = $2,
       date_of_birth = $3,
       conditions = $4::text[],
       allergies = $5::text[],
       medications = $6::text[],
       medical_history = $7,
       emergency_contact_name = $8,
       emergency_contact_relationship = $9,
       emergency_contact_phone = $10,
       restricted_notes = CASE WHEN $11::boolean THEN $12::text ELSE restricted_notes END
     WHERE id = $1
     RETURNING ${PATIENT_COLUMNS}`,
    [
      id,
      data.fullName,
      data.dateOfBirth,
      data.conditions ?? null,
      data.allergies ?? null,
      data.medications ?? null,
      data.medicalHistory ?? null,
      data.emergencyContactName ?? null,
      data.emergencyContactRelationship ?? null,
      data.emergencyContactPhone ?? null,
      restrictedProvided,
      restrictedProvided ? (data.restrictedNotes ?? null) : null,
    ]
  );

  const updated = rows[0];
  const changedFields = FIELD_COLUMNS.filter(
    ([, col]) => JSON.stringify(existing[col]) !== JSON.stringify(updated[col])
  ).map(([name]) => name);

  return { patient: mapPatient(updated, { isAdmin }), changedFields };
}