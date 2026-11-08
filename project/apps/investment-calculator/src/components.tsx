// Small presentational pieces used by the calculator page.
import { useState } from 'react';
import { formatCurrency } from './calculations';

export function InputField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) {
  const [raw, setRaw] = useState<string>(String(value));
  const [focused, setFocused] = useState(false);

  if (!focused && raw !== String(value)) {
    setRaw(String(value));
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#1a1f2b]">
        {label}
        {suffix && <span className="text-[#5b6472] mr-1">({suffix})</span>}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(v);
            if (!focused) setRaw(String(v));
          }}
          className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-[#e3e6eb] accent-[#2563eb]"
        />
        <input
          type="number"
          value={raw}
          onFocus={() => {
            setFocused(true);
            setRaw(String(value));
          }}
          onChange={(e) => {
            const text = e.target.value;
            setRaw(text);
            const v = Number(text);
            if (!isNaN(v) && text !== '' && text !== '-') {
              onChange(Math.min(max, Math.max(min, v)));
            }
          }}
          onBlur={() => {
            setFocused(false);
            let v = Number(raw);
            if (isNaN(v) || raw.trim() === '') v = min;
            v = Math.min(max, Math.max(min, v));
            onChange(v);
            setRaw(String(v));
          }}
          min={min}
          max={max}
          step={step}
          className="w-24 bg-[#ffffff] border border-[#e3e6eb] rounded-lg px-3 py-1.5 text-sm text-right text-[#1a1f2b] focus:outline-none focus:border-[#2563eb] transition"
        />
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  subValue,
  color = 'text-[#1a1f2b]',
  icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  color?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#ffffff] border border-[#e3e6eb] rounded-xl p-4 space-y-2 hover:border-[#e3e6eb] transition">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#5b6472] uppercase tracking-wider">{label}</p>
        <div className="text-[#5b6472]">{icon}</div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subValue && <p className="text-xs text-[#5b6472]">{subValue}</p>}
    </div>
  );
}

export function ChartTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
  return (
    <div className="bg-[#ffffff] border border-[#e3e6eb] rounded-xl p-4 shadow-2xl text-sm min-w-[200px]">
      <p className="text-[#5b6472] mb-3 font-medium border-b border-[#e3e6eb] pb-2">
        📅 السنة {label}
      </p>
      {payload.map((entry: any, i: number) => {
        const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
        return (
          <p key={i} className="flex justify-between gap-6 py-1">
            <span style={{ color: entry.color }} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="font-mono font-bold text-[#1a1f2b]">
              {formatCurrency(entry.value, currency)}
              <span className="text-xs text-[#5b6472] ml-1">({pct}%)</span>
            </span>
          </p>
        );
      })}
      <div className="border-t border-[#e3e6eb] mt-2 pt-2 flex justify-between">
        <span className="text-[#5b6472]">الإجمالي</span>
        <span className="font-mono font-bold text-[#2563eb]">{formatCurrency(total, currency)}</span>
      </div>
    </div>
  );
}

export function GoalTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#ffffff] border border-[#e3e6eb] rounded-xl p-4 shadow-2xl text-sm min-w-[180px]">
      <p className="text-[#5b6472] mb-2 font-medium">السنة {label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono font-bold text-[#1a1f2b]">{formatCurrency(entry.value, currency)}</span>
        </p>
      ))}
    </div>
  );
}
