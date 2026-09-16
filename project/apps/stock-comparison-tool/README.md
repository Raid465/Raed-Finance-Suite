# 📊 Stock Comparison Tool

An interactive tool for comparing US stocks side by side, displaying comprehensive financial data with charts and comparative analysis.

---

## 🖥️ Live Preview

> Open your browser at `http://localhost:5173` after starting the project

---

## ✨ Features

- ✅ Compare two stocks side by side directly
- ✅ Complete financial data (P/E, EPS, Profit Margin, ROE, Beta, etc.)
- ✅ 10-year stock price chart (Area Chart)
- ✅ 10-year performance comparison between two stocks (Line Chart)
- ✅ Volume chart
- ✅ Earnings & Revenue chart (Quarterly / Annual)
- ✅ Radar Chart for comprehensive comparison
- ✅ Bar Chart for direct comparison
- ✅ Detailed comparison table with winner highlighting
- ✅ Analyst target prices
- ✅ Indicator explanations on hover (?)
- ✅ Modern responsive design (Dark Mode)

---

## 🛠️ Tech Stack

| Technology | Usage |
|------------|-------|
| **React** | Frontend library |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling & design |
| **Recharts** | Charts library |
| **Express** | Backend server |
| **yahoo-finance2** | Yahoo Finance data fetching |

---

## 📁 Project Structure

```
stock-comparison-tool/
├── server.js                          # Backend server (Express)
├── index.html                         # Main HTML page
├── package.json                       # Dependencies & scripts
├── vite.config.js                     # Vite configuration
├── tailwind.config.js                 # Tailwind configuration
├── postcss.config.js                  # PostCSS configuration
├── .gitignore                         # Git ignored files
├── README.md                          # This file
└── src/
    ├── main.jsx                       # Entry point
    ├── App.jsx                        # Main app component
    ├── index.css                      # Tailwind styles
    └── components/
        └── StockComparisonTool.jsx    # Main component
```

---

## 🔧 How It Works

### Backend (`server.js`)

The server runs on **port 3001** and provides 3 endpoints:

#### 1. Stock Data
```
GET /api/stock/:ticker
```
- Fetches stock data from Yahoo Finance using `yahoo-finance2`
- Returns: Price, Market Cap, P/E, EPS, Profit Margin, ROE, Beta, etc.

#### 2. Historical Data
```
GET /api/history/:ticker
```
- Returns 10-year price data (monthly)
- Uses `chart()` from yahoo-finance2

#### 3. Earnings & Revenue
```
GET /api/earnings/:ticker
```
- Returns quarterly (5 quarters) and annual (5 years) data
- Uses `fundamentalsTimeSeries()` from yahoo-finance2
- Contains: Revenue, Earnings, EPS

### Frontend (`src/components/StockComparisonTool.jsx`)

A single React component containing all elements:

#### Sub-components:

| Component | Function |
|-----------|----------|
| `StockInput` | Stock ticker input field |
| `Card` | Stock data card |
| `PriceHistoryChart` | 10-year price chart |
| `DualPriceChart` | 10-year performance comparison |
| `VolumeChart` | Volume chart |
| `EarningsChart` | Earnings & Revenue chart |
| `ComparisonChart` | Direct comparison (Bar Chart) |
| `RadarCompare` | Comprehensive comparison (Radar Chart) |
| `Table` | Detailed comparison table |
| `Summary` | Analysis summary |
| `InfoTip` | Indicator explanations (Tooltip) |

#### Data Flow:

```
User clicks "Compare"
       ↓
fetch() to /api/stock/{ticker1} & /api/stock/{ticker2}
fetch() to /api/history/{ticker1} & /api/history/{ticker2}
fetch() to /api/earnings/{ticker1} & /api/earnings/{ticker2}
       ↓
Store data in useState
       ↓
Display: Cards → Charts → Table → Summary
```

---

## 🚀 Getting Started (Step-by-Step Guide)

### Prerequisites

Before you begin, make sure you have the following installed:

#### 1. Node.js
- Go to **https://nodejs.org**
- Click the green **LTS** button to download the latest version
- Run the installer and click **Next** until complete
- Node.js comes with **npm** pre-installed

#### 2. Git
- Go to **https://git-scm.com/downloads**
- Choose your operating system (Windows / Mac / Linux)
- Download and install

---

### Installation

#### Option 1: Download ZIP (Easiest)

1. Go to the project page on GitHub:
   ```
   https://github.com/Raid465/stock-comparison-tool
   ```

2. Click the green **<> Code** button

3. Click **Download ZIP**

4. Extract the ZIP file to your desired location

#### Option 2: Clone with Git

Open terminal (CMD or PowerShell) and run:
```bash
git clone https://github.com/Raid465/stock-comparison-tool.git
cd stock-comparison-tool
```

