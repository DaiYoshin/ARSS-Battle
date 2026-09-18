const assert=require('node:assert/strict');
const {Character,EnemyController}=require('../character.js');
const self=new Character(),target=new Character(),ai=new EnemyController(()=>0,'normal');
self.x=500;target.x=630;target.requestAttack('punch');
assert.deepEqual(ai.update(.1,self,target),{});
const defense=ai.update(.13,self,target);assert.equal(defense.guard,true);self.update(.01,defense);assert.equal(self.state,'guard');
self.update(.4,ai.update(.4,self,target));assert.equal(self.state,'idle');
self.receiveHit();const x=self.x;self.update(.1,ai.update(.1,self,target));assert.equal(self.x,x);assert.equal(self.state,'hurt');
self.reset();target.reset();self.x=500;target.x=690;ai.reset();ai.jumpCooldown=0;
const leap=ai.update(.23,self,target);self.update(.01,leap);assert.equal(self.grounded,false);
self.x=600;self.y=-50;self.jumpTime=.2;self.vy=50;self.enter('jump');ai.update(.01,self,target);assert.equal(self.state,'air_punch');
self.reset();target.reset();self.x=500;target.x=610;ai.reset();ai.update(.23,self,target);assert(ai.retreatTime>0);
// Seeded long-running simulations check bounds and finite state across all levels.
for(const level of ['easy','normal','hard']){
 let seed=137;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const a=new Character(),b=new Character(),brain=new EnemyController(random,level);a.x=650;b.x=330;
 const seen=new Set();
 for(let i=0;i<7200;i++){
  if(i%120===0)b.requestAttack('punch');
  const input=brain.update(1/120,a,b);a.update(1/120,{...input,targetX:b.x});b.update(1/120,{});seen.add(a.state);
  assert(Number.isFinite(a.x)&&Number.isFinite(a.y));assert(a.x>=50&&a.x<=1050);assert(a.y<=0);
  if(i%480===0){b.x=a.x<550?a.x+200:a.x-200;}
 }
 assert(seen.has('punch')||seen.has('kick'));if(level!=='easy')assert(seen.has('jump'));
}
console.log('PASS: AI defense/release, hurt lock, jump attack, retreat, 60-second seeded simulations at all levels');
