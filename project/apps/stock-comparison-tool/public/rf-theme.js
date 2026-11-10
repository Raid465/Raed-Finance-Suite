// Light/dark theme for the Raed Finance Suite. Light is the default.
// Colors come from CSS variables (--rf-*) in src/index.css, so switching only
// flips data-theme on <html>. Loaded in <head> to avoid a flash on load.
(function(){
  var KEY='rf-theme',theme='light';
  try{
    var q=new URLSearchParams(location.search).get('theme');
    if(q==='dark'||q==='light')localStorage.setItem(KEY,q);
    if(localStorage.getItem(KEY)==='dark')theme='dark';
  }catch(e){}
  document.documentElement.setAttribute('data-theme',theme);
  function label(){return theme==='dark'?'☀ Light':'☾ Dark'}
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.createElement('button');
    b.type='button';b.className='rf-theme-toggle';b.textContent=label();
    b.onclick=function(){
      theme=theme==='dark'?'light':'dark';
      document.documentElement.setAttribute('data-theme',theme);
      try{localStorage.setItem(KEY,theme)}catch(e){}
      b.textContent=label();
    };
    document.body.appendChild(b);
  });
})();
