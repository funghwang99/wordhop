const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dist = path.join(__dirname,'../dist');
const read = file => fs.readFileSync(path.join(dist,file),'utf8');
const profile = {id:'a'.repeat(32),name:'Sample Student',username:'sample.01'};
const writingPath = '#/pet/authentic-1/authentic-1-test-1/writing/part-2';
const readingPath = '#/pet/authentic-1/authentic-1-test-1/reading/part-1';
const tick = () => new Promise(resolve=>setImmediate(resolve));

function openApp(initialHash = '') {
  const requests = [], updates = [], listeners = new Map();
  const node = () => ({hidden:false,textContent:'',classList:{toggle(){}},setAttribute(){},addEventListener(){},focus(){},querySelector(){return node();}});
  const nav = node();
  nav.hidden = true;
  let html = '', form = null, hash = initialHash;
  const main = node();
  Object.defineProperty(main,'innerHTML',{
    get:()=>html,
    set(value) {
      if(form) form.isConnected = false;
      html = value;
      updates.push(value);
      form = null;
      if(!/<form class="student-sign(?:in|out)"/.test(value))return;
      const status = {}, button = {};
      form = {
        isConnected:true,elements:{username:{value:'sample.01'},password:{value:'TEST-PASS'},remember:{checked:false}},status,
        querySelector(selector){return selector==='button'?button:status;},
        addEventListener(event,fn){if(event==='submit')this.submit=fn;}
      };
    }
  });
  main.querySelector = () => form;
  const nodes = new Map([['#main',main],['#wordhop-navigation',nav]]);
  const location = {
    get hash(){return hash;},
    set hash(value){hash=value;listeners.get('hashchange')?.({});}
  };
  const context = {
    window:{
      addEventListener(event,fn){listeners.set(event,fn);},
      scrollTo(){},
      WordHopWriting:{stop(){},render({unit,partId}){main.innerHTML='Writing '+unit.id+' '+partId;}},
      WordHopListening:{stop(){}},
      WordHopTrainer:{stop(){},render({segments}){main.innerHTML='Trainer '+segments.join('/');}},
      WordHopReading:{stop(){},render(){main.innerHTML='Reading exercise';}},
    },
    document:{
      querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},
      addEventListener(){},
    },
    localStorage:{getItem(){return null;}},
    history:{replaceState(_,__,next){hash=next;},pushState(_,__,next){hash=next;}},
    location,AbortSignal,setTimeout,clearTimeout,
    fetch(url,options){
      return new Promise(resolve=>requests.push({url,payload:options?.body && JSON.parse(options.body),resolve}));
    }
  };
  vm.createContext(context);
  for(const script of ['data.js','student.js','app.js'])vm.runInContext(read(script),context,{filename:script});
  return {
    context,nav,updates,requests,location,
    get html(){return html;},
    get form(){return form;},
    submit(){form.submit({preventDefault(){}});},
    show(){listeners.get('pageshow')?.({persisted:true});},
    async respond(index,status,body){
      requests[index].resolve({status,ok:status>=200&&status<300,json:async()=>body});
      await tick();
    }
  };
}

const gated = app => {
  assert.match(app.html,/Student sign in/);
  assert.match(app.html,/type="password"/);
  assert.doesNotMatch(app.html,/Vocabulary practice|Reading exercise|Choose your course/);
  assert.equal(app.nav.hidden,true);
};

(async()=>{
  assert.match(read('index.html'),/id="wordhop-navigation"[^>]* hidden>/);
  for(const link of ['', '#/pet', '#/ielts', '#/results', writingPath, readingPath, '#/pet/trainer/trainer-test-1/reading/part-2']){
    const app = openApp(link);
    gated(app);
    assert.equal(app.requests.length,1);
    const form = app.form;
    await app.respond(0,401,{ok:false});
    gated(app);
    assert.equal(app.form,form,'A session check must not replace a sign-in form the student is using');
    assert.equal(app.location.hash,link);
  }

  const login = openApp(writingPath);
  gated(login);
  login.submit();
  assert.equal(login.requests[1].payload.action,'sign-in');
  await login.respond(1,200,{ok:true,student:profile});
  await login.respond(2,200,{ok:true,student:profile});
  assert.equal(login.location.hash,writingPath);
  assert.equal(login.html,'Writing authentic-1-test-1 part-2');
  assert.equal(login.nav.hidden,false);
  await login.respond(0,401,{ok:false});
  assert.equal(login.html,'Writing authentic-1-test-1 part-2','A stale verification cannot override a successful sign-in');

  login.location.hash = '#/student';
  assert.match(login.html,/Signed in as <strong>Sample Student/);
  login.submit();
  await login.respond(3,200,{ok:true});
  gated(login);
  login.location.hash = '#/results';
  gated(login);

  const trainer = openApp('#/pet/trainer/trainer-test-1/reading/part-2');
  gated(trainer);
  await trainer.respond(0,200,{ok:true,student:profile});
  assert.equal(trainer.html,'Trainer trainer-test-1/reading/part-2');
  assert.equal(trainer.nav.hidden,false);

  const returning = openApp(writingPath);
  gated(returning);
  await returning.respond(0,200,{ok:true,student:profile});
  assert.equal(returning.html,'Writing authentic-1-test-1 part-2');
  assert.equal(returning.nav.hidden,false);

  const explicit = openApp('#/student');
  gated(explicit);
  await explicit.respond(0,401,{ok:false});
  explicit.submit();
  await explicit.respond(1,200,{ok:true,student:profile});
  await explicit.respond(2,200,{ok:true,student:profile});
  assert.equal(explicit.location.hash,'#/');
  assert.match(explicit.html,/Vocabulary practice/);

  const pendingLesson = openApp(readingPath);
  await pendingLesson.respond(0,200,{ok:true,student:profile});
  assert.match(pendingLesson.html,/Loading vocabulary/);
  pendingLesson.show();
  await pendingLesson.respond(2,401,{ok:false});
  gated(pendingLesson);
  await pendingLesson.respond(1,503,{});
  gated(pendingLesson);
  console.log('PASS: immediate login on home, course, results, and deep links; session restoration, exact Writing return, logout, and delayed requests.');
})().catch(error=>{console.error(error);process.exitCode=1;});
