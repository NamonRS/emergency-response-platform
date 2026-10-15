import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { listPatients } from '../services/patients.js';
import { calcAge, formatDate, formatDateTime } from '../utils/format.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function PatientsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const key = `${q}|${page}`;
  const [state, setState] = useState({ key: null, data: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    listPatients({ q, page })
      .then((data) => {
        if (!cancelled) setState({ key, data, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setState({ key, data: null, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [q, page, key]);

  const loading = state.key !== key;
  const data = loading ? null : state.data;

  function handleSearch(event) {
    event.preventDefault();
    const term = new FormData(event.currentTarget).get('q').toString().trim();
    setParams(term ? { q: term } : {});
  }

  function goToPage(next) {
    setParams({ ...(q ? { q } : {}), page: String(next) });
  }

  const pagination = data?.pagination;
  const firstShown = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastShown = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Patients</h1>
          <p className="muted">Synthetic demonstration records only.</p>
        </div>
        <Link to="/patients/new" className="btn btn-primary">
          <Plus size={16} aria-hidden="true" /> New patient
        </Link>
      </div>

      <form className="search-bar" onSubmit={handleSearch} role="search" key={q}>
        <label htmlFor="patient-search" className="sr-only">
          Search by patient ID or name
        </label>
        <input
          id="patient-search"
          name="q"
          type="search"
          placeholder="Search by patient ID or name"
          defaultValue={q}
          maxLength={100}
        />
        <button type="submit" className="btn btn-ghost">
          <Search size={16} aria-hidden="true" /> Search
        </button>
        {q && (
          <button type="button" className="btn btn-ghost" onClick={() => setParams({})}>
            Clear
          </button>
        )}
      </form>

      {state.error && !loading && (
        <div className="notice notice-error" role="alert">
          {state.error}
        </div>
      )}
      {loading && <LoadingSpinner label="Loading patients" />}

      {data && data.patients.length === 0 && (
        <div className="card empty-state">
          <p>{q ? `No patients match “${q}”.` : 'No patients have been added yet.'}</p>
        </div>
      )}

      {data && data.patients.length > 0 && (
        <>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Date of birth</th>
                  <th>Last updated</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.patients.map((p) => (
                  <tr key={p.id}>
                    <td>{p.patientCode}</td>
                    <td>
                      <Link to={`/patients/${p.id}`}>{p.fullName}</Link>
                    </td>
                    <td>
                      {formatDate(p.dateOfBirth)} (age {calcAge(p.dateOfBirth)})
                    </td>
                    <td>{formatDateTime(p.updatedAt)}</td>
                    <td>
                      <Link to={`/patients/${p.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}
    </div>
  );
}