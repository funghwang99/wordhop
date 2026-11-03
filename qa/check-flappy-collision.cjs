'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../dist/flappy.js'),'utf8');
const sprite=fs.readFileSync(path.join(__dirname,'../dist/assets/flappy-bird-yellow-v3.png'));
assert.equal(sprite.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(sprite.readUInt32BE(16),76);
assert.equal(sprite.readUInt32BE(20),54);
assert.match(source,/this\.birdSprite\.src='assets\/flappy-bird-yellow-v3\.png'/);
assert.match(source,/c\.drawImage\(this\.birdSprite/);
const context={window:{},clearTimeout(){}};
vm.createContext(context);
vm.runInContext(source.replace('window.WordHopFlappy={','window.__FlappyVocabClass=FlappyVocab;window.WordHopFlappy={'),context);
const Game=context.window.__FlappyVocabClass;
const geometry=context.window.WordHopFlappy.geometry;
assert.ok(geometry.insideGap({x:192,y:240},{x:250,gapY:240,gap:190}));
assert.equal(geometry.insideGap({x:192,y:120},{x:250,gapY:240,gap:190}),false);
function fixture({x=253,y=240,asked=false,gapY=240,vy=0}={}){
 let collision=0,finish=null;
 const g=Object.create(Game.prototype);
 Object.assign(g,{
  state:'playing',tick:0,bird:{x:192,y,vy},pipes:[{x,word:{id:'test-word'},gapY,gap:190,asked,unlocked:asked,passed:false}],
  lives:3,score:0,correct:0,attempted:0,passed:0,next:1,words:[{id:'test-word'}],root:{querySelector:()=>({textContent:''})},
  opts:{onCollision:()=>collision++,onFinish:r=>{finish=r}},answerTimer:0,refreshHUD(){},hide(){},
 });
 g.update(.016);
 return{g,collision:()=>collision,finish:()=>finish};
}
{
 const {g,finish}=fixture({y:120,x:253});
 assert.equal(g.state,'playing');assert.equal(g.pipes[0].asked,false);assert.equal(finish(),null);
}
{
 const {g,collision,finish}=fixture({y:120,x:228});
 assert.equal(g.state,'finished');assert.equal(g.lives,0);assert.equal(g.pipes[0].asked,false);
 assert.equal(collision(),1);assert.equal(finish().crashReason,'You hit a pipe!');
 assert.equal(finish().attempted,0);
}
{
 const {g,finish}=fixture({y:240,x:253});
 assert.equal(g.state,'approach');assert.equal(g.pipes[0].asked,true);assert.equal(finish(),null);
}
{
 const {g,finish}=fixture({y:120,x:228,asked:true});
 assert.equal(g.state,'finished');assert.equal(finish().crashReason,'You hit a pipe!');
}
{
 const {g,finish}=fixture({y:420,vy:150,x:900});
 assert.equal(g.state,'finished');assert.equal(finish().crashReason,'You hit the ground!');
}
{
 const {g,finish}=fixture({y:20,vy:-150,x:900});
 assert.equal(g.state,'finished');assert.equal(finish().crashReason,'You hit the ceiling!');
}
console.log('PASS: Flappy Vocab collisions are fatal; only safe entry through the gap opens a vocabulary question.');
