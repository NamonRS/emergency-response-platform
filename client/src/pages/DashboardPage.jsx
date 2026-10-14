import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

function StatusRow({ label, item }) {
  return (
    <li className="status-row">
      <strong>{label}</strong>
      {item.ok ? (
        <span className="badge badge-ok">Online</span>
      ) : (
        <span className="badge badge-danger">Unavailable</span>
      )}
      {item.ok && item.model && <span className="muted">Model: {item.model}</span>}
      {!item.ok && item.message && <span className="muted">{item.message}</span>}
    </li>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api('/health')
      .then((data) => {
        if (!cancelled) {
          setHealth(data);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function refresh() {
    setHealth(null);
    setError('');
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome, {user.fullName}</h1>
          <p className="muted">Emergency dashboard</p>
        </div>
      </div>

      <div className="notice notice-info">
        <strong>Placeholder.</strong> Incident statistics, charts, and recent activity are built in
        Stage 6. Only the system status below is live.
      </div>

      <section className="card" aria-labelledby="status-heading">
        <div className="page-header">
          <h2 id="status-heading">System status</h2>
          <button type="button" className="btn btn-ghost" onClick={refresh}>
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </button>
        </div>
        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}
        {!health && !error && <LoadingSpinner label="Checking system status" />}
        {health && (
          <ul className="status-list">
            <StatusRow label="Server" item={health.server} />
            <StatusRow label="Database" item={health.database} />
            <StatusRow label="Local AI (Ollama)" item={health.ollama} />
          </ul>
        )}
        <p className="muted small">
          If local AI is unavailable, ordinary incident and patient management still works.
        </p>
      </section>
    </div>
  );
}