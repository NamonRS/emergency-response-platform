import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function AccessDenied() {
  return (
    <div className="page">
      <h1>
        <ShieldAlert size={22} aria-hidden="true" /> Access denied
      </h1>
      <p className="muted">Your role does not have permission to view this page.</p>
      <Link to="/dashboard">Back to dashboard</Link>
    </div>
  );
}