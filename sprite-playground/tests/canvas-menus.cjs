// Browser integration checks for the PC keyboard-and-mouse game.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const root=path.resolve(__dirname,'..'),output=path.join(root,'../.qa-canvas');
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}const target=file===root?path.join(root,'index.html'):file;try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.writeHead(404);res.end();}});
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
   await click('arcade');assert.equal(await state(),'arcade');await page.keyboard.press('Escape');assert.equal(await state(),'title');
   await click('options');assert.equal(await state(),'options');await click('difficulty:hard');assert.equal(await page.evaluate(()=>motionTest.enemyAI.difficulty),'hard');await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'options.png')});await click('title');
   await click('vs');assert.equal(await state(),'select');await click('fighter:blackcat');await click('enemy');await click('fighter:gray');assert.deepEqual(await page.evaluate(()=>[motionTest.actor.appearance,motionTest.enemy.appearance,motionTest.enemyAI.difficulty]),['blackcat','gray','hard']);await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'select.png')});
   await click('fight');assert.equal(await state(),'battle');await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'battle.png')});
   await page.evaluate(()=>{const t=motionTest;t.enemyAI.cooldown=1000;for(let i=0;i<2;i++){t.advanceFrame(3);t.enemy.knockDown();t.advanceFrame(0);t.advanceFrame(4);}});assert.equal(await state(),'result');await page.screenshot({path:path.join(output,(standalone?'standalone-':'source-')+'result.png')});
   await click('title');await page.setViewportSize({width:1200,height:500});await page.locator('#game').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>scrollY),0);await page.setViewportSize({width:390,height:760});assert(await page.evaluate(()=>getComputedStyle(document.body,'::before').content.includes('PC専用')));assert(await page.locator('main').isHidden());
   assert.deepEqual(errors,[]);await page.close();console.log('PASS: '+(standalone?'standalone':'source')+' title modes, options difficulty, VS flow and mobile notice');
  }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
