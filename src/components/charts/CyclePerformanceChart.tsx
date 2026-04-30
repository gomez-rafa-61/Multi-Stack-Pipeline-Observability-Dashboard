import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { CyclePerformance } from "@/types/pipeline";

interface Props {
  data: CyclePerformance[];
}

export function CyclePerformanceChart({ data }: Props) {
  const chartData = useMemo(() => {
    return [...data]
      .sort(
        (a, b) =>
          new Date(a.cycleTimestamp).getTime() -
          new Date(b.cycleTimestamp).getTime()
      )
      .map((c) => ({
        time: new Date(c.cycleTimestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration: c.durationSeconds,
        runs: c.totalRuns,
        adapterRate: c.adapterSuccessRatePct,
      }));
  }, [data]);

  return (
    <div className="bg-bg-surface border border-border-default rounded-[14px] p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-semibold tracking-[-0.01em] text-text-primary mb-4">
        UAM Cycle Performance
        <span className="text-text-muted font-normal ml-2 text-xs">
          Last 48 cycles
        </span>
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="time"
            tick={{ fill: "#A1A1AA", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#E4E4E7" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#A1A1AA", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={42}
            label={{
              value: "seconds",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#A1A1AA", fontSize: 10 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4E4E7",
              borderRadius: 10,
              fontSize: 12,
              color: "#18181B",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            }}
          />
          <ReferenceLine
            y={300}
            stroke="#DC2626"
            strokeDasharray="6 3"
            label={{
              value: "5-min target",
              position: "right",
              style: { fill: "#DC2626", fontSize: 10 },
            }}
          />
          <Line
            type="monotone"
            dataKey="duration"
            stroke="#2563EB"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#2563EB" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
