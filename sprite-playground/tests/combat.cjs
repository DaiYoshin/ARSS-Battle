const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const elements={};const get=id=>elements[id]??={addEventListener(){},getContext(){return{}},textContent:''};
const context={document:{querySelector:get,getElementById:get,querySelectorAll:()=>[]},window:{addEventListener(){}},Image:class{set src(v){}},Promise,console,requestAnimationFrame(){}};
vm.createContext(context);
for(const file of ['character.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const t=context.window.motionTest;t.actor.appearance='mascot';t.enemyAI.random=()=>0;t.enemyAI.difficulty='easy';
function advance(seconds){for(let i=0;i<Math.ceil(seconds*120);i++)t.update(1/120);}
const originalReset=t.reset;
assert(t.selecting);t.update(10);assert.equal(t.countdown,3);assert.equal(t.requestAttack('punch'),false);t.reset();
assert.equal(t.countdown,3);t.keys.right=true;t.keys.guard=true;
assert.equal(t.requestJump(),false);assert.equal(t.requestAttack('punch'),false);assert.equal(t.requestReaction('down'),false);
advance(2);assert.equal(t.actor.x,330);assert.equal(t.enemy.x,760);assert.equal(t.actor.state,'idle');assert.equal(t.enemy.state,'idle');assert.equal(t.actor.hp,100);
advance(1.01);assert.equal(t.countdown,0);
originalReset();assert.equal(t.countdown,3);
t.reset=()=>{originalReset();t.update(3);};t.reset();
console.log('PASS: countdown locks both fighters and inputs; reset restarts countdown');
advance(1);assert(t.enemy.x<760);assert.equal(t.actor.hp,100);
advance(2);assert(t.actor.hp<100,'AI approaches and hits');
advance(25);assert.equal(t.result,'GAME OVER');assert.equal(t.actor.pose().frame,36);const pos=t.enemy.x;advance(1);assert.equal(t.enemy.x,pos);
t.reset();assert.equal(t.actor.hp,100);assert.equal(t.enemy.hp,100);assert.equal(t.enemyAI.cooldown,1);assert.equal(t.result,null);
t.actor.x=500;t.enemy.x=630;t.enemyAI.cooldown=0;advance(.35);assert.equal(t.enemy.state,'punch');advance(.60);assert.equal(t.enemy.state,'idle');advance(.4);assert.equal(t.enemy.state,'idle','post-attack pause');
t.enemy.receiveHit();const hitX=t.enemy.x;advance(.5);assert.equal(t.enemy.state,'hurt');assert.equal(t.enemy.x,hitX);
// Isolate punch geometry from AI decisions.
function setup(distance=150,facing=1){t.reset();t.enemyAI.cooldown=100;t.actor.x=500;t.actor.facing=facing;t.enemy.x=500+distance*facing;}
setup(130);t.requestAttack('punch');advance(.3);assert.equal(t.enemy.hp,100);advance(.05);assert.equal(t.enemy.hp,85);advance(.1);assert.equal(t.enemy.hp,85);
setup(130,-1);t.requestAttack('punch');advance(.35);assert.equal(t.enemy.hp,85);
setup(-130);t.requestAttack('punch');advance(.35);assert.equal(t.enemy.hp,100);
// Simultaneous lethal blows produce a draw independent of update order.
setup(130);t.actor.hp=t.enemy.hp=15;t.enemy.facing=-1;t.requestAttack('punch');t.enemy.requestAttack('punch');t.actor.stateTime=t.enemy.stateTime=.34;t.update(0);assert.equal(t.result,'DRAW');
t.reset();t.actor.x=500;t.enemy.x=595;t.actor.hp=22;t.enemy.facing=-1;t.enemy.requestAttack('kick');t.enemy.stateTime=.2;t.update(0);assert.equal(t.result,'GAME OVER');
console.log('PASS: approach, attacks, cooldown, hurt lock, reset, KO, punch geometry, simultaneous KO, enemy kick');

// Finish the winner's current animation after the match instead of freezing it.
setup(130);t.enemy.hp=15;t.requestAttack('punch');advance(.35);assert.equal(t.result,'YOU WIN');advance(4);assert.equal(t.actor.state,'idle');assert.equal(t.enemy.pose().frame,36);
t.reset();t.actor.x=500;t.enemy.x=630;t.actor.hp=15;t.enemy.facing=-1;t.enemy.requestAttack('punch');t.enemy.stateTime=.34;t.update(0);assert.equal(t.result,'GAME OVER');advance(4);assert.equal(t.enemy.state,'idle');assert.equal(t.actor.pose().frame,36);
console.log('PASS: winner recovers to idle and loser completes down animation after either result');
// Aerial attacks preserve physics and finish on landing.
const {Character}=require('../character.js');
for(const name of ['punch','kick']){
 const a=new Character(),b=new Character();a.requestJump();b.requestJump();a.update(.05,{right:true});b.update(.05,{right:true});assert(a.requestAttack(name));assert.equal(a.state,'air_'+name);assert(a.attackBox);
 a.update(.1,{right:true});b.update(.1,{right:true});assert.equal(a.y,b.y);assert.equal(a.x,b.x);assert.equal(a.requestAttack(name),false);
 a.y=-1;a.vy=100;a.update(.02,{});assert(a.grounded);assert.equal(a.state,'land');
}
setup(130);t.actor.facing=1;t.keys.guard=true;t.update(0);assert.equal(t.actor.state,'guard');assert.equal(t.requestAttack('punch'),false);assert.equal(t.requestJump(),false);t.enemy.facing=-1;t.enemy.requestAttack('punch');t.enemy.stateTime=.34;t.update(0);assert.equal(t.actor.hp,100);assert(t.actor.blockTime>0);t.keys.guard=false;advance(.23);assert.equal(t.actor.state,'idle');
setup(-130);t.keys.guard=true;t.update(0);t.enemy.facing=1;t.enemy.requestAttack('punch');t.enemy.stateTime=.34;t.update(0);assert.equal(t.actor.hp,85);assert.equal(t.actor.state,'hurt');
for(const name of ['punch','kick']){
 setup(100);t.actor.grounded=false;t.actor.y=-20;t.actor.vy=0;t.actor.enter('jump');t.requestAttack(name);t.update(0);assert(t.enemy.hp<100,'air hit '+name);const hp=t.enemy.hp;t.update(.02);assert.equal(t.enemy.hp,hp);
}
console.log('PASS: aerial physics/landing/contact, guard front/rear/release and action lock');

const defender=new Character();defender.update(0,{left:true,targetX:700});assert.equal(defender.facing,1);assert(defender.vx<0);
defender.update(0,{guard:true});for(let i=0;i<5;i++)defender.receiveBlock(15);assert.equal(defender.guardMeter,0);assert.equal(defender.state,'hurt');defender.update(1.3,{});defender.update(1,{});assert(defender.guardMeter>0);
const aerial=new Character();aerial.requestJump();aerial.update(.05,{});aerial.requestAttack('punch');aerial.update(.3,{});assert.equal(aerial.requestAttack('kick'),false);
const kicker=new Character();kicker.requestAttack('kick');kicker.update(.1,{});assert.equal(kicker.attackBox,null);kicker.update(.12,{});assert(kicker.attackBox);
console.log('PASS: retreat facing, guard break/recovery, one air attack per jump, kick startup box');
originalReset();t.setPaused(true);t.update(1);assert.equal(t.countdown,3);assert.equal(t.remainingTime,90);assert.equal(t.requestJump(),false);assert.equal(t.requestAttack('punch'),false);t.setPaused(false);t.update(3);assert.equal(t.countdown,0);
t.keys.right=true;t.setPaused(true);const pausedX=t.actor.x;t.update(1);assert.equal(t.actor.x,pausedX);assert.equal(t.remainingTime,90);t.setPaused(false);t.update(.1);assert.equal(t.actor.x,pausedX);
for(const [hp,expected] of [[100,'DRAW'],[90,'GAME OVER']]){
 t.reset();t.actor.hp=hp;t.enemyAI.cooldown=1000;t.enemy.x=1000;
 advance(90.1);assert.equal(t.result,expected);assert.equal(t.remainingTime,0);
}
t.reset();t.enemy.hp=90;t.enemyAI.cooldown=1000;t.enemy.x=1000;advance(90.1);assert.equal(t.result,'YOU WIN');t.reset();assert.equal(t.remainingTime,90);assert.equal(t.paused,false);
console.log('PASS: pause locks countdown/physics/clock/input, timeout win/loss/draw, reset');
// Character-specific sheets and attack data share one frame clock.
t.reset();t.enemyAI.cooldown=100;t.actor.appearance='green';t.actor.x=500;t.enemy.x=590;t.requestAttack('kick');t.update(.1);assert.equal(t.enemy.hp,100);assert.equal(t.actor.pose().animation,'green_kick');t.update(.04);assert.equal(t.enemy.hp,87);t.update(.1);assert.equal(t.enemy.hp,87);t.update(.25);assert.equal(t.actor.state,'idle');
t.keys.guard=true;t.update(0);t.update(.3);assert.equal(t.actor.pose().animation,'green_guard');assert.equal(t.actor.pose().frame,8);t.keys.guard=false;t.update(.01);assert.equal(t.actor.state,'idle');
t.reset();t.enemyAI.cooldown=100;t.actor.appearance='green';t.actor.x=590;t.actor.facing=-1;t.enemy.x=500;t.requestAttack('kick');t.update(.14);assert.equal(t.enemy.hp,87);
console.log('PASS: green kick timing/damage/single hit/mirror and guard hold/release');
// A stale character module must not terminate the animation loop on a hit.
t.reset();t.enemyAI.cooldown=100;t.actor.x=500;t.enemy.x=630;t.actor.appearance='mascot';t.requestAttack('punch');t.actor.stateTime=.34;
const savedBox=t.actor.attackBox;Object.defineProperty(t.actor,'attackData',{value:undefined,configurable:true});Object.defineProperty(t.actor,'attackBox',{value:savedBox,configurable:true});
// Simulate the older pose implementation which did not use attackData.
const originalPose=t.actor.pose;t.actor.pose=()=>({animation:'punch',frame:16,label:'パンチ'});
// Isolate the hit resolver from the newer Character.update getter dependency.
const originalUpdate=t.actor.update;t.actor.update=()=>t.actor.pose();
assert.doesNotThrow(()=>t.update(0));assert.equal(t.enemy.hp,85);
delete t.actor.attackData;delete t.actor.attackBox;t.actor.pose=originalPose;t.actor.update=originalUpdate;
console.log('PASS: missing optional attack metadata does not crash on contact');

// Dedicated tube thrust: startup, recovery, mirrored contact and one hit per attack.
for(const facing of [1,-1]){
 setup(90,facing);t.actor.appearance='green';t.requestAttack('punch');
 assert.equal(t.actor.pose().animation,'green_punch');assert.equal(t.actor.attackBox,null);
 advance(.12);assert.equal(t.enemy.hp,100);advance(.03);assert.equal(t.enemy.hp,85);
 advance(.20);assert.equal(t.enemy.hp,85);assert.equal(t.actor.attackBox,null);
 advance(.3);assert.equal(t.actor.state,'idle');
}
setup(150);t.actor.appearance='green';t.requestAttack('punch');advance(.6);assert.equal(t.enemy.hp,100);
setup(-90);t.actor.appearance='green';t.requestAttack('punch');advance(.6);assert.equal(t.enemy.hp,100);
console.log('PASS: green tube punch startup/recovery, single hit, both facings and reach');

// Movement sheets must follow physics without adding a second visual jump.
for(const facing of [1,-1]){
 const g=new Character(),reference=new Character();g.appearance='green';g.facing=facing;
 g.requestJump();reference.requestJump();
 let landed=false;
 for(let i=0;i<200;i++){
  g.update(1/120,{});reference.update(1/120,{});
  assert.equal(g.y,reference.y);assert.equal(g.vy,reference.vy);
  if(g.state==='jump'){assert.equal(g.pose().animation,'green_jump');assert(g.pose().frame>=0&&g.pose().frame<6);}
  if(g.state==='land'){landed=true;assert.equal(g.pose().animation,'green_jump');assert(g.pose().frame>=6&&g.pose().frame<10);}
 }
 assert(landed);assert.equal(g.state,'idle');assert.equal(g.facing,facing);
}
const walker=new Character();walker.appearance='green';walker.update(.01,{right:true,targetX:1000});
assert.equal(walker.pose().animation,'green_walk');walker.stateTime=14/12;assert.equal(walker.pose().frame,0);
walker.stateTime=1/12;assert.equal(walker.pose().frame,1);walker.vx=-180;assert.equal(walker.pose().frame,13);
walker.update(.01,{left:true,dash:true,targetX:1000});assert.equal(walker.state,'dash');assert.equal(walker.pose().animation,'green_run');
walker.update(.01,{});assert.equal(walker.state,'idle');
console.log('PASS: green jump physics/landing, both facings, walk loop, reverse steps and dash');

for(const facing of [1,-1]){
 const runner=new Character();runner.appearance='green';runner.facing=facing;runner.enter('dash');runner.vx=324*facing;
 runner.stateTime=15/24;assert.equal(runner.pose().frame,0);runner.stateTime=1/24;assert.equal(runner.pose().frame,1);
 runner.vx=-324*facing;assert.equal(runner.pose().frame,14);
 runner.takeDamage(15);assert.equal(runner.pose().animation,'green_hurt');assert.equal(runner.pose().frame,0);
 assert.equal(runner.requestAttack('punch'),false);assert.equal(runner.requestJump(),false);
 runner.update(.4,{right:true});assert.equal(runner.pose().frame,11);assert.equal(runner.vx,0);
 runner.update(.1,{});assert.equal(runner.pose().frame,11);assert.equal(runner.state,'hurt');
 runner.takeDamage(15);assert.equal(runner.pose().frame,0);runner.update(.86,{});assert.equal(runner.state,'idle');
 runner.takeDamage(100);assert.equal(runner.state,'down');assert.equal(runner.pose().animation,'green_down');
}
console.log('PASS: green run loop/reverse, hurt hold/restart/action lock/recovery and KO');

for(const facing of [1,-1]){
 setup(75,facing);t.actor.appearance='green';t.actor.grounded=false;t.actor.y=-30;t.actor.vy=0;t.actor.jumpImpulse=530;
 assert(t.requestAttack('punch'));assert.equal(t.actor.pose().animation,'green_air_punch');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=8/30;t.update(0);assert.equal(t.enemy.hp,85);t.update(0);assert.equal(t.enemy.hp,85);
 assert.equal(t.requestAttack('punch'),false);t.actor.stateTime=12/30;assert.equal(t.actor.attackBox,null);
 t.actor.y=-1;t.actor.vy=100;t.update(.07);assert.equal(t.actor.state,'land');assert.equal(t.actor.pose().animation,'green_jump');
 const a=new Character(),b=new Character();a.appearance='green';a.requestJump();b.requestJump();a.update(.05,{right:true});b.update(.05,{right:true});a.requestAttack('punch');
 a.update(.1,{right:true});b.update(.1,{right:true});assert.equal(a.y,b.y);assert.equal(a.x,b.x);
 const d=new Character();d.appearance='green';d.facing=facing;d.knockDown();
 for(let frame=0;frame<73;frame++){d.stateTime=(frame+.1)/24;assert.equal(d.pose().animation,'green_down');assert.equal(d.pose().frame,frame);}
 d.update(5);assert.equal(d.pose().frame,72);assert.equal(d.state,'down');assert.equal(d.requestJump(),false);
 d.reset();assert.equal(d.state,'idle');assert.equal(d.hp,100);
}
console.log('PASS: green aerial punch hit/mirror/recovery/physics/landing and complete down/hold/reset');

for(const facing of [1,-1]){
 setup(90,facing);t.actor.appearance='green';t.actor.grounded=false;t.actor.y=-60;t.actor.vy=0;t.actor.jumpImpulse=530;
 assert(t.requestAttack('kick'));assert.equal(t.actor.pose().animation,'green_air_kick');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=4/30;t.update(0);assert.equal(t.enemy.hp,82);t.update(0);assert.equal(t.enemy.hp,82);
 assert.equal(t.requestAttack('punch'),false);t.actor.stateTime=10/30;assert.equal(t.actor.attackBox,null);
 t.actor.y=-1;t.actor.vy=100;t.update(.07);assert.equal(t.actor.state,'land');
 const a=new Character(),b=new Character();a.appearance='green';a.requestJump();b.requestJump();a.update(.05,{right:true});b.update(.05,{right:true});a.requestAttack('kick');
 a.update(.1,{right:true});b.update(.1,{right:true});assert.equal(a.y,b.y);assert.equal(a.x,b.x);
 a.y=-200;a.vy=0;a.update(.41);assert.equal(a.state,'jump');assert.equal(a.pose().animation,'green_jump');assert.equal(a.requestAttack('kick'),false);
}
console.log('PASS: green aerial kick startup/active/recovery, mirrored single hit, physics and landing');

for(const appearance of ['green','mascot']){
 const c=new Character();c.appearance=appearance;assert.equal(c.renderScale,appearance==='green'?1.15:1);
 c.receiveHit();c.update(.56);assert.equal(c.state,'hurt');assert.equal(c.requestAttack('punch'),false);
 c.update(.01);assert.equal(c.state,'idle');assert.equal(c.requestAttack('punch'),true);
}
console.log('PASS: green 1.15 scale and both characters recover from hitstun at 0.567 seconds');

setup(130);t.actor.appearance='mascot';t.requestAttack('punch');t.actor.stateTime=.34;t.update(0);
assert.equal(t.hitStop,.045);const frozenTime=t.actor.stateTime,clock=t.remainingTime;t.update(.02);
assert.equal(t.actor.stateTime,frozenTime);assert.equal(t.remainingTime,clock);assert(t.hitStop>0);
t.update(.03);assert(t.actor.stateTime>frozenTime);assert.equal(t.enemy.hp,85);
t.showCharacterSelect();assert.equal(t.hitStop,0);assert(t.selecting);t.update(20);assert.equal(t.countdown,3);
console.log('PASS: impact stop freezes both simulation and clock, resumes without repeat damage, resets on selection');

for(const facing of [1,-1]){
 const fish=new Character();fish.appearance='fish';fish.facing=facing;fish.receiveHit();
 assert.equal(fish.pose().animation,'fish_hurt');assert.equal(fish.pose().frame,0);assert.equal(fish.requestAttack('punch'),false);
 fish.update(.55,{right:true});assert.equal(fish.pose().frame,16);assert.equal(fish.vx,0);assert.equal(fish.facing,facing);
 fish.receiveHit();assert.equal(fish.pose().frame,0);fish.update(.57);assert.equal(fish.state,'idle');assert.equal(fish.pose().animation,'fish_swim');
 fish.knockDown();assert.equal(fish.state,'down');assert.notEqual(fish.pose().animation,'fish_hurt');
}
console.log('PASS: fish hurt animation, action lock, restart, recovery, both facings and KO separation');

for(const facing of [1,-1]){
 setup(130,facing);t.actor.appearance='fish';t.requestAttack('punch');assert.equal(t.actor.pose().animation,'fish_bite');assert.equal(t.actor.pose().label,'噛みつき');assert.equal(t.actor.attackBox,null);
 advance(.22);assert.equal(t.enemy.hp,100);advance(.03);assert.equal(t.enemy.hp,85);advance(.2);assert.equal(t.enemy.hp,85);assert.equal(t.actor.attackBox,null);advance(.2);assert.equal(t.actor.state,'idle');
 // Check every active frame at fixed positions so AI approach cannot change the tested distance.
 for(const distance of [250,-130]){
  setup(distance,facing);t.actor.appearance='fish';t.requestAttack('punch');
  for(const frame of [7,8,9,10]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}
 }
}
console.log('PASS: fish bite startup/closing contact/recovery, both facings, single hit and out-of-range miss');

for(const facing of [1,-1]){
 const fish=new Character(),opponent=new Character();fish.appearance='fish';fish.facing=facing;
 fish.update(0,{guard:true});assert.equal(fish.pose().animation,'fish_guard');assert.equal(fish.pose().frame,0);
 fish.update(.3,{guard:true});assert.equal(fish.pose().frame,8);fish.update(2,{guard:true});assert.equal(fish.pose().frame,8);
 assert.equal(fish.requestAttack('punch'),false);assert.equal(fish.requestJump(),false);
 opponent.x=fish.x+130*facing;assert(fish.blocks(opponent));opponent.x=fish.x-130*facing;assert.equal(fish.blocks(opponent),false);
 fish.receiveBlock(15);fish.update(.1,{});assert.equal(fish.state,'guard');fish.update(.1,{});assert.equal(fish.pose().animation,'fish_swim');
 fish.update(0,{guard:true});assert.equal(fish.pose().frame,0);fish.guardMeter=1;fish.receiveBlock(15);assert.equal(fish.pose().animation,'fish_hurt');
}
console.log('PASS: fish guard transition/hold/release/restart, facing, action lock and guard break');

for(const facing of [1,-1]){
 const fish=new Character(),reference=new Character();fish.appearance='fish';fish.facing=reference.facing=facing;
 fish.requestJump();reference.requestJump();let sawRise=false,sawFall=false;
 for(let i=0;i<160;i++){
  fish.update(1/120);reference.update(1/120);assert.equal(fish.y,reference.y);assert.equal(fish.vy,reference.vy);
  if(fish.state==='jump'){const p=fish.pose();assert.equal(p.animation,'fish_jump');if(fish.vy<0){assert(p.frame>=0&&p.frame<=3);sawRise=true;}else{assert(p.frame>=4&&p.frame<=7);sawFall=true;}}
  if(fish.state==='land'){assert.equal(fish.pose().animation,'fish_jump');assert(fish.pose().frame>=8&&fish.pose().frame<=11);}
 }
 assert(sawRise&&sawFall);assert.equal(fish.state,'idle');assert.equal(fish.pose().animation,'fish_swim');
 fish.requestJump();fish.update(.1);fish.requestAttack('punch');fish.update(.48);assert.equal(fish.pose().animation,'fish_jump');assert.equal(fish.grounded,false);
 fish.y=-1;fish.vy=100;fish.update(.02,{right:true});assert.equal(fish.pose().animation,'fish_swim');assert.equal(fish.state,'walk');
}
console.log('PASS: fish jump rise/fall/landing, unchanged physics, both facings, aerial recovery and moving landing');

for(const facing of [1,-1]){
 setup(130,facing);t.actor.appearance='fish';assert(t.requestAttack('kick'));assert.equal(t.actor.pose().animation,'fish_kick');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=3.1/30;t.update(0);assert.equal(t.enemy.hp,100);
 t.actor.stateTime=4.1/30;t.update(0);assert.equal(t.enemy.hp,78);t.update(0);assert.equal(t.enemy.hp,78);
 t.actor.stateTime=8.1/30;assert.equal(t.actor.attackBox,null);advance(.4);assert.equal(t.actor.state,'idle');
 for(const distance of [260,-130]){
  setup(distance,facing);t.actor.appearance='fish';t.requestAttack('kick');
  for(const frame of [4,5,6,7]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}
 }
}
console.log('PASS: fish tooth kick startup/contact/recovery, 22 damage, single hit, both facings and range');

for(const facing of [1,-1]){
 setup(65,facing);t.actor.appearance='fish';t.actor.grounded=false;t.actor.y=-80;t.actor.vy=0;t.actor.jumpImpulse=530;
 assert(t.requestAttack('punch'));assert.equal(t.actor.pose().animation,'fish_air_punch');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=7.1/30;t.update(0);assert.equal(t.enemy.hp,85);t.update(0);assert.equal(t.enemy.hp,85);assert.equal(t.requestAttack('punch'),false);
 t.actor.stateTime=9.1/30;assert.equal(t.actor.attackBox,null);
 t.actor.y=-1;t.actor.vy=100;t.update(.07);assert.equal(t.actor.state,'land');assert.equal(t.actor.pose().animation,'fish_jump');
 for(const distance of [260,-100]){
  setup(distance,facing);t.actor.appearance='fish';t.actor.grounded=false;t.actor.y=-80;t.requestAttack('punch');
  for(const frame of [5,6,7,8]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}
 }
 const fish=new Character(),reference=new Character();fish.appearance='fish';fish.requestJump();reference.requestJump();fish.update(.1,{right:true});reference.update(.1,{right:true});fish.requestAttack('punch');
 for(let i=0;i<30;i++){fish.update(.01,{right:true});reference.update(.01,{right:true});assert.equal(fish.y,reference.y);assert.equal(fish.x,reference.x);}
 fish.update(.18);assert.equal(fish.state,'jump');assert.equal(fish.pose().animation,'fish_jump');
}
console.log('PASS: fish downward aerial punch, mirrored single hit/range, physics, recovery and landing');

for(const facing of [1,-1]){
 setup(45,facing);t.actor.appearance='fish';t.actor.grounded=false;t.actor.y=-80;t.actor.vy=0;t.actor.jumpImpulse=530;
 assert(t.requestAttack('kick'));assert.equal(t.actor.pose().animation,'fish_air_kick');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=6.1/30;t.update(0);assert.equal(t.enemy.hp,78);t.update(0);assert.equal(t.enemy.hp,78);assert.equal(t.requestAttack('kick'),false);
 t.actor.stateTime=11.1/30;assert.equal(t.actor.attackBox,null);t.actor.y=-1;t.actor.vy=100;t.update(.07);assert.equal(t.actor.state,'land');
 for(const distance of [260,-100]){
  setup(distance,facing);t.actor.appearance='fish';t.actor.grounded=false;t.actor.y=-80;t.requestAttack('kick');
  for(const frame of [5,6,7,8,9,10]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}
 }
 const fish=new Character(),reference=new Character();fish.appearance='fish';fish.requestJump();reference.requestJump();fish.update(.1,{right:true});reference.update(.1,{right:true});fish.requestAttack('kick');
 for(let i=0;i<55;i++){fish.update(.01,{right:true});reference.update(.01,{right:true});assert.equal(fish.y,reference.y);assert.equal(fish.x,reference.x);}
 assert.equal(fish.state,'jump');assert.equal(fish.pose().animation,'fish_jump');
}
console.log('PASS: fish downward aerial kick, 22 damage, mirrored single hit/range, physics and landing');

for(const facing of [1,-1]){
 const fish=new Character();fish.appearance='fish';fish.facing=facing;fish.takeDamage(100);
 assert.equal(fish.state,'down');assert.equal(fish.pose().animation,'fish_down');assert.equal(fish.pose().frame,0);
 for(let frame=0;frame<37;frame++){fish.stateTime=(frame+.1)/12;assert.equal(fish.pose().frame,frame);}
 fish.update(5);assert.equal(fish.pose().frame,36);assert.equal(fish.requestJump(),false);assert.equal(fish.requestAttack('punch'),false);
 fish.reset();assert.equal(fish.hp,100);assert.equal(fish.pose().animation,'fish_swim');
 fish.requestJump();fish.update(.1);fish.knockDown();for(let i=0;i<180;i++)fish.update(1/120);assert(fish.grounded);assert.equal(fish.y,0);assert.equal(fish.pose().animation,'fish_down');
}
console.log('PASS: fish KO full animation/hold/action lock/reset and airborne KO landing, both facings');

for(const facing of [1,-1]){
 setup(65,facing);t.actor.appearance='headset';assert(t.requestAttack('kick'));assert.equal(t.actor.pose().animation,'headset_kick');assert.equal(t.actor.attackData.frames.length/t.actor.attackData.fps,.48);assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=3.1/25;t.update(0);assert.equal(t.enemy.hp,83);t.update(0);assert.equal(t.enemy.hp,83);
 t.actor.stateTime=7.1/25;assert.equal(t.actor.attackBox,null);advance(.3);assert.equal(t.actor.state,'idle');
 for(const distance of [190,-80]){setup(distance,facing);t.actor.appearance='headset';t.requestAttack('kick');for(const frame of [3,4,5,6]){t.actor.stateTime=(frame+.1)/25;t.update(0);assert.equal(t.enemy.hp,100);}}
}
console.log('PASS: headset replacement front kick 0.48-second timing/startup/single hit/recovery, both facings and range');

for(const facing of [1,-1]){
 setup(90,facing);t.actor.appearance='headset';assert.equal(t.actor.renderScale,1.1);assert(t.requestAttack('punch'));assert.equal(t.actor.pose().animation,'headset_punch');assert.equal(t.actor.pose().label,'パンチ');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=4.1/24;t.update(0);assert.equal(t.enemy.hp,85);t.update(0);assert.equal(t.enemy.hp,85);
 t.actor.stateTime=7.1/24;assert.equal(t.actor.attackBox,null);advance(.35);assert.equal(t.actor.state,'idle');
 for(const distance of [180,-80]){setup(distance,facing);t.actor.appearance='headset';t.requestAttack('punch');for(const frame of [4,5,6]){t.actor.stateTime=(frame+.1)/t.actor.attackData.fps;t.update(0);assert.equal(t.enemy.hp,100);}}
}
console.log('PASS: headset first straight punch startup/single hit/recovery, both facings and range');

for(const facing of [1,-1]){
 const c=new Character(),opponent=new Character();c.appearance='headset';c.facing=facing;c.update(0,{guard:true});assert.equal(c.pose().animation,'headset_guard');assert.equal(c.pose().frame,0);
 c.update(.3,{guard:true});assert.equal(c.pose().frame,7);c.update(2,{guard:true});assert.equal(c.pose().frame,7);assert.equal(c.requestAttack('punch'),false);assert.equal(c.requestJump(),false);
 opponent.x=c.x+100*facing;assert(c.blocks(opponent));opponent.x=c.x-100*facing;assert.equal(c.blocks(opponent),false);
 c.receiveBlock();c.update(.1,{});assert.equal(c.state,'guard');c.update(.1,{});assert.equal(c.pose().animation,'headset_idle');
 c.update(0,{guard:true});assert.equal(c.pose().frame,0);c.guardMeter=1;c.receiveBlock();assert.equal(c.state,'hurt');
}
console.log('PASS: headset guard transition/hold/release/restart, facing and guard break');

for(const facing of [1,-1]){
 const c=new Character();c.appearance='headset';c.facing=facing;c.receiveHit();assert.equal(c.pose().animation,'headset_hurt');assert.equal(c.pose().frame,0);
 c.update(.4,{right:true});assert.equal(c.pose().frame,11);assert.equal(c.vx,0);assert.equal(c.facing,facing);assert.equal(c.requestAttack('punch'),false);assert.equal(c.requestJump(),false);
 c.update(.16);assert.equal(c.state,'hurt');assert.equal(c.pose().frame,11);c.update(.01);assert.equal(c.pose().animation,'headset_idle');
 c.receiveHit();c.update(.2);c.receiveHit();assert.equal(c.pose().frame,0);c.takeDamage(100);assert.equal(c.state,'down');assert.notEqual(c.pose().animation,'headset_hurt');
}
console.log('PASS: headset hurt hold/recovery/restart/action lock, both facings and KO separation');

for(const facing of [1,-1]){
 const c=new Character(),reference=new Character();c.appearance='headset';c.facing=reference.facing=facing;c.requestJump();reference.requestJump();let rise=false,fall=false,land=false;
 for(let i=0;i<160;i++){
  c.update(1/120);reference.update(1/120);assert.equal(c.y,reference.y);assert.equal(c.vy,reference.vy);
  const p=c.pose();if(c.state==='jump'){assert.equal(p.animation,'headset_jump');if(c.vy<0){rise=true;assert(p.frame>=0&&p.frame<4);}else{fall=true;assert(p.frame>=4&&p.frame<8);}}
  if(c.state==='land'){land=true;assert.equal(p.animation,'headset_jump');assert(p.frame>=8&&p.frame<12);}
 }
 assert(rise&&fall&&land);assert.equal(c.pose().animation,'headset_idle');
 c.requestJump();c.update(.1);c.requestAttack('punch');c.update(.48);assert.equal(c.pose().animation,'headset_jump');
 c.y=-1;c.vy=100;c.update(.02,{right:true});assert.equal(c.pose().animation,'headset_walk');
}
console.log('PASS: headset jump rise/fall/landing, both facings, unchanged physics and aerial recovery');

for(const facing of [1,-1]){
 const c=new Character();c.appearance='headset';c.facing=facing;c.takeDamage(100);assert.equal(c.pose().animation,'headset_down');assert.equal(c.pose().frame,0);
 for(let frame=0;frame<73;frame++){c.stateTime=(frame+.1)/24;assert.equal(c.pose().frame,frame);}
 c.update(5);assert.equal(c.pose().frame,72);assert.equal(c.requestJump(),false);assert.equal(c.requestAttack('punch'),false);
 c.reset();assert.equal(c.pose().animation,'headset_idle');assert.equal(c.hp,100);
 c.requestJump();c.update(.1);c.knockDown();for(let i=0;i<180;i++)c.update(1/120);assert(c.grounded);assert.equal(c.y,0);assert.equal(c.pose().animation,'headset_down');
}
console.log('PASS: headset down playback/hold/action lock/reset and airborne KO landing, both facings');

for(const facing of [1,-1]){
 setup(65,facing);t.actor.appearance='headset';t.actor.grounded=false;t.actor.y=-80;t.actor.vy=0;t.actor.jumpImpulse=530;
 assert(t.requestAttack('punch'));assert.equal(t.actor.pose().animation,'headset_air_punch');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=8.1/30;t.update(0);assert.equal(t.enemy.hp,85);t.update(0);assert.equal(t.enemy.hp,85);assert.equal(t.requestAttack('punch'),false);
 t.actor.stateTime=10.1/30;assert.equal(t.actor.attackBox,null);t.actor.y=-1;t.actor.vy=100;t.update(.07);assert.equal(t.actor.state,'land');
 for(const distance of [190,-80]){setup(distance,facing);t.actor.appearance='headset';t.actor.grounded=false;t.actor.y=-80;t.requestAttack('punch');for(const frame of [7,8,9]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}}
 const c=new Character(),r=new Character();c.appearance='headset';c.requestJump();r.requestJump();c.update(.1,{right:true});r.update(.1,{right:true});c.requestAttack('punch');for(let i=0;i<48;i++){c.update(.01,{right:true});r.update(.01,{right:true});assert.equal(c.x,r.x);assert.equal(c.y,r.y);}assert.equal(c.pose().animation,'headset_jump');
}
console.log('PASS: headset downward aerial punch fist contact, both facings, single hit/range, physics and landing');

for(const facing of [1,-1]){
 setup(90,facing);t.actor.appearance='headset';t.actor.grounded=false;t.actor.y=-30;t.actor.vy=0;t.actor.jumpImpulse=530;
 assert(t.requestAttack('kick'));assert.equal(t.actor.pose().animation,'headset_air_kick');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=4.1/36;t.update(0);assert.equal(t.enemy.hp,78);t.update(0);assert.equal(t.enemy.hp,78);assert.equal(t.requestAttack('kick'),false);
 t.actor.stateTime=7.1/36;assert.equal(t.actor.attackBox,null);t.actor.y=-1;t.actor.vy=100;t.update(.07);assert.equal(t.actor.state,'land');
 for(const distance of [200,-90]){setup(distance,facing);t.actor.appearance='headset';t.actor.grounded=false;t.actor.y=-30;t.requestAttack('kick');for(const frame of [3,4,5,6]){t.actor.stateTime=(frame+.1)/t.actor.attackData.fps;t.update(0);assert.equal(t.enemy.hp,100);}}
 const c=new Character(),r=new Character();c.appearance='headset';c.requestJump();r.requestJump();c.update(.1,{right:true});r.update(.1,{right:true});c.requestAttack('kick');for(let i=0;i<35;i++){c.update(.01,{right:true});r.update(.01,{right:true});assert.equal(c.x,r.x);assert.equal(c.y,r.y);}assert.equal(c.pose().animation,'headset_jump');
}
console.log('PASS: headset forward aerial kick startup/single hit/range, both facings, physics and landing');

// An opponent inside the added 20 px strip is hit; immediately outside it is not.
for(const facing of [1,-1])for(const [move,frame,y] of [['punch',4,0],['kick',4,0],['air_punch',8,-80],['air_kick',4,-30]]){
 const probe=new Character();probe.appearance='headset';probe.state=move;probe.stateTime=(frame+.1)/probe.attackData.fps;
 const oldReach=(probe.attackData.hitboxes[frame][2]-160)*probe.renderScale;
 for(const [extra,hit] of [[15,true],[21,false]]){
  setup(oldReach+36+extra,facing);t.actor.appearance='headset';t.actor.grounded=!move.startsWith('air_');t.actor.y=y;t.actor.vy=0;
  t.requestAttack(move.endsWith('punch')?'punch':'kick');t.actor.stateTime=(frame+.1)/t.actor.attackData.fps;t.update(0);
  assert.equal(t.enemy.hp,hit?100-t.actor.attackData.damage:100,move+' reach '+extra+' facing '+facing);
 }
}
console.log('PASS: headset all four attacks hit within added 20px reach and miss beyond, both facings');

for(const facing of [1,-1]){
 const c=new Character();c.appearance='gray';c.facing=facing;c.update(0,{right:facing===1,left:facing===-1});assert.equal(c.pose().animation,'gray_walk');
 c.stateTime=.2;assert.equal(c.pose().frame,4);c.vx=-180*facing;assert.equal(c.pose().frame,12);c.stateTime=.8;assert.equal(c.pose().frame,0);
 c.enter('dash');c.vx=324*facing;c.stateTime=.1;assert.equal(c.pose().animation,'gray_run');assert.equal(c.pose().frame,2);c.vx=-324*facing;assert.equal(c.pose().frame,10);c.stateTime=.5;assert.equal(c.pose().frame,0);c.update(.01,{});assert.equal(c.state,'idle');
}
console.log('PASS: gray walk loop/reverse/dash/idle, both facings');

for(const facing of [1,-1]){
 setup(120,facing);t.actor.appearance='gray';assert(t.requestAttack('punch'));assert.equal(t.actor.pose().animation,'gray_punch');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=6.1/30;t.update(0);assert.equal(t.enemy.hp,85);t.update(0);assert.equal(t.enemy.hp,85);
 t.actor.stateTime=11.1/30;assert.equal(t.actor.attackBox,null);advance(.3);assert.equal(t.actor.state,'idle');
 for(const distance of [160,-120]){setup(distance,facing);t.actor.appearance='gray';t.requestAttack('punch');for(const frame of [6,7,8,9,10]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}}
}
console.log('PASS: gray punch startup/single hit/recovery, both facings and range');

for(const facing of [1,-1]){
 setup(120,facing);t.actor.appearance='gray';assert(t.requestAttack('kick'));assert.equal(t.actor.pose().animation,'gray_kick');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=5.1/30;t.update(0);assert.equal(t.enemy.hp,78);t.update(0);assert.equal(t.enemy.hp,78);
 t.actor.stateTime=10.1/30;assert.equal(t.actor.attackBox,null);advance(.3);assert.equal(t.actor.state,'idle');
 for(const distance of [155,-120]){setup(distance,facing);t.actor.appearance='gray';t.requestAttack('kick');for(const frame of [5,6,7,8,9]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}}
}
console.log('PASS: gray kick startup/single hit/recovery, both facings and range');

for(const facing of [1,-1]){
 const c=new Character(),r=new Character();c.appearance='gray';c.facing=r.facing=facing;c.requestJump();r.requestJump();let rise=false,fall=false,land=false;
 for(let i=0;i<160;i++){
  c.update(1/120);r.update(1/120);assert.equal(c.y,r.y);assert.equal(c.vy,r.vy);const p=c.pose();
  if(c.state==='jump'){assert.equal(p.animation,'gray_jump');if(c.vy<0){rise=true;assert(p.frame>=0&&p.frame<4);}else{fall=true;assert(p.frame>=4&&p.frame<8);}}
  if(c.state==='land'){land=true;assert.equal(p.animation,'gray_jump');assert(p.frame>=8&&p.frame<12);}
 }
 assert(rise&&fall&&land);assert.equal(c.state,'idle');c.requestJump();c.update(.1);c.requestAttack('punch');c.update(.48);assert.equal(c.pose().animation,'gray_jump');
 c.y=-1;c.vy=100;c.update(.02,{right:true});assert.equal(c.pose().animation,'gray_walk');
}
console.log('PASS: gray jump rise/fall/landing, unchanged physics, aerial recovery and moving landing');

for(const facing of [1,-1]){
 const c=new Character(),opponent=new Character();c.appearance='gray';c.facing=facing;c.update(0,{guard:true});assert.equal(c.pose().animation,'gray_guard');assert.equal(c.pose().frame,0);
 c.update(.3,{guard:true});assert.equal(c.pose().frame,7);c.update(2,{guard:true});assert.equal(c.pose().frame,7);assert.equal(c.requestAttack('punch'),false);assert.equal(c.requestJump(),false);
 opponent.x=c.x+100*facing;assert(c.blocks(opponent));opponent.x=c.x-100*facing;assert.equal(c.blocks(opponent),false);
 c.receiveBlock();c.update(.1,{});assert.equal(c.state,'guard');c.update(.1,{});assert.equal(c.state,'idle');
 c.update(0,{guard:true});assert.equal(c.pose().frame,0);c.guardMeter=1;c.receiveBlock();assert.equal(c.state,'hurt');
}
console.log('PASS: gray guard transition/hold/release/restart, facing and guard break');

for(const facing of [1,-1]){
 const c=new Character();c.appearance='gray';c.facing=facing;c.receiveHit();assert.equal(c.pose().animation,'gray_hurt');assert.equal(c.pose().frame,0);
 c.update(.4,{right:true});assert.equal(c.pose().frame,11);assert.equal(c.vx,0);assert.equal(c.facing,facing);assert.equal(c.requestAttack('punch'),false);assert.equal(c.requestJump(),false);
 c.update(.16);assert.equal(c.state,'hurt');assert.equal(c.pose().frame,11);c.update(.01);assert.equal(c.state,'idle');
 c.receiveHit();c.update(.2);c.receiveHit();assert.equal(c.pose().frame,0);c.takeDamage(100);assert.equal(c.state,'down');assert.notEqual(c.pose().animation,'gray_hurt');
}
console.log('PASS: gray hurt hold/recovery/restart/action lock, both facings and KO separation');

for(const facing of [1,-1]){
 const c=new Character();c.appearance='gray';c.facing=facing;c.takeDamage(100);assert.equal(c.pose().animation,'gray_down');assert.equal(c.pose().frame,0);
 for(let frame=0;frame<22;frame++){c.stateTime=(frame+.1)/20;assert.equal(c.pose().frame,frame);}
 c.update(5);assert.equal(c.pose().frame,21);assert.equal(c.requestJump(),false);assert.equal(c.requestAttack('punch'),false);
 c.reset();assert.equal(c.state,'idle');assert.equal(c.hp,100);c.requestJump();c.update(.1);c.knockDown();for(let i=0;i<180;i++)c.update(1/120);assert(c.grounded);assert.equal(c.y,0);assert.equal(c.pose().animation,'gray_down');
}
console.log('PASS: gray KO playback/hold/action lock/reset and airborne landing, both facings');

for(const facing of [1,-1]){
 setup(75,facing);t.actor.appearance='gray';t.actor.grounded=false;t.actor.y=-70;t.actor.vy=0;
 assert(t.requestAttack('punch'));assert.equal(t.actor.pose().animation,'gray_air_punch');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=4.1/30;t.update(0);assert.equal(t.enemy.hp,85);t.update(0);assert.equal(t.enemy.hp,85);
 t.actor.stateTime=8.1/30;assert.equal(t.actor.attackBox,null);
 for(const distance of [145,-75]){setup(distance,facing);t.actor.appearance='gray';t.actor.grounded=false;t.actor.y=-70;t.requestAttack('punch');for(const frame of [4,5,6,7]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}}
 const c=new Character(),r=new Character();c.appearance='gray';c.facing=facing;c.requestJump();r.requestJump();c.update(.1);r.update(.1);c.requestAttack('punch');
 for(let i=0;i<58;i++){c.update(1/120);r.update(1/120);assert.equal(c.y,r.y);assert.equal(c.vy,r.vy);}assert.equal(c.state,'jump');assert.equal(c.requestAttack('punch'),false);
 c.y=-1;c.vy=100;c.update(.02);assert.equal(c.state,'land');assert.equal(c.pose().animation,'gray_jump');
}
console.log('PASS: gray aerial punch mirrored single hit/range, startup/recovery, physics, one attack per jump and landing');

for(const facing of [1,-1]){
 setup(100,facing);t.actor.appearance='gray';t.actor.grounded=false;t.actor.y=-40;t.actor.vy=0;
 assert(t.requestAttack('kick'));assert.equal(t.actor.pose().animation,'gray_air_kick');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=5.1/30;t.update(0);assert.equal(t.enemy.hp,78);t.update(0);assert.equal(t.enemy.hp,78);
 t.actor.stateTime=10.1/30;assert.equal(t.actor.attackBox,null);
 for(const distance of [160,-100]){setup(distance,facing);t.actor.appearance='gray';t.actor.grounded=false;t.actor.y=-40;t.requestAttack('kick');for(const frame of [5,6,7,8,9]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}}
 const c=new Character(),r=new Character();c.appearance='gray';c.facing=facing;c.requestJump();r.requestJump();c.update(.1);r.update(.1);c.requestAttack('kick');
 for(let i=0;i<61;i++){c.update(1/120);r.update(1/120);assert.equal(c.y,r.y);assert.equal(c.vy,r.vy);}assert.equal(c.state,'jump');assert.equal(c.requestAttack('kick'),false);
 c.reset();c.requestJump();c.update(.1);c.requestAttack('kick');c.y=-1;c.vy=100;c.update(.02);assert.equal(c.state,'land');assert.equal(c.pose().animation,'gray_jump');assert.equal(c.attackBox,null);
}
console.log('PASS: gray aerial kick mirrored single hit/range, startup/recovery, physics, one air attack and landing cancellation');

for(const facing of [1,-1]){
 setup(140,facing);t.actor.appearance='blackcat';assert(t.requestAttack('punch'));assert.equal(t.actor.pose().animation,'blackcat_punch');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=5.1/30;t.update(0);assert.equal(t.enemy.hp,85);t.update(0);assert.equal(t.enemy.hp,85);
 t.actor.stateTime=11.1/30;assert.equal(t.actor.attackBox,null);
 for(const distance of [190,-140]){setup(distance,facing);t.actor.appearance='blackcat';t.requestAttack('punch');for(const frame of [5,6,7,8,9,10]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}}
 const c=new Character();c.appearance='blackcat';c.facing=facing;c.requestAttack('punch');c.update(.57);assert.equal(c.state,'idle');assert.equal(c.attackBox,null);
}
console.log('PASS: blackcat punch startup, mirrored single hit, range, recovery and idle return');

for(const facing of [1,-1]){
 setup(100,facing);t.actor.appearance='blackcat';assert(t.requestAttack('kick'));assert.equal(t.actor.pose().animation,'blackcat_kick');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=5.1/30;t.update(0);assert.equal(t.enemy.hp,78);t.update(0);assert.equal(t.enemy.hp,78);
 t.actor.stateTime=10.1/30;assert.equal(t.actor.attackBox,null);
 for(const distance of [150,-100]){setup(distance,facing);t.actor.appearance='blackcat';t.requestAttack('kick');for(const frame of [5,6,7,8,9]){t.actor.stateTime=(frame+.1)/30;t.update(0);assert.equal(t.enemy.hp,100);}}
 const c=new Character(),g=new Character();c.appearance='blackcat';g.appearance='gray';c.facing=facing;c.requestAttack('kick');g.requestAttack('kick');assert.equal(c.attackData.frames.length/c.attackData.fps,g.attackData.frames.length/g.attackData.fps);
 c.update(.56);assert.equal(c.state,'kick');assert.equal(c.requestAttack('punch'),false);c.update(.007);assert.equal(c.state,'idle');assert.equal(c.attackBox,null);assert(c.requestAttack('punch'));
}
console.log('PASS: blackcat kick mirrored single hit/range, startup/recovery, gray duration match and action unlock');

for(const facing of [1,-1]){
 const c=new Character(),a=new Character();c.appearance='blackcat';c.facing=facing;
 c.update(0,{guard:true});assert.equal(c.pose().animation,'blackcat_guard');assert.equal(c.pose().frame,0);
 c.update(.1,{guard:true});assert.equal(c.pose().frame,3);c.update(2,{guard:true,left:true,targetX:c.x-facing*100});assert.equal(c.pose().frame,6);assert.equal(c.facing,facing);assert.equal(c.y,0);assert(c.grounded);
 assert.equal(c.requestJump(),false);assert.equal(c.requestAttack('punch'),false);a.x=c.x+100*facing;assert(c.blocks(a));a.x=c.x-100*facing;assert.equal(c.blocks(a),false);
 c.receiveBlock(15);assert.equal(c.hp,100);assert.equal(c.guardMeter,76);c.update(.1,{});assert.equal(c.state,'guard');c.update(.1,{});assert.equal(c.state,'idle');
 c.update(0,{guard:true});assert.equal(c.pose().frame,0);c.guardMeter=1;assert.equal(c.receiveBlock(15),false);assert.equal(c.state,'hurt');
}
console.log('PASS: blackcat guard transition/hold/release/restart, front/rear, action lock, meter and break');

for(const facing of [1,-1]){
 const c=new Character(),r=new Character();c.appearance='blackcat';c.facing=facing;c.requestJump();r.requestJump();
 for(let i=0;i<150;i++){c.update(1/120);r.update(1/120);assert.equal(c.y,r.y);assert.equal(c.vy,r.vy);if(c.state==='jump'){assert.equal(c.pose().animation,'blackcat_jump');assert(c.pose().frame>=(c.vy<0?0:4));assert(c.pose().frame<=(c.vy<0?3:7));}}
 assert(c.grounded);c.reset();c.requestJump();c.update(.1);c.requestAttack('punch');c.update(.4);assert.equal(c.state,'jump');assert.equal(c.pose().animation,'blackcat_jump');
 c.y=-1;c.vy=100;c.update(.02);assert.equal(c.state,'land');assert.equal(c.pose().frame,8);c.update(.12);assert.equal(c.pose().frame,11);c.update(.04);assert.equal(c.state,'idle');
 c.requestJump();c.update(.1);c.y=-1;c.vy=100;c.update(.02,{right:true});assert.equal(c.state,'walk');assert.equal(c.pose().animation,'blackcat_walk');
}
console.log('PASS: blackcat jump rise/fall, both facings, unchanged physics, aerial recovery and stationary/moving landing');

for(const facing of [1,-1]){
 const c=new Character();c.appearance='blackcat';c.facing=facing;c.takeDamage(15);assert.equal(c.hp,85);assert.equal(c.pose().animation,'blackcat_hurt');assert.equal(c.pose().frame,0);
 assert.equal(c.requestJump(),false);assert.equal(c.requestAttack('punch'),false);const x=c.x;c.update(.4,{right:true,guard:true});assert.equal(c.x,x);assert.equal(c.pose().frame,11);assert.equal(c.state,'hurt');
 c.takeDamage(10);assert.equal(c.hp,75);assert.equal(c.pose().frame,0);c.update(.56);assert.equal(c.state,'hurt');assert.equal(c.pose().frame,11);c.update(.007);assert.equal(c.state,'idle');
 c.reset();c.requestJump();c.update(.1);c.takeDamage(15);assert.equal(c.pose().animation,'blackcat_hurt');for(let i=0;i<69;i++)c.update(1/120);assert.equal(c.state,'jump');assert.equal(c.pose().animation,'blackcat_jump');
 c.reset();c.takeDamage(100);assert.equal(c.state,'down');assert.notEqual(c.pose().animation,'blackcat_hurt');
}
console.log('PASS: blackcat hurt playback/hold, restart, action lock, recovery, both facings, aerial hit and KO separation');

for(const facing of [1,-1]){
 const c=new Character();c.appearance='blackcat';c.facing=facing;c.takeDamage(100);assert.equal(c.pose().animation,'blackcat_down');assert.equal(c.pose().frame,0);assert.equal(c.requestJump(),false);assert.equal(c.requestAttack('punch'),false);
 c.update(.5);assert.equal(c.pose().frame,12);c.update(.42);assert.equal(c.pose().frame,21);c.update(4);assert.equal(c.pose().frame,21);assert.equal(c.state,'down');assert.equal(c.hp,0);
 c.reset();assert.equal(c.state,'idle');assert.equal(c.hp,100);c.requestJump();c.update(.1);c.knockDown();for(let i=0;i<180;i++)c.update(1/120);assert(c.grounded);assert.equal(c.y,0);assert.equal(c.pose().animation,'blackcat_down');assert.equal(c.pose().frame,21);
}
console.log('PASS: blackcat KO shortened playback, final hold, action lock, reset and airborne landing, both facings');

for(const facing of [1,-1]){
 setup(90,facing);t.actor.appearance='blackcat';t.actor.grounded=false;t.actor.y=-70;t.actor.vy=0;
 assert(t.requestAttack('punch'));assert.equal(t.actor.pose().animation,'blackcat_air_punch');assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=4.1/36;t.update(0);assert.equal(t.enemy.hp,85);t.update(0);assert.equal(t.enemy.hp,85);t.actor.stateTime=8.1/36;assert.equal(t.actor.attackBox,null);
 for(const distance of [150,-90]){setup(distance,facing);t.actor.appearance='blackcat';t.actor.grounded=false;t.actor.y=-70;t.requestAttack('punch');for(const frame of [4,5,6,7]){t.actor.stateTime=(frame+.1)/36;t.update(0);assert.equal(t.enemy.hp,100);}}
 const c=new Character(),r=new Character();c.appearance='blackcat';c.facing=facing;c.requestJump();r.requestJump();c.update(.1);r.update(.1);c.requestAttack('punch');assert.equal(c.attackData.frames.length/c.attackData.fps,1/3);
 for(let i=0;i<41;i++){c.update(1/120);r.update(1/120);assert.equal(c.y,r.y);assert.equal(c.vy,r.vy);}assert.equal(c.state,'jump');assert.equal(c.requestAttack('punch'),false);
 c.reset();c.requestJump();c.update(.1);c.requestAttack('punch');c.y=-1;c.vy=100;c.update(.02);assert.equal(c.state,'land');assert.equal(c.pose().animation,'blackcat_jump');assert.equal(c.attackBox,null);
}
console.log('PASS: blackcat aerial punch fast duration, mirrored single hit/range, recovery, physics and landing cancellation');

for(const facing of [1,-1]){
 setup(80,facing);t.actor.appearance='blackcat';t.actor.grounded=false;t.actor.y=-70;t.actor.vy=0;
 assert(t.requestAttack('kick'));assert.equal(t.actor.pose().animation,'blackcat_air_kick');assert(t.actor.attackBox,'no startup delay');t.update(0);assert.equal(t.enemy.hp,78);t.update(0);assert.equal(t.enemy.hp,78);t.actor.stateTime=6.1/36;assert.equal(t.actor.attackBox,null);
 for(const distance of [140,-80]){setup(distance,facing);t.actor.appearance='blackcat';t.actor.grounded=false;t.actor.y=-70;t.requestAttack('kick');for(const frame of [0,1,2,3,4,5]){t.actor.stateTime=(frame+.1)/36;t.update(0);assert.equal(t.enemy.hp,100);}}
 const c=new Character(),r=new Character();c.appearance='blackcat';c.facing=facing;c.requestJump();r.requestJump();c.update(.1);r.update(.1);c.requestAttack('kick');
 for(let i=0;i<41;i++){c.update(1/120);r.update(1/120);assert.equal(c.y,r.y);assert.equal(c.vy,r.vy);}assert.equal(c.state,'jump');assert.equal(c.requestAttack('kick'),false);
 c.reset();c.requestJump();c.update(.1);c.requestAttack('kick');c.y=-1;c.vy=100;c.update(.02);assert.equal(c.state,'land');assert.equal(c.pose().animation,'blackcat_jump');assert.equal(c.attackBox,null);
}
console.log('PASS: blackcat aerial kick immediate mirrored hit, single damage/range, recovery, physics and landing cancellation');

// The palette variant must remain mechanically identical in every state.
for(const facing of [1,-1])for(const state of Object.values(t.CharacterState)){
 const alpha=new Character(),nu=new Character();
 alpha.appearance='green';nu.appearance='white';
 for(const c of [alpha,nu]){c.facing=facing;c.x=500;c.enter(state);if(state==='jump'||state.startsWith('air_')){c.grounded=false;c.y=-80;c.vy=-200;c.jumpImpulse=530;}}
 for(let frame=0;frame<480;frame++){
  assert.equal(nu.renderScale,alpha.renderScale);assert.equal(nu.renderOffsetY,alpha.renderOffsetY);
  assert.equal(nu.attackData,alpha.attackData,'shared combat definition');
  assert.deepEqual(nu.attackBox,alpha.attackBox);assert.deepEqual(nu.hurtBox,alpha.hurtBox);
  const a=alpha.pose(),n=nu.pose();assert.equal(n.frame,a.frame);assert.equal(n.label,a.label);
  assert.equal(n.animation,a.animation.replace(/^green_/,'white_'));
  for(const field of ['x','y','vx','vy','state','hp','guardMeter','grounded','airAttackUsed','controllable'])assert.equal(nu[field],alpha[field],state+' '+field);
  const input={left:state==='walk',right:state==='dash',dash:state==='dash',guard:state==='guard',targetX:facing>0?900:100};
  alpha.update(1/120,input);nu.update(1/120,input);
 }
}
for(const facing of [1,-1])for(const [state,distance,y,frame,damage] of [
 ['punch',90,0,4,15],['kick',90,0,5,13],
 ['air_punch',75,-30,8,15],['air_kick',90,-60,4,18]
]){
 setup(distance,facing);t.actor.appearance='white';t.enemy.appearance='mascot';
 if(state.startsWith('air_')){t.actor.grounded=false;t.actor.y=y;t.actor.vy=0;t.actor.jumpImpulse=530;}
 assert(t.requestAttack(state.replace('air_','')));assert.equal(t.actor.pose().animation,'white_'+state);assert.equal(t.actor.attackBox,null);
 t.actor.stateTime=(frame+.1)/t.actor.attackData.fps;t.update(0);assert.equal(t.enemy.hp,100-damage);
 t.update(0);assert.equal(t.enemy.hp,100-damage,'no repeat hit');
}
console.log('PASS: nu shares alpha physics, timing, boxes, guard, damage and recovery; white sheets and mirrored single-hit attacks');

// Balance tuning: exact action lock duration and unchanged aerial kick damage.
for(const [appearance,duration,damage,airDamage] of [
 ['headset',.48,17,22],['green',.425,13,18],['white',.425,13,18]
]){
 const c=new Character();c.appearance=appearance;c.requestAttack('kick');
 assert.equal(c.attackData.damage,damage);assert.equal(c.attackData.frames.length/c.attackData.fps,duration);
 c.update(duration-.001);assert.equal(c.state,'kick');assert.equal(c.requestAttack('punch'),false);
 c.update(.002);assert.equal(c.state,'idle');assert(c.requestAttack('punch'));
 c.reset();c.grounded=false;c.y=-100;c.requestAttack('kick');assert.equal(c.attackData.damage,airDamage);
}
console.log('PASS: ground kick balance nu/alpha 13 at 0.425s, Anelia 17 at 0.48s, action unlock boundary and unchanged aerial damage');
