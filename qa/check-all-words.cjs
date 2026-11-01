const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist');
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const modes={match:{},quiz:{},cloze:{}};
const init=source.slice(source.indexOf('let state='),source.indexOf('let route='));
function boot(saved){const context={catalog,modes,key:'wordquest.courses.v2',localStorage:{getItem:()=>saved===null?null:JSON.stringify(saved)}};vm.createContext(context);const state=vm.runInContext(init+'\nstate;',context);return{context,state};}
assert.equal(boot(null).state.count,'all');
const history={unitId:catalog.units[0].id,mode:'quiz',correct:9,attempted:10,at:1,missed:['a-word']};
for(const count of [10,20,36,'all']){
 const saved={seen:{[catalog.units[0].id]:['a-word']},history:[history],sound:false,count};
 const {state}=boot(saved);
 assert.equal(state.count,'all');assert.equal(state.roundSizeVersion,1);assert.equal(state.sound,false);
 assert.equal(JSON.stringify(state.seen),JSON.stringify(saved.seen));assert.equal(JSON.stringify(state.history),JSON.stringify(saved.history));
}
for(const count of [10,20,'all'])assert.equal(boot({seen:{},history:[],count,roundSizeVersion:1}).state.count,count);
const {context}=boot(null);
Object.assign(context,{route:null,game:null,screen:'practice',matchTimer:null,warmAudio(){},clearTimeout(){},setUnitView(next){context.screen=next;},renderGame(){},renderMatch(){},focusMain(){},window:{scrollTo(){}},finishGame(){context.game.finished=true;}});
vm.runInContext(source.split('\n').find(line=>line.startsWith('const shuffle=')),context);
vm.runInContext(source.slice(source.indexOf('function startGame('),source.indexOf('function gameTop(')),context);
vm.runInContext(source.slice(source.indexOf('function prepareMatch('),source.indexOf('function renderMatch(')),context);
vm.runInContext(source.slice(source.indexOf('function nextMatch('),source.indexOf('function finishGame(')),context);
for(const meta of catalog.units){
 const words=JSON.parse(fs.readFileSync(path.join(root,meta.dataFile.replace(/^\//,'')),'utf8')).words;
 const expected=words.map(w=>w.id).sort();context.route={unit:{...meta,words}};
 for(const mode of ['match','quiz','cloze']){
  context.startGame(mode);assert.deepEqual(Array.from(context.game.items,w=>w.id).sort(),expected);
  if(mode==='match'){
   const covered=[];
   while(!context.game.finished){assert.ok(context.game.match.items.length>0&&context.game.match.items.length<=5);covered.push(...context.game.match.items.map(w=>w.id));context.game.match.matched=context.game.match.items.map(w=>w.id);context.nextMatch();}
   assert.deepEqual(covered.sort(),expected);
  }
 }
}
console.log(`PASS: all ${catalog.units.length} units include every word once in each game; all matching sets complete.`);
console.log('PASS: old short-round settings migrate to All words; progress, scores and sound preferences survive. New explicit short-round choices persist.');

require('./check-clear-results.cjs');
require('./check-unit-13.cjs');
require('./check-unit-14.cjs');
