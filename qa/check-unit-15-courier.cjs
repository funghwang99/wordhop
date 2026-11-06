'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist');
const source=fs.readFileSync(path.join(root,'games/word-courier-unit15.html'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit=catalog.units.find(u=>u.id==='bir-unit-15');
assert.ok(unit,'Unit 15 must exist');
const words=JSON.parse(fs.readFileSync(path.join(root,unit.dataFile.replace(/^\//,'')),'utf8')).words;
assert.equal(words.length,42);
const match=source.match(/<script id="questionData" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(match,'Unit 15 typed-answer question bank must exist');
const qs=JSON.parse(match[1]);
assert.equal(qs.length,42);
assert.deepEqual(qs.map(q=>q.term).sort(),words.map(w=>w.term).sort());
const types={};
for(const q of qs){
 types[q.type]=(types[q.type]||0)+1;
 assert.ok(q.term&&q.prompt?.length>=15&&q.explanation?.length>=12);
 assert.ok(q.answer&&typeof q.answer==='string');
 assert.ok(!q.choices,'Typing game must not have multiple-choice options: '+q.term);
 if(q.type==='PARAPHRASE'){
  assert.ok(q.highlight&&q.highlight.length>=4,'Paraphrasing target missing: '+q.term);
  assert.equal(q.prompt.split(q.highlight).length,2,'Paraphrasing target must occur once: '+q.term);
 }
}
assert.deepEqual(types,{CONTEXT:11,COLLOCATION:10,PARAPHRASE:10,'WORD FORM':11});
assert.ok(source.includes("'<mark>'"),'Paraphrasing focus must render highlighted');
assert.ok(source.includes("el.form.addEventListener('submit'"),'Form submit must work');
assert.ok(source.includes("el.input.addEventListener('keydown'"),'Enter key must be handled');
assert.ok(source.includes("e.key==='Enter'"),'Enter key logic must exist');
assert.ok(source.includes("el.send.addEventListener('click'"),'DELIVER button must be handled');
assert.ok(source.includes('sendCurrentAnswer()'),'All submit actions must share one pathway');
assert.ok(source.includes("type:'wordhop-courier-unit15-result'"),'Missing result bridge');
assert.ok(source.includes("wordhop.arcade.wordcourier.unit15.v1"),'Missing save key');
const scripts=[...source.matchAll(/<script(?: [^>]+)?>([\s\S]*?)<\/script>/g)].filter(m=>!m[0].includes('type="application/json"')).map(m=>m[1]);
for(const [i,s] of scripts.entries())new vm.Script(s,{filename:'courier-inline-'+i+'.js'});
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.ok(app.includes("id!=='courier'||u.id==='bir-unit-15'"));
assert.ok(app.includes("mode==='courier'&&route.unit.id!=='bir-unit-15'"));
assert.ok(app.includes('games/word-courier-unit15.html?embed=1'));
assert.ok(app.includes('wordhop-courier-unit15-result'));
assert.ok(app.includes("localStorage.removeItem('wordhop.arcade.wordcourier.unit15.v1')"));
console.log('PASS: Word Courier Unit 15 has all 42 typed-answer tasks, 10 highlighted paraphrases, shared Enter/DELIVER submission, result bridge and single-unit routing.');
