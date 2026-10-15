import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileCheck2,
  FileText,
  MapPin,
  PlusCircle,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';
import {
  acceptIncidentAiSummary,
  addIncidentEvent,
  assignIncident,
  generateIncidentAiSummary,
  getIncident,
  linkIncidentPatient,
  listAssignableUsers,
  updateIncidentStatus,
} from '../services/incidents.js';
import { listPatients } from '../services/patients.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import AiReviewModal from '../components/AiReviewModal.jsx';
import { formatDateTime } from '../utils/format.js';
import { incidentTypeLabels, severityLabels, statusLabels } from '../utils/labels.js';

function getEventIcon(eventType, isHandover) {
  if (isHandover) return <Sparkles size={13} aria-hidden="true" />;
  switch (eventType) {
    case 'created':
      return <PlusCircle size={13} aria-hidden="true" />;
    case 'status_change':
      return <Clock size={13} aria-hidden="true" />;
    case 'action_taken':
      return <CheckCircle size={13} aria-hidden="true" />;
    case 'assignment':
      return <UserCheck size={13} aria-hidden="true" />;
    case 'patient_linked':
      return <User size={13} aria-hidden="true" />;
    case 'note':
    default:
      return <FileText size={13} aria-hidden="true" />;
  }
}

export default function IncidentDetailPage() {
  const { id } = useParams();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Lookups
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Event creation form
  const [newEventType, setNewEventType] = useState('note');
  const [newEventBody, setNewEventBody] = useState('');
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // Status transition
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // AI Summary Modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiDraftData, setAiDraftData] = useState(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isApprovingAi, setIsApprovingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      getIncident(id),
      listAssignableUsers().catch(() => ({ users: [] })),
      listPatients({ pageSize: 50 }).catch(() => ({ patients: [] })),
    ])
      .then(([incData, usersData, patientsData]) => {
        if (!cancelled) {
          setIncident(incData.incident);
          setNewStatus(incData.incident.status);
          setSelectedPatientId(incData.incident.patientId || '');
          setUsers(usersData.users || []);
          setPatients(patientsData.patients || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  function showTemporarySuccess(msg) {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4500);
  }

  async function handleStatusChange(e) {
    e.preventDefault();
    if (!newStatus || newStatus === incident.status) return;

    setIsUpdatingStatus(true);
    setError('');
    try {
      const res = await updateIncidentStatus(id, {
        new_status: newStatus,
        note: statusNote.trim() || undefined,
      });
      setIncident(res.incident);
      setStatusNote('');
      showTemporarySuccess(`Status updated to ${statusLabels[res.incident.status] || res.incident.status}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleAssigneeChange(newAssigneeId) {
    setError('');
    try {
      const res = await assignIncident(id, {
        assigned_to: newAssigneeId ? newAssigneeId : null,
      });
      setIncident(res.incident);
      showTemporarySuccess('Responder assignment updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLinkPatientSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await linkIncidentPatient(id, {
        patient_id: selectedPatientId ? selectedPatientId : null,
      });
      setIncident(res.incident);
      setShowPatientSelector(false);
      showTemporarySuccess(
        selectedPatientId ? 'Patient linked to incident.' : 'Patient unlinked.'
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddEvent(e) {
    e.preventDefault();
    if (!newEventBody.trim()) return;

    setIsSubmittingEvent(true);
    setError('');
    try {
      const res = await addIncidentEvent(id, {
        event_type: newEventType,
        body: newEventBody.trim(),
      });
      setIncident((prev) => ({
        ...prev,
        events: [...(prev.events || []), res.event],
      }));
      setNewEventBody('');
      showTemporarySuccess(
        newEventType === 'action_taken' ? 'Action logged.' : 'Note added.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmittingEvent(false);
    }
  }

  async function handleTriggerAiSummary() {
    setIsGeneratingAi(true);
    setAiError('');
    try {
      const res = await generateIncidentAiSummary(id);
      setAiDraftData(res.summary);
      setAiModalOpen(true);
    } catch (err) {
      setAiError(err.message || 'Failed to generate AI summary.');
    } finally {
      setIsGeneratingAi(false);
    }
  }

  async function handleApproveAiSummary({ summaryId, edited_content }) {
    setIsApprovingAi(true);
    setAiError('');
    try {
      const res = await acceptIncidentAiSummary(id, {
        summary_id: summaryId,
        edited_content,
      });
      setIncident(res.incident);
      setAiModalOpen(false);
      showTemporarySuccess('AI Clinical Handover approved and appended to official timeline.');
    } catch (err) {
      setAiError(err.message || 'Failed to approve AI summary.');
    } finally {
      setIsApprovingAi(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner label="Loading incident details..." />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="page">
        <div className="card">
          <h2>Incident Not Found</h2>
          <p className="muted">The requested incident does not exist or has been removed.</p>
          <Link to="/incidents" className="btn btn-ghost mt-2">
            Back to Incidents
          </Link>
        </div>
      </div>
    );
  }

  const isResponseInProgress = incident.status === 'response_in_progress';

  return (
    <div className="page">
      {/* Top Breadcrumb & Header */}
      <div className="page-header mb-3">
        <div>
          <Link to="/incidents" className="btn btn-ghost btn-sm mb-2">
            <ArrowLeft size={16} aria-hidden="true" /> Back to incidents
          </Link>
          <div className="flex-row items-center gap-3">
            <h1>{incident.incidentCode}</h1>
            <StatusBadge kind="severity" value={incident.severity} />
            <div className={isResponseInProgress ? 'status-pulse' : ''}>
              <StatusBadge kind="status" value={incident.status} />
            </div>
          </div>
          <p className="muted small">
            Reported by {incident.reportedByUser?.fullName || 'System'} • Occurred at {formatDateTime(incident.occurredAt)}
          </p>
        </div>

        {/* AI Handover Action Button */}
        <div className="flex-row items-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleTriggerAiSummary}
            disabled={isGeneratingAi}
            title="Generate AI Triage & Clinical Handover synthesis locally with Ollama"
          >
            <Sparkles size={16} aria-hidden="true" />
            {isGeneratingAi ? 'Synthesizing with Local AI...' : 'Generate AI Clinical Handover'}
          </button>
        </div>
      </div>

      {/* AI Inference Shimmer Banner */}
      {isGeneratingAi && (
        <div className="ai-shimmer-card">
          <div className="flex-row items-center justify-center gap-2 mb-1">
            <Activity className="text-primary spinner" size={20} aria-hidden="true" />
            <strong className="text-primary" style={{ fontSize: '1.05rem' }}>
              Synthesizing Clinical Handover with Local Ollama...
            </strong>
          </div>
          <p className="muted small mb-0">
            Synthesizing field observations, chronological events, and linked patient background. Local inference in progress.
          </p>
        </div>
      )}

      {/* Notifications */}
      {actionSuccess && (
        <div className="notice notice-success flex-row items-center gap-2" role="status">
          <CheckCircle size={16} aria-hidden="true" /> {actionSuccess}
        </div>
      )}
      {(error || aiError) && (
        <div className="notice notice-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" /> {error || aiError}
        </div>
      )}

      {/* Unverified Info Disclaimer */}
      <div className="notice notice-warning flex-row items-center gap-2">
        <ShieldAlert size={18} className="text-warn flex-shrink-0" aria-hidden="true" />
        <span className="small">
          <strong>Field Caution:</strong> Triage ratings and caller notes remain tentative until on-scene clinician evaluation.
        </span>
      </div>

      <div className="incident-grid-layout">
        {/* Left Column: Details, Linked Patient, Status & Assignment */}
        <div className="incident-main-col">
          {/* Overview Card */}
          <section className="card" aria-labelledby="heading-details">
            <h2 id="heading-details" className="mb-2">Incident Overview</h2>
            <div className="detail-grid">
              <div>
                <span className="muted small uppercase font-bold">Type</span>
                <p>{incidentTypeLabels[incident.incidentType] || incident.incidentType}</p>
              </div>
              <div>
                <span className="muted small uppercase font-bold">Severity</span>
                <p>{severityLabels[incident.severity] || incident.severity}</p>
              </div>
              <div>
                <span className="muted small uppercase font-bold">Occurred</span>
                <p>{formatDateTime(incident.occurredAt)}</p>
              </div>
              <div>
                <span className="muted small uppercase font-bold">Last Updated</span>
                <p>{formatDateTime(incident.updatedAt)}</p>
              </div>
            </div>

            <div className="mt-3">
              <span className="muted small uppercase font-bold flex-row items-center gap-1">
                <MapPin size={14} aria-hidden="true" /> Location
              </span>
              <p className="mt-1 font-bold">{incident.locationDescription}</p>
            </div>

            <div className="mt-3">
              <span className="muted small uppercase font-bold flex-row items-center gap-1">
                <FileText size={14} aria-hidden="true" /> Description & Initial Dispatch Notes
              </span>
              <p className="mt-1 pre-wrap">{incident.description}</p>
            </div>
          </section>

          {/* Linked Patient Card */}
          <section className="card" aria-labelledby="heading-patient">
            <div className="page-header mb-2">
              <h2 id="heading-patient">Linked Patient Record</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowPatientSelector((v) => !v)}
              >
                {incident.patient ? 'Change patient' : 'Link patient'}
              </button>
            </div>

            {incident.patient ? (
              <div className="card-subtle flex-row justify-between items-center">
                <div>
                  <Link
                    to={`/patients/${incident.patient.id}`}
                    className="font-bold text-primary"
                    style={{ fontSize: '1.05rem' }}
                  >
                    {incident.patient.fullName}
                  </Link>
                  <p className="muted small mb-0">Record ID: {incident.patient.patientCode}</p>
                </div>
                <Link to={`/patients/${incident.patient.id}`} className="btn btn-ghost btn-sm">
                  View full chart
                </Link>
              </div>
            ) : (
              <p className="muted small">
                No patient is currently linked to this incident. Linking a patient incorporates known allergies and conditions into AI triage syntheses.
              </p>
            )}

            {showPatientSelector && (
              <form onSubmit={handleLinkPatientSubmit} className="mt-3 card-subtle">
                <label htmlFor="change-patient-select" className="small font-bold">
                  Select Patient to Link:
                </label>
                <div className="flex-row gap-2 mt-1">
                  <select
                    id="change-patient-select"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="form-select"
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Unlink / No patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.patientCode} — {p.fullName}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Save Link
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowPatientSelector(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Controls: Status & Assignment */}
          <section className="card" aria-labelledby="heading-controls">
            <h2 id="heading-controls" className="mb-2">Dispatch & Operational Controls</h2>
            
            {/* Responder Assignment */}
            <div className="form-field">
              <label htmlFor="assign-responder" className="small font-bold flex-row items-center gap-1">
                <UserCheck size={14} aria-hidden="true" /> Assigned Responder:
              </label>
              <select
                id="assign-responder"
                value={incident.assignedTo || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="form-select"
              >
                <option value="">-- Unassigned --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.username} • {u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Transition */}
            <form onSubmit={handleStatusChange} className="mt-3">
              <label htmlFor="change-status" className="small font-bold flex-row items-center gap-1">
                <Clock size={14} aria-hidden="true" /> Update Incident Status:
              </label>
              <div className="flex-row gap-2 mt-1">
                <select
                  id="change-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="form-select"
                  style={{ flex: 1 }}
                >
                  {Object.entries(statusLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {newStatus !== incident.status && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Optional transition note or rationale..."
                    className="form-field input"
                  />
                  <div className="mt-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? 'Saving...' : 'Apply Status Change'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </section>
        </div>

        {/* Right Column: Chronological Event Timeline & Add Note */}
        <div className="incident-timeline-col">
          <section className="card" aria-labelledby="heading-timeline">
            <h2 id="heading-timeline" className="mb-3">
              Incident Timeline ({incident.events?.length || 0})
            </h2>

            {/* Timeline Stream */}
            <div className="timeline-container">
              {incident.events?.length === 0 && (
                <p className="muted small">No events logged yet.</p>
              )}

              {incident.events?.map((ev) => {
                const isHandover =
                  ev.body?.includes('[AI Triage & Clinical Handover Approved]') ||
                  (ev.eventType === 'action_taken' && ev.body?.toLowerCase().includes('handover'));

                const badgeClass = isHandover ? 'badge-handover' : `badge-${ev.eventType}`;

                return (
                  <div key={ev.id} className="timeline-item">
                    <div className={`timeline-badge-wrap ${badgeClass}`}>
                      {getEventIcon(ev.eventType, isHandover)}
                    </div>
                    <div
                      className={`timeline-content ${
                        isHandover ? 'timeline-handover-card' : ''
                      }`}
                    >
                      <div className="timeline-header">
                        {isHandover ? (
                          <span className="handover-badge-pill">
                            <FileCheck2 size={12} aria-hidden="true" />
                            Verified AI Clinical Handover
                          </span>
                        ) : (
                          <span className="font-bold small capitalize">
                            {ev.eventType.replace('_', ' ')}
                          </span>
                        )}
                        <span className="muted small">{formatDateTime(ev.createdAt)}</span>
                      </div>

                      {ev.oldStatus && ev.newStatus && (
                        <p className="small mb-1">
                          Status: <span className="muted">{statusLabels[ev.oldStatus] || ev.oldStatus}</span> → <strong>{statusLabels[ev.newStatus] || ev.newStatus}</strong>
                        </p>
                      )}

                      {ev.body && (
                        <div className={isHandover ? 'handover-content-box' : 'timeline-body'}>
                          <p className="small pre-wrap mb-0">
                            {isHandover
                              ? ev.body.replace('[AI Triage & Clinical Handover Approved]\n', '')
                              : ev.body}
                          </p>
                        </div>
                      )}

                      <span className="muted x-small">
                        By {ev.createdBy?.fullName || ev.createdBy?.username || 'User'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Note / Action Form */}
            <form onSubmit={handleAddEvent} className="mt-4 pt-3 border-top">
              <h3 className="mb-2 flex-row items-center gap-1 font-bold">
                <PlusCircle size={16} aria-hidden="true" /> Add Field Event / Note
              </h3>
              
              <div className="flex-row gap-4 mb-2">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="eventType"
                    value="note"
                    checked={newEventType === 'note'}
                    onChange={() => setNewEventType('note')}
                  />
                  Field Note
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="eventType"
                    value="action_taken"
                    checked={newEventType === 'action_taken'}
                    onChange={() => setNewEventType('action_taken')}
                  />
                  Action Taken
                </label>
              </div>

              <div className="form-field mb-2">
                <textarea
                  rows={3}
                  value={newEventBody}
                  onChange={(e) => setNewEventBody(e.target.value)}
                  placeholder={
                    newEventType === 'action_taken'
                      ? 'e.g. Applied pressure dressing to wound; vitals stabilized at 120/80...'
                      : 'e.g. Bystander reports patient regained consciousness...'
                  }
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSubmittingEvent || !newEventBody.trim()}
              >
                <Send size={14} aria-hidden="true" />
                {isSubmittingEvent ? 'Posting...' : 'Post to Timeline'}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* AI Review & Triage Synthesis Modal */}
      <AiReviewModal
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
