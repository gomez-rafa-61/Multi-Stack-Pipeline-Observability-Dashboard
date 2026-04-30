interface SparklineProps {
  heights?: number[];
  color?: string;
  mutedColor?: string;
}

const DEFAULT_HEIGHTS = [30, 55, 40, 70, 95];

export function Sparkline({
  heights = DEFAULT_HEIGHTS,
  color = "rgba(255,255,255,0.7)",
  mutedColor = "rgba(255,255,255,0.25)",
}: SparklineProps) {
  return (
    <div className="flex items-end gap-[3px] h-10">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[5px] rounded-sm"
          style={{
            height: `${h}%`,
            backgroundColor: i < 2 ? mutedColor : color,
          }}
        />
      ))}
    </div>
  );
}
