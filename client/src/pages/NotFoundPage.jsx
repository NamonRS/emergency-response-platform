import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page">
      <h1>Page not found</h1>
      <p className="muted">That page does not exist.</p>
      <Link to="/dashboard">Back to dashboard</Link>
    </div>
  );
}