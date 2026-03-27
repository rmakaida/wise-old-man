"use client";

import { GoalResponse, MetricProps } from "@wise-old-man/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface GoalProgressChartProps {
  goals: GoalResponse[];
}

export function GoalProgressChart({ goals }: GoalProgressChartProps) {
  const activeGoals = goals.filter((g) => g.status === "active");

  if (activeGoals.length === 0) {
    return null;
  }

  const data = activeGoals.map((goal) => {
    const metricName =
      goal.metric in MetricProps
        ? MetricProps[goal.metric as keyof typeof MetricProps].name
        : goal.metric;
    const label = goal.title ?? metricName;
    return {
      name: label.length > 18 ? label.slice(0, 16) + "…" : label,
      progress: Math.floor(goal.progress * 100),
    };
  });

  return (
    <div className="rounded-lg border border-gray-600 bg-gray-800 p-4">
      <p className="mb-3 text-sm font-medium text-white">Goals Progress</p>
      <ResponsiveContainer width="100%" height={data.length * 36 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={110}
            tick={{ fill: "#d1d5db", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: 6,
              fontSize: 12,
              color: "#f9fafb",
            }}
            labelFormatter={(label) => `${label}`}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#f9fafb" }}>
                  <p>{label}</p>
                  <p style={{ color: "#93c5fd" }}>{payload[0].value}% complete</p>
                </div>
              );
            }}
          />
          <Bar dataKey="progress" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.progress >= 100 ? "#22c55e" : entry.progress >= 50 ? "#3b82f6" : "#6366f1"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
