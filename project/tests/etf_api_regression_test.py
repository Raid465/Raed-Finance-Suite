import sys, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
import etf_backend_unit_test as base
from fastapi.testclient import TestClient
appm=base.app_module
client=TestClient(appm.app)
fail=[]
def ck(name,cond,detail=''):
 print(f"[{'PASS' if cond else 'FAIL'}] {name}"+(f' :: {detail}' if detail else ''))
 if not cond: fail.append(name)

# Basic/security
r=client.get('/'); ck('home 200',r.status_code==200); ck('home English default','<html lang="en" dir="ltr">' in r.text)
for h in ['x-content-type-options','x-frame-options','content-security-policy','cache-control']:
 ck('header '+h,h in r.headers,str(dict(r.headers)))
for path in ['/.env','/cache.db','/../etc/passwd','/backend/cache.db']:
 rr=client.get(path); ck('blocked '+path,rr.status_code in (404,403),rr.status_code)

# validation and core routes
cases=[
 ('GET','/api/health',None,200),('GET','/api/storage-info',None,200),
 ('GET','/api/quote/TST',None,200),('GET','/api/etf/TST',None,200),('GET','/api/composition/TST',None,200),
 ('GET','/api/history/TST?period=1mo',None,200),('GET','/api/history/TST?period=BAD',None,422),
 ('GET','/api/risk/TST?period=3y',None,200),('GET','/api/technical/TST?period=1y',None,200),
 ('GET','/api/dividends/TST',None,200),('GET','/api/news/TST',None,200),('GET','/api/movers?limit=10',None,200),
 ('GET','/api/movers?limit=2',None,422),
 ('POST','/api/compare',{'symbol_a':'AAA','symbol_b':'BBB'},200),('POST','/api/compare',{'symbol_a':'AAA','symbol_b':'AAA'},400),
 ('POST','/api/multi-compare',{'symbols':['AAA','BBB']},200),('POST','/api/multi-compare',{'symbols':['AAA']},400),
 ('POST','/api/multi-compare',{'symbols':['A','B','C','D','E','F']},400),
 ('POST','/api/correlation',{'symbols':['AAA','BBB']},200),
 ('GET','/api/saudi/list',None,200),('GET','/api/saudi/9400',None,200),('GET','/api/saudi/history/9400?period=1y',None,200),
 ('GET','/api/saudi/holdings/9400',None,200),('POST','/api/saudi/compare',{'symbol_a':'9400','symbol_b':'9401'},200),
 ('GET','/api/mutual-funds?page=1&page_size=10',None,200),('GET','/api/mutual-funds?sort_by=BAD',None,422),('GET','/api/mutual-funds?sort_order=BAD',None,422),('GET','/api/mutual-funds/stats',None,200),
 ('GET','/api/mutual-funds/009003',None,200),('GET','/api/mutual-funds/INVALID',None,404),
 ('GET','/api/mutual-funds/009003/holdings',None,200),('GET','/api/saudi/dividends/009003',None,200),
]
for meth,path,payload,exp in cases:
 rr=client.request(meth,path,json=payload) if payload is not None else client.request(meth,path)
 ck(f'{meth} {path} -> {exp}',rr.status_code==exp,f'{rr.status_code} {rr.text[:120]}')

# data integrity mutual funds
r=client.get('/api/mutual-funds?page=1&page_size=10'); j=r.json()
ck('mutual funds total 353',j.get('total')==353,j.get('total'))
ck('page size 10',len(j.get('funds',[]))==10,len(j.get('funds',[])))
ck('objective filter values exact',set(j['filters']['objectives'])=={'الدخل','المحافظة على رأس المال','تنمية رأس المال','نمو و الدخل'},j['filters']['objectives'])
# filtering preserves only target objective
for obj in j['filters']['objectives']:
 rr=client.get('/api/mutual-funds',params={'objective':obj,'page_size':200}); jj=rr.json()
 ck('filter objective '+obj, all(f.get('objective')==obj for f in jj.get('funds',[])),jj.get('total'))

# persistence CRUD
start=client.get('/api/watchlist').json().get('symbols',[])
client.post('/api/watchlist/add',json={'symbol_a':'ZZTEST','symbol_b':''});
ck('watch add','ZZTEST' in client.get('/api/watchlist').json().get('symbols',[]))
client.post('/api/watchlist/remove',json={'symbol_a':'ZZTEST','symbol_b':''}); ck('watch remove','ZZTEST' not in client.get('/api/watchlist').json().get('symbols',[]))
# alerts
rr=client.post('/api/alerts/add',json={'symbol':'TST','target_price':100,'direction':'above'}); ck('alert add',rr.status_code==200 and len(rr.json()['alerts'])>=1)
rr=client.get('/api/alerts/check'); ck('alert check',rr.status_code==200 and 'triggered' in rr.json())
# remove any remaining
client.post('/api/alerts/remove',json={'symbol':'TST','target_price':100,'direction':'above'})
# portfolio
rr=client.post('/api/portfolio/save',json={'name':'Test','holdings':[{'symbol':'TST','shares':2,'avgPrice':90}]}); ck('portfolio save',rr.status_code==200 and rr.json().get('total_value')==203.0,rr.text)

# malformed requests
for path in ['/api/compare','/api/portfolio/save','/api/alerts/add']:
 rr=client.post(path,content='not json',headers={'content-type':'application/json'}); ck('bad JSON '+path,rr.status_code==422,rr.status_code)

print('\nFAILURES',len(fail),fail)
raise SystemExit(1 if fail else 0)
