import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  FileCheck2,
  HeartPulse,
  Pencil,
  Sparkles,
} from 'lucide-react';
import {
  acceptPatientAiSummary,
  generatePatientAiSummary,
  getPatient,
} from '../services/patients.js';
import { useAuth } from '../hooks/useAuth.js';
import { calcAge, formatDate, formatDateTime } from '../utils/format.js';
import { incidentTypeLabels } from '../utils/labels.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import MedicalList from '../components/MedicalList.jsx';
import PatientAiReviewModal from '../components/PatientAiReviewModal.jsx';

export default function PatientDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [state, setState] = useState({ key: null, data: null, error: '' });
  const [actionSuccess, setActionSuccess] = useState('');

  // AI Modal and Generation State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiDraftData, setAiDraftData] = useState(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isApprovingAi, setIsApprovingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  const loadPatientData = useCallback(() => {
    return getPatient(id)
      .then((data) => {
        setState({ key: id, data, error: '' });
      })
      .catch((err) => {
        setState({ key: id, data: null, error: err.message });
      });
  }, [id]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  function showSuccessNotice(msg) {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4500);
  }

  async function handleTriggerAiSummary() {
    setIsGeneratingAi(true);
    setAiError('');
    try {
      const res = await generatePatientAiSummary(id);
      setAiDraftData(res.summary);
      setAiModalOpen(true);
    } catch (err) {
      setAiError(err.message || 'Failed to generate AI patient brief.');
    } finally {
      setIsGeneratingAi(false);
    }
  }

  async function handleApproveAiSummary({ summaryId, edited_content }) {
    setIsApprovingAi(true);
    setAiError('');
    try {
      const res = await acceptPatientAiSummary(id, {
        summary_id: summaryId,
        edited_content,
      });
      // Refresh patient data to reflect the new latestAiSummary
      setState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          latestAiSummary: res.summary,
        },
      }));
      setAiModalOpen(false);
      showSuccessNotice('Clinical Medical Brief approved and saved to medical record.');
    } catch (err) {
      setAiError(err.message || 'Failed to approve AI summary.');
    } finally {
      setIsApprovingAi(false);
    }
  }

  const loading = state.key !== id;
  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner label="Loading patient record..." />
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="page">
        <div className="notice notice-error" role="alert">
          {state.error || 'Patient not found.'}
        </div>
        <Link to="/patients" className="btn btn-ghost mt-2">
          ← Back to patients
        </Link>
      </div>
    );
  }

  const { patient, incidents, latestAiSummary } = state.data;
  const flash = location.state?.flash;
  const showRestricted = isAdmin || patient.hasRestrictedNotes;
  const briefContent = latestAiSummary?.content;

  const alertLevel = briefContent?.clinicalAlert || 'Medium';
  const alertBorderClass =
    alertLevel === 'High'
      ? 'triage-border-immediate'
      : alertLevel === 'Medium'
      ? 'triage-border-urgent'
      : 'triage-border-delayed';

  return (
    <div className="page">
      <p>
        <Link to="/patients">← All patients</Link>
      </p>

      {flash && (
        <div className="notice notice-success" role="status">
          {flash}
        </div>
      )}
      {actionSuccess && (
        <div className="notice notice-success flex-row items-center gap-2" role="status">
          <CheckCircle size={16} aria-hidden="true" /> {actionSuccess}
        </div>
      )}
      {aiError && (
        <div className="notice notice-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" /> {aiError}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>{patient.fullName}</h1>
          <p className="muted">
            {patient.patientCode} · Born {formatDate(patient.dateOfBirth)} (age{' '}
            {calcAge(patient.dateOfBirth)}){' '}
            {patient.isSynthetic && <span className="badge badge-info">Synthetic record</span>}
          </p>
        </div>
        <div className="flex-row items-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleTriggerAiSummary}
            disabled={isGeneratingAi}
            title="Synthesize Clinical Medical Brief locally with Ollama"
          >
            <Sparkles size={16} aria-hidden="true" />
            {isGeneratingAi ? 'Synthesizing...' : 'Generate AI Medical Brief'}
          </button>
          <Link to={`/patients/${patient.id}/edit`} className="btn btn-ghost">
            <Pencil size={16} aria-hidden="true" /> Edit
          </Link>
        </div>
      </div>

      {/* AI Computing Shimmer Feedback */}
      {isGeneratingAi && (
        <div className="ai-shimmer-card">
          <div className="flex-row items-center justify-center gap-2 mb-1">
            <Activity className="text-primary spinner" size={20} aria-hidden="true" />
            <strong className="text-primary" style={{ fontSize: '1.05rem' }}>
              Synthesizing Clinical Medical Brief with Local Ollama...
            </strong>
          </div>
          <p className="muted small mb-0">
            Analyzing documented allergies, current medications, contraindications, and emergency incidents. Zero cloud exposure.
          </p>
        </div>
      )}

      {/* Verified Clinical Medical Brief Card (High-Priority Display) */}
      {latestAiSummary && briefContent && (
        <section className={`verified-brief-card ${alertBorderClass}`} aria-labelledby="heading-ai-brief">
          <div className="flex-row items-center justify-between gap-3 flex-wrap mb-2">
            <div className="flex-row items-center gap-2">
              <span className="handover-badge-pill">
                <FileCheck2 size={13} aria-hidden="true" /> Verified Clinical Medical Brief
              </span>
              <span
                className={`badge ${
                  alertLevel === 'High'
                    ? 'badge-danger'
                    : alertLevel === 'Medium'
                    ? 'badge-warning'
                    : 'badge-ok'
                }`}
              >
                Alert Level: {alertLevel}
              </span>
            </div>
            <span className="muted small">
              Generated by {latestAiSummary.model} · Verified at {formatDateTime(latestAiSummary.reviewedAt || latestAiSummary.createdAt)}
            </span>
          </div>

          <div className="brief-protocol-box">
            <div className="flex-row items-center gap-1 mb-1 font-bold">
              <HeartPulse size={16} aria-hidden="true" /> Emergency Action Protocol (Field Directive):
            </div>
            <p className="mb-0">{briefContent.emergencyActionProtocol}</p>
          </div>

          <div className="modal-split-grid mt-2">
            <div>
              <span className="text-muted small uppercase font-bold flex-row items-center gap-1">
                <AlertOctagon size={13} className="text-danger" aria-hidden="true" /> Critical Risks & Contraindications
              </span>
              {briefContent.criticalRisks?.length ? (
                <div className="finding-chip-group">
                  {briefContent.criticalRisks.map((item, idx) => (
                    <span key={idx} className="finding-chip chip-danger">{item}</span>
                  ))}
                </div>
              ) : (
                <p className="small muted italic mt-1 mb-0">None identified</p>
              )}
            </div>

            <div>
              <span className="text-muted small uppercase font-bold flex-row items-center gap-1">
                <AlertTriangle size={13} className="text-warn" aria-hidden="true" /> Allergy Alerts
              </span>
              {briefContent.allergiesSummary?.length ? (
                <div className="finding-chip-group">
                  {briefContent.allergiesSummary.map((item, idx) => (
                    <span key={idx} className="finding-chip chip-warning">{item}</span>
                  ))}
                </div>
              ) : (
                <p className="small muted italic mt-1 mb-0">None documented</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Medical Information */}
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

      {/* Emergency Contact */}
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

      {/* Restricted Notes */}
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

      {/* Associated Incidents */}
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

      {/* AI Patient Review Modal */}
      <PatientAiReviewModal
        isOpen={aiModalOpen}
        summaryData={aiDraftData}
        onClose={() => setAiModalOpen(false)}
        onApprove={handleApproveAiSummary}
        isSubmitting={isApprovingAi}
        error={aiError}
      />
    </div>
  );
}