#!/usr/bin/env python3
"""Build the catalog from published catalogs, source READMEs, and digest-bound SPDX.
No per-extension editorial data. Network failures are explicit, never zero findings.
"""
import argparse, concurrent.futures, hashlib, json, os, re, shutil, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import requests, yaml, hcl2, markdown
from hcl2.utils import SerializationOptions
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache'
REPORTS = ROOT / 'static/reports'
REPOS = {'source':'cnpg-extensions/postgres-extensions-containers', 'upstream':'cloudnative-pg/postgres-extensions-containers', 'artifacts':'cnpg-extensions/artifacts'}
NOW = datetime.now(timezone.utc).isoformat(timespec='seconds')

def run(*args):
    return subprocess.check_output(args, text=True).strip()

def checkout(name, refresh):
    path = CACHE/name
    if not (path/'.git').exists():
        subprocess.run(['git','clone','--depth','1',f'https://github.com/{REPOS[name]}.git',str(path)],check=True)
    elif refresh:
        subprocess.run(['git','-C',str(path),'fetch','--depth','1','origin','main'],check=True)
        subprocess.run(['git','-C',str(path),'checkout','--detach','FETCH_HEAD'],check=True)
    return run('git','-C',str(path),'rev-parse','HEAD')

def packages(spdx):
    # Preserve both SPDX fields and all expressions; never split AND/OR into a claim of alternatives.
    return sorted([{'name':p['name'],'version':p.get('versionInfo','Not recorded'),
                    'declared':p.get('licenseDeclared','NOASSERTION'),
                    'concluded':p.get('licenseConcluded','NOASSERTION'),
                    'files':p.get('licenseInfoFromFiles',[])} for p in spdx.get('packages',[])],key=lambda p:(p['name'],p['version']))

def check_digest(data, digest):
    if not digest.startswith('sha256:') or hashlib.sha256(data).hexdigest()!=digest[7:]:
        raise ValueError('Registry content does not match catalog/descriptor digest')

class Registry:
    def __init__(self, ref):
        host, rest=ref.split('/',1)
        if host!='ghcr.io': raise ValueError('Unsupported registry: '+host)
        named,self.digest=rest.split('@')
        self.repo=named.split(':')[0]
        self.base=f'https://ghcr.io/v2/{self.repo}/'
        self.session=requests.Session()
        self.session.mount('https://',HTTPAdapter(max_retries=Retry(total=3,backoff_factor=1,status_forcelist=[429,500,502,503,504])))
        r=self.session.get('https://ghcr.io/token',params={'service':'ghcr.io','scope':f'repository:{self.repo}:pull'},timeout=60)
        r.raise_for_status()
        self.session.headers.update({'Authorization':'Bearer '+r.json()['token'], 'Accept':'application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.docker.distribution.manifest.list.v2+json'})
    def get(self,digest,kind='manifests'):
        dest=CACHE/'oci'/digest.replace(':','-')
        if dest.exists(): data=dest.read_bytes()
        else:
            r=self.session.get(self.base+kind+'/'+digest,timeout=120);r.raise_for_status();data=r.content
            check_digest(data,digest)
            dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
        check_digest(data,digest)
        return json.loads(data)

def scan(sbom, grype, database):
    if not grype: return {'status':'not-run','reason':'Vulnerability scanning was not requested.'}
    if database.get('error'): return {'status':'unavailable','reason':database['error']}
    env={**os.environ,'GRYPE_DB_AUTO_UPDATE':'false'}
    result=subprocess.run([grype,'sbom:'+str(sbom),'-o','json'],capture_output=True,text=True,env=env,timeout=600)
    if result.returncode: raise RuntimeError('Grype scan failed: '+result.stderr[-400:])
    raw=json.loads(result.stdout)
    dest=sbom.with_suffix('.grype.json');dest.write_text(result.stdout)
    findings={}
    for m in raw.get('matches',[]):
        v=m['vulnerability']; a=m['artifact']
        k=(v['id'],a['name'],a.get('version',''))
        findings[k]={'id':v['id'],'package':a['name'],'version':a.get('version',''),'severity':v.get('severity','Unknown'),
                     'url':v.get('dataSource',''),'fix':v.get('fix',{}),'namespace':v.get('namespace','')}
    return {'status':'scanned','scannedAt':NOW,'database':database,'scanner':raw.get('descriptor',{}).get('version',''),
            'findings':sorted(findings.values(),key=lambda v:(v['severity'],v['id'],v['package'])),
            'report':str(dest.relative_to(ROOT/'static'))}

