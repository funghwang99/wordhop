'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
assert.equal(catalog.books.filter(b=>b.id==='trainer').length,1);
assert.equal(catalog.books.find(b=>b.id==='trainer').trackId,'pet');
const app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
assert.ok(app.includes("if(b.id==='trainer')"));
const script=fs.readFileSync(path.join(root,'dist/trainer.js'),'utf8');
new Function(script);
assert.ok(script.includes("const mode='exam';"));
assert.equal(script.includes('training:true'),false);
assert.equal(script.includes("path(t.id,'training'"),false);
assert.equal(script.includes('audio-manifest.json'),false);
const expected={1:['ACCBA','BHDFA','DACBD'],2:['CABCA','CHEBF','CABDA']};
let checked=0;
for(const test of [1,2])for(const part of [1,2,3]){
 const file=path.join(root,'dist/trainer',`test-${test}-reading-part-${part}.json`);
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.match(data.title,new RegExp(`Test ${test}.*Exam Practice.*Reading Part ${part}`));
 assert.equal(data.questions.length,5);
 assert.equal(new Set(data.questions.map(q=>q.id)).size,5);
 assert.equal(data.questions.map(q=>q.answer).join(''),expected[test][part-1]);
 for(const q of data.questions){assert.ok(q.options[q.answer]);assert.ok(q.explanationVi.length>40);checked++;}
}
assert.equal(checked,30);
assert.equal(fs.existsSync(path.join(root,'dist/audio/trainer')),false);
console.log('PASS: Trainer in PET books; Exam Practice only; 30 verified Reading answers; audio pending.');

const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/trainer/exam-pages.json'),'utf8'));
assert.equal(manifest.bookId,'trainer');
assert.equal(manifest.mode,'exam');
assert.equal(manifest.tests.length,6);
const trainerPages=new Set(),published=[];
const excludes={
  1:new Set([12,13,16,19,20,23,26,28,30,31,33,34,36,37,40,42,44,46,48,50,52]),
  2:new Set([54,55,58,61,62,65,68,70,72,73,75,76,78,79,82,84,86,88,90,92,94])
};
for(const [index,test] of manifest.tests.entries()){
 assert.equal(test.test,index+1);
 assert.equal(test.mode,'exam');
 assert.deepEqual(Object.fromEntries(Object.entries(test.skills).map(([name,parts])=>[name,parts.length])),{reading:6,writing:2,listening:4,speaking:4});
 for(const [skill,parts] of Object.entries(test.skills))for(const [i,part] of parts.entries()){
  assert.equal(part.id,'part-'+(i+1));
  assert.equal(part.scored,skill==='reading'&&test.test<=2&&i<3);
  assert.ok(part.pages.length>=1&&part.pages.length<=2);
  for(const page of part.pages){
   assert.equal(page.printedPage,page.pdfPage-2);
   assert.ok(!excludes[test.test]?.has(page.pdfPage),'Training page included: '+page.pdfPage);
   assert.equal(page.width,1359);assert.equal(page.height,1800);
   assert.match(page.image,/^assets\/(reading|writing|listening|speaking)\/trainer-t[1-6]-[a-z]+-p[1-6]-page[12]\.webp$/);
   trainerPages.add(page.image);
   if(fs.existsSync(path.join(root,'dist',page.image)))published.push(page.image);
  }
 }
}
assert.equal(trainerPages.size,114);
assert.ok(script.includes('trainer/exam-pages.json'));
assert.ok(script.includes('trainer-original-pages'));
console.log('PASS: Trainer page manifest covers 114 unique original pages, with Training pages removed from Tests 1–2. '+published.length+'/114 images available in the repository.');
