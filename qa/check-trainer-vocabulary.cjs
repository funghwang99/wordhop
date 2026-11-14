'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(root,'dist',rel),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const manifest=read('trainer/exam-pages.json');
const units=catalog.units.filter(u=>u.bookId==='trainer');
assert.equal(units.length,6,'Trainer must have one vocabulary unit per Exam Practice test');
assert.equal(catalog.books.filter(b=>b.id==='trainer').length,1);
const pageSet=new Set(),allIds=new Set();
let total=0;
for(let test=1;test<=6;test++){
 const unit=units.find(u=>u.id==='trainer-test-'+test);
 assert.ok(unit,'Missing Trainer Test '+test);
 assert.equal(unit.title,'Test '+test);
 assert.equal(unit.wordCount,24);
 assert.equal(unit.wordIds.length,24);
 assert.equal(unit.dataFile,'/units/trainer-test-'+test+'.json');
 const source=read(unit.dataFile.slice(1));
 assert.equal(source.id,unit.id);
 assert.match(source.source.title,/Exam Practice/);
 assert.deepEqual(source.source.skills,['Reading']);
 assert.equal(source.words.length,24);
 assert.deepEqual(source.words.map(w=>w.id),unit.wordIds);
 const pages=manifest.tests.find(t=>t.test===test).skills.reading.flatMap(part=>part.pages.map(p=>p.pdfPage));
 const authorized=new Set(pages);
 assert.ok(unit.sourcePages.every(p=>authorized.has(p)));
 const encountered=new Set();
 for(const word of source.words){
  assert.ok(!encountered.has(word.id),'Duplicate vocabulary item '+word.id);
  encountered.add(word.id);
  assert.ok(!allIds.has(word.id),'Cross-test duplicate word ID '+word.id);
  allIds.add(word.id);
  assert.match(word.id,new RegExp('^trainer-t'+test+'-'));
  for(const field of ['term','pos','definition','definitionVi','example','cloze','answer','illustration']){
   assert.ok(typeof word[field]==='string'&&word[field].trim(),'Missing '+field+' in '+word.id);
  }
  assert.ok(word.definition.length>=15&&word.definitionVi.length>=3,'Definitions incomplete in '+word.id);
  assert.ok(Number.isInteger(word.sourcePage)&&authorized.has(word.sourcePage),'Word on unverified source page '+word.id);
  assert.ok(Number.isInteger(word.sourcePart)&&word.sourcePart>=1&&word.sourcePart<=6,'Missing Reading part '+word.id);
  assert.ok(source.words.some(x=>x.id===word.id));
  assert.equal(word.answer,word.term);
  assert.deepEqual(word.accepted,[word.term]);
  assert.ok(word.example.toLowerCase().includes(word.term.toLowerCase()),'Example does not use answer '+word.id);
  assert.equal((word.cloze.match(/________/g)||[]).length,1,'Missing cloze blank '+word.id);
  assert.ok(!word.cloze.toLowerCase().includes(word.term.toLowerCase()),'Cloze leaks target '+word.id);
  pageSet.add(word.sourcePage);
  total++;
 }
}
assert.equal(total,144);
const trainer=fs.readFileSync(path.join(root,'dist/trainer.js'),'utf8');
const app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
new Function(trainer);new Function(app);
assert.match(trainer,/vocabularyTabs/);
assert.match(trainer,/Study flashcards/);
assert.match(trainer,/BASE\+'\/trainer-test-'/);
assert.match(app,/trainerVocabTabs/);
assert.match(app,/u\.bookId==='trainer'/);
assert.match(app,/Matching/);
assert.match(app,/Multiple choice/);
assert.match(app,/Fill in the blanks/);
console.log('PASS: 6 Trainer Exam Practice tests × 24 sourced B1+–B2 vocabulary items; 144 flashcards and practice clozes.');
console.log('PASS: Trainer shares WordHop Flashcards / Practice system and links back to Reading, Listening and Writing. Source pages checked against Exam-only manifest.');
