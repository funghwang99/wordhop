'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'dist',p),'utf8'));
const context={window:{addEventListener(){}},document:{addEventListener(){}},localStorage:{getItem(){return null;},setItem(){}},setTimeout,clearTimeout};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'dist/reading.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'dist/writing.js'),'utf8'),context);
const validateReading=context.window.WordHopReading.validate,validateWriting=context.window.WordHopWriting.validate;
const manifest=read('trainer/exam-pages.json');
assert.equal(manifest.tests.length,6);
const script=fs.readFileSync(path.join(root,'dist/trainer.js'),'utf8');
new Function(script);
assert.match(script,/WordHopReading\.render\(/);
assert.match(script,/WordHopWriting\.render\(/);
assert.match(script,/listening-view/);
assert.match(script,/reading-page/);
assert.match(script,/trainer-test-/);
assert.match(script,/const SKILLS=\{reading:6,listening:4,writing:2\}/);
assert.doesNotMatch(script,/Reading · Listening · Writing · Speaking/);
assert.match(script,/r\.skill==='speaking'/);
assert.match(script,/location\.replace\(path\(t\.id,'exam','reading','part-1'\)\)/);
assert.match(script,/Exam Practice/);
assert.ok(!script.includes("path(t.id,'training'"));
let graded=0,writing=0,originals=0;
for(const test of manifest.tests){
 const id='trainer-test-'+test.test;
 const reading=read('readings/'+id+'.json');
 const writingData=read('writings/'+id+'.json');
 validateReading(reading,id);
 validateWriting(writingData,id);
 assert.equal(reading.id,id);
 assert.equal(writingData.id,id);
 assert.equal(reading.parts.length,6);
 assert.equal(writingData.parts.length,2);
 for(let i=0;i<6;i++){
  const part=reading.parts[i],source=test.skills.reading[i];
  assert.equal(part.id,source.id);
  assert.deepEqual(part.pages.map(x=>x.image),source.pages.map(x=>x.image));
  const ready=test.test<=2&&i<3;
  assert.equal(part.pending,!ready);
  assert.equal(part.questions.length,ready?5:0);
  if(ready){
   const old=read('trainer/test-'+test.test+'-reading-part-'+(i+1)+'.json');
   assert.equal(part.questions.map(q=>q.answer).join(''),old.questions.map(q=>q.answer).join(''));
   assert.deepEqual(part.questions.map(q=>q.number),old.questions.map(q=>Number(q.id.slice(1))));
   assert.ok(part.questions.every(q=>q.explanationVi&&q.explanation));
   graded+=part.questions.length;
  }
  originals+=part.pages.length;
 }
 for(let i=0;i<2;i++){
  assert.deepEqual(writingData.parts[i].pages.map(x=>x.image),test.skills.writing[i].pages.map(x=>x.image));
  writing++;
 }
}
assert.equal(graded,30);
assert.equal(originals,60);
assert.equal(writing,12);
const readingScript=fs.readFileSync(path.join(root,'dist/reading.js'),'utf8');
assert.match(readingScript,/trainer-pending-key/);
assert.match(readingScript,/wordhop\.trainer\.v1\./);
console.log('PASS: Trainer shares PET Reading and Writing engines; 6 complete image-linked tests, 30 checked Reading answers, 12 writing tasks, pending keys labelled without fake scoring.');
