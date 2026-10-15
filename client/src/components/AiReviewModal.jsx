import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, X, ShieldAlert, Sparkles } from 'lucide-react';

export default function AiReviewModal({
  isOpen,
  summaryData,
  onClose,
  onApprove,
  isSubmitting,
  error,
}) {
  const [triageCategory, setTriageCategory] = useState('Urgent');
  const [immediateRisks, setImmediateRisks] = useState('');
  const [suggestedHandoverNote, setSuggestedHandoverNote] = useState('');

  useEffect(() => {
    if (summaryData?.generatedContent) {
      const gc = summaryData.generatedContent;
      setTriageCategory(gc.triageCategory || 'Urgent');
      setImmediateRisks(
        Array.isArray(gc.immediateRisks)
          ? gc.immediateRisks.join('\n')
          : gc.immediateRisks || ''
      );
      setSuggestedHandoverNote(gc.suggestedHandoverNote || '');
    }
  }, [summaryData]);

  if (!isOpen || !summaryData) return null;

  const content = summaryData.generatedContent || {};

  function handleApprove(e) {
    e.preventDefault();
    const risksArray = immediateRisks
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const editedContent = {
      ...content,
      triageCategory,
      immediateRisks: risksArray,
      suggestedHandoverNote: suggestedHandoverNote.trim(),
    };

    onApprove({
      summaryId: summaryData.summaryId,
      edited_content: editedContent,
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <div className="flex-row items-center gap-2">
            <Sparkles className="text-primary" size={20} aria-hidden="true" />
            <h2 id="modal-title">AI Triage & Clinical Handover Draft</h2>
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

        {/* Mandatory Warning Banner */}
        <div className="notice notice-warning ai-warning-banner">
          <div className="flex-row items-start gap-2">
            <ShieldAlert size={20} className="text-warn flex-shrink-0" aria-hidden="true" />
            <div>
              <strong>AI Draft — Untrusted & Unreviewed</strong>
              <p className="small mb-0">
                This draft was generated locally by <code>{summaryData.model}</code> ({summaryData.generationMs || 0} ms).
                It has not been verified. Clinical staff must review and modify all fields before approving into the official incident record.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="notice notice-error" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleApprove} className="modal-body">
          {/* Read-only structured telemetry from model */}
          <div className="ai-summary-grid">
            <div className="card-subtle">
              <span className="text-muted small uppercase font-bold">Identified Complaints / Injuries</span>
              {content.primaryInjuries?.length ? (
                <ul className="plain-list small">
                  {content.primaryInjuries.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="small muted italic mb-0">None documented</p>
              )}
            </div>

            <div className="card-subtle">
              <span className="text-muted small uppercase font-bold">Vital Sign Abnormalities</span>
              {content.vitalSignAbnormalities?.length ? (
                <ul className="plain-list small">
                  {content.vitalSignAbnormalities.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="small muted italic mb-0">None documented / Awaiting assessment</p>
              )}
            </div>

            <div className="card-subtle">
              <span className="text-muted small uppercase font-bold">Critical Interventions Done</span>
              {content.criticalInterventionsDone?.length ? (
                <ul className="plain-list small">
                  {content.criticalInterventionsDone.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="small muted italic mb-0">None recorded yet</p>
              )}
            </div>
          </div>

          {/* Editable Triage Category */}
          <div className="form-field mt-3">
            <label htmlFor="triage-cat">Triage Category (Clinician Confirmed)</label>
            <select
              id="triage-cat"
              value={triageCategory}
              onChange={(e) => setTriageCategory(e.target.value)}
              className="form-select"
              required
            >
              <option value="Immediate">Immediate (Red - Life Threatening)</option>
              <option value="Urgent">Urgent (Yellow - Serious)</option>
              <option value="Delayed">Delayed (Green - Minor / Non-urgent)</option>
              <option value="Expectant">Expectant (Black / Palliative)</option>
            </select>
          </div>

          {/* Editable Immediate Risks */}
          <div className="form-field">
            <label htmlFor="immediate-risks">
              Immediate Risks & Hazards (One per line)
            </label>
            <textarea
              id="immediate-risks"
              rows={3}
              value={immediateRisks}
              onChange={(e) => setImmediateRisks(e.target.value)}
              placeholder="e.g. Unstable airway, traffic hazard, spinal precautions..."
            />
          </div>

          {/* Editable Handover Note */}
          <div className="form-field">
            <label htmlFor="handover-note">
              Clinical Handover Note (SBAR / MIST Format for Receiving ED)
            </label>
            <textarea
              id="handover-note"
              rows={6}
              value={suggestedHandoverNote}
              onChange={(e) => setSuggestedHandoverNote(e.target.value)}
              placeholder="Structured clinical handover report..."
              required
            />
          </div>

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
              disabled={isSubmitting || !suggestedHandoverNote.trim()}
            >
              {isSubmitting ? (
                'Approving & Appending...'
              ) : (
                <>
                  <CheckCircle size={16} aria-hidden="true" />
                  Approve & Append to Timeline
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

