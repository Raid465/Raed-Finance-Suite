// Shared helpers: formatting, escaping, tabs, chart and client cache.
let charts={};
const COLORS=['#4f8cff','#34d399','#4f8cff','#fb923c','#f87171','#fbbf24','#38bdf8','#e879f9','#2dd4bf','#f472b6','#818cf8','#a3e635'];
function isArabicUI(){return document.documentElement.lang==='ar'}
function ui(ar,en){return isArabicUI()?ar:en}
function uiLocale(){return isArabicUI()?'ar-SA':'en-US'}
// Escape text from APIs/user input before it goes into innerHTML.
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
// Quote a value as a JS string literal that is safe inside an onclick="..." attribute.
function q(v){return esc(JSON.stringify(String(v??'')))}
// Allow only http(s) links from news feeds.
function safeUrl(u){try{const x=new URL(String(u||''),location.href);return(x.protocol==='https:'||x.protocol==='http:')?x.href:''}catch(e){return''}}

function tab(t){document.querySelectorAll('.tb').forEach((b,i)=>{b.classList.toggle('on',['analyze','compare','multi','movers','saudi','funds','tools'][i]===t)});document.querySelectorAll('.pn').forEach(p=>p.classList.remove('on'));document.getElementById('pn-'+t).classList.add('on');hideErr();if(t==='movers')loadMovers();if(t==='saudi')loadSaudiList();if(t==='funds')searchFunds();if(t==='tools')loadWatchlist()}
function subtab(t){document.querySelectorAll('.sub-tab').forEach((b,i)=>{b.classList.toggle('on',['watchlist','portfolio','alerts'][i]===t)});document.querySelectorAll('.sub-pn').forEach(p=>p.classList.remove('on'));document.getElementById('sub-'+t).classList.add('on');if(t==='watchlist')loadWatchlist();if(t==='portfolio'){pfLoad();renderPfItems()}if(t==='alerts')loadAlerts()}
function showErr(m){const e=document.getElementById('error');e.textContent=m;e.style.display='block'}
function hideErr(){document.getElementById('error').style.display='none'}
function fmtN(n){if(n==null)return'-';if(n>=1e12)return(n/1e12).toFixed(2)+' '+ui('تريليون','T');if(n>=1e9)return(n/1e9).toFixed(2)+' '+ui('مليار','B');if(n>=1e6)return(n/1e6).toFixed(2)+' '+ui('مليون','M');if(n>=1e3)return(n/1e3).toFixed(1)+' '+ui('ألف','K');return n.toLocaleString(uiLocale())}
function fmtV(n){if(n==null)return'-';if(n>=1e6)return(n/1e6).toFixed(2)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n.toString()}
function fmtD(ts){if(!ts)return'-';return new Date(ts*1000).toLocaleDateString(uiLocale(),{year:'numeric',month:'long',day:'numeric'})}
function fmtP(v){if(v==null)return'-';return v.toFixed(2)+'%'}
function fmtPr(v){if(v==null)return'-';return'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function pC(v){return v==null?'':v>=0?'pos':'neg'}
function pS(v){return v==null?'':v>=0?'+':''}

function destroyChart(k){if(charts[k]){charts[k].destroy();charts[k]=null}}

const CLIENT_CACHE_TTL=5*60*1000;
let analysisRun=0;
function clientCacheGet(key,ttl=CLIENT_CACHE_TTL){
    try{
        const raw=sessionStorage.getItem('etf-cache:'+key);
        if(!raw)return null;
        const item=JSON.parse(raw);
        if(Date.now()-item.t>ttl){sessionStorage.removeItem('etf-cache:'+key);return null}
        return item.v;
    }catch(e){return null}
}
function clientCacheSet(key,value){
    try{sessionStorage.setItem('etf-cache:'+key,JSON.stringify({t:Date.now(),v:value}))}catch(e){}
}
async function fastJson(url,ttl=CLIENT_CACHE_TTL){
    const hit=clientCacheGet(url,ttl);
    if(hit!==null)return hit;
    const r=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!r.ok){let msg='Request failed';try{const e=await r.json();msg=e.detail||msg}catch(_){}throw new Error(msg)}
    const data=await r.json();clientCacheSet(url,data);return data;
}
