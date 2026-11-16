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
