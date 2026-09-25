import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatSom } from "@/lib/constants";

type ChartPoint = {
  date: string;
  sotuv: number;
  foyda: number;
  chegirma: number;
};

export function ReportsChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(value) => `${(value / 1e6).toFixed(1)}M`}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
          formatter={(value: number, name: string) => [
            formatSom(value),
            name === "sotuv" ? "Sotuv" : name === "foyda" ? "Foyda" : "Chegirma",
          ]}
        />
        <Line
          type="monotone"
          dataKey="sotuv"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="foyda"
          stroke="var(--chart-2)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="chegirma"
          stroke="var(--destructive)"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={{ r: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
