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
 function restoreCatalog() {
  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  filters.forEach((f,i) => { const value=params.get(['distro','build','publisher'][i]) || ''; f.value=[...f.options].some(o=>o.value===value)?value:''; });
  sort.value = params.get('sort') === 'reverse' ? 'reverse' : 'name';
  filter(false);
 }
 function filter(updateURL = true) { const words = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean); let count = 0;
 cards.sort((a,b) => a.dataset.name.localeCompare(b.dataset.name) * (sort.value === 'reverse' ? -1 : 1)).forEach(card => {
 const matches = words.every(w => card.dataset.search.includes(w)) && (!filters[0].value || card.dataset.distros.split(' ').includes(filters[0].value)) && (!filters[1].value || card.dataset.build === filters[1].value) && (!filters[2].value || card.dataset.publisher === filters[2].value);
 card.hidden = !matches; if (matches) count++; grid.append(card);
 });
 document.getElementById('result-count').textContent = `${count} ${count === 1 ? 'extension' : 'extensions'}`; document.getElementById('no-results').hidden = count > 0;
 const url = new URL(location.href); [['q',search.value],['sort',sort.value === 'reverse' ? 'reverse' : ''],...filters.map((f,i) => [['distro','build','publisher'][i],f.value])].forEach(([k,v]) => v ? url.searchParams.set(k,v) : url.searchParams.delete(k)); if(updateURL) history.replaceState(null,'',url);
 }
 search.addEventListener('input',filter); [...filters,sort].forEach(el => el.addEventListener('change',filter));
 document.getElementById('clear-filters').addEventListener('click',()=>{search.value='';filters.forEach(f=>f.value='');sort.value='name';filter();search.focus();}); restoreCatalog(); window.addEventListener('popstate',restoreCatalog);
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
 if(contentsNav.children.length){
  contents.hidden=false;
  const wideReadme=matchMedia('(min-width: 1200px)');
  const adaptContents=()=>{contents.querySelector('details').open=wideReadme.matches;};
  adaptContents();wideReadme.addEventListener('change',adaptContents);
 }
 const imageChoice=document.getElementById('image-choice');const archChoice=document.getElementById('architecture-choice');const panels=[...detail.querySelectorAll('.inventory-panel')];
 detail.querySelector('.inventory-controls').hidden=false;
 const defaultImage=imageChoice.value;
 function showImage(updateURL){panels.forEach(panel=>panel.hidden=panel.dataset.variant!==imageChoice.value||panel.dataset.architecture!==archChoice.value);if(updateURL){const url=new URL(location.href);url.searchParams.set('image',imageChoice.value);url.searchParams.set('arch',archChoice.value);url.searchParams.delete('dependency');history.replaceState(null,'',url);}}
 function setArchitectures(preferred){const architectures=[...new Set(panels.filter(p=>p.dataset.variant===imageChoice.value).map(p=>p.dataset.architecture))];archChoice.replaceChildren(...architectures.map(arch=>new Option(arch==='unavailable'?'Unavailable':arch,arch)));archChoice.value=architectures.includes(preferred)?preferred:(architectures.includes('amd64')?'amd64':architectures[0]);}
 function restoreImage(){
  const params=new URLSearchParams(location.search);
  imageChoice.value=[...imageChoice.options].some(o=>o.value===params.get('image'))?params.get('image'):defaultImage;
  setArchitectures(params.get('arch'));showImage(false);syncView();
 }
 restoreImage();window.addEventListener('popstate',restoreImage);
 imageChoice.addEventListener('change',()=>{setArchitectures(archChoice.value);showImage(true);});archChoice.addEventListener('change',()=>showImage(true));
}

const extensionBrowser = document.querySelector('.extension-browser');
if (extensionBrowser) {
 const narrow = matchMedia('(max-width: 1000px)');
 const adaptBrowser = () => { extensionBrowser.open = !narrow.matches; };
 adaptBrowser(); narrow.addEventListener('change', adaptBrowser);
 const field = document.getElementById('sidebar-extension-search');
 const links = [...extensionBrowser.querySelectorAll('[data-extension-search]')];
 extensionBrowser.querySelector('.extension-browser-search').hidden = false;
 field.addEventListener('input', () => {
  const words = field.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let count = 0;
  links.forEach(link => { link.hidden = !words.every(word => link.dataset.extensionSearch.includes(word)); if (!link.hidden) count++; });
  document.getElementById('sidebar-extension-count').textContent = `${count} ${count === 1 ? 'extension' : 'extensions'}`;
  extensionBrowser.querySelector('.sidebar-empty').hidden = count > 0;
 });
 // Scroll only the list, keeping the page and its deep-link position unchanged.
 const current = extensionBrowser.querySelector('[aria-current="page"]');
 if (current && extensionBrowser.open) {
  const list = extensionBrowser.querySelector('.extension-browser-list');
  list.scrollTop = current.offsetTop - list.offsetTop - list.clientHeight / 2;
 }
}

const guide = document.querySelector('.guide-page');
if (guide) {
 const outline = guide.querySelector('.guide-outline');
 const nav = outline.querySelector('nav');
 const content = guide.querySelector('.guide-content');
 content.querySelectorAll('h2[id], h3[id], details[data-outline][id]').forEach(section => {
  if (section.parentElement.closest('details')) return;
  const link = document.createElement('a');
  link.href = `#${section.id}`;
  link.textContent = section.matches('details') ? section.querySelector('summary').textContent : section.textContent;
  nav.append(link);
 });
 if (nav.children.length) {
  outline.hidden = false;
  const wide = matchMedia('(min-width: 1001px)');
  const adaptOutline = () => { outline.querySelector('details').open = wide.matches; };
  adaptOutline(); wide.addEventListener('change', adaptOutline);
 }
 function revealGuideAnchor() {
  let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target || !content.contains(target)) return;
  for (let node = target; node && node !== content; node = node.parentElement) {
   if (node.matches('details')) node.open = true;
  }
  requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
 }
 window.addEventListener('hashchange', revealGuideAnchor);
 nav.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link && link.hash === location.hash) revealGuideAnchor();
 });
 revealGuideAnchor();
}
