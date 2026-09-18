const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const elements={},get=id=>elements[id]??={addEventListener(){},setAttribute(){},getContext(){return{}},textContent:''};
let tracks=[],instances=[],failStart=false,failMP4=false;
get('#game').captureStream=()=>{const track={stopped:false,stop(){this.stopped=true;}};tracks.push(track);return{getTracks:()=>[track]};};
class Recorder{
 static isTypeSupported(type){return type.includes('mp4');}
 constructor(stream,options){this.state='inactive';this.mimeType=options?.mimeType||'video/webm';instances.push(this);}
 start(){if(failStart||(failMP4&&this.mimeType.includes('mp4')))throw Error('test failure');this.state='recording';}
 pause(){this.state='paused';}resume(){this.state='recording';}
 stop(){this.state='inactive';}
 finish(data='video'){this.ondataavailable({data:new Blob([data])});this.onstop();}
}
const c={document:{querySelector:get,getElementById:get,querySelectorAll:()=>[]},window:{addEventListener(){}},Image:class{set src(v){this.onload();}},MediaRecorder:Recorder,Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Promise,console,requestAnimationFrame(){}};
vm.createContext(c);for(const f of ['character.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),c);
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));const t=c.window.motionTest,button=get('record');t.reset();
 button.onclick();let r=instances.at(-1);assert.equal(r.state,'recording');t.setPaused(true);assert.equal(r.state,'paused');t.setPaused(false);assert.equal(r.state,'recording');
 t.setPaused(true);button.onclick();assert(button.disabled);const count=instances.length;button.onclick();assert.equal(instances.length,count);r.finish();assert.equal(button.disabled,false);assert(tracks.at(-1).stopped);assert(get('recordDownload').download.endsWith('.mp4'));assert.equal(get('recordPreview').src,'blob:test');
 button.onclick();r=instances.at(-1);t.reset();assert.equal(r.state,'inactive');r.finish();assert.equal(t.countdown,3);
 button.onclick();r=instances.at(-1);r.onerror();r.finish();assert(get('recordStatus').textContent.includes('保存できません'));assert.equal(button.disabled,false);
 failMP4=true;button.onclick();r=instances.at(-1);assert.equal(r.state,'recording');assert.equal(r.mimeType,'video/webm');button.onclick();r.finish();assert(get('recordDownload').download.endsWith('.webm'));failMP4=false;
 failStart=true;button.onclick();assert(tracks.at(-1).stopped);assert.equal(button.disabled,false);assert(get('recordStatus').textContent.includes('開始できません'));

 failStart=false;t.showCharacterSelect();t.activateMenu('record');r=instances.at(-1);assert.equal(r.state,'recording');assert.equal(t.screen,'select');const selectedRecording=r;
 t.activateMenu('fight');assert.equal(t.screen,'battle');assert.equal(r.state,'recording');assert.equal(instances.at(-1),selectedRecording);
 for(let i=0;i<2;i++){t.advanceFrame(3);t.enemyAI.cooldown=1000;t.enemy.knockDown();t.advanceFrame(0);t.advanceFrame(4);}
 assert.equal(t.screen,'result');assert.equal(r.state,'recording');t.advanceFrame(1.99);assert.equal(r.state,'recording');t.advanceFrame(.02);assert.equal(r.state,'inactive');r.finish();assert(tracks.at(-1).stopped);
 console.log('PASS: selection recording remains continuous through battle and includes two seconds of results');
 console.log('PASS: recorder pause/resume, paused stop, finalization lock, reset, MP4 preview, errors and resource cleanup');
})();
