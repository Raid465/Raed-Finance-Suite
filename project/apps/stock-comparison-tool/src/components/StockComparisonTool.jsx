import { useState, useCallback, useEffect } from "react";
import { ComparisonChart, DualPriceChart, EarningsChart, PriceHistoryChart, RadarCompare, VolumeChart } from "./Charts";
import { Table } from "./ComparisonTable";
import { Card, Summary } from "./StatCards";
import { UI } from "../i18n";
import { C } from "../theme";
import { API, fetchJSON, generateSummary } from "../utils";

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
                className="w-full px-3.5 py-2.5 rounded-lg text-base font-bold tracking-wider outline-hidden transition-colors"
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
                className="w-full px-3.5 py-2.5 rounded-lg text-base font-bold tracking-wider outline-hidden transition-colors"
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
