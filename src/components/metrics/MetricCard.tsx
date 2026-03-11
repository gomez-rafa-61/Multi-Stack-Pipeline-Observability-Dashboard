import { Info } from "lucide-react";
import { Sparkline } from "./Sparkline";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  sparkHeights?: number[];
}

export function MetricCard({
  label,
  value,
  change,
  changeType = "positive",
  sparkHeights,
}: MetricCardProps) {
  const changeColor =
    changeType === "positive"
      ? "text-success"
      : changeType === "negative"
        ? "text-danger"
        : "text-text-muted";

  return (
    <div className="bg-bg-surface border border-border-default rounded-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted mb-3">
        {label}
      </p>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl font-bold text-text-primary">{value}</span>
        <Sparkline heights={sparkHeights} />
      </div>
      <div className="border-t border-border-default pt-3 flex items-center gap-2">
        <Info size={12} className="text-text-muted" />
        {change && <span className={`text-xs ${changeColor}`}>{change}</span>}
      </div>
    </div>
  );
}
