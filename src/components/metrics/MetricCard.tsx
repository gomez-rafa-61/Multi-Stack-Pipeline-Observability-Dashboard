import { Sparkline } from "./Sparkline";

type KpiCategory = "monetary" | "count" | "rate" | "time";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  sparkHeights?: number[];
  category?: KpiCategory;
}

const CARD_THEMES: Record<KpiCategory, { bg: string; sparkColor: string; sparkMuted: string; accent: string }> = {
  rate: {
    bg: "linear-gradient(135deg, #134E4A 0%, #0F766E 50%, #115E59 100%)",
    sparkColor: "rgba(94, 234, 212, 0.8)",
    sparkMuted: "rgba(94, 234, 212, 0.3)",
    accent: "#5EEAD4",
  },
  count: {
    bg: "linear-gradient(135deg, #1E293B 0%, #1E3A5F 50%, #172554 100%)",
    sparkColor: "rgba(96, 165, 250, 0.8)",
    sparkMuted: "rgba(96, 165, 250, 0.3)",
    accent: "#60A5FA",
  },
  monetary: {
    bg: "linear-gradient(135deg, #14532D 0%, #166534 50%, #15803D 100%)",
    sparkColor: "rgba(134, 239, 172, 0.8)",
    sparkMuted: "rgba(134, 239, 172, 0.3)",
    accent: "#86EFAC",
  },
  time: {
    bg: "linear-gradient(135deg, #14532D 0%, #166534 50%, #15803D 100%)",
    sparkColor: "rgba(134, 239, 172, 0.8)",
    sparkMuted: "rgba(134, 239, 172, 0.3)",
    accent: "#86EFAC",
  },
};

export function MetricCard({
  label,
  value,
  change,
  changeType,
  sparkHeights,
  category = "count",
}: MetricCardProps) {
  const theme = CARD_THEMES[category];

  const isNegativeCard = changeType === "negative" && category === "count";
  const cardBg = isNegativeCard
    ? "linear-gradient(135deg, #1C1917 0%, #292524 50%, #1C1917 100%)"
    : theme.bg;
  const cardSparkColor = isNegativeCard ? "rgba(248, 113, 113, 0.8)" : theme.sparkColor;
  const cardSparkMuted = isNegativeCard ? "rgba(248, 113, 113, 0.3)" : theme.sparkMuted;
  const accentDot = isNegativeCard ? "#F87171" : theme.accent;

  return (
    <div
      className="relative rounded-[14px] p-5 flex flex-col justify-between min-h-[120px] overflow-hidden hover:-translate-y-px transition-all duration-200"
      style={{ background: cardBg }}
    >
      <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full opacity-70" style={{ backgroundColor: accentDot }} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/50 mb-2">
            {label}
          </p>
          <span className="text-[28px] font-semibold font-mono tabular-nums tracking-tight text-white leading-none">
            {value}
          </span>
        </div>
        {sparkHeights && (
          <div className="shrink-0 self-end">
            <Sparkline heights={sparkHeights} color={cardSparkColor} mutedColor={cardSparkMuted} />
          </div>
        )}
      </div>

      {change && (
        <p className="text-[11px] mt-3 text-white/40">
          {change}
        </p>
      )}
    </div>
  );
}
