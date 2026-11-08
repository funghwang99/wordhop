'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const script=fs.readFileSync(path.join(dist,'trainer.js'),'utf8');
const app=fs.readFileSync(path.join(dist,'app.js'),'utf8');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
new Function(script);
new Function(app);
assert.match(html,/trainer\.js/);assert.match(html,/trainer\.css/);
assert.match(app,/WordHopTrainer\.render/);
assert.match(app,/parts\[i\]==='trainer'/);
assert.match(app,/B1 Preliminary for Schools Trainer/);
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
console.log('Trainer integration, Test 1 and Test 2 Reading Part 1: verified.');
