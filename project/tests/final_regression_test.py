"""Final offline regression audit for Raed Finance Suite.

No external market-data/network calls are made here. The ETF API validation uses
our fake-yfinance harness from etf_backend_unit_test.py.
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
results=[]
def check(name, cond, detail=''):
    results.append(bool(cond))
    print(f"[{'PASS' if cond else 'FAIL'}] {name}" + (f": {detail}" if detail else ''))

# Package-lock/package.json consistency
for app_name in ('investment-calculator','stock-comparison-tool'):
    base=ROOT/'apps'/app_name
    pkg=json.loads((base/'package.json').read_text(encoding='utf-8'))
    lock=json.loads((base/'package-lock.json').read_text(encoding='utf-8'))
    lock_root=lock.get('packages',{}).get('',{})
    ok=True
    for section in ('dependencies','devDependencies'):
        for k,v in pkg.get(section,{}).items():
            ok &= lock_root.get(section,{}).get(k)==v
    check(f'{app_name}: package-lock matches package.json', ok)

# No accidental CJK/corrupt characters in executable/source/data text.
text_ext={'.py','.js','.jsx','.ts','.tsx','.html','.css','.json'}
cjk=[]
for p in ROOT.rglob('*'):
    if not p.is_file() or p.suffix.lower() not in text_ext or 'node_modules' in p.parts:
        continue
    try: text=p.read_text(encoding='utf-8')
    except Exception: continue
    for i,line in enumerate(text.splitlines(),1):
        if any('\u4e00' <= c <= '\u9fff' for c in line):
            cjk.append(f'{p.relative_to(ROOT)}:{i}')
check('No accidental CJK/corrupt characters remain', not cjk, ', '.join(cjk[:5]))

# Dashboard blue/English
D=(ROOT/'launcher/dashboard.html').read_text(encoding='utf-8')
check('Dashboard is English by default', '<html lang="en" dir="ltr">' in D and "let l='en'" in D)
check('Dashboard Open buttons are forced blue', 'background:#2563eb!important' in D.replace(' ',''))

# ETF UI/localization/data preservation
E=(ROOT/'apps/etf-analysis/frontend/index.html').read_text(encoding='utf-8')
for pair in [
    "['الدخل','Income']",
    "['المحافظة على رأس المال','Capital Preservation']",
    "['تنمية رأس المال','Capital Growth']",
    "['نمو و الدخل','Growth & Income']",
]:
    check(f'ETF translation exists: {pair}', pair in E)
check('Mutual fund names are excluded from generic translation', 'data-no-translate>${f.name}</' in E)
check('Fund managers are excluded from generic translation', 'data-no-translate>${f.fundManager}</' in E)
check('Translation walker skips protected proper names', '[data-no-translate]' in E and "closest('.lang-toggle,script,style,[data-no-translate]')" in E)
fn_names=re.findall(r'\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(', E)
dups=sorted({n for n in fn_names if fn_names.count(n)>1})
check('ETF frontend has no duplicate function declarations', not dups, str(dups))
check('All watchlist writes use the validated add endpoint', "fetch('/api/watchlist',{method:'POST'" not in E and "/api/watchlist/add" in E)
check('ETF defaults to English', '<html lang="en" dir="ltr">' in E and "DEFAULT_LANGUAGE='en'" in E)

# ETF backend correctness fixes
A=(ROOT/'apps/etf-analysis/backend/app.py').read_text(encoding='utf-8')
ED=(ROOT/'apps/etf-analysis/backend/etf_data.py').read_text(encoding='utf-8')
check('Mutual-fund requests do not mutate shared cached list', 'funds = list(load_mutual_funds())' in A)
check('ETF YTD decimal return is converted to percent', 'round(ytd_return * 100, 2)' in ED)
check('Alert direction is validated', 'Literal["above", "below"]' in A)
check('Portfolio shares must be positive', 'shares: float = Field(gt=0)' in A)
check('Watchlist user data is persistent outside extracted project', 'RaedFinanceSuite' in A and 'USER_DATA_DIR' in A)

# Investment English coverage: every Arabic source literal must be covered by UI mapping.
IAPP=(ROOT/'apps/investment-calculator/src/App.tsx').read_text(encoding='utf-8')
IL=(ROOT/'apps/investment-calculator/src/uiLanguage.ts').read_text(encoding='utf-8')
pairs=re.findall(r"\['((?:\\'|[^'])*)','((?:\\'|[^'])*)'\]",IL)
keys=sorted([a.replace("\\'", "'") for a,_ in pairs], key=len, reverse=True)
residual=[]
for ln,line in enumerate(IAPP.splitlines(),1):
    if not re.search(r'[\u0600-\u06ff]', line): continue
    remaining=line
    for key in keys: remaining=remaining.replace(key,'')
    if re.search(r'[\u0600-\u06ff]', remaining): residual.append(ln)
check('Investment English translation covers all Arabic UI source text', not residual, f'lines={residual[:10]}')
check('Investment JOD defaults to English formatting', "JOD: { symbol: 'JOD', locale: 'en-JO', code: 'JOD' }" in IAPP)

# Stock reliability/local host/default English
SC=(ROOT/'apps/stock-comparison-tool/src/components/StockComparisonTool.jsx').read_text(encoding='utf-8')
SS=(ROOT/'apps/stock-comparison-tool/server.js').read_text(encoding='utf-8')
check('Stock UI defaults to English', 'useState("en")' in SC)
check('Stock browser API uses exact IPv4 host used by launcher', 'http://127.0.0.1:3001/api' in SC and 'http://localhost:3001/api' not in SC)
check('Stock history failure is non-fatal to main comparison', SC.count(".catch(() => ({ history: [] }))") >= 2)
check('Stock server binds only to local host', 'app.listen(PORT, "127.0.0.1"' in SS)
check('Stock ticker cache keys normalize symbol case', 'trim().toUpperCase()' in SS)
check('Stock earnings date range follows current year', 'const currentYear = new Date().getUTCFullYear()' in SS)
check('Stock server API errors default to English', 'لم يتم العثور' not in SS and 'لا بيانات تاريخية' not in SS)

# Launcher/install robustness
L=(ROOT/'launcher/start_all.py').read_text(encoding='utf-8')
starter = ROOT / 'Start Raed Finance.bat'
if not starter.exists():
    starter = ROOT.parent / 'Start Raed Finance.bat'
B=starter.read_text(encoding='utf-8')
check('Launcher installs from lockfiles with npm ci', L.count("npm_cmd('ci','--no-audit','--no-fund')") == 2)
check('Start script detects partial/broken node_modules', all(x in B for x in [
    'node_modules\\.bin\\vite.cmd','node_modules\\react\\package.json',
    'node_modules\\express\\package.json','node_modules\\yahoo-finance2\\package.json']))
check('Windows npm.cmd handling retained', "NPM = 'npm.cmd' if os.name == 'nt' else 'npm'" in L and "'/c', NPM" in L)

# ETF request validation with fake yfinance, no internet.
sys.path.insert(0,str(ROOT/'tests'))
try:
    import etf_backend_unit_test as helper
    from fastapi.testclient import TestClient
    client=TestClient(helper.app_module.app)
    invalid_cases=[
        ('alert invalid direction','/api/alerts/add',{'symbol':'SPY','target_price':100,'direction':'sideways'}),
        ('alert negative target','/api/alerts/add',{'symbol':'SPY','target_price':-1,'direction':'above'}),
        ('portfolio empty holdings','/api/portfolio/save',{'name':'P','holdings':[]}),
        ('portfolio negative shares','/api/portfolio/save',{'name':'P','holdings':[{'symbol':'SPY','shares':-1,'avgPrice':1}]}),
    ]
    for name,url,payload in invalid_cases:
        r=client.post(url,json=payload)
        check(name+' rejected', r.status_code==422, f'HTTP {r.status_code}')
except Exception as exc:
    check('ETF validation harness loads', False, repr(exc))

passed=all(results)
print('\nFINAL REGRESSION RESULT:', 'ALL CHECKS PASSED' if passed else 'FAILURES FOUND')
raise SystemExit(0 if passed else 1)
