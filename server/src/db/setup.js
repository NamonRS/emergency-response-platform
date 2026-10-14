import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, '../../../database');

const args = new Set(process.argv.slice(2));
const reset = args.has('--reset');
const skipSeed = args.has('--no-seed');
const BCRYPT_ROUNDS = 12;

const demoUsers = [
  { username: 'admin', fullName: 'Demo Administrator', email: 'admin@example.com', role: 'admin', passwordEnv: 'DEMO_ADMIN_PASSWORD' },
  { username: 'responder1', fullName: 'Demo Responder One', email: 'responder1@example.com', role: 'responder', passwordEnv: 'DEMO_RESPONDER_PASSWORD' },
  { username: 'responder2', fullName: 'Demo Responder Two', email: 'responder2@example.com', role: 'responder', passwordEnv: 'DEMO_RESPONDER_PASSWORD' },
];

function readPassword(envName) {
  const value = process.env[envName];
  if (!value || value.length < 10 || value.includes('CHANGE_ME')) {
    throw new Error(
      `${envName} must be set in server/.env (at least 10 characters, not the CHANGE_ME placeholder).`
    );
  }
  return value;
}

const readSql = (name) => fs.readFile(path.join(dbDir, name), 'utf8');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Create server/.env from .env.example.');
  }

  // Validate demo passwords before touching the database.
  const passwords = {};
  if (!skipSeed) {
    for (const u of demoUsers) passwords[u.passwordEnv] = readPassword(u.passwordEnv);
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const existing = await client.query("SELECT to_regclass('public.users') AS t");
    if (existing.rows[0].t && !reset) {
      throw new Error('Tables already exist. Run "npm run db:reset" to drop and recreate them (this deletes all data).');
    }

    await client.query('BEGIN');

    if (reset) {
      console.log('Dropping existing objects...');
      await client.query(await readSql('reset.sql'));
    }

    console.log('Applying schema...');
    await client.query(await readSql('schema.sql'));

    if (!skipSeed) {
      console.log('Creating demo users...');
      for (const u of demoUsers) {
        const hash = await bcrypt.hash(passwords[u.passwordEnv], BCRYPT_ROUNDS);
        await client.query(
          `INSERT INTO users (username, full_name, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5)`,
          [u.username, u.fullName, u.email, hash, u.role]
        );
      }

      console.log('Loading synthetic seed data...');
      await client.query(await readSql('seed.sql'));

      await client.query(
        "INSERT INTO audit_logs (action, details) VALUES ('system.database_seeded', $1)",
        [JSON.stringify({ synthetic: true })]
      );
    }

    const counts = await client.query(`
      SELECT (SELECT count(*) FROM users)           AS users,
             (SELECT count(*) FROM patients)        AS patients,
             (SELECT count(*) FROM incidents)       AS incidents,
             (SELECT count(*) FROM incident_events) AS events`);

    await client.query('COMMIT');
    console.log('Done. Row counts:', counts.rows[0]);
    if (!skipSeed) {
      console.log('Demo usernames: admin, responder1, responder2 (passwords come from server/.env)');
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Database setup failed:', err.message);
  process.exit(1);
});