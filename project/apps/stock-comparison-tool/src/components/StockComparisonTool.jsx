import React, { useState, useCallback, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001/api";

const EXPLAIN = {
  ar: {
    marketCap: "القيمة السوقية هي إجمالي قيمة الشركة في السوق. تُحسب بضرب عدد الأسهم في سعر السهم. كلما كانت أكبر كانت الشركة أضخم.",
    pe: "نسبة السعر للربح (P/E) تُظهر كم يدفع المستثمر مقابل كل دولار ربح. الطبيعي بين 15-25. أقل من 15 رخيص، أكثر من 30 مبالغ.",
    forwardPE: "نسبة P/E المتوقعة تعتمد على أرباح المستقبل. إذا كانت أقل من P/E الحالي فهذا يعني نمو متوقع في الأرباح.",
    eps: "ربحية السهم (EPS) هي الأرباح المحققة لكل سهم. كلما كانت أعلى كان أفضل.",
    forwardEps: "ربحية السهم المتوقعة هي توقعات المحللين للأرباح المستقبلية.",
    profitMargin: "هامش الربح الصافي هو نسبة الربح من إجمالي الإيرادات. 15%+ ممتاز، أقل من 5% ضعيف.",
    grossMargins: "هامش الربح الإجمالي يُظهر كفاءة الإنتاج قبل خصم المصروفات. 40%+ ممتاز.",
    operatingMargins: "هامش الربح التشغيلي يُظهر ربحية العمليات الأساسية. 20%+ ممتاز.",
    revenueGrowth: "نمو الإيرادات يُظهر نسبة تغير المبيعات مقارنة بالسنة الماضية. إيجابي = الشركة تكبر.",
    earningsGrowth: "نمو الأرباح يُظهر نسبة تغير الأرباح مقارنة بالسنة الماضية. إيجابي = الشركة تربح أكثر.",
    dividendYield: "نسبة التوزيعات هي الدفع النقدي للمساهمين سنوياً كنسبة من سعر السهم. 2%+ جيد.",
    oneYearReturn: "أداء السهم خلال آخر 52 أسبوع. إيجابي = السهم صاعد.",
    beta: "مقياس المخاطرة. 1 = مثل السوق. أكثر من 1 = أكثر تقلباً (مخاطرة).",
    debtToEquity: "نسبة الديون للحقوق. أقل من 100% جيد. أكثر من 200% مخاطرة.",
    returnOnEquity: "العائد على حقوق الملكية (ROE). يُظهر كفاءة استثمار رأس المال. 15%+ ممتاز.",
    returnOnAssets: "العائد على الأصول (ROA). يُظهر كفاءة استخدام الأصول. 5%+ جيد.",
    currentRatio: "النسبة الحالية. قدرة الشركة على سداد ديونها قصيرة الأجل. أكثر من 1.5 جيد.",
    quickRatio: "النسبة السريعة مثل النسبة الحالية لكن بدون المخزون. أكثر من 1 جيد.",
    targetPrice: "سعر الهدف هو المتوسط المتوقع من المحللين. إذا كان أعلى من السعر الحالي فهذا إيجابي.",
    pegRatio: "نسبة P/E للنمو. أقل من 1 = رخيص. بين 1-2 = عادل. أكثر من 2 = مبالغ.",
    totalCash: "إجمالي النقد الذي تملكه الشركة. أكثر = أمان مالي أعلى.",
    totalDebt: "إجمالي الديون. يجب مقارنتها بالنقد والأرباح.",
    totalRevenue: "إجمالي الإيرادات (المبيعات). يُظهر حجم الأعمال.",
    freeCashflow: "التدفق النقدي الحر. النقد المتاح بعد كل المصروفات. إيجابي = صحي.",
    ebitda: "الأرباح قبل الفوائد والضرائب والاستهلاك. يُظهر ربحية العمليات.",
    heldPercentInsiders: "نسبة الأسهم الممسوكة من الداخلين (الإدارة). أكثر من 10% = ثقة.",
    heldPercentInstitutions: "نسبة الأسهم الممسوكة من المؤسسات الكبيرة. أكثر من 50% = مصدوقية.",
    fiftyTwoWeekHigh: "أعلى سعر خلال 52 أسبوع. إذا كان السعر الحالي قريب منه = السهم قوي.",
    fiftyTwoWeekLow: "أدنى سعر خلال 52 أسبوع. إذا كان السعر الحالي قريب منه = فرصة شراء.",
    volume: "حجم التداول اليومي. أكثر = سيولة أعلى.",
    avgVolume: "متوسط حجم التداول.",
    bookValue: "القيمة الدفترية هي قيمة الأصول حسب الدفاتر المحاسبية.",
    priceToBook: "نسبة السعر للقيمة الدفترية. أقل من 1 = رخيص.",
    recommendation: "توصية المحللين: buy = شراء، hold = احتفاظ، sell = بيع.",
    analystCount: "عدد المحللين الذين يغطون السهم.",
  },
  en: {
    marketCap: "Market capitalization is total market value of all outstanding shares. Larger cap means a larger company.",
    pe: "Price-to-Earnings (P/E) shows how much investors pay per dollar of profit. 15-25 is average. Below 15 is cheap, above 30 is high.",
    forwardPE: "Forward P/E projects valuation based on estimated future earnings. Lower than current P/E indicates expected earnings growth.",
    eps: "Earnings Per Share (EPS) represents company profit divided by outstanding shares. Higher is better.",
    forwardEps: "Forward EPS represents analyst consensus expected future earnings per share.",
    profitMargin: "Net Profit Margin shows profit as a percentage of total revenue. 15%+ is strong, below 5% is weak.",
    grossMargins: "Gross Margin shows production efficiency before operating expenses. 40%+ is strong.",
    operatingMargins: "Operating Margin reflects profitability from core business operations. 20%+ is strong.",
    revenueGrowth: "Revenue Growth measures year-over-year sales change. Positive indicates expanding business.",
    earningsGrowth: "Earnings Growth measures year-over-year net income change. Positive indicates higher profit growth.",
    dividendYield: "Dividend Yield is annual dividend payout relative to stock price. 2%+ is solid.",
    oneYearReturn: "52-Week Stock Return. Positive means stock price has appreciated over the year.",
    beta: "Volatility measure. 1 = market baseline. >1 = more volatile (higher risk), <1 = less volatile.",
    debtToEquity: "Debt-to-Equity ratio. Below 100% is healthy, above 200% represents higher financial risk.",
    returnOnEquity: "Return on Equity (ROE) measures profit generated per dollar of equity. 15%+ is excellent.",
    returnOnAssets: "Return on Assets (ROA) measures asset profitability efficiency. 5%+ is good.",
    currentRatio: "Current Ratio assesses short-term liquidity. Above 1.5 is healthy.",
    quickRatio: "Quick Ratio evaluates liquid assets excluding inventory vs short-term debt. Above 1.0 is healthy.",
    targetPrice: "Analyst average price target. Price higher than current price indicates upside potential.",
    pegRatio: "PEG Ratio (P/E relative to growth rate). Below 1 = undervalued, 1-2 = fair value, >2 = expensive.",
    totalCash: "Total cash & equivalents held by company. Higher cash improves financial stability.",
    totalDebt: "Total company debt load. Compare against cash reserves and operating earnings.",
    totalRevenue: "Total annual or TTM sales revenue. Measures total business volume.",
    freeCashflow: "Free Cash Flow available after capital expenditures. Positive cashflow indicates financial strength.",
    ebitda: "Earnings Before Interest, Taxes, Depreciation, & Amortization. Measures operational earnings.",
    heldPercentInsiders: "Percentage of shares held by company insiders. Over 10% indicates high insider confidence.",
    heldPercentInstitutions: "Percentage of shares held by institutional investors. Over 50% shows institutional support.",
    fiftyTwoWeekHigh: "52-Week High price. Trading near 52-week high indicates strong momentum.",
    fiftyTwoWeekLow: "52-Week Low price. Trading near 52-week low might present a value opportunity.",
    volume: "Daily trading volume. Higher volume means superior market liquidity.",
    avgVolume: "Average 3-month daily trading volume.",
    bookValue: "Book Value per share based on balance sheet net assets.",
    priceToBook: "Price-to-Book (P/B) ratio. Below 1 indicates stock trading below asset book value.",
    recommendation: "Analyst rating consensus: buy, hold, or sell.",
    analystCount: "Number of equity analysts covering the stock.",
  }
};

const UI = {
  ar: {
    title: "أداة مقارنة الأسهم",
    subtitle: "أدخل رمزَي السهمين للمقارنة",
    stock1: "السهم الأول",
    stock2: "السهم الثاني",
    compareBtn: "🔍 قارن",
    loadingBtn: "⏳ جاري...",
    fetchingData: "جاري جلب البيانات...",
    targetPriceLabel: (count, rec) => `سعر الهدف (${count} محلل) — ${rec}`,
    marketCap: "القيمة السوقية",
    pe: "P/E",
    forwardPE: "Forward P/E",
    eps: "EPS",
    profitMargin: "هامش الربح",
    grossMargins: "هامش gross",
    operatingMargins: "هامش التشغيل",
    revenueGrowth: "نمو الإيرادات",
    earningsGrowth: "نمو الأرباح",
    roe: "ROE",
    roa: "ROA",
    beta: "Beta",
    pegRatio: "PEG",
    debtToEquity: "الديون/الحقوق",
    currentRatio: "نسبة حالية",
    dividendYield: "التوزيعات",
    noDividends: "لا يوجد",
    fiftyTwoWeekHigh: "52 أسبوع (أعلى)",
    fiftyTwoWeekLow: "52 أسبوع (أدنى)",
    volume: "حجم التداول",
    bookValue: "القيمة الدفترية",
    totalCash: "إجمالي النقد",
    totalDebt: "إجمالي الديون",
    totalRevenue: "إجمالي الإيرادات",
    freeCashflow: "التدفق النقدي",
    ebitda: "EBITDA",
    insiders: "Insiders",
    institutions: "Institutions",
    employees: "عدد الموظفين",
    priceChartTitle: (ticker) => `سعر ${ticker} — آخر 10 سنوات`,
    priceTooltip: "السعر",
    dualChartTitle: "مقارنة أداء 10 سنوات (نسبة التغيّر %)",
    volumeChartTitle: (ticker) => `حجم التداول — ${ticker}`,
    volumeTooltip: "الحجم",
    earningsChartTitle: (ticker) => `الأرباح والإيرادات — ${ticker}`,
    quarterly: "ربع سنوي",
    yearly: "سنوي",
    earnings: "الأرباح",
    revenue: "الإيرادات",
    radarTitle: "مقارنة شاملة (Radar)",
    radarMargin: "هامش الربح",
    radarGrowth: "النمو",
    radarReturn: "أداء السنة",
    radarRoe: "ROE",
    directCompareTitle: "مقارنة مباشرة",
    metricCol: "المؤشر",
    price: "السعر",
    oneYearReturn: "أداء السنة",
    targetPrice: "سعر الهدف",
    summaryTitle: "الخلاصة",
    disclaimer: "⚠️ بيانات تقريبية من Yahoo Finance — ليست بيانات لحظية من بورصة رسمية.\nلأغراض تعليمية فقط وليست نصيحة استثمارية.",
    errSame: "أدخل رمزين مختلفين",
    errEmpty: "أدخل رمزَي السهمين",
    errFetch: "خطأ في جلب البيانات.",
    reasons: {
      profitMargin: "هامش ربح أعلى",
      revenueGrowth: "نمو أقوى",
      oneYearReturn: "أداء سنوي أفضل",
      returnOnEquity: "ROE أفضل",
    },
    equalSummary: (t1, t2) => `السهمان ${t1} و ${t2} متساويان تقريباً.`,
    winnerSummary: (w, l, r) => `سهم ${w} يبدو أقوى من ${l} بفضل ${r.join(" و")}.`,
  },
  en: {
    title: "Stock Comparison Tool",
    subtitle: "Enter two stock symbols to compare",
    stock1: "First Stock",
    stock2: "Second Stock",
    compareBtn: "🔍 Compare",
    loadingBtn: "⏳ Loading...",
    fetchingData: "Fetching data...",
    targetPriceLabel: (count, rec) => `Target Price (${count} analysts) — ${rec}`,
    marketCap: "Market Cap",
    pe: "P/E",
    forwardPE: "Forward P/E",
    eps: "EPS",
    profitMargin: "Profit Margin",
    grossMargins: "Gross Margin",
    operatingMargins: "Operating Margin",
    revenueGrowth: "Revenue Growth",
    earningsGrowth: "Earnings Growth",
    roe: "ROE",
    roa: "ROA",
    beta: "Beta",
    pegRatio: "PEG",
    debtToEquity: "Debt/Equity",
    currentRatio: "Current Ratio",
    dividendYield: "Dividend Yield",
    noDividends: "None",
    fiftyTwoWeekHigh: "52-Wk High",
    fiftyTwoWeekLow: "52-Wk Low",
    volume: "Volume",
    bookValue: "Book Value",
    totalCash: "Total Cash",
    totalDebt: "Total Debt",
    totalRevenue: "Total Revenue",
    freeCashflow: "Free Cash Flow",
    ebitda: "EBITDA",
    insiders: "Insiders",
    institutions: "Institutions",
    employees: "Employees",
    priceChartTitle: (ticker) => `${ticker} Price — Last 10 Years`,
    priceTooltip: "Price",
    dualChartTitle: "10-Year Performance Comparison (% Change)",
    volumeChartTitle: (ticker) => `Trading Volume — ${ticker}`,
    volumeTooltip: "Volume",
    earningsChartTitle: (ticker) => `Earnings & Revenue — ${ticker}`,
    quarterly: "Quarterly",
    yearly: "Yearly",
    earnings: "Earnings",
    revenue: "Revenue",
    radarTitle: "Comprehensive Radar Comparison",
    radarMargin: "Profit Margin",
    radarGrowth: "Growth",
    radarReturn: "1-Yr Return",
    radarRoe: "ROE",
    directCompareTitle: "Direct Comparison",
    metricCol: "Metric",
    price: "Price",
    oneYearReturn: "1-Yr Return",
    targetPrice: "Target Price",
    summaryTitle: "Summary",
    disclaimer: "⚠️ Approximate data from Yahoo Finance — not real-time stock exchange data.\nFor educational purposes only, not financial advice.",
    errSame: "Please enter two different stock symbols",
    errEmpty: "Please enter two stock symbols",
    errFetch: "Error fetching stock data.",
    reasons: {
      profitMargin: "higher profit margin",
      revenueGrowth: "stronger growth",
      oneYearReturn: "better 1-year performance",
      returnOnEquity: "better ROE",
    },
    equalSummary: (t1, t2) => `Both ${t1} and ${t2} are roughly equal.`,
    winnerSummary: (w, l, r) => `${w} looks stronger than ${l} due to ${r.join(", ")}.`,
  }
};

const fmt = (n, s = "") => {
  if (n == null || isNaN(n)) return null;
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T" + s;
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B" + s;
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M" + s;
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K" + s;
  return n.toLocaleString("en-US") + s;
};
const fmtUSD = (n) => (n == null ? null : "$" + fmt(n));
const fmtPct = (n) => (n == null ? null : n.toFixed(2) + "%");

const C = {
  s1: "#4f8cff", s2: "#fb923c", bg: "#0f1117",
  card: "#222640", border: "#2e3350",
  text: "#e8e8f0", muted: "#a0a0b8",
  green: "#34d399", red: "#f87171",
};

const tip = {
  contentStyle: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13 },
  itemStyle: { color: C.text },
  labelStyle: { color: C.muted },
};

