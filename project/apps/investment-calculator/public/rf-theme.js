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
  var MOON='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',SUN='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function label(){return theme==='dark'?SUN+'<span>Light</span>':MOON+'<span>Dark</span>'}
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.createElement('button');
    b.type='button';b.className='rf-theme-toggle';b.innerHTML=label();
    b.onclick=function(){
      theme=theme==='dark'?'light':'dark';
      document.documentElement.setAttribute('data-theme',theme);
      try{localStorage.setItem(KEY,theme)}catch(e){}
      b.innerHTML=label();
    };
    document.body.appendChild(b);
    // If the page has a slot next to its language button, sit there instead
    // of floating (React renders the slot after this script runs).
    function dock(){var slot=document.querySelector('[data-rf-theme-slot]');if(slot&&b.parentNode!==slot){slot.appendChild(b);b.classList.add('rf-docked')}return !!slot}
    if(!dock()){var mo=new MutationObserver(function(){if(dock())mo.disconnect()});mo.observe(document.body,{childList:true,subtree:true})}
  });
})();
