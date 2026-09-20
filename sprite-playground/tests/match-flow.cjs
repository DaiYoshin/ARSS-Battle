const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{for(const standalone of [false,true]){
 const elements={},handlers={};const get=id=>elements[id]??={hidden:false,textContent:'',addEventListener(n,f){this[n]=f;},setAttribute(){},getContext(){return{}},focus(){}};
 const tracks=[];get('#game').captureStream=()=>{const track={stopped:false,stop(){this.stopped=true}};tracks.push(track);return{getTracks:()=>[track]}};
 class Recorder{static isTypeSupported(){return true}constructor(){this.state='inactive';this.mimeType='video/mp4'}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['test'])});this.onstop?.()}pause(){this.state='paused'}resume(){this.state='recording'}}
 const c={document:{querySelector:get,getElementById:get,querySelectorAll:()=>[]},window:{addEventListener(n,f){handlers[n]=f}},Image:class{set src(v){this.onload()}},Promise,console,MediaRecorder:Recorder,Blob,URL:{createObjectURL:()=> 'blob:video',revokeObjectURL(){}},requestAnimationFrame(){}};
 vm.createContext(c);
 const scripts=standalone?[...fs.readFileSync(path.join(root,'../sprite-playground.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]):['character.js','app.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8'));
 scripts.forEach(s=>vm.runInContext(s,c));await new Promise(r=>setImmediate(r));const t=c.window.motionTest;
 assert.equal(t.screen,'title');assert.equal(get('titleScreen').hidden,false);assert(get('characterSelect').hidden);t.advanceFrame(30);assert.equal(t.countdown,3);assert.equal(t.requestAttack('punch'),false);
 get('titleStart').onclick();assert.equal(t.screen,'select');get('selectBack').onclick();assert.equal(t.screen,'title');get('titleStart').onclick();
 const key=code=>handlers.keydown({code,repeat:false,preventDefault(){},target:{matches:()=>false}});
 get('selectPlayer').onclick();get('roster-mascot').onclick();key('ArrowRight');assert.equal(t.actor.appearance,'green');key('ArrowDown');assert.equal(t.actor.appearance,'headset');
 key('Digit2');get('enemy-roster-headset').onclick();assert.equal(t.enemy.appearance,'headset');assert.equal(t.actor.appearance,'headset');key('ArrowLeft');assert.equal(t.enemy.appearance,'blackcat');
 assert.equal(get('marker-headset').textContent,'1P');assert.equal(get('enemy-marker-blackcat').textContent,'CPU');
 const portraitOps=[];get('enemyPortrait').getContext=()=>({clearRect(){},save(){},restore(){},translate(x,y){portraitOps.push(['translate',x,y]);},scale(x,y){portraitOps.push(['scale',x,y]);},drawImage(){}});
 get('selectPlayer').onclick();assert(portraitOps.some(op=>op[0]==='scale'&&op[1]===-1&&op[2]===1));
 get('roster-gray').onclick();assert.equal(t.actor.appearance,'gray');assert.equal(get('playerName').textContent,'グレイ');key('ArrowDown');assert.equal(t.actor.appearance,'fish');key('ArrowUp');assert.equal(t.actor.appearance,'gray');key('ArrowRight');assert.equal(t.actor.appearance,'mascot');key('ArrowDown');assert.equal(t.actor.appearance,'blackcat');assert.equal(get('playerName').textContent,'黒猫');get('enemy-roster-blackcat').onclick();assert.equal(t.enemy.appearance,'blackcat');t.activateMenu('stage');t.activateMenu('fight');assert.equal(t.actor.appearance,'blackcat');assert.equal(t.enemy.appearance,'blackcat');t.showCharacterSelect();get('roster-gray').onclick();
 get('enemy-roster-gray').onclick();assert.equal(t.enemy.appearance,'gray');t.activateMenu('stage');t.activateMenu('fight');assert.equal(t.screen,'battle');assert.equal(t.actor.appearance,'gray');t.showCharacterSelect();
 get('selectPlayer').onclick();get('roster-white').onclick();assert.equal(t.actor.appearance,'white');assert.equal(get('playerName').textContent,'メづすりν');
 key('ArrowRight');assert.equal(t.actor.appearance,'white','single-cell row wraps safely');
 key('ArrowUp');assert.equal(t.actor.appearance,'blackcat');key('ArrowDown');assert.equal(t.actor.appearance,'white');
 get('enemy-roster-white').onclick();t.activateMenu('stage');t.activateMenu('fight');assert.equal(t.actor.appearance,'white');assert.equal(t.enemy.appearance,'white');t.showCharacterSelect();
 console.log('PASS: cursor selection keyboard/click, independent sides, shared choice and opponent portrait mirror');
 t.showCharacterSelect('arcade');t.activateMenu('arcadeStart');
 for(let match=0;match<4;match++){
  assert.equal(t.arcadeMatchIndex,match);
  assert.equal(t.enemy.appearance==='commander',match===3);
  for(let round=0;round<2;round++){
   assert.equal(t.enemy.hp,match===3?150:100);
   t.advanceFrame(3);t.enemyAI.cooldown=1000;t.enemy.knockDown();t.advanceFrame(0);t.advanceFrame(4);
  }
 }
 assert.equal(t.screen,'result');assert.equal(get('matchOutcome').textContent,'ARCADE CLEAR');
 assert.equal(t.arcadeResults[3].opponent,'commander');
 t.showTitle();t.showCharacterSelect('vs');assert.notEqual(t.enemy.appearance,'commander');
 console.log('PASS: final commander boss, round health reset, arcade clear and VS return');

 get('playerCharacter').change({target:{value:'mascot'}});get('enemyCharacter').change({target:{value:'green'}});get('difficulty').change({target:{value:'hard'}});
 t.activateMenu('stage');t.activateMenu('fight');assert.equal(t.screen,'battle');assert.equal(t.actor.appearance,'mascot');assert.equal(t.enemy.appearance,'green');assert.equal(t.enemyAI.difficulty,'hard');
 function endRound(winner){t.advanceFrame(3);t.enemyAI.cooldown=1000;if(winner==='player')t.enemy.knockDown();else if(winner==='cpu')t.actor.knockDown();else{t.actor.knockDown();t.enemy.knockDown();}t.advanceFrame(0);}
 for(const sequence of [['player','player'],['cpu','cpu'],['player','cpu','player'],['cpu','player','cpu']]){
  t.reset();get('record').onclick();assert.equal(tracks.at(-1).stopped,false);
  sequence.forEach((winner,i)=>{
   endRound(winner);const wins=Array.from(t.roundWins);t.advanceFrame(1);assert.deepEqual(Array.from(t.roundWins),wins,'score once');assert.equal(t.screen,'battle');t.advanceFrame(3);
   if(i<sequence.length-1){assert.equal(t.screen,'battle');assert.equal(t.roundNumber,i+2);assert.equal(t.actor.hp,100);assert.equal(t.enemy.hp,100);assert.equal(t.actor.guardMeter,100);assert.equal(t.countdown,3);assert.equal(tracks.at(-1).stopped,false,'record across rounds');}
  });
  assert.equal(t.screen,'result');assert.equal(get('matchOutcome').textContent,sequence.at(-1)==='player'?'YOU WIN':'YOU LOSE');assert.equal(t.roundHistory.length,sequence.length);assert(tracks.at(-1).stopped);assert.equal(get('recordDownload').hidden,false);assert(get('matchScore').textContent.includes('2'));assert.equal(t.requestJump(),false);
  get('resultTitle').onclick();assert.equal(t.screen,'title');assert.deepEqual(Array.from(t.roundWins),[0,0]);
 }
 t.reset();endRound('draw');t.advanceFrame(4);assert.equal(t.roundNumber,1);assert.deepEqual(Array.from(t.roundWins),[0,0]);assert.equal(t.roundHistory[0].result,'DRAW');
 t.advanceFrame(3);t.actor.hp=80;t.enemy.hp=50;t.enemyAI.cooldown=1000;t.enemy.x=1000;t.advanceFrame(90);assert.equal(t.result,'YOU WIN');assert.deepEqual(Array.from(t.roundWins),[1,0]);t.advanceFrame(4);assert.equal(t.roundNumber,2);
 t.showTitle();handlers.keydown({code:'KeyR',repeat:false,target:{matches:()=>false},preventDefault(){}});assert.equal(t.screen,'title');

 for(const winnerAppearance of ['green','white'])for(const winnerSide of ['player','cpu'])for(const loserAppearance of ['mascot','green','white','fish','headset','gray','blackcat','commander']){
  t.reset();const winner=winnerSide==='player'?t.actor:t.enemy,loser=winnerSide==='player'?t.enemy:t.actor;
  winner.appearance=winnerAppearance;loser.appearance=loserAppearance;
  endRound(winnerSide);assert.equal(t.transformationPose(loser),null,'first point uses normal KO');t.advanceFrame(4);
  endRound(winnerSide);assert.equal(t.transformationPose(winner),null,'winner unchanged');
  if(winnerAppearance==='white'){
   assert.equal(t.transformationPose(loser),null,'nu victory uses normal defeat for '+loserAppearance);
   assert.equal(loser.state,'down');t.advanceFrame(3.1);assert.equal(t.transformationPose(loser),null);assert.equal(t.screen,'battle');
   t.advanceFrame(.9);assert.equal(t.screen,'result');t.showTitle();continue;
  }
  assert.equal(t.transformationPose(loser).animation,'transform_'+loserAppearance);assert.equal(t.transformationPose(loser).frame,0);
  for(let i=0;i<73;i++){assert(t.transformationPose(loser).frame<=72);t.advanceFrame(1/24);}
  assert.equal(t.transformationPose(loser).frame,72);assert.equal(t.screen,'battle');t.advanceFrame(.9);assert.equal(t.screen,'battle');t.advanceFrame(.1);assert.equal(t.screen,'result');
  t.showTitle();assert.equal(t.transformationPose(loser),null,'cleared on title');
 }
 t.reset();t.actor.appearance='mascot';t.enemy.appearance='green';endRound('player');t.advanceFrame(4);endRound('player');assert.equal(t.transformationPose(t.enemy),null,'mascot victory stays normal');
 t.reset();t.actor.appearance='green';t.enemy.appearance='mascot';endRound('player');t.advanceFrame(4);endRound('draw');assert.equal(t.transformationPose(t.enemy),null,'draw stays normal');t.advanceFrame(4);
 t.advanceFrame(3);t.actor.hp=80;t.enemy.hp=50;t.enemyAI.cooldown=1000;t.enemy.x=1000;t.advanceFrame(90);assert.equal(t.result,'YOU WIN');assert.equal(t.transformationPose(t.enemy),null,'timeout is not KO');

 t.reset();t.actor.appearance='green';t.enemy.appearance='fish';endRound('player');t.advanceFrame(4);endRound('player');assert.equal(t.transformationPose(t.enemy).animation,'transform_fish','fish shrinks on green final KO');t.advanceFrame(4);assert.equal(t.screen,'result');

 for(const winnerAppearance of ['mascot','blackcat']){t.reset();t.actor.appearance=winnerAppearance;t.enemy.appearance='blackcat';endRound('player');t.advanceFrame(4);endRound('player');assert.equal(t.transformationPose(t.enemy),null,'blackcat normal KO against other winners');}
 t.reset();t.actor.appearance='green';t.enemy.appearance='blackcat';endRound('player');t.advanceFrame(4);endRound('draw');assert.equal(t.transformationPose(t.enemy),null);t.advanceFrame(4);t.advanceFrame(3);t.actor.hp=80;t.enemy.hp=50;t.enemyAI.cooldown=1000;t.enemy.x=1000;t.advanceFrame(90);assert.equal(t.transformationPose(t.enemy),null,'blackcat timeout stays normal');
 t.showTitle();get('titleStart').onclick();get('playerCharacter').change({target:{value:'fish'}});t.activateMenu('stage');t.activateMenu('fight');assert.equal(t.actor.appearance,'fish');
 for(const [state,rate] of [['idle',8],['walk',12],['dash',21.6]]){t.actor.enter(state);t.actor.stateTime=1;assert.equal(t.actor.pose().animation,'fish_swim');assert.equal(t.actor.pose().frame,Math.floor(rate)%36);t.actor.stateTime=36/rate;assert.equal(t.actor.pose().frame,0);}
 console.log('PASS: transformation only on alpha final KO; nu normal victory, both sides and appearances, full playback/hold/reset, no first-round/draw/timeout/mascot activation');
 console.log('PASS: '+(standalone?'standalone':'source')+' title/select/battle/result/title, 2-0/2-1 both winners, draws, timeout, reset and continuous match recording');
}})();
