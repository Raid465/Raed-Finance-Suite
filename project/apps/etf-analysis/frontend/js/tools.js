// Watchlist, portfolio and price alerts.
// Watchlist
const WATCHLIST_BACKUP_KEY='raed_finance_watchlist_v1';
function readWatchlistBackup(){
    try{const v=JSON.parse(localStorage.getItem(WATCHLIST_BACKUP_KEY)||'[]');return Array.isArray(v)?v.map(x=>String(x).toUpperCase()).filter(Boolean):[]}catch(e){return[]}
}
function writeWatchlistBackup(symbols){
    try{localStorage.setItem(WATCHLIST_BACKUP_KEY,JSON.stringify([...(symbols||[])]))}catch(e){}
}
async function syncWatchlistBackup(serverSymbols){
    const server=[...(serverSymbols||[])];const backup=readWatchlistBackup();
    if(server.length){writeWatchlistBackup(server);return server}
    if(!backup.length)return server;
    // Server storage was reset/moved: restore the browser backup without changing the UI.
    for(const sym of backup){
        try{await fetch('/api/watchlist/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol_a:sym,symbol_b:''})})}catch(e){}
    }
    return backup
}
async function loadWatchlist(){
    const r=await fetch('/api/watchlist');const d=await r.json();
    d.symbols=await syncWatchlistBackup(d.symbols);
    const el=document.getElementById('wl-list');if(!el)return;
    if(!d.symbols?.length){el.innerHTML='<p style="color:var(--txt2);padding:14px">Watchlist is empty</p>';return}
    const rows=await Promise.all(d.symbols.map(async sym=>{
        try{
            const r2=await fetch(`/api/quote/${sym}`);const d2=await r2.json();
            const m=d2.metrics||{};
            return `<div class="wl-item" style="flex-direction:row-reverse">
                <div class="wl-actions"><button class="btn btn-sm btn-red" onclick="removeFromWatchlist(${q(sym)})">Delete</button></div>
                <div style="text-align:center;min-width:80px"><div style="font-weight:700">${fmtPr(m.current_price)}</div><div class="${pC(m.day_change)}">${pS(m.day_change)}${fmtP(m.day_change_pct)}</div></div>
                <div onclick="document.getElementById('inp').value=${q(sym)};tab('analyze');analyze()" style="cursor:pointer;flex:1;text-align:right">
                    <div style="font-weight:700;color:var(--blue);font-size:1.1rem">${esc(sym)}</div>
                    <div style="font-size:.82rem;color:var(--txt2)">${esc(d2.info?.name||sym)}</div>
                </div>
            </div>`;
        }catch(e){return `<div class="wl-item"><span>${esc(sym)}</span><button class="btn btn-sm btn-red" onclick="removeFromWatchlist(${q(sym)})">Delete</button></div>`}
    }));
    el.innerHTML=rows.join('');
}

async function addToWatchlist(){
    const sym=document.getElementById('inp-wl').value.trim().toUpperCase();
    if(!sym)return;document.getElementById('inp-wl').value='';
    const r=await fetch('/api/watchlist/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol_a:sym,symbol_b:''})});
    if(r.ok){const d=await r.json();writeWatchlistBackup(d.symbols)}
    loadWatchlist();
}

async function addToWatchlistDirect(sym){
    const r=await fetch('/api/watchlist/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol_a:sym,symbol_b:''})});
    if(r.ok){const d=await r.json();writeWatchlistBackup(d.symbols)}
    alert(ui('تمت الإضافة للمتابعة: ','Added to watchlist: ')+sym);
}

async function removeFromWatchlist(sym){
    const r=await fetch('/api/watchlist/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol_a:sym,symbol_b:''})});
    if(r.ok){const d=await r.json();writeWatchlistBackup(d.symbols)}
    loadWatchlist();
}

// Portfolio
let pfItems=[];
function pfLoad(){
    try{
        const saved=localStorage.getItem('etf_portfolio');
        if(saved){pfItems=JSON.parse(saved)}
    }catch(e){pfItems=[]}
}
function pfSave(){
    try{localStorage.setItem('etf_portfolio',JSON.stringify(pfItems))}catch(e){}
}
function addToPortfolio(){
    const sym=document.getElementById('inp-pf-sym').value.trim().toUpperCase();
    const sh=parseFloat(document.getElementById('inp-pf-sh').value);
    const avg=parseFloat(document.getElementById('inp-pf-avg').value);
    if(!sym||!sh||sh<=0)return;
    const existing=pfItems.find(p=>p.symbol===sym);
    if(existing){
        // Weighted average when adding more shares
        const oldCost=existing.shares*existing.avgPrice;
        const newCost=sh*(avg||existing.avgPrice);
        existing.shares+=sh;
        existing.avgPrice=(oldCost+newCost)/existing.shares;
    }else{
        pfItems.push({symbol:sym,shares:sh,avgPrice:avg||0})
    }
    document.getElementById('inp-pf-sym').value='';
    document.getElementById('inp-pf-sh').value='';
    document.getElementById('inp-pf-avg').value='';
    pfSave();renderPfItems();
}
function removePfItem(i){
    pfItems.splice(i,1);
    pfSave();renderPfItems();
}
function renderPfItems(){
    const el=document.getElementById('pf-items');if(!el)return;
    if(!pfItems.length){el.innerHTML='<p style="color:var(--txt2)">Add positions to the portfolio</p>';document.getElementById('pf-total').innerHTML='';return}
    let html='<table><thead><tr><th>Symbol</th><th>Shares</th><th>Average Price</th><th></th></tr></thead><tbody>';
    pfItems.forEach((p,i)=>{
        html+=`<tr>
            <td style="font-weight:700;color:var(--blue)">${esc(p.symbol)}</td>
            <td>${p.shares}</td>
            <td>${p.avgPrice?fmtPr(p.avgPrice):'-'}</td>
            <td><button class="btn btn-sm btn-red" onclick="removePfItem(${i})">Delete</button></td>
        </tr>`;
    });
    html+='</tbody></table>';el.innerHTML=html;
    calculatePfValue();
}
async function calculatePfValue(){
    if(!pfItems.length){document.getElementById('pf-total').innerHTML='';return}
    const el=document.getElementById('pf-total');
    el.innerHTML='<div class="ld"><div class="sp"></div></div>';
    try{
        let totalValue=0,totalCost=0,totalShares=0;const details=[];
        const quoteRows=await Promise.all(pfItems.map(async p=>{
            try{
                const r=await fetch(`/api/quote/${p.symbol}`);
                if(!r.ok)return null;
                const d=await r.json();
                const currentPrice=d.metrics?.current_price||0;
                const value=currentPrice*p.shares;
                const cost=(p.avgPrice||0)*p.shares;
                const pl=value-cost;
                const plPct=cost>0?((value-cost)/cost*100):0;
                return {symbol:p.symbol,shares:p.shares,avgPrice:p.avgPrice||0,currentPrice,value,cost,pl,plPct};
            }catch(e){return null}
        }));
        quoteRows.filter(Boolean).forEach(x=>{
            totalValue+=x.value;totalCost+=x.cost;totalShares+=x.shares;details.push(x);
        });
        const totalPL=totalValue-totalCost;
        const totalPLPct=totalCost>0?(totalPL/totalCost*100):0;
        const plClass=totalPL>=0?'pos':'neg';
        let html=`<div class="cd" style="background:var(--bg2)">
            <h3>Current Value: <b style="color:var(--green)">${fmtPr(totalValue)}</b></h3>
            <div class="div-summary">
                <div class="div-card"><div class="l">Total Cost</div><div class="v">${fmtPr(totalCost)}</div></div>
                <div class="div-card"><div class="l">Profit / Loss</div><div class="v ${plClass}">${pS(totalPL)}${fmtPr(totalPL)}</div></div>
                <div class="div-card"><div class="l">Return</div><div class="v ${plClass}">${pS(totalPLPct)}${totalPLPct.toFixed(2)}%</div></div>
                <div class="div-card"><div class="l">Shares</div><div class="v">${totalShares}</div></div>
                <div class="div-card"><div class="l">Positions</div><div class="v">${details.length}</div></div>
            </div>`;
        if(details.length){
            html+='<table><thead><tr><th>Symbol</th><th>Shares</th><th>Average Cost</th><th>Current Price</th><th>Cost</th><th>Value</th><th>Profit / Loss</th><th>Weight</th></tr></thead><tbody>';
            details.forEach(x=>{
                const weight=totalValue>0?(x.value/totalValue*100):0;
                const xPLClass=x.pl>=0?'pos':'neg';
                html+=`<tr>
                    <td style="font-weight:700;color:var(--blue)">${esc(x.symbol)}</td>
                    <td>${x.shares}</td>
                    <td>${fmtPr(x.avgPrice)}</td>
                    <td>${fmtPr(x.currentPrice)}</td>
                    <td>${fmtPr(x.cost)}</td>
                    <td>${fmtPr(x.value)}</td>
                    <td class="${xPLClass}">${pS(x.pl)}${fmtPr(x.pl)} (${pS(x.plPct)}${x.plPct.toFixed(1)}%)</td>
                    <td>${weight.toFixed(2)}%</td>
                </tr>`;
            });
            html+='</tbody></table>';
        }
        html+='</div>';
        el.innerHTML=html;
    }catch(e){el.innerHTML='<p>Could not calculate portfolio value</p>'}
}
async function savePortfolio(){
    if(!pfItems.length){alert(ui('أضف أسهم أولاً','Add positions first'));return}
    const name=ui('محفظة ','Portfolio ')+new Date().toLocaleDateString(uiLocale());
    const r=await fetch('/api/portfolio/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,holdings:pfItems})});
    const d=await r.json();
    if(d.total_value){
        alert(ui('تم حفظ المحفظة! القيمة: ','Portfolio saved. Value: ')+fmtPr(d.total_value));
    }
}

// Alerts
let alertCheckInterval=null;
let triggeredAlerts=[];

function initAlerts(){
    // Request notification permission
    if('Notification' in window && Notification.permission==='default'){
        Notification.requestPermission();
    }
    // Start checking every 60 seconds
    if(alertCheckInterval)clearInterval(alertCheckInterval);
    alertCheckInterval=setInterval(checkAlerts,60000);
    // Check immediately
    setTimeout(checkAlerts,2000);
}

function playAlertSound(){
    try{
        const ctx=new (window.AudioContext||window.webkitAudioContext)();
        const osc=ctx.createOscillator();
        const gain=ctx.createGain();
        osc.connect(gain);gain.connect(ctx.destination);
        osc.frequency.value=800;gain.gain.value=0.3;
        osc.start();
        setTimeout(()=>{osc.frequency.value=1200},200);
        setTimeout(()=>{osc.stop();ctx.close()},500);
    }catch(e){}
}

function showNotification(title,body){
    // Browser notification
    if('Notification' in window && Notification.permission==='granted'){
        new Notification(title,{body});
    }
    // In-page notification
    const el=document.getElementById('al-triggered');
    if(el){
        const div=document.createElement('div');
        div.style.cssText='background:rgba(251,191,36,.15);border:1px solid var(--yellow);border-radius:8px;padding:12px;margin-bottom:8px;animation:pulse 1s';
        div.innerHTML=`<b style="color:var(--yellow)">⚠ ${esc(title)}</b><br><span style="color:var(--txt2);font-size:.9rem">${esc(body)}</span>`;
        el.prepend(div);
        setTimeout(()=>div.remove(),30000);
    }
}

async function checkAlerts(){
    try{
        const r=await fetch('/api/alerts/check');
        if(!r.ok)return;
        const d=await r.json();
        // Show triggered alerts
        if(d.triggered && d.triggered.length>0){
            for(const a of d.triggered){
                const msg=`${a.symbol}${ui('وصل إلى','reached')} ${fmtPr(a.current_price)} (${ui('الهدف','target')}: ${a.direction==='above'?ui('فوق','Above'):ui('تحت','Below')} ${fmtPr(a.target_price)})`;
                showNotification(ui('تنبيه سعر!','Price Alert!'),msg);
                playAlertSound();
            }
        }
        // Update status
        const st=document.getElementById('al-status');
        if(st){
            const remaining=d.remaining?.length||0;
            st.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg2);border-radius:8px">
                <span style="color:var(--txt2);font-size:.85rem">
                    <span style="color:var(--green)">●</span> Automatic check every 60 seconds | ${remaining} active alert(s)
                </span>
                <button class="btn btn-sm btn-out" onclick="checkAlerts()">Check Now</button>
            </div>`;
        }
        loadAlerts();
    }catch(e){console.error('Alert check error:',e)}
}

async function loadAlerts(){
    const r=await fetch('/api/alerts');const d=await r.json();
    const el=document.getElementById('al-list');if(!el)return;
    if(!d.alerts?.length){el.innerHTML='<p style="color:var(--txt2);padding:14px">No alerts</p>';return}
    let html='';
    d.alerts.forEach(a=>{
        const dirColor=a.direction==='above'?'var(--green)':'var(--red)';
        html+=`<div class="alert-item">
            <span style="font-weight:700;color:var(--blue)">${esc(a.symbol)}</span>
            <span style="color:${dirColor}">${a.direction==='above'?ui('فوق','Above'):ui('تحت','Below')} ${fmtPr(a.target_price)}</span>
            <button class="btn btn-sm btn-red" onclick="removeAlert(${q(a.symbol)},${Number(a.target_price)})">Delete</button>
        </div>`;
    });
    el.innerHTML=html;
}
async function addAlert(){
    const sym=document.getElementById('inp-al-sym').value.trim().toUpperCase();
    const price=parseFloat(document.getElementById('inp-al-price').value);
    const dir=document.getElementById('inp-al-dir').value;
    if(!sym||!price)return;
    // Request notification permission on first alert
    if('Notification' in window && Notification.permission==='default'){
        Notification.requestPermission();
    }
    await fetch('/api/alerts/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol:sym,target_price:price,direction:dir})});
    document.getElementById('inp-al-sym').value='';document.getElementById('inp-al-price').value='';
    loadAlerts();checkAlerts();
}
async function removeAlert(sym,price){
    await fetch('/api/alerts/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol:sym,target_price:price,direction:'above'})});
    loadAlerts();checkAlerts();
}
