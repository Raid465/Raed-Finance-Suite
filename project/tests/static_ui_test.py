from pathlib import Path
from html.parser import HTMLParser
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks = []
def check(name, cond, detail=''):
    checks.append(bool(cond))
    print(f"[{'PASS' if cond else 'FAIL'}] {name}" + (f": {detail}" if detail else ''))

# Dashboard
D=(ROOT/'launcher/dashboard.html').read_text(encoding='utf-8')
check('Dashboard defaults to English', '<html lang="en" dir="ltr">' in D and "let l='en'" in D)
check('Dashboard keeps classic dark visual style', '#0f1117' in D and '#222640' in D)
check('Dashboard has no glass/radial redesign', 'backdrop-filter' not in D and 'radial-gradient' not in D)
check('Dashboard has Arabic toggle', 'id="lang"' in D and 'العربية' in D and 'English' in D)

# Investment calculator
I=(ROOT/'apps/investment-calculator/src/index.css').read_text(encoding='utf-8')
IL=(ROOT/'apps/investment-calculator/src/uiLanguage.ts').read_text(encoding='utf-8')
check('Investment uses classic ETF-style background', 'background: #0f1117' in I)
check('Investment has no glass/radial redesign', 'backdrop-filter' not in I and 'radial-gradient' not in I)
check('Investment defaults to English', "let lang: 'en'|'ar' = 'en'" in IL)
check('Investment has language control', 'global-lang-toggle' in I and "dataset.langToggle" in IL)

# Stock comparison
S=(ROOT/'apps/stock-comparison-tool/src/index.css').read_text(encoding='utf-8')
SC=(ROOT/'apps/stock-comparison-tool/src/components/StockComparisonTool.jsx').read_text(encoding='utf-8')
check('Stock stylesheet restored to classic baseline', S.strip() == '@tailwind base;\n@tailwind components;\n@tailwind utilities;')
check('Stock defaults to English', 'useState("en")' in SC)
check('Stock includes English/Arabic language switch', 'setLang' in SC and ('English' in SC or 'العربية' in SC))

# ETF
E=(ROOT/'apps/etf-analysis/frontend/index.html').read_text(encoding='utf-8')
check('ETF defaults to English/LTR', '<html lang="en" dir="ltr">' in E and "DEFAULT_LANGUAGE='en'" in E and "let lang=DEFAULT_LANGUAGE" in E)
check('ETF product redesign overlay removed', 'product-redesign' not in E)
check('ETF has no glass/radial redesign', 'backdrop-filter' not in E and 'radial-gradient' not in E)
check('ETF retains classic card palette', '--bg:#0f1117' in E and '--card:#222640' in E)
check('ETF has Arabic toggle', 'className=\'lang-toggle\'' in E and "?'العربية':'English'" in E)

# Launcher / ports / Windows npm fix
L=(ROOT/'launcher/start_all.py').read_text(encoding='utf-8')
for port in ('5050','5173','5174','3001','8000'):
    check(f'Launcher contains required port {port}', port in L or (port=='5050' and "('127.0.0.1',5050)" in L))
check('Windows npm.cmd fix retained', "NPM = 'npm.cmd' if os.name == 'nt' else 'npm'" in L and "'/c', NPM" in L)

passed=all(checks)
print('\nSTATIC RESULT:', 'ALL CHECKS PASSED' if passed else 'ONE OR MORE CHECKS FAILED')

