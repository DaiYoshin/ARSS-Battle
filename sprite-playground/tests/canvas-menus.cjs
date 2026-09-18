// Browser integration checks. Run with Playwright available via NODE_PATH.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const root=path.resolve(__dirname,'..'),output=path.join(root,'../.qa-canvas');
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}const target=file===root?path.join(root,'index.html'):file;try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({headless:true});
 for(const standalone of [false,true]){
  const page=await browser.newPage({viewport:{width:1200,height:820},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(standalone?'file://'+path.join(root,'../sprite-playground.html'):'http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>document.getElementById('selectStatus').textContent.startsWith('準備完了'));
  const state=()=>page.evaluate(()=>window.motionTest.screen);
  const click=async id=>{const b=await page.evaluate(id=>window.motionTest.menuButtons().find(b=>b.id===id),id);assert(b,id);const rect=await page.locator('#game').boundingBox();const pointer=page.viewportSize().width===390?page.touchscreen:page.mouse;await pointer[page.viewportSize().width===390?'tap':'click'](rect.x+(b.x+b.w/2)*rect.width/1100,rect.y+(b.y+b.h/2)*rect.height/520);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
  assert(await page.locator('#game').isVisible());assert.equal(await state(),'title');
  await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'title.png')});
  await click('start');assert.equal(await state(),'select');
  assert.equal(await page.evaluate(()=>motionTest.menuButtons().filter(b=>b.fighter).length),7);
  await click('fighter:blackcat');await click('enemy');await click('fighter:blackcat');assert(await page.evaluate(()=>{const b=motionTest.menuButtons().find(b=>b.fighter==='blackcat');return b.playerSelected&&b.cpuSelected;}));await click('fighter:gray');await click('difficulty');
  assert.deepEqual(await page.evaluate(()=>[motionTest.actor.appearance,motionTest.enemy.appearance,motionTest.enemyAI.difficulty]),['blackcat','gray','hard']);
  await page.keyboard.press('q');assert.equal(await page.evaluate(()=>motionTest.enemyAI.difficulty),'normal');
  await page.keyboard.press('1');await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>motionTest.actor.appearance),'fish');
  await click('player');await click('fighter:blackcat');await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'select.png')});
  await click('player');await click('fighter:white');await click('enemy');await click('fighter:green');
  assert.equal(await page.locator('#playerName').textContent(),'メづすりν');
  await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'nu-select.png')});
  await click('fight');
  const whiteStates=await page.evaluate(()=>{
   const t=motionTest,c=document.getElementById('game').getContext('2d'),draw=c.drawImage,seen=[];
   for(const state of ['idle','walk','dash','jump','land','guard','punch','kick','air_punch','air_kick','hurt','down']){
    t.actor.enter(state);t.actor.stateTime=0;
    const pose=t.actor.pose(),name=pose.animation==='idle'?'white_idle':pose.animation,images=[];
    c.drawImage=function(im,...args){images.push(im.src);return draw.call(this,im,...args);};
    try{t.draw(pose);}finally{c.drawImage=draw;}
    const expected=typeof embeddedAssets==='object'?embeddedAssets[name]:new URL('assets/'+name+'.png',location.href).href;
    seen.push([state,images.includes(expected)]);
   }
   return seen;
  });
  for(const [state,drawn] of whiteStates)assert(drawn,'white image drawn for '+state);
  await page.evaluate(()=>{motionTest.reset();motionTest.draw(motionTest.actor.pose());});
  await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'nu-battle.png')});
  await page.evaluate(()=>motionTest.showCharacterSelect());
  assert.equal(await page.evaluate(()=>motionTest.menuButtons().filter(b=>b.stage).length),4);
  for(const stage of ['beach','highway','restaurant','library']){
   await click('stage:'+stage);assert.equal(await page.evaluate(()=>motionTest.selectedStage),stage);
   await click('fight');assert.equal(await state(),'battle');
   const drawn=await page.evaluate(()=>{const c=document.getElementById('game').getContext('2d'),original=c.drawImage,images=[];c.drawImage=function(im,...args){images.push(im.src);return original.call(this,im,...args);};motionTest.draw(motionTest.actor.pose());c.drawImage=original;return images[0];});
   assert(drawn&&(standalone?drawn.startsWith('data:image/png'):drawn.endsWith('/'+stage+'.png')),'selected background rendered');
   await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+stage+'-battle.png')});
   await page.evaluate(()=>motionTest.showCharacterSelect());assert.equal(await page.evaluate(()=>motionTest.selectedStage),stage);
  }
  await page.keyboard.press('x');assert.equal(await page.evaluate(()=>motionTest.selectedStage),'beach');await page.keyboard.press('z');assert.equal(await page.evaluate(()=>motionTest.selectedStage),'library');
  // Same hitboxes at a narrow viewport; touch uses the same PointerEvent path.
  await page.setViewportSize({width:390,height:760});await click('stage:highway');assert.equal(await page.evaluate(()=>motionTest.selectedStage),'highway');await click('enemy');await click('fighter:white');assert.equal(await page.evaluate(()=>motionTest.enemy.appearance),'white');
  await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'mobile.png')});
  await click('fight');assert.equal(await state(),'battle');assert(await page.locator('#game').isVisible());
  await page.evaluate(()=>{const t=motionTest;t.enemyAI.cooldown=1000;for(let i=0;i<2;i++){t.advanceFrame(3);t.enemy.knockDown();t.advanceFrame(0);t.advanceFrame(4);}});
  assert.equal(await state(),'result');assert.equal(await page.evaluate(()=>motionTest.selectedStage),'highway');assert(await page.locator('#game').isVisible());
  await page.setViewportSize({width:1200,height:820});await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'result.png')});
  await click('title');assert.equal(await state(),'title');
  // Cancelled pointer must never activate a button.
  const rect=await page.locator('#game').boundingBox(),pt={pointerId:7,clientX:rect.x+550*rect.width/1100,clientY:rect.y+383*rect.height/520};
  // Dispatch without native capture for a cancelled synthetic gesture.
  await page.evaluate(()=>{document.getElementById('game').setPointerCapture=()=>{};});
  await page.locator('#game').dispatchEvent('pointerdown',pt);await page.locator('#game').dispatchEvent('pointercancel',pt);await page.locator('#game').dispatchEvent('pointerup',pt);assert.equal(await state(),'title');
  await page.locator('#game').dispatchEvent('pointerdown',pt);await page.locator('#game').dispatchEvent('pointerup',{...pt,clientX:rect.x+5});assert.equal(await state(),'title');
  await page.locator('#game').focus();await page.keyboard.press('Enter');assert.equal(await state(),'select');await page.keyboard.press('Escape');assert.equal(await state(),'title');

  await click('start');await click('record');assert.equal(await state(),'select');
  await page.waitForTimeout(400);await click('fighter:blackcat');await click('fight');assert.equal(await state(),'battle');
  await page.waitForTimeout(400);
  await page.evaluate(()=>{const t=motionTest;t.enemyAI.cooldown=1000;for(let i=0;i<2;i++){t.advanceFrame(3);t.enemy.knockDown();t.advanceFrame(0);t.advanceFrame(4);}});
  await page.waitForFunction(()=>document.getElementById('recordStatus').textContent.startsWith('録画完了'));
  await page.waitForFunction(()=>document.getElementById('recordPreview').readyState>=2);
  assert.equal(await state(),'result');assert(await page.locator('#recordDownload').isVisible());
  const video=await page.locator('#recordPreview').evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));assert(video.duration>=2);assert.equal(video.width,1100);assert.equal(video.height,520);
  console.log('PASS: real selection-to-result recording decodes ('+video.duration.toFixed(2)+' seconds)');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS: '+(standalone?'standalone':'source')+' canvas screens, scaled pointer selection, difficulty, keys, battle and result');
 }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