def inspect_image(item, grype, database):
    result={**item,'platforms':[]}
    try:
        reg=Registry(item['reference']);index=reg.get(reg.digest)
        result['annotations']=index.get('annotations',{})
        manifests=index.get('manifests',[])
        platforms=[m for m in manifests if m.get('platform',{}).get('os')=='linux' and m.get('platform',{}).get('architecture') in ['amd64','arm64']]
        if not platforms: raise ValueError('No supported platform manifests in published index')
        for platform in platforms:
            arch=platform['platform']['architecture'];pd=platform['digest']
            record={'architecture':arch,'digest':pd,'status':'unavailable'}
            try:
                manifest=reg.get(pd);config=reg.get(manifest['config']['digest'],'blobs')
                record['labels']=config.get('config',{}).get('Labels',{}) or {}
                att=next((m for m in manifests if m.get('annotations',{}).get('vnd.docker.reference.digest')==pd and m.get('annotations',{}).get('vnd.docker.reference.type')=='attestation-manifest'),None)
                if not att: raise ValueError('Published image has no attached BuildKit SBOM for this platform')
                am=reg.get(att['digest']);spdx=None
                for layer in am.get('layers',[]):
                    if layer.get('annotations',{}).get('in-toto.io/predicate-type')=='https://spdx.dev/Document':
                        statement=reg.get(layer['digest'],'blobs')
                        if statement.get('predicateType')!='https://spdx.dev/Document': raise ValueError('Unexpected SBOM predicate type')
                        if not any(s.get('digest',{}).get('sha256')==pd[7:] for s in statement.get('subject',[])): raise ValueError('SBOM subject does not match platform manifest')
                        spdx=statement['predicate'];break
                if not spdx or not spdx.get('spdxVersion','').startswith('SPDX-'): raise ValueError('No SPDX document in platform attestations')
                dest=REPORTS/item['name']/f"{item['distro']}-pg{item['pg']}-{arch}.spdx.json"
                dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(spdx))
                record.update(status='available',packages=packages(spdx),licenses=spdx.get('hasExtractedLicensingInfos',[]),sbom=str(dest.relative_to(ROOT/'static')))
                try: record['scan']=scan(dest,grype,database)
                except Exception as ex: record['scan']={'status':'unavailable','reason':str(ex)}
            except Exception as ex: record['reason']=str(ex)
            result['platforms'].append(record)
        result['status']='available'
        result['version']=result['annotations'].get('org.opencontainers.image.version') or next((p.get('labels',{}).get('org.opencontainers.image.version') for p in result['platforms'] if p.get('labels',{}).get('org.opencontainers.image.version')), 'Not recorded')
    except Exception as ex: result.update(status='unavailable',reason=str(ex),version='Unavailable')
    return result

