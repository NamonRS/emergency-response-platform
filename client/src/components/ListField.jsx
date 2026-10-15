import { useId } from 'react';

const options = [
  { mode: 'unknown', label: 'Not documented' },
  { mode: 'none', label: 'Documented as none' },
  { mode: 'list', label: 'Documented entries (one per line)' },
];

export default function ListField({ label, value, onChange, error }) {
  const groupName = useId();
  return (
    <fieldset className="form-fieldset">
      <legend>{label}</legend>
      <div className="radio-row">
        {options.map((option) => (
          <label key={option.mode} className="radio-label">
            <input
              type="radio"
              name={groupName}
              checked={value.mode === option.mode}
              onChange={() => onChange({ ...value, mode: option.mode })}
            />
            {option.label}
          </label>
        ))}
      </div>
      {value.mode === 'list' && (
        <textarea
          rows={4}
          aria-label={`${label} entries, one per line`}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
        />
      )}
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}