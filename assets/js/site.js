const root = document.documentElement;
const media = matchMedia('(prefers-color-scheme: dark)');
let preference = 'system';
try { preference = localStorage.getItem('cnpg-mode') || 'system'; } catch {}
function applyMode() { root.dataset.mode = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference; document.querySelector('.mode-toggle')?.setAttribute('aria-label', `Current theme: ${root.dataset.mode}. Switch to ${root.dataset.mode === 'dark' ? 'light' : 'dark'} mode`); }
applyMode(); media.addEventListener('change', applyMode);
document.querySelector('.mode-toggle')?.addEventListener('click', () => { preference = root.dataset.mode === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('cnpg-mode', preference); } catch {} applyMode(); });
const menu = document.getElementById('menu-toggle');
menu?.addEventListener('click', () => { const nav = document.getElementById('mobile-nav'); nav.hidden = !nav.hidden; menu.setAttribute('aria-expanded', String(!nav.hidden)); });
async function copyText(text, button, code) {
 let copied = false;
 try { await navigator.clipboard.writeText(text); copied = true; } catch { const field = document.createElement('textarea'); field.value = text; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select(); try { copied = document.execCommand('copy'); } catch {} field.remove(); button.focus(); }
 const label = button.textContent; button.textContent = copied ? 'Copied' : 'Select and copy';
 if (!copied) { const range = document.createRange(); range.selectNodeContents(code); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); }
 setTimeout(() => { button.textContent = label; }, 1800);
}
document.getElementById('copy')?.addEventListener('click', e => { const code = document.getElementById('alert-query'); copyText(code.textContent, e.currentTarget, code); });
document.querySelectorAll('.prose pre').forEach(pre => { const button = document.createElement('button'); button.type = 'button'; button.className = 'copy-code'; button.textContent = 'Copy'; button.setAttribute('aria-label','Copy code example'); button.addEventListener('click', () => copyText(pre.textContent, button, pre)); pre.after(button); });
const search = document.getElementById('extension-search');
if (search) {
 const grid = document.getElementById('catalog-grid'); const cards = [...grid.children];
 const filters = ['distro','build','publisher'].map(name => document.getElementById(`filter-${name}`)); const sort = document.getElementById('catalog-sort');
 const params = new URLSearchParams(location.search); search.value = params.get('q') || '';
 filters.forEach((f,i) => { f.value = params.get(['distro','build','publisher'][i]) || ''; });
 function filter() { const words = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean); let count = 0;
 cards.sort((a,b) => a.dataset.name.localeCompare(b.dataset.name) * (sort.value === 'reverse' ? -1 : 1)).forEach(card => {
 const matches = words.every(w => card.dataset.search.includes(w)) && (!filters[0].value || card.dataset.distros.split(' ').includes(filters[0].value)) && (!filters[1].value || card.dataset.build === filters[1].value) && (!filters[2].value || card.dataset.publisher === filters[2].value);
 card.hidden = !matches; if (matches) count++; grid.append(card);
 });
 document.getElementById('result-count').textContent = `${count} ${count === 1 ? 'extension' : 'extensions'}`; document.getElementById('no-results').hidden = count > 0;
 const url = new URL(location.href); [['q',search.value],...filters.map((f,i) => [['distro','build','publisher'][i],f.value])].forEach(([k,v]) => v ? url.searchParams.set(k,v) : url.searchParams.delete(k)); history.replaceState(null,'',url);
 }
 search.addEventListener('input',filter); [...filters,sort].forEach(el => el.addEventListener('change',filter));
 document.getElementById('clear-filters').addEventListener('click',()=>{search.value='';filters.forEach(f=>f.value='');sort.value='name';filter();search.focus();}); filter();
}
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));