async function fetchJSON(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error);
  return data;
}

function generateSummary(d1, d2, lang) {
  const t = UI[lang];
  const score = (d) => {
    let s = 0;
    if (d.profitMargin > 15) s += 2; else if (d.profitMargin > 5) s += 1;
    if (d.revenueGrowth > 10) s += 2; else if (d.revenueGrowth > 0) s += 1;
    if (d.oneYearReturn > 20) s += 2; else if (d.oneYearReturn > 0) s += 1;
    if (d.pe > 0 && d.pe < 30) s += 1;
    if (d.returnOnEquity > 15) s += 1;
    return s;
  };
  const s1 = score(d1), s2 = score(d2);
  const w = s1 > s2 ? d1 : s2 > s1 ? d2 : null;
  if (!w) return t.equalSummary(d1.ticker, d2.ticker);
  const l = w === d1 ? d2 : d1;
  const r = [];
  if (w.profitMargin > l.profitMargin) r.push(t.reasons.profitMargin);
  if (w.revenueGrowth > l.revenueGrowth) r.push(t.reasons.revenueGrowth);
  if (w.oneYearReturn > l.oneYearReturn) r.push(t.reasons.oneYearReturn);
  if (w.returnOnEquity > l.returnOnEquity) r.push(t.reasons.returnOnEquity);
  return t.winnerSummary(w.ticker, l.ticker, r);
}

