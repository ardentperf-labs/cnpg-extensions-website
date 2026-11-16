"""Arrange imported quick-start instructions without duplicating their YAML."""
from bs4 import BeautifulSoup

def getting_started(html):
    soup=BeautifulSoup(html,'html.parser')
    steps=soup.find_all('h3',recursive=False)
    if len(steps)!=2:
        raise ValueError('Review quick-start layout: expected alerts and catalog maintenance sections')
    sections=[]
    for heading in steps:
        parts=[]
        for sibling in list(heading.next_siblings):
            if getattr(sibling,'name',None)=='h3':break
            parts.append(str(sibling))
        sections.append(''.join(parts))
    requirements=[]
    for node in soup.contents:
        if node==steps[0]:break
        requirements.append(str(node))
    return ( '<section class="guide-prerequisites">'+''.join(requirements)+'</section>'
        '<h2 id="install-the-catalog">1. Install the extension catalog</h2>'
        '<p>Configure and test extension-update alerts before installing the catalog. Alerts remind you to run <code>ALTER EXTENSION … UPDATE</code> when needed.</p>'
        '<details class="guide-disclosure"><summary>Configure and test update alerts first</summary>'+sections[0]+'</details>'
        '<p>Once alerts are working, install the catalog:</p>'
        '<pre><code>kubectl apply -f https://raw.githubusercontent.com/cnpg-extensions/artifacts/main/image-catalogs-extensions/catalog-minimal-trixie.yaml</code></pre>'
        '<p class="guide-check">Check: <code>kubectl get clusterimagecatalog postgresql-minimal-trixie</code> should show the installed catalog.</p>'
        '<details class="guide-disclosure" id="schedule-maintenance" data-outline><summary>Schedule automatic updates during your maintenance window</summary>'+sections[1]+'</details>')
