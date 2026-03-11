import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PipelineStatusTrend } from "@/types/pipeline";

interface Props {
  data: PipelineStatusTrend[];
}

interface BucketedRow {
  period: string;
  SUCCESS: number;
  FAILED: number;
  CANCELLED: number;
}

export function PipelineHealthTrend({ data }: Props) {
  const chartData = useMemo(() => {
    const buckets = new Map<string, BucketedRow>();

    const sorted = [...data].sort(
      (a, b) => new Date(a.period).getTime() - new Date(b.period).getTime()
    );

    const step = Math.max(1, Math.floor(sorted.length / 80));

    for (let i = 0; i < sorted.length; i += step) {
      const slice = sorted.slice(i, i + step);
      const label = new Date(slice[0].period).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
      });

      if (!buckets.has(label)) {
        buckets.set(label, { period: label, SUCCESS: 0, FAILED: 0, CANCELLED: 0 });
      }

      const bucket = buckets.get(label)!;
      for (const row of slice) {
        const count = Number(row.runCount);
        if (row.status === "SUCCESS") bucket.SUCCESS += count;
        else if (row.status === "FAILED") bucket.FAILED += count;
        else bucket.CANCELLED += count;
      }
    }

    return Array.from(buckets.values());
  }, [data]);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
  });

  return (
    <div className="bg-bg-surface border border-border-default rounded-xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Pipeline Health Trend
        <span className="text-text-muted font-normal ml-2 text-xs">7 Days</span>
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barCategoryGap="20%">
          <XAxis
            dataKey="period"
            tick={{ fill: "#666666", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#2a2a2a" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#666666", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: 8,
              fontSize: 12,
              color: "#ffffff",
            }}
            cursor={{ fill: "rgba(232,130,42,0.06)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
            iconType="circle"
            iconSize={8}
          />
          <ReferenceLine
            x={todayLabel}
            stroke="#e8822a"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Bar
            dataKey="SUCCESS"
            stackId="a"
            fill="#e8822a"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="FAILED"
            stackId="a"
            fill="#f87171"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="CANCELLED"
            stackId="a"
            fill="rgba(232,130,42,0.35)"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