// ─── Components ─────────────────────────────────────────────────────────────

function InfoTip({ id, lang }) {
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

function Stat({ label, value, color, info, lang }) {
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

function Card({ d, color, lang }) {
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

function PriceHistoryChart({ ticker, history, color, lang }) {
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

function DualPriceChart({ h1, h2, t1, t2, lang }) {
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

function VolumeChart({ ticker, history, color, lang }) {
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

function EarningsChart({ ticker, earnings, color, lang }) {
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

function RadarCompare({ d1, d2, lang }) {
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

function ComparisonChart({ d1, d2, lang }) {
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

function Table({ d1, d2, lang }) {
  if (!d1 || !d2) return null;
  const t = UI[lang];
  const rows = [
    { l: t.price, k: "price", f: fmtUSD, w: "both" },
    { l: t.marketCap, k: "marketCap", f: fmtUSD, w: "more", info: "marketCap" },
    { l: t.pe, k: "pe", f: v => v?.toFixed(1), w: "less", info: "pe" },
    { l: t.forwardPE, k: "forwardPE", f: v => v?.toFixed(1), w: "less", info: "forwardPE" },
    { l: t.eps, k: "eps", f: v => v ? "$" + v.toFixed(2) : null, w: "more", info: "eps" },
    { l: t.profitMargin, k: "profitMargin", f: fmtPct, w: "more", info: "profitMargin" },
    { l: t.revenueGrowth, k: "revenueGrowth", f: fmtPct, w: "more", info: "revenueGrowth" },
    { l: t.roe, k: "returnOnEquity", f: fmtPct, w: "more", info: "returnOnEquity" },
    { l: t.beta, k: "beta", f: v => v?.toFixed(2), w: "less", info: "beta" },
    { l: t.pegRatio, k: "pegRatio", f: v => v?.toFixed(2), w: "less", info: "pegRatio" },
    { l: t.debtToEquity, k: "debtToEquity", f: v => v?.toFixed(1), w: "less", info: "debtToEquity" },
    { l: t.dividendYield, k: "dividendYield", f: fmtPct, w: "more", info: "dividendYield" },
    { l: t.oneYearReturn, k: "oneYearReturn", f: fmtPct, w: "more", info: "oneYearReturn" },
    { l: t.targetPrice, k: "targetPrice", f: fmtUSD, w: "more", info: "targetPrice" },
  ].filter(r => d1[r.k] != null || d2[r.k] != null);

  const win = (r) => {
    const a = d1[r.k], b = d2[r.k];
    if (a == null && b == null) return null;
    if (a == null) return 2;
    if (b == null) return 1;
    if (r.w === "more") return a > b ? 1 : a < b ? 2 : null;
    if (r.w === "less") return a < b ? 1 : a > b ? 2 : null;
    return null;
  };

  const alignClass = lang === "ar" ? "text-right" : "text-left";

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: C.border }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: C.card }}>
            <th className={`${alignClass} px-4 py-3 font-semibold`} style={{ color: C.muted }}>{t.metricCol}</th>
            <th className="text-center px-4 py-3 font-bold" style={{ color: C.s1 }}>{d1.ticker}</th>
            <th className="text-center px-4 py-3 font-bold" style={{ color: C.s2 }}>{d2.ticker}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const w = win(r);
            const v1 = r.f(d1[r.k]), v2 = r.f(d2[r.k]);
            if (!v1 && !v2) return null;
            return (
              <tr key={r.k} style={{ background: i % 2 === 0 ? C.bg : C.card + "80" }}>
                <td className="px-4 py-2.5 font-medium flex items-center" style={{ color: C.text }}>
                  {r.l}
                  {r.info && <InfoTip id={r.info} lang={lang} />}
                </td>
                <td className="text-center px-4 py-2.5 font-semibold"
                  style={{ color: w === 1 ? C.green : C.text }}>
                  {v1 || "—"}{w === 1 && " ✓"}
                </td>
                <td className="text-center px-4 py-2.5 font-semibold"
                  style={{ color: w === 2 ? C.green : C.text }}>
                  {v2 || "—"}{w === 2 && " ✓"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Summary({ text, lang }) {
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

// ─── Main ───────────────────────────────────────────────────────────────────

export default function StockComparisonTool() {
  const [lang, setLang] = useState("en");
  const [t1, setT1] = useState("AAPL");
  const [t2, setT2] = useState("MSFT");
  const [d1, setD1] = useState(null);
  const [d2, setD2] = useState(null);
  const [h1, setH1] = useState(null);
  const [h2, setH2] = useState(null);
  const [e1, setE1] = useState(null);
  const [e2, setE2] = useState(null);
  const [sum, setSum] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const t = UI[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    if (d1 && d2) {
      setSum(generateSummary(d1, d2, lang));
    }
  }, [lang, d1, d2]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === "ar" ? "en" : "ar"));
  };

  const compare = useCallback(async () => {
    if (!t1.trim() || !t2.trim()) return setErr(t.errEmpty);
    if (t1.trim().toUpperCase() === t2.trim().toUpperCase()) return setErr(t.errSame);
    setLoading(true); setErr("");
    setD1(null); setD2(null); setH1(null); setH2(null); setE1(null); setE2(null); setSum("");
    try {
      const [r1, r2, hist1, hist2, earn1, earn2] = await Promise.all([
        fetchJSON(`${API}/stock/${t1.trim()}`),
        fetchJSON(`${API}/stock/${t2.trim()}`),
        fetchJSON(`${API}/history/${t1.trim()}`).catch(() => ({ history: [] })),
        fetchJSON(`${API}/history/${t2.trim()}`).catch(() => ({ history: [] })),
        fetchJSON(`${API}/earnings/${t1.trim()}`).catch(() => ({ quarterly: [], yearly: [] })),
        fetchJSON(`${API}/earnings/${t2.trim()}`).catch(() => ({ quarterly: [], yearly: [] })),
      ]);
      setD1(r1); setD2(r2);
      setH1(hist1.history); setH2(hist2.history);
      setE1(earn1); setE2(earn2);
      setSum(generateSummary(r1, r2, lang));
    } catch (e) {
      // Keep error text consistent with the selected UI language.
      setErr(t.errFetch);
    } finally {
      setLoading(false);
    }
  }, [t1, t2, lang, t]);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-4 py-8"
      style={{ background: C.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header with Language Switcher */}
        <div className="relative text-center mb-2">
          <div className="flex justify-end mb-2 sm:mb-0 sm:absolute sm:top-0 sm:right-0">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors border"
              style={{ background: C.card, color: C.text, borderColor: C.border }}
              title={lang === "ar" ? "Switch to English" : "التحويل للعربية"}
            >
              <span className="text-base">🌐</span>
              <span>{lang === "ar" ? "English" : "العربية"}</span>
            </button>
          </div>
          <h1 className="text-3xl font-black mb-1" style={{ color: C.text }}>{t.title}</h1>
          <p className="text-sm" style={{ color: C.muted }}>{t.subtitle}</p>
        </div>

        <div className="max-w-5xl mx-auto rounded-xl px-4 py-4 border" style={{ background: C.card, borderColor: C.border }}>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>{t.stock1}</label>
              <input type="text" value={t1} onChange={e => setT1(e.target.value.toUpperCase())}
                placeholder="AAPL" maxLength={6}
                className="w-full px-3.5 py-2.5 rounded-lg text-base font-bold tracking-wider outline-none transition-colors"
                style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }}
                onFocus={e => e.currentTarget.style.borderColor = C.s1}
                onBlur={e => e.currentTarget.style.borderColor = C.border} />
            </div>
            <div className="hidden sm:flex items-center justify-center h-10 px-1 text-xs font-extrabold self-end"
              style={{ color: C.muted }}>VS</div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>{t.stock2}</label>
              <input type="text" value={t2} onChange={e => setT2(e.target.value.toUpperCase())}
                placeholder="MSFT" maxLength={6}
                className="w-full px-3.5 py-2.5 rounded-lg text-base font-bold tracking-wider outline-none transition-colors"
                style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }}
                onFocus={e => e.currentTarget.style.borderColor = C.s2}
                onBlur={e => e.currentTarget.style.borderColor = C.border} />
            </div>
            <button onClick={compare} disabled={loading}
              className="w-full sm:w-auto h-[42px] px-6 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              style={{ background: "#2563eb", color: "#fff", border: "1px solid #3b82f6" }}>
              {loading ? t.loadingBtn : t.compareBtn}
            </button>
          </div>
          {err && <div className="mt-3 rounded-xl px-4 py-3 text-sm text-center border"
            style={{ background: C.red + "15", color: C.red, borderColor: C.red + "40" }}>{err}</div>}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: `${C.s1}40`, borderTopColor: C.s1 }} />
              <div className="absolute inset-2 rounded-full border-4 border-b-transparent animate-spin"
                style={{ borderColor: `${C.s2}40`, borderBottomColor: C.s2, animationDirection: "reverse", animationDuration: "0.8s" }} />
            </div>
            <p className="text-sm animate-pulse" style={{ color: C.muted }}>{t.fetchingData}</p>
          </div>
        )}

        {d1 && d2 && !loading && (
          <>
            <div className="flex flex-col lg:flex-row gap-4">
              <Card d={d1} color={C.s1} lang={lang} />
              <Card d={d2} color={C.s2} lang={lang} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PriceHistoryChart ticker={d1.ticker} history={h1} color={C.s1} lang={lang} />
              <PriceHistoryChart ticker={d2.ticker} history={h2} color={C.s2} lang={lang} />
            </div>

            <DualPriceChart h1={h1} h2={h2} t1={d1.ticker} t2={d2.ticker} lang={lang} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VolumeChart ticker={d1.ticker} history={h1} color={C.s1} lang={lang} />
              <VolumeChart ticker={d2.ticker} history={h2} color={C.s2} lang={lang} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EarningsChart ticker={d1.ticker} earnings={e1} color={C.s1} lang={lang} />
              <EarningsChart ticker={d2.ticker} earnings={e2} color={C.s2} lang={lang} />
            </div>

            <Table d1={d1} d2={d2} lang={lang} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ComparisonChart d1={d1} d2={d2} lang={lang} />
              <RadarCompare d1={d1} d2={d2} lang={lang} />
            </div>

            <Summary text={sum} lang={lang} />
          </>
        )}

        <div className="text-center text-[11px] leading-5 pt-4 pb-2 border-t whitespace-pre-line"
          style={{ color: C.muted, borderColor: C.border }}>
          {t.disclaimer}
        </div>
      </div>
    </div>
  );
}
