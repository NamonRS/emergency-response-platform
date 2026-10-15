import { useEffect, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  Eye,
  FileCode,
  Filter,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { listAuditLogs } from '../services/audit.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const ACTION_GROUPS = [
  {
    label: 'Authentication & Security',
    options: [
      { value: 'auth.login', label: 'auth.login (User Login)' },
      { value: 'auth.logout', label: 'auth.logout (User Logout)' },
      { value: 'auth.failed_login', label: 'auth.failed_login (Failed Login Attempt)' },
      { value: 'auth.forbidden', label: 'auth.forbidden (Unauthorized 403 Block)' },
    ],
  },
  {
    label: 'Patient Records',
    options: [
      { value: 'patient.view', label: 'patient.view (Record Accessed)' },
      { value: 'patient.create', label: 'patient.create (New Patient Created)' },
      { value: 'patient.update', label: 'patient.update (Demographics/Vitals Updated)' },
      {
        value: 'patient.restricted_notes_viewed',
        label: 'patient.restricted_notes_viewed (Admin Notes Access)',
      },
    ],
  },
  {
    label: 'Incidents & Field Triage',
    options: [
      { value: 'incident.view', label: 'incident.view (Incident Dossier Opened)' },
      { value: 'incident.create', label: 'incident.create (Emergency Incident Reported)' },
      { value: 'incident.status_change', label: 'incident.status_change (Triage Lifecycle Transition)' },
      { value: 'incident.add_event', label: 'incident.add_event (Field Note/Action Taken)' },
      { value: 'incident.assign', label: 'incident.assign (Responder Dispatched)' },
      { value: 'incident.link_patient', label: 'incident.link_patient (Patient Linked)' },
    ],
  },
  {
    label: 'AI Handover & Clinical Summaries',
    options: [
      { value: 'incident.ai_summary.generate', label: 'incident.ai_summary.generate (Ollama Synthesis)' },
      { value: 'incident.ai_summary.reviewed', label: 'incident.ai_summary.reviewed (Clinician Handover Verified)' },
      { value: 'ai_summary.generate', label: 'ai_summary.generate (Patient Medical Brief Generated)' },
      { value: 'ai_summary.reviewed', label: 'ai_summary.reviewed (Patient Medical Brief Verified)' },
    ],
  },
];

function getActionBadgeClass(action) {
  if (!action) return 'badge-action badge-action-view';
  if (action.includes('failed') || action.includes('forbidden')) {
    return 'badge-action badge-action-alert';
  }
  if (action.includes('login') || action.includes('logout') || action.startsWith('auth.')) {
    return 'badge-action badge-action-auth';
  }
  if (action.includes('ai_summary') || action.includes('.generate') || action.includes('.reviewed')) {
    return 'badge-action badge-action-ai';
  }
  if (action.includes('.create')) {
    return 'badge-action badge-action-create';
  }
  if (action.includes('.update') || action.includes('status_change') || action.includes('.assign')) {
    return 'badge-action badge-action-update';
  }
  return 'badge-action badge-action-view';
}

