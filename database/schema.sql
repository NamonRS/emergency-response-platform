-- Emergency Response Platform - schema (PostgreSQL 14+)
-- Applied by server/src/db/setup.js. Use reset.sql (via --reset) to start over.

CREATE SEQUENCE patient_code_seq;
CREATE SEQUENCE incident_code_seq;

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------- users
CREATE TABLE users (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username       TEXT NOT NULL UNIQUE
                 CHECK (username = lower(username) AND length(username) BETWEEN 3 AND 50),
  full_name      TEXT NOT NULL CHECK (length(btrim(full_name)) > 0),
  email          TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('admin', 'responder')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------- patients
-- conditions / allergies / medications:
--   NULL      = not documented
--   '{}'      = documented as none
--   otherwise = documented entries
CREATE TABLE patients (
  id                             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_code                   TEXT NOT NULL UNIQUE
                                 DEFAULT ('PT-' || lpad(nextval('patient_code_seq')::text, 4, '0')),
  full_name                      TEXT NOT NULL CHECK (length(btrim(full_name)) > 0),
  date_of_birth                  DATE NOT NULL,
  conditions                     TEXT[],
  allergies                      TEXT[],
  medications                    TEXT[],
  medical_history                TEXT,
  emergency_contact_name         TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone        TEXT,
  restricted_notes               TEXT,
  is_synthetic                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by                     BIGINT REFERENCES users(id),
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_name_lower ON patients (lower(full_name) text_pattern_ops);

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------ incidents
CREATE TABLE incidents (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_code        TEXT NOT NULL UNIQUE
                       DEFAULT ('INC-' || lpad(nextval('incident_code_seq')::text, 4, '0')),
  incident_type        TEXT NOT NULL CHECK (incident_type IN
                         ('medical_emergency', 'road_accident', 'fire', 'natural_disaster', 'other')),
  location_description TEXT NOT NULL CHECK (length(btrim(location_description)) > 0),
  occurred_at          TIMESTAMPTZ NOT NULL,
  description          TEXT NOT NULL CHECK (length(btrim(description)) > 0),
  patient_id           BIGINT REFERENCES patients(id),
  severity             TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status               TEXT NOT NULL DEFAULT 'reported' CHECK (status IN
                         ('reported', 'under_review', 'response_in_progress', 'resolved', 'closed')),
  assigned_to          BIGINT REFERENCES users(id),
  reported_by          BIGINT NOT NULL REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_status      ON incidents (status);
CREATE INDEX idx_incidents_severity    ON incidents (severity);
CREATE INDEX idx_incidents_type        ON incidents (incident_type);
CREATE INDEX idx_incidents_occurred_at ON incidents (occurred_at DESC);
CREATE INDEX idx_incidents_patient     ON incidents (patient_id);
CREATE INDEX idx_incidents_assigned_to ON incidents (assigned_to);

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------ incident_events
-- Incident history: notes, recorded actions, status changes, etc.
CREATE TABLE incident_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_id BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN
                ('created', 'note', 'action_taken', 'status_change', 'assignment', 'patient_linked')),
  body        TEXT,
  old_status  TEXT CHECK (old_status IN
                ('reported', 'under_review', 'response_in_progress', 'resolved', 'closed')),
  new_status  TEXT CHECK (new_status IN
                ('reported', 'under_review', 'response_in_progress', 'resolved', 'closed')),
  created_by  BIGINT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (event_type <> 'status_change' OR new_status IS NOT NULL),
  CHECK (event_type NOT IN ('note', 'action_taken')
         OR (body IS NOT NULL AND length(btrim(body)) > 0))
);

CREATE INDEX idx_incident_events_incident ON incident_events (incident_id, created_at);
CREATE INDEX idx_incident_events_created  ON incident_events (created_at DESC);

-- --------------------------------------------------------- ai_summaries
-- source_snapshot = exact data sent to the model (never includes restricted notes).
CREATE TABLE ai_summaries (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  summary_type      TEXT NOT NULL CHECK (summary_type IN ('patient_medical', 'incident')),
  patient_id        BIGINT REFERENCES patients(id),
  incident_id       BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
  requested_by      BIGINT NOT NULL REFERENCES users(id),
  model             TEXT NOT NULL,
  prompt_version    TEXT NOT NULL,
  source_snapshot   JSONB NOT NULL,
  generated_content JSONB NOT NULL,
  edited_content    JSONB,
  review_status     TEXT NOT NULL DEFAULT 'pending_review'
                    CHECK (review_status IN ('pending_review', 'reviewed')),
  reviewed_by       BIGINT REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  generation_ms     INTEGER CHECK (generation_ms >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (summary_type = 'patient_medical' AND patient_id IS NOT NULL AND incident_id IS NULL) OR
    (summary_type = 'incident'        AND incident_id IS NOT NULL AND patient_id IS NULL)
  ),
  CHECK (review_status = 'pending_review'
         OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE INDEX idx_ai_summaries_patient  ON ai_summaries (patient_id, created_at DESC);
CREATE INDEX idx_ai_summaries_incident ON ai_summaries (incident_id, created_at DESC);

-- ----------------------------------------------------------- audit_logs
-- Append-only. Never store passwords or detailed medical content in details.
CREATE TABLE audit_logs (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        BIGINT REFERENCES users(id),
  actor_username TEXT,
  action         TEXT NOT NULL,
  resource_type  TEXT,
  resource_id    TEXT,
  details        JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_user    ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_action  ON audit_logs (action);

CREATE FUNCTION audit_logs_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();