// Browser integration checks for the PC keyboard-and-mouse game.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const root=path.resolve(__dirname,'..'),output=path.join(root,'../.qa-canvas');
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}const target=file===root?path.join(root,'index.html'):file;try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true});
  for(const size of [{width:390,height:844},{width:844,height:390},{width:667,height:375}]){
   const page=await browser.newPage({viewport:size,isMobile:true,hasTouch:true}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{Element.prototype.requestFullscreen=()=>Promise.reject(new Error('unsupported'));if(screen.orientation)screen.orientation.lock=()=>Promise.reject(new Error('unsupported'));});
   await page.goto('http://127.0.0.1:'+server.address().port+'/');
   await page.waitForFunction(()=>document.getElementById('selectStatus').textContent.startsWith('準備完了'));
   assert(await page.locator('#mobileGate').isVisible());await page.locator('#mobileStart').tap();
   if(size.width<size.height){assert(await page.locator('#mobileGate').isVisible());await page.setViewportSize({width:844,height:390});}
   await page.waitForFunction(()=>document.getElementById('mobileGate').hidden);
   const tap=async id=>{const b=await page.evaluate(id=>motionTest.menuButtons().find(b=>b.id===id),id),r=await page.locator('#game').boundingBox();await page.touchscreen.tap(r.x+(b.x+b.w/2)*r.width/1100,r.y+(b.y+b.h/2)*r.height/520);};
   await tap('vs');await tap('stage');await tap('fight');assert.equal(await page.evaluate(()=>motionTest.screen),'battle');
   assert.equal(await page.evaluate(()=>motionTest.countdown),3);
   await page.waitForFunction(()=>document.querySelector('main').dataset.transition==='false');
   for(const selector of ['#game','#movePad','.action-pad','#mobilePause']){const r=await page.locator(selector).boundingBox(),v=page.viewportSize();assert(r&&r.x>=0&&r.y>=0&&r.x+r.width<=v.width+1&&r.y+r.height<=v.height+1,selector+' fits viewport');}
   const r=await page.locator('#game').boundingBox();assert(Math.abs(r.width/r.height-1100/520)<.01);
   await page.evaluate(()=>{motionTest.advanceFrame(3);motionTest.enemyAI.cooldown=1000;});
   const pad=page.locator('#movePad');await pad.evaluate(b=>b.setPointerCapture=()=>{});
   const pr=await pad.boundingBox();await pad.dispatchEvent('pointerdown',{pointerId:1,clientX:pr.x+pr.width*.7});
   assert(await page.evaluate(()=>motionTest.keys.right&&!motionTest.keys.dash));
   await pad.dispatchEvent('pointermove',{pointerId:1,clientX:pr.x+pr.width*.95});assert(await page.evaluate(()=>motionTest.keys.right&&motionTest.keys.dash));
   const guard=page.locator('[data-key=guard]');await guard.evaluate(b=>b.setPointerCapture=()=>{});
   await guard.dispatchEvent('pointerdown',{pointerId:2});assert(await page.evaluate(()=>motionTest.keys.right&&motionTest.keys.guard));
   await guard.dispatchEvent('pointercancel',{pointerId:2});assert(await page.evaluate(()=>motionTest.keys.right&&!motionTest.keys.guard));
   await pad.dispatchEvent('pointercancel',{pointerId:1});assert(await page.evaluate(()=>!motionTest.keys.right&&!motionTest.keys.dash));
   await pad.dispatchEvent('pointerdown',{pointerId:3,clientX:pr.x+pr.width*.7});
   await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>!document.getElementById('mobileGate').hidden);
   assert(await page.evaluate(()=>motionTest.paused&&!motionTest.keys.right));
   await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>document.getElementById('mobileGate').hidden);assert(await page.evaluate(()=>motionTest.paused));
   await page.locator('#mobilePause').tap();assert.equal(await page.evaluate(()=>motionTest.paused),false);
   await page.screenshot({path:path.join(output,'mobile-'+size.width+'.png')});assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: mobile start, unsupported fullscreen/lock fallback, touch menus, viewport fit, rotation pause and input release');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
