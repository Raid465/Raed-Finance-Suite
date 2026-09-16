import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const app = express();
const PORT = process.env.PORT || 3001;

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 دقيقة
  max: 120, // enough for repeated comparisons while still preventing runaway local requests
  message: { error: "Too many requests. Please wait a moment and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
app.use(cors());

// ─── Cache ──────────────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
  // تنظيف الكاش القديم كل 10 دقائق
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.time > CACHE_TTL) cache.delete(k);
    }
    // Hard cap for long-running local sessions with many different symbols.
    while (cache.size > 500) cache.delete(cache.keys().next().value);
  }
}

// ─── API Routes ─────────────────────────────────────────────────────────────

app.get("/api/stock/:ticker", async (req, res) => {
  const ticker = String(req.params.ticker || "").trim().toUpperCase();
  const cached = getCached(`stock:${ticker}`);
  if (cached) return res.json(cached);

  try {
    const quote = await yf.quote(ticker);
    let sum = {};
    try {
      sum = await yf.quoteSummary(ticker, {
        modules: ["financialData", "defaultKeyStatistics", "summaryDetail", "assetProfile"],
      });
    } catch {}

    const fin = sum.financialData || {};
    const key = sum.defaultKeyStatistics || {};
    const det = sum.summaryDetail || {};
    const prof = sum.assetProfile || {};

    const result = {
      ticker,
      name: quote.shortName || quote.longName || ticker,
      price: quote.regularMarketPrice ?? null,
      marketCap: quote.marketCap ?? null,
      pe: quote.trailingPE ?? null,
      forwardPE: quote.forwardPE ?? key.forwardPE ?? null,
      eps: quote.epsTrailingTwelveMonths ?? null,
      forwardEps: key.forwardEps ?? null,
      profitMargin: fin.profitMargins != null ? +(fin.profitMargins * 100).toFixed(2) : null,
      grossMargins: fin.grossMargins != null ? +(fin.grossMargins * 100).toFixed(2) : null,
      operatingMargins: fin.operatingMargins != null ? +(fin.operatingMargins * 100).toFixed(2) : null,
      revenueGrowth: fin.revenueGrowth != null ? +(fin.revenueGrowth * 100).toFixed(2) : null,
      earningsGrowth: fin.earningsGrowth != null ? +(fin.earningsGrowth * 100).toFixed(2) : null,
      dividendYield: quote.dividendYield ?? null,
      oneYearReturn: quote.fiftyTwoWeekChangePercent != null ? +quote.fiftyTwoWeekChangePercent.toFixed(2) : null,
      beta: key.beta ?? null,
      debtToEquity: fin.debtToEquity ?? null,
      returnOnEquity: fin.returnOnEquity != null ? +(fin.returnOnEquity * 100).toFixed(2) : null,
      returnOnAssets: fin.returnOnAssets != null ? +(fin.returnOnAssets * 100).toFixed(2) : null,
      currentRatio: fin.currentRatio ?? null,
      quickRatio: fin.quickRatio ?? null,
      targetPrice: fin.targetMeanPrice ?? null,
      targetHigh: fin.targetHighPrice ?? null,
      targetLow: fin.targetLowPrice ?? null,
      recommendation: fin.recommendationKey ?? null,
      analystCount: fin.numberOfAnalystOpinions ?? null,
      sector: prof.sector ?? null,
      industry: prof.industry ?? null,
      employees: prof.fullTimeEmployees ?? null,
      volume: quote.regularMarketVolume ?? null,
      avgVolume: quote.averageDailyVolume3Month ?? null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
      bookValue: quote.bookValue ?? key.bookValue ?? null,
      priceToBook: quote.priceToBook ?? key.priceToBook ?? null,
      pegRatio: key.pegRatio ?? null,
      totalCash: fin.totalCash ?? null,
      totalDebt: fin.totalDebt ?? null,
      totalRevenue: fin.totalRevenue ?? null,
      freeCashflow: fin.freeCashflow ?? null,
      ebitda: fin.ebitda ?? null,
      heldPercentInsiders: key.heldPercentInsiders ?? null,
      heldPercentInstitutions: key.heldPercentInstitutions ?? null,
    };

    setCache(`stock:${ticker}`, result);
    res.json(result);
  } catch (err) {
    console.error(`Error ${ticker}:`, err.message);
    res.status(404).json({ error: `Ticker "${ticker}" was not found.` });
  }
});

app.get("/api/history/:ticker", async (req, res) => {
  const ticker = String(req.params.ticker || "").trim().toUpperCase();
  const cached = getCached(`history:${ticker}`);
  if (cached) return res.json(cached);

  try {
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 10);
    const result = await yf.chart(ticker, {
      period1: period1.toISOString().split("T")[0],
      period2: new Date().toISOString().split("T")[0],
      interval: "1mo",
    });
    const history = result.quotes.map(q => ({
      date: q.date.toISOString().split("T")[0],
      price: q.close != null ? +q.close.toFixed(2) : null,
      volume: q.volume ?? null,
    })).filter(q => q.price != null);

    const data = { ticker, history };
    setCache(`history:${ticker}`, data);
    res.json(data);
  } catch (err) {
    console.error(`History ${ticker}:`, err.message);
    res.status(404).json({ error: "Historical data is unavailable." });
  }
});

app.get("/api/earnings/:ticker", async (req, res) => {
  const ticker = String(req.params.ticker || "").trim().toUpperCase();
  const cached = getCached(`earnings:${ticker}`);
  if (cached) return res.json(cached);

  try {
    const currentYear = new Date().getUTCFullYear();
    const period2 = `${currentYear + 1}-12-31`;
    const quarterlyData = await yf.fundamentalsTimeSeries(ticker, {
      module: "financials",
      period1: `${currentYear - 3}-01-01`,
      period2,
      type: "quarterly",
    });

    const quarterly = quarterlyData.map(q => ({
      quarter: q.date ? new Date(q.date).toISOString().split("T")[0] : null,
      revenue: q.totalRevenue ?? null,
      earnings: q.netIncome ?? null,
      epsActual: q.dilutedEPS ?? null,
      epsEstimate: null,
      surprise: null,
    }));

    const yearlyData = await yf.fundamentalsTimeSeries(ticker, {
      module: "financials",
      period1: `${currentYear - 6}-01-01`,
      period2,
      type: "annual",
    });

    const yearly = yearlyData.map(q => ({
      year: q.date ? new Date(q.date).toISOString().split("T")[0].substring(0, 4) : null,
      revenue: q.totalRevenue ?? null,
      earnings: q.netIncome ?? null,
    }));

    const data = { ticker, quarterly, yearly };
    setCache(`earnings:${ticker}`, data);
    res.json(data);
  } catch (err) {
    console.error(`Earnings ${ticker}:`, err.message);
    try {
      const q = await yf.quote(ticker);
      const data = {
        ticker,
        quarterly: [{ quarter: "TTM", revenue: null, earnings: null, epsActual: q.epsTrailingTwelveMonths, epsEstimate: null, surprise: null }],
        yearly: [],
      };
      setCache(`earnings:${ticker}`, data);
      res.json(data);
    } catch {
      res.json({ ticker, quarterly: [], yearly: [] });
    }
  }
});

// ─── Health Check ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", cache: cache.size });
});

// ─── Start Server ───────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => console.log(`✅ Server on http://127.0.0.1:${PORT}`));
