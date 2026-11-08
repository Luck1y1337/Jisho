const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),stage=path.join(root,'tmp','release-stage');
fs.mkdirSync(stage,{recursive:true});
const previousDist=path.join(stage,'dist');if(previousDist.startsWith(stage+path.sep)&&fs.existsSync(previousDist))fs.rmSync(previousDist,{recursive:true});
const dest=path.join(stage,'src');
if(fs.existsSync(dest)){if(!dest.startsWith(root+path.sep+'tmp'+path.sep))throw Error('Invalid build path');fs.rmSync(dest,{recursive:true})}
fs.cpSync(path.join(root,'src'),dest,{recursive:true});
const lessonsDir=path.join(dest,'assets','lessons');if(lessonsDir.startsWith(stage+path.sep)&&fs.existsSync(lessonsDir))fs.rmSync(lessonsDir,{recursive:true});
fs.copyFileSync(path.join(root,'package.json'),path.join(stage,'package.json'));
const sign=path.join(root,'sign');fs.mkdirSync(sign,{recursive:true});
if(!fs.existsSync(path.join(sign,'private.pem'))&&!fs.existsSync(path.join(sign,'certificate.pem'))){
 const crypto=require('crypto'),{KJUR}=require('jsrsasign');
 const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
 const cert=KJUR.asn1.x509.X509Util.newCertPEM({serial:{int:20261108},sigalg:'SHA256withRSA',issuer:{str:'/CN=Jisho Local Release'},notbefore:'261108000000Z',notafter:'361108000000Z',subject:{str:'/CN=Jisho Local Release'},sbjpubkey:keys.publicKey,cakey:keys.privateKey});
 fs.writeFileSync(path.join(sign,'private.pem'),keys.privateKey,{mode:0o600});fs.writeFileSync(path.join(sign,'certificate.pem'),cert);
}
if(!fs.existsSync(path.join(sign,'private.pem'))||!fs.existsSync(path.join(sign,'certificate.pem')))throw Error('Incomplete signing pair');
fs.cpSync(sign,path.join(stage,'sign'),{recursive:true});
if(!fs.existsSync(path.join(stage,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(stage,'node_modules'),'junction');
const result=cp.spawnSync(process.execPath,[path.join(root,'node_modules/aiot-toolkit/lib/bin.js'),'release'],{cwd:stage,stdio:'inherit',windowsHide:true});
if(result.status)process.exit(result.status);
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
for(const f of fs.readdirSync(path.join(stage,'dist')).filter(f=>f.endsWith('.rpk')))fs.copyFileSync(path.join(stage,'dist',f),path.join(root,'dist',f));
