import { Sparkline } from "./Sparkline";

type KpiCategory = "monetary" | "count" | "rate" | "time";

const categoryBg: Record<KpiCategory, string> = {
  monetary: "var(--color-kpi-monetary)",
  count: "var(--color-kpi-count)",
  rate: "var(--color-kpi-rate)",
  time: "var(--color-kpi-time)",
};

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  sparkHeights?: number[];
  category?: KpiCategory;
}

export function MetricCard({
  label,
  value,
  change,
  sparkHeights,
  category = "count",
}: MetricCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col justify-between min-h-[110px]"
      style={{ backgroundColor: categoryBg[category] }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/70 mb-2">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-white">{value}</span>
          {change && (
            <p className="text-xs text-white/70 mt-1">{change}</p>
          )}
        </div>
        <Sparkline heights={sparkHeights} />
      </div>
    </div>
  );
}
