"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Point {
  date: string;
  count: number;
}

export default function SignupsVsChurnChart({
  signups,
  churn,
}: {
  signups: Point[];
  churn: Point[];
}) {
  const map = new Map<string, { date: string; signups: number; churn: number }>();
  for (const s of signups) {
    map.set(s.date, { date: s.date, signups: s.count, churn: 0 });
  }
  for (const c of churn) {
    const existing = map.get(c.date);
    if (existing) {
      existing.churn = c.count;
    } else {
      map.set(c.date, { date: c.date, signups: 0, churn: c.count });
    }
  }
  const data = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="signups"
            name="Nuevas tiendas"
            stroke="hsl(217, 91%, 50%)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="churn"
            name="Churn (canceled/past_due)"
            stroke="hsl(0, 72%, 51%)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
