import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPatient, getPatient, updatePatient } from '../services/patients.js';
import { useAuth } from '../hooks/useAuth.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import PatientForm from '../components/PatientForm.jsx';

export default function PatientFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [load, setLoad] = useState({ key: null, patient: null, error: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [serverErrors, setServerErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    getPatient(id)
      .then((data) => {
        if (!cancelled) setLoad({ key: id, patient: data.patient, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setLoad({ key: id, patient: null, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const loading = isEdit && load.key !== id;

  async function handleSubmit(body) {
    setSubmitting(true);
    setFormError('');
    setServerErrors({});
    try {
      const data = isEdit ? await updatePatient(id, body) : await createPatient(body);
      navigate(`/patients/${data.patient.id}`, {
        state: { flash: isEdit ? 'Patient record updated.' : 'Patient record created.' },
      });
    } catch (err) {
      if (err.details?.length) {
        const map = {};
        for (const d of err.details) {
          const field = d.field.split('.')[0];
          if (!map[field]) map[field] = d.message;
        }
        setServerErrors(map);
      }
      setFormError(err.message);
      setSubmitting(false);
    }
  }

  const cancelTo = isEdit ? `/patients/${id}` : '/patients';

  return (
    <div className="page">
      <p>
        <Link to={cancelTo}>← Back</Link>
      </p>
      <h1>{isEdit ? 'Edit patient' : 'New patient'}</h1>
      <p className="muted">Use synthetic data only in this academic prototype.</p>

      {loading && <LoadingSpinner label="Loading patient" />}
      {isEdit && !loading && load.error && (
        <div className="notice notice-error" role="alert">{load.error}</div>
      )}
      {!loading && !(isEdit && load.error) && (
        <PatientForm
          initialPatient={isEdit ? load.patient : null}
          isAdmin={user.role === 'admin'}
          submitting={submitting}
          formError={formError}
          serverErrors={serverErrors}
          onSubmit={handleSubmit}
          onCancel={() => navigate(cancelTo)}
        />
      )}
    </div>
  );
}