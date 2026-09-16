"""Offline ETF backend tests.

These tests do not call Yahoo Finance. They inject a small yfinance stub so the
caching and parallel execution paths can be verified even without internet.
"""
from __future__ import annotations
import asyncio
import sys
import time
import types
import os
import tempfile
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
ETF_ROOT = ROOT / "apps" / "etf-analysis"
sys.path.insert(0, str(ETF_ROOT))

# Isolate persistent-data tests from the real user profile.
_TEST_DATA_TMP = tempfile.TemporaryDirectory(prefix="raed-finance-test-")
os.environ["RAED_FINANCE_DATA_DIR"] = _TEST_DATA_TMP.name

COUNTS = {"info": 0, "funds": 0}

class FakeFunds:
    sector_weightings = {"technology": 0.55, "financial_services": 0.20}
    asset_classes = {"stockPosition": 0.95, "cashPosition": 0.05}
    top_holdings = pd.DataFrame(
        {"Name": ["Example Corp", "Second Inc"], "Holding Percent": [0.12, 0.08]},
        index=["EXM", "SEC"],
    )

class FakeTicker:
    def __init__(self, symbol):
        self.symbol = symbol

    @property
    def info(self):
        COUNTS["info"] += 1
        time.sleep(0.04)
        return {
            "quoteType": "ETF",
            "longName": f"{self.symbol} Test ETF",
            "regularMarketPrice": 101.5,
            "previousClose": 100.0,
            "regularMarketChange": 1.5,
            "regularMarketChangePercent": 1.5,
            "regularMarketVolume": 1_000_000,
            "averageVolume": 900_000,
            "totalAssets": 2_000_000_000,
            "annualReportExpenseRatio": 0.03,
            "netExpenseRatio": 0.03,
            "yield": 0.012,
            "fundFamily": "Test Provider",
            "category": "Large Blend",
            "fundInceptionDate": 1_500_000_000,
            "longBusinessSummary": "Offline test fund.",
            "fullExchangeName": "TEST",
            "currency": "USD",
            "marketState": "REGULAR",
            "ytdReturn": 0.1234,
        }

    @property
    def funds_data(self):
        COUNTS["funds"] += 1
        time.sleep(0.04)
        return FakeFunds()

    def history(self, period="1y"):
        idx = pd.date_range("2025-01-01", periods=80, freq="B")
        close = pd.Series([100 + i * 0.1 for i in range(len(idx))], index=idx)
        return pd.DataFrame({
            "Open": close - 0.2,
            "High": close + 0.5,
            "Low": close - 0.5,
            "Close": close,
            "Volume": [100000] * len(idx),
        }, index=idx)

    @property
    def dividends(self):
        idx = pd.to_datetime(["2025-03-01", "2025-06-01"])
        return pd.Series([0.25, 0.30], index=idx)

    @property
    def news(self):
        return []

fake_yf = types.ModuleType("yfinance")
fake_yf.Ticker = FakeTicker
fake_yf.download = lambda *a, **k: pd.DataFrame()
sys.modules["yfinance"] = fake_yf

from backend import cache, etf_data  # noqa: E402
from backend import app as app_module  # noqa: E402


def check(name, condition, detail=""):
    print(f"[{'PASS' if condition else 'FAIL'}] {name}" + (f": {detail}" if detail else ""))
    if not condition:
        raise AssertionError(name)


def test_raw_info_shared():
    symbol = "TSTINFO"
    for prefix in ("rawinfo", "info", "metrics", "prepost", "desc"):
        cache.delete(f"{prefix}:{symbol}")
    COUNTS["info"] = 0
    etf_data.get_etf_info(symbol)
    etf_data.get_etf_metrics(symbol)
    etf_data.get_pre_post_market(symbol)
    etf_data.get_fund_description(symbol)
    check("Yahoo full-info request is shared across ETF sections", COUNTS["info"] == 1, f"calls={COUNTS['info']}")
    metrics = etf_data.get_etf_metrics(symbol)
    check("ETF YTD return is converted from fraction to percent", metrics.get("ytd_return") == 12.34, str(metrics.get("ytd_return")))


