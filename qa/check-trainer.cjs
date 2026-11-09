'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const script=fs.readFileSync(path.join(dist,'trainer.js'),'utf8');
new Function(script);
assert.match(script,/id:1,training:true/);
assert.match(script,/id:2,training:true/);
assert.match(script,/id:6,training:false/);
assert.match(script,/clear-test/);
for(const [name,expected] of [['test-1-reading-part-1.json','ACCBA'],['test-2-reading-part-1.json','CABCA']]){
 const data=JSON.parse(fs.readFileSync(path.join(dist,'trainer',name),'utf8'));
 assert.equal(data.questions.length,5, name+' must have 5 questions');
 assert.equal(data.questions.map(q=>q.answer).join(''),expected,name+' must match book key');
 assert.equal(new Set(data.questions.map(q=>q.id)).size,5);
 for(const q of data.questions){
  assert.ok(q.source&&q.explanationVi&&q.answer);
  assert.deepEqual(Object.keys(q.options),['A','B','C']);
  assert.ok(q.options[q.answer]);
 }
}


for(const [name,expected,letters] of [
 ['test-1-reading-part-2.json','BHDFA','ABCDEFGH'],
 ['test-2-reading-part-2.json','CHEBF','ABCDEFGH'],
 ['test-1-reading-part-3.json','DACBD','ABCD'],
 ['test-2-reading-part-3.json','CABDA','ABCD']
]){
 const data=JSON.parse(fs.readFileSync(path.join(dist,'trainer',name),'utf8'));
 assert.equal(data.questions.length,5,name+' must have five original questions');
 assert.equal(data.questions.map(q=>q.answer).join(''),expected,name+' must match publisher key');
 assert.deepEqual(data.questions.map(q=>q.id),['q'+(letters.length===8?6:11),'q'+(letters.length===8?7:12),'q'+(letters.length===8?8:13),'q'+(letters.length===8?9:14),'q'+(letters.length===8?10:15)]);
 assert.ok(data.keySource&&data.bookPages&&data.title);
 if(letters.length===8){
  assert.equal(data.context.length,8);
  assert.deepEqual(data.context.map(x=>x.letter).join(''),'ABCDEFGH');
  for(const item of data.context)assert.ok(item.title&&item.description.length>40);
 } else assert.ok(data.passage.length>500&&data.passageTitle);
 for(const q of data.questions){
  assert.deepEqual(Object.keys(q.options),[...letters]);
  assert.ok(q.options[q.answer]);
  assert.ok(q.explanationVi.length>40);
 }
 assert.ok(script.includes(name),'Part must be linked from Trainer navigation');
}
assert.match(script,/trainer-passage/);
assert.match(script,/trainer-article/);
console.log('Trainer Reading Parts 1–3 for Tests 1–2: 30 questions with verified publisher keys.');

const audioIndex=JSON.parse(fs.readFileSync(path.join(root,'dist/trainer/audio-manifest.json'),'utf8'));
const seen=new Set();
assert.equal(audioIndex.tracks.length,39);
for(const track of audioIndex.tracks){
 assert.ok(track.test===1||track.test===2);
 assert.ok(Number.isInteger(track.track)&&track.track>=1&&track.track<=39);
 assert.match(track.file,/^test-[12]-track-\d{2}\.mp3$/);
 assert.ok(!seen.has(track.track),'Duplicate track '+track.track);
 seen.add(track.track);
}
for(let num=1;num<=39;num++)assert.ok(seen.has(num),'Missing track '+num);
const exam=audioIndex.tracks.filter(x=>x.mode==='exam'&&x.skill==='listening');
assert.equal(exam.length,8);
assert.deepEqual(exam.map(x=>x.track),[3,6,9,12,28,32,35,36]);
assert.match(script,/trainer-audio-slots/);
assert.match(script,/method:"HEAD"/);
console.log('Trainer original-audio metadata: 39 tracks and 8 exam Listening parts mapped.');

console.log('Trainer six scored Reading Parts for Tests 1–2: verified.');
