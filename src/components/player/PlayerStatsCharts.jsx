import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { Target, Shield } from 'lucide-react';

function CompactTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-2.5 py-1.5 text-xs shadow-md">
      {label && <p className="font-semibold mb-0.5">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          <span style={{ color: p.color || p.payload?.fill }}>● </span>
          {p.value}
        </p>
      ))}
    </div>
  );
}

function DonutCard({ icon, iconColor, title, data, totalLabel, total }) {
  if (!data.length) return null;
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor}>{icon}</span>
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={3} stroke="none">
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Tooltip content={<CompactTooltip />} />
          <Label content={({ viewBox }) => {
            const { cx, cy } = viewBox;
            return (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="fill-foreground">
                <tspan x={cx} y={cy - 6} className="text-lg font-black">{total}</tspan>
                <tspan x={cx} y={cy + 10} className="text-[10px] fill-muted-foreground">{totalLabel}</tspan>
              </text>
            );
          }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-1 text-[11px]">
        {data.map(d => (
          <span key={d.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.fill }} />
            {d.name} {d.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PlayerStatsCharts({ comp }) {
  if (!comp) return null;

  const goalData = [
    { name: 'Golat', value: comp.goals, fill: '#16a34a' },
    { name: 'Asistimet', value: comp.assists, fill: '#2563eb' },
  ].filter(d => d.value > 0);

  const cardData = [
    { name: 'K. të Verdhë', value: comp.yellow, fill: '#eab308' },
    { name: 'K. të Kuq', value: comp.red, fill: '#dc2626' },
  ].filter(d => d.value > 0);

  const hasAny = goalData.length > 0 || cardData.length > 0;

  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <DonutCard
        icon={<Target className="w-4 h-4" />}
        iconColor="text-green-600"
        title="Kontribut Gola / Asiste"
        data={goalData}
        total={comp.goals + comp.assists}
        totalLabel="G+A"
      />
      <DonutCard
        icon={<Shield className="w-4 h-4" />}
        iconColor="text-red-500"
        title="Disciplina"
        data={cardData}
        total={comp.yellow + comp.red}
        totalLabel="Kartona"
      />
    </div>
  );
}