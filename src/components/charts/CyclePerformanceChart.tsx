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
    <div className="bg-bg-surface border border-border-default rounded-xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        UAM Cycle Performance
        <span className="text-text-muted font-normal ml-2 text-xs">
          Last 48 cycles
        </span>
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="time"
            tick={{ fill: "#9EA8B5", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(0,0,0,0.06)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#9EA8B5", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={42}
            label={{
              value: "seconds",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#9EA8B5", fontSize: 10 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 8,
              fontSize: 12,
              color: "#1A2744",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          />
          <ReferenceLine
            y={300}
            stroke="#E74C3C"
            strokeDasharray="6 3"
            label={{
              value: "5-min target",
              position: "right",
              style: { fill: "#E74C3C", fontSize: 10 },
            }}
          />
          <Line
            type="monotone"
            dataKey="duration"
            stroke="#1A6FE0"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#1A6FE0" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
