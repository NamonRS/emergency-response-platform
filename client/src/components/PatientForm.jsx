import { useState } from 'react';
import ListField from './ListField.jsx';
import { formToList, listToForm } from '../utils/listState.js';
import { todayISO } from '../utils/format.js';

function initialValues(p) {
  return {
    fullName: p?.fullName ?? '',
    dateOfBirth: p?.dateOfBirth ?? '',
    conditions: listToForm(p?.conditions ?? null),
    allergies: listToForm(p?.allergies ?? null),
    medications: listToForm(p?.medications ?? null),
    medicalHistory: p?.medicalHistory ?? '',
    emergencyContactName: p?.emergencyContactName ?? '',
    emergencyContactRelationship: p?.emergencyContactRelationship ?? '',
    emergencyContactPhone: p?.emergencyContactPhone ?? '',
    restrictedNotes: p?.restrictedNotes ?? '',
  };
}

function TextField({ id, label, error, multiline, ...props }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <Tag id={id} aria-invalid={Boolean(error)} {...props} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export default function PatientForm({
  initialPatient,
  isAdmin,
  submitting,
  formError,
  serverErrors,
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState(() => initialValues(initialPatient));
  const [clientErrors, setClientErrors] = useState({});
  const errors = { ...serverErrors, ...clientErrors };

  const set = (field) => (value) => setValues((v) => ({ ...v, [field]: value }));
  const setText = (field) => (e) => set(field)(e.target.value);

  function handleSubmit(event) {
    event.preventDefault();
    const found = {};
    if (!values.fullName.trim()) found.fullName = 'Full name is required.';
    if (!values.dateOfBirth) found.dateOfBirth = 'Date of birth is required.';
    for (const field of ['conditions', 'allergies', 'medications']) {
      if (formToList(values[field]) !== null && values[field].mode === 'list') {
        if (formToList(values[field]).length === 0) {
          found[field] = 'Add at least one entry, or choose another option.';
        }
      }
    }
    setClientErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = {
      fullName: values.fullName.trim(),
      dateOfBirth: values.dateOfBirth,
      conditions: formToList(values.conditions),
      allergies: formToList(values.allergies),
      medications: formToList(values.medications),
      medicalHistory: values.medicalHistory,
      emergencyContactName: values.emergencyContactName,
      emergencyContactRelationship: values.emergencyContactRelationship,
      emergencyContactPhone: values.emergencyContactPhone,
    };
    // Only administrators send restricted notes (the server enforces this too).
    if (isAdmin) body.restrictedNotes = values.restrictedNotes;
    onSubmit(body);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="notice notice-error" role="alert">
          {formError}
        </div>
      )}

      <section className="card">
        <h2>Identity</h2>
        <div className="form-grid">
          <TextField
            id="fullName"
            label="Full name"
            value={values.fullName}
            onChange={setText('fullName')}
            maxLength={120}
            error={errors.fullName}
            required
          />
          <TextField
            id="dateOfBirth"
            label="Date of birth"
            type="date"
            max={todayISO()}
            value={values.dateOfBirth}
            onChange={setText('dateOfBirth')}
            error={errors.dateOfBirth}
            required
          />
        </div>
      </section>

      <section className="card">
        <h2>Medical information</h2>
        <p className="muted small">
          “Not documented” means nothing has been recorded. It is different from “documented as
          none”. Only record what is documented.
        </p>
        <ListField
          label="Medical conditions"
          value={values.conditions}
          onChange={set('conditions')}
          error={errors.conditions}
        />
        <ListField
          label="Allergies"
          value={values.allergies}
          onChange={set('allergies')}
          error={errors.allergies}
        />
        <ListField
          label="Current medications"
          value={values.medications}
          onChange={set('medications')}
          error={errors.medications}
        />
        <TextField
          id="medicalHistory"
          label="Relevant medical history"
          multiline
          rows={4}
          maxLength={5000}
          value={values.medicalHistory}
          onChange={setText('medicalHistory')}
          error={errors.medicalHistory}
        />
      </section>

      <section className="card">
        <h2>Emergency contact</h2>
        <div className="form-grid">
          <TextField
            id="emergencyContactName"
            label="Name"
            value={values.emergencyContactName}
            onChange={setText('emergencyContactName')}
            maxLength={120}
            error={errors.emergencyContactName}
          />
          <TextField
            id="emergencyContactRelationship"
            label="Relationship"
            value={values.emergencyContactRelationship}
            onChange={setText('emergencyContactRelationship')}
            maxLength={60}
            error={errors.emergencyContactRelationship}
          />
          <TextField
            id="emergencyContactPhone"
            label="Phone"
            type="tel"
            value={values.emergencyContactPhone}
            onChange={setText('emergencyContactPhone')}
            maxLength={30}
            error={errors.emergencyContactPhone}
          />
        </div>
      </section>

      {isAdmin && (
        <section className="card">
          <h2>Restricted notes</h2>
          <p className="muted small">
            Visible to administrators only. These notes are never sent to the AI.
          </p>
          <TextField
            id="restrictedNotes"
            label="Restricted notes"
            multiline
            rows={3}
            maxLength={2000}
            value={values.restrictedNotes}
            onChange={setText('restrictedNotes')}
            error={errors.restrictedNotes}
          />
        </section>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save patient'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}