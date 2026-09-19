'use strict';
// Shared visual vocabulary; keep the CSS :root palette in sync.
const UI={bg:'#101c1d',surface:'#1b3031',raised:'#294344',line:'#63736b',text:'#f5eedf',muted:'#b9c7be',gold:'#e7c27f',player:'#87d8c9',cpu:'#f3a69b',font:'"Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,system-ui,sans-serif'};
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const stateLabel=document.querySelector('#state'),keys={left:false,right:false,dash:false,guard:false};
const actor=new Character(),enemy=new Character();
const enemyAI=new EnemyController();
actor.appearance='green';enemy.appearance='mascot';
const stages=[{id:'library',name:'図書館',subtitle:'THE QUIET LIBRARY'},{id:'beach',name:'海辺',subtitle:'SUNSET BEACH'},{id:'highway',name:'近未来都市ハイウェイ',subtitle:'NEON HIGHWAY'},{id:'restaurant',name:'レストラン',subtitle:'RESTAURANT'}];
let selectedStage='library';
function currentStage(){return stages.find(s=>s.id===selectedStage)||stages[0];}
function chooseStage(id){if(screen!=='select'||!stages.some(s=>s.id===id))return;selectedStage=id;document.getElementById('stageSelect').value=id;}
function cycleStage(direction){chooseStage(stages[(stages.findIndex(s=>s.id===selectedStage)+direction+stages.length)%stages.length].id);}
document.getElementById('stageSelect').addEventListener('change',e=>chooseStage(e.target.value));
for(const [id,c] of [['playerCharacter',actor],['enemyCharacter',enemy]])document.getElementById(id).addEventListener('change',e=>{c.appearance=e.target.value;drawPortraits();});
document.getElementById('difficulty').addEventListener('change',e=>{enemyAI.difficulty=e.target.value;});
let result=null,countdown=3,fightCueTime=0,remainingTime=90,paused=false,selecting=true;
let menuFocus=null,menuHover=null,menuPointer=null,assetError='';
let screen='title',roundNumber=1,roundWins=[0,0],roundHistory=[],roundEndTime=0;
let transformationTarget=null;
let effects=[],hitStop=0;
let audioContext=null,soundEnabled=false;
const soundButton=document.getElementById('sound');
function sound(kind){
 if(!soundEnabled||!audioContext||audioContext.state!=='running')return;
 const tone=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
 const frequencies={hit:[180,55],block:[650,300],start:[440,880],finish:[660,220]};
 const [from,to]=frequencies[kind]||frequencies.hit;
 tone.type=kind==='hit'?'triangle':'sine';tone.frequency.setValueAtTime(from,now);tone.frequency.exponentialRampToValueAtTime(to,now+.12);
 gain.gain.setValueAtTime(.09,now);gain.gain.exponentialRampToValueAtTime(.001,now+.18);
 tone.connect(gain);gain.connect(audioContext.destination);tone.start(now);tone.stop(now+.2);
 tone.onended=()=>{tone.disconnect();gain.disconnect();};
}
soundButton.onclick=async()=>{
 try{
  if(!audioContext){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('音声非対応');audioContext=new Audio();}
  if(soundEnabled){soundEnabled=false;await audioContext.suspend();}else{await audioContext.resume();soundEnabled=true;sound('start');}
  soundButton.textContent=soundEnabled?'効果音：オン':'効果音：オフ';soundButton.setAttribute('aria-pressed',String(soundEnabled));
 }catch(e){soundButton.textContent='効果音を使用できません';soundEnabled=false;}
};
actor.x=330;enemy.x=760;enemy.facing=-1;
const config=actor.settings,attacks=ATTACK_DATA;
const sheets={};let loaded=false,last=0;
let recordFromSelect=false,resultRecordTime=0,recordNotice='';
let recorder=null,recordingStream=null,recordedChunks=[],recordingUrl=null;
const recordButton=document.getElementById('record'),recordStatus=document.getElementById('recordStatus'),recordDownload=document.getElementById('recordDownload');
function stopRecording(){
 if(recorder&&recorder.state!=='inactive'){recordButton.disabled=true;recorder.stop();}
}
function startRecording(){
 if(selecting&&screen!=='select'){recordStatus.textContent='キャラ選択か対戦画面から録画できます。';return;}
 if(recordButton.disabled)return;
 if(recorder&&recorder.state!=='inactive'){stopRecording();return;}
 if(!loaded){recordStatus.textContent='画像の読み込み完了後に録画できます。';return;}
 if(!canvas.captureStream||typeof MediaRecorder==='undefined'){recordStatus.textContent='このブラウザーは動画録画に対応していません。';return;}
 try{
  const fromSelect=screen==='select';if(!fromSelect)reset();recordFromSelect=fromSelect;resultRecordTime=0;
  const formats=['video/mp4','video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp8','video/webm;codecs=vp9','video/webm'].filter(type=>typeof MediaRecorder.isTypeSupported!=='function'||MediaRecorder.isTypeSupported(type));
  formats.push(null);let startError=null;recorder=null;
  for(const mime of formats){
   let candidate=null;
   try{
    recordingStream=canvas.captureStream(30);
    candidate=new MediaRecorder(recordingStream,mime?{mimeType:mime}:undefined);
    candidate.start(1000);recorder=candidate;break;
   }catch(e){startError=e;if(candidate&&candidate.state!=='inactive')candidate.stop();recordingStream?.getTracks().forEach(track=>track.stop());}
  }
  if(!recorder)throw startError||new Error('利用できる録画形式がありません');
  recordedChunks=[];
  let recordingFailed=false;
  recorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data);};
  recorder.onstop=()=>{
   const type=recorder.mimeType||'video/webm',blob=new Blob(recordedChunks,{type});
   recordingStream.getTracks().forEach(track=>track.stop());
   recordButton.disabled=false;recordButton.textContent='録画して再戦';
   if(recordingFailed||blob.size===0){recordStatus.textContent='録画を保存できませんでした。もう一度録画してください。';return;}
   if(recordingUrl)URL.revokeObjectURL(recordingUrl);
   recordingUrl=URL.createObjectURL(blob);
   recordDownload.href=recordingUrl;
   const preview=document.getElementById('recordPreview');preview.src=recordingUrl;preview.hidden=false;
   recordDownload.download='match-'+new Date().toISOString().replace(/[:.]/g,'-')+(type.includes('mp4')?'.mp4':'.webm');
   recordDownload.hidden=false;recordButton.disabled=false;recordButton.textContent='録画して再戦';
   recordStatus.textContent='録画完了。「動画を保存」からダウンロードできます。';recordNotice=recordStatus.textContent;document.getElementById('selectStatus').textContent=recordStatus.textContent;
  };
  recorder.onerror=()=>{recordingFailed=true;recordStatus.textContent='録画中にエラーが発生しました。';if(recorder.state!=='inactive')stopRecording();else{recordingStream.getTracks().forEach(track=>track.stop());recordButton.disabled=false;recordButton.textContent='録画して再戦';}};
  recordButton.textContent='録画を停止';
  recordStatus.textContent=recordFromSelect?'録画中… キャラ選択からリザルトまで収録します。':'録画中… 2本先取の試合終了後に自動停止します。';
 }catch(e){recordingStream?.getTracks().forEach(track=>track.stop());recordButton.disabled=false;recordButton.textContent='録画して再戦';recordStatus.textContent=e.name==='SecurityError'||/tainted/i.test(e.message)?'画像の読み込み元により録画が制限されています。READMEの起動手順で開き直してください。':'録画を開始できませんでした：'+e.message;}
}
recordButton.onclick=startRecording;
function setPaused(value){
 if(result||selecting)return;
 paused=value;keys.left=keys.right=keys.dash=keys.guard=false;actor.jumpBuffer=0;last=0;
 document.getElementById('pause').textContent=paused?'再開 (Esc)':'一時停止 (Esc)';
 if(recorder){if(paused&&recorder.state==='recording')recorder.pause();else if(!paused&&recorder.state==='paused')recorder.resume();}
}
document.getElementById('pause').onclick=()=>setPaused(!paused);
function setScreen(next){
 screen=next;selecting=next!=='battle';last=0;menuFocus=null;menuHover=null;menuPointer=null;
 canvas.setAttribute?.('aria-label',({title:'ARSSバトル。Enterでスタート',select:'キャラクター選択。矢印で選択、1と2で自分とCPU切替、QとEで難易度、ZとXでステージ、Enterで対戦開始',battle:'対戦画面',result:'試合結果。Enterでタイトルへ'})[next]);
 for(const [id,name] of [['titleScreen','title'],['characterSelect','select'],['resultScreen','result']])document.getElementById(id).hidden=next!==name;
 document.querySelector('main').setAttribute?.('data-screen',next);
 keys.left=keys.right=keys.dash=keys.guard=false;
}
function resetRound(){
 transformationTarget=null;hitStop=0;effects=[];actor.reset();enemy.reset();enemyAI.reset();actor.x=330;enemy.x=760;enemy.facing=-1;
 result=null;roundEndTime=0;countdown=3;fightCueTime=0;remainingTime=90;paused=false;
 document.getElementById('pause').textContent='一時停止 (Esc)';keys.left=keys.right=keys.dash=keys.guard=false;
}
function reset(){if(!(screen==='select'&&recordFromSelect&&recorder?.state==='recording'))stopRecording();roundNumber=1;roundWins=[0,0];roundHistory=[];resetRound();setScreen('battle');canvas.focus?.();}
function showTitle(){stopRecording();resetRound();roundNumber=1;roundWins=[0,0];roundHistory=[];setScreen('title');canvas.focus?.();}
function finishRound(){
 fightCueTime=0;
 if(result==='YOU WIN')roundWins[0]++;
 else if(result==='GAME OVER')roundWins[1]++;
 roundHistory.push({round:roundNumber,result,playerHP:actor.hp,cpuHP:enemy.hp});roundEndTime=0;
 const winner=result==='YOU WIN'?actor:result==='GAME OVER'?enemy:null;
 const loser=winner===actor?enemy:actor;
 if(winner?.appearance==='green'&&roundWins[winner===actor?0:1]===2&&rosterIds.includes(loser.appearance)&&loser.gameOver&&loser.hp===0)transformationTarget=loser;
}
function showMatchResult(){
 if(!recordFromSelect)stopRecording();resultRecordTime=0;setScreen('result');
 document.getElementById('matchOutcome').textContent=roundWins[0]===2?'YOU WIN':'YOU LOSE';
 document.getElementById('matchScore').textContent=roundWins[0]+' − '+roundWins[1];
 document.getElementById('matchSummary').textContent=roundHistory.map(r=>'第'+r.round+'ラウンド：'+(r.result==='DRAW'?'引き分け（再試合）':r.result==='YOU WIN'?'あなたの勝ち':'CPUの勝ち')).join(' ／ ');
 canvas.focus?.();
}
function advanceFrame(dt){
 if(screen==='result'&&recordFromSelect&&recorder?.state==='recording'){resultRecordTime+=dt;if(resultRecordTime>=2)stopRecording();}
 const wasFinished=!!result,p=update(dt);
 if(screen==='battle'&&wasFinished&&result&&!paused){
  roundEndTime+=dt;
  if(roundEndTime>=4){
   if(roundWins.some(w=>w>=2))showMatchResult();
   else{if(result!=='DRAW')roundNumber++;resetRound();}
  }
 }
 return screen==='battle'?actor.pose():p;
}
function requestJump(){return !selecting&&!paused&&!result&&countdown===0&&actor.requestJump();}
function requestAttack(name){return !selecting&&!paused&&!result&&countdown===0&&actor.requestAttack(name);}
function requestReaction(name){if(selecting||paused||result||countdown>0)return false;return name==='damage'?actor.receiveHit():name==='down'?actor.knockDown():false;}

