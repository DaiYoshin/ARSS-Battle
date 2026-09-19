const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const p=path.resolve(__dirname,'..');
(async()=>{for(const standalone of [false,true]){
 const handlers={},elements={};const element=()=>({events:{},addEventListener(n,f){this.events[n]=f;},setPointerCapture(){},getContext(){return{}},setAttribute(){}});
 const get=id=>elements[id]??=element();const buttons=['left','right','dash','guard','punch','kick','jump'].map(key=>({...element(),dataset:{key}}));
 const c={document:{querySelector:get,getElementById:get,querySelectorAll:()=>buttons},window:{addEventListener(n,f){handlers[n]=f;}},Image:class{set src(v){this.onload();}},Promise,console,requestAnimationFrame(){}};vm.createContext(c);
 const scripts=standalone?[...fs.readFileSync(path.join(p,'../sprite-playground.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]):['character.js','app.js'].map(f=>fs.readFileSync(path.join(p,f),'utf8'));
 for(const s of scripts)vm.runInContext(s,c);await new Promise(r=>setImmediate(r));
 const t=c.window.motionTest;const press=(code,repeat=false,form=false)=>handlers.keydown({code,repeat,target:{matches:()=>form},preventDefault(){}});
 assert.equal(t.screen,'title');press('Enter');assert.equal(t.screen,'select');assert(t.selecting);t.update(10);assert.equal(t.countdown,3);press('KeyA');assert.equal(t.actor.state,'idle');get('playerCharacter').events.change({target:{value:'mascot'}});get('enemyCharacter').events.change({target:{value:'green'}});get('difficulty').events.change({target:{value:'hard'}});assert(t.selecting);assert.equal(t.actor.appearance,'mascot');assert.equal(t.enemy.appearance,'green');assert.equal(t.enemyAI.difficulty,'hard');press('Enter');assert.equal(t.screen,'stage');assert(t.selecting);press('Enter');assert.equal(t.selecting,false);assert.equal(t.actor.appearance,'mascot');assert.equal(t.enemy.appearance,'green');t.showCharacterSelect();assert(t.selecting);press('Enter');assert.equal(t.screen,'stage');press('Enter');assert.equal(t.selecting,false);
 const ready=()=>{t.reset();t.update(3);t.enemyAI.cooldown=100;};ready();press('ArrowRight');press('ShiftLeft');t.update(.01);assert(t.actor.vx>180);handlers.keyup({code:'ArrowRight'});handlers.keyup({code:'ShiftLeft'});t.update(.01);assert.equal(t.actor.vx,0);
 ready();press('KeyA');assert.equal(t.actor.state,'punch');ready();press('KeyS');assert.equal(t.actor.state,'kick');ready();press('KeyD');t.update(0);assert.equal(t.actor.state,'guard');handlers.keyup({code:'KeyD'});t.update(.01);assert.equal(t.actor.state,'idle');
 ready();press('Space');t.update(.02);press('KeyA');assert.equal(t.actor.state,'air_punch');
 ready();press('KeyA',true);assert.equal(t.actor.state,'idle');press('KeyA',false,true);assert.equal(t.actor.state,'idle');press('KeyL');assert.equal(t.actor.state,'idle');
 handlers.blur();assert(t.paused);press('Escape',false,true);assert.equal(t.paused,false);press('Escape');press('KeyR');assert.equal(t.paused,false);assert.equal(t.countdown,3);
 ready();const right=buttons[1];right.events.pointerdown({preventDefault(){},pointerId:1});t.update(.01);assert(t.actor.vx>0);right.events.pointercancel();t.update(.01);assert.equal(t.actor.vx,0);
 console.log('PASS: '+(standalone?'standalone':'source')+' keyboard, aerial, guard, repeat/form isolation, debug lock, pause/reset, pointer cancellation');
}

})().catch(e=>{console.error(e);process.exitCode=1;});
