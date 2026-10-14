import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  return value;
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32 || jwtSecret.includes('CHANGE_ME')) {
  throw new Error(
    `JWT_SECRET must be a random string of at least 32 characters. Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
  );
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  clientOrigin: required('CLIENT_ORIGIN'),
  jwtSecret,
  sessionHours: Number(process.env.SESSION_HOURS) || 8,
  cookieName: 'erp_session',
};