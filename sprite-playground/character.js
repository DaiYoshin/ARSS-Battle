'use strict';
const CharacterState=Object.freeze({IDLE:'idle',WALK:'walk',DASH:'dash',JUMP:'jump',LAND:'land',PUNCH:'punch',KICK:'kick',HURT:'hurt',DOWN:'down',AIR_PUNCH:'air_punch',AIR_KICK:'air_kick',GUARD:'guard'});
const ATTACK_DATA=Object.freeze({
 punch:{frames:[6,7,8,9,10,11,12,13,14,15,16,18,22,26,28,30,32],fps:30,
  // Fist bounds in the 320×256 source frame; pivot is (160,238).
  hitboxes:{16:[250,110,278,143],18:[260,110,288,143],22:[270,110,298,143],26:[270,110,298,143],28:[270,110,298,143]}},
 air_punch:{frames:[0,1,2,3,4,5,6],fps:24,air:true,hitboxes:Object.fromEntries([0,1,2,3,4,5,6].map(i=>[i,[246,112,273,145]]))},
 air_kick:{frames:[0,1,2,3,4,5,6,7,8,9],fps:30,air:true,hitboxes:Object.fromEntries([0,1,2,3,4,5,6,7,8,9].map(i=>[i,[214,110,246,157]]))},
 kick:{frames:[3,4,5,6,7,8,9,10,11,12,14,16,18,20,22,24],fps:28,hitboxes:{8:[205,164,234,200],9:[207,147,234,184],10:[207,137,235,175],11:[201,124,232,160],12:[201,124,232,160],14:[201,124,232,160],16:[201,124,232,160],18:[201,124,232,160]}}
});
const GREEN_KICK={frames:Array.from({length:17},(_,i)=>i),fps:40,damage:13,
 hitboxes:{5:[194,131,225,159],6:[208,111,230,141],7:[210,99,227,133],8:[207,112,230,143],9:[195,126,226,157]}};
const GREEN_PUNCH={frames:Array.from({length:17},(_,i)=>i),fps:30,damage:15,
 hitboxes:{4:[210,90,229,108],5:[210,88,229,107],6:[210,88,229,107],7:[210,88,229,107],8:[210,88,229,107]}};
const GREEN_AIR_PUNCH={frames:Array.from({length:14},(_,i)=>i),fps:30,air:true,damage:15,
 hitboxes:{7:[210,92,226,112],8:[198,120,219,139],9:[195,138,212,158],10:[186,149,202,171],11:[184,149,200,171]}};
const GREEN_AIR_KICK={frames:Array.from({length:15},(_,i)=>i),fps:30,air:true,damage:18,
 hitboxes:{4:[210,177,233,206],5:[209,178,234,208],6:[209,179,234,209],7:[209,179,234,209],8:[209,179,234,209],9:[209,179,234,209]}};
