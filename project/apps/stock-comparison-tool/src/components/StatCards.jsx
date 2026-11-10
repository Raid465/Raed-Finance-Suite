// Per-stock card, stat rows, info tooltips and summary box.
import { useState } from "react";
import { EXPLAIN, UI } from "../i18n";
import { C } from "../theme";
import { fmt, fmtPct, fmtUSD } from "../utils";

export function InfoTip({ id, lang }) {
  const text = EXPLAIN[lang]?.[id];
  if (!text) return null;
  const [show, setShow] = useState(false);
  const isRtl = lang === "ar";
  return (
    <span className={`relative inline-block ${isRtl ? "mr-1" : "ml-1"}`}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold cursor-help"
        style={{ background: C.border, color: C.muted }}
      >?</span>
      {show && (
        <span className={`absolute z-50 bottom-full ${isRtl ? "right-0" : "left-0"} mb-2 w-64 px-3 py-2 rounded-xl text-xs leading-5 shadow-lg`}
          style={{ background: C.card, color: C.text, border: `1px solid ${C.border}` }}>
          {text}
        </span>
      )}
    </span>
  );
}

export function Stat({ label, value, color, info, lang }) {
  if (!value) return null;
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: C.bg }}>
      <p className="text-[11px] mb-0.5 flex items-center" style={{ color: C.muted }}>
        {label}
        {info && <InfoTip id={info} lang={lang} />}
      </p>
      <p className="text-sm font-bold" style={{ color: color || C.text }}>{value}</p>
    </div>
  );
}

