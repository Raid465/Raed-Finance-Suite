# Mutual Funds language fix

When ETF Analysis is in English, the mutual-fund objective filter now displays:

- Income
- Capital Preservation
- Capital Growth
- Growth & Income

The underlying filter values remain the original Arabic values so the existing backend filtering contract is unchanged.

Saudi mutual-fund names remain in Arabic exactly as stored in the dataset.

Switching the site to Arabic restores the Arabic objective labels.

## Tests
- Python backend compile: PASS
- Inline JavaScript syntax: PASS
- Static UI/language regression suite: PASS
- Objective mapping coverage: PASS (all 4 dataset objective values covered)
- Arabic fund-name preservation: PASS
- Offline ETF backend/caching/watchlist/API tests: PASS