def readme_html(text, repo, commit, path, routes, depth=2):
    html=markdown.markdown(text,extensions=['fenced_code','tables','toc'])
    soup=BeautifulSoup(html,'html.parser')
    for a in soup.find_all(['a','img']):
        key='href' if a.name=='a' else 'src'; link=a.get(key,'')
        if not link or link.startswith('#'):continue
        absolute=urljoin(f'https://github.com/{repo}/blob/{commit}/{path}',link)
        if not urlsplit(link).scheme:
            target=absolute.split('#')[0].split(f'/blob/{commit}/')[-1]
            if a.name=='img': absolute=urljoin(f'https://raw.githubusercontent.com/{repo}/{commit}/{path}',link)
            elif (repo,target) in routes: absolute='../'*depth+routes[(repo,target)]+('/#'+link.split('#',1)[1] if '#' in link else '/')
            if a.name=='a' and target=='README.md' and '#quick-start' in link: absolute='../'*depth+'getting-started/'
            if a.name=='a' and target=='README.md' and '#supported-extensions' in link: absolute='../'*depth+'extensions/'
        a[key]=absolute
    # Source Markdown is content, not executable page code.
    import bleach
    tags={'a','p','div','span','h1','h2','h3','h4','h5','h6','ul','ol','li','pre','code','strong','em','blockquote','table','thead','tbody','tr','th','td','hr','br','img','details','summary','del','sup','sub'}
    return bleach.clean(str(soup),tags=tags,attributes={'*':['id','class'],'a':['href','title'],'img':['src','alt','width','height'],'details':['open']},protocols=['http','https','mailto'],strip=True)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--refresh',action='store_true');parser.add_argument('--scan',action='store_true');parser.add_argument('--workers',type=int,default=4);parser.add_argument('--reuse-evidence',action='store_true',help='Local layout iteration only: reuse exact-digest evidence with original scan timestamps')
    args=parser.parse_args();CACHE.mkdir(exist_ok=True)
    commits={n:checkout(n,args.refresh) for n in REPOS}
    recipes={};routes={}
    for src in ['upstream','source']:
        for path in (CACHE/src).rglob('metadata.hcl'):
            if '.git' in path.parts:continue
            try:
                with path.open() as f: meta=hcl2.load(f,serialization_options=SerializationOptions(strip_string_quotes=True,with_comments=False)).get('metadata',{})
            except Exception: continue
            name=meta.get('image_name') or meta.get('name')
            if not isinstance(name,str) or not (path.parent/'README.md').exists():continue
            rel=(path.parent/'README.md').relative_to(CACHE/src).as_posix()
            recipes[(REPOS[src],name)]={'meta':meta,'readme':path.parent/'README.md','repo':REPOS[src],'commit':commits[src],'path':rel,
                'build':meta.get('build_system') or ('PGRX' if rel.startswith('pgrx/') else 'Universe' if rel.startswith('universe/') else 'Debian')}
            routes[(REPOS[src],rel)]='extensions/'+name
        routes[(REPOS[src],'README.md')]='getting-started'
    jobs=[]
    for cat in sorted((CACHE/'artifacts/image-catalogs-extensions').glob('catalog-*.yaml')):
        document=yaml.safe_load(cat.read_text());distro=document['metadata']['labels']['images.cnpg.io/os']
        for entry in document['spec']['images']:
            for e in entry.get('extensions',[]):
                ref=e['image']['reference']
                if not re.fullmatch(r'[a-z0-9][a-z0-9_-]*',e['name']):raise ValueError('Unsafe extension name')
                jobs.append({'name':e['name'],'pg':entry['major'],'distro':distro,'reference':ref,'catalog':cat.name})
    if not jobs: raise RuntimeError('Catalog contains no extensions')
    evidence_file=CACHE/'inspected.json'
    if args.reuse_evidence:
        saved=json.loads(evidence_file.read_text());images=saved['images'];database=saved['database']
        if sorted((x['name'],x['pg'],x['distro'],x['reference']) for x in images)!=sorted((x['name'],x['pg'],x['distro'],x['reference']) for x in jobs):
            raise RuntimeError('Cached evidence does not match current catalogs; regenerate it')
    else:
        grype=shutil.which('grype') if args.scan else None
        if args.scan and not grype:raise RuntimeError('--scan requires Grype')
        database={}
        if grype:
            p=subprocess.run([grype,'db','update'],capture_output=True,text=True)
            if p.returncode: database={'error':'Vulnerability database update failed; no current scan is available.'}
            else: database=json.loads(run(grype,'db','status','-o','json'))
        images=[]
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures=[pool.submit(inspect_image,j,grype,database) for j in jobs]
            for f in concurrent.futures.as_completed(futures):
                image=f.result();images.append(image)
                print(f"{len(images)}/{len(jobs)} {image['name']} {image['distro']}: {image['status']}",flush=True)
        evidence_file.write_text(json.dumps({'images':images,'database':database}))
    entries=[]
    content=ROOT/'content/extensions';content.mkdir(parents=True,exist_ok=True)
    for old in content.glob('*/index.md'): old.unlink()
    for name in sorted({j['name'] for j in jobs}):
        variants=sorted([i for i in images if i['name']==name],key=lambda i:(i['distro']!='trixie',-i['pg']))
        publisher='cloudnative-pg' if '/cloudnative-pg/' in variants[0]['reference'] else 'cnpg-extensions'
        repo=publisher+'/postgres-extensions-containers';recipe=recipes.get((repo,name))
        if not recipe:
            # Some upstream recipes use a different image_name. Match README directory from the catalog name.
            source='upstream' if publisher=='cloudnative-pg' else 'source'
            found=list((CACHE/source).rglob(name+'/README.md'))
            if found: recipe={'meta':{},'readme':found[0],'repo':repo,'commit':commits[source],'path':found[0].relative_to(CACHE/source).as_posix(),'build':'Debian'}
        if not recipe: raise RuntimeError('No source README found for published extension '+name)
        text=recipe['readme'].read_text()
        soup=BeautifulSoup(markdown.markdown(text),'html.parser');first=soup.find('p')
        description=first.get_text(' ',strip=True) if first else name
        entry={'name':name,'title':recipe['meta'].get('sql_name',name),'description':description,'publisher':publisher,'build':recipe['build'].capitalize(),
            'source':f"https://github.com/{repo}/blob/{recipe['commit']}/{recipe['path']}", 'variants':variants,
            'version':variants[0]['version'],'distros':sorted({i['distro'] for i in variants}),'pgVersions':sorted({i['pg'] for i in variants}),
            'declaredLicenses':recipe['meta'].get('licenses',[])}
        entries.append(entry)
        directory=content/name;directory.mkdir(exist_ok=True)
        fm={'title':entry['title'],'description':description,'extension':name,'layout':'extension'}
        body=readme_html(text,repo,recipe['commit'],recipe['path'],routes)
        (directory/'index.md').write_text('---\n'+yaml.safe_dump(fm,sort_keys=False)+'---\n'+body+'\n')
    result={'generatedAt':NOW,'commits':commits,'count':len(entries),'extensions':entries,'database':database}
    (ROOT/'data/generated.json').write_text(json.dumps(result))
    search=[{k:v for k,v in e.items() if k!='variants'} for e in entries]
    (ROOT/'static/catalog.json').write_text(json.dumps({'generatedAt':NOW,'extensions':search}))
    # Keep the top-level setup in sync with the published README, without manually duplicating YAML.
    readme=(CACHE/'source/README.md').read_text()
    quick=readme.split('## Quick start',1)[1].split('\n## Supported Extensions',1)[0].strip().rstrip('-\n')
    (ROOT/'content/getting-started.md').write_text('---\ntitle: Get started\ndescription: Install the catalog, configure alerts, and enable extensions in your databases.\n---\n'+
        '<p class="source-note">From the <a href="https://github.com/cnpg-extensions/postgres-extensions-containers/blob/'+commits['source']+'/README.md">project quick start</a>. Requires CloudNativePG 1.29+, PostgreSQL 18+, and Kubernetes with ImageVolume support.</p>\n'+
        readme_html(quick,REPOS['source'],commits['source'],'README.md',routes,depth=1))
    print(f'Generated {len(entries)} extension pages from {len(images)} catalog images',flush=True)

if __name__=='__main__':main()
