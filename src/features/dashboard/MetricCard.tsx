interface MetricCardProps {
  label: string;
  value: string;
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="surface-card p-3">
      <p className="text-xs text-bark-light">{label}</p>
      <p className="font-black text-bark">{value}</p>
    </div>
  );
}