const FISH_BITE={frames:Array.from({length:16},(_,i)=>i),fps:30,damage:15,hitboxes:{7:[249,104,282,151],8:[249,108,282,152],9:[249,111,282,153],10:[249,113,282,153]}};
const FISH_KICK={frames:Array.from({length:16},(_,i)=>i),fps:30,damage:22,hitboxes:{4:[252,140,282,165],5:[252,140,282,165],6:[252,140,282,165],7:[252,140,282,165]}};
const FISH_AIR_PUNCH={frames:Array.from({length:14},(_,i)=>i),fps:30,air:true,damage:15,hitboxes:{5:[211,167,250,200],6:[211,167,250,200],7:[186,170,234,207],8:[192,167,239,203]}};
const FISH_AIR_KICK={frames:Array.from({length:16},(_,i)=>i),fps:30,air:true,damage:22,hitboxes:{5:[179,169,226,207],6:[133,165,205,211],7:[133,165,205,211],8:[133,165,205,211],9:[133,165,205,211],10:[151,165,215,211]}};
const HEADSET_KICK={frames:Array.from({length:12},(_,i)=>i),fps:25,damage:17,hitboxes:{3:[239,85,265,116],4:[239,85,265,116],5:[239,86,265,116],6:[239,86,265,116]}};
const HEADSET_PUNCH={frames:Array.from({length:13},(_,i)=>i),fps:24,damage:15,hitboxes:{4:[238,66,252,81],5:[235,66,250,80],6:[236,66,251,80]}};
const HEADSET_AIR_PUNCH={frames:Array.from({length:14},(_,i)=>i),fps:30,air:true,damage:15,hitboxes:{7:[229,146,248,170],8:[229,149,248,173],9:[229,149,248,173]}};
const HEADSET_AIR_KICK={frames:Array.from({length:12},(_,i)=>i),fps:36,air:true,damage:22,hitboxes:{3:[221,176,258,212],4:[230,174,268,213],5:[232,170,273,213],6:[234,170,273,212]}};
const BLACKCAT_AIR_KICK={frames:Array.from({length:12},(_,i)=>i),fps:36,air:true,damage:22,hitboxes:{0:[176,176,226,206],1:[176,176,226,206],2:[176,176,226,206],3:[176,176,226,206],4:[176,176,226,206],5:[176,176,226,206]}};
const BLACKCAT_AIR_PUNCH={frames:Array.from({length:12},(_,i)=>i),fps:36,air:true,damage:15,hitboxes:{4:[211,177,250,206],5:[211,177,252,206],6:[211,177,252,206],7:[211,177,252,206]}};
const BLACKCAT_KICK={frames:Array.from({length:17},(_,i)=>i),fps:30,damage:22,hitboxes:{5:[224,67,255,106],6:[224,67,255,106],7:[224,67,255,106],8:[224,67,255,106],9:[224,67,255,106]}};
const BLACKCAT_PUNCH={frames:Array.from({length:17},(_,i)=>i),fps:30,damage:15,hitboxes:{5:[280,114,303,144],6:[272,114,297,144],7:[264,114,290,144],8:[264,114,290,144],9:[264,114,290,144],10:[264,114,290,144]}};
const GRAY_PUNCH={frames:Array.from({length:17},(_,i)=>i),fps:30,damage:15,hitboxes:{6:[240,80,268,106],7:[240,80,268,106],8:[240,80,268,106],9:[240,80,268,106],10:[240,80,268,106]}};
const GRAY_KICK={frames:Array.from({length:17},(_,i)=>i),fps:30,damage:22,hitboxes:{5:[236,49,265,91],6:[236,49,265,91],7:[236,49,265,91],8:[236,49,265,91],9:[236,49,265,91]}};
const GRAY_AIR_PUNCH={frames:Array.from({length:14},(_,i)=>i),fps:30,air:true,damage:15,hitboxes:{4:[232,162,258,186],5:[211,206,235,231],6:[198,218,222,242],7:[198,218,222,242]}};
const GRAY_AIR_KICK={frames:Array.from({length:15},(_,i)=>i),fps:30,air:true,damage:22,hitboxes:{5:[237,136,268,175],6:[237,136,263,175],7:[237,136,263,175],8:[237,136,263,175],9:[237,136,263,175]}};
const COMMANDER_ATTACKS=Object.fromEntries(['punch','kick','air_punch','air_kick'].map(name=>[name,{
 frames:Array.from({length:18},(_,i)=>i),fps:30,damage:name.includes('kick')?25:19,air:name.startsWith('air_'),
 hitboxes:Object.fromEntries([6,7,8,9].map(i=>[i,name.includes('kick')?[206,120,288,180]:[208,90,292,148]]))
}]));
COMMANDER_ATTACKS.punch={frames:Array.from({length:18},(_,i)=>i),fps:30,damage:19,hitboxes:Object.fromEntries([6,7,8,9,10].map(i=>[i,[232,68,264,104]]))};
COMMANDER_ATTACKS.kick={frames:Array.from({length:22},(_,i)=>i),fps:30,damage:25,hitboxes:{8:[250,68,279,102],9:[265,48,291,83],...Object.fromEntries([10,11,12,13,14].map(i=>[i,[266,40,293,76]]))}};
COMMANDER_ATTACKS.air_kick={frames:Array.from({length:16},(_,i)=>i),fps:30,air:true,damage:25,hitboxes:Object.fromEntries([6,7,8,9,10,11].map(i=>[i,[222,160,262,195]]))};
COMMANDER_ATTACKS.air_punch={frames:Array.from({length:18},(_,i)=>i),fps:30,air:true,damage:19,hitboxes:{9:[213,25,249,63],10:[219,65,262,100],11:[210,97,250,133],12:[210,109,244,145],13:[210,109,244,145]}};
class Character {
 constructor(settings={speed:180,height:140,gravity:1000}){this.settings={...settings};this.reset();}
 reset(){Object.assign(this,{x:550,y:0,vx:0,vy:0,facing:1,grounded:true,state:CharacterState.IDLE,stateTime:0,idleTime:0,jumpTime:0,jumpImpulse:0,jumpBuffer:0,gameOver:false,hp:this.appearance==='commander'?150:100,maxHp:this.appearance==='commander'?150:100,guardMeter:100,guardDelay:0,airAttackUsed:false,attackConnected:false,blockTime:0});}
 get controllable(){return !this.gameOver&&['idle','walk','dash','jump','land'].includes(this.state);}
 // White is a palette variant: combat rules always come from green.
 get baseAppearance(){return this.appearance==='white'?'green':this.appearance;}
 get renderOffsetY(){return this.baseAppearance==='green'?15:0;}
 get renderScale(){return this.appearance==='commander'?1.15:this.appearance==='headset'?1.1:this.appearance==='fish'?1.5:this.baseAppearance==='green'?1.15:1;}
 get attackData(){if(this.appearance==='commander')return COMMANDER_ATTACKS[this.state];return this.appearance==='blackcat'&&this.state==='air_kick'?BLACKCAT_AIR_KICK:this.appearance==='blackcat'&&this.state==='air_punch'?BLACKCAT_AIR_PUNCH:this.appearance==='blackcat'&&this.state==='kick'?BLACKCAT_KICK:this.appearance==='blackcat'&&this.state==='punch'?BLACKCAT_PUNCH:this.appearance==='gray'&&this.state==='air_kick'?GRAY_AIR_KICK:this.appearance==='gray'&&this.state==='air_punch'?GRAY_AIR_PUNCH:this.appearance==='gray'&&this.state==='kick'?GRAY_KICK:this.appearance==='gray'&&this.state==='punch'?GRAY_PUNCH:this.appearance==='headset'&&this.state==='air_kick'?HEADSET_AIR_KICK:this.appearance==='headset'&&this.state==='air_punch'?HEADSET_AIR_PUNCH:this.appearance==='headset'&&this.state==='punch'?HEADSET_PUNCH:this.appearance==='headset'&&this.state==='kick'?HEADSET_KICK:this.appearance==='fish'&&this.state==='air_kick'?FISH_AIR_KICK:this.appearance==='fish'&&this.state==='air_punch'?FISH_AIR_PUNCH:this.appearance==='fish'&&this.state==='kick'?FISH_KICK:this.appearance==='fish'&&this.state==='punch'?FISH_BITE:this.baseAppearance==='green'&&this.state==='air_kick'?GREEN_AIR_KICK:this.baseAppearance==='green'&&this.state==='air_punch'?GREEN_AIR_PUNCH:this.baseAppearance==='green'&&this.state==='punch'?GREEN_PUNCH:this.baseAppearance==='green'&&this.state==='kick'?GREEN_KICK:ATTACK_DATA[this.state];}
 get attackBox(){
  const box=this.attackData?.hitboxes?.[this.pose().frame];
  if(!box)return null;
  const [left,top,right,bottom]=box;
  const reachBonus=this.appearance==='headset'?20:this.baseAppearance==='green'&&this.state==='punch'?5:0;
  const x1=this.x+(left-160)*this.facing*this.renderScale,x2=this.x+((right-160)*this.renderScale+reachBonus)*this.facing;
  return {left:Math.min(x1,x2),right:Math.max(x1,x2),top:this.y+this.renderOffsetY+(top-238)*this.renderScale,bottom:this.y+this.renderOffsetY+(bottom-238)*this.renderScale};
 }
 get hurtBox(){if(this.appearance==='fish')return {left:this.x-100*this.renderScale,right:this.x+100*this.renderScale,top:this.y-165*this.renderScale,bottom:this.y-55*this.renderScale};return {left:this.x-36*this.renderScale,right:this.x+36*this.renderScale,top:this.y+this.renderOffsetY-180*this.renderScale,bottom:this.y+this.renderOffsetY-8*this.renderScale};}
 enter(state){if(this.state===state)return;this.state=state;this.stateTime=0;this.attackConnected=false;if(state!=='idle')this.idleTime=0;if(['hurt','down','punch','kick'].includes(state)){this.vx=0;this.jumpBuffer=0;}if(state==='down')this.gameOver=true;}
 requestJump(){if(!this.controllable)return false;this.jumpBuffer=.12;this.idleTime=0;return true;}
 requestAttack(name){if(!['punch','kick'].includes(name)||!this.controllable||(!this.grounded&&this.airAttackUsed))return false;if(!this.grounded)this.airAttackUsed=true;this.enter(this.grounded?name:'air_'+name);return true;}
 blocks(attacker){return this.state==='guard'&&this.grounded&&(attacker.x-this.x)*this.facing>0;}
 receiveBlock(damage=15){this.guardMeter=Math.max(0,this.guardMeter-damage*1.6);this.guardDelay=1.2;if(this.guardMeter===0){this.receiveHit();return false;}this.blockTime=.18;return true;}
 takeDamage(amount){if(!Number.isFinite(amount)||amount<=0||this.gameOver)return false;this.hp=Math.max(0,this.hp-amount);return this.hp===0?this.knockDown():this.receiveHit();}
 receiveHit(){if(this.gameOver)return false;this.enter('hurt');this.stateTime=0;return true;}
 knockDown(){if(this.gameOver)return false;this.hp=0;this.enter('down');return true;}
 update(dt,input={}){
  if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid time step');
  this.guardDelay=Math.max(0,this.guardDelay-dt);
  if(this.guardDelay===0&&this.state!=='guard'&&this.state!=='hurt')this.guardMeter=Math.min(100,this.guardMeter+24*dt);
  this.stateTime+=dt;this.blockTime=Math.max(0,this.blockTime-dt);
  if(this.state==='hurt'&&this.stateTime>=(this.appearance==='commander'?17/60:.85*2/3))this.enter(this.grounded?'idle':'jump');
  if(ATTACK_DATA[this.state]){const a=this.attackData;if(this.stateTime>=a.frames.length/a.fps)this.enter(this.grounded?'idle':'jump');}
  if(this.state==='land'&&this.stateTime>=.15)this.enter('idle');
  if(this.state==='guard'&&!input.guard&&this.blockTime===0)this.enter('idle');
  if(input.guard&&this.grounded&&this.controllable&&this.guardMeter>0){this.enter('guard');this.vx=0;this.jumpBuffer=0;}
  const direction=this.controllable?Number(!!input.right)-Number(!!input.left):0;
  if(!ATTACK_DATA[this.state]?.air)this.vx=direction*this.settings.speed*(input.dash?1.8:1);
  if(this.controllable&&Number.isFinite(input.targetX))this.facing=input.targetX<this.x?-1:1;else if(direction)this.facing=direction;
  this.x=Math.max(50,Math.min(1050,this.x+this.vx*dt));
  if(this.jumpBuffer>0&&this.grounded&&this.controllable){
   this.jumpBuffer=0;this.grounded=false;this.jumpImpulse=Math.sqrt(2*this.settings.gravity*this.settings.height);this.vy=-this.jumpImpulse;this.jumpTime=0;this.enter('jump');
  }
  this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  if(!this.grounded){
   this.jumpTime+=dt;this.vy+=this.settings.gravity*dt;this.y+=this.vy*dt;
   if(this.y>=0){this.y=0;this.vy=0;this.grounded=true;this.airAttackUsed=false;if(this.state==='jump'||ATTACK_DATA[this.state]?.air)this.enter(direction?(input.dash?'dash':'walk'):'land');}
  }
  if(this.controllable&&this.grounded){
   if(direction)this.enter(input.dash?'dash':'walk');
   else if(['walk','dash'].includes(this.state))this.enter('idle');
  }
  if(this.state==='idle'&&!input.left&&!input.right)this.idleTime+=dt;else this.idleTime=0;
  return this.pose();
 }
 pose(){
  let animation=this.state,frame=0,label='';
  if(this.appearance==='commander'&&['walk','dash'].includes(this.state)){const step=Math.floor(this.stateTime*(this.state==='dash'?48:24)*Math.max(.2,this.settings.speed/180))%24;return {animation:'commander_walk',frame:this.vx*this.facing<0?(24-step)%24:step,label:this.state==='dash'?'ダッシュ':'歩行'};}
  if(this.appearance==='commander'&&this.state==='jump'){const ratio=Math.min(1,Math.abs(this.vy)/(this.jumpImpulse||1));return {animation:'commander_jump',frame:this.vy<0?Math.min(3,Math.floor((1-ratio)*4)):4+Math.min(3,Math.floor(ratio*4)),label:this.vy<0?'ジャンプ · 上昇':'ジャンプ · 下降'};}
  if(this.appearance==='commander'&&this.state==='land')return {animation:'commander_jump',frame:8+Math.min(3,Math.floor(this.stateTime/.0375)),label:'着地'};
  if(this.appearance==='commander'&&this.state==='down')return {animation:'commander_down',frame:Math.min(36,Math.floor(this.stateTime*30)),label:'KO · ダウン'};
  if(this.appearance==='commander'&&this.state==='hurt')return {animation:'commander_hurt',frame:Math.min(16,Math.floor(this.stateTime*60)),label:'被弾 · のけぞり'};
  if(this.appearance==='commander'&&this.state==='guard')return {animation:'commander_guard',frame:Math.min(4,Math.floor(this.stateTime*40)),label:this.blockTime>0?'ガード · 防御成功':'ガード'};
  if(this.appearance==='commander'){const a=this.attackData;return {animation:['punch','kick','air_kick','air_punch'].includes(this.state)?'commander_'+this.state:'commander',frame:a?a.frames[Math.min(a.frames.length-1,Math.floor(this.stateTime*a.fps))]:0,label:({punch:'ナイフ斬り',kick:'前蹴り',air_kick:'ジャンプキック',air_punch:'ジャンプパンチ',guard:'ガード',down:'ダウン'})[this.state]||'軍隊長'};}
  if(this.appearance==='fish'&&['idle','walk','dash'].includes(this.state)){const rate=this.state==='dash'?21.6:this.state==='walk'?12:8;return {animation:'fish_swim',frame:Math.floor(this.stateTime*rate)%36,label:this.state==='idle'?'待機':this.state==='walk'?'歩行':'ダッシュ'};}
  if(this.appearance==='headset'&&['idle','walk','dash'].includes(this.state)){const step=Math.floor(this.stateTime*(this.state==='dash'?24:12)*Math.max(.2,this.settings.speed/180))%12;return {animation:this.state==='idle'?'headset_idle':this.state==='dash'?'headset_run':'headset_walk',frame:this.state==='idle'?0:this.vx*this.facing<0?(12-step)%12:step,label:this.state==='idle'?'待機':this.state==='dash'?'ダッシュ':'歩行'};}
  if(this.appearance==='blackcat'&&['walk','dash'].includes(this.state)){const running=this.state==='dash',count=running?16:24,step=Math.floor(this.stateTime*24*Math.max(.2,this.settings.speed/180))%count;return {animation:running?'blackcat_run':'blackcat_walk',frame:this.vx*this.facing<0?(count-step)%count:step,label:this.state==='dash'?'ダッシュ':'歩行'};}
  if(this.appearance==='gray'&&['walk','dash'].includes(this.state)){const running=this.state==='dash',count=running?12:16,rate=running?24:20,step=Math.floor(this.stateTime*rate*Math.max(.2,this.settings.speed/180))%count;return {animation:running?'gray_run':'gray_walk',frame:this.vx*this.facing<0?(count-step)%count:step,label:running?'ダッシュ':'歩行'};}
  switch(this.state){
   case 'idle':{const phase=this.idleTime<5?-1:(this.idleTime-5)%11;const look=phase>=0&&phase<3;frame=look?Math.min(17,Math.floor(phase*6)):0;label=look?'待機 · 見上げる':'待機';break;}
   case 'walk':case 'dash':if(this.baseAppearance==='green'&&this.state==='dash'){animation='green_run';const step=Math.floor(this.stateTime*24*Math.max(.2,this.settings.speed/180))%15;frame=this.vx*this.facing<0?(15-step)%15:step;label='ダッシュ';break;}if(this.baseAppearance==='green'){animation='green_walk';const step=Math.floor(this.stateTime*(this.state==='dash'?24:12)*Math.max(.2,this.settings.speed/180))%14;frame=this.vx*this.facing<0?(14-step)%14:step;label=this.state==='dash'?'ダッシュ':'歩行';break;}frame=Math.floor(this.stateTime*12*Math.max(.2,this.settings.speed/180))%(this.state==='dash'?8:12);label=this.state==='dash'?'ダッシュ':'歩行';break;
   case 'jump':if(this.appearance==='blackcat'){animation='blackcat_jump';const ratio=Math.min(1,Math.abs(this.vy)/(this.jumpImpulse||1));frame=this.vy<0?Math.min(3,Math.floor((1-ratio)*4)):4+Math.min(3,Math.floor(ratio*4));label=this.vy<0?'ジャンプ · 上昇':'ジャンプ · 下降';break;}if(this.appearance==='gray'){animation='gray_jump';const ratio=Math.min(1,Math.abs(this.vy)/(this.jumpImpulse||1));frame=this.vy<0?Math.min(3,Math.floor((1-ratio)*4)):4+Math.min(3,Math.floor(ratio*4));label=this.vy<0?'ジャンプ · 上昇':'ジャンプ · 下降';break;}if(this.appearance==='headset'){animation='headset_jump';const ratio=Math.min(1,Math.abs(this.vy)/(this.jumpImpulse||1));frame=this.vy<0?Math.min(3,Math.floor((1-ratio)*4)):4+Math.min(3,Math.floor(ratio*4));label=this.vy<0?'ジャンプ · 上昇':'ジャンプ · 下降';break;}if(this.appearance==='fish'){animation='fish_jump';const ratio=Math.min(1,Math.abs(this.vy)/(this.jumpImpulse||1));frame=this.vy<0?Math.min(3,Math.floor((1-ratio)*4)):4+Math.min(3,Math.floor(ratio*4));label=this.vy<0?'ジャンプ · 上昇':'ジャンプ · 下降';break;}if(this.baseAppearance==='green'){animation='green_jump';const ratio=Math.min(1,Math.abs(this.vy)/(this.jumpImpulse||1));frame=this.vy<0?Math.min(2,Math.floor((1-ratio)*3)):3+Math.min(2,Math.floor(ratio*3));label=this.vy<0?'ジャンプ · 上昇':'ジャンプ · 下降';break;}frame=this.jumpTime<.08?8:this.vy<0?Math.min(13,9+Math.floor(4*(1-Math.abs(this.vy)/(this.jumpImpulse||1)))):Math.min(16,14+Math.floor(3*this.vy/(this.jumpImpulse||1)));label=this.vy<0?'ジャンプ · 上昇':'ジャンプ · 下降';break;
   case 'land':if(this.appearance==='blackcat'){animation='blackcat_jump';frame=8+Math.min(3,Math.floor(this.stateTime/.0375));label='着地';break;}if(this.appearance==='gray'){animation='gray_jump';frame=8+Math.min(3,Math.floor(this.stateTime/.0375));label='着地';break;}if(this.appearance==='headset'){animation='headset_jump';frame=8+Math.min(3,Math.floor(this.stateTime/.0375));label='着地';break;}if(this.appearance==='fish'){animation='fish_jump';frame=8+Math.min(3,Math.floor(this.stateTime/.0375));label='着地';break;}if(this.baseAppearance==='green'){animation='green_jump';frame=6+Math.min(3,Math.floor(this.stateTime/.0375));label='着地';break;}animation='jump';frame=17+Math.min(2,Math.floor(this.stateTime/.05));label='着地';break;
   case 'guard':if(this.appearance==='blackcat'){animation='blackcat_guard';frame=Math.min(6,Math.floor(this.stateTime*30));label=this.blockTime>0?'ガード · 防御成功':'ガード';break;}if(this.appearance==='gray'){animation='gray_guard';frame=Math.min(7,Math.floor(this.stateTime*30));label=this.blockTime>0?'ガード · 防御成功':'ガード';break;}if(this.appearance==='headset'){animation='headset_guard';frame=Math.min(7,Math.floor(this.stateTime*30));label=this.blockTime>0?'ガード · 防御成功':'ガード';break;}if(this.appearance==='fish'){animation='fish_guard';frame=Math.min(8,Math.floor(this.stateTime*30));label=this.blockTime>0?'ガード · 防御成功':'ガード';break;}if(this.baseAppearance==='green'){animation='green_guard';frame=Math.min(8,Math.floor(this.stateTime*30));label=this.blockTime>0?'ガード · 防御成功':'ガード';break;}frame=this.stateTime<.23?6+Math.min(6,Math.floor(this.stateTime*30)):18;label=this.blockTime>0?'ガード · 防御成功':'ガード';break;
   case 'air_punch':case 'air_kick':case 'punch':case 'kick':{const a=this.attackData;frame=a.frames[Math.min(a.frames.length-1,Math.floor(this.stateTime*a.fps))];if(this.baseAppearance==='green'&&['punch','kick','air_punch','air_kick'].includes(this.state))animation='green_'+this.state;if(this.appearance==='fish'&&this.state==='punch')animation='fish_bite';if(this.appearance==='fish'&&this.state==='kick')animation='fish_kick';if(this.appearance==='fish'&&this.state==='air_punch')animation='fish_air_punch';if(this.appearance==='fish'&&this.state==='air_kick')animation='fish_air_kick';if(this.appearance==='headset'&&this.state==='kick')animation='headset_kick';if(this.appearance==='headset'&&this.state==='punch')animation='headset_punch';if(this.appearance==='headset'&&this.state==='air_punch')animation='headset_air_punch';if(this.appearance==='headset'&&this.state==='air_kick')animation='headset_air_kick';if(this.appearance==='blackcat'&&this.state==='air_kick')animation='blackcat_air_kick';if(this.appearance==='blackcat'&&this.state==='air_punch')animation='blackcat_air_punch';if(this.appearance==='blackcat'&&this.state==='kick')animation='blackcat_kick';if(this.appearance==='blackcat'&&this.state==='punch')animation='blackcat_punch';if(this.appearance==='gray'&&this.state==='punch')animation='gray_punch';if(this.appearance==='gray'&&this.state==='kick')animation='gray_kick';if(this.appearance==='gray'&&this.state==='air_punch')animation='gray_air_punch';if(this.appearance==='gray'&&this.state==='air_kick')animation='gray_air_kick';label=({punch:'パンチ',kick:'キック',air_punch:'空中パンチ',air_kick:'空中キック'})[this.state];break;}
   case 'hurt':if(this.appearance==='blackcat'){animation='blackcat_hurt';frame=Math.min(11,Math.floor(this.stateTime*30));label='被弾 · 操作不能';break;}if(this.appearance==='gray'){animation='gray_hurt';frame=Math.min(11,Math.floor(this.stateTime*30));label='被弾 · 操作不能';break;}if(this.appearance==='headset'){animation='headset_hurt';frame=Math.min(11,Math.floor(this.stateTime*30));label='被弾 · 操作不能';break;}if(this.appearance==='fish'){animation='fish_hurt';frame=Math.min(16,Math.floor(this.stateTime*30));label='被弾 · 操作不能';break;}if(this.baseAppearance==='green'){animation='green_hurt';frame=Math.min(11,Math.floor(this.stateTime*30));label='被弾 · 操作不能';break;}animation='damage';frame=Math.min(10,Math.floor(this.stateTime*25));label='被弾 · 操作不能';break;
   case 'down':if(this.appearance==='blackcat'){animation='blackcat_down';frame=Math.min(21,Math.floor(this.stateTime*24));label='ゲームオーバー';break;}if(this.appearance==='gray'){animation='gray_down';frame=Math.min(21,Math.floor(this.stateTime*20));label='ゲームオーバー';break;}if(this.appearance==='headset'){animation='headset_down';frame=Math.min(72,Math.floor(this.stateTime*24));label='ゲームオーバー';break;}if(this.appearance==='fish'){animation='fish_down';frame=Math.min(36,Math.floor(this.stateTime*12));label='ゲームオーバー';break;}if(this.baseAppearance==='green'){animation='green_down';frame=Math.min(72,Math.floor(this.stateTime*24));label='ゲームオーバー';break;}frame=Math.min(36,Math.floor(this.stateTime*12));label='ゲームオーバー';break;
  }
  if(this.appearance==='fish'&&this.state==='punch')label='噛みつき';
  if(this.appearance==='white'&&animation.startsWith('green_'))animation='white_'+animation.slice(6);
  return {animation,frame,label};
 }
}
if(typeof module!=='undefined')module.exports={Character,CharacterState,ATTACK_DATA};

