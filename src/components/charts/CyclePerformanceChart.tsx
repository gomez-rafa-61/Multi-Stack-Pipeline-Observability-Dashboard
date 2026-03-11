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
            tick={{ fill: "#666666", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#2a2a2a" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#666666", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={42}
            label={{
              value: "seconds",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#666666", fontSize: 10 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: 8,
              fontSize: 12,
              color: "#ffffff",
            }}
          />
          <ReferenceLine
            y={300}
            stroke="#f87171"
            strokeDasharray="6 3"
            label={{
              value: "5-min target",
              position: "right",
              style: { fill: "#f87171", fontSize: 10 },
            }}
          />
          <Line
            type="monotone"
            dataKey="duration"
            stroke="#e8822a"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#e8822a" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