def test_funds_data_shared():
    symbol = "TSTFUNDS"
    for prefix in ("holdings", "sectors", "assets"):
        cache.delete(f"{prefix}:{symbol}")
    COUNTS["funds"] = 0
    etf_data._FUNDS_OBJECTS.pop(symbol, None)
    old_fetch = etf_data._fetch_holdings_from_stockanalysis
    secondary_calls = {'count': 0}
    def secondary(_s):
        secondary_calls['count'] += 1
        return []
    etf_data._fetch_holdings_from_stockanalysis = secondary
    try:
        holdings = etf_data.get_top_holdings(symbol)
        sectors = etf_data.get_sector_allocation(symbol)
        assets = etf_data.get_asset_allocation(symbol)
    finally:
        etf_data._fetch_holdings_from_stockanalysis = old_fetch
    check("ETF fund metadata request is shared", COUNTS["funds"] == 1, f"calls={COUNTS['funds']}")
    check("Secondary holdings website is skipped on Yahoo fast path", secondary_calls['count'] == 0, f"calls={secondary_calls['count']}")
    check("Holdings fallback returns data", len(holdings) == 2)
    check("Sector data returns data", bool(sectors))
    check("Asset allocation returns data", bool(assets))


async def _parallel_endpoint_test():
    names = [
        "get_etf_info", "get_top_holdings", "get_sector_allocation",
        "get_asset_allocation", "get_etf_metrics", "get_pre_post_market",
        "get_fund_description",
    ]
    originals = {n: getattr(etf_data, n) for n in names}
    def slow(name):
        def fn(symbol):
            time.sleep(0.12)
            if name == "get_etf_info": return {"symbol": symbol, "name": "Test"}
            if name == "get_etf_metrics": return {"current_price": 1}
            return [] if name == "get_top_holdings" else {}
        return fn
    for n in names:
        setattr(etf_data, n, slow(n))
    try:
        started = time.perf_counter()
        result = await app_module.analyze_etf("TEST")
        elapsed = time.perf_counter() - started
    finally:
        for n, fn in originals.items():
            setattr(etf_data, n, fn)
    check("Main ETF endpoint runs independent providers concurrently", elapsed < 0.45, f"elapsed={elapsed:.3f}s")
    check("Main ETF endpoint preserves response shape", "info" in result and "metrics" in result and "holdings" in result)



def test_http_routes():
    from fastapi.testclient import TestClient
    client = TestClient(app_module.app)
    r = client.get('/api/health')
    check('ETF health route responds', r.status_code == 200 and r.json().get('status') == 'ok')
    r = client.get('/api/quote/TSTHTTP')
    check('ETF lightweight quote route responds', r.status_code == 200 and 'metrics' in r.json())
    r = client.get('/api/etf/TSTHTTP')
    body = r.json() if r.status_code == 200 else {}
    check('ETF full analysis HTTP route responds', r.status_code == 200 and 'holdings' in body and 'asset_allocation' in body)
    r = client.get('/api/history/TSTHTTP?period=1mo')
    check('ETF history HTTP route responds', r.status_code == 200 and len(r.json().get('data', [])) > 0)
    r = client.get('/api/storage-info')
    check('ETF reports persistent storage enabled', r.status_code == 200 and r.json().get('persistent') is True)

    # Watchlist must be written to stable JSON, not kept in process memory.
    symbol = 'PERSISTTEST'
    r = client.post('/api/watchlist/add', json={'symbol_a': symbol, 'symbol_b': ''})
    check('Watchlist add route persists symbol', r.status_code == 200 and symbol in r.json().get('symbols', []))
    watch_path = Path(app_module.WATCHLIST_FILE)
    disk = json.loads(watch_path.read_text(encoding='utf-8'))
    check('Watchlist exists on disk after save', symbol in disk.get('symbols', []), str(watch_path))
    # GET re-reads the JSON file every call, matching a process restart persistence model.
    r = client.get('/api/watchlist')
    check('Watchlist reload returns saved symbol', symbol in r.json().get('symbols', []))
    client.post('/api/watchlist/remove', json={'symbol_a': symbol, 'symbol_b': ''})


def main():
    test_raw_info_shared()
    test_funds_data_shared()
    asyncio.run(_parallel_endpoint_test())
    test_http_routes()
    print("\nETF BACKEND RESULT: ALL OFFLINE TESTS PASSED")

if __name__ == "__main__":
    main()
