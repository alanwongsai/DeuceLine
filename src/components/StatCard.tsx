type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  accentColor?: string;
  onClick?: () => void;
};

export function StatCard({ label, value, detail, accentColor, onClick }: StatCardProps) {
  const content = (
    <>
      <p>{label}</p>
      <strong>
        {accentColor ? <i className="stat-dot" style={{ background: accentColor }} aria-hidden="true" /> : null}
        {value}
      </strong>
      {detail ? <span>{detail}</span> : null}
    </>
  );

  if (!onClick) {
    return <article className="stat-card">{content}</article>;
  }

  return (
    <button type="button" className="stat-card stat-card-button" onClick={onClick} aria-label={`${label}: ${value}. View breakdown`}>
      {content}
    </button>
  );
}
