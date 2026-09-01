import { ArrowLeft, Shield } from 'lucide-react';

const rules = [
  { icon: '🚫', title: 'Fyerjet janë të ndaluara', desc: 'Çdo lloj fyerjeje, sharjeje, apo gjuhe urrejtjeje ndaj personave, ekipeve ose kombeve është rreptësisht e ndaluar.' },
  { icon: '⚽', title: 'Fol vetëm për futbollin', desc: 'Diskutimet duhet të jenë të lidhura me futbollin kosovar dhe ndeshjet.' },
  { icon: '🤝', title: 'Respekto të tjerët', desc: 'Trajtoji të gjithë me respekt, pavarësisht nga ekipi që mbështesin.' },
  { icon: '📵', title: 'Pa spam', desc: 'Mos dërgo mesazhe të njëjta vazhdimisht ose njoftime reklamuese pa leje.' },
  { icon: '🔒', title: 'Privatësia', desc: 'Mos publiko informacione personale të njerëzve të tjerë.' },
  { icon: '⚖️', title: 'Pasojat', desc: 'Shkeljet e rregullave çojnë në pezullim të menjëhershëm të llogarisë nga moderatorët.' },
];

export default function FanChatRules({ onBack }) {
  return (
    <div className="max-w-sm mx-auto py-6 px-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Kthehu tek chat
      </button>

      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white mb-4 text-center shadow-lg">
        <Shield className="w-10 h-10 mx-auto mb-2 text-blue-200" />
        <h2 className="text-xl font-bold">Rregullat e FanChat</h2>
        <p className="text-blue-200 text-sm mt-1">Respekto rregullat për një komunitet pozitiv</p>
      </div>

      <div className="space-y-3">
        {rules.map((rule, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex gap-3">
            <span className="text-2xl shrink-0">{rule.icon}</span>
            <div>
              <p className="font-semibold text-sm">{rule.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rule.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-amber-800 text-sm font-medium">⚠️ Fyerjet dhe sharjet çojnë në pezullim të menjëhershëm dhe të përhershëm nga platforma.</p>
      </div>
    </div>
  );
}