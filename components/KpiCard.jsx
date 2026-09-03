export default function KpiCard({ title, value, change, trend = 'neutral', icon = 'analytics', subtitle }) {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <div className="bg-white border border-[#D8DEE2] rounded p-5 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#3f4947] uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded bg-[#f3f3f4] text-[#0b4f4a] flex items-center justify-center">
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="font-mono-data font-bold text-2xl text-[#1a1c1c] tracking-tight">{value}</div>
        
        <div className="mt-2 flex items-center justify-between text-xs">
          {change && (
            <span
              className={`font-mono-data font-semibold flex items-center gap-0.5 ${
                isPositive
                  ? 'text-[#4C7A63]'
                  : isNegative
                  ? 'text-[#B23A2E]'
                  : 'text-[#3f4947]'
              }`}
            >
              {isPositive && '▲ '}
              {isNegative && '▼ '}
              {change}
            </span>
          )}
          {subtitle && <span className="text-[#94A3B8] text-[11px]">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}