export function Card({ d, color, lang }) {
  if (!d) return null;
  const t = UI[lang];
  const pos = (d.oneYearReturn ?? 0) >= 0;
  return (
    <div className="rounded-2xl p-5 flex-1 min-w-[300px] border" style={{ background: C.card, borderColor: color + "60" }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black"
          style={{ background: color + "25", color }}>{d.ticker?.[0]}</div>
        <div>
          <h3 className="text-xl font-extrabold" style={{ color: C.text }}>{d.ticker}</h3>
          <p className="text-xs" style={{ color: C.muted }}>{d.name}</p>
          {d.sector && <p className="text-[10px] mt-0.5" style={{ color }}>{d.sector} — {d.industry}</p>}
        </div>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-black" style={{ color: C.text }}>{fmtUSD(d.price)}</span>
        {d.oneYearReturn != null && (
          <span className={`${lang === 'ar' ? 'mr-2' : 'ml-2'} text-sm font-bold px-2 py-0.5 rounded-full`}
            style={{ color: pos ? C.green : C.red, background: (pos ? C.green : C.red) + "18" }}>
            {pos ? "▲" : "▼"} {fmtPct(d.oneYearReturn)}
          </span>
        )}
      </div>

      {d.targetPrice && (
        <div className="mb-3 rounded-xl px-3 py-2" style={{ background: C.bg }}>
          <p className="text-[11px] mb-1 flex items-center" style={{ color: C.muted }}>
            <InfoTip id="targetPrice" lang={lang} />
            {t.targetPriceLabel(d.analystCount, d.recommendation)}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: C.red }}>{fmtUSD(d.targetLow)}</span>
            <div className="flex-1 h-2 rounded-full relative" style={{ background: C.border }}>
              <div className="absolute w-3 h-3 rounded-full top-[-2px]" style={{
                background: C.green,
                left: `${Math.min(95, Math.max(5, ((d.targetPrice - (d.targetLow || 0)) / ((d.targetHigh || 1) - (d.targetLow || 0))) * 100))}%`
              }} />
            </div>
            <span className="text-xs font-bold" style={{ color: C.green }}>{fmtUSD(d.targetHigh)}</span>
          </div>
          <p className="text-center text-sm font-black mt-1" style={{ color: C.text }}>{fmtUSD(d.targetPrice)}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Stat label={t.marketCap} value={fmtUSD(d.marketCap)} info="marketCap" lang={lang} />
        <Stat label={t.pe} value={d.pe?.toFixed(1)} info="pe" lang={lang} />
        <Stat label={t.forwardPE} value={d.forwardPE?.toFixed(1)} info="forwardPE" lang={lang} />
        <Stat label={t.eps} value={d.eps ? "$" + d.eps.toFixed(2) : null} info="eps" lang={lang} />
        <Stat label={t.profitMargin} value={fmtPct(d.profitMargin)} color={d.profitMargin > 15 ? C.green : C.text} info="profitMargin" lang={lang} />
        <Stat label={t.grossMargins} value={fmtPct(d.grossMargins)} info="grossMargins" lang={lang} />
        <Stat label={t.operatingMargins} value={fmtPct(d.operatingMargins)} info="operatingMargins" lang={lang} />
        <Stat label={t.revenueGrowth} value={fmtPct(d.revenueGrowth)} color={d.revenueGrowth > 0 ? C.green : C.red} info="revenueGrowth" lang={lang} />
        <Stat label={t.earningsGrowth} value={fmtPct(d.earningsGrowth)} color={d.earningsGrowth > 0 ? C.green : C.red} info="earningsGrowth" lang={lang} />
        <Stat label={t.roe} value={fmtPct(d.returnOnEquity)} info="returnOnEquity" lang={lang} />
        <Stat label={t.roa} value={fmtPct(d.returnOnAssets)} info="returnOnAssets" lang={lang} />
        <Stat label={t.beta} value={d.beta?.toFixed(2)} info="beta" lang={lang} />
        <Stat label={t.pegRatio} value={d.pegRatio?.toFixed(2)} info="pegRatio" lang={lang} />
        <Stat label={t.debtToEquity} value={d.debtToEquity?.toFixed(1)} info="debtToEquity" lang={lang} />
        <Stat label={t.currentRatio} value={d.currentRatio?.toFixed(2)} info="currentRatio" lang={lang} />
        <Stat label={t.dividendYield} value={d.dividendYield != null ? fmtPct(d.dividendYield) : t.noDividends} info="dividendYield" lang={lang} />
        <Stat label={t.fiftyTwoWeekHigh} value={fmtUSD(d.fiftyTwoWeekHigh)} info="fiftyTwoWeekHigh" lang={lang} />
        <Stat label={t.fiftyTwoWeekLow} value={fmtUSD(d.fiftyTwoWeekLow)} info="fiftyTwoWeekLow" lang={lang} />
        <Stat label={t.volume} value={fmt(d.volume)} info="volume" lang={lang} />
        <Stat label={t.bookValue} value={d.bookValue ? "$" + d.bookValue.toFixed(2) : null} info="bookValue" lang={lang} />
        <Stat label={t.totalCash} value={fmtUSD(d.totalCash)} info="totalCash" lang={lang} />
        <Stat label={t.totalDebt} value={fmtUSD(d.totalDebt)} info="totalDebt" lang={lang} />
        <Stat label={t.totalRevenue} value={fmtUSD(d.totalRevenue)} info="totalRevenue" lang={lang} />
        <Stat label={t.freeCashflow} value={fmtUSD(d.freeCashflow)} info="freeCashflow" lang={lang} />
        <Stat label={t.ebitda} value={fmtUSD(d.ebitda)} info="ebitda" lang={lang} />
        <Stat label={t.insiders} value={d.heldPercentInsiders != null ? (d.heldPercentInsiders * 100).toFixed(1) + "%" : null} info="heldPercentInsiders" lang={lang} />
        <Stat label={t.institutions} value={d.heldPercentInstitutions != null ? (d.heldPercentInstitutions * 100).toFixed(1) + "%" : null} info="heldPercentInstitutions" lang={lang} />
        <Stat label={t.employees} value={d.employees?.toLocaleString()} lang={lang} />
      </div>
    </div>
  );
}

export function Summary({ text, lang }) {
  if (!text) return null;
  const t = UI[lang];
  return (
    <div className="rounded-xl p-5 border"
      style={{ background: C.card, borderColor: C.border }}>
      <h4 className="text-sm font-bold mb-2" style={{ color: C.s1 }}>{t.summaryTitle}</h4>
      <p className="text-sm leading-6" style={{ color: C.text }}>{text}</p>
    </div>
  );
}
