'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../dist');
const source=fs.readFileSync(path.join(dir,'games/word-ninja-unit11.html'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(dir,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit=catalog.units.find(u=>u.id==='bir-unit-11');
assert.ok(unit,'Basic IELTS Reading Unit 11 must exist');
const words=JSON.parse(fs.readFileSync(path.join(dir,unit.dataFile.replace(/^\//,'')),'utf8')).words;
assert.equal(words.length,51);
const match=source.match(/const QUESTION_BANK = (\[[\s\S]*?\]);\s*const WORDS=/);
assert.ok(match,'Word Ninja must include a parseable 51-question bank');
const qs=JSON.parse(match[1]);
assert.equal(qs.length,51);
assert.equal(new Set(qs.map(q=>q.term)).size,51);
assert.deepEqual(qs.map(q=>q.term).sort(),words.map(w=>w.term).sort());
const counts=Object.create(null);
for(const q of qs){
 counts[q.type]=(counts[q.type]||0)+1;
 assert.ok(typeof q.prompt==='string'&&q.prompt.length>=20&&q.prompt.length<180);
 assert.ok(typeof q.explanation==='string'&&q.explanation.length>=20);
 assert.ok(Array.isArray(q.choices)&&q.choices.length===3);
 assert.equal(new Set(q.choices).size,3);
 assert.ok(q.choices.includes(q.answer));
}
assert.deepEqual(Object.keys(counts).sort(),['COLLOCATION','CONTEXT','PARAPHRASE','WORD FORM']);
assert.deepEqual(Object.values(counts).sort((a,b)=>a-b),[12,13,13,13]);
const script=source.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(script,'Standalone game must contain inline JavaScript');
new vm.Script(script[1],{filename:'word-ninja-unit11.html'});
const start=script[1].indexOf('function makeQuestionDeck(n){');
const end=script[1].indexOf('const $ =',start);
assert.ok(start>0&&end>start);
const context={QUESTION_BANK:qs,TASK_TYPES:['CONTEXT','COLLOCATION','PARAPHRASE','WORD FORM'],shuffle:items=>[...items].reverse()};
vm.createContext(context);
vm.runInContext(script[1].slice(start,end)+'\nthis.makeQuestionDeck=makeQuestionDeck;',context);
for(const n of [10,20,51]){
 const deck=context.makeQuestionDeck(n);
 assert.equal(deck.length,n);assert.equal(new Set(deck.map(q=>q.term)).size,n);
 for(let i=1;i<deck.length;i++)assert.notEqual(deck[i-1].type,deck[i].type);
}
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
assert.ok(app.includes("id!=='ninja'||u.id==='bir-unit-11'"));
assert.ok(app.includes("mode==='ninja'&&route.unit.id!=='bir-unit-11'"));
assert.ok(app.includes('games/word-ninja-unit11.html?embed=1'));
assert.ok(app.includes('wordhop-ninja-unit11-result'));
assert.ok(source.includes('wordhop-ninja-unit11-result'));
assert.ok(!source.includes('UNIT 10'));
assert.ok(source.includes('All 51 words'));
console.log('PASS: Unit 11 Word Ninja has all 51 unique verified words, 4 balanced IELTS task types, valid choices, 10/20/51 alternating rounds, standalone code and single-unit routing.');
