import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { pool } from './db/pool.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { originCheck } from './middleware/originCheck.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(originCheck);

async function checkDatabase() {
  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch {
    return { ok: false, message: 'Database unreachable. Check DATABASE_URL and that PostgreSQL is running.' };
  }
}

async function checkOllama() {
  const model = process.env.OLLAMA_MODEL;
  try {
    const res = await fetch(`${process.env.OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    const installed = (data.models ?? []).some(
      (m) => m.name === model || m.name === `${model}:latest`
    );
    if (!installed) {
      return { ok: false, model, message: `Model not installed. Run: ollama pull ${model}` };
    }
    return { ok: true, model };
  } catch {
    return { ok: false, model, message: 'Ollama is not running. Start it, then retry.' };
  }
}

app.get('/api/health', async (req, res) => {
  const [database, ollama] = await Promise.all([checkDatabase(), checkOllama()]);
  res.json({ success: true, data: { server: { ok: true }, database, ollama } });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);