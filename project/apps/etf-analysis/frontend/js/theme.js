// Light/dark theme. Light is the default; the choice is saved per browser.
// Loaded in <head> (not deferred) so the page never flashes the wrong theme.
(function(){
  var KEY='rf-theme';
  function initial(){
    try{
      var q=new URLSearchParams(location.search).get('theme');
      if(q==='dark'||q==='light'){localStorage.setItem(KEY,q);return q}
      var s=localStorage.getItem(KEY);if(s==='dark'||s==='light')return s;
    }catch(e){}
    return 'light';
  }
  var theme=initial();
  document.documentElement.setAttribute('data-theme',theme);

  // Chart.js colors are written in light-theme hex inside each chart config.
  // Swap them to the dark equivalents (and back) instead of touching every chart.
  var TO_DARK={'#5b6472':'#9aa4b2','#1a1f2b':'#e6e9ef','rgba(15,23,42,.05)':'rgba(255,255,255,.08)','#f1f3f6':'#1c2230','#e3e6eb':'#2a3140','#ffffff':'#1a2130'};
  var TO_LIGHT={};Object.keys(TO_DARK).forEach(function(k){TO_LIGHT[TO_DARK[k]]=k});
  function recolor(obj,map,depth){
    if(!obj||typeof obj!=='object'||depth>8)return;
    Object.keys(obj).forEach(function(k){
      var v=obj[k];
      if(typeof v==='string'&&map[v])obj[k]=map[v];
      else if(v&&typeof v==='object'&&!(v instanceof HTMLElement)&&!Array.isArray(v))recolor(v,map,depth+1);
    });
  }
  function mapFor(t){return t==='dark'?TO_DARK:TO_LIGHT}
  function recolorChart(c,map){recolor(c.config.options,map,0);((c.config.data||{}).datasets||[]).forEach(function(d){recolor(d,map,0)})}

  var MOON='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',SUN='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function label(){return theme==='dark'?SUN+'<span>Light</span>':MOON+'<span>Dark</span>'}
  function setTheme(t){
    theme=t;document.documentElement.setAttribute('data-theme',t);
    try{localStorage.setItem(KEY,t)}catch(e){}
    var b=document.querySelector('.theme-toggle');if(b)b.innerHTML=label();
    if(window.Chart&&Chart.instances){
      Object.values(Chart.instances).forEach(function(c){recolorChart(c,mapFor(t));c.update('none')});
    }
  }
  window.rfTheme={get:function(){return theme},set:setTheme};

  document.addEventListener('DOMContentLoaded',function(){
    if(window.Chart&&Chart.register){
      Chart.register({id:'rfTheme',beforeInit:function(c){recolorChart(c,mapFor(theme))}});
    }
    var b=document.createElement('button');
    b.className='theme-toggle';b.type='button';b.setAttribute('data-no-translate','');
    b.innerHTML=label();
    b.onclick=function(){setTheme(theme==='dark'?'light':'dark')};
    document.body.appendChild(b);
  });
})();
