export default function PlaceholderPage({ title, stage, description }) {
  return (
    <div className="page">
      <h1>{title}</h1>
      <div className="notice notice-info">
        <strong>Placeholder.</strong> This page is built in {stage}. {description}
      </div>
    </div>
  );
}