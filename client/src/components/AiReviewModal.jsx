import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  FileCheck2,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react';

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
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex-row items-center gap-2">
            <Sparkles className="text-primary" size={20} aria-hidden="true" />
            <h2 id="modal-title" style={{ fontSize: '1.15rem', margin: 0 }}>
              AI Clinical Handover & Triage Review
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
          {/* Top: Warning Banner with Telemetry */}
          <div className="ai-warning-banner mb-3">
            <div className="flex-row items-start justify-between gap-3 flex-wrap">
              <div className="flex-row items-start gap-2" style={{ flex: 1, minWidth: '260px' }}>
                <ShieldAlert size={22} className="text-warn flex-shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <strong style={{ color: '#92400e' }}>AI Draft — Untrusted & Unreviewed</strong>
                  <p className="small mb-0 text-muted" style={{ lineHeight: 1.45 }}>
                    Clinical staff must review, verify, and edit all data before committing to the official patient record.
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

          {/* Middle: Split Grid (Left: Extracted Telemetry, Right: Clinician Form) */}
          <div className="modal-split-grid">
            {/* Left Column: Extracted Field Findings */}
            <div className="flex-col gap-3">
              <div className="card-subtle mb-3">
                <div className="flex-row items-center gap-1 mb-1">
                  <Stethoscope size={15} className="text-primary" aria-hidden="true" />
                  <span className="text-muted small uppercase font-bold">Primary Complaints / Injuries</span>
                </div>
                {content.primaryInjuries?.length ? (
                  <div className="finding-chip-group">
                    {content.primaryInjuries.map((item, idx) => (
                      <span key={idx} className="finding-chip chip-danger">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="small muted italic mb-0">None documented</p>
                )}
              </div>

              <div className="card-subtle mb-3">
                <div className="flex-row items-center gap-1 mb-1">
                  <AlertTriangle size={15} className="text-warn" aria-hidden="true" />
                  <span className="text-muted small uppercase font-bold">Vital Sign Abnormalities</span>
                </div>
                {content.vitalSignAbnormalities?.length ? (
                  <div className="finding-chip-group">
                    {content.vitalSignAbnormalities.map((item, idx) => (
                      <span key={idx} className="finding-chip chip-warning">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="small muted italic mb-0">None documented / Awaiting assessment</p>
                )}
              </div>

              <div className="card-subtle">
                <div className="flex-row items-center gap-1 mb-1">
                  <FileCheck2 size={15} className="text-ok" aria-hidden="true" />
                  <span className="text-muted small uppercase font-bold">Interventions Performed</span>
                </div>
                {content.criticalInterventionsDone?.length ? (
                  <div className="finding-chip-group">
                    {content.criticalInterventionsDone.map((item, idx) => (
                      <span key={idx} className="finding-chip chip-success">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="small muted italic mb-0">None recorded</p>
                )}
              </div>
            </div>

            {/* Right Column: Clinician Verified Handover Note */}
            <div>
              <div className="form-field mb-3">
                <label htmlFor="triage-cat" className="small font-bold">
                  Assigned Triage Category *
                </label>
                <select
                  id="triage-cat"
                  value={triageCategory}
                  onChange={(e) => setTriageCategory(e.target.value)}
                  className={`form-select triage-border-${triageCategory.toLowerCase()}`}
                  required
                >
                  <option value="Immediate">Immediate (Red — Resuscitation / Life Threatening)</option>
                  <option value="Urgent">Urgent (Yellow — Emergent / Serious)</option>
                  <option value="Delayed">Delayed (Green — Non-urgent / Minor)</option>
                  <option value="Expectant">Expectant (Black — Palliative)</option>
                </select>
              </div>

              <div className="form-field mb-3">
                <label htmlFor="immediate-risks" className="small font-bold">
                  Immediate Risks & Hazards (One per line)
                </label>
                <textarea
                  id="immediate-risks"
                  rows={2}
                  value={immediateRisks}
                  onChange={(e) => setImmediateRisks(e.target.value)}
                  placeholder="e.g. Hypoglycemia recurrence, traffic hazards..."
                />
              </div>

              <div className="form-field mb-0">
                <label htmlFor="handover-note" className="small font-bold">
                  Clinical Handover Note (SBAR / MIST Format) *
                </label>
                <textarea
                  id="handover-note"
                  rows={6}
                  value={suggestedHandoverNote}
                  onChange={(e) => setSuggestedHandoverNote(e.target.value)}
                  placeholder="Comprehensive structured field handover note..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Bottom Sticky Action Bar */}
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
                'Committing to Record...'
              ) : (
                <>
                  <CheckCircle size={16} aria-hidden="true" />
                  Approve & Commit to Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
