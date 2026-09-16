const pairs: Array<[string,string]> = [
  ['حاسبة الاستثمار التفاعلية — جميع الحسابات تقريبية ولا تُعتبر نصيحة مالية','Interactive Investment Calculator — estimates only, not financial advice'],
  ['حاسبة الاستثمار','Investment Calculator'],
  ['تقرير الاستثمار','Investment Report'],
  ['رأس المال','Initial capital'],
  ['عائد','Return'],
  ['مستثمر','Invested'],
  ['أرباح','Earnings'],
  ['كافٍ','is sufficient'],
  ['خلال','within'],
  ['د.أ','JOD'],
  ['معطيات الاستثمار','Investment assumptions'],
  ['مقارنة مباشرة','Direct comparison'],
  ['جدول المقارنة','Comparison table'],
  ['القيمة الإجمالية','Total value'],
  ['العملة','Currency'],
  ['العائد السنوي','Annual return'],
  ['المدة','Duration'],
  ['شهر','month'],
  ['شهرياً','monthly'],
  ['القيمة الحقيقية:','Real value:'],
  ['المستهدف','Target'],
  ['المعطيات المشتركة لجميع السيناريوهات','Shared assumptions for all scenarios'],
  ['حدد هدفك المالي والأداة تحسب كم تحتاج تستثمر شهرياً للوصول إليه','Set your financial goal and calculate the monthly investment required to reach it'],
  ['قيمة رأس المال بعد','Initial capital value after'],
  ['إجمالي الاشتراكات الشهرية','Total monthly contributions'],
  ['إجمالي الأرباح المتوقعة','Total expected earnings'],
  ['جدول تفصيلي سنة بسنة','Year-by-year breakdown'],
  ['مقارنة السيناريوهات — القيمة الإجمالية','Scenario comparison — total value'],
  ['المعدل العائد السنوي المتوقع','Expected annual return'],
  ['معدل العائد السنوي المتوقع','Expected annual return'],
  ['معدل العائد السنوي','Annual return rate'],
  ['معدل التضخم السنوي','Annual inflation rate'],
  ['رأس المال الابتدائي','Initial capital'],
  ['الإيداع الشهري','Monthly contribution'],
  ['المبلغ الشهري المطلوب','Required monthly amount'],
  ['المبلغ المستهدف','Target amount'],
  ['السنة المستهدفة','Target year'],
  ['إجمالي المستثمر','Total invested'],
  ['إجمالي الأرباح','Total earnings'],
  ['القيمة الحقيقية','Real value'],
  ['القيمة النهائية','Final value'],
  ['المبلغ المستثمر','Amount invested'],
  ['المستثمر التراكمي','Cumulative invested'],
  ['قيمة المحفظة','Portfolio value'],
  ['المحفظة الكلية','Total portfolio'],
  ['تعديل حسب التضخم','Adjust for inflation'],
  ['مقارنة السيناريوهات','Scenario comparison'],
  ['حاسبة الهدف العكسي','Reverse goal calculator'],
  ['تفاصيل الحساب','Calculation details'],
  ['نمو المحفظة','Portfolio growth'],
  ['نسبة النمو','Growth rate'],
  ['عدد السنوات','Number of years'],
  ['السنة','Year'],
  ['سنوات','Years'],
  ['سنة','Year'],
  ['الحاسبة','Calculator'],
  ['الهدف العكسي','Goal planner'],
  ['السيناريو','Scenario'],
  ['العائد','Return'],
  ['الأرباح','Earnings'],
  ['النمو','Growth'],
  ['المستثمر','Invested'],
  ['الإجمالي','Total'],
  ['الهدف','Goal'],
  ['تصدير Excel','Export Excel'],
  ['الهدف محقق بالفعل!','Goal already reached!'],
  ['لا حاجة لإيداعات شهرية إضافية','No additional monthly contributions are needed'],
  ['شهرياً لمدة','per month for'],
  ['للوصول إلى','to reach'],
  ['الفجوة المطلوب تغطيتها','Funding gap'],
  ['مسورة النمو نحو الهدف','Growth path toward your goal'],
  ['متحفظ','Conservative'],
  ['متوسط','Balanced'],
  ['متفائل','Optimistic'],
  ['$ دولار','$ USD'],
  ['د.أ دينار','JOD'],
];

const arToEn = new Map(pairs);
const enToAr = new Map(pairs.map(([ar,en])=>[en,ar]));
let lang: 'en'|'ar' = 'en';
let busy = false;

function replaceText(input:string, map:Map<string,string>) {
  let output=input;
  const entries=[...map.entries()].sort((a,b)=>b[0].length-a[0].length);
  for (const [from,to] of entries) output=output.split(from).join(to);
  return output;
}

function translateNode(root: ParentNode = document) {
  if (busy) return;
  busy=true;
  try {
    const map=lang==='en'?arToEn:enToAr;
    const walker=document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
    const nodes:Text[]=[];
    let n; while((n=walker.nextNode())) nodes.push(n as Text);
    for(const node of nodes){
      if(node.parentElement?.closest('[data-lang-toggle]')) continue;
      const next=replaceText(node.nodeValue||'',map);
      if(next!==node.nodeValue) node.nodeValue=next;
    }
    document.querySelectorAll('input[placeholder], [title]').forEach((el)=>{
      for(const attr of ['placeholder','title']){
        const val=el.getAttribute(attr); if(!val) continue;
        const next=replaceText(val,map); if(next!==val) el.setAttribute(attr,next);
      }
    });
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    document.body.dir=lang==='ar'?'rtl':'ltr';
    const btn=document.querySelector<HTMLButtonElement>('[data-lang-toggle]');
    if(btn) btn.textContent=lang==='en'?'العربية':'English';
  } finally { busy=false; }
}

export function initLanguage(){
  const btn=document.createElement('button');
  btn.type='button'; btn.dataset.langToggle='1'; btn.className='global-lang-toggle';
  btn.addEventListener('click',()=>{
    lang=lang==='en'?'ar':'en';
    translateNode(document);
  });
  document.body.appendChild(btn);
  translateNode(document);
  const observer=new MutationObserver((mutations)=>{
    if(busy) return;
    for(const m of mutations){
      if(m.type==='childList' && m.addedNodes.length){ translateNode(document); break; }
      if(m.type==='characterData'){ translateNode(document); break; }
    }
  });
  observer.observe(document.getElementById('root')!,{subtree:true,childList:true,characterData:true});
}
