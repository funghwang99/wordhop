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
const first = {id:'a'.repeat(32),name:'An <sample>',username:'an.01'};
const second = {id:'b'.repeat(32),name:'Binh',username:'binh.01'};
const value = 'Hi Sam,\n\nThanks for your email.';
const storage = draft => JSON.stringify({version:1,tests:{[unit.id]:{[part]:{selected:question,answers:{[question]:draft}}}}});
const local = new Map([[storageKey,storage('Previous guest draft')],[storageKey+'.'+first.id,storage(value)]]);
const main = {innerHTML:''}, draft = {value}, feedback = {textContent:'',classList:{toggle(){}}}, button = {};
const form = {id:'writing-submit-form',elements:{},querySelector(selector){return selector==='#writing-submit-status'?feedback:button;}};
const nodes = {'#main':main,'#writing-draft':draft,'#writing-submit-form':form,'#writing-save-state':{}};
const events = {}, requests = [];
let student = null;
const auth = {
  current:()=>student,
  expire(id){if(student?.id===id)student=null;},
  async request(route,payload){
    assert.equal(route,'writing-submissions');
    return new Promise((resolve,reject)=>requests.push({payload,resolve,reject}));
  }
};
const context = {
  window:{WordHopStudent:auth,addEventListener(){}},document:{addEventListener(name,fn){events[name]=fn;},querySelector(selector){return nodes[selector];}},
  localStorage:{getItem:key=>local.get(key),setItem(key,value){local.set(key,value);}},
  setTimeout,clearTimeout,crypto:webcrypto,
  async fetch(url){assert.equal(url,unit.writingFile);return {ok:true,json:async()=>data};}
};
vm.createContext(context);
vm.runInContext(readFileSync(path.join(dist,'writing.js'),'utf8'),context);
const writer = context.window.WordHopWriting;
const route = {unit,partId:part,header:'',path:'#/pet/simply-pet/'+unit.id,isCurrent:()=>true};
const tick = () => new Promise(resolve=>setImmediate(resolve));
const render = async identity => {student=identity;writer.render({...route});await tick();};
const send = () => events.submit({target:form,preventDefault(){}});
const saved = identity => JSON.parse(local.get(storageKey+(identity?'.'+identity.id:''))||'{"tests":{}}').tests[unit.id]?.[part];
const receipt = req => ({ok:true,status:200,json:async()=>({ok:true,id:req.payload.id,submittedAt:'2026-11-07T00:00:00.000Z'})});

(async()=>{
  await render(null);
  assert.match(main.innerHTML,/Sign in to submit/);
  assert.match(main.innerHTML,/Previous guest draft/);
  assert.doesNotMatch(main.innerHTML,/id="writing-submit-form"/);
  send();
  assert.equal(requests.length,0);
  await render(first);
  assert.match(main.innerHTML,/Submitting as <strong>An &lt;sample&gt;<\/strong>/);
  assert.match(main.innerHTML,/Thanks for your email/);
  assert.doesNotMatch(main.innerHTML,/Previous guest draft|Class code/);
  draft.value = '';
  send();
  assert.match(feedback.textContent,/Write an answer/);
  assert.equal(requests.length,0);
  draft.value = value;
  send(); send();
  assert.equal(requests.length,1);
  assert.equal(button.disabled,true);
  assert.equal(saved(first).answers[question],value);
  assert.equal(requests[0].payload.studentId,first.id);
  assert.equal(requests[0].payload.studentName,undefined);
  requests[0].reject(Error('Network disconnected'));
  await tick();
  assert.match(feedback.textContent,/Could not confirm/);
  assert.equal(button.disabled,false);
  send();
  assert.equal(requests[1].payload.id,requests[0].payload.id);
  requests[1].resolve(receipt(requests[1]));
  await tick();
  assert.match(feedback.textContent,/teacher has received/);
  assert.ok(saved(first).submissions[question].submittedAt);
  assert.equal(button.disabled,true);

  draft.value = 'An updated answer.';
  send();
  assert.notEqual(requests[2].payload.id,requests[1].payload.id);
  draft.value = '';
  await render(second);
  assert.match(main.innerHTML,/Submitting as <strong>Binh<\/strong>/);
  assert.doesNotMatch(main.innerHTML,/updated answer|Thanks for your email|Previous guest draft/);
  requests[2].resolve(receipt(requests[2]));
  await tick();
  assert.equal(saved(second),undefined);
  assert.equal(saved(first).answers[question],'An updated answer.');
  draft.value = 'A different student answer.';
  send();
  assert.equal(requests[3].payload.studentId,second.id);
  assert.equal(writer.clearResults(unit.id),true);
  requests[3].resolve(receipt(requests[3]));
  await tick();
  assert.equal(saved(second),undefined);
  assert.equal(saved(null).answers[question],'Previous guest draft');
  assert.equal(saved(first).answers[question],'An updated answer.');
  await render(first);
  draft.value = 'An answer after the session expired.';
  send();
  requests[4].resolve({ok:false,status:401,json:async()=>({ok:false})});
  await tick();
  assert.equal(student,null);
  assert.equal(saved(first).answers[question],'An answer after the session expired.');
  console.log('PASS: signed-out drafts, isolated student drafts, account-linked submission, network retries, receipts and expiry.');
})().catch(error=>{console.error(error);process.exitCode=1;});
