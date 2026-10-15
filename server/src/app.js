import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { pool } from './db/pool.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import { originCheck } from './middleware/originCheck.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(originCheck);

async function checkDatabase() {
  const start = Date.now();
  try {
    const [, countsRes] = await Promise.all([
      pool.query('SELECT 1'),
      pool.query(`
        SELECT 
          (SELECT count(*) FROM users) AS users,
          (SELECT count(*) FROM patients) AS patients,
          (SELECT count(*) FROM incidents) AS incidents,
          (SELECT count(*) FROM incident_events) AS incident_events,
          (SELECT count(*) FROM ai_summaries) AS ai_summaries,
          (SELECT count(*) FROM audit_logs) AS audit_logs
      `),
    ]);
    const latencyMs = Date.now() - start;
    const row = countsRes.rows[0];
    return {
      ok: true,
      latencyMs,
      tables: {
        users: Number(row.users),
        patients: Number(row.patients),
        incidents: Number(row.incidents),
        incidentEvents: Number(row.incident_events),
        aiSummaries: Number(row.ai_summaries),
        auditLogs: Number(row.audit_logs),
      },
    };
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      message: 'Database unreachable. Check DATABASE_URL and that PostgreSQL is running.',
    };
  }
}

async function checkOllama() {
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { ok: false, model, latencyMs, message: `Ollama returned HTTP ${res.status}` };
    }
    const data = await res.json();
    const installed = (data.models ?? []).some(
      (m) => m.name === model || m.name === `${model}:latest`
    );
    if (!installed) {
      return {
        ok: false,
        model,
        latencyMs,
        installedModels: (data.models ?? []).map((m) => m.name),
        message: `Model "${model}" is not installed. Run: ollama pull ${model}`,
      };
    }
    return {
      ok: true,
      model,
      baseUrl,
      latencyMs,
      installedModels: (data.models ?? []).map((m) => m.name),
    };
  } catch {
    return {
      ok: false,
      model,
      baseUrl,
      latencyMs: Date.now() - start,
      message: 'Ollama is offline or unreachable. Ensure Ollama is running.',
    };
  }
}

async function checkAuditTrigger() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id FROM audit_logs LIMIT 1');
    let testId = rows[0]?.id;
    if (!testId) {
      const ins = await client.query("INSERT INTO audit_logs (action, details) VALUES ('diag.probe', '{}') RETURNING id");
      testId = ins.rows[0].id;
    }
    let blocked = false;
    try {
      await client.query('UPDATE audit_logs SET action = $1 WHERE id = $2', ['tamper_probe', testId]);
    } catch (e) {
      if (e.message && e.message.includes('audit_logs is append-only')) {
        blocked = true;
      }
    }
    await client.query('ROLLBACK');
    return {
      ok: blocked,
      status: blocked ? 'immutable_active' : 'trigger_unprotected',
      message: blocked
        ? 'PostgreSQL trigger trg_audit_logs_immutable is actively enforcing append-only rules.'
        : 'Warning: Trigger did not reject illicit UPDATE.',
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return { ok: false, status: 'error', message: err.message };
  } finally {
    client.release();
  }
}

app.get('/api/health', async (req, res) => {
  const [database, ollama, auditTrigger] = await Promise.all([
    checkDatabase(),
    checkOllama(),
    checkAuditTrigger(),
  ]);
  const server = {
    ok: true,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  };
  res.json({
    success: true,
    data: {
      server,
      database,
      ollama,
      auditTrigger,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/assistant', assistantRoutes);

app.use(notFound);
app.use(errorHandler);