interface SparklineProps {
  heights?: number[];
}

const DEFAULT_HEIGHTS = [30, 55, 40, 70, 95];

export function Sparkline({ heights = DEFAULT_HEIGHTS }: SparklineProps) {
  return (
    <div className="flex items-end gap-[2px] h-10">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm"
          style={{
            height: `${h}%`,
            backgroundColor:
              i < 2 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.85)",
          }}
        />
      ))}
    </div>
  );
}
