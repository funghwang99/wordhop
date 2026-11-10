'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),read=file=>fs.readFileSync(path.join(dist,file),'utf8');
const script=read('trainer.js'),reader=read('reading.js');
const files=[...script.matchAll(/trainer\/test-[12]-reading\.[a-f0-9]{12}\.json/g)].map(m=>m[0]);
assert.equal(files.length,2);
const data=new Map(files.map(file=>[file,JSON.parse(read(file))]));
const studentA={id:'a'.repeat(32)},studentB={id:'b'.repeat(32)};
const key=student=>'wordhop.trainer.reading.v2.'+student.id,oldKey=student=>'wordhop.trainer.v1.'+student.id,defaultKey='wordhop.reading.v1';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(seed={},deferred=false){
  const values=new Map(Object.entries(seed)),events={},timers=new Map(),pending=[],main={innerHTML:''},messages=[],grades=[];
  let student=studentA,sequence=0,fail=false,confirm=true;
  const context={
    window:{addEventListener(){},WordHopStudent:{current:()=>student}},
    location:{hash:''},
    document:{
      addEventListener(name,callback){(events[name]||=[]).push(callback);},
      querySelector(selector){return selector==='#main'?main:{focus(){},scrollIntoView(){}};}
    },
    localStorage:{
      getItem:name=>values.get(name)??null,
      setItem(name,value){if(fail)throw Error('Storage unavailable');values.set(name,value);}
    },
    setTimeout(callback){const id=++sequence;timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);},
    fetch(file){
      assert.ok(data.has(file),'Unexpected request: '+file);
      const response={ok:true,json:async()=>structuredClone(data.get(file))};
      return deferred?new Promise(resolve=>pending.push(()=>resolve(response))):Promise.resolve(response);
    }
  };
  vm.createContext(context);
  vm.runInContext(reader,context,{filename:'reading.js'});
  vm.runInContext(script,context,{filename:'trainer.js'});
  const readerAPI=context.window.WordHopReading,trainerAPI=context.window.WordHopTrainer;
  const dispatch=(type,event)=>{for(const fn of events[type]||[])fn(event);};
  return {
    context,values,timers,pending,messages,grades,reader:readerAPI,
    get html(){return main.innerHTML;},
    get saved(){return JSON.parse(values.get(key(student))||'{"tests":{}}').tests;},
    read:name=>JSON.parse(values.get(name)),
    student(value){student=value;},fail(value){fail=value;},confirm(value){confirm=value;},
    async navigate(segments){
      readerAPI.stop();trainerAPI.stop();
      context.location.hash='#/pet/trainer/'+segments.join('/');
      trainerAPI.render({segments,container:main,confirmClear:(_,callback)=>{if(confirm)callback();},toast:message=>messages.push(message),onGrade:correct=>grades.push(correct)});
      await tick();
    },
    change(number,value){
      const control={value,dataset:{readingNumber:String(number)}};
      dispatch('change',{target:{closest:selector=>selector==='[data-reading-number]'?control:null}});
    },
    submit(answers){
      dispatch('submit',{preventDefault(){},target:{
        matches:selector=>selector==='[data-reading-form]',
        querySelectorAll:()=>Object.entries(answers).map(([number,value])=>({value,dataset:{readingNumber:number}}))
      }});
    },
    action(action,trainer=false){
      const selector=trainer?'[data-trainer-action="clear-results"]':'[data-reading-action]';
      const button={dataset:{readingAction:action}};
      dispatch('click',{target:{closest:candidate=>candidate===selector?button:null}});
    },
    flush(){for(const callback of [...timers.values()])callback();}
  };
}
(async()=>{
  const h=harness(),expectedKeys=[['ACCBA','BHDFA','DACBD'],['CABCA','CHEBF','CABDA']];
  let questionCount=0;
  for(const [index,file] of files.entries()){
    const book=data.get(file),test=index+1;
    assert.ok(file.includes(crypto.createHash('sha256').update(read(file)).digest('hex').slice(0,12)));
    h.reader.validate(book,'trainer-test-'+test);
    assert.equal(book.totalParts,6);assert.equal(book.parts.length,3);
    for(const [partIndex,part] of book.parts.entries()){
      const original=JSON.parse(read(`trainer/test-${test}-reading-part-${partIndex+1}.json`));
      assert.equal(part.questions.map(q=>q.answer).join(''),expectedKeys[index][partIndex]);
      assert.deepEqual(part.questions.map(q=>q.number),Array.from({length:5},(_,i)=>partIndex*5+i+1));
      assert.equal(part.text.bookPages,original.bookPages);assert.equal(part.text.keySource,original.keySource);
      assert.equal(part.text.passage||'',original.passage||'');assert.deepEqual(part.text.context,original.context||[]);
      for(const [qIndex,q] of part.questions.entries()){
        const source=original.questions[qIndex];
        assert.equal(q.sourceText,source.source);assert.equal(q.prompt,source.ask);
        assert.deepEqual(q.optionText,source.options);assert.equal(q.explanationVi,source.explanationVi);
        for(const option of q.options)assert.equal(h.reader.grade(q,option),option===q.answer);
        assert.equal(h.reader.grade(q,''),false);questionCount++;
      }
      await h.navigate(['trainer-test-'+test,'reading',part.id]);
      assert.match(h.html,/reading-answer-sheet/);assert.match(h.html,/remaining 3 parts/);
      assert.doesNotMatch(h.html,/<img|<audio|reading-page-actions/);
      if(partIndex===1)assert.match(h.html,/reading-context-grid/);
      if(partIndex===2)assert.match(h.html,/reading-article/);
      h.submit(Object.fromEntries(part.questions.map(q=>[q.number,q.answer])));
      assert.match(h.html,/5\/5 correct/);assert.equal(h.grades.at(-1),true);
      assert.equal((h.html.match(/lang="vi"/g)||[]).length,5);
    }
  }
  assert.equal(questionCount,30);
  // Wrong/blank submissions cannot pass. Results stay locked until this Part is retried.
  await h.navigate(['trainer-test-1','reading','part-1']);h.action('retry');
  h.submit({1:'B',2:'',3:'',4:'',5:''});
  assert.match(h.html,/0\/5 correct/);assert.equal(h.grades.at(-1),false);
  const locked=h.values.get(key(studentA));
  h.change(1,'A');h.submit({1:'A'});h.flush();
  assert.equal(h.values.get(key(studentA)),locked);
  const otherPart=structuredClone(h.saved['trainer-test-1']['part-2']);
  h.action('retry');
  assert.equal(h.saved['trainer-test-1']['part-1'].checked,false);
  assert.deepEqual(h.saved['trainer-test-1']['part-2'],otherPart);
  h.change(1,'A');assert.equal(h.timers.size,1);
  await h.navigate(['trainer-test-2','reading','part-1']);
  assert.equal(h.timers.size,0,'Navigation flushes pending autosave');
  assert.equal(h.saved['trainer-test-1']['part-1'].answers[1],'A');
  // Migrate legacy routes/answers once; isolate student and ordinary book storage.
  const legacy={'1:exam:reading:part-1':{answers:{q1:'A',q2:'C'},checked:true}};
  const ordinary={version:1,tests:{'simply-pet-test-1':{'part-1':{answers:{1:'C'},checked:true}}}};
  const migrated=harness({[oldKey(studentA)]:JSON.stringify(legacy),[defaultKey]:JSON.stringify(ordinary)});
  await migrated.navigate(['1','exam','reading','part-1']);
  assert.match(migrated.html,/2\/5 correct/);
  assert.deepEqual(migrated.read(defaultKey),ordinary);
  migrated.student(studentB);await migrated.navigate(['trainer-test-1','reading','part-1']);
  assert.doesNotMatch(migrated.html,/reading-score/);migrated.change(1,'B');
  migrated.student(studentA);await migrated.navigate(['trainer-test-1','reading','part-1']);
  assert.match(migrated.html,/2\/5 correct/);
  assert.equal(migrated.read(key(studentB)).tests['trainer-test-1']['part-1'].answers[1],'B');
  await migrated.navigate(['trainer-test-2','reading','part-1']);migrated.change(1,'C');
  await migrated.navigate(['trainer-test-1','reading','part-1']);
  const beforeClear=migrated.values.get(key(studentA));
  migrated.confirm(false);migrated.action('clear-results',true);
  assert.equal(migrated.values.get(key(studentA)),beforeClear);
  migrated.confirm(true);migrated.action('clear-results',true);await tick();
  assert.equal(migrated.saved['trainer-test-1'],undefined);
  assert.equal(migrated.saved['trainer-test-2']['part-1'].answers[1],'C');
  assert.deepEqual(migrated.read(defaultKey),ordinary);
  const reloaded=harness(Object.fromEntries(migrated.values));
  await reloaded.navigate(['1','exam','reading','part-1']);
  assert.doesNotMatch(reloaded.html,/reading-score/);
  assert.equal(reloaded.saved['trainer-test-1'],undefined,'Cleared results must not reappear from legacy storage');
  // Incomplete sections are pending, not empty tests that can be passed.
  for(const route of [[],['trainer-test-3'],['trainer-test-6'],['trainer-test-1','training'],['trainer-test-2','listening'],['trainer-test-1','reading','part-4']]){
    await h.navigate(route);
    assert.match(h.html,/preparation|being prepared/);assert.doesNotMatch(h.html,/reading-answer-sheet|<audio/);
  }
  const invalid=structuredClone(data.get(files[0]));
  delete invalid.parts[0].questions[0].optionText.A;
  assert.throws(()=>h.reader.validate(invalid,invalid.id),/question text/);
  invalid.parts[0].text.context=null;
  assert.throws(()=>h.reader.validate(invalid,invalid.id),/reading text/);
  // Delayed replies and signed-out events must not display or save an old lesson.
  const delayed=harness({},true);
  await delayed.navigate(['trainer-test-1']);assert.match(delayed.html,/Loading reading/);
  await delayed.navigate(['trainer-test-3']);const pendingPage=delayed.html;
  delayed.pending[0]();await tick();assert.equal(delayed.html,pendingPage);
  const signedOut=harness();await signedOut.navigate(['trainer-test-1']);
  const beforeSignOut=signedOut.values.get(key(studentA));
  signedOut.student(null);signedOut.change(1,'B');signedOut.submit({1:'B'});signedOut.flush();
  assert.equal(signedOut.values.get(key(studentA)),beforeSignOut);
  const blocked=harness();blocked.fail(true);await blocked.navigate(['trainer-test-1']);blocked.submit({1:'A'});
  assert.match(blocked.html,/1\/5 correct/);
  assert.ok(blocked.messages.some(message=>/could not save/.test(message)));
  const audio=JSON.parse(read('trainer/audio-manifest.json'));
  assert.equal(audio.tracks.length,39);
  assert.deepEqual(audio.tracks.map(track=>track.track).sort((a,b)=>a-b),Array.from({length:39},(_,i)=>i+1));
  assert.deepEqual(audio.tracks.filter(track=>track.mode==='exam'&&track.skill==='listening').map(track=>track.track),[3,6,9,12,28,32,35,36]);
  console.log('PASS: 30 Trainer questions preserve source text, options, keys and Vietnamese explanations.');
  console.log('PASS: grading, locked results, retry, autosave, per-student migration, scoped clearing, stale fetches and storage failure.');
  console.log('PASS: incomplete sections cannot be graded; 39 audio records are metadata only.');
})().catch(error=>{console.error(error);process.exitCode=1;});
