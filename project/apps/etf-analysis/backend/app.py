from fastapi import FastAPI, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from backend import etf_data
import yfinance as yf
import os
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
import asyncio

app = FastAPI(title="ETF Analyzer")
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "etf-analysis"}


@app.get("/api/storage-info")
async def storage_info():
    # Exposes only the storage mode, not private file contents. Useful for diagnostics.
    return {"persistent": True, "data_dir": str(USER_DATA_DIR)}


@app.middleware("http")
async def add_security_headers(request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self' https://query1.finance.yahoo.com"
    return response

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
INDEX_PATH = os.path.join(STATIC_DIR, "index.html")
with open(INDEX_PATH, "r", encoding="utf-8") as _index_file:
    INDEX_HTML = _index_file.read()
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Persistent user data must not live inside an extracted ZIP/project folder.
# Otherwise replacing the suite with a newer version can silently reset saved
# watchlists/alerts/portfolios.  Keep it in a stable per-user directory instead.
def _default_user_data_dir() -> Path:
    override = os.environ.get("RAED_FINANCE_DATA_DIR")
    if override:
        return Path(override).expanduser().resolve()
    if os.name == "nt":
        base = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
        if base:
            return Path(base) / "RaedFinanceSuite" / "data"
    return Path.home() / ".raed_finance_suite" / "data"


USER_DATA_DIR = _default_user_data_dir()
USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
BUNDLED_DATA_DIR = Path(__file__).resolve().parent
WATCHLIST_FILE = str(USER_DATA_DIR / "watchlist.json")
ALERTS_FILE = str(USER_DATA_DIR / "alerts.json")
PORTFOLIO_FILE = str(USER_DATA_DIR / "portfolio.json")


def _valid_json(path: Path, expected_key: str):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) and isinstance(data.get(expected_key), list) else None
    except Exception:
        return None


def _legacy_candidates(filename: str):
    """Find an older extracted suite copy only for one-time migration."""
    current = (BUNDLED_DATA_DIR / filename).resolve()
    seen = set()
    candidates = []

    # Sibling extracted suite folders are the common upgrade path.
    suite_root = BUNDLED_DATA_DIR.parents[2]  # .../Raed-Finance-Suite-*/
    parent = suite_root.parent
    for pattern_root in (parent, Path.home() / "Downloads"):
        if not pattern_root.exists():
            continue
        try:
            patterns = (
                f"Raed-Finance-Suite*/apps/etf-analysis/backend/{filename}",
                f"*/apps/etf-analysis/backend/{filename}",
                f"*/*/apps/etf-analysis/backend/{filename}",
            )
            for pattern in patterns:
                for path in pattern_root.glob(pattern):
                    try:
                        rp = path.resolve()
                        if rp == current or rp in seen:
                            continue
                        seen.add(rp)
                        candidates.append(rp)
                    except Exception:
                        pass
        except Exception:
            pass
    return candidates


def _migrate_user_file(filename: str, expected_key: str, default):
    dest = USER_DATA_DIR / filename
    if dest.exists():
        return

    # Prefer a user's older extracted copy over the bundled seed file.
    valid = []
    for candidate in _legacy_candidates(filename):
        data = _valid_json(candidate, expected_key)
        if data is not None:
            valid.append((candidate.stat().st_mtime, candidate, data))
    if valid:
        _, source, _ = max(valid, key=lambda item: item[0])
        try:
            shutil.copy2(source, dest)
            return
        except Exception:
            pass

    bundled = BUNDLED_DATA_DIR / filename
    data = _valid_json(bundled, expected_key) if bundled.exists() else None
    save_json_file(dest, data if data is not None else default)


def load_json_file(path, default=None):
    if default is None:
        default = {}
    path = Path(path)
    try:
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return default


