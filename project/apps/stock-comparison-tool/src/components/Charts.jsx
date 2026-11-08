// Recharts-based price, volume, earnings, radar and comparison charts.
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { UI } from "../i18n";
import { C, tip } from "../theme";
import { fmt } from "../utils";

export function PriceHistoryChart({ ticker, history, color, lang }) {
  if (!history?.length) return null;
  const t = UI[lang];
  return (
    <div className="rounded-2xl p-4 border" style={{ background: C.card, borderColor: color + "40" }}>
      <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color }}>
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        {t.priceChartTitle(ticker)}
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={history} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id={`g-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} interval={11} />
          <YAxis tick={{ fill: C.muted, fontSize: 10 }} domain={["auto", "auto"]} tickFormatter={v => `$${v}`} />
          <Tooltip {...tip} formatter={v => [`$${v.toFixed(2)}`, t.priceTooltip]} />
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2}
            fill={`url(#g-${ticker})`} dot={false} activeDot={{ r: 4, fill: color, stroke: C.bg, strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DualPriceChart({ h1, h2, t1, t2, lang }) {
  if (!h1?.length || !h2?.length) return null;
  const base1 = h1[0]?.price, base2 = h2[0]?.price;
  if (!base1 || !base2) return null;
  const t = UI[lang];

  const data = h1.map((item, i) => {
    const p1 = item.price;
    const p2 = h2[i]?.price;
    return {
      date: item.date.substring(0, 7),
      [t1]: +((p1 / base1 - 1) * 100).toFixed(1),
      [t2]: p2 ? +((p2 / base2 - 1) * 100).toFixed(1) : null,
    };
  }).filter((_, i) => i % 3 === 0);

  if (!data.length) return null;

  return (
    <div className="rounded-2xl p-4 border" style={{ background: C.card, borderColor: C.border }}>
      <h4 className="text-sm font-bold mb-3" style={{ color: C.text }}>{t.dualChartTitle}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} interval={5} />
          <YAxis tick={{ fill: C.muted, fontSize: 10 }} tickFormatter={v => `${v}%`} />
          <Tooltip {...tip} formatter={v => [`${v}%`, ""]} />
          <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
          <Line type="monotone" dataKey={t1} stroke={C.s1} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey={t2} stroke={C.s2} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeChart({ ticker, history, color, lang }) {
  if (!history?.length) return null;
  const t = UI[lang];
  const data = history.filter(h => h.volume).slice(-36).map(h => ({
    date: h.date.substring(0, 7), volume: h.volume,
  }));
  if (!data.length) return null;
  return (
    <div className="rounded-2xl p-4 border" style={{ background: C.card, borderColor: color + "40" }}>
      <h4 className="text-sm font-bold mb-3" style={{ color }}>{t.volumeChartTitle(ticker)}</h4>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} interval={3} />
          <YAxis tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={v => fmt(v)} />
          <Tooltip {...tip} formatter={v => [fmt(v), t.volumeTooltip]} />
          <Bar dataKey="volume" fill={color} radius={[4, 4, 0, 0]} opacity={0.7} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EarningsChart({ ticker, earnings, color, lang }) {
  const [view, setView] = useState("quarterly");
  const t = UI[lang];

  if (!earnings?.quarterly?.length && !earnings?.yearly?.length) return null;

  const qData = (earnings.quarterly || []).slice(-5).map(e => ({
    label: e.quarter ? e.quarter.substring(0, 7) : "",
    [t.earnings]: e.earnings ? +(e.earnings / 1e9).toFixed(2) : e.epsActual ? +e.epsActual.toFixed(2) : null,
    [t.revenue]: e.revenue ? +(e.revenue / 1e9).toFixed(2) : null,
  })).filter(d => d[t.earnings] != null || d[t.revenue] != null);

  const yData = (earnings.yearly || []).slice(-5).map(e => ({
    label: e.year || "",
    [t.earnings]: e.earnings ? +(e.earnings / 1e9).toFixed(2) : null,
    [t.revenue]: e.revenue ? +(e.revenue / 1e9).toFixed(2) : null,
  })).filter(d => d[t.earnings] != null || d[t.revenue] != null);

  const hasYearly = yData.length > 0;
  const data = view === "quarterly" ? qData : yData;
  if (!data.length) return null;

  return (
    <div className="rounded-2xl p-4 border" style={{ background: C.card, borderColor: color + "40" }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h4 className="text-sm font-bold flex items-center gap-2" style={{ color }}>
          <span className="w-3 h-3 rounded-full" style={{ background: color }} />
          {t.earningsChartTitle(ticker)}
        </h4>
        <div className="flex gap-2">
          <button onClick={() => setView("quarterly")}
            className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
            style={{
              background: view === "quarterly" ? color : C.bg,
              color: view === "quarterly" ? "#fff" : C.muted,
            }}>{t.quarterly}</button>
          <button onClick={() => setView("yearly")}
            disabled={!hasYearly}
            className="px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
            style={{
              background: view === "yearly" ? color : C.bg,
              color: view === "yearly" ? "#fff" : C.muted,
            }}>{t.yearly}</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} />
          <YAxis tick={{ fill: C.muted, fontSize: 10 }} tickFormatter={v => `$${v}B`} />
          <Tooltip {...tip} formatter={v => [`$${v}B`, ""]} />
          <Legend wrapperStyle={{ color: C.muted, fontSize: 11 }} />
          <Bar dataKey={t.earnings} fill={C.green} radius={[6, 6, 0, 0]} />
          <Bar dataKey={t.revenue} fill={color} radius={[6, 6, 0, 0]} opacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RadarCompare({ d1, d2, lang }) {
  if (!d1 || !d2) return null;
  const t = UI[lang];
  const metrics = [
    { key: "profitMargin", label: t.radarMargin, max: 50 },
    { key: "revenueGrowth", label: t.radarGrowth, max: 50 },
    { key: "oneYearReturn", label: t.radarReturn, max: 100 },
    { key: "returnOnEquity", label: t.radarRoe, max: 50 },
  ].filter(m => d1[m.key] != null || d2[m.key] != null);
  if (metrics.length < 3) return null;
  const data = metrics.map(m => ({
    metric: m.label,
    [d1.ticker]: Math.min(100, Math.max(0, ((d1[m.key] ?? 0) / m.max) * 100)),
    [d2.ticker]: Math.min(100, Math.max(0, ((d2[m.key] ?? 0) / m.max) * 100)),
  }));
  return (
    <div className="rounded-2xl p-4 border" style={{ background: C.card, borderColor: C.border }}>
      <h4 className="text-sm font-bold mb-3" style={{ color: C.text }}>{t.radarTitle}</h4>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke={C.border} />
          <PolarAngleAxis dataKey="metric" tick={{ fill: C.muted, fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fill: C.muted, fontSize: 9 }} domain={[0, 100]} />
          <Radar name={d1.ticker} dataKey={d1.ticker} stroke={C.s1} fill={C.s1} fillOpacity={0.15} strokeWidth={2} />
          <Radar name={d2.ticker} dataKey={d2.ticker} stroke={C.s2} fill={C.s2} fillOpacity={0.15} strokeWidth={2} />
          <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
          <Tooltip {...tip} formatter={v => [`${v.toFixed(0)}%`, ""]} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ComparisonChart({ d1, d2, lang }) {
  if (!d1 || !d2) return null;
  const t = UI[lang];
  const metrics = [
    { name: t.pe, k: "pe" },
    { name: t.profitMargin, k: "profitMargin" },
    { name: t.radarGrowth, k: "revenueGrowth" },
    { name: t.radarReturn, k: "oneYearReturn" },
  ].filter(m => d1[m.k] != null || d2[m.k] != null);
  if (!metrics.length) return null;
  const data = metrics.map(m => ({
    name: m.name, [d1.ticker]: d1[m.k] ?? 0, [d2.ticker]: d2[m.k] ?? 0,
  }));
  return (
    <div className="rounded-2xl p-4 border" style={{ background: C.card, borderColor: C.border }}>
      <h4 className="text-sm font-bold mb-3" style={{ color: C.text }}>{t.directCompareTitle}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barGap={4} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
          <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
          <Tooltip {...tip} />
          <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
          <Bar dataKey={d1.ticker} fill={C.s1} radius={[6, 6, 0, 0]} />
          <Bar dataKey={d2.ticker} fill={C.s2} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
