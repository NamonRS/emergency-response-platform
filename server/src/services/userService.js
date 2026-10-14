import { pool } from '../db/pool.js';

export async function listUsers() {
  const { rows } = await pool.query(
    `SELECT id, username, full_name, email, role, is_active, last_login_at, created_at
       FROM users ORDER BY id`
  );
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    fullName: r.full_name,
    email: r.email,
    role: r.role,
    isActive: r.is_active,
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
  }));
}