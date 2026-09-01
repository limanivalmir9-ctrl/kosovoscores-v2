import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

// Distinct color per period so the chart reads clearly even with 8 bars
const COLORS = [
  '#2563eb', '#3b82f6', '#60a5fa', '#f59e0b',
  '#2563eb', '#3b82f6', '#60a5fa', '#f59e0b',
];

export default function GoalsPeriodsChart({ data }) {
  const rows = Object.entries(data || {}).map(([label, count]) => ({ label, count }));
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={rows} margin={{ top: 10, right: 5, left: -22, bottom: 10 }}>
        <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-22} textAnchor="end" height={55} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}