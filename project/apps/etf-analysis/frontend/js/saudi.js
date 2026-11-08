// Saudi ETFs and REITs.
// === Saudi ETFs ===
let saudiEtfList=[];

function saudiSubtab(t){
    document.querySelectorAll('#pn-saudi .sub-tab').forEach((b,i)=>{b.classList.toggle('on',['list','analyze','compare'][i]===t)});
    document.querySelectorAll('#pn-saudi .sub-pn').forEach(p=>p.classList.remove('on'));
    document.getElementById('saudi-'+t).classList.add('on');
    if(t==='list')loadSaudiList();
}

async function loadSaudiList(){
    const el=document.getElementById('saudi-etf-list');if(!el)return;
    el.innerHTML='<div class="ld"><div class="sp"></div></div>';
    try{
        const r=await fetch('/api/saudi/list');
        const d=await r.json();
        saudiEtfList=d.etfs||[];
        // Populate dropdowns
        populateSaudiDropdowns();
        // Fetch prices for list
        let html='<table><thead><tr><th>الرمز</th><th>النوع</th><th>الاسم</th><th>الفئة</th><th>السعر</th><th>التغيير</th><th></th></tr></thead><tbody>';
        // Fetch prices 6 at a time instead of one by one; rows keep list order.
        const details=new Array(saudiEtfList.length).fill(null);
        let next=0;
        const worker=async()=>{while(next<saudiEtfList.length){const i=next++;try{const r2=await fetch(`/api/saudi/${encodeURIComponent(saudiEtfList[i].symbol)}`);if(r2.ok)details[i]=await r2.json()}catch(e){}}};
        await Promise.all(Array.from({length:Math.min(6,saudiEtfList.length)},worker));
        for(const [idx,etf] of saudiEtfList.entries()){
            try{
                const d2=details[idx];
                if(d2&&d2.info){
                    const info=d2.info;
                    const changeClass=info.day_change>=0?'pos':'neg';
                    const typeColor=etf.type==='REIT'?'var(--blue)':'var(--green)';
                    html+=`<tr>
                        <td style="font-weight:700;color:var(--blue);direction:ltr">${esc(etf.symbol)}</td>
                        <td><span style="color:${typeColor};font-weight:600;font-size:.82rem">${esc(etf.type||'ETF')}</span></td>
                        <td>${esc(isArabicUI()?(etf.name_ar||etf.name):(etf.name||etf.name_ar))}</td>
                        <td>${esc(etf.category)}</td>
                        <td>${info.current_price?.toFixed(2)||'-'} ر.س</td>
                        <td class="${changeClass}">${info.day_change>=0?'+':''}${info.day_change?.toFixed(2)||'0'} (${info.day_change_pct>=0?'+':''}${info.day_change_pct?.toFixed(2)||'0'}%)</td>
                        <td><button class="btn btn-sm btn-out" onclick="document.getElementById('saudi-sym').value=${q(etf.symbol)};saudiSubtab('analyze');analyzeSaudi()">Analyze</button></td>
                    </tr>`;
                }
            }catch(e){}
        }
        html+='</tbody></table>';
        el.innerHTML=html;
    }catch(e){el.innerHTML='<p>خطأ في التحميل</p>'}
}

function populateSaudiDropdowns(){
    const dl=document.getElementById('saudi-etf-options');
    if(!dl)return;
    dl.innerHTML='';
    for(const etf of saudiEtfList){
        const opt=document.createElement('option');
        opt.value=etf.symbol;
        opt.textContent=`${etf.symbol} - ${isArabicUI()?(etf.name_ar||etf.name):(etf.name||etf.name_ar)}`;
        dl.appendChild(opt);
    }
}

