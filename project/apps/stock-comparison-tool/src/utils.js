// API base URL, number formatting, fetch helper and the plain-language summary.
import { UI } from "./i18n";

export const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001/api";

export const fmt = (n, s = "") => {
  if (n == null || isNaN(n)) return null;
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T" + s;
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B" + s;
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M" + s;
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K" + s;
  return n.toLocaleString("en-US") + s;
};
export const fmtUSD = (n) => (n == null ? null : "$" + fmt(n));
export const fmtPct = (n) => (n == null ? null : n.toFixed(2) + "%");

// Throws an Error carrying the HTTP status (0 = server not reachable) so the
// UI can show a specific, translated message.
export async function fetchJSON(url) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw Object.assign(new Error("Stock API is not reachable"), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw Object.assign(new Error(data.error || res.statusText), { status: res.status });
  return data;
}

export function generateSummary(d1, d2, lang) {
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
