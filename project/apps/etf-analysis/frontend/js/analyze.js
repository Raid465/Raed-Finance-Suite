// Single ETF analysis: overview, composition, technicals, risk, dividends, news.
async function analyze(){
    const sym=document.getElementById('inp').value.trim().toUpperCase();
    if(!sym){showErr('أدخل رمز الصندوق.');return}
    const run=++analysisRun;
    hideErr();
    const r=document.getElementById('res-an');
    r.innerHTML='<div class="ld"><div class="sp"></div><br>Loading...</div>';
    document.getElementById('btn-an').disabled=true;

    // Start all independent work immediately, but only block the first paint on
    // the small/core response. History and fund composition fill in afterwards.
    const coreP=fastJson('/api/etf/'+sym,90*1000);
    const histP=fastJson('/api/history/'+sym+'?period=1y',5*60*1000);
    const compP=fastJson('/api/composition/'+sym,6*60*60*1000);
    try{
        const data=await coreP;
        if(run!==analysisRun)return;
        renderAnalysis(data,{data:[]},r);
        document.getElementById('btn-an').disabled=false;

        histP.then(hist=>{
            if(run!==analysisRun)return;
            const loading=document.getElementById('price-loading');if(loading)loading.remove();
            if(hist?.data?.length)renderPrice('ch-price',hist.data,sym);
        }).catch(()=>{const el=document.getElementById('price-loading');if(el)el.textContent='Price chart unavailable';});

        compP.then(comp=>{if(run===analysisRun)renderComposition(comp)}).catch(()=>{
            const slot=document.getElementById('composition-slot');
            if(slot)slot.innerHTML='<div class="cd"><h2>مكونات الصندوق</h2><p style="color:var(--txt2)">تعذر تحميل بيانات المراكز حالياً.</p></div>';
        });
    }catch(e){
        if(run===analysisRun){showErr(e.message);r.innerHTML='';document.getElementById('btn-an').disabled=false}
    }
}

async function loadExtra(sym,type){
    const r=await fetch(`/api/${type}/${sym}`);
    if(!r.ok)return null;return r.json();
}

