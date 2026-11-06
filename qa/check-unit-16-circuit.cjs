'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist');
const source=fs.readFileSync(path.join(root,'games/word-circuit-unit16.html'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit=catalog.units.find(u=>u.id==='bir-unit-16');
assert.ok(unit,'Basic IELTS Reading Unit 16 missing');
const words=JSON.parse(fs.readFileSync(path.join(root,unit.dataFile.replace(/^\//,'')),'utf8')).words;
assert.equal(words.length,44);
const match=source.match(/<script type="application\/json" id="questionBank">([\s\S]*?)<\/script>/);
assert.ok(match,'Missing embedded Word Circuit question bank');
const qs=JSON.parse(match[1]);
assert.equal(qs.length,44);
assert.deepEqual(qs.map(q=>q.term).sort(),words.map(w=>w.term).sort());
const counts={};
for(const q of qs){
 counts[q.type]=(counts[q.type]||0)+1;
 assert.ok(q.prompt&&q.prompt.length>=15,'Missing question: '+q.term);
 assert.ok(q.explanation&&q.explanation.length>=12,'Missing explanation: '+q.term);
 assert.ok(q.answer&&typeof q.answer==='string','Missing answer: '+q.term);
 assert.equal(q.choices,undefined,'Typed-answer task must not offer options');
 if(q.type==='PARAPHRASE'){
  assert.ok(q.focus&&q.focus.length>=4&&q.target,'Missing focused paraphrase: '+q.term);
  assert.equal(q.prompt.split(q.focus).length,2,'Paraphrase focus must appear exactly once: '+q.term);
 }
}
assert.deepEqual(counts,{CONTEXT:11,COLLOCATION:11,PARAPHRASE:11,'WORD FORM':11});
assert.ok(source.includes("'<mark>'"),'Focus phrases should be highlighted');
assert.ok(source.includes("el.form.addEventListener('submit',submitAnswer)"),'SEND must submit');
assert.ok(source.includes("el.input.addEventListener('keydown'"),'Enter key must submit');
assert.ok(source.includes("if(e.key==='Enter')"),'Enter key handler must work');
assert.ok(source.includes('function puzzleConnected('),'Circuit puzzle should be interactive');
assert.ok(source.includes("type:'wordhop-circuit-unit16-result'"),'Embedded game must report score');
assert.ok(source.includes("wordhop.arcade.wordcircuit.unit16.v1"),'Save key missing');
const scripts=[...source.matchAll(/<script(?: [^>]+)?>([\s\S]*?)<\/script>/g)].filter(m=>!m[0].includes('type="application/json"')).map(m=>m[1]);
for(const [i,s] of scripts.entries())new vm.Script(s,{filename:'circuit-inline-'+i+'.js'});
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.ok(app.includes("id!=='circuit'||u.id==='bir-unit-16'"),'Unit 16-only practice restriction missing');
assert.ok(app.includes("mode==='circuit'&&route.unit.id!=='bir-unit-16'"),'Unit 16-only start restriction missing');
assert.ok(app.includes('games/word-circuit-unit16.html?embed=1'),'Embed missing');
assert.ok(app.includes('wordhop-circuit-unit16-result'),'Result bridge missing');
assert.ok(app.includes("localStorage.removeItem('wordhop.arcade.wordcircuit.unit16.v1')"),'Clear saved results must reset high score');
console.log('PASS: Unit 16 Word Circuit covers 44 unique terms, 4 rotating typed-answer formats, 11 highlighted paraphrases, Enter/SEND, puzzle, results and unit-only routing.');
