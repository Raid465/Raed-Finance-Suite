# ETF Analysis Speed Update

This version keeps the existing Classic Dark / blue UI and focuses only on responsiveness.

## What changed

- The first `/api/etf/{symbol}` response now returns core ETF information only.
- Holdings, sector allocation, and asset allocation load independently through `/api/composition/{symbol}`.
- 1-year price history loads in parallel and no longer blocks the first useful result.
- Browser `sessionStorage` cache avoids repeated localhost/API work during the same session.
  - Core ETF data: 90 seconds
  - Price history: 5 minutes
  - Fund composition: 6 hours
- Existing server-side memory + SQLite cache remains enabled.
- Risk, technical indicators, dividends, and news remain lazy and now prefetch much closer to the viewport (`80px` instead of `320px`).
- The language MutationObserver is incremental: it translates only newly inserted nodes instead of rescanning the entire page after each DOM update.
- No visual redesign was applied.

## Tests performed

- Python compile checks: PASS
- Inline ETF JavaScript syntax (`node --check`): PASS
- Static UI / language / launcher / optimization tests: PASS
- Offline ETF backend caching / concurrency / route tests: PASS

Live Yahoo Finance timing cannot be benchmarked in the build environment because external market-data access is unavailable there. `Run Tests.bat` includes live checks for the user's computer.