def save_json_file(path, data):
    """Atomic UTF-8 JSON write so power/process interruption cannot truncate data."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            try:
                os.remove(temp_name)
            except OSError:
                pass


_migrate_user_file("watchlist.json", "symbols", {"symbols": []})
_migrate_user_file("alerts.json", "alerts", {"alerts": []})
_migrate_user_file("portfolio.json", "portfolios", {"portfolios": []})


@app.get("/")
async def index():
    return HTMLResponse(content=INDEX_HTML, headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    })


@app.get("/api/etf/{symbol}")
async def analyze_etf(symbol: str):
    """Return the fast/core ETF payload.

    Composition data (holdings, sectors and asset allocation) is deliberately
    loaded through /api/composition/{symbol}.  yfinance funds_data can be much
    slower than quote/profile data; keeping it out of this first response makes
    the UI show useful results immediately instead of blocking on every source.
    """
    symbol = symbol.strip().upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required.")
    try:
        info, metrics, prepost, desc = await asyncio.gather(
            run_in_threadpool(etf_data.get_etf_info, symbol),
            run_in_threadpool(etf_data.get_etf_metrics, symbol),
            run_in_threadpool(etf_data.get_pre_post_market, symbol),
            run_in_threadpool(etf_data.get_fund_description, symbol),
        )
        return {
            "info": info,
            "metrics": metrics,
            "prepost": prepost,
            "description": desc,
            # Stable response shape for older frontend code.
            "holdings": [],
            "sectors": {},
            "asset_allocation": {},
            "composition_deferred": True,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data for '{symbol}': {str(e)}")


@app.get("/api/composition/{symbol}")
async def get_composition(symbol: str):
    """Load the slower fund-composition payload independently."""
    symbol = symbol.strip().upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required.")
    try:
        holdings, sectors, assets = await asyncio.gather(
            run_in_threadpool(etf_data.get_top_holdings, symbol),
            run_in_threadpool(etf_data.get_sector_allocation, symbol),
            run_in_threadpool(etf_data.get_asset_allocation, symbol),
        )
        return {
            "symbol": symbol,
            "holdings": holdings,
            "sectors": sectors,
            "asset_allocation": assets,
        }
    except Exception as e:
        # Composition is supplementary. Return a clean error rather than making
        # the whole ETF analysis unusable.
        raise HTTPException(status_code=500, detail=f"Failed to fetch composition for '{symbol}': {str(e)}")


@app.get("/api/quote/{symbol}")
async def get_quote(symbol: str):
    """Lightweight endpoint for watchlists/portfolio rows."""
    symbol = symbol.strip().upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required.")
    try:
        info, metrics = await asyncio.gather(
            run_in_threadpool(etf_data.get_etf_info, symbol),
            run_in_threadpool(etf_data.get_etf_metrics, symbol),
        )
        return {"info": info, "metrics": metrics}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch quote for '{symbol}': {str(e)}")


@app.get("/api/history/{symbol}")
async def get_price_history(symbol: str, period: str = Query("1y", pattern="^(1mo|3mo|6mo|1y|2y|5y)$")):
    symbol = symbol.strip().upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required.")
    try:
        data = await run_in_threadpool(etf_data.get_price_history, symbol, period)
        return {"symbol": symbol, "period": period, "data": data}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history for '{symbol}': {str(e)}")


@app.get("/api/risk/{symbol}")
async def get_risk(symbol: str, period: str = Query("3y", pattern="^(1y|2y|3y|5y|10y)$")):
    symbol = symbol.strip().upper()
    try:
        return await run_in_threadpool(etf_data.get_risk_metrics, symbol, period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dividends/{symbol}")
async def get_dividends(symbol: str):
    symbol = symbol.strip().upper()
    try:
        return {"symbol": symbol, "dividends": await run_in_threadpool(etf_data.get_dividend_history, symbol)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/technical/{symbol}")
async def get_technical(symbol: str, period: str = Query("1y", pattern="^(6mo|1y|2y|5y)$")):
    symbol = symbol.strip().upper()
    try:
        return await run_in_threadpool(etf_data.get_technical_indicators, symbol, period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/news/{symbol}")
async def get_news(symbol: str):
    symbol = symbol.strip().upper()
    try:
        return {"symbol": symbol, "news": await run_in_threadpool(etf_data.get_news, symbol)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/movers")
async def get_movers(limit: int = Query(10, ge=3, le=20)):
    try:
        return await run_in_threadpool(etf_data.get_top_movers, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CompareRequest(BaseModel):
    symbol_a: str
    symbol_b: str


@app.post("/api/compare")
async def compare_etfs(req: CompareRequest):
    sym_a = req.symbol_a.strip().upper()
    sym_b = req.symbol_b.strip().upper()

    if not sym_a or not sym_b:
        raise HTTPException(status_code=400, detail="Both symbols are required.")
    if sym_a == sym_b:
        raise HTTPException(status_code=400, detail="Please provide two different ETF symbols.")

    try:
        info_a, info_b, metrics_a, metrics_b, holdings_a, holdings_b, risk_a, risk_b = await asyncio.gather(
            run_in_threadpool(etf_data.get_etf_info, sym_a),
            run_in_threadpool(etf_data.get_etf_info, sym_b),
            run_in_threadpool(etf_data.get_etf_metrics, sym_a),
            run_in_threadpool(etf_data.get_etf_metrics, sym_b),
            run_in_threadpool(etf_data.get_top_holdings, sym_a),
            run_in_threadpool(etf_data.get_top_holdings, sym_b),
            run_in_threadpool(etf_data.get_risk_metrics, sym_a),
            run_in_threadpool(etf_data.get_risk_metrics, sym_b),
        )
        overlap = etf_data.calculate_overlap(holdings_a, holdings_b)

        return {
            "etf_a": {"info": info_a, "metrics": metrics_a, "holdings": holdings_a, "risk": risk_a},
            "etf_b": {"info": info_b, "metrics": metrics_b, "holdings": holdings_b, "risk": risk_b},
            "overlap": overlap,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


class MultiCompareRequest(BaseModel):
    symbols: List[str]


@app.post("/api/multi-compare")
async def multi_compare(req: MultiCompareRequest):
    symbols = [s.strip().upper() for s in req.symbols if s.strip()]
    if len(symbols) < 2:
        raise HTTPException(status_code=400, detail="At least 2 symbols required.")
    if len(symbols) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 symbols allowed.")

    try:
        perf_task = run_in_threadpool(etf_data.get_performance_comparison, symbols)
        corr_task = run_in_threadpool(etf_data.get_correlation, symbols)
        metric_tasks = [run_in_threadpool(etf_data.get_etf_metrics, sym) for sym in symbols]
        results = await asyncio.gather(perf_task, corr_task, *metric_tasks, return_exceptions=True)
        perf = {} if isinstance(results[0], Exception) else results[0]
        corr = {} if isinstance(results[1], Exception) else results[1]
        metrics = {}
        for sym, value in zip(symbols, results[2:]):
            metrics[sym] = {} if isinstance(value, Exception) else value
        return {"performance": perf, "correlation": corr, "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CorrelationRequest(BaseModel):
    symbols: List[str]


@app.post("/api/correlation")
async def get_correlation(req: CorrelationRequest):
    symbols = [s.strip().upper() for s in req.symbols if s.strip()]
    if len(symbols) < 2:
        raise HTTPException(status_code=400, detail="At least 2 symbols required.")
    try:
        return await run_in_threadpool(etf_data.get_correlation, symbols)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Watchlist endpoints
@app.get("/api/watchlist")
async def get_watchlist():
    return load_json_file(WATCHLIST_FILE, {"symbols": []})


@app.post("/api/watchlist/add")
async def add_to_watchlist(req: CompareRequest):
    data = load_json_file(WATCHLIST_FILE, {"symbols": []})
    sym = req.symbol_a.strip().upper()
    if sym and sym not in data["symbols"]:
        data["symbols"].append(sym)
        save_json_file(WATCHLIST_FILE, data)
    return data


@app.post("/api/watchlist/remove")
async def remove_from_watchlist(req: CompareRequest):
    data = load_json_file(WATCHLIST_FILE, {"symbols": []})
    sym = req.symbol_a.strip().upper()
    if sym in data["symbols"]:
        data["symbols"].remove(sym)
        save_json_file(WATCHLIST_FILE, data)
    return data


# Alerts endpoints
class AlertRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    target_price: float = Field(gt=0)
    direction: Literal["above", "below"]


@app.get("/api/alerts")
async def get_alerts():
    return load_json_file(ALERTS_FILE, {"alerts": []})


@app.post("/api/alerts/add")
async def add_alert(req: AlertRequest):
    data = load_json_file(ALERTS_FILE, {"alerts": []})
    sym = req.symbol.strip().upper()
    alert = {
        "symbol": sym,
        "target_price": req.target_price,
        "direction": req.direction,
        "created": datetime.now().isoformat(),
    }
    data["alerts"].append(alert)
    save_json_file(ALERTS_FILE, data)
    return data


@app.post("/api/alerts/remove")
async def remove_alert(req: AlertRequest):
    data = load_json_file(ALERTS_FILE, {"alerts": []})
    sym = req.symbol.strip().upper()
    data["alerts"] = [
        a for a in data["alerts"]
        if not (a["symbol"] == sym and a["target_price"] == req.target_price)
    ]
    save_json_file(ALERTS_FILE, data)
    return data


@app.get("/api/alerts/check")
async def check_alerts():
    data = load_json_file(ALERTS_FILE, {"alerts": []})
    triggered = []
    remaining = []

    for alert in data["alerts"]:
        try:
            ticker = yf.Ticker(alert["symbol"])
            price = ticker.info.get("regularMarketPrice", 0)
            if alert["direction"] == "above" and price >= alert["target_price"]:
                triggered.append({**alert, "current_price": price})
            elif alert["direction"] == "below" and price <= alert["target_price"]:
                triggered.append({**alert, "current_price": price})
            else:
                remaining.append(alert)
        except Exception:
            remaining.append(alert)

    data["alerts"] = remaining
    save_json_file(ALERTS_FILE, data)
    return {"triggered": triggered, "remaining": remaining}


# Portfolio endpoints
class PortfolioHolding(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    shares: float = Field(gt=0)
    avgPrice: Optional[float] = Field(default=0, ge=0)


class PortfolioRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    holdings: List[PortfolioHolding] = Field(min_length=1, max_length=100)


@app.get("/api/portfolio")
async def get_portfolio():
    return load_json_file(PORTFOLIO_FILE, {"portfolios": []})


@app.post("/api/portfolio/save")
async def save_portfolio(req: PortfolioRequest):
    data = load_json_file(PORTFOLIO_FILE, {"portfolios": []})
    holdings_data = []
    total_value = 0
    total_cost = 0

    for h in req.holdings:
        try:
            ticker = yf.Ticker(h.symbol)
            price = ticker.info.get("regularMarketPrice", 0)
            value = price * h.shares
            cost = (h.avgPrice or 0) * h.shares
            total_value += value
            total_cost += cost
            holdings_data.append({
                "symbol": h.symbol.upper(),
                "shares": h.shares,
                "avgPrice": h.avgPrice or 0,
                "price": round(price, 2),
                "value": round(value, 2),
                "cost": round(cost, 2),
                "pl": round(value - cost, 2),
            })
        except Exception:
            continue

    for hd in holdings_data:
        hd["weight"] = round(hd["value"] / total_value * 100, 2) if total_value > 0 else 0

    portfolio = {
        "name": req.name,
        "holdings": holdings_data,
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pl": round(total_value - total_cost, 2),
        "created": datetime.now().isoformat(),
    }

    data["portfolios"].append(portfolio)
    save_json_file(PORTFOLIO_FILE, data)
    return portfolio


# PDF Export data endpoint
@app.get("/api/report/{symbol}")
async def get_report_data(symbol: str):
    symbol = symbol.strip().upper()
    try:
        info, metrics, holdings, sectors, assets, risk, dividends, desc = await asyncio.gather(
            run_in_threadpool(etf_data.get_etf_info, symbol),
            run_in_threadpool(etf_data.get_etf_metrics, symbol),
            run_in_threadpool(etf_data.get_top_holdings, symbol),
            run_in_threadpool(etf_data.get_sector_allocation, symbol),
            run_in_threadpool(etf_data.get_asset_allocation, symbol),
            run_in_threadpool(etf_data.get_risk_metrics, symbol),
            run_in_threadpool(etf_data.get_dividend_history, symbol),
            run_in_threadpool(etf_data.get_fund_description, symbol),
        )
        dividends = dividends[:12]

        return {
            "info": info,
            "metrics": metrics,
            "holdings": holdings,
            "sectors": sectors,
            "asset_allocation": assets,
            "risk": risk,
            "dividends": dividends,
            "description": desc,
            "generated_at": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === Saudi ETF Endpoints ===
from backend import saudi_etf


@app.get("/api/saudi/list")
async def get_saudi_etf_list():
    return {"etfs": saudi_etf.get_saudi_etf_list()}


@app.get("/api/saudi/{symbol}")
async def analyze_saudi_etf(symbol: str):
    symbol = symbol.strip().upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required.")
    try:
        info = saudi_etf.get_saudi_etf_info(symbol)
        holdings = saudi_etf.get_saudi_etf_holdings(symbol)
        risk = saudi_etf.get_saudi_etf_risk(symbol)
        return {
            "info": info,
            "holdings": holdings,
            "risk": risk,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/saudi/history/{symbol}")
async def get_saudi_etf_history(symbol: str, period: str = Query("1y", pattern="^(1mo|3mo|6mo|1y|2y|5y)$")):
    symbol = symbol.strip().upper()
    try:
        data = saudi_etf.get_saudi_etf_history(symbol, period)
        return {"symbol": symbol, "period": period, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/saudi/holdings/{symbol}")
async def get_saudi_etf_holdings(symbol: str):
    """Get holdings for a Saudi ETF or REIT."""
    symbol = symbol.strip().upper()
    try:
        holdings = saudi_etf.get_saudi_etf_holdings(symbol)
        return {"symbol": symbol, "holdings": holdings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SaudiCompareRequest(BaseModel):
    symbol_a: str
    symbol_b: str


@app.post("/api/saudi/compare")
async def compare_saudi_etfs(req: SaudiCompareRequest):
    sym_a = req.symbol_a.strip().upper()
    sym_b = req.symbol_b.strip().upper()
    if not sym_a or not sym_b:
        raise HTTPException(status_code=400, detail="Both symbols are required.")
    if sym_a == sym_b:
        raise HTTPException(status_code=400, detail="Please provide two different symbols.")
    try:
        return saudi_etf.compare_saudi_etfs(sym_a, sym_b)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Mutual Funds (صناديق الاستثمار العامة)
MUTUAL_FUNDS_FILE = os.path.join(os.path.dirname(__file__), "mutual_funds.json")

_MUTUAL_FUNDS_CACHE = None

def load_mutual_funds():
    """Load mutual funds from JSON file (cached in memory)."""
    global _MUTUAL_FUNDS_CACHE
    if _MUTUAL_FUNDS_CACHE is None:
        if os.path.exists(MUTUAL_FUNDS_FILE):
            with open(MUTUAL_FUNDS_FILE, "r", encoding="utf-8") as f:
                _MUTUAL_FUNDS_CACHE = json.load(f)
        else:
            _MUTUAL_FUNDS_CACHE = []
    return _MUTUAL_FUNDS_CACHE


@app.get("/api/mutual-funds")
async def get_mutual_funds(
    search: Optional[str] = Query(None, description="Search by name"),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    objective: Optional[str] = Query(None, description="Filter by objective"),
    sharia: Optional[str] = Query(None, description="Filter by Sharia compliance"),
    manager: Optional[str] = Query(None, description="Filter by fund manager"),
    sort_by: Literal["nav", "ytd", "name"] = Query("nav", description="Sort by: nav, ytd, name"),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=200)
):
    """Get list of all mutual funds with filtering and pagination."""
    # Work on a per-request copy. Sorting the cached master list in place can
    # make concurrent requests with different sort orders interfere.
    funds = list(load_mutual_funds())

    # Apply filters
    if search:
        search_lower = search.lower()
        funds = [f for f in funds if search_lower in f.get("name", "").lower()
                 or search_lower in f.get("symbol", "").lower()]

    if currency:
        funds = [f for f in funds if f.get("currency") == currency]

    if objective:
        funds = [f for f in funds if f.get("objective") == objective]

    if sharia:
        funds = [f for f in funds if f.get("shariaCompliant") == sharia]

    if manager:
        funds = [f for f in funds if f.get("fundManager") == manager]

    # Sort
    def sort_key(fund):
        if sort_by == "nav":
            try:
                return float(fund.get("nav", "0").replace(",", ""))
            except:
                return 0
        elif sort_by == "ytd":
            try:
                return float(fund.get("ytdChange", "0"))
            except:
                return 0
        elif sort_by == "name":
            return fund.get("name", "")
        return 0

    funds.sort(key=sort_key, reverse=(sort_order == "desc"))

    # Pagination
    total = len(funds)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_funds = funds[start:end]

    # Get unique values for filters
    currencies = list(set(f.get("currency", "") for f in funds))
    objectives = list(set(f.get("objective", "") for f in funds))
    sharia_options = list(set(f.get("shariaCompliant", "") for f in funds))
    managers = list(set(f.get("fundManager", "") for f in funds))

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "funds": paginated_funds,
        "filters": {
            "currencies": sorted(currencies),
            "objectives": sorted(objectives),
            "sharia_options": sorted(sharia_options),
            "managers": sorted(managers)
        }
    }


@app.get("/api/mutual-funds/stats")
async def get_mutual_funds_stats():
    """Get statistics about mutual funds."""
    funds = load_mutual_funds()

    total_funds = len(funds)
    total_nav = 0
    for f in funds:
        try:
            nav_str = f.get("nav", "0").replace(",", "")
            total_nav += float(nav_str)
        except:
            pass

    # Count by currency
    currencies = {}
    for f in funds:
        cur = f.get("currency", "غير محدد")
        currencies[cur] = currencies.get(cur, 0) + 1

    # Count by objective
    objectives = {}
    for f in funds:
        obj = f.get("objective", "غير محدد")
        objectives[obj] = objectives.get(obj, 0) + 1

    # Top funds by NAV
    sorted_funds = sorted(funds, key=lambda x: float(x.get("nav", "0").replace(",", "")), reverse=True)
    top_funds = sorted_funds[:10]

    return {
        "total_funds": total_funds,
        "total_nav": total_nav,
        "currencies": currencies,
        "objectives": objectives,
        "top_funds": top_funds
    }


@app.get("/api/mutual-funds/{symbol}")
async def get_mutual_fund_detail(symbol: str):
    """Get details of a specific mutual fund."""
    funds = load_mutual_funds()
    fund = next((f for f in funds if f.get("symbol") == symbol), None)
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    return fund


FUND_HOLDINGS_FILE = os.path.join(os.path.dirname(__file__), "fund_holdings.json")

_FUND_HOLDINGS_CACHE = None

def load_fund_holdings():
    global _FUND_HOLDINGS_CACHE
    if _FUND_HOLDINGS_CACHE is None:
        if os.path.exists(FUND_HOLDINGS_FILE):
            with open(FUND_HOLDINGS_FILE, "r", encoding="utf-8") as f:
                _FUND_HOLDINGS_CACHE = json.load(f)
        else:
            _FUND_HOLDINGS_CACHE = {}
    return _FUND_HOLDINGS_CACHE


@app.get("/api/mutual-funds/{symbol}/holdings")
async def get_mutual_fund_holdings(symbol: str):
    """Get holdings for a specific mutual fund."""
    all_holdings = load_fund_holdings()
    holdings = all_holdings.get(symbol, [])
    return {"symbol": symbol, "holdings": holdings}


FUND_DIVIDENDS_FILE = os.path.join(os.path.dirname(__file__), "fund_dividends.json")

_FUND_DIVIDENDS_CACHE = None

def load_fund_dividends():
    global _FUND_DIVIDENDS_CACHE
    if _FUND_DIVIDENDS_CACHE is None:
        if os.path.exists(FUND_DIVIDENDS_FILE):
            with open(FUND_DIVIDENDS_FILE, "r", encoding="utf-8") as f:
                _FUND_DIVIDENDS_CACHE = json.load(f)
        else:
            _FUND_DIVIDENDS_CACHE = {}
    return _FUND_DIVIDENDS_CACHE


@app.get("/api/saudi/dividends/{symbol}")
async def get_saudi_dividends(symbol: str):
    """Get dividend distributions for a Saudi ETF, REIT, or mutual fund."""
    all_divs = load_fund_dividends()
    div_data = all_divs.get(symbol, None)
    if div_data is None:
        return {"symbol": symbol, "annualYield": 0, "dividendsPerYear": 0, "distributions": []}
    return {"symbol": symbol, **div_data}
