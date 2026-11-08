# Changelog

## Unreleased (branch `fix/phase1-safety`)

### Security and correctness
- ETF page escapes all text from Yahoo, the fund datasets, saved data and the search box before writing it into the page; news links only open `http(s)` URLs.
- The launcher records the processes it starts (`project/logs/suite_pids.json`) and only stops those on the next run. Another program on a suite port is reported, never killed.
- Stock API validates ticker format (400), and separates "ticker not found" (404) from "no internet / data source unreachable" (503) and other provider errors (502).
- One-time data migration only looks in `Raed-Finance-Suite*` folders next to the current copy, not the whole Downloads folder.

### Setup and stability
- `Start Raed Finance.bat` creates a private Python environment (`project\.venv`); after first-time setup it starts the suite right away instead of exiting.
- `requirements.txt` uses bounded version ranges; `httpx` added for the offline API tests.
- Stock Comparison upgraded to React 19, Recharts 3, Tailwind 4 and Vite 8 (same stack as the Investment Calculator); unused `node-fetch`, PostCSS and Tailwind 3 config removed.
- `Run Tests.bat` uses the private environment and skips live checks when the suite is not running.
- Saudi ETF list loads prices 6 at a time instead of one by one.
- Mutual-fund API and page show the dataset date ("Data as of …").

### Code structure
- ETF page split into `index.html`, `css/app.css` and feature scripts in `frontend/js/`.
- Investment Calculator split into `calculations.ts`, `excelExport.ts`, `components.tsx` and `App.tsx`; the formula test now reads `calculations.ts`.
- Stock Comparison split into `i18n.js`, `theme.js`, `utils.js` and components.
- `tests/_sources.py` rebuilds full sources so static checks don't depend on file layout.

### Design
- New Clean Light theme across the dashboard and all three apps (tokens in `project/design-system/tokens.css`, rules in `STYLE_GUIDE.md`).
- ETF outline buttons (period pickers, table actions) are white with a border; they used to inherit the solid blue fill.
- Calculator header leaves room for the language button so it no longer covers the currency switch.

## 2026-09-16 audit (from the former `project/docs/` notes)

### Fixes
- Removed a duplicate `addToWatchlistDirect()` that posted to the wrong endpoint.
- Saudi mutual-fund names and managers stay in Arabic; objective filters translate to English (Income, Capital Preservation, Capital Growth, Growth & Income).
- Corrected ETF YTD-return conversion; mutual-fund sorting no longer mutates the cached list.
- Strict validation for alerts, portfolios and mutual-fund sort options.
- Stock Comparison calls `127.0.0.1` exactly; price-history failures are non-fatal; cache keys are uppercase; earnings ranges are dynamic; in-memory cache has a hard cap.
- Reproducible `npm ci` installs; Python/Node version checks in the Windows scripts.

### Watchlist persistence and language
- Watchlist, alerts and portfolios are stored in `%LOCALAPPDATA%\RaedFinanceSuite\data`, written atomically, with a browser `localStorage` backup.
- English is the default everywhere, with an Arabic/RTL toggle; translation coverage is tested.

### Speed
- `/api/etf/{symbol}` returns core data first; holdings and allocations load from `/api/composition/{symbol}`.
- Browser session cache (90 s core data, 5 min history, 6 h composition) on top of the server memory + SQLite cache.
- Risk, technicals, dividends and news load lazily near the viewport.

### Style history
- Classic Dark palette with blue (`#2563eb`) active states (replaced by Clean Light above).
