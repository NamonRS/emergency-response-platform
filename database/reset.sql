-- Drops everything created by schema.sql. Used only by: npm run db:reset
DROP TABLE IF EXISTS audit_logs, ai_summaries, incident_events, incidents, patients, users CASCADE;
DROP SEQUENCE IF EXISTS patient_code_seq, incident_code_seq;
DROP FUNCTION IF EXISTS set_updated_at();
DROP FUNCTION IF EXISTS audit_logs_immutable();