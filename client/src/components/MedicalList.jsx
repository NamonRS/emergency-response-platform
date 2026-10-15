// null = not documented, [] = documented as none, otherwise documented entries.
export default function MedicalList({ value }) {
  if (value === null || value === undefined) {
    return (
      <p className="muted">
        <em>Not documented</em>
      </p>
    );
  }
  if (value.length === 0) return <p>Documented as none</p>;
  return (
    <ul className="plain-list">
      {value.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}