import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { config } from '../config.js';

// Compared against when the username doesn't exist, so timing doesn't reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export const publicUser = (row) => ({
  id: row.id,
  username: row.username,
  fullName: row.full_name,
  email: row.email,
  role: row.role,
});

export async function verifyCredentials(username, password) {
  const { rows } = await pool.query(
    `SELECT id, username, full_name, email, role, password_hash, is_active
       FROM users WHERE username = $1`,
    [username]
  );
  const user = rows[0];
  const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (!user) return { ok: false, reason: 'unknown_user' };
  if (!passwordOk) return { ok: false, reason: 'bad_password', user };
  if (!user.is_active) return { ok: false, reason: 'inactive', user };
  return { ok: true, user };
}

export async function recordLogin(userId) {
  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [userId]);
}

export function signSession(user) {
  return jwt.sign({}, config.jwtSecret, {
    subject: String(user.id),
    algorithm: 'HS256',
    expiresIn: `${config.sessionHours}h`,
  });
}

export function verifySession(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}