from __future__ import annotations
import json, sys, urllib.request

TESTS = [
    ("Dashboard", "http://127.0.0.1:5050", "Raed Finance Suite"),
    ("Investment Calculator", "http://127.0.0.1:5173", "<html"),
    ("Stock API", "http://127.0.0.1:3001/api/health", None),
    ("Stock Comparison", "http://127.0.0.1:5174", "<html"),
    ("ETF Analysis", "http://127.0.0.1:8000", "<html"),
]

ok = True
for name, url, marker in TESTS:
    try:
        with urllib.request.urlopen(url, timeout=8) as r:
            body = r.read().decode("utf-8", "ignore")
            passed = r.status < 400 and (marker is None or marker.lower() in body.lower())
            print(f"[{'PASS' if passed else 'FAIL'}] {name}: HTTP {r.status}")
            ok &= passed
    except Exception as e:
        ok = False
        print(f"[FAIL] {name}: {e}")

# Verify language defaults via served source / health response where possible.
try:
    with urllib.request.urlopen("http://127.0.0.1:5050", timeout=5) as r:
        dash = r.read().decode("utf-8", "ignore")
        lang_ok = 'lang="en"' in dash and "suite_lang')||'en'" in dash
        print(f"[{'PASS' if lang_ok else 'FAIL'}] Dashboard default language: English")
        ok &= lang_ok
except Exception as e:
    ok = False
    print(f"[FAIL] Dashboard language check: {e}")

print("\nRESULT:", "ALL CORE SERVICES PASSED" if ok else "ONE OR MORE TESTS FAILED")
sys.exit(0 if ok else 1)
