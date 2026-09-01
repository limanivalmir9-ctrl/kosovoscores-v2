import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

export default function WeeklyGoalsChart({ data }) {
  const rows = (data || []).map(r => ({ week: r.week.replace('Java ', 'J'), total: r.total }));
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={rows} margin={{ top: 10, right: 5, left: -22, bottom: 10 }}>
        <XAxis dataKey="week" tick={{ fontSize: 9 }} interval={0} angle={-22} textAnchor="end" height={55} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} gola`, '']} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill="hsl(var(--secondary))" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}