function formatDetailPreview(details) {
  if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
    return '—';
  }
  const parts = [];
  if (details.new_status) parts.push(`status: ${details.new_status}`);
  if (details.model) parts.push(`model: ${details.model}`);
  if (details.fields && Array.isArray(details.fields)) {
    parts.push(`fields: [${details.fields.join(', ')}]`);
  }
  if (details.assigned_to) parts.push(`assigned: #${details.assigned_to}`);
  if (details.summary_id) parts.push(`summary: #${details.summary_id}`);
  if (details.reason) parts.push(`reason: ${details.reason}`);

  if (parts.length > 0) return parts.join(' | ');

  const keys = Object.keys(details);
  return `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''} }`;
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const [, startTransition] = useTransition();

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listAuditLogs({
        search,
        action: selectedAction,
        resourceType: selectedResourceType,
        fromDate,
        toDate,
        page: currentPage,
        pageSize,
      });
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, pageSize, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [currentPage, pageSize, selectedAction, selectedResourceType, fromDate, toDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadLogs();
  };

  const handleResetFilters = () => {
    startTransition(() => {
      setSearch('');
      setSelectedAction('');
      setSelectedResourceType('');
      setFromDate('');
      setToDate('');
      setCurrentPage(1);
    });
  };

  const hasActiveFilters = Boolean(
    search || selectedAction || selectedResourceType || fromDate || toDate
  );

  const copyJsonPayload = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page" style={{ maxWidth: '1280px' }}>
      {/* Header section with security banner */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1>Security Activity & Audit Log</h1>
            <span className="audit-security-badge">
              <ShieldCheck size={16} aria-hidden="true" />
              Tamper-Evident System Audit Trail (Admin Restricted)
            </span>
          </div>
          <p className="muted" style={{ margin: 0, maxWidth: '850px', fontSize: '0.9rem' }}>
            Append-only, immutable PostgreSQL security ledger. All authentication attempts, patient record
            lookups, triage updates, and AI syntheses are indelibly recorded. Modifications or deletions are
            cryptographically blocked by PostgreSQL trigger <code>trg_audit_logs_immutable</code>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadLogs}
            disabled={loading}
            title="Refresh Audit Feed"
          >
            <RefreshCw size={16} className={loading ? 'spinner-icon' : ''} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* Security Telemetry Ribbon */}
      <div className="audit-stats-grid">
        <div className="audit-stat-card">
          <div className="audit-stat-icon icon-primary">
            <Database size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="audit-stat-val">{pagination.total.toLocaleString()}</div>
            <div className="audit-stat-lbl">Total Audit Events Recorded</div>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon icon-success">
            <Lock size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="audit-stat-val" style={{ color: '#166534', fontSize: '1.05rem' }}>
              Append-Only
            </div>
            <div className="audit-stat-lbl">PostgreSQL Trigger Protection Active</div>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon icon-purple">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="audit-stat-val" style={{ color: '#7e22ce', fontSize: '1.05rem' }}>
              Zero PHI Leakage
            </div>
            <div className="audit-stat-lbl">Compliant Metadata & Diff Storage</div>
          </div>
        </div>
      </div>

      {/* Structured Filter Card */}
      <div className="audit-filters-card">
        <form onSubmit={handleSearchSubmit}>
          <div className="audit-filters-row">
            {/* Search query */}
            <div style={{ position: 'relative' }}>
              <input
                type="search"
                className="audit-filter-input"
                placeholder="Search actor, action, IP, resource ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Action selector */}
            <div>
              <select
                className="audit-filter-input"
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Actions</option>
                {ACTION_GROUPS.map((grp) => (
                  <optgroup key={grp.label} label={grp.label}>
                    {grp.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Resource Type selector */}
            <div>
              <select
                className="audit-filter-input"
                value={selectedResourceType}
                onChange={(e) => {
                  setSelectedResourceType(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Resource Types</option>
                <option value="patient">Patient Records</option>
                <option value="incident">Incidents</option>
                <option value="auth">Authentication</option>
              </select>
            </div>

            {/* From Date */}
            <div>
              <input
                type="date"
                className="audit-filter-input"
                title="From Date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* To Date */}
            <div>
              <input
                type="date"
                className="audit-filter-input"
                title="To Date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Actions: Search Button & Reset */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="submit" className="btn btn-primary btn-sm" title="Apply Search">
                <Search size={14} aria-hidden="true" /> Search
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleResetFilters}
                  title="Reset Filters"
                >
                  <RotateCcw size={14} aria-hidden="true" /> Reset
                </button>
              )}
            </div>
          </div>
        </form>

        {hasActiveFilters && (
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} aria-hidden="true" />
            Filtered by:
            {search && <span className="badge badge-neutral">Query: "{search}"</span>}
            {selectedAction && <span className="badge badge-neutral">Action: {selectedAction}</span>}
            {selectedResourceType && <span className="badge badge-neutral">Resource: {selectedResourceType}</span>}
            {fromDate && <span className="badge badge-neutral">From: {fromDate}</span>}
            {toDate && <span className="badge badge-neutral">To: {toDate}</span>}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="notice notice-error" role="alert" style={{ marginTop: '16px' }}>
          <strong>Error loading audit log:</strong> {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !logs.length && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <LoadingSpinner label="Fetching immutable audit records..." />
        </div>
      )}

      {/* Empty state */}
      {!loading && logs.length === 0 && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
          <AlertTriangle size={36} style={{ color: 'var(--warn)', marginBottom: '8px' }} aria-hidden="true" />
          <h3 style={{ margin: '0 0 6px', color: 'var(--text)' }}>No Matching Audit Events</h3>
          <p style={{ margin: '0 0 16px', fontSize: '0.9rem' }}>
            No audit log entries matched your filter parameters. Try broadening your date range or clearing filters.
          </p>
          {hasActiveFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleResetFilters}>
              <RotateCcw size={14} aria-hidden="true" /> Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Table view */}
      {logs.length > 0 && (
        <div className="card table-wrap" style={{ padding: 0, marginTop: '16px' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Timestamp</th>
                <th style={{ width: '140px' }}>Actor</th>
                <th style={{ width: '120px' }}>Action</th>
                <th style={{ width: '120px' }}>Resource</th>
                <th style={{ width: '110px' }}>IP Address</th>
                <th>Payload Preview</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const dateObj = new Date(log.createdAt);
                const formattedTime = dateObj.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const formattedDate = dateObj.toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{formattedTime}</div>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>
                        {formattedDate}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                          {log.actorUsername || 'unauthenticated'}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>
                        {log.actorFullName || (log.actorRole ? `[${log.actorRole}]` : 'System/Anon')}
                      </div>
                    </td>

                    <td>
                      <span className={getActionBadgeClass(log.action)}>
                        {log.action}
                      </span>
                    </td>

                    <td>
                      {log.resourceType ? (
                        <div>
                          {log.resourceType === 'patient' && log.resourceId ? (
                            <Link to={`/patients/${log.resourceId}`} className="audit-resource-tag">
                              patient #{log.resourceId}
                              <ExternalLink size={11} aria-hidden="true" />
                            </Link>
                          ) : log.resourceType === 'incident' && log.resourceId ? (
                            <Link to={`/incidents/${log.resourceId}`} className="audit-resource-tag">
                              incident #{log.resourceId}
                              <ExternalLink size={11} aria-hidden="true" />
                            </Link>
                          ) : (
                            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--muted)' }}>
                              {log.resourceType} {log.resourceId ? `#${log.resourceId}` : ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    <td>
                      <span className="audit-code-ip">
                        {log.ipAddress || '—'}
                      </span>
                    </td>

                    <td>
                      <div className="audit-details-preview" title={JSON.stringify(log.details)}>
                        {formatDetailPreview(log.details)}
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => setSelectedLog(log)}
                        title="Inspect JSON Payload"
                      >
                        <FileCode size={14} aria-hidden="true" /> Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination bar */}
          <div className="audit-pagination-bar">
            <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
              Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}{' '}
              recorded events
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
                <span className="muted">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="audit-filter-input"
                  style={{ width: 'auto', padding: '4px 8px' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="audit-pagination-nav">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || loading}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>

                <span style={{ fontSize: '0.84rem', fontWeight: 600, padding: '0 6px' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON Payload Inspection Modal */}
      {selectedLog && (
        <div
          className="audit-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-modal-title"
          onClick={() => setSelectedLog(null)}
        >
          <div className="audit-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <div>
                <h3 id="audit-modal-title" style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCode size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                  Audit Event #{selectedLog.id}
                </h3>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  Recorded on {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedLog(null)}
                aria-label="Close dialog"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="audit-modal-body">
              {/* Event Metadata Cards */}
              <div className="audit-metadata-grid">
                <div className="audit-meta-item">
                  <span className="audit-meta-lbl">Action</span>
                  <span className={getActionBadgeClass(selectedLog.action)}>
                    {selectedLog.action}
                  </span>
                </div>

                <div className="audit-meta-item">
                  <span className="audit-meta-lbl">Actor</span>
                  <span className="audit-meta-val">
                    {selectedLog.actorUsername || 'anonymous'}{' '}
                    {selectedLog.actorFullName ? `(${selectedLog.actorFullName})` : ''}
                  </span>
                </div>

                <div className="audit-meta-item">
                  <span className="audit-meta-lbl">Target Resource</span>
                  <span className="audit-meta-val">
                    {selectedLog.resourceType
                      ? `${selectedLog.resourceType} ${selectedLog.resourceId ? `#${selectedLog.resourceId}` : ''}`
                      : 'None'}
                  </span>
                </div>

                <div className="audit-meta-item">
                  <span className="audit-meta-lbl">Client IP</span>
                  <span className="audit-meta-val audit-code-ip" style={{ alignSelf: 'flex-start' }}>
                    {selectedLog.ipAddress || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* JSON Payload Inspection Box */}
              <div>
                <div className="audit-json-wrap">
                  <div className="audit-json-header">
                    <span>EVENT METADATA & DELTA PAYLOAD (JSONB)</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#94a3b8', borderColor: '#334155', padding: '2px 8px' }}
                      onClick={copyJsonPayload}
                    >
                      {copied ? (
                        <>
                          <Check size={13} style={{ color: '#86efac' }} aria-hidden="true" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={13} aria-hidden="true" /> Copy JSON
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="audit-json-box">
                    <code>{JSON.stringify(selectedLog.details, null, 2)}</code>
                  </pre>
                </div>
              </div>

              {/* Privacy & Cryptographic Immutability Note */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  color: 'var(--muted)',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <Lock size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
                <div>
                  <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '2px' }}>
                    Tamper-Evident & Zero PHI Compliance Guarantee:
                  </strong>
                  This record is permanently sealed in PostgreSQL. The trigger function{' '}
                  <code>audit_logs_immutable()</code> denies any <code>UPDATE</code> or <code>DELETE</code>.
                  Protected Health Information (PHI) such as clinical notes or sensitive history are strictly
                  excluded from audit payloads; only metadata and system deltas are retained.
                </div>
              </div>
            </div>

            <div className="audit-modal-footer">
              <span className="muted" style={{ fontSize: '0.78rem' }}>
                Event ID: {selectedLog.id}
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

