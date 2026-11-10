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

  function label(){return theme==='dark'?'☀ Light':'☾ Dark'}
  function setTheme(t){
    theme=t;document.documentElement.setAttribute('data-theme',t);
    try{localStorage.setItem(KEY,t)}catch(e){}
    var b=document.querySelector('.theme-toggle');if(b)b.textContent=label();
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
    b.textContent=label();
    b.onclick=function(){setTheme(theme==='dark'?'light':'dark')};
    document.body.appendChild(b);
  });
})();
