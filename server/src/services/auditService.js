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