// Decisions are sampled rather than reacting to every rendered frame.
const AI_LEVELS={easy:{reaction:.3,guard:0,jump:0,rest:.65},normal:{reaction:.22,guard:.55,jump:.25,rest:.55},hard:{reaction:.14,guard:.8,jump:.4,rest:.35}};
class EnemyController {
 constructor(random=Math.random,difficulty='normal'){this.random=random;this.difficulty=difficulty;this.reset();}
 reset(){this.cooldown=1;this.inRangeTime=0;this.nextAttack=null;this.decisionTime=0;this.guardTime=0;this.jumpCooldown=2;this.retreatTime=0;}
 update(dt,self,target){
  const input={},level=AI_LEVELS[this.difficulty]||AI_LEVELS.normal;
  if(self.gameOver||target.gameOver)return input;
  this.jumpCooldown=Math.max(0,this.jumpCooldown-dt);
  this.guardTime=Math.max(0,this.guardTime-dt);
  this.retreatTime=Math.max(0,this.retreatTime-dt);
  if(self.state==='guard'){input.guard=this.guardTime>0&&self.guardMeter>25;return input;}
  if(!self.controllable){this.inRangeTime=0;return input;}
  this.cooldown=Math.max(0,this.cooldown-dt);
  const dx=target.x-self.x,distance=Math.abs(dx),toward=dx<0?-1:1;
  self.facing=toward;
  const move=direction=>{input.left=direction<0;input.right=direction>0;};
  if(!self.grounded){
   move(toward);
   if(!self.airAttackUsed&&distance<110&&Math.abs(self.y-target.y)<100&&self.jumpTime>.15){
    self.requestAttack(this.random()<.5?'punch':'kick');this.cooldown=level.rest;
   }
   return input;
  }
  this.decisionTime+=dt;
  if(this.decisionTime>=level.reaction){
   this.decisionTime=0;
   if(ATTACK_DATA[target.state]&&distance<175&&self.guardMeter>30&&this.random()<level.guard){
    this.guardTime=.35;input.guard=true;return input;
   }
   if(level.jump>0&&this.jumpCooldown===0&&distance>110&&distance<260&&this.random()<level.jump){
    self.requestJump();move(toward);this.jumpCooldown=3;return input;
   }
   if(this.difficulty!=='easy'&&this.cooldown>.1&&distance<130&&this.random()<.4)this.retreatTime=.18;
  }
  if(this.retreatTime>0&&self.x>85&&self.x<1015){move(-toward);return input;}
  if(!this.nextAttack)this.nextAttack=this.random()<.65?'punch':'kick';
  if(distance>(this.nextAttack==='kick'?95:140)){
   this.inRangeTime=0;move(toward);
   input.dash=this.difficulty!=='easy'&&distance>320;
  }else if(target.grounded){
   this.inRangeTime+=dt;
   if(this.cooldown===0&&this.inRangeTime>=level.reaction){
    if(self.requestAttack(this.nextAttack)){
     this.cooldown=level.rest+this.random()*.45;this.inRangeTime=0;this.nextAttack=null;
    }
   }
  }else this.inRangeTime=0;
  return input;
 }
}
if(typeof module!=='undefined')module.exports.EnemyController=EnemyController;
