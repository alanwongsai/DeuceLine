type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  accentColor?: string;
};

export function StatCard({ label, value, detail, accentColor }: StatCardProps) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>
        {accentColor ? <i className="stat-dot" style={{ background: accentColor }} aria-hidden="true" /> : null}
        {value}
      </strong>
      {detail ? <span>{detail}</span> : null}
    </article>
  );
}