async function analyzeSaudi(){
    const sym=document.getElementById('saudi-sym').value;
    if(!sym){showErr('اختر الصندوق');return}
    hideErr();
    const el=document.getElementById('saudi-res');
    el.innerHTML='<div class="ld"><div class="sp"></div><br>Loading...</div>';
    try{
        const r=await fetch(`/api/saudi/${sym}`);
        if(!r.ok){const e=await r.json();throw new Error(e.detail||'خطأ')}
        const d=await r.json();
        const info=d.info;const risk=d.risk||{};
        let holdings=[];
        try{
            const h=await fetch(`/api/saudi/holdings/${sym}`);
            if(h.ok){const hData=await h.json();holdings=hData.holdings||[]}
        }catch(_){}
        let divData={};
        try{
            const dr=await fetch(`/api/saudi/dividends/${sym}`);
            if(dr.ok)divData=await dr.json();
        }catch(_){}
        const changeClass=info.day_change>=0?'pos':'neg';
        let html=`<div class="cd">
            <h2>${esc(isArabicUI()?(info.name_ar||info.name):(info.name||info.name_ar))} (${esc(info.symbol)})</h2>
            <div class="pd">
                <span class="pp">${info.current_price?.toFixed(2)||'-'} ر.س</span>
                <span class="pc ${changeClass}">${info.day_change>=0?'+':''}${info.day_change?.toFixed(2)||'0'} (${info.day_change_pct>=0?'+':''}${info.day_change_pct?.toFixed(2)||'0'}%)</span>
            </div>
        </div>`;

        // Info cards
        html+=`<div class="cd"><h2>معلومات الصندوق</h2><div class="mg">
            <div class="mc"><div class="l">الفئة</div><div class="v">${esc(info.category||'-')}</div></div>
            <div class="mc"><div class="l">المنصة</div><div class="v">${esc(info.exchange||'-')}</div></div>
            <div class="mc"><div class="l">العملة</div><div class="v">${esc(info.currency||'-')}</div></div>
            <div class="mc"><div class="l">أعلى 52 أسبوع</div><div class="v">${info.week52_high?.toFixed(2)||'-'}</div></div>
            <div class="mc"><div class="l">أدنى 52 أسبوع</div><div class="v">${info.week52_low?.toFixed(2)||'-'}</div></div>
            <div class="mc"><div class="l">متوسط 50 يوم</div><div class="v">${info.ma50?.toFixed(2)||'-'}</div></div>
            <div class="mc"><div class="l">متوسط 200 يوم</div><div class="v">${info.ma200?.toFixed(2)||'-'}</div></div>
            <div class="mc"><div class="l">حجم التداول</div><div class="v">${fmtV(info.volume)}</div></div>
        </div></div>`;

        // Holdings
        if(holdings.length>0){
            html+=`<div class="cd"><h2>أصول الصندوق (${holdings.length} عنصر)</h2>`;
            // Donut chart
            html+=`<div style="max-height:350px;margin-bottom:16px"><canvas id="ch-saudi-holdings"></canvas></div>`;
            // Table
            html+=`<div style="overflow-x:auto"><table><thead><tr><th>#</th><th>الاسم</th><th>الوزن</th><th>الرسم البياني</th></tr></thead><tbody>`;
            const colors=['#4f8cff','#34d399','#fb923c','#f87171','#4f8cff','#fbbf24','#60a5fa','#f472b6','#2dd4bf','#e879f9'];
            holdings.forEach((h,i)=>{
                const barColor=colors[i%colors.length];
                html+=`<tr>
                    <td style="color:var(--txt2)">${i+1}</td>
                    <td style="font-weight:600">${esc(h.name)}</td>
                    <td style="direction:ltr;text-align:right;font-weight:700;color:var(--blue)">${h.weight?.toFixed(1)||'-'}%</td>
                    <td style="width:40%"><div style="background:var(--bg2);border-radius:4px;height:20px;overflow:hidden">
                        <div style="background:${barColor};height:100%;width:${h.weight||0}%;transition:width .5s"></div>
                    </div></td>
                </tr>`;
            });
            html+='</tbody></table></div></div>';

            // Render donut chart
            setTimeout(()=>{
                const ctx=document.getElementById('ch-saudi-holdings')?.getContext('2d');
                if(ctx){
                    new Chart(ctx,{type:'doughnut',data:{labels:holdings.map(h=>h.name),datasets:[{data:holdings.map(h=>h.weight),backgroundColor:colors.slice(0,holdings.length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{position:'right',labels:{color:'#fff',padding:10,font:{size:11},boxWidth:14}},tooltip:{callbacks:{label:c=>c.label+': '+c.parsed.toFixed(1)+'%'}}}}});
                }
            },100);
        }

        // Risk metrics
        if(risk.volatility){
            html+=`<div class="cd"><h2>مؤشرات المخاطر</h2><div class="mg">
                <div class="mc"><div class="l">التذبذب</div><div class="v">${fmtP(risk.volatility)}</div></div>
                <div class="mc"><div class="l">العائد السنوي</div><div class="v ${pC(risk.annualized_return)}">${pS(risk.annualized_return)}${fmtP(risk.annualized_return)}</div></div>
                <div class="mc"><div class="l">Sharpe</div><div class="v">${risk.sharpe_ratio}</div></div>
                <div class="mc"><div class="l">أقصى انخفاض</div><div class="v neg">-${fmtP(risk.max_drawdown)}</div></div>
                <div class="mc"><div class="l">العائد الكلي</div><div class="v ${pC(risk.total_return)}">${pS(risk.total_return)}${fmtP(risk.total_return)}</div></div>
            </div></div>`;
        }

        // Dividends
        if(divData.distributions&&divData.distributions.length>0){
            const yieldClass=divData.annualYield>=4?'pos':divData.annualYield>=2?'':'neg';
            html+=`<div class="cd"><h2>التوزيعات السنوية</h2>
                <div class="mg" style="margin-bottom:16px">
                    <div class="mc" style="border-right:3px solid var(--green)"><div class="l">العائد السنوي</div><div class="v ${yieldClass}" style="font-size:1.4rem;font-weight:700">${divData.annualYield.toFixed(1)}%</div></div>
                    <div class="mc" style="border-right:3px solid var(--blue)"><div class="l">عدد التوزيعات/سنة</div><div class="v" style="font-size:1.4rem;font-weight:700">${divData.dividendsPerYear}</div></div>
                    ${divData.annualDividend?`<div class="mc" style="border-right:3px solid var(--orange)"><div class="l">التوزيع السنوي للوحدة</div><div class="v" style="font-size:1.4rem;font-weight:700">${divData.annualDividend.toFixed(2)} ر.س</div></div>`:''}
                </div>
                <div style="overflow-x:auto"><table><thead><tr><th>التاريخ</th><th>المبلغ للوحدة</th><th>النوع</th></tr></thead><tbody>`;
            divData.distributions.slice(0,12).forEach(dist=>{
                const isRepeat=divData.distributions.filter(d=>Math.abs(d.amount-dist.amount)<0.001).length>1;
                html+=`<tr>
                    <td style="direction:ltr">${esc(dist.date)}</td>
                    <td style="font-weight:700;color:var(--green)">${dist.amount.toFixed(2)} ر.س</td>
                    <td>${esc(dist.type)}${isRepeat?' <span style="background:rgba(251,191,36,.15);color:#fbbf24;padding:2px 8px;border-radius:10px;font-size:.75rem">مكرر</span>':''}</td>
                </tr>`;
            });
            html+=`</tbody></table></div>`;
            if(divData.distributions.length>12) html+=`<div style="color:var(--txt2);font-size:.8rem;margin-top:8px">عرض آخر 12 توزيعة من أصل ${divData.distributions.length}</div>`;
            html+=`</div>`;
        }else{
            html+=`<div class="cd"><h2>التوزيعات السنوية</h2>
                <div style="text-align:center;padding:20px;color:var(--txt2)">
                    <div style="font-size:2rem;margin-bottom:8px">📊</div>
                    <div>لا توجد بيانات توزيعات مسجلة لهذا الصندوق</div>
                </div></div>`;
        }

        // Price chart
        html+=`<div class="cd"><h2>السعر</h2>
            <div class="pb" style="margin-bottom:14px">
                <button class="btn btn-sm btn-out" onclick="loadSaudiChart(${q(sym)},'1mo',this)">1M</button>
                <button class="btn btn-sm btn-out" onclick="loadSaudiChart(${q(sym)},'3mo',this)">3M</button>
                <button class="btn btn-sm btn-out" onclick="loadSaudiChart(${q(sym)},'6mo',this)">6M</button>
                <button class="btn btn-sm btn-out on" onclick="loadSaudiChart(${q(sym)},'1y',this)">1Y</button>
            </div>
            <div style="max-height:380px"><canvas id="ch-saudi-price"></canvas></div>
        </div>`;

        el.innerHTML=html;
        loadSaudiChart(sym,'1y',null);
    }catch(e){showErr(e.message);el.innerHTML=''}
}

async function loadSaudiChart(sym,period,btn){
    if(btn){document.querySelectorAll('#saudi-res .btn-sm').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}
    try{
        const r=await fetch(`/api/saudi/history/${sym}?period=${period}`);
        if(!r.ok)return;
        const d=await r.json();
        if(d.data&&d.data.length>0){
            if(charts.saudi)charts.saudi.destroy();
            const ctx=document.getElementById('ch-saudi-price')?.getContext('2d');
            if(!ctx)return;
            const prices=d.data.map(x=>x.close);
            const isUp=prices[prices.length-1]>=prices[0];
            charts.saudi=new Chart(ctx,{type:'line',data:{labels:d.data.map(x=>x.date),datasets:[{label:sym,data:prices,borderColor:isUp?'#34d399':'#f87171',backgroundColor:isUp?'rgba(52,211,153,.1)':'rgba(248,113,113,.1)',fill:true,tension:.3,pointRadius:0,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:true,scales:{x:{ticks:{color:'#a0a0b8',maxTicksLimit:8,maxRotation:0},grid:{display:false}},y:{ticks:{color:'#a0a0b8',callback:v=>v.toFixed(2)},grid:{color:'rgba(255,255,255,.05)'}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.y.toFixed(2)+' ر.س'}}},interaction:{intersect:false,mode:'index'}}});
        }
    }catch(e){console.error('Saudi chart error:',e)}
}

async function compareSaudi(){
    const a=document.getElementById('saudi-sym-a').value;
    const b=document.getElementById('saudi-sym-b').value;
    if(!a||!b){showErr('اختر صندوقين');return}
    if(a===b){showErr('اختر صندوقين مختلفين');return}
    hideErr();
    const el=document.getElementById('saudi-cmp-res');
    el.innerHTML='<div class="ld"><div class="sp"></div><br>Loading...</div>';
    try{
        const r=await fetch('/api/saudi/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol_a:a,symbol_b:b})});
        if(!r.ok){const e=await r.json();throw new Error(e.detail||'خطأ')}
        const d=await r.json();
        const iA=d.etf_a.info,iB=d.etf_b.info;
        const rA=d.etf_a.risk||{},rB=d.etf_b.risk||{};

        let html=`<div class="cd">
            <h2>مقارنة: ${esc(isArabicUI()?(iA.name_ar||iA.name):(iA.name||iA.name_ar))} vs ${esc(isArabicUI()?(iB.name_ar||iB.name):(iB.name||iB.name_ar))}</h2>
            <div class="lr">
                <div class="li"><span class="da"></span>${esc(iA.symbol)}</div>
                <div class="li"><span class="db"></span>${esc(iB.symbol)}</div>
            </div>
        </div>`;

        html+=`<div class="cd"><h2>مقارنة المؤشرات</h2>
            <div class="cmr" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
                ${cm('السعر',iA.current_price,iB.current_price,v=>v?.toFixed(2)||'-')}
                ${cm('التغيير اليوم',iA.day_change_pct,iB.day_change_pct,v=>(v>=0?'+':'')+(v?.toFixed(2)||'0')+'%')}
                ${cm('التذبذب',rA.volatility,rB.volatility,fmtP)}
                ${cm('العائد السنوي',rA.annualized_return,rB.annualized_return,v=>pS(v)+fmtP(v))}
                ${cm('Sharpe',rA.sharpe_ratio,rB.sharpe_ratio)}
                ${cm('أقصى انخفاض',rA.max_drawdown,rB.max_drawdown,v=>'-'+fmtP(v))}
                ${cm('العائد الكلي',rA.total_return,rB.total_return,v=>pS(v)+fmtP(v))}
                ${cm('أعلى 52 أسبوع',iA.week52_high,iB.week52_high,v=>v?.toFixed(2)||'-')}
                ${cm('أدنى 52 أسبوع',iA.week52_low,iB.week52_low,v=>v?.toFixed(2)||'-')}
            </div>
        </div>`;

        // Performance chart
        html+=`<div class="cd"><h2>مقارنة الأداء</h2><div style="max-height:400px"><canvas id="ch-saudi-cmp"></canvas></div></div>`;

        el.innerHTML=html;

        // Load performance chart
        const [hA,hB]=await Promise.all([
            fetch(`/api/saudi/history/${a}?period=1y`).then(r=>r.json()),
            fetch(`/api/saudi/history/${b}?period=1y`).then(r=>r.json())
        ]);
        if(hA.data&&hB.data){
            const ctx=document.getElementById('ch-saudi-cmp')?.getContext('2d');
            if(ctx){
                // Normalize to returns
                const baseA=hA.data[0]?.close||1;
                const baseB=hB.data[0]?.close||1;
                const retA=hA.data.map(d=>((d.close/baseA)-1)*100);
                const retB=hB.data.map(d=>((d.close/baseB)-1)*100);
                const minLen=Math.min(retA.length,retB.length);
                charts.saudiCmp=new Chart(ctx,{type:'line',data:{labels:hA.data.slice(0,minLen).map(d=>d.date),datasets:[
                    {label:a,data:retA.slice(0,minLen),borderColor:'#4f8cff',fill:false,tension:.3,pointRadius:0,borderWidth:2},
                    {label:b,data:retB.slice(0,minLen),borderColor:'#fb923c',fill:false,tension:.3,pointRadius:0,borderWidth:2}
                ]},options:{responsive:true,maintainAspectRatio:true,scales:{x:{ticks:{color:'#a0a0b8',maxTicksLimit:8,maxRotation:0},grid:{display:false}},y:{ticks:{color:'#a0a0b8',callback:v=>v.toFixed(1)+'%'},grid:{color:'rgba(255,255,255,.05)'}}},plugins:{legend:{labels:{color:'#fff',padding:14,font:{size:12}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y.toFixed(2)+'%'}}},interaction:{intersect:false,mode:'index'}}});
            }
        }
    }catch(e){showErr(e.message);el.innerHTML=''}
}
