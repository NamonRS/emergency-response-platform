import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Pencil, Sparkles } from 'lucide-react';
import { getPatient } from '../services/patients.js';
import { useAuth } from '../hooks/useAuth.js';
import { calcAge, formatDate, formatDateTime } from '../utils/format.js';
import { incidentTypeLabels } from '../utils/labels.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import MedicalList from '../components/MedicalList.jsx';

export default function PatientDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [state, setState] = useState({ key: null, data: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    getPatient(id)
      .then((data) => {
        if (!cancelled) setState({ key: id, data, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setState({ key: id, data: null, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loading = state.key !== id;
  if (loading) return <div className="page"><LoadingSpinner label="Loading patient" /></div>;
  if (state.error) {
    return (
      <div className="page">
        <div className="notice notice-error" role="alert">{state.error}</div>
        <Link to="/patients">Back to patients</Link>
      </div>
    );
  }

  const { patient, incidents } = state.data;
  const flash = location.state?.flash;
  const showRestricted = isAdmin || patient.hasRestrictedNotes;

  return (
    <div className="page">
      <p>
        <Link to="/patients">← All patients</Link>
      </p>

      {flash && <div className="notice notice-success" role="status">{flash}</div>}

      <div className="page-header">
        <div>
          <h1>{patient.fullName}</h1>
          <p className="muted">
            {patient.patientCode} · Born {formatDate(patient.dateOfBirth)} (age{' '}
            {calcAge(patient.dateOfBirth)}){' '}
            {patient.isSynthetic && <span className="badge badge-info">Synthetic record</span>}
          </p>
        </div>
        <Link to={`/patients/${patient.id}/edit`} className="btn btn-ghost">
          <Pencil size={16} aria-hidden="true" /> Edit
        </Link>
      </div>

      <section className="card">
        <h2>Medical information</h2>
        <p className="muted small">
          “Not documented” means no information has been recorded. It does not mean the patient has
          none.
        </p>
        <div className="detail-grid">
          <div>
            <h3>Medical conditions</h3>
            <MedicalList value={patient.conditions} />
          </div>
          <div>
            <h3>Allergies</h3>
            <MedicalList value={patient.allergies} />
          </div>
          <div>
            <h3>Current medications</h3>
            <MedicalList value={patient.medications} />
          </div>
        </div>
        <h3>Relevant medical history</h3>
        {patient.medicalHistory ? (
          <p className="pre-wrap">{patient.medicalHistory}</p>
        ) : (
          <p className="muted"><em>Not documented</em></p>
        )}
      </section>

      <section className="card">
        <h2>Emergency contact</h2>
        {patient.emergencyContactName || patient.emergencyContactPhone ? (
          <p>
            {patient.emergencyContactName ?? 'Name not recorded'}
            {patient.emergencyContactRelationship && ` (${patient.emergencyContactRelationship})`}
            <br />
            {patient.emergencyContactPhone ?? 'Phone not recorded'}
          </p>
        ) : (
          <p className="muted"><em>Not documented</em></p>
        )}
      </section>

      {showRestricted && (
        <section className="card">
          <h2>Restricted notes</h2>
          {isAdmin ? (
            patient.restrictedNotes ? (
              <p className="pre-wrap">{patient.restrictedNotes}</p>
            ) : (
              <p className="muted">No restricted notes recorded.</p>
            )
          ) : (
            <p className="muted">
              Restricted notes exist for this patient and are visible to administrators only.
            </p>
          )}
        </section>
      )}

      <section className="card">
        <h2>Associated incidents</h2>
        {incidents.length === 0 ? (
          <p className="muted">No incidents are linked to this patient.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Occurred</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id}>
                    <td><Link to={`/incidents/${i.id}`}>{i.incidentCode}</Link></td>
                    <td>{incidentTypeLabels[i.incidentType] ?? i.incidentType}</td>
                    <td><StatusBadge kind="severity" value={i.severity} /></td>
                    <td><StatusBadge kind="status" value={i.status} /></td>
                    <td>{formatDateTime(i.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>AI medical summary</h2>
        <div className="notice notice-info">
          <strong>Placeholder.</strong> Local AI summaries are built in Stage 8.
        </div>
        <button type="button" className="btn btn-primary" disabled>
          <Sparkles size={16} aria-hidden="true" /> Generate AI summary
        </button>
      </section>
    </div>
  );
}