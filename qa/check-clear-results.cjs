const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist'),target='authentic-1-test-1',other='simply-pet-test-2';
const readingKey='wordhop.reading.v1',listeningKey='wordhop.listening.v1',gameKey='wordquest.courses.v2';
const attempts={version:1,tests:{[target]:{'part-1':{answers:{1:'B'},checked:true},'part-2':{answers:{8:'C'},checked:false}},[other]:{'part-1':{answers:{1:'A'},checked:true}}}};
const preferences={seen:{[target]:['seen-card'],[other]:['other-card']},history:[{unitId:target,correct:3},{unitId:other,correct:4}],count:20,sound:false,roundSizeVersion:1};
const seed=()=>({[readingKey]:JSON.stringify(attempts),[listeningKey]:JSON.stringify(attempts),[gameKey]:JSON.stringify(preferences)});
function harness(initial=seed()){
 const values=new Map(Object.entries(initial)),windowEvents={},documentEvents={},timers=new Map();let sequence=0,failKey=null;
 const audio={currentTime:0,readyState:4,paused:true,playbackRate:1,listeners:{},
  addEventListener(name,fn){(this.listeners[name]||=[]).push(fn);},removeEventListener(name,fn){this.listeners[name]=(this.listeners[name]||[]).filter(f=>f!==fn);},
  pause(){this.paused=true;for(const fn of this.listeners.pause||[])fn();},removeAttribute(name){if(name==='src')this.src='';},load(){this.readyState=0;},play(){this.paused=false;return Promise.resolve();}};
 const nodes=new Map();
 const context={window:{addEventListener(name,fn){(windowEvents[name]||=[]).push(fn);}},
  document:{addEventListener(name,fn){(documentEvents[name]||=[]).push(fn);},querySelector(selector){if(selector==='#listening-audio')return audio;if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',hidden:true,addEventListener(){}});return nodes.get(selector);}},
  localStorage:{getItem:key=>values.get(key)||null,setItem(key,value){if(key===failKey)throw Error('Storage unavailable');values.set(key,value);},clear(){throw Error('Do not erase other books or browser data');}},
  setTimeout(fn){const id=++sequence;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},fetch(){return new Promise(()=>{});}};
 vm.createContext(context);
 for(const module of ['reading.js','listening.js'])vm.runInContext(fs.readFileSync(path.join(root,module),'utf8'),context);
 return {context,values,audio,timers,windowEvents,documentEvents,fail(key){failKey=key;},read:key=>JSON.parse(values.get(key)),
  event(name){for(const fn of windowEvents[name]||[])fn();},input(kind,value){const control={value,dataset:{[kind==='reading'?'readingNumber':'listeningNumber']:'8'}};const event={target:{closest:selector=>selector===`[data-${kind}-number]`?control:null}};for(const fn of documentEvents.input||[])fn(event);}};
}
for(const kind of ['reading','listening']){
 const h=harness(),module=h.context.window[kind==='reading'?'WordHopReading':'WordHopListening'],key=kind==='reading'?readingKey:listeningKey;
 const context={unit:{id:target,title:'Test 1',listening:[{id:'part-1',title:'Part 1',src:'test.mp3',duration:100}]},header:'',partId:'part-1',path:'#/test',isCurrent:()=>true};
 module.render(context);context.part={id:'part-2'};
 h.input(kind,'pending answer');assert.ok(h.timers.size>0,'A pending answer must exercise autosave cancellation');
 if(kind==='listening')h.audio.play();
 assert.equal(module.clearResults(target),true);assert.equal(h.timers.size,0);
 assert.equal(h.read(key).tests[target],undefined);assert.deepEqual(h.read(key).tests[other],attempts.tests[other]);
 h.event('beforeunload');h.event('pagehide');
 assert.equal(h.read(key).tests[target],undefined,'An old in-memory attempt must not return on unload');
 if(kind==='listening')assert.equal(h.audio.paused,true,'Clearing a Listening attempt must release the player');
 assert.equal(module.clearResults('missing-unit'),true);assert.equal(h.read(key).tests[target],undefined);
 const blocked=harness(),blockedModule=blocked.context.window[kind==='reading'?'WordHopReading':'WordHopListening'];
 blocked.fail(key);assert.equal(blockedModule.clearResults(target),false);blocked.fail(null);blocked.event('beforeunload');
 assert.deepEqual(blocked.read(key),attempts,'Failed storage writes must preserve the original attempt');
}
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
function loadClear(h){
 Object.assign(h.context,{key:gameKey,location:{hash:'#/pet/authentic-1/'+target+'/reading/part-1'},unitTitle:unit=>unit.title,applyRoute(hash){h.routeAfterClear=hash;},toast(message){h.message=message;}});
 const clearFunction=app.slice(app.indexOf('function clearUnitResults('),app.indexOf('function confirmClearResults('));
 vm.runInContext('let state=JSON.parse(localStorage.getItem(key));let game={finished:false},result={correct:3},matchTimer=null;'+clearFunction,h.context);
}
const h=harness();loadClear(h);h.context.clearUnitResults({id:target,title:'Test 1'});
for(const key of [readingKey,listeningKey]){assert.equal(h.read(key).tests[target],undefined);assert.deepEqual(h.read(key).tests[other],attempts.tests[other]);}
const saved=h.read(gameKey);assert.deepEqual(saved,{...preferences,history:[preferences.history[1]]});
assert.equal(vm.runInContext('game===null&&result===null',h.context),true);assert.match(h.message,/Saved results cleared/);
assert.equal(h.routeAfterClear,h.context.location.hash);
const reloaded=harness(Object.fromEntries(h.values));reloaded.event('beforeunload');reloaded.event('pagehide');
assert.equal(reloaded.read(readingKey).tests[target],undefined);assert.equal(reloaded.read(listeningKey).tests[target],undefined);
const partial=harness();loadClear(partial);partial.fail(gameKey);partial.context.clearUnitResults({id:target,title:'Test 1'});
assert.deepEqual(partial.read(gameKey),preferences);assert.match(partial.message,/Some saved results could not be cleared/);
console.log('PASS: clearing one unit removes every saved attempt and game result, cancels pending autosave, stops audio and stays cleared after reload; other units, viewed cards and preferences survive.');
console.log('PASS: storage failures preserve uncleared results and report a partial failure.');
