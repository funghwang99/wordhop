const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');

const dist = path.join(__dirname,'../dist');
const catalog = JSON.parse(readFileSync(path.join(dist,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit = catalog.units.find(item => item.id === 'simply-pet-test-1');
const data = JSON.parse(readFileSync(path.join(dist,unit.writingFile),'utf8'));
const storageKey = 'wordhop.writing.v1', part = 'part-1', question = 'question-1';
const value = 'Hi Sam,\n\nThanks for your email.';
const local = new Map([[storageKey,JSON.stringify({version:1,tests:{[unit.id]:{[part]:{selected:question,answers:{[question]:value}}}}})]]);
const main = {innerHTML:''}, draft = {value}, feedback = {textContent:'',classList:{toggle(){}}}, button = {};
const form = {id:'writing-submit-form',elements:{studentName:{value:'Demo Student'},classCode:{value:'abcdef0123'}},
  querySelector(selector){return selector === '#writing-submit-status' ? feedback : button;}};
const nodes = {'#main':main,'#writing-draft':draft,'#writing-submit-form':form,'#writing-save-state':{}};
const events = {}, requests = [];
const context = {
  window:{addEventListener(){}}, document:{addEventListener(name,fn){events[name]=fn;},querySelector(selector){return nodes[selector];}},
  localStorage:{getItem:key=>local.get(key),setItem(key,value){local.set(key,value);}},
  setTimeout, clearTimeout, AbortController, crypto:webcrypto,
  async fetch(url,options){
    if (url === unit.writingFile) return {ok:true,json:async()=>data};
    assert.match(url,/\/api\/writing-submissions$/);
    assert.equal(options.credentials,'omit');
    return new Promise((resolve,reject)=>requests.push({payload:JSON.parse(options.body),resolve,reject}));
  }
};
vm.createContext(context);
vm.runInContext(readFileSync(path.join(dist,'writing.js'),'utf8'),context);
const writer = context.window.WordHopWriting;
const current = {unit,partId:part,header:'',path:'#/pet/simply-pet/'+unit.id,isCurrent:()=>true};
const nextTick = () => new Promise(resolve=>setImmediate(resolve));
const send = () => events.submit({target:form,preventDefault(){}});
const saved = () => JSON.parse(local.get(storageKey)).tests[unit.id]?.[part];
const receipt = (request) => ({ok:true,json:async()=>({ok:true,id:request.payload.id,submittedAt:'2026-11-07T00:00:00.000Z'})});

(async () => {
  writer.render(current);
  await nextTick();
  assert.match(main.innerHTML,/Submit writing/);
  assert.match(main.innerHTML,/Thanks for your email/);
  form.elements.classCode.value = 'bad';
  send();
  assert.match(feedback.textContent,/class code/);
  assert.equal(requests.length,0);
  form.elements.classCode.value = 'abcdef0123';
  send(); send();
  assert.equal(requests.length,1);
  assert.equal(button.disabled,true);
  assert.equal(saved().answers[question],value);
  assert.equal(saved().submissions[question].submittedAt,undefined);
  assert.equal(requests[0].payload.code,'ABCDEF0123');
  assert.ok(!local.get(storageKey).includes('ABCDEF0123'));
  requests[0].reject(Error('Network disconnected'));
  await nextTick();
  assert.match(feedback.textContent,/Could not confirm/);
  assert.equal(button.disabled,false);
  send();
  assert.equal(requests[1].payload.id,requests[0].payload.id);
  requests[1].resolve(receipt(requests[1]));
  await nextTick();
  assert.match(feedback.textContent,/teacher has received/);
  assert.equal(button.disabled,true);
  assert.ok(saved().submissions[question].submittedAt);
  draft.value = value + ' Here is my updated answer.';
  send();
  assert.notEqual(requests[2].payload.id,requests[1].payload.id);
  assert.equal(writer.clearResults(unit.id),true);
  requests[2].resolve(receipt(requests[2]));
  await nextTick();
  assert.equal(saved(),undefined);
  console.log('PASS: existing draft, class code validation, double-click protection, network retry, verified receipt, revisions and clear-results race.');
})().catch(error=>{console.error(error);process.exitCode=1;});
