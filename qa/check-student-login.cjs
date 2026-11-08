const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../dist/student.js'),'utf8');
const profile = {id:'a'.repeat(32),name:'An <sample>',username:'an.01'};
const token = 'b'.repeat(64);
const data = (status,body) => ({status,json:async()=>body});
const tick = () => new Promise(resolve=>setImmediate(resolve));
const request = [], responses = [];
const context = {
  window:{addEventListener(){}},AbortSignal,fetch:async (url,options)=>{
    assert.match(url,/^https:\/\/wordhop\.funghwang99\.chatgpt\.site\/api\//);
    assert.equal(options.credentials,'include');
    request.push(JSON.parse(options.body));
    return responses.shift();
  }
};
vm.createContext(context);
vm.runInContext(source,context);
const auth = context.window.WordHopStudent;
const status = {}, button = {};
let submit, destination;
const form = {isConnected:true,elements:{username:{value:'an.01'},password:{value:'DEMO-1234'},remember:{checked:false}},
  querySelector:s=>s==='button'?button:status,addEventListener(event,fn){submit=fn;}};
const main = {innerHTML:'',querySelector:()=>form};
const render = () => auth.render(main,path=>{destination=path;});
const send = () => submit({preventDefault(){}});

(async()=>{
  responses.push(data(401,{ok:false}));
  render();
  auth.start(render);
  await tick();
  assert.match(main.innerHTML,/Student sign in/);
  assert.match(main.innerHTML,/type="password"/);
  assert.match(main.innerHTML,/type="checkbox" name="remember">/);
  assert.match(main.innerHTML,/Keep me signed in for 7 days/);
  responses.push(data(401,{ok:false,error:'Check your username and password and try again.'}));
  send();
  await tick();
  assert.equal(request.at(-1).remember,false);
  assert.match(status.textContent,/Check your username/);
  assert.equal(auth.current(),null);

  form.elements.remember.checked = true;
  auth.remember('#/pet/simply-pet/simply-pet-test-1/writing/part-1','#/student');
  responses.push(data(200,{ok:true,student:profile}),data(401,{ok:false}),data(200,{ok:true,student:profile,session:token}));
  send();
  await tick();
  assert.equal(request.at(-3).remember,true);
  assert.equal(request.at(-1).memoryOnly,true);
  assert.equal(form.elements.password.value,'');
  assert.equal(destination,'#/pet/simply-pet/simply-pet-test-1/writing/part-1');
  assert.match(main.innerHTML,/An &lt;sample&gt;/);
  assert.match(main.innerHTML,/signed in for this tab only/);
  assert.match(main.innerHTML,/Sign out/);
  assert.equal(auth.current().id,profile.id);
  responses.push(data(200,{ok:true}));
  await auth.request('writing-submissions',{studentId:profile.id});
  assert.equal(request.at(-1).session,token);
  responses.push(data(200,{ok:true}));
  send();
  await tick();
  assert.equal(auth.current(),null);
  responses.push(data(401,{ok:false}));
  await auth.request('student-session',{action:'verify'});
  assert.equal(request.at(-1).session,undefined);
  console.log('PASS: student sign-in screen, remember preference, error, blocked-cookie fallback, return to Writing and sign-out.');
})().catch(error=>{console.error(error);process.exitCode=1;});