const hitRules={punch:{damage:15},air_punch:{damage:15},air_kick:{damage:22},kick:{start:.14,end:.38,range:150,damage:22}};
function boxesOverlap(a,b){return !!a&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
function update(dt){
 if(selecting)return actor.pose();
 if(paused){stateLabel.textContent='一時停止中';return actor.pose();}
 if(hitStop>0){const frozen=Math.min(dt,hitStop);hitStop=Math.max(0,hitStop-frozen);dt-=frozen;if(dt===0)return actor.pose();}
 effects=effects.map(e=>({...e,life:e.life-dt})).filter(e=>e.life>0);
 if(countdown>0){
  countdown=Math.max(0,countdown-dt);if(countdown===0){fightCueTime=.75;sound('start');}
  keys.left=keys.right=keys.dash=keys.guard=false;
  stateLabel.textContent=countdown>0?countdownWord():'FIGHT!';
  return actor.pose();
 }

 fightCueTime=Math.max(0,fightCueTime-dt);
 if(result){
  for(const c of [actor,enemy])c.update(dt,{});
  return actor.pose();
 }
 remainingTime=Math.max(0,remainingTime-dt);
 const enemyInput=enemyAI.update(dt,enemy,actor);
 actor.update(dt,{...keys,targetX:enemy.x});enemy.update(dt,{...enemyInput,targetX:actor.x});
 if(actor.grounded&&enemy.grounded&&!actor.gameOver&&!enemy.gameOver){
  const dx=enemy.x-actor.x,overlap=76-Math.abs(dx);
  if(overlap>0){const sign=dx>=0?1:-1;actor.x=Math.max(50,Math.min(1050,actor.x-sign*overlap/2));enemy.x=Math.max(50,Math.min(1050,enemy.x+sign*overlap/2));}
 }
 // Evaluate both attacks before applying damage so simultaneous hits are fair.
 const hits=[];
 for(const [attacker,target] of [[actor,enemy],[enemy,actor]]){
  const rule=hitRules[attacker.state];
  if(!rule||attacker.attackConnected||target.gameOver)continue;
  const ahead=(target.x-attacker.x)*attacker.facing;
  const hit=attacks[attacker.state].hitboxes?boxesOverlap(attacker.attackBox,target.hurtBox):
   attacker.stateTime>=rule.start&&attacker.stateTime<=rule.end&&ahead>0&&ahead<=rule.range&&Math.abs(attacker.y-target.y)<70;
  if(hit)hits.push({attacker,target,damage:attacker.attackData?.damage??rule.damage,facing:attacker.facing,blocked:target.blocks(attacker)});
 }
 for(const hit of hits)hit.attacker.attackConnected=true;
 for(const {attacker,target,damage,facing,blocked} of hits){
  hitStop=Math.max(hitStop,blocked?.025:.045);
  sound(blocked?'block':'hit');
  const box=attacker.attackBox;effects.push({x:box?(box.left+box.right)/2:target.x,y:box?425+(box.top+box.bottom)/2:425+target.y-120,life:.24,blocked});
  if(blocked)target.receiveBlock(damage);else target.takeDamage(damage);target.x=Math.max(50,Math.min(1050,target.x+facing*12));
 }
 if(actor.gameOver||enemy.gameOver){result=actor.gameOver?(enemy.gameOver?'DRAW':'GAME OVER'):'YOU WIN';keys.left=keys.right=keys.dash=keys.guard=false;}
 if(!result&&remainingTime===0){result=actor.hp===enemy.hp?'DRAW':actor.hp>enemy.hp?'YOU WIN':'GAME OVER';keys.left=keys.right=keys.dash=keys.guard=false;}
 if(result){sound('finish');finishRound();}
 const p=actor.pose();stateLabel.textContent=result?'FINISH!':p.label+' ／ 敵：'+enemy.hp+' HP';return p;
}
function transformationPose(c){
 if(c!==transformationTarget)return null;
 return {animation:'transform_'+c.appearance,frame:Math.min(72,Math.floor(roundEndTime*24))};
}
function drawCharacter(c,p){
 const transformed=transformationPose(c);
 if(transformed){
  ctx.save();ctx.translate(Math.round(c.x),Math.round(425+c.y+c.renderOffsetY));ctx.scale(c.facing*c.renderScale,c.renderScale);
  ctx.drawImage(sheets[transformed.animation],transformed.frame*320,0,320,256,-160,-238,320,256);ctx.restore();return;
 }


 if(c.appearance==='blackcat'){
  ctx.save();ctx.translate(Math.round(c.x),Math.round(425+c.y));ctx.scale(c.facing,c.renderScale);
  if(c.state==='hurt')ctx.globalAlpha=.65+.35*Math.abs(Math.sin(c.stateTime*30));
  ctx.drawImage(['blackcat_walk','blackcat_run','blackcat_punch','blackcat_kick','blackcat_guard','blackcat_jump','blackcat_hurt','blackcat_down','blackcat_air_punch','blackcat_air_kick'].includes(p.animation)?sheets[p.animation]:sheets.blackcat_idle,(['blackcat_walk','blackcat_run','blackcat_punch','blackcat_kick','blackcat_guard','blackcat_jump','blackcat_hurt','blackcat_down','blackcat_air_punch','blackcat_air_kick'].includes(p.animation)?p.frame:0)*320,0,320,256,-160,-238,320,256);ctx.restore();
  if(c.state==='guard'&&c.blockTime>0){ctx.strokeStyle='#8de7f0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(c.x,425+c.y-110,65,-Math.PI/2,Math.PI/2,c.facing<0);ctx.stroke();}
  const box=c.attackBox;if(box&&!c.attackConnected&&!['punch','kick','air_punch','air_kick'].includes(c.state)){ctx.strokeStyle='#fff1a0';ctx.lineWidth=3;ctx.strokeRect(box.left,425+box.top,box.right-box.left,box.bottom-box.top);}
  return;
 }
 if(c.appearance==='gray'){
  ctx.save();ctx.translate(Math.round(c.x),Math.round(425+c.y));ctx.scale(c.facing*c.renderScale,c.renderScale);
  if(c.state==='hurt')ctx.globalAlpha=.65+.35*Math.abs(Math.sin(c.stateTime*30));
  ctx.drawImage(['gray_air_kick','gray_air_punch','gray_walk','gray_run','gray_punch','gray_kick','gray_jump','gray_guard','gray_hurt','gray_down'].includes(p.animation)?sheets[p.animation]:sheets.gray_idle,(['gray_air_kick','gray_air_punch','gray_walk','gray_run','gray_punch','gray_kick','gray_jump','gray_guard','gray_hurt','gray_down'].includes(p.animation)?p.frame:0)*320,0,320,256,-160,-238,320,256);ctx.restore();return;
 }
 if(c.appearance==='headset'){
  ctx.save();ctx.translate(Math.round(c.x),Math.round(425+c.y));ctx.scale(c.facing*c.renderScale,c.renderScale);
  if(c.state==='hurt')ctx.globalAlpha=.65+.35*Math.abs(Math.sin(c.stateTime*30));
  const walking=['headset_walk','headset_run','headset_kick','headset_punch','headset_guard','headset_hurt','headset_jump','headset_down','headset_air_punch','headset_air_kick'].includes(p.animation);ctx.drawImage(walking?sheets[p.animation]:sheets.headset_idle,(walking?p.frame:0)*320,0,320,256,-160,-238,320,256);ctx.restore();return;
 }
 if(c.appearance==='fish'){
  ctx.save();ctx.translate(Math.round(c.x),Math.round(425+c.y));ctx.scale(c.facing*c.renderScale,c.renderScale);
  if(c.state==='hurt')ctx.globalAlpha=.65+.35*Math.abs(Math.sin(c.stateTime*30));
  ctx.drawImage(['fish_swim','fish_hurt','fish_bite','fish_guard','fish_jump','fish_kick','fish_air_punch','fish_air_kick','fish_down'].includes(p.animation)?sheets[p.animation]:sheets.fish_swim,(['fish_swim','fish_hurt','fish_bite','fish_guard','fish_jump','fish_kick','fish_air_punch','fish_air_kick','fish_down'].includes(p.animation)?p.frame:0)*320,0,320,256,-160,-238,320,256);ctx.restore();return;
 }

 if(c.baseAppearance==='green'){
  // Palette variants share geometry and select their own animation sheets.
  ctx.save();ctx.translate(Math.round(c.x),Math.round(425+c.y+c.renderOffsetY));ctx.scale(c.facing*c.renderScale,c.renderScale);
  if(c.state==='hurt')ctx.globalAlpha=.65+.35*Math.abs(Math.sin(c.stateTime*30));
  if(p.animation.startsWith(c.appearance+'_'))ctx.drawImage(sheets[p.animation],p.frame*320,0,320,256,-160,-238,320,256);
  else ctx.drawImage(sheets[c.appearance+'_idle'],205,95,390,1105,-39,-221,78,221);
  ctx.restore();
  if(c.state==='guard'&&c.blockTime>0){ctx.strokeStyle='#8de7f0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(c.x,425+c.y+c.renderOffsetY-110*c.renderScale,48*c.renderScale,-Math.PI/2,Math.PI/2,c.facing<0);ctx.stroke();}
  const box=c.attackBox;
  if(box&&!c.attackConnected&&!['kick','punch','air_punch','air_kick'].includes(c.state)){ctx.strokeStyle='#fff1a0';ctx.lineWidth=3;ctx.strokeRect(box.left,425+box.top,box.right-box.left,box.bottom-box.top);}
  return;
 }

 const reaction=['damage','down'].includes(p.animation),width=reaction?384:(attacks[p.animation]||p.animation==='guard')?320:256,height=reaction?320:256,pivotY=reaction?280:238;
 ctx.save();ctx.translate(Math.round(c.x),Math.round(425+c.y-pivotY));ctx.scale(c.facing*c.renderScale,c.renderScale);ctx.drawImage(sheets[p.animation],p.frame*width,0,width,height,-width/2,0,width,height);ctx.restore();
}

function countdownWord(){return ['SHOW','YOUR','C.V.C'][Math.max(0,Math.min(2,3-Math.ceil(countdown)))];}

function drawRoundCallout(lines,size,y,lineHeight=0){
 ctx.save();ctx.fillStyle='#fff3dc';ctx.font='bold '+size+'px '+UI.font;ctx.textAlign='center';
 ctx.shadowColor='#000';ctx.shadowBlur=12;ctx.shadowOffsetY=3;
 lines.forEach((line,i)=>ctx.fillText(line,550,y+i*lineHeight));ctx.restore();
}

function draw(p){
 if(screen!=='battle'){drawMenu();return;}
 ctx.clearRect(0,0,1100,520);
 if(sheets[selectedStage])ctx.drawImage(sheets[selectedStage],0,0,1100,520);
 else{ctx.fillStyle='#27312b';ctx.fillRect(0,0,1100,520);}
 ctx.fillStyle='#101c1de8';ctx.fillRect(0,0,1100,102);
 if(loaded){ctx.imageSmoothingEnabled=false;drawCharacter(enemy,enemy.pose());drawCharacter(actor,p);}
 for(const [c,x,label,color] of [[actor,28,'1P',UI.player],[enemy,662,'CPU',UI.cpu]]){
  const right=c===enemy;
  menuText(label+'  '+fighterNames[c.appearance],right?1072:x,31,20,UI.text,right?'right':'left');
  ctx.fillStyle=UI.raised;ctx.fillRect(x,44,410,20);
  ctx.fillStyle=color;const hpWidth=410*Math.max(0,c.hp)/c.maxHp;
  ctx.fillRect(right?x+410-hpWidth:x,44,hpWidth,20);
  ctx.fillStyle=UI.raised;ctx.fillRect(x,71,410,5);ctx.fillStyle=UI.gold;
  const guardWidth=410*Math.max(0,c.guardMeter)/100;ctx.fillRect(right?x+410-guardWidth:x,71,guardWidth,5);
  menuText('●'.repeat(roundWins[right?1:0])+'○'.repeat(2-roundWins[right?1:0]),right?1072:x,95,18,UI.gold,right?'right':'left');
 }
 menuText('ROUND '+roundNumber,550,29,15,UI.gold);
 menuText(String(Math.ceil(remainingTime)).padStart(2,'0'),550,73,42,UI.text);
 for(const e of effects){
  ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=Math.min(1,e.life*8);ctx.strokeStyle=e.blocked?'#8de7f0':'#fff5a3';ctx.lineWidth=4;
  ctx.font='bold 16px '+UI.font;ctx.fillStyle=e.blocked?'#9fe9e7':'#ffe3a1';ctx.textAlign='center';ctx.fillText(e.blocked?'GUARD':'HIT',0,-35);ctx.textAlign='left';
  const radius=12+(1-e.life/.24)*28;
  if(e.blocked){ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();}
  else for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*8,Math.sin(a)*8);ctx.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);ctx.stroke();}
  ctx.restore();
 }
 if(countdown>0&&!selecting)drawRoundCallout([countdownWord()],76,280);
 else if(fightCueTime>0&&!result)drawRoundCallout(['FIGHT!'],76,280);
 if(paused){ctx.fillStyle='#101a29cc';ctx.fillRect(360,155,380,100);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 32px '+UI.font;ctx.fillText('PAUSED',550,198);ctx.font='16px '+UI.font;ctx.fillText('Esc または再開ボタン',550,232);ctx.textAlign='left';}
 if(result)drawRoundCallout(['FINISH!'],64,218);

}
const rosterIds=['mascot','green','gray','blackcat','headset','fish','white'];
const rosterColumns=3;
const fighterNames={white:'メづすりν',blackcat:'黒猫',gray:'グレイ',mascot:'ようせい',green:'メづすりα',headset:'アネリア広報Bot',fish:'ダンクルオステウス'};
let cursorSide='player';
function selectSide(side){cursorSide=side;drawPortraits();}
function chooseFighter(id){const c=cursorSide==='player'?actor:enemy;c.appearance=id;document.getElementById(cursorSide==='player'?'playerCharacter':'enemyCharacter').value=id;drawPortraits();}
function moveSelectCursor(dx,dy){
 const c=cursorSide==='player'?actor:enemy,i=rosterIds.indexOf(c.appearance),rows=Math.ceil(rosterIds.length/rosterColumns);let next=i;
 if(dx){const start=Math.floor(i/rosterColumns)*rosterColumns,count=Math.min(rosterColumns,rosterIds.length-start);next=start+((i-start+dx+count)%count);}
 if(dy){let row=Math.floor(i/rosterColumns);do{row=(row+dy+rows)%rows;next=row*rosterColumns+i%rosterColumns;}while(next>=rosterIds.length);}
 chooseFighter(rosterIds[next]);
}
function paintPortrait(target,appearance,mirror=false){
 const pc=target.getContext('2d');if(!pc.clearRect)return;
 pc.clearRect(0,0,300,280);pc.imageSmoothingEnabled=false;pc.save();if(mirror){pc.translate(300,0);pc.scale(-1,1);}
 if(appearance==='blackcat')pc.drawImage(sheets.blackcat_idle,0,0,320,256,0,12,300,240);
 else if(appearance==='gray')pc.drawImage(sheets.gray_idle,0,0,320,256,0,12,300,240);
 else if(appearance==='headset'){const scale=1.1/1.15;pc.drawImage(sheets.headset_idle,0,0,320,256,(300-300*scale)/2,252-240*scale,300*scale,240*scale);}
 else if(appearance==='fish')pc.drawImage(sheets.fish_swim,0,0,320,256,0,12,300,240);
 else if(['green','white'].includes(appearance))pc.drawImage(sheets[appearance+'_idle'],205,95,390,1105,105,20,86,243);
 else pc.drawImage(sheets.idle,0,0,256,256,22,10,256,256);
 pc.restore();
}
const faceCrops={white:['white_idle',250,90,320,320],blackcat:['blackcat_idle',120,17,96,100],gray:['gray_idle',132,14,62,62],mascot:['idle',78,20,108,108],green:['green_idle',250,90,320,320],headset:['headset_idle',129,13,65,65],fish:['fish_swim',192,75,96,96]};
function paintFace(target,id,mirror){
 const pc=target.getContext('2d');if(!pc.clearRect)return;
 const [sheet,x,y,w,h]=faceCrops[id];pc.clearRect(0,0,80,80);pc.imageSmoothingEnabled=false;pc.save();if(mirror){pc.translate(80,0);pc.scale(-1,1);}pc.drawImage(sheets[sheet],x,y,w,h,0,0,80,80);pc.restore();
}
function drawPortraits(){
 for(const [side,c] of [['player',actor],['enemy',enemy]]){
  document.getElementById(side+'Name').textContent=fighterNames[c.appearance];
  document.getElementById(side+'Description').textContent=c.appearance==='blackcat'?'Aはストレート、Sは蹴り上げ、Dで伏せガード。':c.appearance==='gray'?'Aはストレート、Sはハイキック、Dでガード。空中Aは振り下ろし、空中Sは前蹴り。':c.appearance==='headset'?'Aはストレート、Sは素早いキック。':c.appearance==='fish'?'Aは噛みつき、Sは歯のキック。':c.baseAppearance==='green'?'筒の突きと素早い小キック。':'長いリーチと重いキック。';
  if(loaded)paintPortrait(document.getElementById(side+'Portrait'),c.appearance,side==='enemy');
 }
 document.getElementById('cursorHelp').textContent=(cursorSide==='player'?'1P':'CPU')+'のキャラクターを選択中';
 for(const side of ['player','enemy'])document.getElementById(side==='player'?'selectPlayer':'selectEnemy').setAttribute?.('aria-pressed',String(cursorSide===side));
 for(const side of ['player','enemy'])for(const id of rosterIds){
  const prefix=side==='player'?'':'enemy-',selected=(side==='player'?actor:enemy).appearance===id,b=document.getElementById(prefix+'roster-'+id);
  document.getElementById(prefix+'marker-'+id).textContent=selected?(side==='player'?'1P':'CPU'):'';
  b.setAttribute?.('data-player',String(side==='player'&&selected));b.setAttribute?.('data-enemy',String(side==='enemy'&&selected));b.setAttribute?.('aria-pressed',String(selected));
  if(loaded)paintFace(document.getElementById(prefix+'thumb-'+id),id,side==='enemy');
 }
}
document.getElementById('selectPlayer').onclick=()=>selectSide('player');
document.getElementById('selectEnemy').onclick=()=>selectSide('enemy');
for(const side of ['player','enemy'])for(const id of rosterIds){const b=document.getElementById((side==='player'?'':'enemy-')+'roster-'+id);b.onclick=()=>{cursorSide=side;chooseFighter(id);};b.addEventListener('focus',()=>selectSide(side));}
function showCharacterSelect(){recordNotice='';stopRecording();resetRound();setScreen('select');cursorSide='player';drawPortraits();canvas.focus?.();}
document.getElementById('titleStart').onclick=showCharacterSelect;
document.getElementById('selectBack').onclick=showTitle;
document.getElementById('resultTitle').onclick=showTitle;
document.getElementById('startMatch').onclick=()=>activateMenu('fight');
document.getElementById('chooseCharacter').onclick=showCharacterSelect;

// All visible menu screens are rendered into the battle canvas.
const difficultyIds=['easy','normal','hard'];
const difficultyLabels={easy:'やさしい',normal:'ふつう',hard:'つよい'};
function changeDifficulty(direction){
 const i=difficultyIds.indexOf(enemyAI.difficulty);enemyAI.difficulty=difficultyIds[(i+direction+3)%3];
 document.getElementById('difficulty').value=enemyAI.difficulty;
}
function menuButtons(){
 if(screen==='title')return [{id:'start',x:400,y:314,w:300,h:58,label:'スタート  /  ENTER',primary:true}];
 if(screen==='result')return [{id:'title',x:425,y:427,w:250,h:54,label:'タイトルへ  /  ENTER',primary:true}];
 if(screen!=='select')return [];
 const buttons=[{id:'player',x:44,y:54,w:290,h:42,label:'1 / PLAYER',selected:cursorSide==='player'},
 {id:'enemy',x:766,y:54,w:290,h:42,label:'2 / CPU',selected:cursorSide==='enemy'}];
 for(const [i,id] of rosterIds.entries())buttons.push({id:'fighter:'+id,x:358+(i%rosterColumns)*132,y:40+Math.floor(i/rosterColumns)*104,w:120,h:94,fighter:id,side:cursorSide,selected:(cursorSide==='player'?actor:enemy).appearance===id,playerSelected:actor.appearance===id,cpuSelected:enemy.appearance===id});
 for(const [i,stage] of stages.entries())buttons.push({id:'stage:'+stage.id,x:44+i*256,y:365,w:244,h:48,stage:stage.id,label:stage.name,selected:selectedStage===stage.id});
 buttons.push({id:'back',x:44,y:427,w:170,h:54,label:'戻る / ESC'},
 {id:'record',x:226,y:427,w:124,h:54,label:recordButton.disabled?'保存中…':recorder&&recorder.state!=='inactive'?'■ 停止':'● 録画'},
 {id:'difficulty',x:362,y:427,w:300,h:54,label:'難易度：'+difficultyLabels[enemyAI.difficulty]+'  ›'},
 {id:'fight',x:766,y:427,w:290,h:54,label:'対戦開始 / ENTER',primary:true});
 return buttons;
}
function activateMenu(id){
 if(!menuButtons().some(b=>b.id===id))return;
 if(id==='start')showCharacterSelect();
 else if(id==='title'||id==='back')showTitle();
 else if(id==='fight'){if(loaded)reset();}
 else if(id==='record'){startRecording();recordNotice=recordStatus.textContent;}
 else if(id==='difficulty')changeDifficulty(1);
 else if(id==='player'||id==='enemy')selectSide(id);
 else if(id.startsWith('stage:'))chooseStage(id.slice(6));
 else if(id.startsWith('fighter:'))chooseFighter(id.slice(8));
}
function menuText(text,x,y,size=20,color=UI.text,align='center'){
 ctx.fillStyle=color;ctx.font='600 '+size+'px '+UI.font;ctx.textAlign=align;ctx.fillText(text,x,y);
}
function menuPortrait(id,x,y,w=300,h=260,mirror=false){
 if(!loaded)return;
 ctx.save();ctx.translate(x,y);ctx.scale(w/300,h/280);
 // Reuse portrait framing without clearing the background canvas.
 const proxy={getContext:()=>({clearRect(){},set imageSmoothingEnabled(v){ctx.imageSmoothingEnabled=v;},save:()=>ctx.save(),restore:()=>ctx.restore(),translate:(...a)=>ctx.translate(...a),scale:(...a)=>ctx.scale(...a),drawImage:(...a)=>ctx.drawImage(...a)})};
 paintPortrait(proxy,id,mirror);ctx.restore();
}
function drawMenu(){
 ctx.clearRect(0,0,1100,520);ctx.imageSmoothingEnabled=false;
 if(sheets[selectedStage])ctx.drawImage(sheets[selectedStage],0,0,1100,520);
 else{ctx.fillStyle='#172b2e';ctx.fillRect(0,0,1100,520);}
 ctx.fillStyle='#101c1de8';ctx.fillRect(0,0,1100,520);
 ctx.strokeStyle=UI.line;ctx.lineWidth=1;ctx.strokeRect(18,18,1064,484);
 if(screen==='title'){
  menuText('7 FIGHTERS  /  4 STAGES',550,135,16,UI.gold);
  menuText('ARSSバトル',550,228,76);
  menuText('キャラクターを選んで、いざ対戦。',550,272,20,UI.muted);
 }else if(screen==='select'){
  for(const [side,c,x] of [['player',actor,44],['enemy',enemy,766]]){
   ctx.fillStyle=side==='player'?'#3b77752b':'#965c592b';ctx.fillRect(x,106,290,244);
   menuPortrait(c.appearance,x,98,290,238,side==='enemy');
   menuText(fighterNames[c.appearance],x+145,349,20,side==='player'?UI.player:UI.cpu);
  }
  menuText((cursorSide==='player'?'PLAYER':'CPU')+'を選択中',550,354,13,UI.gold);
 }else if(screen==='result'){
  const won=roundWins[0]===2;
  menuText('MATCH RESULT',550,65,15,UI.gold);
  menuText(won?'YOU WIN':'YOU LOSE',550,133,54,won?'#efc879':'#ebaaa3');
  menuPortrait(actor.appearance,70,145,300,240);menuPortrait(enemy.appearance,730,145,300,240,true);
  menuText(fighterNames[actor.appearance],220,401,20,UI.player);menuText(fighterNames[enemy.appearance],880,401,20,UI.cpu);
  menuText(roundWins[0]+'  −  '+roundWins[1],550,212,48);
  // Draws can repeat indefinitely; show the most recent records and their total.
  const history=roundHistory.slice(-4);
  history.forEach((r,i)=>menuText('第'+r.round+'ラウンド  ·  '+(r.result==='DRAW'?'引き分け':r.result==='YOU WIN'?'PLAYER 勝利':'CPU 勝利'),550,267+i*29,17,UI.muted));
  if(roundHistory.length>4)menuText('直近4戦 / 全'+roundHistory.length+'戦',550,397,13,UI.gold);
 }
 for(const b of menuButtons()){
  const focused=menuFocus===b.id||menuHover===b.id;
  ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,8);
  ctx.fillStyle=b.primary?UI.gold:b.selected?UI.raised:UI.surface;ctx.fill();
  ctx.strokeStyle=focused?UI.text:b.selected?(b.side==='enemy'?UI.cpu:UI.player):UI.line;ctx.lineWidth=focused||b.selected?3:1;ctx.stroke();
  if(b.fighter){
   if(loaded){const [sheet,x,y,w,h]=faceCrops[b.fighter];ctx.drawImage(sheets[sheet],x,y,w,h,b.x+(b.w-86)/2,b.y+4,86,86);}
   for(const [marked,label,x,color] of [[b.playerSelected,'1P',b.x+4,UI.player],[b.cpuSelected,'CPU',b.x+b.w-48,UI.cpu]])if(marked){ctx.fillStyle='#091e20eb';ctx.fillRect(x,b.y+b.h-26,44,22);menuText(label,x+22,b.y+b.h-10,15,color);}
  }else if(b.stage){if(sheets[b.stage])ctx.drawImage(sheets[b.stage],0,0,sheets[b.stage].width,sheets[b.stage].height,b.x+5,b.y+5,64,38);menuText(b.label,b.x+155,b.y+30,16);}
  else menuText(b.label,b.x+b.w/2,b.y+b.h/2+7,19,b.primary?UI.bg:UI.text);
 }
 const note=screen==='select'&&recordNotice?recordNotice:assetError?'読込エラー：'+assetError:!loaded?'画像を読み込み中…':screen==='select'?'矢印：キャラ　1 / 2：操作側　Q / E：難易度　Z / X：ステージ　クリック・タップ対応':'クリック・タップ・Enterで進む';
 menuText(note,550,screen==='title'?414:507,screen==='select'?13:15,assetError?'#ffb7ad':UI.muted);ctx.textAlign='left';
}
function menuHit(e){
 const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;
 const x=(e.clientX-r.left)*1100/r.width,y=(e.clientY-r.top)*520/r.height;
 return menuButtons().find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)?.id??null;
}
canvas.addEventListener('pointerdown',e=>{if(!selecting)return;e.preventDefault();canvas.focus?.();menuFocus=null;menuPointer={id:menuHit(e),pointerId:e.pointerId,screen};canvas.setPointerCapture?.(e.pointerId);});
canvas.addEventListener('pointerup',e=>{const pressed=menuPointer;menuPointer=null;if(!pressed||pressed.pointerId!==e.pointerId||pressed.screen!==screen)return;const hit=menuHit(e);if(pressed.id&&pressed.id===hit)activateMenu(hit);});
canvas.addEventListener('pointermove',e=>{menuHover=selecting?menuHit(e):null;if(canvas.style)canvas.style.cursor=menuHover?'pointer':'default';});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{menuPointer=null;});
canvas.addEventListener('pointerleave',()=>{menuHover=null;});

