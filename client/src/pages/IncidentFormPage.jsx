import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, ShieldAlert } from 'lucide-react';
import { createIncident, listAssignableUsers } from '../services/incidents.js';
import { listPatients } from '../services/patients.js';
import { incidentTypeLabels, severityLabels } from '../utils/labels.js';

function toLocalDatetimeInputValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function IncidentFormPage() {
  const navigate = useNavigate();

  const [incidentType, setIncidentType] = useState('medical_emergency');
  const [severity, setSeverity] = useState('medium');
  const [locationDescription, setLocationDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(toLocalDatetimeInputValue());
  const [description, setDescription] = useState('');
  const [patientId, setPatientId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const [patients, setPatients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      listPatients({ pageSize: 50 }).catch(() => ({ patients: [] })),
      listAssignableUsers().catch(() => ({ users: [] })),
    ]).then(([patientsRes, usersRes]) => {
      if (!cancelled) {
        setPatients(patientsRes.patients || []);
        setUsers(usersRes.users || []);
        setLoadingLookups(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors = {};
    if (!locationDescription.trim()) {
      errors.location_description = 'Location description is required.';
    }
    if (!description.trim()) {
      errors.description = 'Incident description is required.';
    }
    if (!occurredAt) {
      errors.occurred_at = 'Incident occurrence timestamp is required.';
    } else if (new Date(occurredAt).getTime() > Date.now() + 60000) {
      errors.occurred_at = 'Incident time cannot be in the future.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        incident_type: incidentType,
        severity,
        location_description: locationDescription.trim(),
        occurred_at: new Date(occurredAt).toISOString(),
        description: description.trim(),
        patient_id: patientId ? patientId : null,
        assigned_to: assignedTo ? assignedTo : null,
      };

      const result = await createIncident(payload);
      navigate(`/incidents/${result.incident.id}`);
    } catch (err) {
      setError(err.message || 'Failed to report incident.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: '800px' }}>
      <div className="page-header mb-3">
        <div>
          <Link to="/incidents" className="btn btn-ghost btn-sm mb-2">
            <ArrowLeft size={16} aria-hidden="true" /> Back to incidents
          </Link>
          <h1>Report New Incident</h1>
          <p className="muted">Log an emergency occurrence and dispatch responders</p>
        </div>
      </div>

      <div className="notice notice-warning flex-row items-center gap-2 mb-3">
        <ShieldAlert size={18} className="text-warn flex-shrink-0" aria-hidden="true" />
        <span className="small">
          All initial logs are classified as unverified bystander/dispatch reports until assessed on-scene.
        </span>
      </div>

      {error && (
        <div className="notice notice-error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="incident-type">Incident Type *</label>
            <select
              id="incident-type"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="form-select"
              required
            >
              {Object.entries(incidentTypeLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="severity">Initial Severity *</label>
            <select
              id="severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="form-select"
              required
            >
              {Object.entries(severityLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="location">Location Description *</label>
          <input
            id="location"
            type="text"
            value={locationDescription}
            onChange={(e) => setLocationDescription(e.target.value)}
            placeholder="e.g. West Gate Entrance, 5th Cross Road (landmark / cross street)"
            aria-invalid={Boolean(fieldErrors.location_description)}
            required
          />
          {fieldErrors.location_description && (
            <p className="field-error">{fieldErrors.location_description}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="occurred-at">Occurred At *</label>
          <input
            id="occurred-at"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            max={toLocalDatetimeInputValue()}
            aria-invalid={Boolean(fieldErrors.occurred_at)}
            required
          />
          {fieldErrors.occurred_at && (
            <p className="field-error">{fieldErrors.occurred_at}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="description">Situation Description *</label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what occurred, hazards present, number of casualties, caller details..."
            aria-invalid={Boolean(fieldErrors.description)}
            required
          />
          {fieldErrors.description && (
            <p className="field-error">{fieldErrors.description}</p>
          )}
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="patient-select">Linked Patient (Optional)</label>
            <select
              id="patient-select"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="form-select"
              disabled={loadingLookups}
            >
              <option value="">-- No patient record linked --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patientCode} — {p.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="assignee-select">Assign Responder (Optional)</label>
            <select
              id="assignee-select"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="form-select"
              disabled={loadingLookups}
            >
              <option value="">-- Leave Unassigned --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.username} - {u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            <Check size={16} aria-hidden="true" />
            {isSubmitting ? 'Reporting...' : 'Save & Dispatch Incident'}
          </button>
          <Link to="/incidents" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

