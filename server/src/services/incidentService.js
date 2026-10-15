import { pool } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';

function mapPatientSummary(row) {
  if (!row.patient_id) return null;
  const fullName = row.patient_full_name || '';
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  return {
    id: String(row.patient_id),
    patientCode: row.patient_code,
    fullName,
    firstName,
    lastName,
  };
}

function mapAssignee(row) {
  if (!row.assigned_to) return null;
  return {
    id: String(row.assigned_to),
    username: row.assigned_username,
    fullName: row.assigned_full_name,
  };
}

function mapReporter(row) {
  if (!row.reported_by) return null;
  return {
    id: String(row.reported_by),
    username: row.reported_username,
    fullName: row.reported_full_name,
  };
}

function mapIncidentRecord(row) {
  return {
    id: String(row.id),
    incidentCode: row.incident_code,
    incidentType: row.incident_type,
    locationDescription: row.location_description,
    occurredAt: row.occurred_at,
    description: row.description,
    severity: row.severity,
    status: row.status,
    patientId: row.patient_id != null ? String(row.patient_id) : null,
    patient: mapPatientSummary(row),
    assignedTo: row.assigned_to != null ? String(row.assigned_to) : null,
    assignedToUser: mapAssignee(row),
    reportedBy: String(row.reported_by),
    reportedByUser: mapReporter(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEventRecord(row) {
  return {
    id: String(row.id),
    incidentId: String(row.incident_id),
    eventType: row.event_type,
    body: row.body,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    createdBy: {
      id: String(row.created_by),
      username: row.creator_username,
      fullName: row.creator_full_name,
    },
    createdAt: row.created_at,
  };
}

export async function listIncidents({
  page = 1,
  pageSize = 10,
  status,
  severity,
  incident_type,
  search,
}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`i.status = $${params.length}`);
  }

  if (severity) {
    params.push(severity);
    conditions.push(`i.severity = $${params.length}`);
  }

  if (incident_type) {
    params.push(incident_type);
    conditions.push(`i.incident_type = $${params.length}`);
  }

  if (search) {
    const escaped = search.replace(/[\\%_]/g, '\\$&');
    params.push(`%${escaped}%`);
    const idx = params.length;
    conditions.push(
      `(i.incident_code ILIKE $${idx} OR i.location_description ILIKE $${idx} OR i.description ILIKE $${idx})`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT count(*) AS total FROM incidents i ${whereClause}`, params),
    pool.query(
      `SELECT i.id, i.incident_code, i.incident_type, i.location_description, i.occurred_at,
              i.description, i.patient_id, i.severity, i.status, i.assigned_to, i.reported_by,
              i.created_at, i.updated_at,
              p.patient_code, p.full_name AS patient_full_name,
              ua.username AS assigned_username, ua.full_name AS assigned_full_name,
              ur.username AS reported_username, ur.full_name AS reported_full_name
         FROM incidents i
         LEFT JOIN patients p ON p.id = i.patient_id
         LEFT JOIN users ua ON ua.id = i.assigned_to
         LEFT JOIN users ur ON ur.id = i.reported_by
        ${whereClause}
        ORDER BY i.occurred_at DESC, i.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize]
    ),
  ]);

  const total = Number(countRes.rows[0].total);

  return {
    incidents: dataRes.rows.map(mapIncidentRecord),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getIncidentById(id) {
  const [incidentRes, eventsRes] = await Promise.all([
    pool.query(
      `SELECT i.id, i.incident_code, i.incident_type, i.location_description, i.occurred_at,
              i.description, i.patient_id, i.severity, i.status, i.assigned_to, i.reported_by,
              i.created_at, i.updated_at,
              p.patient_code, p.full_name AS patient_full_name,
              ua.username AS assigned_username, ua.full_name AS assigned_full_name,
              ur.username AS reported_username, ur.full_name AS reported_full_name
         FROM incidents i
         LEFT JOIN patients p ON p.id = i.patient_id
         LEFT JOIN users ua ON ua.id = i.assigned_to
         LEFT JOIN users ur ON ur.id = i.reported_by
        WHERE i.id = $1`,
      [id]
    ),
    pool.query(
      `SELECT ie.id, ie.incident_id, ie.event_type, ie.body, ie.old_status, ie.new_status,
              ie.created_by, ie.created_at,
              u.username AS creator_username, u.full_name AS creator_full_name
         FROM incident_events ie
         JOIN users u ON u.id = ie.created_by
        WHERE ie.incident_id = $1
        ORDER BY ie.created_at ASC, ie.id ASC`,
      [id]
    ),
  ]);

  if (incidentRes.rows.length === 0) {
    return null;
  }

  const incident = mapIncidentRecord(incidentRes.rows[0]);
  const events = eventsRes.rows.map(mapEventRecord);

  return {
    ...incident,
    events,
  };
}

export async function createIncident(data, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let patientCode = null;
    let patientFullName = null;

    if (data.patient_id) {
      const patientRes = await client.query(
        'SELECT id, patient_code, full_name FROM patients WHERE id = $1',
        [data.patient_id]
      );
      if (patientRes.rows.length === 0) {
        throw new HttpError(404, 'NOT_FOUND', 'Linked patient does not exist.');
      }
      patientCode = patientRes.rows[0].patient_code;
      patientFullName = patientRes.rows[0].full_name;
    }

    if (data.assigned_to) {
      const userRes = await client.query(
        'SELECT id, username, full_name FROM users WHERE id = $1 AND is_active = TRUE',
        [data.assigned_to]
      );
      if (userRes.rows.length === 0) {
        throw new HttpError(404, 'NOT_FOUND', 'Assigned user does not exist or is inactive.');
      }
    }

    const insertRes = await client.query(
      `INSERT INTO incidents
         (incident_type, location_description, occurred_at, description, severity, status, assigned_to, reported_by, patient_id)
       VALUES ($1, $2, $3, $4, $5, 'reported', $6, $7, $8)
       RETURNING id`,
      [
        data.incident_type,
        data.location_description,
        data.occurred_at,
        data.description,
        data.severity,
        data.assigned_to ?? null,
        user.id,
        data.patient_id ?? null,
      ]
    );

    const incidentId = insertRes.rows[0].id;

    await client.query(
      `INSERT INTO incident_events
         (incident_id, event_type, body, new_status, created_by)
       VALUES ($1, 'created', 'Incident reported', 'reported', $2)`,
      [incidentId, user.id]
    );

    if (data.patient_id) {
      await client.query(
        `INSERT INTO incident_events
           (incident_id, event_type, body, created_by)
         VALUES ($1, 'patient_linked', $2, $3)`,
        [incidentId, `Linked to patient ${patientCode} (${patientFullName})`, user.id]
      );
    }

    await client.query('COMMIT');
    return await getIncidentById(incidentId);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function updateIncidentStatus(id, { new_status, note }, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const curRes = await client.query(
      'SELECT id, status FROM incidents WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (curRes.rows.length === 0) {
      throw new HttpError(404, 'NOT_FOUND', 'Incident not found.');
    }

    const current = curRes.rows[0];
    if (current.status === new_status) {
      throw new HttpError(400, 'NO_CHANGE', 'Incident is already in the requested status.');
    }

    await client.query('UPDATE incidents SET status = $1 WHERE id = $2', [new_status, id]);

    await client.query(
      `INSERT INTO incident_events
         (incident_id, event_type, old_status, new_status, body, created_by)
       VALUES ($1, 'status_change', $2, $3, $4, $5)`,
      [id, current.status, new_status, note ?? null, user.id]
    );

    await client.query('COMMIT');
    const incident = await getIncidentById(id);
    return {
      incident,
      oldStatus: current.status,
      newStatus: new_status,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function addIncidentEvent(id, { event_type, body }, user) {
  const incRes = await pool.query('SELECT id FROM incidents WHERE id = $1', [id]);
  if (incRes.rows.length === 0) {
    throw new HttpError(404, 'NOT_FOUND', 'Incident not found.');
  }

  const insertRes = await pool.query(
    `INSERT INTO incident_events
       (incident_id, event_type, body, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, incident_id, event_type, body, old_status, new_status, created_by, created_at`,
    [id, event_type, body, user.id]
  );

  await pool.query('UPDATE incidents SET updated_at = now() WHERE id = $1', [id]);

  const row = insertRes.rows[0];
  return {
    id: String(row.id),
    incidentId: String(row.incident_id),
    eventType: row.event_type,
    body: row.body,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    createdBy: {
      id: String(user.id),
      username: user.username,
      fullName: user.fullName,
    },
    createdAt: row.created_at,
  };
}

export async function assignIncident(id, { assigned_to }, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const curRes = await client.query(
      'SELECT id, assigned_to FROM incidents WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (curRes.rows.length === 0) {
      throw new HttpError(404, 'NOT_FOUND', 'Incident not found.');
    }

    let targetUser = null;
    if (assigned_to != null) {
      const uRes = await client.query(
        'SELECT id, username, full_name FROM users WHERE id = $1 AND is_active = TRUE',
        [assigned_to]
      );
      if (uRes.rows.length === 0) {
        throw new HttpError(404, 'NOT_FOUND', 'Assigned user does not exist or is inactive.');
      }
      targetUser = uRes.rows[0];
    }

    await client.query('UPDATE incidents SET assigned_to = $1 WHERE id = $2', [
      assigned_to ?? null,
      id,
    ]);

    const eventBody = targetUser
      ? `Assigned to ${targetUser.full_name} (${targetUser.username})`
      : 'Responder unassigned';

    await client.query(
      `INSERT INTO incident_events
         (incident_id, event_type, body, created_by)
       VALUES ($1, 'assignment', $2, $3)`,
      [id, eventBody, user.id]
    );

    await client.query('COMMIT');
    return await getIncidentById(id);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function linkIncidentPatient(id, { patient_id }, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const curRes = await client.query(
      'SELECT id, patient_id FROM incidents WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (curRes.rows.length === 0) {
      throw new HttpError(404, 'NOT_FOUND', 'Incident not found.');
    }

    let targetPatient = null;
    if (patient_id != null) {
      const pRes = await client.query(
        'SELECT id, patient_code, full_name FROM patients WHERE id = $1',
        [patient_id]
      );
      if (pRes.rows.length === 0) {
        throw new HttpError(404, 'NOT_FOUND', 'Patient does not exist.');
      }
      targetPatient = pRes.rows[0];
    }

    await client.query('UPDATE incidents SET patient_id = $1 WHERE id = $2', [
      patient_id ?? null,
      id,
    ]);

    const eventBody = targetPatient
      ? `Linked to patient ${targetPatient.patient_code} (${targetPatient.full_name})`
      : 'Patient unlinked';

    await client.query(
      `INSERT INTO incident_events
         (incident_id, event_type, body, created_by)
       VALUES ($1, 'patient_linked', $2, $3)`,
      [id, eventBody, user.id]
    );

    await client.query('COMMIT');
    return await getIncidentById(id);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function listAssignableUsers() {
  const { rows } = await pool.query(
    `SELECT id, username, full_name, role
       FROM users
      WHERE is_active = TRUE
      ORDER BY full_name ASC`
  );
  return rows.map((r) => ({
    id: String(r.id),
    username: r.username,
    fullName: r.full_name,
    role: r.role,
  }));
}

