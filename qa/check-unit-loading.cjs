// Exercise loading failures, deduplication and data validation without a browser.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/app.js'),'utf8');
const functions=source.slice(source.indexOf('function unitSize('),source.indexOf('function bookPath('));
async function run(){
 let requests=0,release;
 const context={Map,Promise,Error,unitLoads:new Map(),fetch:()=>{requests++;return new Promise(resolve=>release=resolve);}};
 vm.createContext(context);vm.runInContext(functions,context);
 const unit={id:'unit',wordCount:1,wordIds:['word'],dataFile:'/unit.json'};
 const a=context.loadUnitWords(unit),b=context.loadUnitWords(unit);
 assert.equal(a,b);assert.equal(requests,1);
 release({ok:true,json:async()=>({id:'unit',words:[{id:'word'}]})});await a;
 assert.equal(unit.words[0].id,'word');await context.loadUnitWords(unit);assert.equal(requests,1);
 let failures=0;
 context.fetch=async()=>{failures++;return failures===1?{ok:false}:{ok:true,json:async()=>({id:'retry',words:[{id:'retry-word'}]})};};
 const retry={id:'retry',wordCount:1,wordIds:['retry-word'],dataFile:'/retry.json'};
 await assert.rejects(context.loadUnitWords(retry));assert.equal(context.unitLoads.has('retry'),false);
 await context.loadUnitWords(retry);assert.equal(failures,2);
 context.fetch=async()=>({ok:true,json:async()=>({id:'wrong-unit',words:[{id:'wrong-word'}]})});
 await assert.rejects(context.loadUnitWords({id:'expected',wordCount:1,wordIds:['expected-word'],dataFile:'/expected.json'}));
 // Preserve the reviewed source archive but expose only B1+ word IDs to every practice mode.
 context.fetch=async()=>({ok:true,json:async()=>({id:'pet-curated',words:[
  {id:'a2-basic',term:'borrow'}, {id:'b1-first',term:'persuade'},
  {id:'a2-basic2',term:'helmet'}, {id:'b2-last',term:'spectacular'}
 ]})});
 const pet={id:'pet-curated',bookId:'trainer',wordCount:2,wordIds:['b1-first','b2-last'],dataFile:'/pet-archive.json'};
 await context.loadUnitWords(pet);
 assert.deepEqual(JSON.stringify(pet.words.map(w=>w.term)),JSON.stringify(['persuade','spectacular']));
 assert.equal(pet.words.length,pet.wordCount);
 const wrongOrder={id:'pet-wrong',bookId:'authentic-1',wordCount:2,wordIds:['b1-last','b1-first'],dataFile:'/invalid.json'};
 context.fetch=async()=>({ok:true,json:async()=>({id:'pet-wrong',words:[{id:'b1-first'},{id:'b1-last'}]})});
 await assert.rejects(context.loadUnitWords(wrongOrder),/Unit data mismatch/);
 console.log('PASS: PET Flashcards/Practice load only curated B1+ vocabulary; A1/A2 source items do not leak.');
 console.log('PASS: unit request deduplication, cached reuse, failed-request retry and invalid-data rejection.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
