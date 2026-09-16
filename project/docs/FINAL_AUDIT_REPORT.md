# Raed Finance Suite — Final Audit Report

Audit date: 2026-09-16

## Result

All reproducible offline/source/UI-mock/API regression tests in the audit environment pass after the fixes below.

The included `Run Tests.bat` additionally performs production builds of both React applications and live local-service/Yahoo checks on the Windows machine after dependencies are installed.

## Bugs fixed during the final audit

- Removed a duplicate, obsolete `addToWatchlistDirect()` function that overrode the correct implementation and posted to the wrong `/api/watchlist` endpoint. Direct ETF/fund Watchlist actions now use `/api/watchlist/add` with the correct request schema and update the persistent browser backup.
- Preserved Saudi mutual-fund names and managers in Arabic while translating UI/filter labels to English.
- Completed English localization for Mutual Fund objectives: Income, Capital Preservation, Capital Growth, Growth & Income.
- Corrected ETF YTD-return conversion (`0.1234` -> `12.34%`).
- Prevented mutual-fund sorting from mutating the shared cached master list across requests.
- Added strict validation for alert direction/price and portfolio names/holdings/shares/prices.
- Added validation for mutual-fund `sort_by` and `sort_order` query values.
- Fixed corrupted/mixed Saudi holding names in the hard-coded fallback data.
- Changed Stock Comparison browser API URL to exact `127.0.0.1`, matching the local-only server bind and avoiding localhost/IPv6 resolution mismatches.
- Made stock price-history failures non-fatal to the main stock comparison result.
- Normalized stock ticker cache keys to uppercase.
- Made stock earnings date ranges dynamic instead of ending at 2026.
- Added a hard cap to the Stock API in-memory cache and raised the local request limit to a safer comparison workload.
- Kept Stock API errors English by default so English UI does not surface Arabic server text.
- Improved launcher dependency detection so a partial/broken `node_modules` directory does not count as installed.
- Changed installs to reproducible `npm ci` using the committed lockfiles.
- Added Python/Node compatibility checks to Windows startup scripts.
- Fixed older secondary launcher scripts so they do not diverge from `Start Raed Finance.bat`.
- Fixed a false Dashboard-language assertion in the live test suite.
- Removed a reference to a nonexistent notification icon.

## Automated checks that pass here

- Python compile/syntax checks.
- Node server syntax check.
- TypeScript/TSX/JSX transpilation/syntax checks for both React apps.
- Investment formula regression tests: zero-return contribution math, monthly compounding, reverse-goal calculation, already-reached target, and target projection.
- ETF static UI/language/launcher/performance regression suite.
- ETF backend cache/concurrency/persistent-Watchlist tests using an offline Yahoo stub.
- Exhaustive ETF FastAPI route tests including security headers, validation, compare/multi-compare/correlation, Saudi ETFs, Mutual Funds, Watchlist, Alerts, Portfolio, and malformed JSON.
- Browser-rendered ETF UI mock checks: English default, Arabic toggle/RTL, Mutual Fund objective translations, Saudi fund names preserved in Arabic, and no page JavaScript exceptions.
- Package-lock/package.json consistency checks.
- Source scan for accidental corrupted/CJK text.
- Duplicate function/duplicate static-ID checks.

## Live Windows check

After first setup and while `Start Raed Finance.bat` is running, run:

`Run Tests.bat`

It performs eight stages, including actual production builds for both React apps and live requests to all local services and selected Yahoo endpoints.

External Yahoo/StockAnalysis latency or availability is outside the application process, so a provider/network warning is reported separately from a core-project failure.
