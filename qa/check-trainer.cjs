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
