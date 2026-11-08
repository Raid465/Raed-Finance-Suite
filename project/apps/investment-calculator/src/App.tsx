import { useState, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  DEFAULT_SCENARIOS,
  formatCurrency,
  formatCompact,
  calculateYearlyData,
  calculateGoalSeek,
  calculateGoalProjection,
} from './calculations';
import type { Currency, InvestmentInputs, Scenario, GoalSeekInputs } from './calculations';
import { exportToExcel } from './excelExport';
import { InputField, MetricCard, ChartTooltip, GoalTooltip } from './components';

export default function App() {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [activeTab, setActiveTab] = useState<'calculator' | 'scenarios' | 'goal'>('calculator');
  const [inputs, setInputs] = useState<InvestmentInputs>({
    initialAmount: 10000,
    monthlyDeposit: 500,
    annualRate: 10,
    years: 20,
    inflationRate: 3,
    adjustForInflation: false,
  });
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [goalInputs, setGoalInputs] = useState<GoalSeekInputs>({
    targetAmount: 500000,
    targetYear: 15,
    initialAmount: 10000,
    annualRate: 10,
  });

  const updateInput = useCallback(
    <K extends keyof InvestmentInputs>(key: K, value: InvestmentInputs[K]) =>
      setInputs((prev) => ({ ...prev, [key]: value })),
    []
  );

  const yearData = useMemo(() => calculateYearlyData(inputs), [inputs]);

  const scenarioData = useMemo(
    () => scenarios.map((s) => ({ ...s, data: calculateYearlyData(inputs, s.annualRate) })),
    [inputs, scenarios]
  );

  const chartData = useMemo(
    () =>
      yearData.map((d) => ({
        year: d.year,
        'المبلغ المستثمر': d.invested,
        الأرباح: d.earnings,
        'المحفظة الكلية': d.portfolioValue,
      })),
    [yearData]
  );

  const scenarioChartData = useMemo(() => {
    return Array.from({ length: inputs.years }, (_, i) => {
      const point: Record<string, number> = { year: i + 1 };
      scenarioData.forEach((s) => {
        const y = s.data[i];
        if (y) point[s.name] = y.portfolioValue;
      });
      return point;
    });
  }, [scenarioData, inputs.years]);

  const goalResult = useMemo(() => calculateGoalSeek(goalInputs), [goalInputs]);
  const goalProjection = useMemo(
    () => calculateGoalProjection(goalInputs, goalResult.monthlyPayment),
    [goalInputs, goalResult.monthlyPayment]
  );

  const goalChartData = useMemo(
    () =>
      goalProjection.map((d) => ({
        year: d.year,
        'المبلغ المستثمر': d.invested,
        الأرباح: d.earnings,
        'المحفظة الكلية': d.portfolioValue,
      })),
    [goalProjection]
  );

  const lastYear = yearData[yearData.length - 1];

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="border-b border-[#2e3350] bg-[#1a1d2e] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4f8cff]/15 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[#4f8cff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">حاسبة الاستثمار</h1>
              <p className="text-xs text-[#a0a0b8]">Compound Interest Calculator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(['USD', 'JOD'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  currency === c
                    ? 'bg-[#4f8cff]/15 text-[#4f8cff] border border-[#4f8cff]/40'
                    : 'text-[#a0a0b8] hover:text-white'
                }`}
              >
                {c === 'USD' ? '$ دولار' : 'د.أ دينار'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#1a1d2e] p-1 rounded-xl w-fit mx-auto">
          {([
            { key: 'calculator', label: 'الحاسبة', icon: '🧮' },
            { key: 'scenarios', label: 'مقارنة السيناريوهات', icon: '📊' },
            { key: 'goal', label: 'الهدف العكسي', icon: '🎯' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-[#4f8cff] text-white'
                  : 'text-[#a0a0b8] hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ Calculator Tab ═══ */}
        {activeTab === 'calculator' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Inputs */}
            <div className="bg-[#222640] border border-[#2e3350] rounded-xl p-6 space-y-5">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-[#4f8cff] rounded-full" />
                معطيات الاستثمار
              </h2>
              <InputField label="رأس المال الابتدائي" value={inputs.initialAmount} onChange={(v) => updateInput('initialAmount', v)} min={0} max={1000000} step={1000} suffix={currency === 'USD' ? '$' : 'د.أ'} />
              <InputField label="الإيداع الشهري" value={inputs.monthlyDeposit} onChange={(v) => updateInput('monthlyDeposit', v)} min={0} max={50000} step={50} suffix={currency === 'USD' ? '$/شهر' : 'د.أ/شهر'} />
              <InputField label="معدل العائد السنوي" value={inputs.annualRate} onChange={(v) => updateInput('annualRate', v)} min={0} max={50} step={0.5} suffix="%" />
              <InputField label="عدد السنوات" value={inputs.years} onChange={(v) => updateInput('years', v)} min={1} max={50} step={1} suffix="سنة" />

              <div className="border-t border-[#2e3350] pt-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={inputs.adjustForInflation} onChange={(e) => updateInput('adjustForInflation', e.target.checked)} className="w-4 h-4 rounded accent-[#4f8cff]" />
                  <span className="text-sm text-[#e8e8f0] group-hover:text-white transition">تعديل حسب التضخم</span>
                </label>
                {inputs.adjustForInflation && (
                  <InputField label="معدل التضخم السنوي" value={inputs.inflationRate} onChange={(v) => updateInput('inflationRate', v)} min={0} max={30} step={0.5} suffix="%" />
                )}
              </div>

              <button onClick={() => exportToExcel(yearData, currency, inputs, scenarios)} className="w-full py-2.5 bg-[#4f8cff] hover:bg-[#3f78e6] text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                تصدير Excel
              </button>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {lastYear && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="القيمة النهائية"
                    value={formatCurrency(lastYear.portfolioValue, currency)}
                    color="text-[#4f8cff]"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
                  />
                  <MetricCard
                    label="إجمالي المستثمر"
                    value={formatCurrency(lastYear.invested, currency)}
                    color="text-blue-400"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                  />
                  <MetricCard
                    label="إجمالي الأرباح"
                    value={formatCurrency(lastYear.earnings, currency)}
                    color="text-amber-400"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                  />
                  <MetricCard
                    label="نسبة النمو"
                    value={`${lastYear.growthPercent}%`}
                    subValue={lastYear.realValue ? `القيمة الحقيقية: ${formatCurrency(lastYear.realValue, currency)}` : undefined}
                    color="text-purple-400"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                  />
                </div>
              )}

              {/* Chart */}
              <div className="bg-[#222640] border border-[#2e3350] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">نمو المحفظة</h3>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-500" /> مستثمر</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-emerald-500" /> أرباح</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-white/30" /> الإجمالي</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gInvested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
                    <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatCompact} tickLine={false} width={60} />
                    <Tooltip content={<ChartTooltip currency={currency} />} />
                    <Area type="monotone" dataKey="المبلغ المستثمر" stackId="1" stroke="#3b82f6" fill="url(#gInvested)" strokeWidth={2} animationDuration={800} />
                    <Area type="monotone" dataKey="الأرباح" stackId="1" stroke="#10b981" fill="url(#gEarnings)" strokeWidth={2} animationDuration={800} />
                    <Area type="monotone" dataKey="المحفظة الكلية" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="6 4" dot={false} animationDuration={800} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="bg-[#222640] border border-[#2e3350] rounded-xl p-6 overflow-x-auto">
                <h3 className="text-white font-bold mb-4">جدول تفصيلي سنة بسنة</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2e3350]">
                      {['السنة', 'المستثمر التراكمي', 'قيمة المحفظة', 'الأرباح', 'النمو', ...(inputs.adjustForInflation ? ['القيمة الحقيقية'] : [])].map((h) => (
                        <th key={h} className="py-3 px-2 text-[#a0a0b8] font-medium text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yearData.map((d) => (
                      <tr key={d.year} className="border-b border-[#2e3350] hover:bg-[#2a2e4a]/20 transition">
                        <td className="py-2.5 px-2 text-white font-mono">{d.year}</td>
                        <td className="py-2.5 px-2 text-blue-400 font-mono text-right">{formatCurrency(d.invested, currency)}</td>
                        <td className="py-2.5 px-2 text-[#4f8cff] font-mono text-right">{formatCurrency(d.portfolioValue, currency)}</td>
                        <td className="py-2.5 px-2 text-amber-400 font-mono text-right">{formatCurrency(d.earnings, currency)}</td>
                        <td className="py-2.5 px-2 text-purple-400 font-mono text-right">{d.growthPercent}%</td>
                        {inputs.adjustForInflation && (
                          <td className="py-2.5 px-2 text-rose-400 font-mono text-right">{d.realValue ? formatCurrency(d.realValue, currency) : '—'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Scenarios Tab ═══ */}
        {activeTab === 'scenarios' && (
          <div className="space-y-6">
            {/* Shared Inputs */}
            <div className="bg-[#222640] border border-[#2e3350] rounded-xl p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full" />
                المعطيات المشتركة لجميع السيناريوهات
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <InputField label="رأس المال الابتدائي" value={inputs.initialAmount} onChange={(v) => updateInput('initialAmount', v)} min={0} max={1000000} step={1000} suffix={currency === 'USD' ? '$' : 'د.أ'} />
                <InputField label="الإيداع الشهري" value={inputs.monthlyDeposit} onChange={(v) => updateInput('monthlyDeposit', v)} min={0} max={50000} step={50} suffix={currency === 'USD' ? '$/شهر' : 'د.أ/شهر'} />
                <InputField label="عدد السنوات" value={inputs.years} onChange={(v) => updateInput('years', v)} min={1} max={50} step={1} suffix="سنة" />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {scenarios.map((scenario) => {
                const data = calculateYearlyData(inputs, scenario.annualRate);
                const last = data[data.length - 1];
                return (
                  <div key={scenario.id} className="bg-[#222640] border border-[#2e3350] rounded-xl p-5 space-y-3 hover:border-[#2e3350] transition">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scenario.color }} />
                      <input
                        type="text"
                        value={scenario.name}
                        onChange={(e) => setScenarios((prev) => prev.map((s) => s.id === scenario.id ? { ...s, name: e.target.value } : s))}
                        className="bg-transparent text-white font-bold text-lg border-none outline-none w-full"
                      />
                    </div>
                    <InputField label="معدل العائد السنوي" value={scenario.annualRate} onChange={(v) => setScenarios((prev) => prev.map((s) => s.id === scenario.id ? { ...s, annualRate: v } : s))} min={0} max={50} step={0.5} suffix="%" />
                    {last && (
                      <div className="pt-2 border-t border-[#2e3350] space-y-1">
                        <p className="text-sm text-[#a0a0b8]">القيمة النهائية: <span className="text-white font-bold">{formatCurrency(last.portfolioValue, currency)}</span></p>
                        <p className="text-sm text-[#a0a0b8]">المستثمر: <span className="text-blue-400 font-bold">{formatCurrency(last.invested, currency)}</span></p>
                        <p className="text-sm text-[#a0a0b8]">الأرباح: <span className="text-amber-400 font-bold">{formatCurrency(last.earnings, currency)}</span></p>
                        <p className="text-sm text-[#a0a0b8]">النمو: <span className="text-purple-400 font-bold">{last.growthPercent}%</span></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Comparison Chart */}
            <div className="bg-[#222640] border border-[#2e3350] rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">مقارنة السيناريوهات — القيمة الإجمالية</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={scenarioChartData}>
                  <defs>
                    {scenarios.map((s) => (
                      <linearGradient key={s.id} id={`sg-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
                  <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatCompact} tickLine={false} width={60} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(v) => <span style={{ color: '#cbd5e1', fontSize: 13 }}>{v}</span>} />
                  {scenarios.map((s) => (
                    <Area key={s.id} type="monotone" dataKey={s.name} stroke={s.color} fill={`url(#sg-${s.id})`} strokeWidth={2.5} animationDuration={800} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison Table */}
            <div className="bg-[#222640] border border-[#2e3350] rounded-xl p-6 overflow-x-auto">
              <h3 className="text-white font-bold mb-4">جدول المقارنة</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2e3350]">
                    {['السيناريو', 'العائد', 'المستثمر', 'القيمة النهائية', 'الأرباح', 'النمو'].map((h) => (
                      <th key={h} className="py-3 px-3 text-[#a0a0b8] font-medium text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scenarioData.map((s) => {
                    const last = s.data[s.data.length - 1];
                    if (!last) return null;
                    return (
                      <tr key={s.id} className="border-b border-[#2e3350] hover:bg-[#2a2e4a]/20 transition">
                        <td className="py-3 px-3 font-medium flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-white">{s.name}</span>
                        </td>
                        <td className="py-3 px-3 text-[#e8e8f0] font-mono text-right">{s.annualRate}%</td>
                        <td className="py-3 px-3 text-blue-400 font-mono text-right">{formatCurrency(last.invested, currency)}</td>
                        <td className="py-3 px-3 text-[#4f8cff] font-mono text-right font-bold">{formatCurrency(last.portfolioValue, currency)}</td>
                        <td className="py-3 px-3 text-amber-400 font-mono text-right">{formatCurrency(last.earnings, currency)}</td>
                        <td className="py-3 px-3 text-purple-400 font-mono text-right">{last.growthPercent}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ Goal Seek Tab ═══ */}
        {activeTab === 'goal' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Inputs */}
            <div className="bg-[#222640] border border-[#2e3350] rounded-xl p-6 space-y-5">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full" />
                حاسبة الهدف العكسي
              </h2>
              <p className="text-sm text-[#a0a0b8]">حدد هدفك المالي والأداة تحسب كم تحتاج تستثمر شهرياً للوصول إليه</p>
              <InputField label="المبلغ المستهدف" value={goalInputs.targetAmount} onChange={(v) => setGoalInputs((p) => ({ ...p, targetAmount: v }))} min={0} max={10000000} step={1000} suffix={currency === 'USD' ? '$' : 'د.أ'} />
              <InputField label="السنة المستهدفة" value={goalInputs.targetYear} onChange={(v) => setGoalInputs((p) => ({ ...p, targetYear: v }))} min={1} max={50} step={1} suffix="سنة" />
              <InputField label="رأس المال الابتدائي" value={goalInputs.initialAmount} onChange={(v) => setGoalInputs((p) => ({ ...p, initialAmount: v }))} min={0} max={1000000} step={1000} suffix={currency === 'USD' ? '$' : 'د.أ'} />
              <InputField label="معدل العائد السنوي المتوقع" value={goalInputs.annualRate} onChange={(v) => setGoalInputs((p) => ({ ...p, annualRate: v }))} min={0} max={50} step={0.5} suffix="%" />
            </div>

            {/* Results */}
            <div className="space-y-6">
              {/* Main Result */}
              <div className={`border rounded-xl p-8 text-center space-y-4 ${goalResult.isAlreadyReached ? 'bg-[#222640] border-amber-500/30' : 'bg-[#222640] border-[#4f8cff]/30'}`}>
                {goalResult.isAlreadyReached ? (
                  <>
                    <p className="text-amber-400 text-sm uppercase tracking-wider">الهدف محقق بالفعل!</p>
                    <p className="text-4xl font-bold text-[#4f8cff]">
                      {formatCurrency(Math.round(goalResult.futureValueOfInitial), currency)}
                    </p>
                    <p className="text-[#a0a0b8] text-sm">
                      رأس المال الابتدائي{' '}
                      {formatCurrency(goalInputs.initialAmount, currency)} كافٍ للوصول إلى{' '}
                      {formatCurrency(goalInputs.targetAmount, currency)} خلال {goalInputs.targetYear} سنة
                    </p>
                    <p className="text-[#4f8cff] text-xs">لا حاجة لإيداعات شهرية إضافية</p>
                  </>
                ) : (
                  <>
                    <p className="text-[#a0a0b8] text-sm uppercase tracking-wider">المبلغ الشهري المطلوب</p>
                    <p className="text-5xl font-bold text-[#4f8cff]">
                      {formatCurrency(Math.ceil(goalResult.monthlyPayment), currency)}
                    </p>
                    <p className="text-[#a0a0b8] text-sm">
                      شهرياً لمدة {goalInputs.targetYear} سنة للوصول إلى {formatCurrency(goalInputs.targetAmount, currency)}
                    </p>
                  </>
                )}
              </div>

              {/* Details */}
              <div className="bg-[#222640] border border-[#2e3350] rounded-xl p-6 space-y-3">
                <h3 className="text-white font-bold">تفاصيل الحساب</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-[#2e3350]">
                    <span className="text-[#a0a0b8]">المبلغ المستهدف</span>
                    <span className="text-white font-mono">{formatCurrency(goalInputs.targetAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#2e3350]">
                    <span className="text-[#a0a0b8]">رأس المال الابتدائي</span>
                    <span className="text-blue-400 font-mono">{formatCurrency(goalInputs.initialAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#2e3350]">
                    <span className="text-[#a0a0b8]">قيمة رأس المال بعد {goalInputs.targetYear} سنة</span>
                    <span className="text-cyan-400 font-mono">{formatCurrency(Math.round(goalResult.futureValueOfInitial), currency)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#2e3350]">
                    <span className="text-[#a0a0b8]">الفجوة المطلوب تغطيتها</span>
                    <span className="text-amber-400 font-mono">
                      {formatCurrency(Math.max(0, goalInputs.targetAmount - Math.round(goalResult.futureValueOfInitial)), currency)}
                    </span>
                  </div>
                  {!goalResult.isAlreadyReached && (
                    <>
                      <div className="flex justify-between py-2 border-b border-[#2e3350]">
                        <span className="text-[#a0a0b8]">إجمالي الاشتراكات الشهرية</span>
                        <span className="text-purple-400 font-mono">
                          {formatCurrency(Math.ceil(goalResult.monthlyPayment) * goalInputs.targetYear * 12, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-[#a0a0b8]">إجمالي الأرباح المتوقعة</span>
                        <span className="text-[#4f8cff] font-mono">
                          {formatCurrency(
                            Math.max(0, goalInputs.targetAmount - goalInputs.initialAmount - Math.ceil(goalResult.monthlyPayment) * goalInputs.targetYear * 12),
                            currency
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Goal Projection Chart */}
              {!goalResult.isAlreadyReached && goalProjection.length > 0 && (
                <div className="bg-[#222640] border border-[#2e3350] rounded-xl p-6">
                  <h3 className="text-white font-bold mb-4">مسورة النمو نحو الهدف</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={goalChartData}>
                      <defs>
                        <linearGradient id="gGoalInvested" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gGoalEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
                      <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatCompact} tickLine={false} width={60} />
                      <Tooltip content={<GoalTooltip currency={currency} targetAmount={goalInputs.targetAmount} />} />
                      <ReferenceLine y={goalInputs.targetAmount} stroke="#fbbf24" strokeDasharray="8 4" strokeWidth={2} label={{ value: 'الهدف', fill: '#fbbf24', fontSize: 12, position: 'right' }} />
                      <Area type="monotone" dataKey="المبلغ المستثمر" stackId="1" stroke="#3b82f6" fill="url(#gGoalInvested)" strokeWidth={2} animationDuration={800} />
                      <Area type="monotone" dataKey="الأرباح" stackId="1" stroke="#10b981" fill="url(#gGoalEarnings)" strokeWidth={2} animationDuration={800} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#2e3350] mt-12 py-6 text-center text-sm text-[#77839a]">
        حاسبة الاستثمار التفاعلية — جميع الحسابات تقريبية ولا تُعتبر نصيحة مالية
      </footer>
    </div>
  );
}
