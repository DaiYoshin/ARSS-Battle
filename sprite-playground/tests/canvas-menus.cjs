// Browser integration checks for the PC keyboard-and-mouse game.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const root=path.resolve(__dirname,'..'),output=path.join(root,'../.qa-canvas');
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}const target=file===root?path.join(root,'index.html'):file;try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true});
  for(const standalone of [false,true]){
   const page=await browser.newPage({viewport:{width:1200,height:820}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(standalone?'file://'+path.join(root,'../sprite-playground.html'):'http://127.0.0.1:'+server.address().port+'/');
   await page.waitForFunction(()=>document.getElementById('selectStatus').textContent.startsWith('準備完了'));
   const state=()=>page.evaluate(()=>motionTest.screen);
   const click=async id=>{const b=await page.evaluate(id=>motionTest.menuButtons().find(b=>b.id===id),id);assert(b,id);const rect=await page.locator('#game').boundingBox();await page.mouse.click(rect.x+(b.x+b.w/2)*rect.width/1100,rect.y+(b.y+b.h/2)*rect.height/520);};
   assert.equal(await state(),'title');assert.deepEqual(await page.evaluate(()=>motionTest.menuButtons().map(b=>b.id)),['vs','arcade','options']);await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'title.png')});
   assert.equal(await page.evaluate(()=>document.activeElement.id),'game');
   await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await state(),'select');assert.equal(await page.evaluate(()=>motionTest.playMode),'arcade');
   await page.keyboard.press('Escape');await page.keyboard.press('ArrowUp');await page.keyboard.press('Space');assert.equal(await state(),'options');
   await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>motionTest.enemyAI.difficulty),'hard');
   await page.keyboard.press('Escape');await page.keyboard.press('Enter');assert.equal(await state(),'select');assert.equal(await page.evaluate(()=>motionTest.playMode),'vs');
   await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');assert.equal(await state(),'stage');await page.keyboard.press('x');await page.keyboard.press('Enter');assert.equal(await state(),'battle');
   await page.evaluate(()=>{const t=motionTest;t.enemyAI.cooldown=1000;for(let i=0;i<2;i++){t.advanceFrame(3);t.enemy.knockDown();t.advanceFrame(0);t.advanceFrame(4);}});assert.equal(await state(),'result');await page.keyboard.press('Enter');assert.equal(await state(),'title');
   await page.keyboard.press('Shift+Tab');await page.keyboard.press('Enter');assert.equal(await state(),'options');await page.keyboard.press('Escape');
   await click('arcade');assert.equal(await state(),'select');assert.equal(await page.evaluate(()=>motionTest.menuButtons().some(b=>b.id==='player')),true);assert.equal(await page.evaluate(()=>motionTest.menuButtons().some(b=>b.id==='enemy')),false);assert.equal(await page.evaluate(()=>motionTest.menuButtons().filter(b=>b.fighter).length),7);await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'arcade-select.png')});await click('fighter:fish');assert.notEqual(await page.evaluate(()=>motionTest.enemy.appearance),'fish');await click('arcadeStart');assert.equal(await state(),'battle');await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'arcade-1.png')});
   for(let match=0;match<4;match++){await page.evaluate(()=>{const t=motionTest;t.enemyAI.cooldown=1000;for(let round=0;round<2;round++){t.advanceFrame(3);t.enemy.knockDown();t.advanceFrame(0);t.advanceFrame(4);}});assert.equal(await state(),match===3?'result':'battle');}
   assert.equal(await page.locator('#matchOutcome').textContent(),'ARCADE CLEAR');assert.equal(await page.locator('#matchScore').textContent(),'');assert.equal(await page.locator('#matchSummary').textContent(),'');await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'arcade-clear.png')});await click('title');assert.equal(await state(),'title');
   await click('arcade');await click('arcadeStart');await page.evaluate(()=>{const t=motionTest;t.enemyAI.cooldown=1000;for(let round=0;round<2;round++){t.advanceFrame(3);t.actor.knockDown();t.advanceFrame(0);t.advanceFrame(4);}});assert.equal(await state(),'result');assert.equal(await page.locator('#matchOutcome').textContent(),'ARCADE OVER');assert.equal(await page.locator('#matchScore').textContent(),'0 / 4');await click('title');
   await click('options');assert.equal(await state(),'options');await click('difficulty:hard');assert.equal(await page.evaluate(()=>motionTest.enemyAI.difficulty),'hard');await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'options.png')});await click('title');

   await click('vs');
   const beforeHover=await page.evaluate(()=>({actor:motionTest.actor.appearance,enemy:motionTest.enemy.appearance,name:document.getElementById('playerName').textContent,portrait:document.getElementById('playerPortrait').toDataURL(),thumb:document.getElementById('thumb-white').toDataURL()}));
   const hover=async id=>{const b=await page.evaluate(id=>motionTest.menuButtons().find(b=>b.id===id),id),rect=await page.locator('#game').boundingBox();await page.mouse.move(rect.x+(b.x+b.w/2)*rect.width/1100,rect.y+(b.y+b.h/2)*rect.height/520);};
   await hover('fighter:white');
   assert.equal(await page.locator('#playerName').textContent(),'メづすりν');
   assert.deepEqual(await page.evaluate(()=>[motionTest.actor.appearance,motionTest.enemy.appearance]),[beforeHover.actor,beforeHover.enemy]);
   assert.equal(await page.evaluate(()=>document.getElementById('thumb-white').toDataURL()),beforeHover.thumb);
   await page.mouse.move(0,0);
   assert.equal(await page.locator('#playerName').textContent(),beforeHover.name);
   assert.equal(await page.evaluate(()=>document.getElementById('playerPortrait').toDataURL()),beforeHover.portrait);
   await click('enemy');await hover('fighter:fish');
   assert.equal(await page.locator('#enemyName').textContent(),'ダンクルオステウス');
   assert.deepEqual(await page.evaluate(()=>[motionTest.actor.appearance,motionTest.enemy.appearance]),[beforeHover.actor,beforeHover.enemy]);
   await click('fighter:fish');assert.equal(await page.evaluate(()=>motionTest.enemy.appearance),'fish');
   await click('player');
   for(const id of ['mascot','green','white','headset','gray','blackcat','fish']){
    await hover('fighter:'+id);
    await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'portrait-'+id+'.png')});
   }
   const keyed=await page.evaluate(()=>portraitIds.map(id=>{const c=sheets['portrait_'+id],d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let opaque=0,magenta=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>128){opaque++;if(Math.min(d[i],d[i+2])-d[i+1]>100)magenta++;}}return {id,corner:d[3],opaque,magenta};}));
   for(const p of keyed){assert.equal(p.corner,0,p.id+' transparent backdrop');assert(p.opaque>10000,p.id+' visible artwork');assert.equal(p.magenta,0,p.id+' no magenta background');}
   await page.mouse.move(0,0);
   assert.equal(await state(),'select');await click('fighter:blackcat');await click('enemy');await click('fighter:gray');assert.deepEqual(await page.evaluate(()=>[motionTest.actor.appearance,motionTest.enemy.appearance,motionTest.enemyAI.difficulty]),['blackcat','gray','hard']);await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'select.png')});
   await click('stage');assert.equal(await state(),'stage');assert.equal(await page.evaluate(()=>motionTest.menuButtons().filter(b=>b.stage).length),4);await click('stage:highway');assert.equal(await page.evaluate(()=>motionTest.selectedStage),'highway');await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'stage.png')});
   await page.keyboard.press('z');assert.equal(await page.evaluate(()=>motionTest.selectedStage),'beach');await page.keyboard.press('x');assert.equal(await page.evaluate(()=>motionTest.selectedStage),'highway');await click('fight');assert.equal(await state(),'battle');await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'battle.png')});
   await page.evaluate(()=>{const t=motionTest;t.enemyAI.cooldown=1000;for(let i=0;i<2;i++){t.advanceFrame(3);t.enemy.knockDown();t.advanceFrame(0);t.advanceFrame(4);}});assert.equal(await state(),'result');await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'result.png')});
   await click('title');await page.setViewportSize({width:1200,height:500});await page.locator('#game').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>scrollY),0);await page.setViewportSize({width:390,height:760});assert(await page.locator('main').isVisible());
   assert.deepEqual(errors,[]);await page.close();console.log('PASS: '+(standalone?'standalone':'source')+' title modes, options difficulty, VS flow and mobile notice');
  }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
