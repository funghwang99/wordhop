'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist');
const source=fs.readFileSync(path.join(root,'games/word-hopper-unit14.html'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit=catalog.units.find(u=>u.id==='bir-unit-14');
assert.ok(unit,'Unit 14 missing');
const words=JSON.parse(fs.readFileSync(path.join(root,unit.dataFile.replace(/^\//,'')),'utf8')).words;
assert.equal(words.length,34);
const match=source.match(/const WORDHOP_UNIT14_QUESTIONS=(\[[\s\S]*?\]);\s*<\/script>/);
assert.ok(match,'Unit 14 question bank must be available');
const questions=JSON.parse(match[1]);
assert.equal(questions.length,34);
assert.deepEqual(questions.map(q=>q.term).sort(),words.map(w=>w.term).sort());
const counts=Object.create(null);
for(const q of questions){
 counts[q.type]=(counts[q.type]||0)+1;
 assert.ok(q.term&&q.prompt&&q.explanation,'Missing content');
 assert.equal(q.choices.length,3,'Each dock has 3 options');
 assert.equal(new Set(q.choices).size,3,'Duplicate options: '+q.term);
 assert.ok(q.choices.includes(q.answer),'Correct choice missing: '+q.term);
 if(q.type==='PARAPHRASE'){
  assert.ok(q.highlight&&q.highlight.length>=4,'Highlight missing: '+q.term);
  assert.equal(q.prompt.split(q.highlight).length,2,'Highlight phrase ambiguous: '+q.term);
 }
}
assert.deepEqual({...counts},{CONTEXT:9,'WORD FORM':8,COLLOCATION:9,PARAPHRASE:8});
assert.ok(source.includes('function selectLane('));
assert.ok(source.includes("if(state.phase!=='ready'||state.selected<0)return;"),'Selecting a word should precede hopping');
assert.ok(source.includes("state.phase='air';state.player.x=W*.5;"),'Frog must animate after HOP');
assert.ok(source.includes("type:'wordhop-hopper-unit14-result'"),'Missing results bridge');
assert.ok(source.includes("wordhop.arcade.wordhopper.unit14.v1"),'Missing storage key');
assert.ok(source.includes('paraphrase')||source.includes('PARAPHRASE'));
const scripts=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.ok(scripts.length>=2);
for(const [i,js] of scripts.entries())new vm.Script(js,{filename:'hopper-inline-'+i+'.js'});
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.ok(app.includes("id!=='hopper'||u.id==='bir-unit-14'"));
assert.ok(app.includes("mode==='hopper'&&route.unit.id!=='bir-unit-14'"));
assert.ok(app.includes('games/word-hopper-unit14.html?embed=1'));
assert.ok(app.includes('wordhop-hopper-unit14-result'));
assert.ok(app.includes("localStorage.removeItem('wordhop.arcade.wordhopper.unit14.v1')"));
console.log('PASS: Unit 14 Word Hopper covers all 34 words with mixed IELTS tasks, 8 focused highlights, select-before-hop, result integration, reset and Unit 14-only routing.');
