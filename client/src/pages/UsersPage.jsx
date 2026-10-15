import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { roleLabels } from '../utils/labels.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function UsersPage() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api('/admin/users')
      .then((data) => {
        if (!cancelled) setUsers(data.users);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <h1>Users</h1>
      <p className="muted">Authenticated system accounts and active operational dispatch roles.</p>

      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      {!users && !error && <LoadingSpinner label="Loading users" />}
      {users && users.length === 0 && <p className="muted">No users found.</p>}
      {users && users.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.fullName}</td>
                  <td>{roleLabels[u.role] ?? u.role}</td>
                  <td>
                    {u.isActive ? (
                      <span className="badge badge-ok">Active</span>
                    ) : (
                      <span className="badge badge-neutral">Deactivated</span>
                    )}
                  </td>
                  <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}