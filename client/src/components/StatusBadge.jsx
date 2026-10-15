import { severityLabels, statusLabels } from '../utils/labels.js';

// kind: 'severity' | 'status'
export default function StatusBadge({ kind, value }) {
  const labels = kind === 'severity' ? severityLabels : statusLabels;
  return <span className={`badge badge-${kind}-${value}`}>{labels[value] ?? value}</span>;
}