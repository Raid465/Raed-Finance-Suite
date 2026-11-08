// Saudi mutual funds search, analysis and stats.
// === Mutual Funds (صناديق الاستثمار العامة) ===
let fundsPage=1;
let fundsFilters={};

function fundsSubtab(t){
    document.querySelectorAll('#pn-funds .sub-tab').forEach((b,i)=>{b.classList.toggle('on',['list','analyze','stats'][i]===t)});
    document.querySelectorAll('#pn-funds .sub-pn').forEach(p=>p.classList.remove('on'));
    document.getElementById('funds-'+t).classList.add('on');
    if(t==='stats')loadFundsStats();
    if(t==='list')populateFundsDropdown();
}

async function searchFunds(page=1){
    fundsPage=page;
    const search=document.getElementById('funds-search')?.value||'';
    const currency=document.getElementById('funds-currency')?.value||'';
    const objective=document.getElementById('funds-objective')?.value||'';
    const sort=document.getElementById('funds-sort')?.value||'nav-desc';
    const [sort_by,sort_order]=sort.split('-');

    const params=new URLSearchParams({page,page_size:50,sort_by,sort_order});
    if(search)params.set('search',search);
    if(currency)params.set('currency',currency);
    if(objective)params.set('objective',objective);

    const el=document.getElementById('funds-table-wrap');
    el.innerHTML='<div class="ld"><div class="sp"></div></div>';

    try{
        const r=await fetch('/api/mutual-funds?'+params);
        const d=await r.json();

        // Populate filter dropdowns on first load
        if(d.filters&&!fundsFilters.currencies){
            fundsFilters=d.filters;
            const curSel=document.getElementById('funds-currency');
            const objSel=document.getElementById('funds-objective');
            if(curSel){
                curSel.innerHTML='<option value="">All currencies</option>';
                d.filters.currencies.forEach(c=>{if(c){const o=document.createElement('option');o.value=c;o.textContent=c;curSel.appendChild(o)}});
            }
            if(objSel){
                objSel.innerHTML='<option value="">All objectives</option>';
                d.filters.objectives.forEach(o=>{if(o){const opt=document.createElement('option');opt.value=o;opt.textContent=o;objSel.appendChild(opt)}});
            }
        }

        document.getElementById('funds-count').textContent=`(${d.total} صندوق)`+(d.data_as_of?` · البيانات حتى ${d.data_as_of}`:'');

        let html='<table><thead><tr><th>الرمز</th><th>اسم الصندوق</th><th>مدير الصندوق</th><th>العملية</th><th>صافي القيمة</th><th>سعر الوحدة</th><th>التغير السنوي</th><th>التاريخ</th><th></th></tr></thead><tbody>';
        d.funds.forEach(f=>{
            const ytd=parseFloat(f.ytdChange)||0;
            const ytdClass=ytd>=0?'pos':'neg';
            const nav=parseFloat(f.nav?.replace(/,/g,''))||0;
            html+=`<tr>
                <td style="font-weight:700;color:var(--blue);direction:ltr">${esc(f.symbol)}</td>
                <td style="max-width:250px" data-no-translate>${esc(f.name)}</td>
                <td style="font-size:.82rem" data-no-translate>${esc(f.fundManager)}</td>
                <td style="font-size:.82rem">${esc(f.currency)}</td>
                <td>${fmtV(nav)}</td>
                <td>${f.unitPrice}</td>
                <td class="${ytdClass}">${ytd>=0?'+':''}${f.ytdChange}%</td>
                <td style="font-size:.82rem">${esc(f.valuationDate)}</td>
                <td><button class="btn btn-sm btn-out" onclick="document.getElementById('funds-analyze-sym').value=${q(f.symbol)};fundsSubtab('analyze');analyzeFund()">Analyze</button></td>
            </tr>`;
        });
        html+='</tbody></table>';
        el.innerHTML=html;

        // Pagination
        const pgEl=document.getElementById('funds-pagination');
        let pgHtml='';
        if(d.total_pages>1){
            if(d.page>1)pgHtml+=`<button class="btn btn-sm" onclick="searchFunds(${d.page-1})">السابق</button>`;
            const start=Math.max(1,d.page-2);
            const end=Math.min(d.total_pages,d.page+2);
            for(let i=start;i<=end;i++){
                pgHtml+=`<button class="btn btn-sm ${i===d.page?'btn-on':''}" onclick="searchFunds(${i})">${i}</button>`;
            }
            if(d.page<d.total_pages)pgHtml+=`<button class="btn btn-sm" onclick="searchFunds(${d.page+1})">التالي</button>`;
        }
        pgEl.innerHTML=pgHtml;
    }catch(e){el.innerHTML='<p>خطأ في التحميل</p>'}
}

