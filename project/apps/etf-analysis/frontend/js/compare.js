// Two-fund compare, multi-fund compare, and market movers.
async function compare(){
    const a=document.getElementById('inp-a').value.trim().toUpperCase();
    const b=document.getElementById('inp-b').value.trim().toUpperCase();
    if(!a||!b){showErr('أدخل رمزين.');return}
    if(a===b){showErr('أدخل رمزين مختلفين.');return}
    hideErr();
    const r=document.getElementById('res-cm');
    r.innerHTML='<div class="ld"><div class="sp"></div><br>Loading...</div>';
    document.getElementById('btn-cm').disabled=true;
    try{
        const res=await fetch('/api/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol_a:a,symbol_b:b})});
        if(!res.ok){
            const errData=await res.json();
            throw new Error(errData.detail||'خطأ في الخادم');
        }
        const data=await res.json();
        renderCompare(data,r);
    }catch(e){
        console.error('Compare error:',e);
        showErr(e.message||'حدث خطأ غير متوقع');
        r.innerHTML='';
    }finally{
        document.getElementById('btn-cm').disabled=false;
    }
}

function renderCompare(data,container){
    try{
        const{etf_a:a,etf_b:b,overlap:ov}=data;
        if(!a||!b||!ov){throw new Error('بيانات غير مكتملة')}
        const mA=a.metrics||{};const mB=b.metrics||{};
        const rA=a.risk||{};const rB=b.risk||{};
        let bc='ol';if(ov.overlap_percentage>=50)bc='oh';else if(ov.overlap_percentage>=20)bc='om';
        let html=`<div class="cd" style="text-align:center">
            <h2>التداخل: ${esc(a.info?.symbol||'A')} vs ${esc(b.info?.symbol||'B')}</h2>
            <div class="ob ${bc}">${(ov.overlap_percentage||0).toFixed(1)}%</div>
            <p class="interp">${ov.interpretation||''}</p>
            <p style="color:var(--txt2);margin-top:6px;font-size:.85rem">${ov.shared_count||0} أسهم مشتركة من ${ov.holdings_count_a||0}+${ov.holdings_count_b||0}</p>
        </div>`;

        html+=`<div class="cd"><h2>مقارنة المؤشرات</h2><div class="lr"><div class="li"><span class="da"></span>${esc(a.info?.symbol||'A')}</div><div class="li"><span class="db"></span>${esc(b.info?.symbol||'B')}</div></div>
        <div class="cmr" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
            ${cm('السعر',mA.current_price,mB.current_price,fmtPr)}${cm('P/E',mA.trailing_pe,mB.trailing_pe)}${cm('P/B',mA.price_to_book,mB.price_to_book)}
            ${cm('المصاريف',mA.expense_ratio,mB.expense_ratio,fmtP)}${cm('التوزيعات',mA.dividend_yield,mB.dividend_yield,fmtP)}
            ${cm('YTD',mA.ytd_return,mB.ytd_return,v=>pS(v)+fmtP(v))}${cm('3 سنوات',mA.three_year_return,mB.three_year_return,v=>pS(v)+fmtP(v))}
            ${cm('5 سنوات',mA.five_year_return,mB.five_year_return,v=>pS(v)+fmtP(v))}${cm('التداول',mA.volume,mB.volume,fmtV)}
            ${cm('بيتا',mA.beta,mB.beta)}${cm('Sharpe',rA.sharpe_ratio,rB.sharpe_ratio)}${cm('أقصى انخفاض',rA.max_drawdown,rB.max_drawdown,v=>v!=null?'-'+fmtP(v):'-')}
        </div></div>`;

        const shared=ov.shared_holdings||[];
        if(shared.length){
            html+=`<div class="cd"><h2>الأسهم المشتركة</h2><table><thead><tr><th>#</th><th>الرمز</th><th>الاسم</th><th class="ca">${esc(a.info?.symbol||'A')}</th><th class="cb">${esc(b.info?.symbol||'B')}</th><th>المساهمة</th></tr></thead><tbody>`;
            shared.forEach((h,i)=>{html+=`<tr><td>${i+1}</td><td style="direction:ltr;text-align:left;font-weight:700;color:var(--blue)">${esc(h.symbol||'')}</td><td>${esc(h.name||'')}</td><td>${(h.weight_a||0).toFixed(2)}%</td><td>${(h.weight_b||0).toFixed(2)}%</td><td style="font-weight:700">${(h.contribution||0).toFixed(2)}%</td></tr>`});
            html+='</tbody></table></div>';
            html+=`<div class="cd"><h2>مخطط مقارن</h2><div style="max-height:400px"><canvas id="ch-ov"></canvas></div></div>`;
        }else{html+=`<div class="cd"><div class="es"><div class="ic">⚠</div><p>لا توجد أسهم مشتركة — تداخل 0%</p></div></div>`}

        container.innerHTML=html;

        if(shared.length){
            try{
                const ovCanvas=document.getElementById('ch-ov');
                if(ovCanvas){
                    destroyChart('ov');
                    charts.ov=new Chart(ovCanvas.getContext('2d'),{type:'bar',data:{labels:shared.map(h=>h.symbol),datasets:[{label:a.info?.symbol||'A',data:shared.map(h=>h.weight_a),backgroundColor:'rgba(37,99,235,.7)',borderRadius:6},{label:b.info?.symbol||'B',data:shared.map(h=>h.weight_b),backgroundColor:'rgba(194,65,12,.7)',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:true,indexAxis:'y',scales:{x:{ticks:{color:'#5b6472',callback:v=>v+'%'},grid:{color:'rgba(15,23,42,.05)'}},y:{ticks:{color:'#1a1f2b',font:{weight:'bold'}},grid:{display:false}}},plugins:{legend:{labels:{color:'#5b6472',padding:14,font:{size:12}}}}}});
                }
            }catch(e){console.error('Overlap chart error:',e)}
        }
    }catch(e){
        console.error('renderCompare error:',e);
        container.innerHTML='<div class="cd"><div class="es"><div class="ic">❌</div><p>حدث خطأ في عرض النتائج</p></div></div>';
    }
}

async function multiCompare(){
    const inp=document.getElementById('inp-multi').value;
    const syms=inp.split(',').map(s=>s.trim().toUpperCase()).filter(s=>s);
    if(syms.length<2){showErr('أدخل رمزين على الأقل.');return}
    if(syms.length>5){showErr('الحد الأقصى 5 صناديق.');return}
    hideErr();
    const r=document.getElementById('res-multi');
    r.innerHTML='<div class="ld"><div class="sp"></div><br>Loading...</div>';
    try{
        const res=await fetch('/api/multi-compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbols:syms})});
        if(!res.ok){
            const errData=await res.json();
            throw new Error(errData.detail||'خطأ في الخادم');
        }
        const data=await res.json();
        renderMulti(data,r,syms);
    }catch(e){
        console.error('Multi-compare error:',e);
        showErr(e.message||'حدث خطأ غير متوقع');
        r.innerHTML='';
    }
}

function renderMulti(data,container,syms){
    try{
        const{performance:perf,correlation:corr,metrics}=data;
        let html='';

        // Performance comparison chart
        html+=`<div class="cd"><h2>مقارنة الأداء</h2><div style="max-height:400px"><canvas id="ch-perf"></canvas></div></div>`;

        // Metrics table
        html+=`<div class="cd"><h2>مقارنة المؤشرات</h2><table><thead><tr><th>المؤشر</th>`;
        syms.forEach(s=>{html+=`<th style="color:var(--blue)">${s}</th>`});
        html+='</tr></thead><tbody>';
        const rows=[['السعر','current_price',fmtPr],['P/E','trailing_pe',v=>v||'-'],['P/B','price_to_book',v=>v||'-'],['المصاريف','expense_ratio',fmtP],['التوزيعات','dividend_yield',fmtP],['YTD','ytd_return',v=>pS(v)+fmtP(v)],['بيتا','beta',v=>v||'-']];
    rows.forEach(([l,k,f])=>{html+=`<tr><td>${l}</td>`;syms.forEach(s=>{html+=`<td>${f(metrics[s]?.[k])}</td>`});html+='</tr>'});
    html+='</tbody></table></div>';

    // Correlation heatmap
    if(corr?.correlation_matrix){
        const cs=corr.symbols;const n=cs.length;
        html+=`<div class="cd"><h2>مصفوفة الارتباط</h2><div class="heatmap" style="grid-template-columns:80px repeat(${n},1fr)">
            <div class="hm-cell hm-header"></div>`;
        cs.forEach(s=>{html+=`<div class="hm-cell hm-header">${s}</div>`});
        cs.forEach(s1=>{
            html+=`<div class="hm-cell hm-header">${s1}</div>`;
            cs.forEach(s2=>{
                const v=corr.correlation_matrix[s1][s2];
                const hue=Math.round((1-v)*120);const sat=70;const lit=50;
                html+=`<div class="hm-cell" style="background:hsl(${hue},${sat}%,${lit}%)">${v.toFixed(2)}</div>`;
            });
        });
        html+='</div></div>';
    }

    container.innerHTML=html;

    // Performance chart
    if(perf?.data){
        try{
            const perfCanvas=document.getElementById('ch-perf');
            if(perfCanvas){
                destroyChart('perf');
                const perfEntries=Object.entries(perf.data);
                // Use the shortest dates array to ensure alignment
                let minLen=Math.min(...perfEntries.map(([s,d])=>d.dates.length));
                const datasets=perfEntries.map(([sym,d],i)=>{
                    const data=d.returns.slice(0,minLen);
                    return{label:sym,data,borderColor:COLORS[i%COLORS.length],backgroundColor:COLORS[i%COLORS.length]+'20',fill:false,tension:.3,pointRadius:0,borderWidth:2};
                });
                const dates=perfEntries[0][1].dates.slice(0,minLen);
                charts.perf=new Chart(perfCanvas.getContext('2d'),{type:'line',data:{labels:dates,datasets},options:{responsive:true,maintainAspectRatio:true,scales:{x:{ticks:{color:'#5b6472',maxTicksLimit:8,maxRotation:0},grid:{display:false}},y:{ticks:{color:'#5b6472',callback:v=>v.toFixed(1)+'%'},grid:{color:'rgba(15,23,42,.05)'}}},plugins:{legend:{labels:{color:'#1a1f2b',padding:14,font:{size:12,weight:'600'}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y.toFixed(2)+'%'}}},interaction:{intersect:false,mode:'index'}}});
            }
        }catch(e){console.error('Performance chart error:',e)}
    }
    }catch(e){
        console.error('renderMulti error:',e);
        container.innerHTML='<div class="cd"><div class="es"><div class="ic">❌</div><p>حدث خطأ في عرض النتائج</p></div></div>';
    }
}

async function loadMovers(){
    const el=document.getElementById('res-movers');
    try{
        const r=await fetch('/api/movers?limit=10');
        if(!r.ok)throw new Error('Error');
        const d=await r.json();
        if(!(d.gainers||[]).length&&!(d.losers||[]).length){el.innerHTML='<div class="cd"><p>بيانات السوق غير متاحة حالياً، حاول مرة أخرى بعد دقيقة</p></div>';return}
        let html='<div class="mv-row">';
        html+=`<div class="mv-col cd"><h2 style="color:var(--green)">Top Gainers</h2>`;
        d.gainers.forEach(g=>{html+=`<div class="mv-item" onclick="document.getElementById('inp').value=${q(g.symbol)};tab('analyze');analyze()">
            <div><div class="mv-sym">${esc(g.symbol)}</div><div class="mv-name">${esc(g.name)}</div></div>
            <div style="text-align:left"><div style="font-weight:700">${fmtPr(g.price)}</div><div class="pos">+${g.change_pct.toFixed(2)}%</div></div>
        </div>`});
        html+='</div>';
        html+=`<div class="mv-col cd"><h2 style="color:var(--red)">Top Losers</h2>`;
        d.losers.forEach(g=>{html+=`<div class="mv-item" onclick="document.getElementById('inp').value=${q(g.symbol)};tab('analyze');analyze()">
            <div><div class="mv-sym">${esc(g.symbol)}</div><div class="mv-name">${esc(g.name)}</div></div>
            <div style="text-align:left"><div style="font-weight:700">${fmtPr(g.price)}</div><div class="neg">${g.change_pct.toFixed(2)}%</div></div>
        </div>`});
        html+='</div></div>';
        el.innerHTML=html;
    }catch(e){el.innerHTML='<p>خطأ في التحميل</p>'}
}