function renderAnalysis(data,hist,container){
    const{info,metrics,holdings,sectors,asset_allocation:assets,prepost,description:desc}=data;
    const m=metrics||{};const pp=prepost||{};const h=hist?.data||[];
    let html='';

    // Price + Pre/Post
    html+=`<div class="cd">
        <div class="ph"><div>
            <h2 style="margin-bottom:6px">${esc(info.name)} (${esc(info.symbol)})</h2>
            <div class="pd">
                <span class="pp">${fmtPr(m.current_price)}</span>
                <span class="pc ${pC(m.day_change)}">${pS(m.day_change)}${fmtPr(m.day_change)} (${pS(m.day_change_pct)}${m.day_change_pct?.toFixed(2)||'-'})</span>
            </div>
            ${pp.pre_market_price?`<div style="margin-top:6px;font-size:.85rem;color:var(--txt2)">Pre-Market: <b>${fmtPr(pp.pre_market_price)}</b> <span class="${pC(pp.pre_market_change)}">${pS(pp.pre_market_change)}${fmtP(pp.pre_market_change_pct)}</span></div>`:''}
        </div>
        <div class="pb">
            <button class="btn btn-sm btn-out" onclick="chgP(${q(info.symbol)},'1mo',this)">1M</button>
            <button class="btn btn-sm btn-out" onclick="chgP(${q(info.symbol)},'3mo',this)">3M</button>
            <button class="btn btn-sm btn-out" onclick="chgP(${q(info.symbol)},'6mo',this)">6M</button>
            <button class="btn btn-sm btn-out on" onclick="chgP(${q(info.symbol)},'1y',this)">1Y</button>
            <button class="btn btn-sm btn-out" onclick="chgP(${q(info.symbol)},'2y',this)">2Y</button>
            <button class="btn btn-sm btn-out" onclick="chgP(${q(info.symbol)},'5y',this)">5Y</button>
        </div></div>
        <div style="max-height:380px;position:relative">${h.length?'':'<div id="price-loading" class="ld" style="position:absolute;inset:0;z-index:2"><div class="sp"></div><br>جاري تحميل الرسم...</div>'}<canvas id="ch-price"></canvas></div>
    </div>`;

    // Key Metrics
    html+=`<div class="cd"><h2>المؤشرات الرئيسية</h2><div class="mg">
        <div class="mc"><div class="l">حجم التداول</div><div class="v">${fmtV(m.volume)}</div><div class="s">المتوسط: ${fmtV(m.avg_volume)}</div></div>
        <div class="mc"><div class="l">مكرر الربحية P/E</div><div class="v">${m.trailing_pe||'-'}</div></div>
        <div class="mc"><div class="l">السعر/الدفترية P/B</div><div class="v">${m.price_to_book||'-'}</div></div>
        <div class="mc"><div class="l">نسبة المصاريف</div><div class="v">${fmtP(m.expense_ratio)}</div></div>
        <div class="mc"><div class="l">عائد التوزيعات</div><div class="v">${fmtP(m.dividend_yield)}</div></div>
        <div class="mc"><div class="l">YTD</div><div class="v ${pC(m.ytd_return)}">${pS(m.ytd_return)}${fmtP(m.ytd_return)}</div></div>
        <div class="mc"><div class="l">3 سنوات</div><div class="v ${pC(m.three_year_return)}">${pS(m.three_year_return)}${fmtP(m.three_year_return)}</div></div>
        <div class="mc"><div class="l">5 سنوات</div><div class="v ${pC(m.five_year_return)}">${pS(m.five_year_return)}${fmtP(m.five_year_return)}</div></div>
        <div class="mc"><div class="l">أعلى 52 أسبوع</div><div class="v">${fmtPr(m.week52_high)}</div></div>
        <div class="mc"><div class="l">أدنى 52 أسبوع</div><div class="v">${fmtPr(m.week52_low)}</div></div>
        <div class="mc"><div class="l">MA50</div><div class="v">${fmtPr(m.ma50)}</div></div>
        <div class="mc"><div class="l">MA200</div><div class="v">${fmtPr(m.ma200)}</div></div>
        <div class="mc"><div class="l">بيتا</div><div class="v">${m.beta||'-'}</div></div>
        <div class="mc"><div class="l">NAV</div><div class="v">${fmtPr(m.nav)}</div></div>
    </div></div>`;

    // Fund Info + Description
    html+=`<div class="cd"><h2>معلومات الصندوق</h2><div class="ig">
        <div class="ii"><div class="l">الشركة</div><div class="v">${esc(info.provider||'-')}</div></div>
        <div class="ii"><div class="l">الفئة</div><div class="v">${esc(info.category||'-')}</div></div>
        <div class="ii"><div class="l">الأصول</div><div class="v">${fmtN(info.aum)}</div></div>
        <div class="ii"><div class="l">التأسيس</div><div class="v">${fmtD(info.inception_date)}</div></div>
    </div>
    ${desc?.description?`<h3 style="margin-top:14px">وصف الصندوق</h3><p class="desc-text">${esc(desc.description)}</p>`:''}
    </div>`;

    // Slower composition data is filled asynchronously so it never blocks the
    // first useful result.
    html+=`<div id="composition-slot"><div class="cd"><h2>مكونات الصندوق</h2><div class="ld"><div class="sp"></div><br>جاري تحميل المراكز والقطاعات...</div></div></div>`;

    // Holdings Table + Chart (kept for compatibility with non-deferred payloads)
    if(holdings.length){
        html+=`<div class="cd"><h2>أعلى ${holdings.length} مراكز</h2>
        <table><thead><tr><th>#</th><th>الرمز</th><th>الاسم</th><th>النسبة</th></tr></thead><tbody>`;
        holdings.forEach((h,i)=>{html+=`<tr><td>${i+1}</td><td style="direction:ltr;text-align:left;font-weight:700;color:var(--blue)">${esc(h.symbol)}</td><td>${esc(h.name)}</td><td>${h.weight.toFixed(2)}%</td></tr>`});
        html+='</tbody></table></div>';
        const ch=Math.max(280,holdings.length*26);
        html+=`<div class="cd"><h2>توزيع المراكز</h2><div class="cc"><canvas id="ch-hold"></canvas></div></div>`;
    }

    // Sector + Asset charts
    const hasS=Object.keys(sectors).length>0,hasA=Object.keys(assets).length>0;
    if(hasS||hasA){
        const sH=Math.max(260,Object.keys(sectors).length*26);
        html+='<div class="cd"><div class="cr">';
        if(hasS)html+=`<div><h3>القطاعات</h3><div style="height:${sH}px"><canvas id="ch-sec"></canvas></div></div>`;
        if(hasA)html+=`<div><h3>توزيع الأصول</h3><div class="cc"><canvas id="ch-ast"></canvas></div></div>`;
        html+='</div></div>';
    }

    // Technical Indicators (lazy load)
    html+=`<div class="cd" id="tech-section">
        <h2>المؤشرات الفنية</h2>
        <div class="pb" style="margin-bottom:14px">
            <button class="btn btn-sm btn-out" onclick="loadTech(${q(info.symbol)},'6mo',this)">6M</button>
            <button class="btn btn-sm btn-out on" onclick="loadTech(${q(info.symbol)},'1y',this)">1Y</button>
            <button class="btn btn-sm btn-out" onclick="loadTech(${q(info.symbol)},'2y',this)">2Y</button>
        </div>
        <div id="tech-content"><div class="ld"><div class="sp"></div></div></div>
    </div>`;

    // Risk Metrics (lazy load)
    html+=`<div class="cd" id="risk-section"><h2>مؤشرات المخاطر</h2><div id="risk-content"><div class="ld"><div class="sp"></div></div></div></div>`;

    // Dividends (lazy load)
    html+=`<div class="cd" id="div-section"><h2>التوزيعات</h2><div id="div-content"><div class="ld"><div class="sp"></div></div></div></div>`;

    // News (lazy load)
    html+=`<div class="cd" id="news-section"><h2>الأخبار</h2><div id="news-content"><div class="ld"><div class="sp"></div></div></div></div>`;

    // Action buttons
    html+=`<div class="cd" style="text-align:center">
        <button class="btn btn-green" onclick="addToWatchlistDirect(${q(info.symbol)})">إضافة للمتابعة</button>
        <button class="btn btn-orange" style="margin-right:8px" onclick="window.print()">طباعة التقرير</button>
    </div>`;

    container.innerHTML=html;

    // Render charts
    if(h.length)renderPrice('ch-price',h,info.symbol);
    if(holdings.length){
        try{
            const labels=holdings.map(h=>h.symbol);
            const data=holdings.map(h=>h.weight);
            const names=holdings.map(h=>h.name);
            const PALETTE=[
                '#FF4D6A','#FF8C42','#FFD166','#06D6A0','#118AB2',
                '#7B2FF7','#F72585','#4CC9F0','#F15BB5','#00F5D4',
                '#FB5607','#FF006E','#8338EC','#3A86FF','#FFBE0B',
                '#FF595E','#FFCA3C','#8AC926','#1982C4','#6A4C93',
                '#E63946','#457B9D','#2A9D8F','#E9C46A','#F4A261'
            ];
            const colors=data.map((_,i)=>PALETTE[i%PALETTE.length]);
            const holdCanvas=document.getElementById('ch-hold');
            if(holdCanvas){
                holdCanvas.parentElement.style.height='420px';
                holdCanvas.parentElement.style.maxHeight='420px';
                destroyChart('hold');
                const fullLabels=labels.map((l,i)=>l+'  '+data[i].toFixed(2)+'%');
                charts.hold=new Chart(holdCanvas.getContext('2d'),{type:'doughnut',data:{labels:fullLabels,datasets:[{data,backgroundColor:colors,borderColor:'#ffffff',borderWidth:2,hoverBorderColor:'#1a1f2b',hoverBorderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:'40%',layout:{padding:10},plugins:{legend:{position:'right',labels:{color:'#1a1f2b',padding:6,font:{size:12,weight:'700'},usePointStyle:true,pointStyle:'rectRounded',boxWidth:14,boxHeight:14}},tooltip:{backgroundColor:'#f1f3f6',titleColor:'#1a1f2b',bodyColor:'#1a1f2b',borderColor:'#e3e6eb',borderWidth:1,padding:14,cornerRadius:10,callbacks:{title:c=>labels[c.dataIndex],label:c=>'  '+names[c.dataIndex]+'  '+c.parsed.toFixed(2)+'%'}}}}});
            }
        }catch(e){console.error('Holdings chart error:',e)}
    }
    if(hasS){
        try{
            const se=Object.entries(sectors).sort((a,b)=>b[1]-a[1]);
            const sLabels=se.map(e=>e[0]);
            const sData=se.map(e=>e[1]);
            const secCanvas=document.getElementById('ch-sec');
            if(secCanvas){
                destroyChart('sec');
                const ctx=secCanvas.getContext('2d');
                const gradient=ctx.createLinearGradient(0,0,secCanvas.width,0);
                gradient.addColorStop(0,'#15803d');
                gradient.addColorStop(1,'#2563eb');
                charts.sec=new Chart(ctx,{type:'bar',data:{labels:sLabels,datasets:[{data:sData,backgroundColor:gradient,borderRadius:3,borderSkipped:false,barThickness:16}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',scales:{x:{ticks:{color:'#5b6472',callback:v=>v+'%'},grid:{color:'rgba(15,23,42,.05)'},border:{display:false}},y:{ticks:{color:'#1a1f2b',font:{size:11}},grid:{display:false}}},plugins:{legend:{display:false},tooltip:{backgroundColor:'#f1f3f6',titleColor:'#1a1f2b',bodyColor:'#5b6472',borderColor:'#e3e6eb',borderWidth:1,padding:10,cornerRadius:8,callbacks:{label:c=>'  '+c.parsed.x.toFixed(2)+'%'}}}}});
            }
        }catch(e){console.error('Sector chart error:',e)}
    }
    if(hasA){
        try{
            const astCanvas=document.getElementById('ch-ast');
            if(astCanvas){
                destroyChart('ast');
                charts.ast=new Chart(astCanvas.getContext('2d'),{type:'doughnut',data:{labels:Object.keys(assets),datasets:[{data:Object.values(assets),backgroundColor:COLORS.slice(0,Object.keys(assets).length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{position:'bottom',labels:{color:'#5b6472',padding:12,font:{size:11}}}}}});
            }
        }catch(e){console.error('Asset chart error:',e)}
    }

    // Load expensive secondary sections only when the user scrolls near them.
    // This keeps the first ETF result responsive and avoids four extra Yahoo
    // requests competing with the initial analysis.
    setupLazyExtras(info.symbol);
}

function renderComposition(comp){
    const slot=document.getElementById('composition-slot');if(!slot)return;
    const holdings=comp?.holdings||[],sectors=comp?.sectors||{},assets=comp?.asset_allocation||{};
    const hasS=Object.keys(sectors).length>0,hasA=Object.keys(assets).length>0;
    let html='';
    if(holdings.length){
        html+=`<div class="cd"><h2>أعلى ${holdings.length} مراكز</h2><table><thead><tr><th>#</th><th>الرمز</th><th>الاسم</th><th>النسبة</th></tr></thead><tbody>`;
        holdings.forEach((h,i)=>{html+=`<tr><td>${i+1}</td><td style="direction:ltr;text-align:left;font-weight:700;color:var(--blue)">${esc(h.symbol)}</td><td>${esc(h.name)}</td><td>${Number(h.weight||0).toFixed(2)}%</td></tr>`});
        html+='</tbody></table></div><div class="cd"><h2>توزيع المراكز</h2><div class="cc"><canvas id="ch-hold-lazy"></canvas></div></div>';
    }
    if(hasS||hasA){
        const sH=Math.max(260,Object.keys(sectors).length*26);
        html+='<div class="cd"><div class="cr">';
        if(hasS)html+=`<div><h3>القطاعات</h3><div style="height:${sH}px"><canvas id="ch-sec-lazy"></canvas></div></div>`;
        if(hasA)html+=`<div><h3>توزيع الأصول</h3><div class="cc"><canvas id="ch-ast-lazy"></canvas></div></div>`;
        html+='</div></div>';
    }
    if(!html)html='<div class="cd"><h2>مكونات الصندوق</h2><p style="color:var(--txt2)">لا توجد بيانات مكونات متاحة لهذا الصندوق.</p></div>';
    slot.innerHTML=html;

    // Chart.js may still be loading from the CDN. Tables remain usable either way.
    if(typeof Chart==='undefined')return;
    if(holdings.length){
        const canvas=document.getElementById('ch-hold-lazy');
        if(canvas){
            const labels=holdings.map(h=>h.symbol),data=holdings.map(h=>Number(h.weight||0)),names=holdings.map(h=>h.name);
            const palette=['#FF4D6A','#FF8C42','#FFD166','#06D6A0','#118AB2','#2563EB','#F72585','#4CC9F0','#F15BB5','#00F5D4','#FB5607','#FF006E','#3A86FF','#FFBE0B'];
            canvas.parentElement.style.height='420px';destroyChart('holdLazy');
            charts.holdLazy=new Chart(canvas.getContext('2d'),{type:'doughnut',data:{labels:labels.map((l,i)=>l+'  '+data[i].toFixed(2)+'%'),datasets:[{data,backgroundColor:data.map((_,i)=>palette[i%palette.length]),borderColor:'#ffffff',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:'40%',plugins:{legend:{position:'right',labels:{color:'#1a1f2b',padding:6,font:{size:12,weight:'700'}}},tooltip:{callbacks:{title:c=>labels[c[0].dataIndex],label:c=>'  '+names[c.dataIndex]+'  '+c.parsed.toFixed(2)+'%'}}}}});
        }
    }
    if(hasS){
        const canvas=document.getElementById('ch-sec-lazy');if(canvas){
            const se=Object.entries(sectors).sort((a,b)=>b[1]-a[1]),labels=se.map(x=>x[0]),data=se.map(x=>x[1]);destroyChart('secLazy');
            charts.secLazy=new Chart(canvas.getContext('2d'),{type:'bar',data:{labels,datasets:[{data,backgroundColor:'#15803d',borderRadius:3,barThickness:16}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',scales:{x:{ticks:{color:'#5b6472',callback:v=>v+'%'},grid:{color:'rgba(15,23,42,.05)'}},y:{ticks:{color:'#1a1f2b'},grid:{display:false}}},plugins:{legend:{display:false}}}});
        }
    }
    if(hasA){
        const canvas=document.getElementById('ch-ast-lazy');if(canvas){destroyChart('astLazy');charts.astLazy=new Chart(canvas.getContext('2d'),{type:'doughnut',data:{labels:Object.keys(assets),datasets:[{data:Object.values(assets),backgroundColor:COLORS.slice(0,Object.keys(assets).length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{position:'bottom',labels:{color:'#5b6472'}}}}});}
    }
}

let extraObserver=null;
function setupLazyExtras(sym){
    if(extraObserver){extraObserver.disconnect();extraObserver=null}
    const jobs=new Map([
        ['tech-section',()=>loadTech(sym,'1y',null)],
        ['risk-section',()=>loadRisk(sym)],
        ['div-section',()=>loadDiv(sym)],
        ['news-section',()=>loadNews(sym)],
    ]);
    if(!('IntersectionObserver' in window)){jobs.forEach(fn=>fn());return}
    extraObserver=new IntersectionObserver((entries,observer)=>{
        entries.forEach(entry=>{
            if(!entry.isIntersecting)return;
            const fn=jobs.get(entry.target.id);
            if(fn){jobs.delete(entry.target.id);observer.unobserve(entry.target);fn()}
        });
        if(!jobs.size){observer.disconnect();extraObserver=null}
    },{rootMargin:'80px 0px'});
    jobs.forEach((_,id)=>{const el=document.getElementById(id);if(el)extraObserver.observe(el)});
}

async function loadTech(sym,period,btn){
    if(btn){document.querySelectorAll('#tech-section .btn-sm').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}
    const el=document.getElementById('tech-content');if(!el)return;
    try{
        const r=await fetch(`/api/technical/${sym}?period=${period}`);
        if(!r.ok){el.innerHTML='<p>لا توجد بيانات</p>';return}
        const d=await r.json();
        if(d.error){el.innerHTML='<p>'+d.error+'</p>';return}

        let html='';
        if(d.current_rsi!=null){
            const rsiClass=d.current_rsi>70?'neg':d.current_rsi<30?'pos':'';
            const rsiLabel=d.current_rsi>70?'تشبع شرائي':d.current_rsi<30?'تشبع بيعي':'محايد';
            html+=`<div class="mg" style="margin-bottom:14px">
                <div class="mc"><div class="l">RSI (14)</div><div class="v ${rsiClass}">${d.current_rsi}</div><div class="s">${rsiLabel}</div></div>
            </div>`;
        }
        html+=`<div style="max-height:350px"><canvas id="ch-tech"></canvas></div>`;
        el.innerHTML=html;

        const techCanvas=document.getElementById('ch-tech');
        if(techCanvas){
            destroyChart('tech');
            charts.tech=new Chart(techCanvas.getContext('2d'),{type:'line',data:{labels:d.dates,datasets:[
                {label:'السعر',data:d.close,borderColor:'#2563eb',fill:false,tension:.3,pointRadius:0,borderWidth:2},
                {label:'SMA20',data:d.sma20,borderColor:'#15803d',fill:false,tension:.3,pointRadius:0,borderWidth:1.5,borderDash:[5,3]},
                {label:'SMA50',data:d.sma50,borderColor:'#c2410c',fill:false,tension:.3,pointRadius:0,borderWidth:1.5,borderDash:[5,3]},
                {label:'BB Upper',data:d.bb_upper,borderColor:'rgba(167,139,250,.4)',fill:false,tension:.3,pointRadius:0,borderWidth:1},
                {label:'BB Lower',data:d.bb_lower,borderColor:'rgba(167,139,250,.4)',fill:'-1',backgroundColor:'rgba(167,139,250,.06)',tension:.3,pointRadius:0,borderWidth:1},
            ]},options:{responsive:true,maintainAspectRatio:true,scales:{x:{ticks:{color:'#5b6472',maxTicksLimit:8,maxRotation:0},grid:{display:false}},y:{ticks:{color:'#5b6472',callback:v=>'$'+v},grid:{color:'rgba(15,23,42,.05)'}}},plugins:{legend:{labels:{color:'#5b6472',padding:12,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': $'+c.parsed.y.toFixed(2)}}},interaction:{intersect:false,mode:'index'}}});
        }
    }catch(e){console.error('Tech chart error:',e);el.innerHTML='<p>خطأ في تحميل البيانات</p>'}
}

async function loadRisk(sym){
    const el=document.getElementById('risk-content');if(!el)return;
    const r=await fetch(`/api/risk/${sym}?period=3y`);
    if(!r.ok){el.innerHTML='<p>لا توجد بيانات</p>';return}
    const d=await r.json();
    el.innerHTML=`<div class="mg">
        <div class="mc"><div class="l">التذبذب السنوي</div><div class="v">${fmtP(d.volatility)}</div></div>
        <div class="mc"><div class="l">Annualized Return</div><div class="v ${pC(d.annualized_return)}">${pS(d.annualized_return)}${fmtP(d.annualized_return)}</div></div>
        <div class="mc"><div class="l">Sharpe Ratio</div><div class="v">${d.sharpe_ratio}</div></div>
        <div class="mc"><div class="l">Sortino Ratio</div><div class="v">${d.sortino_ratio}</div></div>
        <div class="mc"><div class="l">أقصى انخفاض</div><div class="v neg">-${fmtP(d.max_drawdown)}</div></div>
        <div class="mc"><div class="l">الانخفاض الحالي</div><div class="v neg">-${fmtP(d.current_drawdown)}</div></div>
        <div class="mc"><div class="l">العائد الكلي (3 سنوات)</div><div class="v ${pC(d.total_return)}">${pS(d.total_return)}${fmtP(d.total_return)}</div></div>
    </div>`;
}

async function loadDiv(sym){
    const el=document.getElementById('div-content');if(!el)return;
    const r=await fetch(`/api/dividends/${sym}`);
    if(!r.ok){el.innerHTML='<p>لا توجد بيانات</p>';return}
    const d=await r.json();
    const divs=d.dividends||[];
    if(!divs.length){el.innerHTML='<p>لا توجد توزيعات</p>';return}
    const totalYear=divs.filter(x=>x.date>=new Date().getFullYear()+'-01-01').reduce((s,x)=>s+x.amount,0);
    const totalAll=divs.reduce((s,x)=>s+x.amount,0);
    let html=`<div class="div-summary">
        <div class="div-card"><div class="l">إجمالي هذا العام</div><div class="v">$${totalYear.toFixed(4)}</div></div>
        <div class="div-card"><div class="l">عدد التوزيعات</div><div class="v">${divs.length}</div></div>
    </div>`;
    html+='<div style="max-height:300px;overflow-y:auto"><table><thead><tr><th>التاريخ</th><th>المبلغ</th></tr></thead><tbody>';
    divs.slice(0,20).forEach(d=>{html+=`<tr><td>${esc(d.date)}</td><td>$${d.amount.toFixed(4)}</td></tr>`});
    html+='</tbody></table></div>';
    el.innerHTML=html;
}

async function loadNews(sym){
    const el=document.getElementById('news-content');if(!el)return;
    const r=await fetch(`/api/news/${sym}`);
    if(!r.ok){el.innerHTML='<p>لا توجد أخبار</p>';return}
    const d=await r.json();
    const news=d.news||[];
    if(!news.length){el.innerHTML='<p>لا توجد أخبار حالياً</p>';return}
    let html='';
    news.forEach(n=>{
        html+=`<div class="news-item" ${safeUrl(n.url)?`onclick="window.open(${q(safeUrl(n.url))},'_blank','noopener')" style="cursor:pointer"`:''}>
            <div class="news-title">${esc(n.title)}</div>
            <div class="news-meta">${esc(n.publisher)} ${n.published?'• '+new Date(n.published).toLocaleDateString('ar-SA'):''}</div>
            ${n.summary?`<div class="news-summary">${esc(n.summary.substring(0,200))}${n.summary.length>200?'...':''}</div>`:''}
        </div>`;
    });
    el.innerHTML=html;
}

function renderPrice(id,data,sym){
    destroyChart('price');
    const canvas=document.getElementById(id);
    if(!canvas){console.error('Canvas not found:',id);return}
    const ctx=canvas.getContext('2d');
    if(!ctx){console.error('Cannot get context');return}
    if(!data||!data.length){console.error('No data');return}

    const prices=data.map(d=>d.close);
    const isUp=prices[prices.length-1]>=prices[0];
    const lineColor=isUp?'#15803d':'#dc2626';
    const fillColor=isUp?'rgba(21,128,61,.1)':'rgba(220,38,38,.1)';

    try{
        charts.price=new Chart(ctx,{type:'line',data:{labels:data.map(d=>d.date),datasets:[{label:sym,data:prices,borderColor:lineColor,backgroundColor:fillColor,fill:true,tension:.3,pointRadius:0,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:true,animation:{duration:600},scales:{x:{ticks:{color:'#5b6472',maxTicksLimit:8,maxRotation:0,autoSkip:true},grid:{display:false}},y:{ticks:{color:'#5b6472',callback:v=>'$'+v},grid:{color:'rgba(15,23,42,.05)'}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'$'+c.parsed.y.toFixed(2)}}},interaction:{intersect:false,mode:'index'}}});
    }catch(e){console.error('Chart error:',e)}
}

async function chgP(sym,p,btn){
    document.querySelectorAll('.pb .btn-sm').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    try{
        const r=await fetch(`/api/history/${sym}?period=${p}`);
        if(r.ok){
            const d=await r.json();
            if(d.data&&d.data.length>0){
                renderPrice('ch-price',d.data,sym);
            }else{
                console.error('No data in response');
            }
        }else{
            console.error('Fetch error:',r.status);
        }
    }catch(e){console.error('chgP error:',e)}
}