let allFundsList=[];

async function populateFundsDropdown(){
    if(allFundsList.length>0)return;
    try{
        const r=await fetch('/api/mutual-funds?page=1&page_size=400&sort_by=name&sort_order=asc');
        const d=await r.json();
        allFundsList=d.funds||[];
        const dl=document.getElementById('funds-options');
        if(!dl)return;
        dl.innerHTML='';
        allFundsList.forEach(f=>{
            const opt=document.createElement('option');
            opt.value=f.symbol;
            opt.textContent=f.symbol+' - '+f.name;
            dl.appendChild(opt);
        });
    }catch(e){}
}

async function analyzeFund(){
    const sym=document.getElementById('funds-analyze-sym')?.value?.trim();
    if(!sym){showErr('اكتب رمز الصندوق');return}
    hideErr();
    const el=document.getElementById('funds-analyze-res');
    el.innerHTML='<div class="ld"><div class="sp"></div><br>Loading...</div>';
    try{
        const r=await fetch('/api/mutual-funds/'+sym);
        if(!r.ok){const e=await r.json();throw new Error(e.detail||'الصندوق غير موجود')}
        const f=await r.json();
        const nav=parseFloat(f.nav?.replace(/,/g,''))||0;
        const unitPrice=parseFloat(f.unitPrice)||0;
        const ytd=parseFloat(f.ytdChange)||0;
        const ytdClass=ytd>=0?'pos':'neg';
        const ytdSign=ytd>=0?'+':'';

        // Calculate derived metrics
        const isSAR=f.currency.includes('ريال');
        const isUSD=f.currency.includes('دولار');
        const currencySymbol=isSAR?'ر.س':isUSD?'$':f.currency;
        const isSharia=f.shariaCompliant.includes('موافق');

        let html=`<div class="cd">
            <h2 data-no-translate>${esc(f.name)}</h2>
            <div class="pd">
                <span class="pp">${unitPrice.toFixed(4)} ${currencySymbol}</span>
                <span class="pc ${ytdClass}">${ytdSign}${f.ytdChange}% من بداية العام</span>
            </div>
        </div>`;

        // Fund Info Cards
        html+=`<div class="cd"><h2>معلومات الصندوق</h2><div class="mg">
            <div class="mc"><div class="l">الرمز</div><div class="v" style="direction:ltr">${esc(f.symbol)}</div></div>
            <div class="mc"><div class="l">مدير الصندوق</div><div class="v" data-no-translate>${esc(f.fundManager)}</div></div>
            <div class="mc"><div class="l">العملة</div><div class="v">${esc(f.currency)}</div></div>
            <div class="mc"><div class="l">التوافق الشرعي</div><div class="v" style="color:${isSharia?'var(--green)':'var(--red)'}">${f.shariaCompliant}</div></div>
            <div class="mc"><div class="l">هدف الصندوق</div><div class="v">${esc(f.objective)}</div></div>
            <div class="mc"><div class="l">تاريخ التقييم</div><div class="v">${esc(f.valuationDate)}</div></div>
        </div></div>`;

        // Financial Info
        html+=`<div class="cd"><h2>المعلومات المالية</h2><div class="mg">
            <div class="mc"><div class="l">صافي قيمة الأصول</div><div class="v">${fmtV(nav)} ${currencySymbol}</div></div>
            <div class="mc"><div class="l">سعر الوحدة</div><div class="v">${unitPrice.toFixed(4)} ${currencySymbol}</div></div>
            <div class="mc"><div class="l">التغير عن بداية العام</div><div class="v ${ytdClass}">${ytdSign}${f.ytdChange}%</div></div>
        </div></div>`;

        // Holdings / Investment Profile
        let fundHoldings=[];
        try{
            const hr=await fetch(`/api/mutual-funds/${sym}/holdings`);
            if(hr.ok){const hd=await hr.json();fundHoldings=hd.holdings||[]}
        }catch(_){}
        let fundDivData={};
        try{
            const dr=await fetch(`/api/saudi/dividends/${sym}`);
            if(dr.ok)fundDivData=await dr.json();
        }catch(_){}

        html+=`<div class="cd"><h2>تحليل الأصول والاستثمار</h2>`;
        html+=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px">
            <div class="mc" style="border-right:3px solid var(--blue)"><div class="l">الفئة الاستثمارية</div><div class="v" style="font-size:1.1rem">${esc(f.objective)}</div></div>
            <div class="mc" style="border-right:3px solid var(--green)"><div class="l">العملة</div><div class="v" style="font-size:1.1rem">${esc(f.currency)}</div></div>
            <div class="mc" style="border-right:3px solid ${isSharia?'var(--green)':'var(--red)'}"><div class="l">التوافق الشرعي</div><div class="v" style="font-size:1.1rem">${f.shariaCompliant}</div></div>
            <div class="mc" style="border-right:3px solid var(--blue)"><div class="l">مدير الصندوق</div><div class="v" style="font-size:1rem" data-no-translate>${esc(f.fundManager)}</div></div>
        </div>`;

        if(fundHoldings.length>0){
            const fcolors=['#2563eb','#15803d','#c2410c','#dc2626','#2563eb','#b45309','#3b82f6','#f472b6','#2dd4bf','#e879f9','#818cf8','#16a34a'];
            html+=`<div style="margin-top:16px">
                <div style="color:var(--txt2);margin-bottom:10px;font-size:.9rem">أكبر الاستثمارات (${fundHoldings.length} عنصر)</div>
                <div style="max-height:350px;margin-bottom:16px"><canvas id="ch-fund-holdings"></canvas></div>
                <div style="overflow-x:auto"><table><thead><tr><th>#</th><th>السهم</th><th>الوزن</th><th>الرسم</th></tr></thead><tbody>`;
            fundHoldings.forEach((h,i)=>{
                const bc=fcolors[i%fcolors.length];
                html+=`<tr>
                    <td style="color:var(--txt2)">${i+1}</td>
                    <td style="font-weight:600">${esc(h.name)} <span style="color:var(--txt2);font-size:.8rem;direction:ltr;display:inline-block">${esc(h.symbol)}</span></td>
                    <td style="direction:ltr;text-align:right;font-weight:700;color:var(--blue)">${h.weight?.toFixed(1)}%</td>
                    <td style="width:40%"><div style="background:var(--bg2);border-radius:4px;height:20px;overflow:hidden">
                        <div style="background:${bc};height:100%;width:${h.weight}%;transition:width .5s"></div>
                    </div></td>
                </tr>`;
            });
            html+=`</tbody></table></div></div>`;
        }else{
            const isEquity = f.objective.includes('تنمية');
            const isDebt = f.objective.includes('سندات') || f.objective.includes('صكوك');
            const isMoneyMarket = f.objective.includes('نقد') || f.objective.includes('سيولة');
            let pctEquity=0, pctDebt=0, pctCash=0;
            if(isEquity){pctEquity=80;pctCash=20}
            else if(isDebt){pctDebt=70;pctCash=30}
            else if(isMoneyMarket){pctCash=100}
            else{pctEquity=50;pctDebt=30;pctCash=20}
            html+=`<div style="margin-top:16px">
                <div style="color:var(--txt2);margin-bottom:10px;font-size:.9rem">التوزيع التقديري للأصول</div>
                <div style="position:relative;height:35px;background:var(--bg2);border-radius:var(--r);overflow:hidden;display:flex">`;
            if(pctEquity>0) html+=`<div style="width:${pctEquity}%;background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:600;color:#fff">${pctEquity>10?pctEquity+'% أسهم':''}</div>`;
            if(pctDebt>0) html+=`<div style="width:${pctDebt}%;background:var(--green);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:600;color:#fff">${pctDebt>10?pctDebt+'% سندات':''}</div>`;
            if(pctCash>0) html+=`<div style="width:${pctCash}%;background:var(--orange);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:600;color:#fff">${pctCash>10?pctCash+'% نقد':''}</div>`;
            html+=`</div></div>`;
            html+=`<div style="margin-top:14px;padding:10px;background:rgba(37,99,235,.08);border-radius:var(--r);font-size:.82rem;color:var(--txt2)">
                ℹ️ بيانات الأصول الفعلية غير متوفرة لهذا الصندوق. التوزيع أعلاه تقديري.
            </div>`;
        }
        html+=`</div>`;

        // Fund Dividends
        const hasDivs=fundDivData.distributions&&fundDivData.distributions.length>0;
        const yldClass=fundDivData.annualYield>=4?'pos':fundDivData.annualYield>=2?'':'neg';
        html+=`<div class="cd"><h2>التوزيعات السنوية</h2>`;
        if(hasDivs){
            html+=`<div class="mg" style="margin-bottom:16px">
                <div class="mc" style="border-right:3px solid var(--green)"><div class="l">العائد السنوي</div><div class="v ${yldClass}" style="font-size:1.4rem;font-weight:700">${fundDivData.annualYield.toFixed(1)}%</div></div>
                <div class="mc" style="border-right:3px solid var(--blue)"><div class="l">عدد التوزيعات/سنة</div><div class="v" style="font-size:1.4rem;font-weight:700">${fundDivData.dividendsPerYear}</div></div>
            </div>
            <div style="overflow-x:auto"><table><thead><tr><th>التاريخ</th><th>المبلغ للوحدة</th><th>النوع</th></tr></thead><tbody>`;
            fundDivData.distributions.slice(0,12).forEach(dist=>{
                const isRepeat=fundDivData.distributions.filter(d=>Math.abs(d.amount-dist.amount)<0.001).length>1;
                html+=`<tr>
                    <td style="direction:ltr">${esc(dist.date)}</td>
                    <td style="font-weight:700;color:var(--green)">${dist.amount.toFixed(4)} ${currencySymbol}</td>
                    <td>${esc(dist.type)}${isRepeat?' <span style="background:rgba(180,83,9,.15);color:#b45309;padding:2px 8px;border-radius:10px;font-size:.75rem">مكرر</span>':''}</td>
                </tr>`;
            });
            html+=`</tbody></table></div>`;
            if(fundDivData.distributions.length>12) html+=`<div style="color:var(--txt2);font-size:.8rem;margin-top:8px">عرض آخر 12 توزيعة من أصل ${fundDivData.distributions.length}</div>`;
        }else{
            html+=`<div style="text-align:center;padding:20px;color:var(--txt2)">
                <div style="font-size:2rem;margin-bottom:8px">💰</div>
                <div>لا توجد بيانات توزيعات متاحة لهذا الصندوق</div>
            </div>`;
        }
        html+=`</div>`;

        // Performance visualization
        html+=`<div class="cd"><h2>أداء الصندوق</h2>
            <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
                <div style="flex:1;min-width:200px">
                    <div style="color:var(--txt2);margin-bottom:8px">الأداء من بداية العام</div>
                    <div style="position:relative;height:30px;background:var(--bg2);border-radius:var(--r);overflow:hidden">
                        <div style="position:absolute;top:0;left:0;height:100%;width:${Math.min(Math.abs(ytd),100)}%;background:${ytd>=0?'var(--green)':'var(--red)'};border-radius:var(--r);transition:width .5s"></div>
                        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-weight:700;color:#fff;z-index:1">${ytdSign}${f.ytdChange}%</div>
                    </div>
                </div>
                <div style="flex:1;min-width:200px">
                    <div style="color:var(--txt2);margin-bottom:8px">حجم الأصول</div>
                    <div style="font-size:1.8rem;font-weight:700;color:var(--blue)">${fmtV(nav)}</div>
                    <div style="color:var(--txt2);font-size:.85rem">${currencySymbol}</div>
                </div>
            </div>
        </div>`;

        // Comparison with market context
        const avgYtd=3.5;
        const vsMarket=ytd-avgYtd;
        const vsMarketClass=vsMarket>=0?'pos':'neg';
        html+=`<div class="cd"><h2>مقارنة مع السوق</h2><div class="mg">
            <div class="mc"><div class="l">أداء الصندوق</div><div class="v ${ytdClass}">${ytdSign}${f.ytdChange}%</div></div>
            <div class="mc"><div class="l">متوسط السوق (تقديري)</div><div class="v">${avgYtd>=0?'+':''}${avgYtd}%</div></div>
            <div class="mc"><div class="l">الفرق عن السوق</div><div class="v ${vsMarketClass}">${vsMarket>=0?'+':''}${vsMarket.toFixed(2)}%</div></div>
        </div></div>`;

        // Investment Rating based on data
        let rating='';
        let ratingColor='';
        let ratingDesc='';
        if(ytd>10){rating='ممتاز';ratingColor='var(--green)';ratingDesc='أداء ممتاز من بداية العام'}
        else if(ytd>5){rating='جيد جداً';ratingColor='var(--green)';ratingDesc='أداء جيد جداً'}
        else if(ytd>0){rating='جيد';ratingColor='var(--blue)';ratingDesc='أداء إيجابي'}
        else if(ytd>-5){rating='متوسط';ratingColor='var(--orange)';ratingDesc='أداء متوسط'}
        else{rating='ضعيف';ratingColor='var(--red)';ratingDesc='أداء سلبي'}

        html+=`<div class="cd"><h2>تقييم الصندوق</h2>
            <div style="text-align:center;padding:20px">
                <div style="font-size:3rem;font-weight:800;color:${ratingColor}">${rating}</div>
                <div style="color:var(--txt2);margin-top:8px">${ratingDesc}</div>
                <div style="margin-top:12px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap">
                    <div class="mc" style="min-width:120px"><div class="l">العملة</div><div class="v">${esc(f.currency)}</div></div>
                    <div class="mc" style="min-width:120px"><div class="l">شرعي</div><div class="v" style="color:${isSharia?'var(--green)':'var(--red)'}">${isSharia?'نعم':'لا'}</div></div>
                    <div class="mc" style="min-width:120px"><div class="l">الحجم</div><div class="v">${fmtV(nav)}</div></div>
                </div>
            </div>
        </div>`;

        // Add to watchlist button
        html+=`<div class="cd" style="text-align:center">
            <button class="btn btn-green" onclick="addToWatchlistDirect(${q(f.symbol)})" style="padding:12px 32px;font-size:1rem">
                + إضافة إلى قائمة المتابعة
            </button>
        </div>`;

        el.innerHTML=html;
        if(fundHoldings.length>0){
            setTimeout(()=>{
                const ctx=document.getElementById('ch-fund-holdings')?.getContext('2d');
                if(ctx){
                    const fcolors=['#2563eb','#15803d','#c2410c','#dc2626','#2563eb','#b45309','#3b82f6','#f472b6','#2dd4bf','#e879f9','#818cf8','#16a34a'];
                    new Chart(ctx,{type:'doughnut',data:{labels:fundHoldings.map(h=>h.name),datasets:[{data:fundHoldings.map(h=>h.weight),backgroundColor:fcolors.slice(0,fundHoldings.length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{position:'right',labels:{color:'#1a1f2b',padding:10,font:{size:11},boxWidth:14}},tooltip:{callbacks:{label:c=>c.label+': '+c.parsed.toFixed(1)+'%'}}}}});
                }
            },100);
        }
    }catch(e){showErr(e.message);el.innerHTML=''}
}

async function loadFundsStats(){
    const el=document.getElementById('funds-stats-content');
    el.innerHTML='<div class="ld"><div class="sp"></div></div>';
    try{
        const r=await fetch('/api/mutual-funds/stats');
        const d=await r.json();
        let html=`<div class="mg">
            <div class="mc"><div class="l">Positions</div><div class="v">${d.total_funds}</div></div>
            <div class="mc"><div class="l">إجمالي الأصول</div><div class="v">${fmtV(d.total_nav)}</div></div>
        </div>`;

        // By currency
        html+='<h3 style="margin-top:16px">التوزيع حسب العملة</h3><div class="mg">';
        Object.entries(d.currencies).forEach(([k,v])=>{
            html+=`<div class="mc"><div class="l">${esc(k)}</div><div class="v">${v} صندوق</div></div>`;
        });
        html+='</div>';

        // By objective
        html+='<h3 style="margin-top:16px">التوزيع حسب الهدف</h3><div class="mg">';
        Object.entries(d.objectives).forEach(([k,v])=>{
            html+=`<div class="mc"><div class="l">${esc(k)}</div><div class="v">${v} صندوق</div></div>`;
        });
        html+='</div>';

        // Top funds
        html+='<h3 style="margin-top:16px">أكبر 10 صناديق أصولاً</h3><table><thead><tr><th>الرمز</th><th>الاسم</th><th>العملة</th><th>صافي الأصول</th></tr></thead><tbody>';
        d.top_funds.forEach(f=>{
            html+=`<tr>
                <td style="font-weight:700;color:var(--blue);direction:ltr">${esc(f.symbol)}</td>
                <td data-no-translate>${esc(f.name)}</td>
                <td style="font-size:.82rem">${esc(f.currency)}</td>
                <td>${f.nav}</td>
            </tr>`;
        });
        html+='</tbody></table>';

        el.innerHTML=html;
    }catch(e){el.innerHTML='<p>خطأ في التحميل</p>'}
}
