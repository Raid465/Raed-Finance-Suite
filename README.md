# Raed Finance Suite

A desktop-style finance workspace that combines ETF research, stock comparison, and long-term investment planning in one project.

The suite includes three independent tools connected through a single launcher and a consistent dark financial dashboard.

## Features

### ETF & Fund Analyzer
- Analyze US ETFs using market and fund data
- View holdings, sectors, asset allocation, dividends, risk metrics, and price history
- Compare two ETFs side by side
- Compare multiple funds
- Track market movers
- Browse Saudi ETFs and REITs
- Search and filter Saudi mutual funds
- Save ETFs and stocks to a persistent watchlist
- Portfolio and alert tools
- English interface with Arabic support
- Local caching to reduce repeated data requests

### Stock Comparison Tool
- Compare two stock symbols
- View market and fundamental data
- Compare historical price performance
- Interactive charts
- Local Express API for market-data requests
- English and Arabic interface

### Investment Calculator
- Calculate long-term investment growth
- Support initial capital and recurring monthly contributions
- Compound-return projections
- Interactive charts
- Export results to Excel
- English and Arabic interface

## Tech Stack

| Part | Technologies |
|---|---|
| Investment Calculator | React, TypeScript, Vite, Recharts |
| Stock Comparison | React, JavaScript, Express, Vite, Recharts |
| ETF Analyzer | Python, FastAPI, HTML, CSS, JavaScript, Chart.js |
| Data | Yahoo Finance and local Saudi fund datasets |
| Storage & Cache | JSON, SQLite, browser storage |
| Testing | Python regression/API tests and JavaScript calculation tests |
| Launcher | Python and Windows batch scripts |

## Quick Start

### Requirements

Install:

- Python 3
- Node.js
- npm

### Run the project

Clone the repository:

```bash
git clone https://github.com/Raid465/Raed-Finance-Suite.git
cd Raed-Finance-Suite
```

On Windows, run:

```text
Start Raed Finance.bat
```

The launcher starts the required services and opens the main dashboard automatically.

The first run may take longer because missing dependencies can be installed automatically.

## Run Tests

Start the Finance Suite first and keep it running.

Then run:

```text
Run Tests.bat
```

The test suite checks the main services, UI structure, ETF API routes, watchlist persistence, language behavior, investment calculations, and regression cases.

Some live market-data tests require an internet connection.

## Notes

- Market data may be delayed or temporarily unavailable depending on the external data source.
- The project is intended for research, education, and personal financial analysis.
- It is not financial advice and should not be used as a replacement for official market data or professional financial guidance.

## Author

**Raed Tuffaha**

Artificial Intelligence & Data Analytics

GitHub: [@Raid465](https://github.com/Raid465)

## Copyright

Copyright © 2026 Raed Tuffaha. All rights reserved.

No open-source license is granted for this repository. Third-party libraries and dependencies remain subject to their own licenses.
