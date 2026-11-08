"""Read app sources as one string each, after the large files were split.

Static checks search the source text. These helpers put the pieces back
together so the checks don't depend on which file a line lives in.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ETF_FRONTEND = ROOT / 'apps/etf-analysis/frontend'


def etf_page():
    """ETF index.html with its /static CSS and JS files inlined in place."""
    html = (ETF_FRONTEND / 'index.html').read_text(encoding='utf-8')

    def css(m):
        return '<style>\n' + (ETF_FRONTEND / m.group(1)).read_text(encoding='utf-8') + '</style>'

    def js(m):
        attrs = m.group(1)
        body = (ETF_FRONTEND / m.group(2)).read_text(encoding='utf-8')
        return f'<script{attrs}>\n' + body + '</script>'

    html = re.sub(r'<link rel="stylesheet" href="/static/([^"?]+)(?:\?[^"]*)?">', css, html)
    html = re.sub(r'<script((?: id="[^"]+")?) src="/static/([^"?]+)(?:\?[^"]*)?"></script>', js, html)
    return html


def concat(folder, *patterns):
    """All files under folder matching the glob patterns, joined in a stable order."""
    base = ROOT / folder
    files = sorted({p for pat in patterns for p in base.rglob(pat)})
    return '\n'.join(p.read_text(encoding='utf-8') for p in files)


def stock_ui():
    return concat('apps/stock-comparison-tool/src', '*.jsx', '*.js')


def investment_app():
    # uiLanguage.ts is the translation table itself, so it is not app UI text.
    src = ROOT / 'apps/investment-calculator/src'
    files = sorted(p for pat in ('*.tsx', '*.ts') for p in src.rglob(pat) if p.name != 'uiLanguage.ts')
    return '\n'.join(p.read_text(encoding='utf-8') for p in files)
