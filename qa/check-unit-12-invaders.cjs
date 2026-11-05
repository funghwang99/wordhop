'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist');
const source=fs.readFileSync(path.join(root,'games/word-invaders-unit12.html'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit=catalog.units.find(u=>u.id==='bir-unit-12');
assert.ok(unit,'Unit 12 must exist');
const vocab=JSON.parse(fs.readFileSync(path.join(root,unit.dataFile.replace(/^\//,'')),'utf8')).words;
assert.equal(vocab.length,35);
const match=source.match(/window\.WORD_INVADERS_Q=(\[[\s\S]*?\]);<\/script>/);
assert.ok(match,'Game must include a parseable question bank');
const questions=JSON.parse(match[1]);
assert.equal(questions.length,35);
assert.deepEqual(questions.map(q=>q.term).sort(),vocab.map(w=>w.term).sort());
const types=Object.create(null);
for(const q of questions){
 types[q.type]=(types[q.type]||0)+1;
 assert.ok(q.id&&q.term&&q.prompt.length>=15);
 assert.ok(q.explanation.length>=12);
 assert.equal(q.choices.length,3);
 assert.equal(new Set(q.choices).size,3);
 assert.ok(q.choices.includes(q.answer),'Bad answer '+q.term);
 if(q.type==='paraphrase'){
  assert.ok(typeof q.highlight==='string'&&q.highlight.length>=4);
  assert.equal(q.prompt.split(q.highlight).length,2,'Paraphrase needs single highlighted phrase '+q.term);
 }
}
assert.deepEqual({...types},{form:8,paraphrase:9,collocation:9,context:9});
assert.ok(source.includes('<mark class="paraphrase-focus">'),'Missing paraphrase highlight markup');
assert.ok(source.includes("type:'wordhop-invaders-unit12-result'"),'Missing embedded-game results');
const scripts=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
for(const [i,s] of scripts.entries())new vm.Script(s,{filename:'invaders-inline-'+i+'.js'});
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.ok(app.includes("id!=='invaders'||u.id==='bir-unit-12'"));
assert.ok(app.includes("mode==='invaders'&&route.unit.id!=='bir-unit-12'"));
assert.ok(app.includes("games/word-invaders-unit12.html?embed=1"));
assert.ok(app.includes("wordhop-invaders-unit12-result"));
console.log('PASS: Unit 12 Word Invaders: 35 words, 4 IELTS task types, 9 highlighted paraphrases, result bridge and single-unit routing.');
