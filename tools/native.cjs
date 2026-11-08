const fs=require('fs'),path=require('path'),{spawnSync,spawn}=require('child_process');
const grpc=require('@grpc/grpc-js'),loader=require('@grpc/proto-loader');
const proto=require.resolve('@aiot-toolkit/emulator/lib/static/proto/emulator_controller.proto');
const pkg=grpc.loadPackageDefinition(loader.loadSync(proto,{keepCase:true,longs:String,enums:String,defaults:true,oneofs:true}));
const client=new pkg.android.emulation.control.EmulatorController('127.0.0.1:8564',grpc.credentials.createInsecure());
const call=(name,data)=>new Promise((ok,no)=>client[name](data,{deadline:Date.now()+15000},(e,r)=>e?no(e):ok(r)));
const adb=String.raw`C:\Users\Luck1y\Desktop\Game Mi Band\node_modules\@miwt\adb\bin\win\adb.exe`;
function ad(...args){const r=spawnSync(adb,['-s','127.0.0.1:5593',...args],{encoding:'utf8',timeout:20000,windowsHide:true});if(r.status)throw Error(r.stderr||r.stdout);return r.stdout}
async function main(){const cmd=process.argv[2];if(cmd==='deploy'){console.log(ad('push','dist/com.luck1y.jisho.release.1.0.1.rpk','/data/quickapp/app/com.luck1y.jisho.rpk'));ad('shell','mkdir','-p','/data/quickapp/app/com.luck1y.jisho');console.log(ad('shell','unzip','-o','/data/quickapp/app/com.luck1y.jisho.rpk','-d','/data/quickapp/app/com.luck1y.jisho'));const p=spawn(adb,['-s','127.0.0.1:5593','shell','vapp app/com.luck1y.jisho &'],{stdio:'ignore',detached:true,windowsHide:true});p.unref()}
else if(cmd==='shot'){const d=await call('getScreenshot',{format:'PNG',width:212,height:520});const dest=process.argv[3]||'results/screenshots/native.png';fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,d.image);console.log(dest,d.image.length)}
else if(cmd==='tap'){const x=+process.argv[3],y=+process.argv[4];await call('sendMouse',{x,y,buttons:1});await new Promise(r=>setTimeout(r,120));await call('sendMouse',{x,y,buttons:0});await new Promise(r=>setTimeout(r,400))}
else if(cmd==='swipe'){const x=106,y=+process.argv[3],end=+process.argv[4];await call('sendTouch',{touches:[{x,y,identifier:0,pressure:500}]});for(let i=1;i<=8;i++){await new Promise(r=>setTimeout(r,25));await call('sendTouch',{touches:[{x,y:y+(end-y)*i/8,identifier:0,pressure:500}]})}await call('sendTouch',{touches:[{x,y:end,identifier:0,pressure:0}]})}
else if(cmd==='reset')await call('setVmState',{state:'RESET'});
else if(cmd==='log')console.log(ad('logcat','-d').slice(-15000));
else if(cmd==='status')console.log(await call('getStatus',{}));
client.close()}
main().catch(e=>{console.error(e.stack);client.close();process.exitCode=1});
