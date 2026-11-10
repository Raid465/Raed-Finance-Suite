// Side-by-side metrics table.
import { InfoTip } from "./StatCards";
import { UI } from "../i18n";
import { C } from "../theme";
import { fmtPct, fmtUSD } from "../utils";

export function Table({ d1, d2, lang }) {
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
              <tr key={r.k} style={{ background: i % 2 === 0 ? C.bg : C.card }}>
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