// Enhance ordinary document anchors into two views; without JS both remain readable.
const detail = document.querySelector('.extension-redesign');
if (detail) {
 const nav = detail.querySelector('.detail-view-nav');
 const tabs = [...nav.querySelectorAll('[data-detail-view]')];
 const views = [...detail.querySelectorAll('.detail-view')];
 nav.setAttribute('role','tablist');
 tabs.forEach(tab => { tab.setAttribute('role','tab'); tab.id = `tab-${tab.dataset.detailView}`; tab.setAttribute('aria-controls',tab.dataset.detailView); });
 views.forEach(view => {view.setAttribute('role','tabpanel'); view.setAttribute('aria-labelledby',`tab-${view.id}`);});
 function showView(id, updateURL = false) {
  tabs.forEach(tab => {const selected = tab.dataset.detailView === id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex = selected ? 0 : -1;});
  views.forEach(view => view.hidden = view.id !== id);
  if(updateURL) { const url = new URL(location.href);url.hash = id;history.pushState(null,'',url); }
 }
 tabs.forEach((tab,i) => {
  tab.addEventListener('click',e=>{e.preventDefault();showView(tab.dataset.detailView,true);});
  tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].focus();showView(tabs[next].dataset.detailView,true);}});
 });
 const syncView = () => showView(location.hash === '#image-evidence' ? 'image-evidence' : 'readme');syncView();window.addEventListener('hashchange',syncView);
 const contents = detail.querySelector('.readme-nav');const contentsNav = contents.querySelector('nav');
 detail.querySelectorAll('.readme-content h2[id], .readme-content h3[id]').forEach(heading=>{const a=document.createElement('a');a.href=`#${heading.id}`;a.textContent=heading.textContent;a.className=heading.tagName==='H3'?'contents-subheading':'';contentsNav.append(a);});
 if(contentsNav.children.length){contents.hidden=false;if(innerWidth<850)contents.querySelector('details').open=false;}
 const imageChoice=document.getElementById('image-choice');const archChoice=document.getElementById('architecture-choice');const query=document.getElementById('dependency-search');const panels=[...detail.querySelectorAll('.inventory-panel')];
 detail.querySelector('.inventory-controls').hidden=false;
 const urlParams=new URLSearchParams(location.search);if([...imageChoice.options].some(o=>o.value===urlParams.get('image')))imageChoice.value=urlParams.get('image');
 function filterDependencies(){const needle=query.value.trim().toLowerCase();const panel=panels.find(p=>!p.hidden);if(!panel)return;const rows=[...panel.querySelectorAll('tbody tr')];let count=0;rows.forEach(row=>{row.hidden=!row.dataset.dependencySearch.includes(needle);if(!row.hidden)count++;});const result=panel.querySelector('.inventory-result');if(result){if(!result.dataset.original)result.dataset.original=result.textContent;result.textContent=needle?`${count} of ${rows.length} packages match your search`:result.dataset.original;}const empty=panel.querySelector('.dependency-empty');if(empty)empty.hidden=count>0;}
 function showImage(updateURL){panels.forEach(panel=>panel.hidden=panel.dataset.variant!==imageChoice.value||panel.dataset.architecture!==archChoice.value);filterDependencies();if(updateURL){const url=new URL(location.href);url.searchParams.set('image',imageChoice.value);url.searchParams.set('arch',archChoice.value);history.replaceState(null,'',url);}}
 function setArchitectures(preferred){const architectures=[...new Set(panels.filter(p=>p.dataset.variant===imageChoice.value).map(p=>p.dataset.architecture))];archChoice.replaceChildren(...architectures.map(arch=>new Option(arch==='unavailable'?'Unavailable':arch,arch)));archChoice.value=architectures.includes(preferred)?preferred:(architectures.includes('amd64')?'amd64':architectures[0]);}
 setArchitectures(urlParams.get('arch'));showImage(false);
 imageChoice.addEventListener('change',()=>{setArchitectures(archChoice.value);showImage(true);});archChoice.addEventListener('change',()=>showImage(true));query.addEventListener('input',filterDependencies);
}