# Performance/stability regression checks added after ETF optimization
ETF_APP=(ROOT/'apps/etf-analysis/backend/app.py').read_text(encoding='utf-8')
ETF_DATA=(ROOT/'apps/etf-analysis/backend/etf_data.py').read_text(encoding='utf-8')
ETF_CACHE=(ROOT/'apps/etf-analysis/backend/cache.py').read_text(encoding='utf-8')
ETF_RUN=(ROOT/'apps/etf-analysis/run.py').read_text(encoding='utf-8')
check('ETF main analysis uses concurrent backend calls', 'asyncio.gather' in ETF_APP and 'run_in_threadpool' in ETF_APP)
check('ETF has lightweight quote endpoint', '/api/quote/{symbol}' in ETF_APP)
check('ETF response compression enabled', 'GZipMiddleware' in ETF_APP)
check('ETF Yahoo info requests are shared', '_get_raw_info' in ETF_DATA and '_INFO_LOCKS' in ETF_DATA)
check('ETF fund metadata object is shared', '_get_funds_data' in ETF_DATA and '_FUNDS_OBJECTS' in ETF_DATA)
check('ETF cache has fast in-memory layer', '_MEM = {}' in ETF_CACHE and 'WAL' in ETF_CACHE)
check('ETF Chart.js no longer blocks first paint', '<script defer src="https://cdn.jsdelivr.net/npm/chart.js' in E)
check('ETF secondary analysis loads lazily', 'setupLazyExtras' in E and 'IntersectionObserver' in E and "rootMargin:'80px 0px'" in E)
check('ETF composition is deferred from first response', '/api/composition/{symbol}' in ETF_APP and 'composition_deferred' in ETF_APP and "fastJson('/api/composition/'+sym" in E)
check('ETF browser cache avoids repeat local requests', "sessionStorage.getItem('etf-cache:'+key)" in E and 'clientCacheSet' in E)
check('ETF language observer translates only new DOM nodes', 'm.addedNodes.forEach(n=>translateTree(n,pairs))' in E and 'AE_PAIRS' in E)
check('ETF production runner disables reload watcher', 'reload=False' in ETF_RUN)
check('Stock comparison toolbar is compact classic dark', 'max-w-5xl mx-auto rounded-xl px-4 py-4 border' in SC and 'linear-gradient(135deg, #3b82f6, #1d4ed8)' not in SC)

# ETF persistence and translation completeness regression checks
ETF_INITIAL = E.split('<script>')[0]
check('ETF initial English markup contains no Arabic UI text', not re.search(r'[\u0600-\u06FF]', ETF_INITIAL))
check('ETF Tools source is English', '>Watchlist</button>' in E and '>Portfolio Builder</button>' in E and '>Alerts</button>' in E and '<h2>Paper Portfolio</h2>' in E)
check('ETF Market Movers dynamic headings are English', 'Top Gainers' in E and 'Top Losers' in E)
check('ETF translation map covers Tools', "['قائمة المتابعة','Watchlist']" in E and "['بناء المحفظة','Portfolio Builder']" in E and "['التنبيهات','Alerts']" in E)
check('ETF translation map covers Market Movers', "['الأكثر صعوداً','Top Gainers']" in E and "['الأكثر هبوطاً','Top Losers']" in E)

check('Mutual fund objective filters fully localize to English', all(pair in E for pair in [
    "['الدخل','Income']",
    "['المحافظة على رأس المال','Capital Preservation']",
    "['تنمية رأس المال','Capital Growth']",
    "['نمو و الدخل','Growth & Income']",
]))
# Every Arabic UI literal emitted by the production script must be represented by
# the English translation dictionary. Logic-only Arabic values are also covered
# by common data-value mappings, so new untranslated UI text fails this test.
lang_block = E.split('<script id="ui-language">', 1)[1]
translation_pairs = re.findall(r"\['((?:\\'|[^'])*)','((?:\\'|[^'])*)'\]", lang_block)
arabic_keys = sorted({a.replace("\\'", "'") for a, _ in translation_pairs}, key=len, reverse=True)
pre_lang = E.split('<script id="ui-language">', 1)[0]
uncovered_arabic = []
for line_no, line in enumerate(pre_lang.splitlines(), 1):
    if not re.search(r'[\u0600-\u06FF]', line):
        continue
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
        continue
    remaining = line
    for key in arabic_keys:
        remaining = remaining.replace(key, '')
    if re.search(r'[\u0600-\u06FF]', remaining):
        uncovered_arabic.append(line_no)
check('ETF Arabic-to-English UI translation coverage is complete', not uncovered_arabic, f'uncovered lines={uncovered_arabic[:12]}')
check('ETF browser keeps a persistent watchlist backup', "WATCHLIST_BACKUP_KEY='raed_finance_watchlist_v1'" in E and 'localStorage.setItem(WATCHLIST_BACKUP_KEY' in E and 'syncWatchlistBackup' in E)
check('ETF backend stores user data outside the extracted project', 'LOCALAPPDATA' in ETF_APP and 'RaedFinanceSuite' in ETF_APP and 'USER_DATA_DIR' in ETF_APP)
check('ETF persistent JSON writes are atomic', 'os.replace(temp_name, path)' in ETF_APP and 'os.fsync' in ETF_APP)

# Re-evaluate after the performance checks appended above.
passed=all(checks)
print('\nFINAL STATIC RESULT:', 'ALL CHECKS PASSED' if passed else 'ONE OR MORE CHECKS FAILED')
sys.exit(0 if passed else 1)