function tick(t){const dt=last?Math.min((t-last)/1000,.033):0;last=t;draw(advanceFrame(dt));requestAnimationFrame(tick);}
for(const name of ['speed','height','gravity'])document.getElementById(name).addEventListener('input',e=>{config[name]=Number(e.target.value);document.getElementById(name+'Value').value=config[name];});
document.getElementById('reset').onclick=reset;
window.addEventListener('keydown',e=>{const k=e.code;if(k==='Escape'&&!e.repeat){e.preventDefault();if(screen==='select'||screen==='result')showTitle();else setPaused(!paused);return;}if(e.target.matches('input,textarea,select'))return;if(selecting&&e.target.matches('button')&&['Enter','Space'].includes(k))return;if(selecting){if(k==='Tab'&&e.target===canvas){e.preventDefault();const buttons=menuButtons(),i=buttons.findIndex(b=>b.id===menuFocus);menuFocus=buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.id;return;}if((k==='Enter'||k==='Space')&&!e.repeat&&menuFocus){e.preventDefault();activateMenu(menuFocus);return;}if(screen==='select'){if((k==='KeyZ'||k==='KeyX')&&!e.repeat){e.preventDefault();cycleStage(k==='KeyZ'?-1:1);return;}if((k==='KeyQ'||k==='KeyE')&&!e.repeat){e.preventDefault();changeDifficulty(k==='KeyQ'?-1:1);return;}const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(moves[k]){e.preventDefault();menuFocus=null;moveSelectCursor(...moves[k]);return;}if(k==='Digit1'||k==='Digit2'){e.preventDefault();menuFocus=null;selectSide(k==='Digit1'?'player':'enemy');return;}}if(k==='Enter'&&!e.repeat){e.preventDefault();if(screen==='title')showCharacterSelect();else if(screen==='select')activateMenu('fight');else if(screen==='result')showTitle();}return;}if(k==='KeyR'&&!e.repeat){reset();return;}if(paused)return;if(['ArrowLeft','ArrowRight','Space','ArrowUp','KeyA','KeyS','KeyH','KeyL','KeyR','KeyD'].includes(k))e.preventDefault();if(k==='ShiftLeft'||k==='ShiftRight')keys.dash=true;if(k==='ArrowLeft')keys.left=true;if(k==='ArrowRight')keys.right=true;if((k==='Space'||k==='ArrowUp')&&!e.repeat)requestJump();if(k==='KeyD')keys.guard=true;if(k==='KeyA'&&!e.repeat)requestAttack('punch');if(k==='KeyS'&&!e.repeat)requestAttack('kick');if(k==='KeyH'&&!e.repeat&&document.getElementById('debug').open)requestReaction('damage');if(k==='KeyL'&&!e.repeat&&document.getElementById('debug').open)requestReaction('down');if(k==='KeyR'&&!e.repeat)reset();});
window.addEventListener('keyup',e=>{if(e.code==='KeyD')keys.guard=false;if(['ShiftLeft','ShiftRight'].includes(e.code))keys.dash=false;if(e.code==='ArrowLeft')keys.left=false;if(e.code==='ArrowRight')keys.right=false;});
window.addEventListener('blur',()=>{keys.left=keys.right=keys.dash=keys.guard=false;actor.jumpBuffer=0;last=0;if(!result)setPaused(true);});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(['damage','down'].includes(b.dataset.key))requestReaction(b.dataset.key);else if(b.dataset.key==='jump')requestJump();else if(attacks[b.dataset.key])requestAttack(b.dataset.key);else keys[b.dataset.key]=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{if(['left','right','dash','guard'].includes(b.dataset.key))keys[b.dataset.key]=false;});});
Promise.all(['white_idle','white_guard','white_kick','white_punch','white_walk','white_jump','white_run','white_hurt','white_air_punch','white_down','white_air_kick','transform_white','beach','highway','restaurant','transform_blackcat','blackcat_air_kick','blackcat_air_punch','blackcat_down','blackcat_hurt','blackcat_jump','blackcat_guard','blackcat_kick','blackcat_punch','blackcat_run','blackcat_walk','blackcat_idle','gray_air_kick','gray_air_punch','transform_gray','gray_down','gray_hurt','gray_guard','gray_jump','gray_kick','gray_punch','gray_run','gray_walk','gray_idle','transform_headset','headset_air_kick','headset_air_punch','headset_down','headset_jump','headset_hurt','headset_guard','headset_punch','headset_kick','headset_run','headset_idle','headset_walk','transform_fish','fish_down','fish_air_kick','fish_air_punch','fish_kick','fish_jump','fish_guard','fish_bite','fish_hurt','fish_swim','transform_green','transform_mascot','library','idle','walk','jump','punch','kick','dash','damage','down','air_punch','air_kick','guard','green_idle','green_guard','green_kick','green_punch','green_walk','green_jump','green_run','green_hurt','green_air_punch','green_down','green_air_kick'].map(name=>new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{sheets[name]=im;resolve();};im.onerror=()=>reject(new Error(name+'画像を読み込めませんでした'));im.src='assets/'+name+'.png';}))).then(()=>{loaded=true;document.getElementById("selectStatus").textContent="準備完了。キャラクターを選んで対戦開始。";drawPortraits();}).catch(e=>{assetError=e.message;document.querySelector('#error').textContent=e.message;document.getElementById('selectStatus').textContent=e.message+'。ページを開き直してください。';});
setScreen('title');requestAnimationFrame(tick);
window.motionTest={get selectedStage(){return selectedStage;},chooseStage,draw,menuButtons,activateMenu,transformationPose,advanceFrame,showTitle,get screen(){return screen;},get roundNumber(){return roundNumber;},get roundWins(){return [...roundWins];},get roundHistory(){return [...roundHistory];},get hitStop(){return hitStop;},showCharacterSelect,get selecting(){return selecting;},actor,enemy,enemyAI,setPaused,get paused(){return paused;},get remainingTime(){return remainingTime;},get countdown(){return countdown;},get result(){return result;},config,keys,update,reset,requestJump,requestAttack,requestReaction,attacks,CharacterState};

if(document.modelContext?.registerTool){
 Promise.resolve(document.modelContext.registerTool({name:'configure_motion_test',description:'Adjust movement speed, jump height and gravity in the motion test.',inputSchema:{type:'object',properties:{speed:{type:'number',minimum:80,maximum:360},height:{type:'number',minimum:60,maximum:220},gravity:{type:'number',minimum:500,maximum:1800}},additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||typeof input!=='object')throw new Error('Invalid settings');const ranges={speed:[80,360],height:[60,220],gravity:[500,1800]};for(const [key,value]of Object.entries(input)){if(!ranges[key]||typeof value!=='number'||!Number.isFinite(value)||value<ranges[key][0]||value>ranges[key][1])throw new Error('Invalid '+key);}for(const [key,value]of Object.entries(input)){config[key]=value;document.getElementById(key).value=value;document.getElementById(key+'Value').value=value;}return {...config};}})).catch(()=>{});
}
