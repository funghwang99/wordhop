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
 console.log('PASS: unit request deduplication, cached reuse, failed-request retry and invalid-data rejection.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
