import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Plus, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { listIncidents } from '../services/incidents.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDateTime } from '../utils/format.js';
import { incidentTypeLabels, severityLabels, statusLabels } from '../utils/labels.js';

export default function IncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const status = searchParams.get('status') ?? '';
  const severity = searchParams.get('severity') ?? '';
  const incidentType = searchParams.get('type') ?? '';

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Seconds ago tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastSyncedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSyncedAt]);

  const fetchData = useCallback((isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError('');
    } else {
      setIsSyncing(true);
    }

    return listIncidents({
      q,
      page,
      status,
      severity,
      incident_type: incidentType,
      pageSize: 10,
    })
      .then((res) => {
        setData(res);
        setLastSyncedAt(Date.now());
        setSecondsAgo(0);
        setError('');
      })
      .catch((err) => {
        if (!isBackground) setError(err.message);
      })
      .finally(() => {
        setLoading(false);
        setIsSyncing(false);
      });
  }, [q, page, status, severity, incidentType]);

  // Initial and param-change fetch
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Background polling (8s) with visibility check
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 8000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);

  function updateFilters(updates) {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.set('page', '1');
    setSearchParams(next);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    updateFilters({ q: searchInput.trim() });
  }

  function goToPage(p) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  }

  const pagination = data?.pagination;
  const firstShown = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastShown = pagination
    ? Math.min(pagination.total, pagination.page * pagination.pageSize)
    : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Incidents</h1>
          <p className="muted">Live emergency response log and triage dispatch</p>
        </div>
        <div className="flex-row items-center gap-3">
          {/* Live Sync Badge */}
          <div className="live-indicator-badge" title="Live background polling every 8s">
            <span className="live-dot" aria-hidden="true" />
            <span className="small muted">
              {isSyncing ? 'Syncing...' : `Live Feed (${secondsAgo}s ago)`}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fetchData(true)}
              disabled={isSyncing || loading}
              aria-label="Refresh incident feed"
            >
              <RefreshCw size={13} className={isSyncing ? 'spinner-icon' : ''} />
            </button>
          </div>

          <Link to="/incidents/new" className="btn btn-primary">
            <Plus size={16} aria-hidden="true" /> Report incident
          </Link>
        </div>
      </div>

      {/* Mandatory Clinical Disclaimer */}
      <div className="notice notice-warning flex-row items-center gap-2">
        <ShieldAlert size={18} className="text-warn flex-shrink-0" aria-hidden="true" />
        <span>
          <strong>On-scene verification required:</strong> Reported information is preliminary and unverified until assessed by the deployed field unit.
        </span>
      </div>

      {/* Filters Bar */}
      <div className="card filters-card">
        <form onSubmit={handleSearchSubmit} className="search-bar">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by code, location, or description..."
            aria-label="Search incidents"
          />
          <button type="submit" className="btn btn-primary">
            <Search size={16} aria-hidden="true" /> Search
          </button>
        </form>

        <div className="filter-selects-row">
          <div className="filter-group">
            <label htmlFor="filter-type" className="small muted">Incident Type:</label>
            <select
              id="filter-type"
              value={incidentType}
              onChange={(e) => updateFilters({ type: e.target.value })}
              className="form-select"
            >
              <option value="">All Types</option>
              {Object.entries(incidentTypeLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-severity" className="small muted">Severity:</label>
            <select
              id="filter-severity"
              value={severity}
              onChange={(e) => updateFilters({ severity: e.target.value })}
              className="form-select"
            >
              <option value="">All Severities</option>
              {Object.entries(severityLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-status" className="small muted">Status:</label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="form-select"
            >
              <option value="">All Statuses</option>
              {Object.entries(statusLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {(q || status || severity || incidentType) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSearchParams({})}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && !loading && (
        <div className="notice notice-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" /> {error}
        </div>
      )}

      {loading && <LoadingSpinner label="Loading incidents" />}

      {data && data.incidents.length === 0 && !loading && (
        <div className="card empty-state">
          <p>
            {q || status || severity || incidentType
              ? 'No incidents match the active search and filters.'
              : 'No incidents recorded yet.'}
          </p>
        </div>
      )}

      {data && data.incidents.length > 0 && (
        <>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Assigned To</th>
                  <th>Patient</th>
                  <th>Occurred</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.incidents.map((inc) => (
                  <tr key={inc.id}>
                    <td>
                      <Link to={`/incidents/${inc.id}`} className="font-bold">
                        {inc.incidentCode}
                      </Link>
                    </td>
                    <td>{incidentTypeLabels[inc.incidentType] ?? inc.incidentType}</td>
                    <td>
                      <StatusBadge kind="severity" value={inc.severity} />
                    </td>
                    <td>
                      <div className={inc.status === 'response_in_progress' ? 'status-pulse' : ''}>
                        <StatusBadge kind="status" value={inc.status} />
                      </div>
                    </td>
                    <td className="location-cell" title={inc.locationDescription}>
                      {inc.locationDescription}
                    </td>
                    <td>
                      {inc.assignedToUser ? (
                        <span>{inc.assignedToUser.fullName}</span>
                      ) : (
                        <span className="muted italic small">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {inc.patient ? (
                        <Link to={`/patients/${inc.patient.id}`}>
                          {inc.patient.patientCode} ({inc.patient.fullName})
                        </Link>
                      ) : (
                        <span className="muted small">None</span>
                      )}
                    </td>
                    <td className="small muted">{formatDateTime(inc.occurredAt)}</td>
                    <td>
                      <Link to={`/incidents/${inc.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.total > 0 && (
            <div className="pagination">
              <span className="muted small">
                Showing {firstShown}–{lastShown} of {pagination.total}
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pagination.page <= 1}
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
