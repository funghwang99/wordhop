'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist');
const source=fs.readFileSync(path.join(root,'games/word-cannon-unit13.html'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit=catalog.units.find(u=>u.id==='bir-unit-13');
assert.ok(unit,'Unit 13 should exist');
const vocab=JSON.parse(fs.readFileSync(path.join(root,unit.dataFile.replace(/^\//,'')),'utf8')).words;
assert.equal(vocab.length,28);
const match=source.match(/window\.WORD_CANNON_UNIT13\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/);
assert.ok(match,'The game should have a parseable Unit 13 question bank');
const questions=JSON.parse(match[1]);
assert.equal(questions.length,28);
assert.deepEqual(questions.map(q=>q.term).sort(),vocab.map(w=>w.term).sort());
const types=Object.create(null);
for(const q of questions){
 types[q.type]=(types[q.type]||0)+1;
 assert.ok(q.term&&q.prompt.length>=15,'Missing prompt: '+q.term);
 assert.ok(q.explanation.length>=12,'Missing explanation: '+q.term);
 assert.equal(q.choices.length,3,'Exactly three balloon choices expected');
 assert.equal(new Set(q.choices).size,3,'Distinct answer choices expected');
 assert.ok(q.choices.includes(q.answer),'Correct answer missing: '+q.term);
 if(q.type==='PARAPHRASE'){
  assert.ok(typeof q.highlight==='string'&&q.highlight.length>=4,'Missing paraphrase highlight: '+q.term);
  assert.equal(q.prompt.split(q.highlight).length,2,'Only one highlighted phrase expected: '+q.term);
 }
}
assert.deepEqual({...types},{CONTEXT:7,COLLOCATION:7,'WORD FORM':7,PARAPHRASE:7});
assert.ok(source.includes("'<mark>'"),'Paraphrase targets must render as marked HTML');
assert.ok(source.includes("type:'wordhop-cannon-unit13-result'"),'Game must publish result messages');
const scripts=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.ok(scripts.length>=2);
for(const [i,s] of scripts.entries())new vm.Script(s,{filename:'cannon-inline-'+i+'.js'});
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.ok(app.includes("id!=='cannon'||u.id==='bir-unit-13'"));
assert.ok(app.includes("mode==='cannon'&&route.unit.id!=='bir-unit-13'"));
assert.ok(app.includes("games/word-cannon-unit13.html?embed=1"));
assert.ok(app.includes("wordhop-cannon-unit13-result"));
assert.ok(app.includes("localStorage.removeItem('wordhop.arcade.wordcannon.unit13.review.v1')"));
console.log('PASS: Unit 13 Word Cannon has 28 verified words, 7 tasks of each IELTS type, highlighted paraphrases, result bridge and single-unit routing.');
