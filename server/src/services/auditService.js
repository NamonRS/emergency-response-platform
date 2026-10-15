import { pool } from '../db/pool.js';

// Never pass passwords, tokens, or detailed medical content in `details`.
export async function logAudit({
  req,
  userId,
  username,
  action,
  resourceType = null,
  resourceId = null,
  details = {},
}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs
         (user_id, actor_username, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId ?? req?.user?.id ?? null,
        username ?? req?.user?.username ?? null,
        action,
        resourceType,
        resourceId == null ? null : String(resourceId),
        JSON.stringify(details),
        req?.ip ?? null,
      ]
    );
  } catch (err) {
    // Prototype choice: do not break the request if the audit write fails.
    console.error('Audit log write failed:', err.message);
  }
}

function mapAuditRow(row) {
  return {
    id: String(row.id),
    userId: row.user_id != null ? String(row.user_id) : null,
    actorUsername: row.actor_username,
    actorFullName: row.actor_full_name || null,
    actorRole: row.actor_role || null,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    details: row.details ?? {},
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

export async function listAuditLogs({
  page = 1,
  pageSize = 20,
  action,
  resourceType,
  userId,
  fromDate,
  toDate,
  search,
} = {}) {
  const conditions = [];
  const params = [];

  if (action) {
    params.push(action);
    conditions.push(`a.action = $${params.length}`);
  }

  if (resourceType) {
    params.push(resourceType);
    conditions.push(`a.resource_type = $${params.length}`);
  }

  if (userId) {
    params.push(userId);
    conditions.push(`a.user_id = $${params.length}`);
  }

  if (fromDate) {
    const d = new Date(fromDate);
    if (!Number.isNaN(d.getTime())) {
      params.push(d.toISOString());
      conditions.push(`a.created_at >= $${params.length}`);
    }
  }

  if (toDate) {
    let d = new Date(toDate);
    if (!Number.isNaN(d.getTime())) {
      // If only YYYY-MM-DD was provided, include through end of day
      if (toDate.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
        d = new Date(`${toDate}T23:59:59.999Z`);
      }
      params.push(d.toISOString());
      conditions.push(`a.created_at <= $${params.length}`);
    }
  }

  if (search) {
    const escaped = search.replace(/[\\%_]/g, '\\$&');
    params.push(`%${escaped}%`);
    const idx = params.length;
    conditions.push(
      `(a.actor_username ILIKE $${idx} OR a.resource_id ILIKE $${idx} OR a.action ILIKE $${idx} OR u.full_name ILIKE $${idx} OR a.ip_address ILIKE $${idx})`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    pool.query(
      `SELECT count(*) AS total
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
       ${whereClause}`,
      params
    ),
    pool.query(
      `SELECT a.id, a.user_id, a.actor_username, a.action, a.resource_type,
              a.resource_id, a.details, a.ip_address, a.created_at,
              u.full_name AS actor_full_name, u.role AS actor_role
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
       ${whereClause}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize]
    ),
  ]);

  const total = Number(countRes.rows[0].total);

  return {
    logs: dataRes.rows.map(mapAuditRow),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}