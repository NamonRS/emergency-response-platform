import { useState, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HeartPulse,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';

export default function PatientAiReviewModal({
  isOpen,
  summaryData,
  onClose,
  onApprove,
  isSubmitting,
  error,
}) {
  const [clinicalAlert, setClinicalAlert] = useState('Medium');
  const [emergencyActionProtocol, setEmergencyActionProtocol] = useState('');

  useEffect(() => {
    if (summaryData?.generatedContent) {
      const gc = summaryData.generatedContent;
      setClinicalAlert(gc.clinicalAlert || 'Medium');
      setEmergencyActionProtocol(gc.emergencyActionProtocol || '');
    }
  }, [summaryData]);

  if (!isOpen || !summaryData) return null;

  const content = summaryData.generatedContent || {};

  function handleApprove(e) {
    e.preventDefault();
    const editedContent = {
      ...content,
      clinicalAlert,
      emergencyActionProtocol: emergencyActionProtocol.trim(),
    };

    onApprove({
      summaryId: summaryData.summaryId,
      edited_content: editedContent,
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="patient-modal-title">
      <div className="modal-card">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex-row items-center gap-2">
            <Sparkles className="text-primary" size={20} aria-hidden="true" />
            <h2 id="patient-modal-title" style={{ fontSize: '1.15rem', margin: 0 }}>
              AI Clinical Medical Brief Review
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleApprove} className="modal-body">
          {/* Warning Banner with Telemetry */}
          <div className="ai-warning-banner mb-3">
            <div className="flex-row items-start justify-between gap-3 flex-wrap">
              <div className="flex-row items-start gap-2" style={{ flex: 1, minWidth: '260px' }}>
                <ShieldAlert size={22} className="text-warn flex-shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <strong className="text-warn">AI Draft — Untrusted & Unreviewed</strong>
                  <p className="small mb-0 text-muted" style={{ lineHeight: 1.45 }}>
                    Clinical personnel must review and confirm alert ratings and guidance before saving into the official medical chart.
                  </p>
                </div>
              </div>
              <div className="flex-row items-center gap-2">
                <span className="telemetry-tag" title="Local Model">
                  <Cpu size={12} aria-hidden="true" /> {summaryData.model}
                </span>
                <span className="telemetry-tag" title="Inference Latency">
                  <Clock size={12} aria-hidden="true" /> {summaryData.generationMs || 0} ms
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="notice notice-error mb-3" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Middle: Split Grid */}
          <div className="modal-split-grid">
            {/* Left Column: Extracted Alerts & Contraindications */}
            <div>
              <div className="card-subtle mb-3">
                <div className="flex-row items-center gap-1 mb-1">
                  <AlertOctagon size={15} className="text-danger" aria-hidden="true" />
                  <span className="text-muted small uppercase font-bold">Critical Risks & Contraindications</span>
                </div>
                {content.criticalRisks?.length ? (
                  <div className="finding-chip-group">
                    {content.criticalRisks.map((risk, idx) => (
                      <span key={idx} className="finding-chip chip-danger">
                        {risk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="small muted italic mb-0">None identified</p>
                )}
              </div>

              <div className="card-subtle mb-3">
                <div className="flex-row items-center gap-1 mb-1">
                  <AlertTriangle size={15} className="text-warn" aria-hidden="true" />
                  <span className="text-muted small uppercase font-bold">Documented Allergies</span>
                </div>
                {content.allergiesSummary?.length ? (
                  <div className="finding-chip-group">
                    {content.allergiesSummary.map((item, idx) => (
                      <span key={idx} className="finding-chip chip-warning">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="small muted italic mb-0">None documented</p>
                )}
              </div>

              <div className="card-subtle">
                <div className="flex-row items-center gap-1 mb-1">
                  <HeartPulse size={15} className="text-primary" aria-hidden="true" />
                  <span className="text-muted small uppercase font-bold">Chronic Conditions</span>
                </div>
                {content.chronicConditionsSummary?.length ? (
                  <div className="finding-chip-group">
                    {content.chronicConditionsSummary.map((item, idx) => (
                      <span key={idx} className="finding-chip">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="small muted italic mb-0">None documented</p>
                )}
              </div>
            </div>

            {/* Right Column: Editable Protocol & Alert Level */}
            <div>
              <div className="form-field mb-3">
                <label htmlFor="patient-clinical-alert" className="small font-bold">
                  Clinical Alert Level (Clinician Confirmed) *
                </label>
                <select
                  id="patient-clinical-alert"
                  value={clinicalAlert}
                  onChange={(e) => setClinicalAlert(e.target.value)}
                  className={`form-select ${
                    clinicalAlert === 'High'
                      ? 'triage-border-immediate'
                      : clinicalAlert === 'Medium'
                      ? 'triage-border-urgent'
                      : 'triage-border-delayed'
                  }`}
                  required
                >
                  <option value="High">High (Critical Contraindications / Severe Risk)</option>
                  <option value="Medium">Medium (Moderate Complexity / Known Comorbidities)</option>
                  <option value="Low">Low (Routine / Minimal Acute Risk)</option>
                </select>
              </div>

              <div className="form-field mb-0">
                <label htmlFor="action-protocol" className="small font-bold">
                  Emergency Action Protocol for Responders (1–3 sentences) *
                </label>
                <textarea
                  id="action-protocol"
                  rows={6}
                  value={emergencyActionProtocol}
                  onChange={(e) => setEmergencyActionProtocol(e.target.value)}
                  placeholder="e.g. Avoid beta-blockers due to severe asthma. Check blood glucose immediately on contact..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !emergencyActionProtocol.trim()}
            >
              {isSubmitting ? (
                'Saving to Medical Record...'
              ) : (
                <>
                  <CheckCircle size={16} aria-hidden="true" />
                  Approve & Save to Medical Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

