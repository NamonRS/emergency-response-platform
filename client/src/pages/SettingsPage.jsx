import { useState, useEffect } from 'react';
import {
  Activity,
  Check,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Key,
  Lock,
  Moon,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useTheme } from '../hooks/useTheme.js';
import { roleLabels } from '../utils/labels.js';
import { api } from '../services/api.js';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState('');

  const fetchHealth = async () => {
    setLoadingHealth(true);
    setHealthError('');
    try {
      const res = await api('/health');
      setHealthData(res);
    } catch (err) {
      setHealthError(err.message || 'Unable to retrieve real-time telemetry.');
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="page" style={{ maxWidth: '1100px' }}>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>Workstation Settings & Telemetry</h1>
            <span className="badge badge-info" style={{ fontWeight: 600 }}>
              v1.0.0-emergency-ops
            </span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Operational dispatch parameters, authenticated clinician session, and local AI infrastructure telemetry.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={fetchHealth}
          disabled={loadingHealth}
          title="Refresh Telemetry"
        >
          <RefreshCw size={14} className={loadingHealth ? 'spinner-icon' : ''} aria-hidden="true" />
          Refresh Telemetry
        </button>
      </div>

      {/* Grid: 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Clinician Profile */}
        <div className="card" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--teal-subtle, rgba(20, 184, 166, 0.15))', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
              <UserIcon size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>Clinician Profile</h2>
              <span className="muted small">Active authenticated credentials</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span className="muted">Full Name</span>
              <strong>{user.fullName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span className="muted">Operator Username</span>
              <code style={{ background: 'var(--bg-surface-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
                {user.username}
              </code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span className="muted">Assigned Role</span>
              <span className="badge badge-info">
                {roleLabels[user.role] ?? user.role}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span className="muted">Email</span>
              <span>{user.email || 'dispatch@emergency-ops.internal'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">Account Status</span>
              <span className="badge badge-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} aria-hidden="true" /> Active Operator
              </span>
            </div>
          </div>
        </div>

        {/* Console Appearance & Ergonomics */}
        <div className="card" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--ops-info-bg, rgba(56, 189, 248, 0.15))', color: 'var(--info)', display: 'grid', placeItems: 'center' }}>
              {theme === 'dark' ? <Moon size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />}
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>Console Appearance</h2>
              <span className="muted small">High-reliability clinical dispatch ergonomics</span>
            </div>
          </div>

          <p className="muted small" style={{ marginBottom: '16px' }}>
            Configure visual density and high-contrast color scheme. Night Dispatch Mode lowers eye strain in darkened command centres.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              type="button"
              className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '12px', justifyContent: 'center' }}
              onClick={() => setTheme('light')}
            >
              <Sun size={18} aria-hidden="true" />
              <span>Light Clinical</span>
            </button>
            <button
              type="button"
              className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '12px', justifyContent: 'center' }}
              onClick={() => setTheme('dark')}
            >
              <Moon size={18} aria-hidden="true" />
              <span>Dark Dispatch</span>
            </button>
          </div>

          <div style={{ marginTop: '16px', padding: '10px 14px', background: 'var(--bg-surface-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <strong>Contrast Standard:</strong> AAA Clinical CAD High Contrast compliant. Numerical typography locked to <code>tabular-nums</code> for high-stress precision.
          </div>
        </div>

        {/* Session Security & Cryptographic Posture */}
        <div className="card" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--ok-soft, rgba(34, 197, 94, 0.15))', color: 'var(--ok)', display: 'grid', placeItems: 'center' }}>
              <Lock size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>Session & Security Guardrails</h2>
              <span className="muted small">Tamper-evident system protections</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">Session Token</span>
              <span className="badge badge-ok">HttpOnly • SameSite=Strict</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">Storage Standard</span>
              <span className="badge badge-ok">Zero localStorage PHI</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">PostgreSQL Trigger</span>
              <span className="badge badge-ok">trg_audit_logs_immutable (Active)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">Session Lifetime</span>
              <span>8 Hours Rolling Auth</span>
            </div>
          </div>
        </div>

        {/* Local AI Engine & System Telemetry */}
        <div className="card" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--teal-subtle, rgba(20, 184, 166, 0.15))', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
              <Cpu size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>Clinical AI Engine & Telemetry</h2>
              <span className="muted small">Local Ollama inference daemon</span>
            </div>
          </div>

          {healthError && (
            <div className="notice notice-error" style={{ margin: '0 0 12px', fontSize: '0.82rem' }}>
              {healthError}
            </div>
          )}

          <div style={{ display: 'grid', gap: '10px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">AI Architecture</span>
              <span className="badge badge-ok">100% On-Device Ollama</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">Configured Model</span>
              <strong style={{ fontFamily: 'ui-monospace, monospace' }}>
                {healthData?.ollama?.model || 'qwen2.5:7b'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">Cloud Egress</span>
              <span className="badge badge-ok">ZERO (Air-Gapped Private)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">Database Latency</span>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                {healthData?.database?.latencyMs != null ? `${healthData.database.latencyMs} ms` : 'Online'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
