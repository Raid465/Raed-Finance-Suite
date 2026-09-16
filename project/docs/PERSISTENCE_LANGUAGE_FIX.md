# ETF Persistence + English Translation Fix

## Watchlist persistence
- Watchlist UI and workflow are unchanged.
- Saved symbols are now stored in a stable per-user data directory outside the extracted project folder.
- Windows path: `%LOCALAPPDATA%\RaedFinanceSuite\data\watchlist.json` (falls back to `%APPDATA%` if needed).
- Writes are atomic (`fsync` + `os.replace`) to reduce corruption risk if the process/device stops during a save.
- On first run, the backend attempts to migrate saved data from an older extracted `Raed-Finance-Suite*` folder.
- The browser also keeps a `localStorage` backup and restores it if server storage is unexpectedly empty.

## English translation
- English remains the default language.
- Initial ETF UI markup is English, including Tools, Watchlist, Portfolio Builder, Alerts, Saudi ETFs, and Mutual Funds controls.
- Market Movers dynamic headings are English (`Top Gainers`, `Top Losers`).
- Dynamic Tools content is English in English mode.
- The Arabic/English translation map was expanded to cover dynamically generated analysis, market, tools, Saudi ETF, and mutual-fund labels.
- Saudi ETF names use the English source name in English mode when one is available.
- Arabic mode remains available through the language button.

## Tests added/updated
- Static suite checks that initial English markup contains no Arabic UI text.
- Translation coverage test verifies every Arabic UI literal emitted by the production page has an English mapping.
- Persistent-storage backend test writes a watchlist item to disk and reloads it.
- Existing caching/concurrency, launcher, dark-theme, language-default, and service-shape regression checks remain.