---

### Install Dependencies

1. Open the extracted/cloned folder

2. Right-click inside the folder

3. Select **Open in Terminal** or **Open PowerShell window here**

4. Run the following command:
   ```bash
   npm install
   ```

5. Wait for it to complete (may take 1-2 minutes)

---

### Run the Project

The project requires **two windows** open simultaneously:

#### Window 1: Backend Server

1. In the terminal where you ran `npm install`, type:
   ```bash
   npm run server
   ```

2. Press Enter

3. You should see:
   ```
   ✅ Server on http://localhost:3001
   ```

4. **Keep this window open!**

#### Window 2: Frontend Dev Server

1. Open a new terminal window:
   - Press **Ctrl + Shift + 5** in VS Code
   - Or open a new **CMD** / **PowerShell**

2. Navigate to the project folder:
   ```bash
   cd "C:\Users\YourUsername\Desktop\stock-comparison-tool"
   ```
   - Replace `YourUsername` with your actual username
   - Or simply: Open the folder in Explorer and right-click > Open in Terminal

3. Run:
   ```bash
   npm run dev
   ```

4. Press Enter

5. You should see:
   ```
   VITE v6.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

---

### Open the App

1. Open any browser (Chrome, Firefox, Edge)

2. Type in the address bar:
   ```
   http://localhost:5173
   ```

3. Press Enter

4. **Done!** The app is running 🎉

---

### How to Use the Tool

1. In the two input fields at the top, enter the stock tickers
   - Example: `AAPL` (Apple) and `MSFT` (Microsoft)
   - Stock tickers are in English, usually 3-5 characters

2. Click the **🔍 Compare** button

3. Wait a few seconds (may take 5-10 seconds)

4. You will see:
   - Stock data cards
   - Charts
   - Comparison table
   - Analytical summary

5. To compare different stocks, change the tickers and click **Compare** again

---

### Common Stock Tickers

| Ticker | Company |
|--------|---------|
| AAPL | Apple |
| MSFT | Microsoft |
| GOOGL | Google |
| AMZN | Amazon |
| TSLA | Tesla |
| META | Meta/Facebook |
| NVDA | Nvidia |
| NFLX | Netflix |

---

### ⚠️ Troubleshooting

#### Problem: "npm is not recognized"
- Node.js is not installed correctly
- Reinstall Node.js from https://nodejs.org

#### Problem: "Port 3001 is already in use"
- The server is already running
- Close all terminal windows and start fresh

#### Problem: Page won't open
- Make sure both windows (server & frontend) are running
- Verify the URL: `http://localhost:5173`

#### Problem: "Failed to fetch"
- The backend server is not running
- Open a new terminal and run `npm run server`

---

## 📸 App Preview

```
┌─────────────────────────────────────────────┐
│          Stock Comparison Tool               │
├─────────────────────────────────────────────┤
│  [AAPL]  VS  [MSFT]     [🔍 Compare]        │
├────────────────────┬────────────────────────┤
│   AAPL Card        │   MSFT Card            │
│   $314.86 ▲51.7%   │   $384.93 ▲XX%         │
├────────────────────┴────────────────────────┤
│   10-Year Price Chart (Side by Side)         │
├─────────────────────────────────────────────┤
│   10-Year Performance Comparison (Line)      │
├────────────────────┬────────────────────────┤
│   AAPL Earnings    │   MSFT Earnings        │
├────────────────────┴────────────────────────┤
│   Detailed Comparison Table                  │
├────────────────────┬────────────────────────┤
│   Direct Compare   │   Radar Chart           │
├────────────────────┴────────────────────────┤
│   📊 Summary                                 │
├─────────────────────────────────────────────┤
│   ⚠️ Approximate data — not financial advice  │
└─────────────────────────────────────────────┘
```

---

## 📊 Displayed Data

| Indicator | Description |
|-----------|-------------|
| Price | Current stock price |
| Market Cap | Total company value |
| P/E | Price-to-Earnings ratio |
| Forward P/E | Expected P/E ratio |
| EPS | Earnings Per Share |
| Profit Margin | Profit percentage from revenue |
| Revenue Growth | Sales change percentage |
| ROE | Return on Equity |
| Beta | Risk measure |
| PEG | P/E to Growth ratio |
| Debt/Equity | Debt ratio |
| Dividends | Cash payout percentage |
| Target Price | Analyst predictions |

---

## ⚠️ Disclaimer

- Data is from **Yahoo Finance** and is not real-time from an official exchange
- For **educational and research purposes** only — not financial advice
- Data may be delayed by 15-20 minutes

---

## 📄 License

You may not modify or freely share this project.

---

## 📧 Contact

If you have any questions or suggestions, open an Issue on GitHub.
