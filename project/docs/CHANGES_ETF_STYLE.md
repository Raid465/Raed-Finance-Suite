# ETF Style migration changes

## Applied
- Added `design-system/tokens.css` as the canonical palette/token reference.
- Added `design-system/ETF_STYLE_GUIDE.md`.
- Dashboard migrated to the ETF dark palette.
- Stock Comparison migrated to ETF palette; removed the gradient summary card and scale animation.
- Investment Calculator migrated away from page gradients / backdrop blur toward solid ETF cards and borders.
- ETF Analyzer kept visually intact and gained stronger keyboard focus states.
- Fresh page load defaults to English for Dashboard, Stock Comparison, Investment Calculator, and ETF Analyzer.
- Arabic toggle remains available and switches RTL/LTR.
- Added visible keyboard focus outlines across the suite.

## Intentionally unchanged
- API routes and ports.
- Financial calculations.
- Yahoo Finance / ETF data logic.
- Launcher behavior.


## Blue UI fix
- Removed remaining purple from ETF selected tabs/sub-tabs and legacy purple references.
- Forced all selected ETF navigation states to the suite blue `#4f8cff`.
- Forced the three launcher Open buttons to solid blue in normal and hover states.
- No API, calculation, route, or backend logic changed.

## Blue UI v3 — final color/server fix
- ETF active main tabs now use strong finance blue `#2563EB`.
- Saudi ETFs and Mutual Funds active sub-tabs also use `#2563EB`.
- Dashboard Open buttons are forced to `#2563EB` with white text.
- Launcher now detects and stops stale Node/Python suite processes on ports 5050, 5173, 3001, 5174 and 8000 before starting the new copy.
- Dashboard responses disable browser caching and open with a cache-busting URL.
