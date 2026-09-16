from __future__ import annotations
import json
import time
import urllib.error
import urllib.request

CORE = [
    ("Dashboard", "http://127.0.0.1:5050", "Raed Finance Suite"),
    ("Investment Calculator UI", "http://127.0.0.1:5173", "<html"),
    ("Stock API health", "http://127.0.0.1:3001/api/health", None),
    ("Stock Comparison UI", "http://127.0.0.1:5174", "<html"),
    ("ETF API health", "http://127.0.0.1:8000/api/health", '"status":"ok"'),
    ("ETF UI", "http://127.0.0.1:8000", "ETF Fund Analyzer"),
    ("ETF local mutual-fund data", "http://127.0.0.1:8000/api/mutual-funds?page=1&page_size=10", '"funds"'),
    ("ETF Saudi list", "http://127.0.0.1:8000/api/saudi/list", '"etfs"'),
    ("ETF watchlist storage", "http://127.0.0.1:8000/api/watchlist", '"symbols"'),
    ("ETF alerts storage", "http://127.0.0.1:8000/api/alerts", '"alerts"'),
]


def get(url: str, timeout=10):
    req = urllib.request.Request(url, headers={"User-Agent": "Raed-Finance-Suite-Test/1.0"})
    started = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        body = r.read().decode("utf-8", "ignore")
        elapsed = time.perf_counter() - started
        return r.status, body, elapsed


def main():
    ok = True
    print("=== CORE LOCAL SERVICES ===")
    for name, url, marker in CORE:
        try:
            status, body, elapsed = get(url)
            passed = status < 400 and (marker is None or marker.lower() in body.lower())
            print(f"[{'PASS' if passed else 'FAIL'}] {name}: HTTP {status}, {elapsed:.2f}s")
            ok &= passed
        except Exception as e:
            ok = False
            print(f"[FAIL] {name}: {e}")

    print("\n=== LANGUAGE DEFAULTS ===")
    try:
        _, dash, _ = get("http://127.0.0.1:5050")
        passed = '<html lang="en" dir="ltr">' in dash and "let l='en'" in dash
        print(f"[{'PASS' if passed else 'FAIL'}] Dashboard defaults to English")
        ok &= passed
    except Exception as e:
        ok = False; print(f"[FAIL] Dashboard language: {e}")
    try:
        _, etf, _ = get("http://127.0.0.1:8000")
        passed = '<html lang="en" dir="ltr">' in etf and "DEFAULT_LANGUAGE='en'" in etf and 'ETF Fund Analyzer' in etf
        print(f"[{'PASS' if passed else 'FAIL'}] ETF defaults to English")
        ok &= passed
    except Exception as e:
        ok = False; print(f"[FAIL] ETF language: {e}")

    print("\n=== LIVE MARKET DATA (EXTERNAL PROVIDERS) ===")
    live_ok = True
    live_tests = [
        ("ETF SPY analysis", "http://127.0.0.1:8000/api/etf/SPY", '"metrics"'),
        ("ETF SPY history", "http://127.0.0.1:8000/api/history/SPY?period=1mo", '"data"'),
        ("ETF SPY composition", "http://127.0.0.1:8000/api/composition/SPY", '"holdings"'),
        ("Stock AAPL data", "http://127.0.0.1:3001/api/stock/AAPL", '"ticker":"AAPL"'),
        ("Stock AAPL history", "http://127.0.0.1:3001/api/history/AAPL", '"history"'),
        ("Stock AAPL earnings", "http://127.0.0.1:3001/api/earnings/AAPL", '"quarterly"'),
    ]
    for name, url, marker in live_tests:
        try:
            status, body, elapsed = get(url, timeout=25)
            passed = status < 400 and (marker is None or marker.lower() in body.lower())
            print(f"[{'PASS' if passed else 'FAIL'}] {name}: HTTP {status}, {elapsed:.2f}s")
            live_ok &= passed
        except Exception as e:
            live_ok = False
            print(f"[WARN] {name}: external-data check unavailable -> {e}")

    print("\n=== ETF WARM-CACHE SPEED ===")
    try:
        # A second request should benefit from raw Yahoo/fund/cache reuse.
        _, _, warm = get("http://127.0.0.1:8000/api/etf/SPY", timeout=15)
        print(f"[INFO] Warm SPY analysis response: {warm:.2f}s")
        if warm <= 3.0:
            print("[PASS] Warm ETF response target (<= 3.0s)")
        else:
            print("[WARN] Warm ETF response is slower than target; provider/network may be the bottleneck")
    except Exception as e:
        print(f"[WARN] ETF speed benchmark unavailable: {e}")

    print("\nRESULT:")
    print("  CORE PROJECT:", "PASS" if ok else "FAIL")
    print("  LIVE MARKET DATA:", "PASS" if live_ok else "CHECK PROVIDER/INTERNET")
    raise SystemExit(0 if ok else 1)

if __name__ == "__main__":
    main()
