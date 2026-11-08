from pathlib import Path
import zipfile,json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1]
dest=ROOT/'results';dest.mkdir(exist_ok=True)
release=ROOT/'dist/com.luck1y.jisho.release.1.0.1.rpk'
with zipfile.ZipFile(release) as z:
    assert z.testzip() is None
    manifest=json.loads(z.read('manifest.json'))
    assert manifest['package']=='com.luck1y.jisho' and manifest['versionName']=='1.0.1'
    assert 'META-INF/CERT' in z.namelist()
    assert any(n.replace('\\','/')=='Home/index.js' for n in z.namelist())
    assert not any('private.pem' in n for n in z.namelist())
shutil.copy2(release,dest/'jisho-1.0.1.rpk')
files=['package.json','package-lock.json','.gitignore','.nvmrc','requirements-assets.txt','README.md','BUILD_REPORT.md','MINNA_SOURCE_AUDIT.md','MINNA_25_LESSONS_VOCAB_SOURCE.md','JISHO_FULL_APP_PROMPT.md']
folders=['src','data','tools','tests','design-system','preview']
audit_files=['coverage.json','content-corrections.json','source-check.json','verify_source.py']
with zipfile.ZipFile(dest/'JISHO_SOURCE.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    z.write(dest/'jisho-1.0.1.rpk','results/jisho-1.0.1.rpk')
    for name in files:
        if (ROOT/name).exists():z.write(ROOT/name,name)
    for name in folders:
        for p in sorted((ROOT/name).rglob('*')):
            if p.is_file() and '__pycache__' not in p.parts:z.write(p,p.relative_to(ROOT).as_posix())
    for name in audit_files:
        p=ROOT/'audit'/name
        if p.exists():z.write(p,p.relative_to(ROOT).as_posix())
    for p in (ROOT/'results/qa').glob('*.json'):z.write(p,'docs/qa/'+p.name)
preview=ROOT/'dist/preview'
server=r'''const http=require('http'),fs=require('fs'),path=require('path');const root=__dirname;
http.createServer((req,res)=>{let uri;try{uri=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch(e){res.writeHead(400).end();return}const file=path.resolve(root,'.'+(uri==='/'?'/index.html':uri));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404).end();return}const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res)}).listen(4173,'127.0.0.1',()=>console.log('Jisho: http://127.0.0.1:4173'));
'''
with zipfile.ZipFile(dest/'JISHO_PREVIEW.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(preview.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(preview).as_posix())
    z.writestr('serve.cjs',server)
    z.writestr('README.md','# Jisho\n\nЗапуск: `node serve.cjs`. Затем открой http://127.0.0.1:4173. Нужен Node.js.\n')
for name in ['JISHO_SOURCE.zip','JISHO_PREVIEW.zip']:
    with zipfile.ZipFile(dest/name) as z:
        assert z.testzip() is None
        assert not any(n.startswith(('sign/','node_modules/','.tools/')) or 'private.pem' in n for n in z.namelist())
targets=['jisho-1.0.1.rpk','JISHO_SOURCE.zip','JISHO_PREVIEW.zip']
(dest/'SHA256SUMS.txt').write_text('\n'.join(hashlib.sha256((dest/n).read_bytes()).hexdigest()+'  '+n for n in targets)+'\n',encoding='ascii')
(dest/'README.md').write_text((ROOT/'README.md').read_text(encoding='utf-8').replace('(results/','('),encoding='utf-8')
print('\n'.join(n+': '+str((dest/n).stat().st_size)+' bytes' for n in targets))
