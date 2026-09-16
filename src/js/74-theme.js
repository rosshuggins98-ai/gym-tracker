/* ============ THEME ============ */
function setTheme(t){ THEME=t; document.documentElement.setAttribute('data-theme',t);
 document.getElementById('themeBtn').innerHTML=t==='dark'?I.sun:I.moon;
 document.querySelector('meta[name=theme-color]').setAttribute('content',t==='dark'?'#12151a':'#eef1f6'); }
function toggleTheme(){ const t=THEME==='dark'?'light':'dark'; setTheme(t); Store.set('gt4_theme',t); }

